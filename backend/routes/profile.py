from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
import base64
from motor.motor_asyncio import AsyncIOMotorClient

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get('DB_NAME')]

router = APIRouter(prefix="/profile", tags=["Profile"])

# Helper function to get user from token
async def get_user_from_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    from utils.auth import verify_token
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


class SecurityUpdate(BaseModel):
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    two_factor_enabled: Optional[bool] = None
    login_notifications: Optional[bool] = None
    trade_notifications: Optional[bool] = None


class ProfilePictureUpload(BaseModel):
    image_data: str  # Base64 encoded image


@router.get("")
async def get_profile(authorization: str = Header(None)):
    """Get current user profile"""
    user = await get_user_from_token(authorization)
    
    # Get additional profile data
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    
    return {
        "user": user,
        "profile": profile or {}
    }


@router.put("")
async def update_profile(
    profile: ProfileUpdate,
    authorization: str = Header(None)
):
    """Update user profile"""
    user = await get_user_from_token(authorization)
    
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update user record
    if "name" in update_data or "email" in update_data:
        user_update = {}
        if "name" in update_data:
            user_update["name"] = update_data["name"]
        if "email" in update_data:
            user_update["email"] = update_data["email"]
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": user_update}
        )
    
    # Update or create profile record
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update_data, "$setOnInsert": {"user_id": user["id"]}},
        upsert=True
    )
    
    return {"success": True, "message": "Profile updated"}


@router.post("/picture")
async def upload_profile_picture(
    data: ProfilePictureUpload,
    authorization: str = Header(None)
):
    """Upload profile picture (base64)"""
    user = await get_user_from_token(authorization)
    
    try:
        # Validate base64 data
        image_data = data.image_data
        if ',' in image_data:
            # Remove data URL prefix if present
            image_data = image_data.split(',')[1]
        
        # Store the image data
        await db.profiles.update_one(
            {"user_id": user["id"]},
            {
                "$set": {
                    "profile_picture": data.image_data,
                    "picture_updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {"user_id": user["id"]}
            },
            upsert=True
        )
        
        return {"success": True, "message": "Profile picture updated"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")


@router.get("/security")
async def get_security_settings(authorization: str = Header(None)):
    """Get security settings"""
    user = await get_user_from_token(authorization)
    
    security = await db.security_settings.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "user_id": 0}
    )
    
    return {
        "security": security or {
            "two_factor_enabled": False,
            "login_notifications": True,
            "trade_notifications": True,
            "last_password_change": None
        }
    }


@router.put("/security")
async def update_security_settings(
    security: SecurityUpdate,
    authorization: str = Header(None)
):
    """Update security settings"""
    user = await get_user_from_token(authorization)
    
    update_data = {}
    
    # Handle password change
    if security.new_password and security.current_password:
        from utils.auth import verify_password, get_password_hash
        
        # Verify current password
        user_with_password = await db.users.find_one({"id": user["id"]})
        if not verify_password(security.current_password, user_with_password.get("hashed_password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        new_hash = get_password_hash(security.new_password)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"hashed_password": new_hash}}
        )
        update_data["last_password_change"] = datetime.now(timezone.utc).isoformat()
    
    # Update other security settings
    if security.two_factor_enabled is not None:
        update_data["two_factor_enabled"] = security.two_factor_enabled
    if security.login_notifications is not None:
        update_data["login_notifications"] = security.login_notifications
    if security.trade_notifications is not None:
        update_data["trade_notifications"] = security.trade_notifications
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.security_settings.update_one(
            {"user_id": user["id"]},
            {"$set": update_data, "$setOnInsert": {"user_id": user["id"]}},
            upsert=True
        )
    
    return {"success": True, "message": "Security settings updated"}


@router.get("/sessions")
async def get_active_sessions(authorization: str = Header(None)):
    """Get active login sessions"""
    user = await get_user_from_token(authorization)
    
    sessions = await db.sessions.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    return {"sessions": sessions}


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    authorization: str = Header(None)
):
    """Revoke a specific session"""
    user = await get_user_from_token(authorization)
    
    result = await db.sessions.update_one(
        {"id": session_id, "user_id": user["id"]},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True, "message": "Session revoked"}
