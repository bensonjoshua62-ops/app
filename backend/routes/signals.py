"""EA Signals API Routes - Production MVP Architecture"""

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get('DB_NAME')]

router = APIRouter(prefix="/signals", tags=["EA Signals"])

# Simple API Key for webhook security (MVP approach)
WEBHOOK_API_KEY = os.environ.get('WEBHOOK_API_KEY', 'IGRIS_MVP_SECRET_KEY_2024')


# Helper to get admin user from token
async def get_admin_from_token(authorization: str):
    """Verify admin user from token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace('Bearer ', '')
    
    from utils.auth import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Token stores user_id in 'user_id' field, not 'sub'
    user_id = payload.get("user_id") or payload.get("sub")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    # If not found by id, try by email (sub contains email)
    if not user and payload.get("sub"):
        user = await db.users.find_one({"email": payload.get("sub")}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


class SignalWebhook(BaseModel):
    """Signal data from MT5 EA - matches MVP architecture"""
    bot_id: Optional[str] = "IGRIS_EA"
    symbol: str
    type: str  # BUY, SELL, CLOSE, UPDATE
    entry: Optional[float] = 0
    sl: Optional[float] = 0
    tp: Optional[float] = 0
    message: Optional[str] = ""
    volume: Optional[float] = 0.01
    ticket: Optional[int] = 0
    profit: Optional[float] = 0
    status: Optional[str] = "NEW"  # NEW, UPDATED, CLOSED


async def create_notifications_only(signal_doc: dict):
    """Create UI notifications only (no emails) - emails handled separately"""
    try:
        users = await db.users.find({}, {"id": 1, "email": 1, "is_admin": 1}).to_list(100)
        
        signal_type = signal_doc.get("type", "SIGNAL")
        signal_status = signal_doc.get("status", "NEW")
        symbol = signal_doc.get("symbol", "Unknown")
        
        if signal_status == "CLOSED":
            profit = signal_doc.get("profit") or 0
            profit_str = f"+${profit:.2f}" if profit >= 0 else f"-${abs(profit):.2f}"
            title = f"Trade Closed: {symbol}"
            message = f"{signal_type} {symbol} closed | P/L: {profit_str}"
        elif signal_status == "UPDATED":
            title = f"Trade Updated: {symbol}"
            message = f"{signal_type} {symbol} | Entry: {signal_doc.get('entry', 0)} | SL: {signal_doc.get('sl', 0)} | TP: {signal_doc.get('tp', 0)}"
        else:
            title = f"New Signal: {symbol}"
            message = f"{signal_type} {symbol} @ {signal_doc.get('entry', 0)} | SL: {signal_doc.get('sl', 0)} | TP: {signal_doc.get('tp', 0)}"
        
        for user in users:
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "type": "trade_alert",
                "title": title,
                "message": message,
                "data": {
                    "signal_id": signal_doc.get("id"),
                    "symbol": symbol,
                    "signal_type": signal_type,
                    "status": signal_status,
                    "profit": signal_doc.get("profit", 0)
                },
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification_doc)
        
        print(f"[NOTIFICATIONS] Created {len(users)} notifications for signal {symbol}")
    except Exception as e:
        print(f"[NOTIFICATIONS] Error: {e}")


async def create_signal_notification(signal_doc: dict):
    """Create notifications and send emails for all users when a signal arrives"""
    try:
        # Get all users to notify (with email)
        users = await db.users.find({}, {"id": 1, "email": 1, "is_admin": 1}).to_list(100)
        print(f"[SIGNALS] Found {len(users)} users to notify")
        
        signal_type = signal_doc.get("type", "SIGNAL")
        signal_status = signal_doc.get("status", "NEW")
        symbol = signal_doc.get("symbol", "Unknown")
        
        # Determine notification title based on status
        if signal_status == "CLOSED":
            profit = signal_doc.get("profit")
            if profit is None:
                profit = 0
            profit_str = f"+${profit:.2f}" if profit >= 0 else f"-${abs(profit):.2f}"
            title = f"Trade Closed: {symbol}"
            message = f"{signal_type} {symbol} closed | P/L: {profit_str}"
        elif signal_status == "UPDATED":
            title = f"Trade Updated: {symbol}"
            message = f"{signal_type} {symbol} | Entry: {signal_doc.get('entry', 0)} | SL: {signal_doc.get('sl', 0)} | TP: {signal_doc.get('tp', 0)}"
        else:
            title = f"New Signal: {symbol}"
            message = f"{signal_type} {symbol} @ {signal_doc.get('entry', 0)} | SL: {signal_doc.get('sl', 0)} | TP: {signal_doc.get('tp', 0)}"
        
        # Create notification for each user
        for user in users:
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "type": "trade_alert",
                "title": title,
                "message": message,
                "data": {
                    "signal_id": signal_doc.get("id"),
                    "symbol": symbol,
                    "signal_type": signal_type,
                    "status": signal_status,
                    "profit": signal_doc.get("profit", 0)
                },
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification_doc)
        
        print(f"[SIGNALS] Created notifications for {len(users)} users")
        
        # Send SMTP email to all users and admin
        print(f"[SIGNALS] Starting email sending to {len(users)} users...")
        await send_signal_emails(signal_doc, users, title, message)
        print(f"[SIGNALS] Email sending completed")
        
    except Exception as e:
        print(f"[SIGNALS] Error creating notifications: {e}")
        import traceback
        traceback.print_exc()


async def send_signal_emails(signal_doc: dict, users: list, title: str, message: str) -> dict:
    """Send SMTP emails for signal to all users and admin. Returns stats."""
    result = {"sent": 0, "failed": 0, "skipped": 0, "smtp_configured": False}
    
    try:
        from services.smtp_service import smtp_service
        
        # Check if SMTP is configured
        if not smtp_service.is_configured():
            print(f"[SIGNALS] SMTP not configured - trying to load from DB")
            await smtp_service.load_config_from_db()
            if not smtp_service.is_configured():
                print(f"[SIGNALS] SMTP still not configured after DB load - emails will not be sent")
                result["error"] = "SMTP not configured"
                return result
        
        result["smtp_configured"] = True
        print(f"[SIGNALS] SMTP is configured: {smtp_service.smtp_host}")
        
        signal_type = signal_doc.get("type", "SIGNAL")
        symbol = signal_doc.get("symbol", "Unknown")
        status = signal_doc.get("status", "NEW")
        # Handle None profit for open trades
        profit = signal_doc.get("profit")
        if profit is None:
            profit = 0
        
        # Build HTML email
        profit_color = "#10b981" if profit >= 0 else "#ef4444"
        type_color = "#10b981" if signal_type in ["BUY", "LONG"] else "#ef4444"
        status_badge = ""
        if status == "CLOSED":
            status_badge = f'<span style="background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">CLOSED</span>'
        elif status == "UPDATED":
            status_badge = f'<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">UPDATED</span>'
        
        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333333; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 40px; border: 1px solid #e0e0e0;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #FFA500; margin: 0; font-size: 28px;">IGRIS</h1>
      <p style="color: #666; font-size: 14px; margin-top: 5px;">Trading Signal Alert</p>
    </div>
    
    <div style="background: #FFF8E7; border: 2px solid #FFA500; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">
        <span style="color: {type_color};">{'📈' if signal_type in ['BUY', 'LONG'] else '📉'}</span>
        {signal_type} {symbol} {status_badge}
      </h2>
      <p style="color: #555; margin: 0; font-size: 15px;">{message}</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9f9f9; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
          <p style="color: #888; font-size: 12px; margin: 0 0 5px 0;">Entry</p>
          <p style="color: #333; font-weight: bold; margin: 0;">{signal_doc.get('entry', 'N/A')}</p>
        </td>
        <td style="background: #e8f5e9; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
          <p style="color: #2e7d32; font-size: 12px; margin: 0 0 5px 0;">Take Profit</p>
          <p style="color: #2e7d32; font-weight: bold; margin: 0;">{signal_doc.get('tp', 'N/A')}</p>
        </td>
        <td style="background: #ffebee; border-radius: 8px; padding: 15px; text-align: center; width: 33%;">
          <p style="color: #c62828; font-size: 12px; margin: 0 0 5px 0;">Stop Loss</p>
          <p style="color: #c62828; font-weight: bold; margin: 0;">{signal_doc.get('sl', 'N/A')}</p>
        </td>
      </tr>
    </table>
    
    {"<div style='background: " + ("#e8f5e9" if profit >= 0 else "#ffebee") + "; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px;'><p style='color: " + ("#2e7d32" if profit >= 0 else "#c62828") + "; font-weight: bold; font-size: 18px; margin: 0;'>P/L: " + ('+' if profit >= 0 else '') + f"${profit:.2f}</p></div>" if status == "CLOSED" else ""}
    
    <div style="text-align: center; color: #888; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      <p style="margin: 5px 0;">Volume: {signal_doc.get('volume', 0.01)} lots | Ticket: #{signal_doc.get('ticket', 'N/A')}</p>
      <p style="margin: 5px 0;">Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
      <p style="margin-top: 15px; color: #999;">IGRIS Trading Platform - Automated Signal Alert</p>
    </div>
  </div>
</body>
</html>"""
        
        for user in users:
            user_email = user.get("email")
            if not user_email:
                result["skipped"] += 1
                continue
                
            try:
                print(f"[SIGNALS] Sending email to: {user_email}")
                send_result = await smtp_service.send_email(
                    to_email=user_email,
                    subject=f"IGRIS Alert: {title}",
                    html_content=html_content,
                    plain_text=f"{title}\n\n{message}\n\nEntry: {signal_doc.get('entry', 'N/A')} | TP: {signal_doc.get('tp', 'N/A')} | SL: {signal_doc.get('sl', 'N/A')}\nVolume: {signal_doc.get('volume', 0.01)} lots | Ticket: #{signal_doc.get('ticket', 'N/A')}\n\nThis is an automated alert from IGRIS Trading Platform."
                )
                if send_result.get("success"):
                    result["sent"] += 1
                    print(f"[SIGNALS] ✓ Email sent to {user_email}")
                else:
                    result["failed"] += 1
                    print(f"[SIGNALS] ✗ Email failed for {user_email}: {send_result.get('message')}")
            except Exception as email_error:
                result["failed"] += 1
                print(f"[SIGNALS] ✗ Exception sending to {user_email}: {email_error}")
        
        print(f"[SIGNALS] Email summary: {result['sent']} sent, {result['failed']} failed, {result['skipped']} skipped out of {len(users)} users")
        return result
        
    except Exception as e:
        print(f"[SIGNALS] Error sending emails: {e}")
        import traceback
        traceback.print_exc()
        result["error"] = str(e)
        return result


