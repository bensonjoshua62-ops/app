from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from routes.notifications import create_trade_notification
from services.email_service import email_service
import uuid
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trades", tags=["Trades"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class TradeCreate(BaseModel):
    symbol: str
    type: str  # BUY or SELL
    volume: float
    open_price: float
    close_price: Optional[float] = None
    profit: Optional[float] = None
    open_time: datetime = Field(default_factory=datetime.utcnow)
    close_time: Optional[datetime] = None
    ticket: Optional[int] = None
    magic_number: Optional[int] = None
    comment: Optional[str] = None


class TradeResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    type: str
    volume: float
    open_price: float
    close_price: Optional[float] = None
    profit: Optional[float] = None
    open_time: datetime
    close_time: Optional[datetime] = None
    ticket: Optional[int] = None
    magic_number: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime


async def get_user_from_api_key(x_api_key: str = Header(None)):
    """Get user from API key (user ID)."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    user = await db.users.find_one({"id": x_api_key})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return user


async def send_trade_alert_email(user_email: str, trade_data: dict):
    """Background task to send trade alert email"""
    try:
        result = await email_service.send_trade_alert(trade_data, user_email)
        if result["status"] == "success":
            logger.info(f"Trade alert email sent to {user_email}")
        else:
            logger.warning(f"Trade alert email not sent: {result['message']}")
    except Exception as e:
        logger.error(f"Error sending trade alert email: {str(e)}")


@router.post("/webhook", response_model=TradeResponse)
async def create_trade_webhook(
    trade: TradeCreate, 
    background_tasks: BackgroundTasks,
    x_api_key: str = Header(None)
):
    """Webhook endpoint for MT5 EA to send trades. Creates in-app notification and sends email alert."""
    user = await get_user_from_api_key(x_api_key)
    
    # Check for duplicate trade by ticket number
    if trade.ticket:
        existing = await db.trades.find_one({
            "user_id": user["id"],
            "ticket": trade.ticket
        })
        if existing:
            # Update existing trade instead of creating new one
            update_data = {
                "close_price": trade.close_price,
                "close_time": trade.close_time.isoformat() if trade.close_time else None,
                "profit": trade.profit,
                "status": trade.status,
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.trades.update_one(
                {"id": existing["id"]},
                {"$set": update_data}
            )
            logger.info(f"Updated existing trade {existing['id']} for ticket {trade.ticket}")
            
            # Return the updated trade
            updated = await db.trades.find_one({"id": existing["id"]})
            if isinstance(updated.get("open_time"), str):
                updated["open_time"] = datetime.fromisoformat(updated["open_time"])
            if isinstance(updated.get("created_at"), str):
                updated["created_at"] = datetime.fromisoformat(updated["created_at"])
            if updated.get("close_time") and isinstance(updated["close_time"], str):
                updated["close_time"] = datetime.fromisoformat(updated["close_time"])
            return TradeResponse(**updated)
    
    trade_dict = trade.dict()
    trade_dict["id"] = str(uuid.uuid4())
    trade_dict["user_id"] = user["id"]
    trade_dict["created_at"] = datetime.utcnow()
    
    # Convert datetime to ISO format for MongoDB
    trade_dict["open_time"] = trade_dict["open_time"].isoformat()
    trade_dict["created_at"] = trade_dict["created_at"].isoformat()
    if trade_dict["close_time"]:
        trade_dict["close_time"] = trade_dict["close_time"].isoformat()
    
    await db.trades.insert_one(trade_dict)
    
    # Create in-app notification
    try:
        # Create a clean copy of trade_dict without MongoDB _id for notification
        clean_trade_dict = {k: v for k, v in trade_dict.items() if k != "_id"}
        await create_trade_notification(user["id"], clean_trade_dict)
        logger.info(f"Created in-app notification for trade {trade_dict['id']}")
    except Exception as e:
        logger.error(f"Failed to create in-app notification: {str(e)}")
    
    # Send email notification in background
    user_email = user.get("email")
    if user_email:
        background_tasks.add_task(send_trade_alert_email, user_email, trade_dict)
    
    # Convert back for response
    trade_dict["open_time"] = datetime.fromisoformat(trade_dict["open_time"])
    trade_dict["created_at"] = datetime.fromisoformat(trade_dict["created_at"])
    if trade_dict["close_time"]:
        trade_dict["close_time"] = datetime.fromisoformat(trade_dict["close_time"])
    
    return TradeResponse(**trade_dict)


@router.get("", response_model=List[TradeResponse])
async def get_trades(authorization: str = Header(None)):
    """Get all trades for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    
    from utils.auth import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": payload.get("sub")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    trades = await db.trades.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    
    result = []
    for trade in trades:
        # Convert ISO strings back to datetime
        if isinstance(trade.get("open_time"), str):
            trade["open_time"] = datetime.fromisoformat(trade["open_time"])
        if isinstance(trade.get("created_at"), str):
            trade["created_at"] = datetime.fromisoformat(trade["created_at"])
        if trade.get("close_time") and isinstance(trade["close_time"], str):
            trade["close_time"] = datetime.fromisoformat(trade["close_time"])
        result.append(TradeResponse(**trade))
    
    return result
