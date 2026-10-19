"""SMTP Email Service - Direct SMTP email sending"""

import os
import ssl
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import aiosmtplib

logger = logging.getLogger(__name__)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[DB_NAME]


class SMTPEmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        # Load from environment variables first (for deployment)
        self.smtp_host = os.environ.get('SMTP_HOST', '')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 465))
        self.smtp_user = os.environ.get('SMTP_USER', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.sender_email = os.environ.get('SMTP_SENDER_EMAIL', '') or self.smtp_user
        self.sender_name = os.environ.get('SMTP_SENDER_NAME', 'IGRIS Trading')
        self.use_tls = os.environ.get('SMTP_USE_TLS', 'false').lower() != 'true'  # Port 465 uses SSL, not STARTTLS
        
    async def load_config_from_db(self):
        """Load SMTP configuration from database, or save env vars to DB if available"""
        try:
            config = await db.settings.find_one({"key": "smtp_config"}, {"_id": 0})
            if config and config.get("value"):
                smtp_config = config.get("value", {})
                self.smtp_host = smtp_config.get("host") or self.smtp_host
                self.smtp_port = int(smtp_config.get("port") or self.smtp_port)
                self.smtp_user = smtp_config.get("user") or self.smtp_user
                self.smtp_password = smtp_config.get("password") or self.smtp_password
                self.sender_email = smtp_config.get("sender_email") or self.sender_email
                self.sender_name = smtp_config.get("sender_name") or self.sender_name
                self.use_tls = smtp_config.get("use_tls", self.use_tls)
                logger.info(f"SMTP config loaded from database: host={self.smtp_host}, user={self.smtp_user}")
            elif self.smtp_host and self.smtp_user and self.smtp_password:
                # If we have env vars but no DB config, SAVE to DB for persistence across deployments
                logger.info(f"SMTP config from env vars - saving to database: host={self.smtp_host}")
                await self.save_config(
                    host=self.smtp_host,
                    port=self.smtp_port,
                    user=self.smtp_user,
                    password=self.smtp_password,
                    sender_email=self.sender_email or self.smtp_user,
                    sender_name=self.sender_name,
                    use_tls=self.use_tls
                )
                logger.info("SMTP config saved to database for persistence")
        except Exception as e:
            logger.warning(f"Failed to load SMTP config from DB: {e}")
    
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured"""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password and self.sender_email)
    
    async def save_config(self, host: str, port: int, user: str, password: str, 
                          sender_email: str, sender_name: str = "IGRIS Trading", use_tls: bool = True) -> Dict:
        """Save SMTP configuration to database"""
        config = {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "sender_email": sender_email,
            "sender_name": sender_name,
            "use_tls": use_tls,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.settings.update_one(
            {"key": "smtp_config"},
            {"$set": {"key": "smtp_config", "value": config}},
            upsert=True
        )
        
        # Update instance config
        self.smtp_host = host
        self.smtp_port = port
        self.smtp_user = user
        self.smtp_password = password
        self.sender_email = sender_email
        self.sender_name = sender_name
        self.use_tls = use_tls
        
        return {"success": True, "message": "SMTP configuration saved successfully"}
    
    async def get_config(self) -> Dict:
        """Get current SMTP configuration (without password)"""
        await self.load_config_from_db()
        
        return {
            "host": self.smtp_host,
            "port": self.smtp_port,
            "user": self.smtp_user,
            "sender_email": self.sender_email,
            "sender_name": self.sender_name,
            "use_tls": self.use_tls,
            "is_configured": self.is_configured()
        }
    
    async def send_email(self, to_email: str, subject: str, html_content: str, 
                         plain_text: str = None) -> Dict:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            plain_text: Optional plain text fallback
            
        Returns:
            Dictionary with status and message
        """
        # Load latest config from DB
        await self.load_config_from_db()
        
        if not self.is_configured():
            # Log to database for testing
            logger.warning("SMTP not configured - logging email to database")
            await self._log_email(to_email, subject, html_content, "logged", "database_log", 
                                  note="SMTP not configured - email logged for testing")
            return {
                "success": True,
                "message": f"Email logged (SMTP not configured). Would be sent to {to_email}",
                "method": "database_log"
            }
        
        try:
            # Create message with anti-spam headers
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = to_email
            message["Reply-To"] = self.sender_email
            message["X-Mailer"] = "IGRIS Trading Platform"
            message["X-Priority"] = "3"  # Normal priority
            message["MIME-Version"] = "1.0"
            
            # Generate unique Message-ID to improve deliverability
            import uuid
            domain = self.sender_email.split('@')[-1] if '@' in self.sender_email else 'igris.com'
            message["Message-ID"] = f"<{uuid.uuid4()}@{domain}>"
            
            # Add date header
            from email.utils import formatdate
            message["Date"] = formatdate(localtime=True)
            
            # Always add plain text part first (improves deliverability)
            if plain_text:
                part1 = MIMEText(plain_text, "plain", "utf-8")
                message.attach(part1)
            else:
                # Generate plain text from HTML if not provided
                import re
                clean_text = re.sub('<[^<]+?>', '', html_content)
                clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                part1 = MIMEText(clean_text[:500], "plain", "utf-8")
                message.attach(part1)
            
            # Add HTML part
            part2 = MIMEText(html_content, "html", "utf-8")
            message.attach(part2)
            
            # Send via SMTP
            if self.use_tls:
                # Use STARTTLS
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    username=self.smtp_user,
                    password=self.smtp_password,
                    start_tls=True
                )
            else:
                # Direct SSL connection (port 465)
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    username=self.smtp_user,
                    password=self.smtp_password,
                    use_tls=True
                )
            
            logger.info(f"Email sent successfully via SMTP to {to_email}")
            
            # Log success
            await self._log_email(to_email, subject, html_content, "sent", "smtp")
            
            return {
                "success": True,
                "message": f"Email sent to {to_email} via SMTP",
                "method": "smtp"
            }
            
        except aiosmtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(error_msg)
            await self._log_email(to_email, subject, html_content, "failed", "smtp", error=error_msg)
            return {"success": False, "message": error_msg}
            
        except aiosmtplib.SMTPConnectError as e:
            error_msg = f"SMTP connection failed: {str(e)}"
            logger.error(error_msg)
            await self._log_email(to_email, subject, html_content, "failed", "smtp", error=error_msg)
            return {"success": False, "message": error_msg}
            
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            await self._log_email(to_email, subject, html_content, "failed", "smtp", error=error_msg)
            return {"success": False, "message": error_msg}
    
    async def _log_email(self, to_email: str, subject: str, html_content: str, 
                         status: str, method: str, error: str = None, note: str = None):
        """Log email to database"""
        log_entry = {
            "to_email": to_email,
            "subject": subject,
            "html_content": html_content[:1000] if html_content else "",  # Truncate
            "status": status,
            "method": method,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        if error:
            log_entry["error"] = error
        if note:
            log_entry["note"] = note
            
        await db.email_logs.insert_one(log_entry)
    
    async def test_connection(self) -> Dict:
        """Test SMTP connection without sending email"""
        await self.load_config_from_db()
        
        if not self.is_configured():
            return {"success": False, "message": "SMTP not configured"}
        
        try:
            if self.use_tls:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    start_tls=True
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True
                )
            
            await smtp.connect()
            await smtp.login(self.smtp_user, self.smtp_password)
            await smtp.quit()
            
            return {"success": True, "message": "SMTP connection successful"}
            
        except Exception as e:
            return {"success": False, "message": f"SMTP connection failed: {str(e)}"}
    
    async def send_trade_alert(self, trade_data: Dict, user_email: str) -> Dict:
        """Send trade alert email"""
        subject = f"Trade Alert: {trade_data.get('type', 'SIGNAL')} {trade_data.get('symbol', 'N/A')}"
        
        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
      <p style="color: #888;">AI Trading Platform</p>
    </div>
    <h2 style="color: {'#10b981' if trade_data.get('type') == 'BUY' else '#ef4444'};">
      {'📈' if trade_data.get('type') == 'BUY' else '📉'} {trade_data.get('type', 'SIGNAL')} Signal
    </h2>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>Symbol:</strong> {trade_data.get('symbol', 'N/A')}</p>
      <p><strong>Type:</strong> {trade_data.get('type', 'N/A')}</p>
      <p><strong>Entry Price:</strong> {trade_data.get('open_price', trade_data.get('entry', 'N/A'))}</p>
      <p><strong>Volume:</strong> {trade_data.get('volume', 'N/A')}</p>
      <p><strong>Stop Loss:</strong> {trade_data.get('sl', trade_data.get('stop_loss', 'N/A'))}</p>
      <p><strong>Take Profit:</strong> {trade_data.get('tp', trade_data.get('take_profit', 'N/A'))}</p>
      {f"<p><strong>Profit:</strong> ${trade_data.get('profit', 0):.2f}</p>" if trade_data.get('profit') else ""}
      <p><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
    </div>
    <p style="color: #888; font-size: 12px;">This is an automated alert from IGRIS Trading Platform.</p>
  </div>
</body>
</html>"""
        
        return await self.send_email(user_email, subject, html_content)


# Global service instance
smtp_service = SMTPEmailService()


# Wrapper function for backward compatibility
async def send_email(to_email: str, subject: str, body: str) -> Dict:
    """
    Send email via SMTP - backward compatible wrapper
    """
    return await smtp_service.send_email(to_email, subject, body)
