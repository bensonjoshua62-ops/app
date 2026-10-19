"""Email Templates Service - Manages 10 different email template types"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[os.environ.get('DB_NAME')]

# Email template types
EMAIL_TEMPLATE_TYPES = [
    {
        "id": "account_connected",
        "name": "Account Connection Successful",
        "subject": "Your Trading Account Has Been Connected Successfully",
        "description": "Sent when user successfully connects their MT5 account",
        "variables": ["user_name", "broker_name", "account_number", "leverage", "server", "account_type", "time_connected"]
    },
    {
        "id": "trade_opened",
        "name": "New Trade Opened",
        "subject": "New Trade Executed on Your Account",
        "description": "Sent when AI opens any position",
        "variables": ["user_name", "symbol", "direction", "lot_size", "entry_price", "stop_loss", "take_profit", "strategy_name"]
    },
    {
        "id": "trade_closed_profit",
        "name": "Trade Closed (Profit)",
        "subject": "Trade Closed in Profit",
        "description": "Sent when trade closes in profit",
        "variables": ["user_name", "symbol", "entry_price", "exit_price", "profit", "pips_gained", "duration", "updated_balance"]
    },
    {
        "id": "trade_closed_loss",
        "name": "Trade Closed (Loss)",
        "subject": "Trade Closed – Risk Managed",
        "description": "Sent when trade closes in loss",
        "variables": ["user_name", "symbol", "loss", "sl_respected", "risk_percent", "updated_balance", "drawdown"]
    },
    {
        "id": "daily_summary",
        "name": "Daily Trading Summary",
        "subject": "Your Daily AI Trading Performance",
        "description": "Sent daily with trading summary",
        "variables": ["user_name", "trades_taken", "wins", "losses", "net_profit", "balance", "equity", "win_rate", "drawdown"]
    },
    {
        "id": "weekly_report",
        "name": "Weekly Performance Report",
        "subject": "Your Weekly Trading Performance Report",
        "description": "Sent weekly with performance metrics",
        "variables": ["user_name", "weekly_roi", "total_trades", "best_trade", "worst_trade", "account_growth"]
    },
    {
        "id": "risk_warning",
        "name": "Drawdown / Risk Warning",
        "subject": "Important: Account Risk Level Alert",
        "description": "Sent when drawdown reaches threshold",
        "variables": ["user_name", "current_drawdown", "open_risk", "suggested_actions"]
    },
    {
        "id": "protection_activated",
        "name": "Account Protection Activated",
        "subject": "Trading Paused – Account Protection Triggered",
        "description": "Sent when safety systems pause trading",
        "variables": ["user_name", "protection_type", "trigger_reason", "timestamp"]
    },
    {
        "id": "strategy_update",
        "name": "Strategy Update Notice",
        "subject": "AI Trading System Update Applied",
        "description": "Sent when system is updated",
        "variables": ["user_name", "what_changed", "why", "expected_benefit", "restart_instructions"]
    },
    {
        "id": "subscription_status",
        "name": "Payment / Subscription Status",
        "subject": "Subscription Status Update",
        "description": "Sent for subscription events",
        "variables": ["user_name", "plan_name", "status", "renewal_date", "next_billing", "action_link"]
    }
]

# Default HTML templates
DEFAULT_TEMPLATES = {
    "account_connected": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
      <p style="color: #888;">AI Trading Platform</p>
    </div>
    <h2 style="color: #10b981;">✅ Account Connected Successfully!</h2>
    <p>Hello {{user_name}},</p>
    <p>Your trading account has been successfully connected to IGRIS.</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>Broker:</strong> {{broker_name}}</p>
      <p><strong>Account:</strong> {{account_number}}</p>
      <p><strong>Leverage:</strong> {{leverage}}</p>
      <p><strong>Server:</strong> {{server}}</p>
      <p><strong>Type:</strong> {{account_type}}</p>
      <p><strong>Connected:</strong> {{time_connected}}</p>
    </div>
    <p style="color: #888; font-size: 12px;">This is an automated message from IGRIS Trading Platform.</p>
  </div>
</body>
</html>""",

    "trade_opened": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #3b82f6;">📈 New Trade Executed</h2>
    <p>Hello {{user_name}},</p>
    <p>A new trade has been opened on your account.</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>Symbol:</strong> {{symbol}}</p>
      <p><strong>Direction:</strong> <span style="color: {{direction}}=='BUY' ? '#10b981' : '#ef4444'">{{direction}}</span></p>
      <p><strong>Lot Size:</strong> {{lot_size}}</p>
      <p><strong>Entry Price:</strong> {{entry_price}}</p>
      <p><strong>Stop Loss:</strong> {{stop_loss}}</p>
      <p><strong>Take Profit:</strong> {{take_profit}}</p>
      <p><strong>Strategy:</strong> {{strategy_name}}</p>
    </div>
  </div>