class SignalCreate(BaseModel):
    """For admin/authenticated signal creation"""
    pair: str
    signal: str  # LONG, SHORT, BUY, SELL, CLOSE
    confidence: Optional[int] = 75
    risk_reward: Optional[str] = "N/A"
    entry: Optional[str] = "N/A"
    tp: Optional[str] = "N/A"
    sl: Optional[str] = "N/A"
    volume: Optional[float] = None
    ticket: Optional[int] = None
    profit: Optional[float] = None
    source: Optional[str] = "MT5_EA"


# ============== WEBHOOK ENDPOINT (MVP Architecture) ==============

@router.post("/webhook")
async def receive_webhook(signal: SignalWebhook, authorization: str = Header(None)):
    """
    MVP Webhook receiver for MT5 EA signals
    
    Expected format from EA:
    POST /api/signals/webhook
    Headers: Authorization: Bearer IGRIS_MVP_SECRET_KEY_2024
    Body: {"bot_id":"EA1","symbol":"EURUSD","type":"BUY","entry":1.0850,"sl":1.0800,"tp":1.0950,"message":"Sweep Entry AI"}
    
    Signal Types:
    - BUY/SELL: New trade opened
    - CLOSE: Trade closed (includes profit)
    - UPDATE: Trade modified (SL/TP changed)
    """
    
    try:
        print(f"[WEBHOOK] Received signal: {signal.symbol} {signal.type}")
        print(f"[WEBHOOK] Full payload: bot_id={signal.bot_id}, entry={signal.entry}, sl={signal.sl}, tp={signal.tp}, ticket={signal.ticket}")
        print(f"[WEBHOOK] Auth header: {authorization[:30] if authorization else 'None'}...")
        
        # Validate API Key (simple MVP security)
        if not authorization:
            print("[WEBHOOK] ERROR: Missing authorization header")
            raise HTTPException(status_code=401, detail="Unauthorized - Missing API key")
        
        # Accept both "Bearer KEY" and just "KEY" formats
        api_key = authorization.replace("Bearer ", "").strip()
        
        if api_key != WEBHOOK_API_KEY:
            print(f"[WEBHOOK] ERROR: Invalid API key. Expected: {WEBHOOK_API_KEY[:10]}..., Got: {api_key[:10]}...")
            raise HTTPException(status_code=401, detail="Unauthorized - Invalid API key")
        
        signal_type = signal.type.upper()
        
        # Determine signal status based on type
        if signal_type == "CLOSE":
            status = "CLOSED"
        elif signal_type == "UPDATE":
            status = "UPDATED"
        else:
            status = "NEW"
        
        # For CLOSE signals, try to update existing signal with same ticket
        if signal_type == "CLOSE" and signal.ticket:
            existing = await db.threads.find_one({"ticket": signal.ticket, "status": {"$ne": "CLOSED"}})
            if existing:
                # Update the existing signal to closed
                await db.threads.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "status": "CLOSED",
                        "profit": signal.profit or 0,
                        "closed_at": datetime.now(timezone.utc).isoformat(),
                        "close_message": signal.message or f"Closed {signal.symbol}"
                    }}
                )
                
                # Create notification for the closed trade
                closed_doc = {**existing, "status": "CLOSED", "profit": signal.profit or 0}
                await create_signal_notification(closed_doc)
                
                print(f"[IGRIS] Trade CLOSED: {signal.symbol} | Profit: {signal.profit}")
                return {"success": True, "message": "Trade closed", "id": existing["id"]}
        
        # For UPDATE signals, try to update existing signal with same ticket
        if signal_type == "UPDATE" and signal.ticket:
            existing = await db.threads.find_one({"ticket": signal.ticket, "status": {"$ne": "CLOSED"}})
            if existing:
                # Update the existing signal
                await db.threads.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "status": "UPDATED",
                        "sl": signal.sl or existing.get("sl", 0),
                        "tp": signal.tp or existing.get("tp", 0),
                        "entry": signal.entry or existing.get("entry", 0),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "message": signal.message or f"Updated {signal.symbol}"
                    }}
                )
                
                # Create notification for the updated trade
                updated_doc = {**existing, "status": "UPDATED", "sl": signal.sl, "tp": signal.tp}
                await create_signal_notification(updated_doc)
                
                print(f"[IGRIS] Trade UPDATED: {signal.symbol}")
                return {"success": True, "message": "Trade updated", "id": existing["id"]}
        
        # Create new signal document
        signal_doc = {
            "id": str(uuid.uuid4()),
            "bot": signal.bot_id or "IGRIS_EA",
            "symbol": signal.symbol,
            "type": signal_type,
            "status": status,
            "entry": signal.entry or 0,
            "sl": signal.sl or 0,
            "tp": signal.tp or 0,
            "message": signal.message or f"{signal_type} {signal.symbol}",
            "volume": signal.volume or 0.01,
            "ticket": signal.ticket or 0,
            "profit": signal.profit or 0,
            "time": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        
        # Insert into database
        await db.threads.insert_one(signal_doc)
        signal_id = signal_doc["id"]
        
        # Create notifications for UI bell
        await create_notifications_only(signal_doc)
        
        # AUTO-CLICK: Call the same email function as the button click
        print(f"[WEBHOOK] AUTO-CLICK: Sending emails for signal {signal_id}")
        try:
            users = await db.users.find({}, {"id": 1, "email": 1, "is_admin": 1}).to_list(100)
            
            signal_type_str = signal_doc.get("type", "SIGNAL")
            symbol = signal_doc.get("symbol", "Unknown")
            title = f"New Signal: {symbol}"
            message = f"{signal_type_str} {symbol} @ {signal_doc.get('entry', 0)} | SL: {signal_doc.get('sl', 0)} | TP: {signal_doc.get('tp', 0)}"
            
            email_result = await send_signal_emails(signal_doc, users, title, message)
            print(f"[WEBHOOK] AUTO-CLICK RESULT: sent={email_result.get('sent', 0)}, failed={email_result.get('failed', 0)}")
        except Exception as email_err:
            print(f"[WEBHOOK] AUTO-CLICK ERROR: {email_err}")
        
        print(f"[IGRIS] Signal received: {signal.symbol} {signal_type} @ {signal.entry} (Status: {status})")
        
        return {"success": True, "message": "Signal received", "id": signal_id}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[WEBHOOK] CRITICAL ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/thread")
async def receive_thread(signal: SignalWebhook, authorization: str = Header(None)):
    """Alias for /webhook - matches MVP architecture endpoint"""
    return await receive_webhook(signal, authorization)


@router.post("/raw")
async def receive_raw(request: Request):
    """
    Debug endpoint - accepts any JSON and logs it
    No authentication required for debugging
    """
    import json
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        # Log everything prominently
        print("=" * 60)
        print("[RAW WEBHOOK] INCOMING REQUEST RECEIVED!")
        print(f"[RAW WEBHOOK] Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"[RAW WEBHOOK] Content-Type: {headers.get('content-type', 'MISSING')}")
        print(f"[RAW WEBHOOK] Authorization: {headers.get('authorization', 'MISSING')[:30]}...")
        print(f"[RAW WEBHOOK] Body Length: {len(body)} bytes")
        print(f"[RAW WEBHOOK] Body: {body.decode('utf-8', errors='ignore')[:500]}")
        print("=" * 60)
        
        # Try to parse as JSON
        try:
            data = json.loads(body)
            
            # Save to database for debugging
            debug_doc = {
                "id": str(uuid.uuid4()),
                "type": "DEBUG_RAW",
                "raw_data": data,
                "headers": {k: v for k, v in headers.items() if k.lower() not in ['cookie', 'host']},
                "time": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            await db.webhook_debug.insert_one(debug_doc)
            
            print(f"[RAW WEBHOOK] Saved to DB with ID: {debug_doc['id']}")
            return {"success": True, "received": data, "id": debug_doc["id"]}
        except json.JSONDecodeError as e:
            print(f"[RAW WEBHOOK] JSON parse error: {e}")
            return {"success": False, "error": f"Invalid JSON: {str(e)}", "raw": body.decode('utf-8', errors='ignore')[:500]}
    except Exception as e:
        print(f"[RAW WEBHOOK] Exception: {e}")
        return {"success": False, "error": str(e)}


@router.get("/raw")
async def get_raw_debug():
    """
    Check endpoint - view recent raw webhook logs in browser
    """
    logs = await db.webhook_debug.find({}, {"_id": 0}).sort("time", -1).to_list(10)
    return {
        "message": "Raw webhook debug endpoint ready",
        "endpoint_post": "/api/signals/raw",
        "recent_logs": logs,
        "count": len(logs)
    }


@router.get("/debug")
async def get_debug_logs(limit: int = 20):
    """Get recent debug webhook logs"""
    logs = await db.webhook_debug.find({}, {"_id": 0}).sort("time", -1).to_list(limit)
    return {"logs": logs, "count": len(logs)}


# ============== LIVE FEED ENDPOINT (for frontend) ==============

@router.get("")
async def get_signals(limit: int = 50):
    """
    Get live signals feed - no auth required for viewing
    Returns most recent signals from BOTH signals (threads) AND trades collections
    """
    all_signals = []
    
    # Fetch from 'threads' collection (signals webhook)
    signals = await db.threads.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("time", -1).to_list(limit)
    
    for s in signals:
        s["source"] = "signal"
        all_signals.append(s)
    
    # Also fetch from 'trades' collection (MT5 trades webhook)
    trades = await db.trades.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    for t in trades:
        # Convert trade format to signal format for unified display
        signal_format = {
            "id": t.get("id"),
            "bot": "MT5_TRADE",
            "symbol": t.get("symbol"),
            "type": t.get("type"),
            "entry": t.get("open_price", 0),
            "sl": 0,  # Trades don't have SL/TP info
            "tp": 0,
            "message": t.get("comment", f"MT5 Trade - {t.get('symbol')}"),
            "volume": t.get("volume", 0.01),
            "ticket": t.get("ticket", 0),
            "profit": t.get("profit", 0),
            "time": t.get("created_at") or t.get("open_time"),
            "is_active": True,
            "source": "trade",
            "close_price": t.get("close_price"),
            "status": "CLOSED" if t.get("close_price") else "OPEN"
        }
        all_signals.append(signal_format)
    
    # Sort all signals by time (most recent first)
    all_signals.sort(key=lambda x: x.get("time", ""), reverse=True)
    
    # Limit total results
    all_signals = all_signals[:limit]
    
    return {"signals": all_signals, "total": len(all_signals)}


@router.get("/feed")
async def get_live_feed(limit: int = 50):
    """Alias endpoint for live feed"""
    return await get_signals(limit)


# ============== ADMIN ENDPOINTS ==============

async def verify_admin(authorization: str):
    """Verify admin token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    
    import jwt
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET_KEY', 'igris-secret-key-change-in-production'), algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        user = await db.users.find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
        
        if not user or not user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("")
async def create_signal_admin(signal: SignalCreate, authorization: str = Header(None)):
    """Admin: Manually create a signal"""
    await verify_admin(authorization)
    
    signal_doc = {
        "id": str(uuid.uuid4()),
        "bot": signal.source or "ADMIN",
        "symbol": signal.pair,
        "type": signal.signal.upper(),
        "entry": float(signal.entry) if signal.entry != "N/A" else 0,
        "sl": float(signal.sl) if signal.sl != "N/A" else 0,
        "tp": float(signal.tp) if signal.tp != "N/A" else 0,
        "message": f"{signal.signal} {signal.pair} - Confidence: {signal.confidence}%",
        "volume": signal.volume or 0,
        "ticket": signal.ticket or 0,
        "profit": signal.profit or 0,
        "confidence": signal.confidence,
        "risk_reward": signal.risk_reward,
        "time": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.threads.insert_one(signal_doc)
    
    return {"success": True, "signal": {k: v for k, v in signal_doc.items() if k != "_id"}}


@router.delete("/{signal_id}")
async def delete_signal(signal_id: str, authorization: str = Header(None)):
    """Admin: Deactivate a signal (works for both signals and trades)"""
    await verify_admin(authorization)
    
    # Try to delete from threads (signals) first
    result = await db.threads.update_one(
        {"id": signal_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        # Try to delete from trades collection
        trade_result = await db.trades.delete_one({"id": signal_id})
        if trade_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Signal not found")
        return {"success": True, "message": "Trade deleted"}
    
    return {"success": True, "message": "Signal deactivated"}


@router.delete("")
async def clear_all_signals(authorization: str = Header(None)):
    """Admin: Clear all signals"""
    await verify_admin(authorization)
    
    result = await db.threads.delete_many({})
    
    return {"success": True, "deleted": result.deleted_count}


# ============== WEBHOOK CONFIG ENDPOINT ==============

@router.get("/config")
async def get_webhook_config():
    """Get webhook configuration for MT5 EA setup"""
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://igris-trading-fix.preview.emergentagent.com')
    
    return {
        "webhook_url": f"{backend_url}/api/signals/webhook",
        "thread_url": f"{backend_url}/api/signals/thread",
        "api_key": WEBHOOK_API_KEY,
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {WEBHOOK_API_KEY}"
        },
        "example_payload": {
            "bot_id": "IGRIS_EA",
            "symbol": "EURUSD",
            "type": "BUY",
            "entry": 1.0850,
            "sl": 1.0800,
            "tp": 1.0950,
            "message": "Sweep Entry AI Signal",
            "volume": 0.10
        },
        "mt5_code_example": '''
void SendThread(string bot, string sym, string type, double entry, double sl, double tp, string msg)
{
    string json = "{" +
        "\\"bot_id\\":\\"" + bot + "\\"," +
        "\\"symbol\\":\\"" + sym + "\\"," +
        "\\"type\\":\\"" + type + "\\"," +
        "\\"entry\\":" + DoubleToString(entry, 5) + "," +
        "\\"sl\\":" + DoubleToString(sl, 5) + "," +
        "\\"tp\\":" + DoubleToString(tp, 5) + "," +
        "\\"message\\":\\"" + msg + "\\"}";

    char data[];
    StringToCharArray(json, data);
    ArrayResize(data, ArraySize(data) - 1);

    char result[];
    string headers = "Content-Type: application/json\\r\\nAuthorization: Bearer ''' + WEBHOOK_API_KEY + '''\\r\\n";

    WebRequest("POST", "''' + backend_url + '''/api/signals/webhook", headers, 5000, data, result, headers);
}
'''
    }



# ============== ADMIN: RESEND SIGNAL EMAIL ==============

@router.post("/{signal_id}/send-email")
async def resend_signal_email(signal_id: str, authorization: str = Header(None)):
    """
    Admin endpoint to manually resend signal email to all users
    """
    # Verify admin
    await get_admin_from_token(authorization)
    
    # Find the signal in either threads or trades collection
    signal = await db.threads.find_one({"id": signal_id}, {"_id": 0})
    if not signal:
        signal = await db.trades.find_one({"id": signal_id}, {"_id": 0})
    
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    # Get all users
    users = await db.users.find({}, {"id": 1, "email": 1, "is_admin": 1}).to_list(100)
    
    if not users:
        raise HTTPException(status_code=400, detail="No users found to send emails to")
    
    # Build title and message
    signal_type = signal.get("type", "SIGNAL")
    signal_status = signal.get("status", "NEW")
    symbol = signal.get("symbol", "Unknown")
    
    if signal_status == "CLOSED":
        profit = signal.get("profit")
        if profit is None:
            profit = 0
        profit_str = f"+${profit:.2f}" if profit >= 0 else f"-${abs(profit):.2f}"
        title = f"Trade Closed: {symbol}"
        message = f"{signal_type} {symbol} closed | P/L: {profit_str}"
    elif signal_status == "UPDATED":
        title = f"Trade Updated: {symbol}"
        message = f"{signal_type} {symbol} | Entry: {signal.get('entry', 0)} | SL: {signal.get('sl', 0)} | TP: {signal.get('tp', 0)}"
    else:
        title = f"New Signal: {symbol}"
        message = f"{signal_type} {symbol} @ {signal.get('entry', 0)} | SL: {signal.get('sl', 0)} | TP: {signal.get('tp', 0)}"
    
    # Send emails
    print(f"[ADMIN] Manually resending signal {signal_id} to {len(users)} users")
    email_result = await send_signal_emails(signal, users, title, message)
    
    # Check if SMTP was not configured
    if not email_result.get("smtp_configured"):
        raise HTTPException(
            status_code=500, 
            detail=f"SMTP not configured. Please configure SMTP in Email Settings. Error: {email_result.get('error', 'Unknown')}"
        )
    
    # Check if any emails were sent
    if email_result.get("sent", 0) == 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send any emails. {email_result.get('failed', 0)} failed, {email_result.get('skipped', 0)} skipped. Error: {email_result.get('error', 'Check SMTP settings')}"
        )
    
    return {
        "success": True,
        "message": f"Signal email sent to {email_result['sent']} users ({email_result['failed']} failed)",
        "signal_id": signal_id,
        "signal_symbol": symbol,
        "users_count": len(users),
        "emails_sent": email_result["sent"],
        "emails_failed": email_result["failed"],
        "emails_skipped": email_result["skipped"]
    }

