from fastapi import APIRouter, Header, HTTPException
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

router = APIRouter(prefix="/admin", tags=["Admin"])

# Helper function to get admin user from token
async def get_admin_from_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    from utils.auth import verify_token
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


class EmailTemplate(BaseModel):
    name: str
    subject: str
    body: str
    type: str  # signal, trade, welcome, etc.
    variables: Optional[List[str]] = []


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    type: Optional[str] = None
    variables: Optional[List[str]] = None


# Email Templates
@router.get("/email-templates")
async def get_email_templates(authorization: str = Header(None)):
    """Get all email templates"""
    await get_admin_from_token(authorization)
    
    templates = await db.email_templates.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    # Add default templates if none exist
    if not templates:
        templates = get_default_templates()
    
    return {"templates": templates}


@router.post("/email-templates")
async def create_email_template(
    template: EmailTemplate,
    authorization: str = Header(None)
):
    """Create a new email template"""
    admin = await get_admin_from_token(authorization)
    
    template_doc = {
        "id": str(uuid.uuid4()),
        "name": template.name,
        "subject": template.subject,
        "body": template.body,
        "type": template.type,
        "variables": template.variables or [],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("id")
    }
    
    await db.email_templates.insert_one(template_doc)
    
    return {"success": True, "template": {k: v for k, v in template_doc.items() if k != "_id"}}


