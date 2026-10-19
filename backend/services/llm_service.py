import os
import logging
import base64
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection for settings
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class LLMService:
    """Service for AI chat using Emergent LLM key or admin's OpenAI key"""
    
    def __init__(self):
        self.emergent_key = os.environ.get('EMERGENT_LLM_KEY', '')
        self.system_message = """You are IGRIS, an AI trading assistant for the IGRIS trading platform. You help traders with:
- Market analysis and trading signals
- Technical analysis (RSI, MACD, support/resistance, etc.)
- Risk management strategies
- Trading psychology and discipline
- MT5 platform questions
- Cryptocurrency and forex trading insights
- Analyzing trading charts and images

Be concise, professional, and helpful. Provide actionable insights when possible. Always remind users that trading involves risk and past performance doesn't guarantee future results.

When analyzing images:
- Identify chart patterns, indicators, and key levels
- Provide specific observations about price action
- Suggest potential trading opportunities if visible
- Point out any risks or cautions"""
    
    async def get_api_key(self) -> tuple[str, str]:
        """Get the API key to use - admin's key or Emergent key
        
        Returns:
            Tuple of (api_key, source) where source is 'admin' or 'emergent'
        """
        # Check if admin has configured their own OpenAI key
        settings = await db.settings.find_one({"type": "api_keys"})
        admin_key = settings.get("openai_api_key") if settings else None
        
        if admin_key:
            return admin_key, "admin"
        elif self.emergent_key:
            return self.emergent_key, "emergent"
        else:
            return "", "none"
    
    async def chat(self, message: str, session_id: str = "default", image_data: Optional[str] = None) -> dict:
        """Send a message to the AI and get a response
        
        Args:
            message: User's message
            session_id: Session ID for conversation tracking
            image_data: Optional base64 encoded image data
            
        Returns:
            Dictionary with response and metadata
        """
        api_key, source = await self.get_api_key()
        
        if not api_key:
            return {
                "success": False,
                "response": "I'm sorry, but the AI chat feature hasn't been configured yet. Please ask an administrator to add the OpenAI API key in the API Settings, or the Emergent LLM key will be used by default.",
                "source": "none"
            }
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
            
            # Initialize chat with API key
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=self.system_message
            )
            
            # Use OpenAI gpt-4o model (supports vision)
            chat.with_model("openai", "gpt-4o")
            
            # Create user message with optional image
            if image_data:
                # Extract base64 content from data URL if needed
                if image_data.startswith("data:"):
                    # Format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...
                    _, base64_content = image_data.split(",", 1)
                else:
                    # Assume it's already base64 content
                    base64_content = image_data
                
                # Create ImageContent for the image
                image_content = ImageContent(image_base64=base64_content)
                
                user_message = UserMessage(
                    text=message if message else "Please analyze this trading chart or image.",
                    file_contents=[image_content]
                )
                logger.info(f"Sending message with image to LLM")
            else:
                user_message = UserMessage(text=message)
            
            # Send message and get response
            response = await chat.send_message(user_message)
            
            logger.info(f"Chat response generated using {source} key")
            
            return {
                "success": True,
                "response": response,
                "source": source
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"LLM error: {error_msg}")
            
            # Check for common errors
            if "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                return {
                    "success": False,
                    "response": "The API key appears to be invalid. Please check the configuration in API Settings.",
                    "source": source,
                    "error": error_msg
                }
            elif "rate_limit" in error_msg.lower():
                return {
                    "success": False,
                    "response": "Rate limit reached. Please try again in a moment.",
                    "source": source,
                    "error": error_msg
                }
            else:
                return {
                    "success": False,
                    "response": "I encountered an error while processing your request. Please try again.",
                    "source": source,
                    "error": error_msg
                }


# Global service instance
llm_service = LLMService()
