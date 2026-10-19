from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from utils.auth import decode_token
import uuid
import os

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class NotificationCreate(BaseModel):
    type: str  # 'trade_alert', 'system', 'info'
    title: str
    message: str
    data: Optional[dict] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    read: bool = False
    created_at: str


async def get_user_from_token(authorization: str):
    """Get user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": payload.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


async def create_notification_for_user(user_id: str, notification: dict):
    """Create a notification for a specific user"""
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification.get("type", "info"),
        "title": notification.get("title", "Notification"),
        "message": notification.get("message", ""),
        "data": notification.get("data"),
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification_doc)
    return notification_doc


async def create_trade_notification(user_id: str, trade_data: dict):
    """Create a trade alert notification"""
    # Clean trade_data to remove any MongoDB ObjectIds
    clean_trade_data = {}
    for key, value in trade_data.items():
        if key != "_id":  # Exclude MongoDB _id field
            clean_trade_data[key] = value
    
    notification = {
        "type": "trade_alert",
        "title": f"New Trade: {trade_data.get('symbol', 'Unknown')}",
        "message": f"{trade_data.get('type', 'TRADE')} {trade_data.get('volume', 0)} lots at {trade_data.get('open_price', 0)}",
        "data": clean_trade_data
    }
    return await create_notification_for_user(user_id, notification)


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(authorization: str = Header(None), limit: int = 50):
    """Get notifications for the authenticated user"""
    from fastapi.responses import JSONResponse
    
    user = await get_user_from_token(authorization)
    
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enable browser caching for 30 seconds, vary by Authorization
    response = JSONResponse(content=notifications)
    response.headers["Cache-Control"] = "private, max-age=30"
    response.headers["Vary"] = "Authorization"
    return response


@router.get("/unread-count")
async def get_unread_count(authorization: str = Header(None)):
    """Get count of unread notifications"""
    from fastapi.responses import JSONResponse
    
    user = await get_user_from_token(authorization)
    
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    
    # Enable browser caching for 30 seconds
    response = JSONResponse(content={"count": count})
    response.headers["Cache-Control"] = "private, max-age=30"
    response.headers["Vary"] = "Authorization"
    return response


@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, authorization: str = Header(None)):
    """Mark a notification as read"""
    user = await get_user_from_token(authorization)
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_as_read(authorization: str = Header(None)):
    """Mark all notifications as read"""
    user = await get_user_from_token(authorization)
    
    result = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": f"Marked {result.modified_count} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, authorization: str = Header(None)):
    """Delete a notification"""
    user = await get_user_from_token(authorization)
    
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}


@router.get("/all")
async def get_all_notifications(authorization: str = Header(None), limit: int = 100):
    """Get ALL notifications for the authenticated user (full history)"""
    user = await get_user_from_token(authorization)
    
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"notifications": notifications, "total": len(notifications)}


@router.delete("/clear-all")
async def clear_all_notifications(authorization: str = Header(None)):
    """Clear all notifications for the authenticated user"""
    user = await get_user_from_token(authorization)
    
    result = await db.notifications.delete_many({"user_id": user["id"]})
    
    return {"message": f"Cleared {result.deleted_count} notifications", "deleted_count": result.deleted_count}


@router.delete("/admin/clear-all")
async def admin_clear_all_notifications(authorization: str = Header(None)):
    """Admin: Clear ALL notifications for all users"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.notifications.delete_many({})
    
    return {"message": f"Admin cleared {result.deleted_count} notifications for all users", "deleted_count": result.deleted_count}

