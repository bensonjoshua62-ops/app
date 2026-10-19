from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get('DB_NAME')]

router = APIRouter(prefix="/tutorials", tags=["Tutorials"])

# Helper function to get user from token
async def get_user_from_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    from utils.auth import decode_token
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


class TutorialCreate(BaseModel):
    title: str
    description: str
    category: str
    duration: Optional[str] = ""
    videoUrl: Optional[str] = ""
    thumbnailUrl: Optional[str] = ""
    featured: Optional[bool] = False


class TutorialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None
    videoUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    featured: Optional[bool] = None


@router.get("")
async def get_tutorials(limit: int = 50):
    """Get all tutorials - public endpoint"""
    tutorials = await db.tutorials.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return {"tutorials": tutorials, "total": len(tutorials)}


@router.get("/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    """Get a specific tutorial - public endpoint"""
    tutorial = await db.tutorials.find_one(
        {"id": tutorial_id, "is_active": True},
        {"_id": 0}
    )
    
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    return {"tutorial": tutorial}


@router.post("")
async def create_tutorial(
    tutorial: TutorialCreate,
    authorization: str = Header(None)
):
    """Create a new tutorial - admin only"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tutorial_doc = {
        "id": str(uuid.uuid4()),
        "title": tutorial.title,
        "description": tutorial.description,
        "category": tutorial.category,
        "duration": tutorial.duration,
        "videoUrl": tutorial.videoUrl,
        "thumbnailUrl": tutorial.thumbnailUrl,
        "featured": tutorial.featured,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    
    # If this is featured, unfeature others
    if tutorial.featured:
        await db.tutorials.update_many(
            {"featured": True},
            {"$set": {"featured": False}}
        )
    
    await db.tutorials.insert_one(tutorial_doc)
    
    return {"success": True, "tutorial": {k: v for k, v in tutorial_doc.items() if k != "_id"}}


@router.put("/{tutorial_id}")
async def update_tutorial(
    tutorial_id: str,
    tutorial: TutorialUpdate,
    authorization: str = Header(None)
):
    """Update a tutorial - admin only"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build update dict
    update_data = {k: v for k, v in tutorial.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If setting as featured, unfeature others
    if tutorial.featured:
        await db.tutorials.update_many(
            {"featured": True, "id": {"$ne": tutorial_id}},
            {"$set": {"featured": False}}
        )
    
    result = await db.tutorials.update_one(
        {"id": tutorial_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    updated = await db.tutorials.find_one({"id": tutorial_id}, {"_id": 0})
    return {"success": True, "tutorial": updated}


@router.delete("/{tutorial_id}")
async def delete_tutorial(
    tutorial_id: str,
    authorization: str = Header(None)
):
    """Soft delete a tutorial - admin only"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.tutorials.update_one(
        {"id": tutorial_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    return {"success": True, "message": "Tutorial deleted"}
