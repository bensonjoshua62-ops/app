from fastapi import APIRouter, HTTPException, Header, Response
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from utils.auth import decode_token
from services.metaapi_service import metaapi_service
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metaapi", tags=["MetaAPI"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class MT5ConnectRequest(BaseModel):
    account_name: str
    server: str
    login: str
    password: str


class MetaAPISettingsRequest(BaseModel):
    api_token: str


async def get_user_from_token(authorization: str):
    """Get user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload


async def get_admin_user(authorization: str):
    """Verify admin user from token"""
    payload = await get_user_from_token(authorization)
    
    if not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return payload


# ============ Admin Endpoints ============

@router.get("/admin/settings")
async def get_metaapi_settings(authorization: str = Header(None)):
    """Get MetaAPI settings (admin only)"""
    await get_admin_user(authorization)
    
    settings = await db.settings.find_one({"type": "metaapi"})
    
    if not settings:
        return {
            "api_token": "",
            "is_configured": False
        }
    
    # Mask the token
    token = settings.get("api_token", "")
    masked_token = token[:8] + "****" + token[-4:] if len(token) > 12 else "****" if token else ""
    
    return {
        "api_token": masked_token,
        "is_configured": bool(token)
    }


@router.post("/admin/settings")
async def save_metaapi_settings(settings: MetaAPISettingsRequest, authorization: str = Header(None)):
    """Save MetaAPI settings (admin only)"""
    await get_admin_user(authorization)
    
    await db.settings.update_one(
        {"type": "metaapi"},
        {"$set": {
            "type": "metaapi",
            "api_token": settings.api_token
        }},
        upsert=True
    )
    
    # Reinitialize the service with new token
    if settings.api_token:
        await metaapi_service.initialize(settings.api_token)
    
    return {"success": True, "message": "MetaAPI settings saved successfully"}


# ============ User Endpoints ============

@router.post("/connect")
async def connect_mt5_account(request: MT5ConnectRequest, authorization: str = Header(None)):
    """Connect a new MT5 account - auto-subscribes to CopyFactory"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    # Check if this specific login is already connected
    existing_login = await db.mt5_accounts.find_one(
        {"mt5_login": request.login, "is_active": True},
        {"_id": 0}
    )
    
    if existing_login:
        raise HTTPException(
            status_code=400, 
            detail=f"MT5 account {request.login} is already connected."
        )
    
    # Connect the account - CopyFactory subscription happens automatically in metaapi_service
    result = await metaapi_service.create_account(
        user_id=user_id,
        name=request.account_name,
        login=request.login,
        password=request.password,
        server=request.server
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to connect account"))
    
    # Send email notification for successful connection
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "name": 1})
        if user and user.get("email"):
            from services.smtp_service import smtp_service
            
            subject = "IGRIS: MT5 Account Connected Successfully"
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: white; padding: 20px; border-radius: 10px;">
                <h1 style="color: #FFA500; text-align: center;">🎉 MT5 Account Connected!</h1>
                
                <div style="background: #16213e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #10B981; margin-top: 0;">Account Details</h2>
                    <table style="width: 100%; color: white;">
                        <tr><td style="padding: 8px 0;">Account Name:</td><td style="text-align: right;">{request.account_name}</td></tr>
                        <tr><td style="padding: 8px 0;">Login:</td><td style="text-align: right;">{request.login}</td></tr>
                        <tr><td style="padding: 8px 0;">Server:</td><td style="text-align: right;">{request.server}</td></tr>
                        <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right; color: #10B981;">✅ Connected</td></tr>
                    </table>
                </div>
                
                <p style="color: #888; text-align: center; font-size: 14px;">
                    Your MT5 account is now connected to IGRIS and will automatically receive copy trades from our master strategy.
                </p>
                
                <p style="color: #666; text-align: center; font-size: 12px; margin-top: 20px;">
                    If you did not connect this account, please contact support immediately.
                </p>
            </div>
            """
            
            await smtp_service.send_email(
                to_email=user["email"],
                subject=subject,
                html_content=html_content,
                plain_text=f"MT5 Account Connected!\n\nAccount: {request.account_name}\nLogin: {request.login}\nServer: {request.server}\nStatus: Connected"
            )
            logger.info(f"MT5 connection notification sent to {user['email']}")
    except Exception as e:
        logger.warning(f"Failed to send MT5 connection email: {e}")
    
    return result


@router.delete("/disconnect/{account_id}")
async def disconnect_mt5_account(account_id: str, authorization: str = Header(None)):
    """Disconnect/remove an MT5 account"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    is_admin = payload.get("is_admin", False)
    
    # Verify the account belongs to the user (or admin can disconnect any)
    if is_admin:
        account = await db.mt5_accounts.find_one(
            {"metaapi_account_id": account_id},
            {"_id": 0}
        )
    else:
        account = await db.mt5_accounts.find_one(
            {"metaapi_account_id": account_id, "user_id": user_id},
            {"_id": 0}
        )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or doesn't belong to you")
    
    # Always mark as inactive in database first
    await db.mt5_accounts.update_one(
        {"metaapi_account_id": account_id},
        {"$set": {"is_active": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Try to remove from MetaAPI (non-blocking)
    try:
        result = await metaapi_service.remove_account(account_id)
        logger.info(f"MetaAPI disconnect result: {result}")
    except Exception as e:
        logger.warning(f"MetaAPI disconnect error (account already marked inactive): {e}")
    
    # Send email notification (don't wait/fail on this)
    try:
        account_user_id = account.get("user_id", user_id)
        user = await db.users.find_one({"id": account_user_id}, {"_id": 0, "email": 1})
        if user and user.get("email"):
            from services.smtp_service import smtp_service
            
            await smtp_service.send_email(
                to_email=user["email"],
                subject="IGRIS: MT5 Account Disconnected",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: white; padding: 20px; border-radius: 10px;">
                    <h1 style="color: #FFA500; text-align: center;">MT5 Account Disconnected</h1>
                    <p style="text-align: center; color: #888;">
                        Your MT5 account ({account.get('mt5_login')}) has been disconnected from IGRIS.<br>
                        You can connect a new account anytime from your dashboard.
                    </p>
                </div>
                """
            )
    except Exception as email_error:
        logger.warning(f"Failed to send disconnect email: {email_error}")
    
    return {"success": True, "message": "MT5 account disconnected successfully"}


@router.get("/accounts")
async def get_user_mt5_accounts(authorization: str = Header(None), response: Response = None):
    """Get all MT5 accounts for the current user"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    accounts = await metaapi_service.get_user_accounts(user_id)
    
    # Prevent caching of account data
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    return {"accounts": accounts}


@router.get("/account/{account_id}/info")
async def get_account_info(account_id: str, authorization: str = Header(None)):
    """Get account information including balance"""
    await get_user_from_token(authorization)
    
    result = await metaapi_service.get_account_info(account_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to get account info"))
    
    return result


@router.get("/account/{account_id}/positions")
async def get_account_positions(account_id: str, authorization: str = Header(None)):
    """Get open positions for an account"""
    await get_user_from_token(authorization)
    
    result = await metaapi_service.get_positions(account_id)
    
    return result


@router.get("/account/{account_id}/balance")
async def get_account_balance(account_id: str, authorization: str = Header(None)):
    """Get just the account balance (quick endpoint)"""
    await get_user_from_token(authorization)
    
    result = await metaapi_service.get_account_info(account_id)
    
    if not result.get("success"):
        # Return mock data if MetaAPI not connected
        return {
            "balance": 0,
            "equity": 0,
            "currency": "USD",
            "connected": False
        }
    
    return {
        "balance": result.get("balance", 0),
        "equity": result.get("equity", 0),
        "currency": result.get("currency", "USD"),
        "connected": True
    }


@router.delete("/account/{account_id}")
async def disconnect_mt5_account(account_id: str, authorization: str = Header(None)):
    """Disconnect an MT5 account"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    result = await metaapi_service.disconnect_account(user_id, account_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to disconnect account"))
    
    return result


@router.get("/status")
async def get_metaapi_status(authorization: str = Header(None)):
    """Check if MetaAPI is configured and working"""
    await get_user_from_token(authorization)
    
    is_configured = await metaapi_service.ensure_initialized()
    
    return {
        "configured": is_configured,
        "message": "MetaAPI is ready" if is_configured else "MetaAPI not configured. Please contact admin."
    }


@router.get("/test-connection")
async def test_mt5_connection(authorization: str = Header(None)):
    """Test real-time MT5 connection - returns live account data"""
    await get_admin_user(authorization)
    
    if not await metaapi_service.ensure_initialized():
        return {
            "success": False,
            "error": "MetaAPI not configured",
            "connected": False
        }
    
    try:
        from metaapi_cloud_sdk import MetaApi
        
        token = await metaapi_service.get_api_token()
        api = MetaApi(token=token)
        
        # Get first MT5 account from database
        account_doc = await db.mt5_accounts.find_one({"is_active": True}, {"_id": 0})
        
        if not account_doc:
            return {
                "success": False,
                "error": "No MT5 accounts configured",
                "connected": False
            }
        
        account_id = account_doc.get("metaapi_account_id")
        account = await api.metatrader_account_api.get_account(account_id)
        
        # Ensure deployed - reduced timeout for faster response
        if account.state != 'DEPLOYED':
            await account.deploy()
            await account.wait_deployed(timeout_in_seconds=60)
        
        # Connect and sync
        connection = account.get_streaming_connection()
        await connection.connect()
        await connection.wait_synchronized()
        
        # Get real-time data
        account_info = connection.terminal_state.account_information
        positions = connection.terminal_state.positions or []
        orders = connection.terminal_state.orders or []
        
        return {
            "success": True,
            "connected": True,
            "account_id": account_id,
            "mt5_login": account_doc.get("mt5_login"),
            "server": account_doc.get("server_name"),
            "state": account.state,
            "account_info": {
                "balance": account_info.get('balance', 0) if account_info else 0,
                "equity": account_info.get('equity', 0) if account_info else 0,
                "free_margin": account_info.get('freeMargin', 0) if account_info else 0,
                "currency": account_info.get('currency', 'USD') if account_info else 'USD',
                "leverage": account_info.get('leverage', 0) if account_info else 0,
                "broker": account_info.get('broker', 'N/A') if account_info else 'N/A'
            },
            "open_positions": len(positions),
            "pending_orders": len(orders),
            "positions": [
                {
                    "symbol": pos.get('symbol'),
                    "type": pos.get('type'),
                    "volume": pos.get('volume'),
                    "profit": pos.get('profit', 0)
                }
                for pos in positions[:5]  # Return first 5
            ]
        }
        
    except Exception as e:
        logger.error(f"MT5 connection test failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "connected": False
        }


@router.get("/account/{account_id}/history")
async def get_trade_history(
    account_id: str, 
    limit: int = 50,
    authorization: str = Header(None)
):
    """Get trade history for an account"""
    await get_user_from_token(authorization)
    
    result = await metaapi_service.get_trade_history(
        account_id=account_id,
        limit=limit
    )
    
    return result


@router.get("/user/trade-history")
async def get_user_trade_history(
    limit: int = 50,
    authorization: str = Header(None)
):
    """Get trade history for current user from all their accounts"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    try:
        # Get user's MT5 accounts
        accounts = await db.mt5_accounts.find(
            {"user_id": user_id, "is_active": True},
            {"_id": 0, "metaapi_account_id": 1}
        ).to_list(10)
        
        all_trades = []
        
        for acc in accounts:
            account_id = acc.get("metaapi_account_id")
            if not account_id:
                continue
            
            # Get trades from copied_trades collection
            trades = await db.copied_trades.find(
                {"account_id": account_id},
                {"_id": 0}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            all_trades.extend(trades)
        
        # Also try to get live trades from MetaAPI
        for acc in accounts:
            account_id = acc.get("metaapi_account_id")
            if not account_id:
                continue
            
            try:
                result = await metaapi_service.get_trade_history(
                    account_id=account_id,
                    limit=limit
                )
                if result.get("success") and result.get("trades"):
                    for trade in result["trades"]:
                        trade["account_id"] = account_id
                        trade["source"] = "metaapi"
                    all_trades.extend(result["trades"])
            except Exception as e:
                logger.warning(f"Could not get MetaAPI trades for {account_id}: {e}")
        
        # Sort by date and remove duplicates
        seen = set()
        unique_trades = []
        for trade in sorted(all_trades, key=lambda x: x.get("created_at") or x.get("open_time") or "", reverse=True):
            trade_key = f"{trade.get('account_id')}_{trade.get('trade_id') or trade.get('id')}"
            if trade_key not in seen:
                seen.add(trade_key)
                unique_trades.append(trade)
        
        return {
            "success": True,
            "trades": unique_trades[:limit],
            "total": len(unique_trades)
        }
        
    except Exception as e:
        logger.error(f"Error getting user trade history: {e}")
        return {
            "success": False,
            "error": str(e),
            "trades": []
        }


@router.get("/user/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    authorization: str = Header(None)
):
    """Get recent trading activity for current user"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    try:
        # Get user's accounts
        accounts = await db.mt5_accounts.find(
            {"user_id": user_id, "is_active": True},
            {"_id": 0}
        ).to_list(10)
        
        activities = []
        
        for acc in accounts:
            account_id = acc.get("metaapi_account_id")
            if not account_id:
                continue
            
            try:
                # Get current positions
                result = await metaapi_service.get_positions(account_id)
                if result.get("success"):
                    for pos in result.get("positions", []):
                        activities.append({
                            "type": "position",
                            "action": pos.get("type", "TRADE"),
                            "symbol": pos.get("symbol"),
                            "volume": pos.get("volume"),
                            "profit": pos.get("profit", 0),
                            "entry_price": pos.get("entry_price"),
                            "current_price": pos.get("current_price"),
                            "time": pos.get("open_time"),
                            "account_login": acc.get("mt5_login")
                        })
            except Exception as e:
                logger.warning(f"Could not get positions for {account_id}: {e}")
        
        # Get recent copied trades from DB
        account_ids = [a["metaapi_account_id"] for a in accounts if a.get("metaapi_account_id")]
        if account_ids:
            recent_trades = await db.copied_trades.find(
                {"account_id": {"$in": account_ids}},
                {"_id": 0}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            for trade in recent_trades:
                activities.append({
                    "type": "copied_trade",
                    "action": "BUY" if "BUY" in str(trade.get("type", "")) else "SELL",
                    "symbol": trade.get("symbol"),
                    "volume": trade.get("volume"),
                    "profit": trade.get("profit", 0),
                    "entry_price": trade.get("open_price"),
                    "time": trade.get("created_at"),
                    "account_login": trade.get("mt5_login"),
                    "is_copied": True
                })
        
        # Sort by time
        activities.sort(key=lambda x: x.get("time") or "", reverse=True)
        
        return {
            "success": True,
            "activities": activities[:limit]
        }
        
    except Exception as e:
        logger.error(f"Error getting recent activity: {e}")
        return {
            "success": False,
            "error": str(e),
            "activities": []
        }


@router.get("/account/{account_id}/positions")
async def get_open_positions(
    account_id: str,
    authorization: str = Header(None)
):
    """Get open positions for an account"""
    await get_user_from_token(authorization)
    
    result = await metaapi_service.get_open_positions(account_id=account_id)
    
    return result


class LotSizeRequest(BaseModel):
    lot_size: float


@router.get("/lot-size")
async def get_user_lot_size(authorization: str = Header(None)):
    """Get user's preferred lot size for copy trading"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    # Get user's lot size setting
    setting = await db.user_settings.find_one(
        {"user_id": user_id, "key": "lot_size"},
        {"_id": 0}
    )
    
    return {
        "lot_size": setting.get("value", 0.01) if setting else 0.01
    }


@router.post("/lot-size")
async def set_user_lot_size(
    request: LotSizeRequest,
    authorization: str = Header(None)
):
    """Set user's preferred lot size for copy trading"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    lot_size = request.lot_size
    
    # Validate lot size
    if lot_size < 0.01 or lot_size > 100:
        raise HTTPException(status_code=400, detail="Lot size must be between 0.01 and 100")
    
    # Update or create user's lot size setting
    await db.user_settings.update_one(
        {"user_id": user_id, "key": "lot_size"},
        {
            "$set": {
                "user_id": user_id,
                "key": "lot_size",
                "value": lot_size,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Also update the MT5 account record if exists
    await db.mt5_accounts.update_one(
        {"user_id": user_id, "is_active": True},
        {"$set": {"lot_size": lot_size}}
    )
    
    return {"success": True, "lot_size": lot_size}


@router.get("/user/balance")
async def get_user_balance_cached(authorization: str = Header(None)):
    """Get user's MT5 balance - returns cached data immediately for fast response"""
    from fastapi.responses import JSONResponse
    
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    # Get all user's active MT5 accounts from database (fast)
    accounts = await db.mt5_accounts.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    if not accounts:
        return JSONResponse(
            content={"connected": False, "balance": 0, "equity": 0, "currency": "USD", "accounts": []},
            headers={"Cache-Control": "no-cache, no-store"}
        )
    
    # Calculate total balance from all accounts (from cached DB data)
    total_balance = sum(acc.get("balance", 0) or 0 for acc in accounts)
    total_equity = sum(acc.get("equity", 0) or 0 for acc in accounts)
    currency = accounts[0].get("currency", "USD")
    last_updated = accounts[0].get("balance_updated_at")
    
    # Build account list for response
    account_list = [{
        "login": acc.get("mt5_login"),
        "name": acc.get("account_name"),
        "balance": acc.get("balance", 0) or 0,
        "equity": acc.get("equity", 0) or 0,
        "currency": acc.get("currency", "USD"),
        "is_subscriber": acc.get("is_subscriber", False)
    } for acc in accounts]
    
    # Return cached data immediately - don't wait for MetaAPI
    # Background refresh will be triggered by /refresh-balance endpoint
    return JSONResponse(
        content={
            "connected": True,
            "balance": total_balance,
            "equity": total_equity,
            "currency": currency,
            "last_updated": last_updated,
            "account_count": len(accounts),
            "accounts": account_list
        },
        headers={"Cache-Control": "no-cache, no-store"}
    )


@router.get("/copyfactory/status")
async def get_copyfactory_status(authorization: str = Header(None)):
    """Get CopyFactory status for user's accounts"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    # Get user's accounts
    accounts = await metaapi_service.get_user_accounts(user_id)
    
    # Get master strategy info
    copyfactory_settings = await db.settings.find_one({"type": "copyfactory"}, {"_id": 0})
    strategy_id = copyfactory_settings.get("strategy_id") if copyfactory_settings else None
    
    # Get user's lot size
    lot_size_setting = await db.user_settings.find_one(
        {"user_id": user_id, "key": "lot_size"},
        {"_id": 0}
    )
    lot_size = lot_size_setting.get("value", 0.01) if lot_size_setting else 0.01
    
    subscribers = []
    for account in accounts:
        subscribers.append({
            "account_id": account.get("metaapi_account_id"),
            "account_name": account.get("account_name"),
            "mt5_login": account.get("mt5_login"),
            "is_subscriber": account.get("is_subscriber", False),
            "subscribed_to_strategy": account.get("subscribed_to_strategy"),
            "lot_size": lot_size,
            "created_at": account.get("created_at")
        })
    
    return {
        "strategy_configured": bool(strategy_id),
        "strategy_id": strategy_id if strategy_id else None,
        "user_lot_size": lot_size,
        "subscribers": subscribers,
        "copy_trading_active": any(s.get("is_subscriber") for s in subscribers)
    }


@router.post("/copyfactory/resubscribe")
async def resubscribe_to_copyfactory(authorization: str = Header(None)):
    """Re-subscribe user's account to CopyFactory strategy"""
    try:
        payload = await get_user_from_token(authorization)
        user_id = payload.get("user_id")
        
        # Get user's active account
        accounts = await metaapi_service.get_user_accounts(user_id)
        if not accounts:
            raise HTTPException(status_code=400, detail="No MT5 account connected. Please connect an MT5 account first.")
        
        account = accounts[0]
        account_id = account.get("metaapi_account_id")
        
        if not account_id:
            raise HTTPException(status_code=400, detail="Invalid account data. Please reconnect your MT5 account.")
        
        # Get strategy ID
        copyfactory_settings = await db.settings.find_one({"type": "copyfactory"})
        strategy_id = copyfactory_settings.get("strategy_id") if copyfactory_settings else None
        
        if not strategy_id:
            raise HTTPException(status_code=400, detail="Copy trading not configured. Please contact admin to set up the master strategy.")
        
        # Subscribe to strategy
        result = await metaapi_service.subscribe_to_strategy(account_id, strategy_id, user_id)
        
        if result.get("success"):
            # Update database
            await db.mt5_accounts.update_one(
                {"metaapi_account_id": account_id},
                {"$set": {
                    "is_subscriber": True,
                    "subscribed_to_strategy": strategy_id
                }}
            )
            return {"success": True, "message": "Successfully subscribed to copy trading", "multiplier": result.get("multiplier", 1)}
        else:
            error_msg = result.get("error", "Failed to subscribe to strategy")
            raise HTTPException(status_code=400, detail=error_msg)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resubscribe error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/refresh-balance")
async def refresh_user_balance(authorization: str = Header(None)):
    """Refresh user's MT5 balance from MetaAPI for all accounts"""
    payload = await get_user_from_token(authorization)
    user_id = payload.get("user_id")
    
    # Get all user's active MT5 accounts
    accounts = await db.mt5_accounts.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    if not accounts:
        raise HTTPException(status_code=404, detail="No active MT5 accounts found")
    
    total_balance = 0
    total_equity = 0
    currency = "USD"
    updated_accounts = []
    
    for account in accounts:
        account_id = account.get("metaapi_account_id")
        
        try:
            # Fetch live balance from MetaAPI
            result = await metaapi_service.get_account_info(account_id)
            
            if result.get("success"):
                balance = result.get("balance", 0)
                equity = result.get("equity", 0)
                acc_currency = result.get("currency", "USD")
                
                # Update in database
                await db.mt5_accounts.update_one(
                    {"metaapi_account_id": account_id},
                    {"$set": {
                        "balance": balance,
                        "equity": equity,
                        "currency": acc_currency,
                        "balance_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                total_balance += balance
                total_equity += equity
                currency = acc_currency
                
                updated_accounts.append({
                    "login": account.get("mt5_login"),
                    "balance": balance,
                    "equity": equity,
                    "currency": acc_currency
                })
        except Exception as e:
            logger.warning(f"Failed to refresh balance for account {account_id}: {e}")
    
    return {
        "success": True,
        "balance": total_balance,
        "equity": total_equity,
        "currency": currency,
        "connected": True,
        "message": f"Balance refreshed for {len(updated_accounts)} accounts",
        "accounts": updated_accounts
    }
