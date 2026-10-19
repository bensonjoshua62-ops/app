from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from utils.auth import decode_token
from services.llm_service import llm_service
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class APIKeySettings(BaseModel):
    openai_api_key: str = ""


class EmailJSSettings(BaseModel):
    service_id: str = ""
    template_id: str = ""
    public_key: str = ""


class ChatMessage(BaseModel):
    message: str = ""
    image: Optional[str] = None  # Base64 encoded image data URL


class ChatResponse(BaseModel):
    response: str
    source: str = "emergent"  # 'emergent' or 'admin' indicating which key was used


async def get_admin_user(authorization: str):
    """Verify admin user from token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return payload


@router.get("/api-keys")
async def get_api_keys(authorization: str = Header(None)):
    """Get API key settings (admin only). Returns masked keys and status."""
    await get_admin_user(authorization)
    
    settings = await db.settings.find_one({"type": "api_keys"})
    
    openai_key = settings.get("openai_api_key", "") if settings else ""
    # Return masked key for display
    masked_key = ""
    if openai_key:
        masked_key = openai_key[:8] + "*" * (len(openai_key) - 12) + openai_key[-4:] if len(openai_key) > 12 else "****"
    
    # Check if Emergent LLM key is available
    emergent_key = os.environ.get('EMERGENT_LLM_KEY', '')
    has_emergent_key = bool(emergent_key)
    
    return {
        "openai_api_key": masked_key,
        "has_openai_key": bool(openai_key),
        "has_emergent_key": has_emergent_key,
        "active_source": "admin" if openai_key else ("emergent" if has_emergent_key else "none")
    }


@router.post("/api-keys")
async def save_api_keys(settings: APIKeySettings, authorization: str = Header(None)):
    """Save OpenAI API key settings (admin only). Leave empty to use Emergent LLM key."""
    await get_admin_user(authorization)
    
    await db.settings.update_one(
        {"type": "api_keys"},
        {"$set": {
            "type": "api_keys",
            "openai_api_key": settings.openai_api_key
        }},
        upsert=True
    )
    
    source = "your OpenAI key" if settings.openai_api_key else "Emergent LLM key (default)"
    return {"message": f"Settings saved. Chat will now use {source}."}


@router.get("/emailjs")
async def get_emailjs_settings(authorization: str = Header(None)):
    """Get EmailJS settings (admin only)."""
    await get_admin_user(authorization)
    
    settings = await db.settings.find_one({"type": "emailjs"})
    
    if not settings:
        return {
            "service_id": "",
            "template_id": "",
            "public_key": "",
            "is_configured": False
        }
    
    return {
        "service_id": settings.get("service_id", ""),
        "template_id": settings.get("template_id", ""),
        "public_key": settings.get("public_key", "")[:8] + "****" if settings.get("public_key") else "",
        "is_configured": bool(settings.get("service_id") and settings.get("template_id") and settings.get("public_key"))
    }


@router.post("/emailjs")
async def save_emailjs_settings(emailjs: EmailJSSettings, authorization: str = Header(None)):
    """Save EmailJS settings for email notifications (admin only)."""
    await get_admin_user(authorization)
    
    await db.settings.update_one(
        {"type": "emailjs"},
        {"$set": {
            "type": "emailjs",
            "service_id": emailjs.service_id,
            "template_id": emailjs.template_id,
            "public_key": emailjs.public_key
        }},
        upsert=True
    )
    
    # Update environment variables for the email service
    os.environ['EMAILJS_SERVICE_ID'] = emailjs.service_id
    os.environ['EMAILJS_TEMPLATE_ID'] = emailjs.template_id
    os.environ['EMAILJS_PUBLIC_KEY'] = emailjs.public_key
    
    return {"message": "EmailJS settings saved successfully"}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_igris(chat: ChatMessage, authorization: str = Header(None)):
    """Chat with IGRIS AI assistant. Supports text and image analysis.
    Uses admin's OpenAI key if configured, otherwise Emergent LLM key."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate that at least message or image is provided
    if not chat.message and not chat.image:
        raise HTTPException(status_code=400, detail="Message or image is required")
    
    # Use the LLM service which handles key selection
    user_email = payload.get("sub", "anonymous")
    session_id = f"igris_chat_{user_email}"
    
    try:
        result = await llm_service.chat(
            message=chat.message,
            session_id=session_id,
            image_data=chat.image
        )
        
        if result["success"]:
            return ChatResponse(
                response=result["response"],
                source=result["source"]
            )
        else:
            # Return the error message as the response
            return ChatResponse(
                response=result["response"],
                source=result.get("source", "none")
            )
            
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get AI response: {str(e)}")


# Demo Video Settings (Public endpoint)
@router.get("/demo-video")
async def get_demo_video():
    """Get demo video URL (public endpoint - no auth required)"""
    settings = await db.settings.find_one({"key": "demo_video"}, {"_id": 0})
    return {"video_url": settings.get("video_url", "") if settings else ""}


class DemoVideoUpdate(BaseModel):
    video_url: str = ""


@router.post("/demo-video")
async def save_demo_video(
    settings: DemoVideoUpdate,
    authorization: str = Header(None)
):
    """Save demo video URL (admin only)"""
    admin = await get_admin_user(authorization)
    
    await db.settings.update_one(
        {"key": "demo_video"},
        {"$set": {"key": "demo_video", "video_url": settings.video_url or ""}},
        upsert=True
    )
    
    return {"success": True, "message": "Demo video URL saved successfully", "video_url": settings.video_url}
