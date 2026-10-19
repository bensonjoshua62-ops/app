"""Email Templates API Routes"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List
from services.email_templates import EmailTemplateService, EmailDeliveryService
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[os.environ.get('DB_NAME')]


async def get_admin_from_token(authorization: str):
    """Verify admin token and return admin user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.split(' ')[1]
    
    import jwt
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET_KEY', 'igris-secret-key-change-in-production'), algorithms=['HS256'])
        # The 'sub' field contains email, 'user_id' contains the actual user ID
        user_id = payload.get('user_id') or payload.get('sub')
        user = await db.users.find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
        
        if not user or not user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class UpdateTemplateRequest(BaseModel):
    html_content: str
    enabled: bool = True
    custom_subject: Optional[str] = None


class SMTPConfigRequest(BaseModel):
    host: str
    port: int = 587
    user: str
    password: str
    sender_email: EmailStr
    sender_name: str = "IGRIS Trading"
    use_tls: bool = True


class SendTestEmailRequest(BaseModel):
    template_id: str
    recipient_email: EmailStr
    test_variables: Optional[Dict] = None


class SendTemplateEmailRequest(BaseModel):
    template_id: str
    recipient_email: EmailStr
    variables: Dict


# Get all template types
@router.get("/types")
async def get_template_types(authorization: str = Header(None)):
    """Get all available email template types"""
    await get_admin_from_token(authorization)
    return await EmailTemplateService.get_template_types()


# Get all templates with their content
@router.get("/")
async def get_all_templates(authorization: str = Header(None)):
    """Get all email templates with current content and status"""
    await get_admin_from_token(authorization)
    templates = await EmailTemplateService.get_all_templates()
    return {"templates": templates}


# Get single template
@router.get("/{template_id}")
async def get_template(template_id: str, authorization: str = Header(None)):
    """Get a specific email template"""
    await get_admin_from_token(authorization)
    template = await EmailTemplateService.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# Update template
@router.put("/{template_id}")
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    authorization: str = Header(None)
):
    """Update an email template's content and settings"""
    await get_admin_from_token(authorization)
    
    template = await EmailTemplateService.update_template(
        template_id,
        request.html_content,
        request.enabled,
        request.custom_subject
    )
    
    return {"success": True, "template": template}


# Reset template to default
@router.post("/{template_id}/reset")
async def reset_template(template_id: str, authorization: str = Header(None)):
    """Reset a template to its default content"""
    await get_admin_from_token(authorization)
    template = await EmailTemplateService.reset_template(template_id)
    return {"success": True, "template": template}


# Toggle template enabled/disabled
@router.post("/{template_id}/toggle")
async def toggle_template(template_id: str, authorization: str = Header(None)):
    """Toggle a template's enabled status"""
    await get_admin_from_token(authorization)
    
    current = await EmailTemplateService.get_template(template_id)
    if not current:
        raise HTTPException(status_code=404, detail="Template not found")
    
    new_enabled = not current.get("enabled", True)
    template = await EmailTemplateService.update_template(
        template_id,
        current["html_content"],
        new_enabled,
        current.get("custom_subject")
    )
    
    return {"success": True, "enabled": new_enabled, "template": template}


# SMTP Configuration
@router.get("/config/smtp")
async def get_smtp_config(authorization: str = Header(None)):
    """Get current SMTP configuration"""
    await get_admin_from_token(authorization)
    config = await EmailDeliveryService.get_email_config()
    return {"config": config}


@router.post("/config/smtp")
async def save_smtp_config(
    request: SMTPConfigRequest,
    authorization: str = Header(None)
):
    """Configure SMTP email settings"""
    await get_admin_from_token(authorization)
    
    from services.smtp_service import smtp_service
    result = await smtp_service.save_config(
        host=request.host,
        port=request.port,
        user=request.user,
        password=request.password,
        sender_email=request.sender_email,
        sender_name=request.sender_name,
        use_tls=request.use_tls
    )
    
    return result


@router.post("/config/smtp/test")
async def test_smtp_connection(authorization: str = Header(None)):
    """Test SMTP connection"""
    await get_admin_from_token(authorization)
    
    from services.smtp_service import smtp_service
    result = await smtp_service.test_connection()
    
    return result


# Legacy endpoint (for backward compatibility)
@router.get("/config/service")
async def get_email_service_config(authorization: str = Header(None)):
    """Get current email service configuration (SMTP)"""
    await get_admin_from_token(authorization)
    config = await EmailDeliveryService.get_email_config()
    return {"config": config}


# Send test email
@router.post("/test")
async def send_test_email(
    request: SendTestEmailRequest,
    authorization: str = Header(None)
):
    """Send a test email using a template"""
    await get_admin_from_token(authorization)
    
    # Default test variables
    default_vars = {
        "user_name": "Test User",
        "broker_name": "Test Broker",
        "account_number": "****1234",
        "leverage": "1:100",
        "server": "Test-Server",
        "account_type": "Demo",
        "time_connected": "2025-01-01 12:00:00 UTC",
        "symbol": "EURUSD",
        "direction": "BUY",
        "lot_size": "0.10",
        "entry_price": "1.08500",
        "exit_price": "1.08750",
        "stop_loss": "1.08200",
        "take_profit": "1.09000",
        "strategy_name": "Sweep Entry AI",
        "profit": "250.00",
        "loss": "50.00",
        "pips_gained": "25",
        "duration": "2h 15m",
        "updated_balance": "10,250.00",
        "sl_respected": "Yes",
        "risk_percent": "1.5",
        "drawdown": "3.2",
        "trades_taken": "5",
        "wins": "4",
        "losses": "1",
        "net_profit": "450.00",
        "balance": "10,450.00",
        "equity": "10,500.00",
        "win_rate": "80",
        "weekly_roi": "4.5",
        "total_trades": "15",
        "best_trade": "350.00",
        "worst_trade": "75.00",
        "account_growth": "4.5",
        "current_drawdown": "5.0",
        "open_risk": "2.0",
        "suggested_actions": "Consider reducing position sizes",
        "protection_type": "Max Drawdown",
        "trigger_reason": "Drawdown exceeded 10%",
        "timestamp": "2025-01-01 12:00:00 UTC",
        "what_changed": "Improved entry algorithm",
        "why": "Better market condition detection",
        "expected_benefit": "15% improvement in win rate",
        "restart_instructions": "No action required - auto-applied",
        "plan_name": "Pro Plan",
        "status": "Active",
        "renewal_date": "2025-02-01",
        "next_billing": "$99.00",
        "action_link": "https://igris.com/dashboard/subscription"
    }
    
    variables = {**default_vars, **(request.test_variables or {})}
    
    result = await EmailDeliveryService.send_template_email(
        request.template_id,
        request.recipient_email,
        variables
    )
    
    return result


# Send template email (for internal use by other services)
@router.post("/send")
async def send_template_email(
    request: SendTemplateEmailRequest,
    authorization: str = Header(None)
):
    """Send an email using a template"""
    await get_admin_from_token(authorization)
    
    result = await EmailDeliveryService.send_template_email(
        request.template_id,
        request.recipient_email,
        request.variables
    )
    
    return result
