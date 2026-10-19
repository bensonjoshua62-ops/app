from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from models.user import UserCreate, UserSignIn, UserResponse, UserInDB, TokenResponse, AdminUserCreate
from utils.auth import get_password_hash, verify_password, create_access_token, decode_token
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]

security = HTTPBearer()

# Default admin credentials
DEFAULT_ADMIN_EMAIL = "admin@igris.com"
DEFAULT_ADMIN_PASSWORD = "admin123"


async def ensure_admin_exists():
    """Create default admin if not exists."""
    admin = await db.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    if not admin:
        admin_user = UserInDB(
            name="Admin",
            email=DEFAULT_ADMIN_EMAIL,
            hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
            is_admin=True
        )
        await db.users.insert_one(admin_user.dict())
        print(f"Default admin created: {DEFAULT_ADMIN_EMAIL}")


@router.post("/signup")
async def signup(user_data: UserCreate):
    """Register a new user - requires admin approval before login."""
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, user_data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password strength
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Validate name
    if not user_data.name or len(user_data.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long")
    
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_in_db = UserInDB(
        name=user_data.name.strip(),
        email=user_data.email.lower(),
        hashed_password=get_password_hash(user_data.password),
        is_admin=False
    )
    
    # Add approval status - new users need admin approval
    user_dict = user_in_db.dict()
    user_dict["approved"] = False
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Return success message instead of token (user needs approval first)
    return {
        "success": True,
        "message": "Account created successfully! Please wait for admin approval before logging in.",
        "user": {
            "id": user_in_db.id,
            "name": user_in_db.name,
            "email": user_in_db.email
        }
    }


@router.post("/signin", response_model=TokenResponse)
async def signin(credentials: UserSignIn):
    """Sign in an existing user."""
    await ensure_admin_exists()
    
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user account is active (disabled users cannot login)
    if user.get("is_active") == False:
        raise HTTPException(status_code=403, detail="Your account has been disabled. Please contact admin.")
    
    # Check if user is approved (non-admin users need approval)
    is_admin = user.get("is_admin", False)
    is_pro = user.get("is_pro", False)
    if not is_admin and user.get("approved") == False:
        raise HTTPException(status_code=403, detail="Your account is pending approval. Please wait for admin to approve your account.")
    access_token = create_access_token(data={"sub": user["email"], "user_id": user["id"], "is_admin": is_admin, "is_pro": is_pro})
    
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_admin=is_admin,
        is_pro=is_pro,
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = await db.users.find_one({"email": payload.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        is_pro=user.get("is_pro", False),
        created_at=user["created_at"]
    )


# Admin endpoints
@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(authorization: str = Header(None)):
    """Get all users (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(1000)
    return [UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"]
    ) for user in users]


@router.post("/admin/users", response_model=UserResponse)
async def create_user_admin(user_data: AdminUserCreate, authorization: str = Header(None)):
    """Create a new user (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_in_db = UserInDB(
        name=user_data.name,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_admin=user_data.is_admin
    )
    
    await db.users.insert_one(user_in_db.dict())
    
    return UserResponse(
        id=user_in_db.id,
        name=user_in_db.name,
        email=user_in_db.email,
        is_admin=user_in_db.is_admin,
        created_at=user_in_db.created_at
    )


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, authorization: str = Header(None)):
    """Delete a user (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_admin") and user["email"] == DEFAULT_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot delete default admin")
    
    await db.users.delete_one({"id": user_id})
    
    return {"message": "User deleted successfully"}


class UserAccessUpdate(BaseModel):
    is_active: bool


@router.put("/admin/users/{user_id}/access")
async def toggle_user_access(user_id: str, access_update: UserAccessUpdate, authorization: str = Header(None)):
    """Grant or revoke user access (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_admin") and user["email"] == DEFAULT_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot modify default admin access")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": access_update.is_active}}
    )
    
    status = "granted" if access_update.is_active else "revoked"
    return {"message": f"User access {status} successfully", "is_active": access_update.is_active}


class UserApprovalUpdate(BaseModel):
    approved: bool


@router.put("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, approval_update: UserApprovalUpdate, authorization: str = Header(None)):
    """Approve or reject a user account (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"approved": approval_update.approved}}
    )
    
    status = "approved" if approval_update.approved else "rejected"
    return {"message": f"User {status} successfully", "approved": approval_update.approved}


@router.get("/admin/users/pending")
async def get_pending_users(authorization: str = Header(None)):
    """Get all users pending approval (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending_users = await db.users.find({"approved": False, "is_admin": {"$ne": True}}).to_list(1000)
    return [{
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": user.get("created_at", ""),
        "approved": user.get("approved", False)
    } for user in pending_users]


class ProStatusUpdate(BaseModel):
    is_pro: bool


@router.put("/admin/users/{user_id}/pro-status")
async def update_user_pro_status(user_id: str, pro_update: ProStatusUpdate, authorization: str = Header(None)):
    """Update a user's Pro status (admin only)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_pro": pro_update.is_pro}}
    )
    
    status = "Pro" if pro_update.is_pro else "Regular"
    return {"message": f"User set as {status} successfully", "is_pro": pro_update.is_pro}