</body>
</html>""",

    "trade_closed_profit": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #10b981;">💰 Trade Closed in Profit!</h2>
    <p>Hello {{user_name}},</p>
    <p>Great news! Your trade has closed in profit.</p>
    <div style="background: rgba(16,185,129,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(16,185,129,0.3);">
      <p><strong>Symbol:</strong> {{symbol}}</p>
      <p><strong>Entry → Exit:</strong> {{entry_price}} → {{exit_price}}</p>
      <p style="font-size: 24px; color: #10b981;"><strong>Profit: +${{profit}}</strong></p>
      <p><strong>Pips Gained:</strong> +{{pips_gained}}</p>
      <p><strong>Duration:</strong> {{duration}}</p>
      <p><strong>Updated Balance:</strong> ${{updated_balance}}</p>
    </div>
  </div>
</body>
</html>""",

    "trade_closed_loss": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #f59e0b;">📊 Trade Closed – Risk Managed</h2>
    <p>Hello {{user_name}},</p>
    <p>A trade has been closed with a controlled loss.</p>
    <div style="background: rgba(239,68,68,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(239,68,68,0.3);">
      <p><strong>Symbol:</strong> {{symbol}}</p>
      <p style="font-size: 20px; color: #ef4444;"><strong>Loss: -${{loss}}</strong></p>
      <p><strong>Stop Loss Respected:</strong> {{sl_respected}}</p>
      <p><strong>Risk Used:</strong> {{risk_percent}}%</p>
      <p><strong>Updated Balance:</strong> ${{updated_balance}}</p>
      <p><strong>Drawdown:</strong> {{drawdown}}%</p>
    </div>
    <p style="color: #888; font-size: 13px;">Risk management is key to long-term trading success.</p>
  </div>
</body>
</html>""",

    "daily_summary": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #8b5cf6;">📊 Daily Trading Summary</h2>
    <p>Hello {{user_name}},</p>
    <p>Here's your trading performance for today:</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>Trades Taken:</strong> {{trades_taken}}</p>
      <p><strong>Wins / Losses:</strong> {{wins}} / {{losses}}</p>
      <p><strong>Win Rate:</strong> {{win_rate}}%</p>
      <p><strong>Net P/L:</strong> ${{net_profit}}</p>
      <p><strong>Balance:</strong> ${{balance}}</p>
      <p><strong>Equity:</strong> ${{equity}}</p>
      <p><strong>Drawdown:</strong> {{drawdown}}%</p>
    </div>
  </div>
</body>
</html>""",

    "weekly_report": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #06b6d4;">📈 Weekly Performance Report</h2>
    <p>Hello {{user_name}},</p>
    <p>Here's your weekly trading performance:</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="font-size: 24px; color: #10b981;"><strong>Weekly ROI: {{weekly_roi}}%</strong></p>
      <p><strong>Total Trades:</strong> {{total_trades}}</p>
      <p><strong>Best Trade:</strong> +${{best_trade}}</p>
      <p><strong>Worst Trade:</strong> -${{worst_trade}}</p>
      <p><strong>Account Growth:</strong> {{account_growth}}%</p>
    </div>
  </div>
</body>
</html>""",

    "risk_warning": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(239,68,68,0.3);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #ef4444;">⚠️ Account Risk Level Alert</h2>
    <p>Hello {{user_name}},</p>
    <p>Your account has reached a risk threshold that requires attention.</p>
    <div style="background: rgba(239,68,68,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(239,68,68,0.3);">
      <p style="font-size: 24px; color: #ef4444;"><strong>Current Drawdown: {{current_drawdown}}%</strong></p>
      <p><strong>Open Risk:</strong> {{open_risk}}%</p>
      <p><strong>Suggested Actions:</strong> {{suggested_actions}}</p>
    </div>
    <p style="color: #888; font-size: 12px;">Trading involves risk. Never trade with money you cannot afford to lose.</p>
  </div>
</body>
</html>""",

    "protection_activated": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(245,158,11,0.3);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #f59e0b;">🛡️ Trading Paused – Account Protection</h2>
    <p>Hello {{user_name}},</p>
    <p>Trading has been automatically paused to protect your account.</p>
    <div style="background: rgba(245,158,11,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(245,158,11,0.3);">
      <p><strong>Protection Type:</strong> {{protection_type}}</p>
      <p><strong>Trigger Reason:</strong> {{trigger_reason}}</p>
      <p><strong>Timestamp:</strong> {{timestamp}}</p>
    </div>
    <p>You can resume trading from your dashboard once conditions improve.</p>
  </div>
