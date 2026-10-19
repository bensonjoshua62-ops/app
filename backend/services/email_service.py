"""Email Service - SMTP-based email sending (replaces EmailJS)"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict
from motor.motor_asyncio import AsyncIOMotorClient
from services.smtp_service import smtp_service

logger = logging.getLogger(__name__)

# Database setup for email logs
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[os.environ.get('DB_NAME')]


class EmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        self.smtp = smtp_service
    
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured"""
        return self.smtp.is_configured()
    
    async def reload_config(self):
        """Reload configuration from database"""
        await self.smtp.load_config_from_db()
    
    async def send_trade_alert(self, trade_data: Dict, user_email: str) -> Dict:
        """Send trade alert email via SMTP"""
        return await self.smtp.send_trade_alert(trade_data, user_email)


# Global service instance
email_service = EmailService()


async def send_email(to_email: str, subject: str, body: str) -> Dict:
    """
    Send email via SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (HTML supported)
        
    Returns:
        Dictionary with status and message
    """
    return await smtp_service.send_email(to_email, subject, body)