@router.put("/email-templates/{template_id}")
async def update_email_template(
    template_id: str,
    template: EmailTemplateUpdate,
    authorization: str = Header(None)
):
    """Update an email template"""
    await get_admin_from_token(authorization)
    
    update_data = {k: v for k, v in template.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.email_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    return {"success": True, "template": updated}


@router.delete("/email-templates/{template_id}")
async def delete_email_template(
    template_id: str,
    authorization: str = Header(None)
):
    """Delete an email template"""
    await get_admin_from_token(authorization)
    
    result = await db.email_templates.update_one(
        {"id": template_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"success": True, "message": "Template deleted"}


# Test Email Endpoint
class TestEmailRequest(BaseModel):
    template_id: Optional[str] = "test"
    recipient: Optional[str] = None


@router.post("/test-email")
async def send_test_email(
    request: TestEmailRequest,
    authorization: str = Header(None)
):
    """Send a test email to verify configuration"""
    admin = await get_admin_from_token(authorization)
    
    # Get the saved admin email from database as the default recipient
    saved_admin_email = None
    admin_email_setting = await db.settings.find_one({"key": "admin_email"}, {"_id": 0})
    if admin_email_setting:
        saved_admin_email = admin_email_setting.get("value")
    
    # Priority: request.recipient > saved admin email > current admin's email
    recipient = request.recipient or saved_admin_email or admin.get("email")
    
    try:
        # Import email service
        from services.email_service import send_email
        
        result = await send_email(
            to_email=recipient,
            subject="IGRIS Test Email",
            body=f"""
            <h2>Test Email from IGRIS</h2>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p>If you received this email, your SMTP configuration is set up properly.</p>
            <p>Sent at: {datetime.now(timezone.utc).isoformat()}</p>
            """
        )
        
        if result.get("method") == "database_log":
            return {
                "success": True, 
                "message": f"Test email logged to database for {recipient} (SMTP not configured). View in Email Logs section.",
                "method": "database_log",
                "recipient": recipient
            }
        
        return {"success": True, "message": result.get("message", f"Test email sent to {recipient}"), "recipient": recipient}
        
    except Exception as e:
        return {"success": False, "message": f"Failed to send email: {str(e)}"}


# Admin Email Setting
@router.get("/email")
async def get_admin_email(authorization: str = Header(None)):
    """Get admin email address"""
    await get_admin_from_token(authorization)
    
    settings = await db.settings.find_one({"key": "admin_email"}, {"_id": 0})
    
    return {"email": settings.get("value") if settings else None}


@router.put("/email")
async def set_admin_email(
    email: str,
    authorization: str = Header(None)
):
    """Set admin email address"""
    await get_admin_from_token(authorization)
    
    await db.settings.update_one(
        {"key": "admin_email"},
        {"$set": {"value": email, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Admin email updated"}


# Cron Job Status
@router.get("/cron-status")
async def get_cron_status(authorization: str = Header(None)):
    """Get cron job status"""
    await get_admin_from_token(authorization)
    
    try:
        from utils.cron import scheduler
        
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "running": scheduler.running,
            "jobs": jobs,
            "job_count": len(jobs)
        }
    except Exception as e:
        return {
            "running": False,
            "jobs": [],
            "error": str(e)
        }


@router.post("/cron-trigger/{job_name}")
async def trigger_cron_job(
    job_name: str,
    authorization: str = Header(None)
):
    """Manually trigger a cron job"""
    await get_admin_from_token(authorization)
    
    try:
        from utils.cron import scheduler
        
        job = scheduler.get_job(job_name)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job '{job_name}' not found")
        
        # Trigger the job
        job.modify(next_run_time=datetime.now(timezone.utc))
        
        return {"success": True, "message": f"Job '{job_name}' triggered"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_default_templates():
    """Return default email templates"""
    return [
        {
            "id": "default_signal",
            "name": "AI Signal Alert",
            "subject": "🚀 New IGRIS AI Signal: {{pair}} - {{signal}}",
            "body": """
            <h2>New AI Trading Signal</h2>
            <p>IGRIS AI has detected a new trading opportunity:</p>
            <table>
                <tr><td><strong>Pair:</strong></td><td>{{pair}}</td></tr>
                <tr><td><strong>Signal:</strong></td><td>{{signal}}</td></tr>
                <tr><td><strong>Entry:</strong></td><td>{{entry}}</td></tr>
                <tr><td><strong>Take Profit:</strong></td><td>{{tp}}</td></tr>
                <tr><td><strong>Stop Loss:</strong></td><td>{{sl}}</td></tr>
                <tr><td><strong>Confidence:</strong></td><td>{{confidence}}%</td></tr>
            </table>
            <p><em>This is an AI-generated signal. Trade at your own risk.</em></p>
            """,
            "type": "signal",
            "variables": ["pair", "signal", "entry", "tp", "sl", "confidence"],
            "is_active": True
        },
        {
            "id": "default_trade",
            "name": "Trade Notification",
            "subject": "📊 Trade Alert: {{action}} {{pair}}",
            "body": """
            <h2>Trade Notification</h2>
            <p>A trade has been executed on your account:</p>
            <table>
                <tr><td><strong>Action:</strong></td><td>{{action}}</td></tr>
                <tr><td><strong>Pair:</strong></td><td>{{pair}}</td></tr>
                <tr><td><strong>Volume:</strong></td><td>{{volume}} lots</td></tr>
                <tr><td><strong>Price:</strong></td><td>{{price}}</td></tr>
                <tr><td><strong>Time:</strong></td><td>{{time}}</td></tr>
            </table>
            """,
            "type": "trade",
            "variables": ["action", "pair", "volume", "price", "time"],
            "is_active": True
        },
        {
            "id": "default_welcome",
            "name": "Welcome Email",
            "subject": "Welcome to IGRIS - Your AI Trading Journey Begins! 🎉",
            "body": """
            <h2>Welcome to IGRIS!</h2>
            <p>Hi {{name}},</p>
            <p>Thank you for joining IGRIS, the AI-powered trading platform.</p>
            <p>Here's what you can do next:</p>
            <ul>
                <li>Connect your MT5 account</li>
                <li>Explore AI signals</li>
                <li>Chat with IGRIS AI</li>
            </ul>
            <p>Happy Trading!</p>
            """,
            "type": "welcome",
            "variables": ["name"],
            "is_active": True
        }
    ]


# Email Logs - View logged test emails
@router.get("/email-logs")
async def get_email_logs(authorization: str = Header(None), limit: int = 20):
    """Get recent email logs (for testing when SMTP is not configured)"""
    await get_admin_from_token(authorization)
    
    logs = await db.email_logs.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(limit)
    
    return {"logs": logs, "count": len(logs)}


@router.delete("/email-logs")
async def clear_email_logs(authorization: str = Header(None)):
    """Clear all email logs"""
    await get_admin_from_token(authorization)
    
    result = await db.email_logs.delete_many({})
    
    return {"success": True, "deleted_count": result.deleted_count}


@router.get("/smtp-status")
async def get_smtp_status(authorization: str = Header(None)):
    """Get detailed SMTP configuration status for debugging"""
    await get_admin_from_token(authorization)
    
    from services.smtp_service import smtp_service
    
    # Get current config
    config = await smtp_service.get_config()
    
    # Test connection if configured
    connection_test = None
    if config.get("is_configured"):
        connection_test = await smtp_service.test_connection()
    
    # Get env var status (without revealing passwords)
    env_status = {
        "SMTP_HOST": bool(os.environ.get('SMTP_HOST')),
        "SMTP_PORT": bool(os.environ.get('SMTP_PORT')),
        "SMTP_USER": bool(os.environ.get('SMTP_USER')),
        "SMTP_PASSWORD": bool(os.environ.get('SMTP_PASSWORD')),
        "SMTP_SENDER_EMAIL": bool(os.environ.get('SMTP_SENDER_EMAIL')),
    }
    
    # Get DB config status
    db_config = await db.settings.find_one({"key": "smtp_config"}, {"_id": 0})
    db_status = {
        "has_db_config": bool(db_config and db_config.get("value")),
        "db_host": db_config.get("value", {}).get("host") if db_config else None,
        "db_user": db_config.get("value", {}).get("user") if db_config else None,
    }
    
    # Get recent email statistics
    recent_emails = await db.email_logs.find().sort("sent_at", -1).limit(10).to_list(10)
    email_stats = {
        "recent_count": len(recent_emails),
        "recent_sent": sum(1 for e in recent_emails if e.get("status") == "sent"),
        "recent_failed": sum(1 for e in recent_emails if e.get("status") == "failed"),
    }
    
    return {
        "smtp_configured": config.get("is_configured"),
        "active_config": {
            "host": config.get("host"),
            "port": config.get("port"),
            "user": config.get("user"),
            "sender_email": config.get("sender_email"),
        },
        "env_vars_present": env_status,
        "db_config": db_status,
        "connection_test": connection_test,
        "email_stats": email_stats
    }


@router.post("/smtp-test-send")
async def test_smtp_send(
    authorization: str = Header(None),
    recipient: Optional[str] = None
):
    """Send a test email to verify SMTP is working in production"""
    admin = await get_admin_from_token(authorization)
    
    from services.smtp_service import smtp_service
    
    # Use recipient or admin's email
    to_email = recipient or admin.get("email")
    
    result = await smtp_service.send_email(
        to_email=to_email,
        subject=f"IGRIS SMTP Test - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #FFA500;">IGRIS SMTP Test</h2>
            <p>This is a test email to verify SMTP configuration is working in production.</p>
            <p><strong>Timestamp:</strong> {datetime.now(timezone.utc).isoformat()}</p>
            <p><strong>Recipient:</strong> {to_email}</p>
            <p>If you received this, your email system is working correctly!</p>
        </body>
        </html>
        """,
        plain_text=f"IGRIS SMTP Test\n\nTimestamp: {datetime.now(timezone.utc).isoformat()}\nRecipient: {to_email}\n\nIf you received this, your email system is working correctly!"
    )
    
    return {
        "success": result.get("success"),
        "message": result.get("message"),
        "method": result.get("method"),
        "recipient": to_email
    }


# Demo Video Settings
class DemoVideoSettings(BaseModel):
    video_url: Optional[str] = None


@router.get("/demo-video")
async def get_demo_video_settings():
    """Get demo video URL (public endpoint)"""
    settings = await db.settings.find_one({"key": "demo_video"}, {"_id": 0})
    return {"video_url": settings.get("video_url", "") if settings else ""}


@router.post("/demo-video")
async def save_demo_video_settings(
    settings: DemoVideoSettings,
    authorization: str = Header(None)
):
    """Save demo video URL (admin only)"""
    await get_admin_from_token(authorization)
    
    await db.settings.update_one(
        {"key": "demo_video"},
        {"$set": {"key": "demo_video", "video_url": settings.video_url or ""}},
        upsert=True
    )
    
    return {"success": True, "message": "Demo video URL saved successfully"}


# CopyFactory Settings
class CopyFactorySettings(BaseModel):
    strategy_id: str

@router.get("/copyfactory-settings")
async def get_copyfactory_settings(authorization: str = Header(None)):
    """Get CopyFactory settings (admin only)"""
    await get_admin_from_token(authorization)
    
    settings = await db.settings.find_one({"type": "copyfactory"}, {"_id": 0})
    return {
        "strategy_id": settings.get("strategy_id", "") if settings else "",
        "configured": bool(settings and settings.get("strategy_id"))
    }

@router.post("/copyfactory-settings")
async def save_copyfactory_settings(
    settings: CopyFactorySettings,
    authorization: str = Header(None)
):
    """Save CopyFactory strategy ID (admin only)"""
    await get_admin_from_token(authorization)
    
    if not settings.strategy_id or len(settings.strategy_id) < 2:
        raise HTTPException(status_code=400, detail="Invalid strategy ID")
    
    await db.settings.update_one(
        {"type": "copyfactory"},
        {"$set": {"type": "copyfactory", "strategy_id": settings.strategy_id}},
        upsert=True
    )
    
    return {"success": True, "message": "CopyFactory settings saved successfully"}



@router.get("/copyfactory-diagnostics")
async def get_copyfactory_diagnostics(authorization: str = Header(None)):
    """Get CopyFactory diagnostics for troubleshooting (admin only)"""
    await get_admin_from_token(authorization)
    
    # Check CopyFactory settings
    copyfactory_settings = await db.settings.find_one({"type": "copyfactory"}, {"_id": 0})
    
    # Check MetaAPI settings
    metaapi_settings = await db.settings.find_one({"type": "metaapi"}, {"_id": 0})
    metaapi_token_env = os.environ.get("METAAPI_TOKEN", "")
    
    # Count active accounts
    active_accounts = await db.mt5_accounts.count_documents({"is_active": True})
    subscriber_accounts = await db.mt5_accounts.count_documents({"is_active": True, "is_subscriber": True})
    
    return {
        "copyfactory": {
            "configured": bool(copyfactory_settings and copyfactory_settings.get("strategy_id")),
            "strategy_id": copyfactory_settings.get("strategy_id") if copyfactory_settings else None
        },
        "metaapi": {
            "token_in_db": bool(metaapi_settings and metaapi_settings.get("api_token")),
            "token_in_env": bool(metaapi_token_env),
            "token_length": len(metaapi_settings.get("api_token", "")) if metaapi_settings else len(metaapi_token_env)
        },
        "accounts": {
            "total_active": active_accounts,
            "subscribers": subscriber_accounts
        }
    }