</body>
</html>""",

    "strategy_update": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #8b5cf6;">🔄 AI System Update Applied</h2>
    <p>Hello {{user_name}},</p>
    <p>We've made improvements to your trading system.</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>What Changed:</strong> {{what_changed}}</p>
      <p><strong>Why:</strong> {{why}}</p>
      <p><strong>Expected Benefit:</strong> {{expected_benefit}}</p>
      <p><strong>Restart Instructions:</strong> {{restart_instructions}}</p>
    </div>
  </div>
</body>
</html>""",

    "subscription_status": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #12121a, #1a1a2e); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0;">IGRIS</h1>
    </div>
    <h2 style="color: #10b981;">📋 Subscription Status Update</h2>
    <p>Hello {{user_name}},</p>
    <p>Here's an update on your subscription:</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p><strong>Plan:</strong> {{plan_name}}</p>
      <p><strong>Status:</strong> {{status}}</p>
      <p><strong>Renewal Date:</strong> {{renewal_date}}</p>
      <p><strong>Next Billing:</strong> {{next_billing}}</p>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="{{action_link}}" style="background: #FFA500; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Manage Subscription</a>
    </div>
  </div>
</body>
</html>"""
}


class EmailTemplateService:
    """Service for managing email templates"""
    
    @staticmethod
    async def get_template_types() -> List[Dict]:
        """Get all available template types with their metadata"""
        return EMAIL_TEMPLATE_TYPES
    
    @staticmethod
    async def get_all_templates() -> List[Dict]:
        """Get all templates with their current content and status"""
        templates = []
        for template_type in EMAIL_TEMPLATE_TYPES:
            # Check if custom template exists in DB
            custom = await db.email_templates.find_one(
                {"template_id": template_type["id"]},
                {"_id": 0}
            )
            
            templates.append({
                **template_type,
                "html_content": custom.get("html_content", DEFAULT_TEMPLATES.get(template_type["id"], "")) if custom else DEFAULT_TEMPLATES.get(template_type["id"], ""),
                "enabled": custom.get("enabled", True) if custom else True,
                "custom_subject": custom.get("custom_subject") if custom else None,
                "last_updated": custom.get("last_updated") if custom else None
            })
        
        return templates
    
    @staticmethod
    async def get_template(template_id: str) -> Optional[Dict]:
        """Get a specific template by ID"""
        template_type = next((t for t in EMAIL_TEMPLATE_TYPES if t["id"] == template_id), None)
        if not template_type:
            return None
        
        custom = await db.email_templates.find_one(
            {"template_id": template_id},
            {"_id": 0}
        )
        
        return {
            **template_type,
            "html_content": custom.get("html_content", DEFAULT_TEMPLATES.get(template_id, "")) if custom else DEFAULT_TEMPLATES.get(template_id, ""),
            "enabled": custom.get("enabled", True) if custom else True,
            "custom_subject": custom.get("custom_subject") if custom else None,
            "last_updated": custom.get("last_updated") if custom else None
        }
    
    @staticmethod
    async def update_template(template_id: str, html_content: str, enabled: bool = True, custom_subject: str = None) -> Dict:
        """Update a template's content and settings"""
        await db.email_templates.update_one(
            {"template_id": template_id},
            {
                "$set": {
                    "template_id": template_id,
                    "html_content": html_content,
                    "enabled": enabled,
                    "custom_subject": custom_subject,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return await EmailTemplateService.get_template(template_id)
    
    @staticmethod
    async def reset_template(template_id: str) -> Dict:
        """Reset template to default"""
        await db.email_templates.delete_one({"template_id": template_id})
        return await EmailTemplateService.get_template(template_id)
    
    @staticmethod
    def render_template(html_content: str, variables: Dict) -> str:
        """Render template with variables"""
        rendered = html_content
        for key, value in variables.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value) if value else "")
        return rendered


class EmailDeliveryService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    async def get_email_config() -> Optional[Dict]:
        """Get SMTP configuration"""
        from services.smtp_service import smtp_service
        return await smtp_service.get_config()
    
    @staticmethod
    async def save_email_config(host: str, port: int, user: str, password: str, 
                                sender_email: str, sender_name: str = "IGRIS Trading", 
                                use_tls: bool = True) -> Dict:
        """Save SMTP configuration"""
        from services.smtp_service import smtp_service
        return await smtp_service.save_config(host, port, user, password, sender_email, sender_name, use_tls)
    
    @staticmethod
    async def send_email(to_email: str, subject: str, html_content: str) -> Dict:
        """Send email via SMTP"""
        from services.smtp_service import smtp_service
        return await smtp_service.send_email(to_email, subject, html_content)
    
    @staticmethod
    async def test_connection() -> Dict:
        """Test SMTP connection"""
        from services.smtp_service import smtp_service
        return await smtp_service.test_connection()
    
    @staticmethod
    async def send_template_email(template_id: str, to_email: str, variables: Dict) -> Dict:
        """Send email using a template"""
        template = await EmailTemplateService.get_template(template_id)
        
        if not template:
            return {"success": False, "message": f"Template not found: {template_id}"}
        
        if not template.get("enabled", True):
            return {"success": False, "message": f"Template is disabled: {template_id}"}
        
        subject = template.get("custom_subject") or template.get("subject")
        html_content = EmailTemplateService.render_template(template["html_content"], variables)
        
        return await EmailDeliveryService.send_email(to_email, subject, html_content)


email_template_service = EmailTemplateService()
email_delivery_service = EmailDeliveryService()
