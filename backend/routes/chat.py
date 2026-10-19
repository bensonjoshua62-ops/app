"""AI Chat Routes with Image Support using GPT-4o Vision"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import os
import base64
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import jwt
import logging

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[os.environ.get('DB_NAME')]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-421B3B1472b7dE51f7')


async def get_user_from_token(authorization: str):
    """Verify token and return user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.split(' ')[1]
    
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET_KEY', 'igris-secret-key-change-in-production'), algorithms=['HS256'])
        # The 'sub' field contains email, 'user_id' contains the actual user ID
        user_id = payload.get('user_id') or payload.get('sub')
        user = await db.users.find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


# Text-only chat
@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatMessage,
    authorization: str = Header(None)
):
    """Send a text message to the AI"""
    user = await get_user_from_token(authorization)
    
    session_id = request.session_id or str(uuid.uuid4())
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get chat history for context
        history = await db.chat_history.find(
            {"user_id": user["id"], "session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(20)
        
        # Create chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are IGRIS, an advanced AI trading assistant. You help traders with:
- Market analysis and chart pattern recognition
- Trading strategy suggestions
- Risk management advice
- Technical indicator explanations
- Educational content about forex and trading

Be helpful, professional, and always remind users that trading involves risk."""
        ).with_model("openai", "gpt-4o")
        
        # Send previous messages for context
        for msg in history[-10:]:  # Last 10 messages for context
            if msg.get("role") == "user":
                await chat.send_message(UserMessage(text=msg["content"]), store=False)
        
        # Send current message
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Store in database
        timestamp = datetime.now(timezone.utc).isoformat()
        
        await db.chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "session_id": session_id,
            "role": "user",
            "content": request.message,
            "timestamp": timestamp
        })
        
        await db.chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "timestamp": timestamp
        })
        
        return ChatResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


# Chat with image (for chart analysis)
@router.post("/analyze-chart")
async def analyze_chart(
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    image: UploadFile = File(...),
    authorization: str = Header(None)
):
    """Analyze a chart image with AI"""
    user = await get_user_from_token(authorization)
    
    session_id = session_id or str(uuid.uuid4())
    
    # Validate image
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Image must be JPEG, PNG, or WebP")
    
    try:
        # Read and encode image
        image_content = await image.read()
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        # Create chat instance with vision model
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are IGRIS, an expert AI trading assistant specializing in chart analysis. When analyzing charts:

1. Identify the trading pair/asset and timeframe if visible
2. Describe the current trend (bullish, bearish, ranging)
3. Identify key support and resistance levels
4. Point out any chart patterns (head & shoulders, triangles, flags, etc.)
5. Note any candlestick patterns
6. Identify indicator readings if visible (RSI, MACD, etc.)
7. Provide potential trade setups with entry, stop loss, and take profit levels
8. Assess risk/reward ratio
9. Give confidence level for your analysis

Always remind that this is educational analysis, not financial advice."""
        ).with_model("openai", "gpt-4o")
        
        # Create message with image
        image_obj = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text=message or "Please analyze this trading chart and provide your insights.",
            file_contents=[image_obj]
        )
        
        response = await chat.send_message(user_message)
        
        # Store in database
        timestamp = datetime.now(timezone.utc).isoformat()
        
        await db.chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "session_id": session_id,
            "role": "user",
            "content": message,
            "has_image": True,
            "timestamp": timestamp
        })
        
        await db.chat_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "timestamp": timestamp
        })
        
        return {
            "response": response,
            "session_id": session_id,
            "analysis_type": "chart"
        }
        
    except Exception as e:
        logger.error(f"Chart analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Chart analysis error: {str(e)}")


# Get chat history
@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    authorization: str = Header(None)
):
    """Get chat history for a session"""
    user = await get_user_from_token(authorization)
    
    history = await db.chat_history.find(
        {"user_id": user["id"], "session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    return {"messages": history, "session_id": session_id}


# Get all sessions
@router.get("/sessions")
async def get_chat_sessions(authorization: str = Header(None)):
    """Get all chat sessions for a user"""
    user = await get_user_from_token(authorization)
    
    # Get unique sessions with latest message
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$first": "$content"},
            "last_timestamp": {"$first": "$timestamp"}
        }},
        {"$project": {
            "session_id": "$_id",
            "last_message": {"$substr": ["$last_message", 0, 50]},
            "last_timestamp": 1,
            "_id": 0
        }},
        {"$sort": {"last_timestamp": -1}},
        {"$limit": 20}
    ]
    
    sessions = await db.chat_history.aggregate(pipeline).to_list(20)
    
    return {"sessions": sessions}


# Delete session
@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    authorization: str = Header(None)
):
    """Delete a chat session"""
    user = await get_user_from_token(authorization)
    
    result = await db.chat_history.delete_many({
        "user_id": user["id"],
        "session_id": session_id
    })
    
    return {"success": True, "deleted_count": result.deleted_count}


# Prompt Trading Chat History
class ChatHistoryRequest(BaseModel):
    messages: List[dict]


@router.get("/history")
async def get_chat_history(authorization: str = Header(None)):
    """Get user's prompt trading conversation history"""
    user = await get_user_from_token(authorization)
    
    # Get the latest conversation
    conversation = await db.prompt_conversations.find_one(
        {"user_id": user["id"]},
        {"_id": 0}
    )
    
    if conversation:
        return {"messages": conversation.get("messages", [])}
    
    return {"messages": []}


@router.post("/history")
async def save_chat_history(
    request: ChatHistoryRequest,
    authorization: str = Header(None)
):
    """Save user's prompt trading conversation history"""
    user = await get_user_from_token(authorization)
    
    # Limit to last 50 messages to prevent storage bloat
    messages = request.messages[-50:] if len(request.messages) > 50 else request.messages
    
    # Upsert conversation
    await db.prompt_conversations.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "user_id": user["id"],
                "messages": messages,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message_count": len(messages)}


@router.delete("/history")
async def clear_chat_history(authorization: str = Header(None)):
    """Clear user's prompt trading conversation history"""
    user = await get_user_from_token(authorization)
    
    await db.prompt_conversations.delete_one({"user_id": user["id"]})
    
    return {"success": True, "message": "Conversation cleared"}
