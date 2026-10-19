"""CopyFactory Trade Monitor - Monitors copied trades and sends notifications"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from services.smtp_service import smtp_service

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class TradeMonitorService:
    """Service to monitor CopyFactory trades and send notifications"""
    
    def __init__(self):
        self.api = None
        self.copy_factory = None
        self._initialized = False
        self._last_trade_ids = set()  # Track processed trades
        self._connections = {}  # Cache connections
        self._last_check = None
        self._check_interval = 5  # Only actually check every 5 seconds to avoid API overload
    
    async def initialize(self):
        """Initialize MetaAPI and CopyFactory"""
        try:
            from metaapi_cloud_sdk import MetaApi
            from metaapi_cloud_copyfactory_sdk import CopyFactory
            
            # Get token from settings first, then fallback to env
            settings = await db.settings.find_one({"type": "metaapi"})
            token = None
            if settings:
                token = settings.get("api_token")
            
            if not token:
                token = os.environ.get('METAAPI_TOKEN', '')
            
            if not token:
                # Don't log warning every time - too noisy
                return False
            
            self.api = MetaApi(token=token)
            self.copy_factory = CopyFactory(token=token)
            self._initialized = True
            logger.info("Trade monitor initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize trade monitor: {e}")
            return False
    
    async def check_copied_trades(self) -> List[Dict]:
        """Check for new copied trades on subscriber accounts"""
        # Rate limit: only check every 5 seconds
        now = datetime.now(timezone.utc)
        if self._last_check and (now - self._last_check).total_seconds() < self._check_interval:
            return []
        self._last_check = now
        
        if not self._initialized:
            await self.initialize()
        
        if not self._initialized:
            return []
        
        new_trades = []
        
        try:
            # Get all subscriber accounts
            subscriber_accounts = await db.mt5_accounts.find(
                {"is_subscriber": True, "is_active": True},
                {"_id": 0}
            ).to_list(100)
            
            for acc in subscriber_accounts:
                account_id = acc.get("metaapi_account_id")
                user_id = acc.get("user_id")
                
                if not account_id:
                    continue
                
                try:
                    # Get or create connection
                    if account_id not in self._connections:
                        account = await self.api.metatrader_account_api.get_account(account_id)
                        
                        if account.state != 'DEPLOYED':
                            continue
                        
                        connection = account.get_streaming_connection()
                        await connection.connect()
                        await connection.wait_synchronized()
                        self._connections[account_id] = connection
                    
                    connection = self._connections[account_id]
                    
                    # Check current positions
                    positions = connection.terminal_state.positions or []
                    
                    for pos in positions:
                        trade_id = f"{account_id}_{pos.get('id')}"
                        
                        if trade_id not in self._last_trade_ids:
                            self._last_trade_ids.add(trade_id)
                            
                            trade_info = {
                                "account_id": account_id,
                                "user_id": user_id,
                                "mt5_login": acc.get("mt5_login"),
                                "trade_id": pos.get('id'),
                                "symbol": pos.get('symbol'),
                                "type": pos.get('type'),
                                "volume": pos.get('volume'),
                                "open_price": pos.get('openPrice'),
                                "current_price": pos.get('currentPrice'),
                                "profit": pos.get('profit', 0),
                                "open_time": pos.get('time'),
                                "stop_loss": pos.get('stopLoss'),
                                "take_profit": pos.get('takeProfit')
                            }
                            
                            new_trades.append(trade_info)
                            
                            # Store trade in database
                            await self.store_trade(trade_info)
                            
                            # Send email notification
                            await self.send_trade_notification(trade_info)
                    
                except Exception as acc_error:
                    # Remove failed connection from cache
                    if account_id in self._connections:
                        del self._connections[account_id]
                    logger.warning(f"Error checking account {account_id}: {acc_error}")
                    continue
            
            return new_trades
            
        except Exception as e:
            logger.error(f"Error checking copied trades: {e}")
            return []
    
    async def store_trade(self, trade_info: Dict):
        """Store trade in database"""
        try:
            trade_doc = {
                **trade_info,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "OPEN",
                "is_copied": True
            }
            
            await db.copied_trades.update_one(
                {"account_id": trade_info["account_id"], "trade_id": trade_info["trade_id"]},
                {"$set": trade_doc},
                upsert=True
            )
            
            logger.info(f"Trade stored: {trade_info['symbol']} {trade_info['type']}")
            
        except Exception as e:
            logger.error(f"Failed to store trade: {e}")
    
    async def send_trade_notification(self, trade_info: Dict):
        """Send email notification for a copied trade"""
        try:
            # Get user email
            user = await db.users.find_one(
                {"id": trade_info["user_id"]},
                {"_id": 0, "email": 1, "name": 1}
            )
            
            if not user or not user.get("email"):
                logger.warning(f"No email for user {trade_info['user_id']}")
                return
            
            # Build email content
            trade_type = trade_info.get("type", "UNKNOWN")
            symbol = trade_info.get("symbol", "N/A")
            volume = trade_info.get("volume", 0)
            open_price = trade_info.get("open_price", 0)
            sl = trade_info.get("stop_loss", "N/A")
            tp = trade_info.get("take_profit", "N/A")
            
            emoji = "🟢" if trade_type == "POSITION_TYPE_BUY" else "🔴"
            trade_type_display = "BUY" if "BUY" in trade_type else "SELL"
            
            subject = f"IGRIS Trade Alert: {trade_type_display} {symbol}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: white; padding: 20px; border-radius: 10px;">
                <h1 style="color: #FFA500; text-align: center;">{emoji} Trade Copied!</h1>
                
                <div style="background: #16213e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #FFA500; margin-top: 0;">{trade_type_display} {symbol}</h2>
                    <table style="width: 100%; color: white;">
                        <tr><td style="padding: 8px 0;">Volume:</td><td style="text-align: right;">{volume} lots</td></tr>
                        <tr><td style="padding: 8px 0;">Entry Price:</td><td style="text-align: right;">{open_price}</td></tr>
                        <tr><td style="padding: 8px 0;">Stop Loss:</td><td style="text-align: right;">{sl}</td></tr>
                        <tr><td style="padding: 8px 0;">Take Profit:</td><td style="text-align: right;">{tp}</td></tr>
                        <tr><td style="padding: 8px 0;">Account:</td><td style="text-align: right;">{trade_info.get('mt5_login', 'N/A')}</td></tr>
                    </table>
                </div>
                
                <p style="color: #888; text-align: center; font-size: 12px;">
                    This trade was automatically copied from IGRIS Master Strategy.<br>
                    Login to your dashboard to monitor your positions.
                </p>
            </div>
            """
            
            plain_text = f"""
IGRIS Trade Alert: {trade_type_display} {symbol}

Trade Details:
- Symbol: {symbol}
- Type: {trade_type_display}
- Volume: {volume} lots
- Entry: {open_price}
- Stop Loss: {sl}
- Take Profit: {tp}
- Account: {trade_info.get('mt5_login', 'N/A')}

This trade was automatically copied from IGRIS Master Strategy.
            """
            
            # Send email
            result = await smtp_service.send_email(
                to_email=user["email"],
                subject=subject,
                html_content=html_content,
                plain_text=plain_text
            )
            
            if result.get("success"):
                logger.info(f"Trade notification sent to {user['email']}")
            else:
                logger.warning(f"Failed to send trade notification: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error sending trade notification: {e}")
    
    async def get_user_trade_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get trade history for a user"""
        try:
            # Get user's MT5 accounts
            accounts = await db.mt5_accounts.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 0, "metaapi_account_id": 1}
            ).to_list(10)
            
            account_ids = [a["metaapi_account_id"] for a in accounts if a.get("metaapi_account_id")]
            
            if not account_ids:
                return []
            
            # Get trades from copied_trades collection
            trades = await db.copied_trades.find(
                {"account_id": {"$in": account_ids}},
                {"_id": 0}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            return trades
            
        except Exception as e:
            logger.error(f"Error getting trade history: {e}")
            return []


# Global service instance
trade_monitor = TradeMonitorService()


async def monitor_trades_task():
    """Background task to monitor trades periodically"""
    while True:
        try:
            new_trades = await trade_monitor.check_copied_trades()
            if new_trades:
                logger.info(f"Found {len(new_trades)} new copied trades")
        except Exception as e:
            logger.error(f"Trade monitor task error: {e}")
        
        # Check every 30 seconds
        await asyncio.sleep(30)
