import os
import logging
import asyncio
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]


class MetaAPIService:
    """Service for MetaAPI MT5 integration"""
    
    def __init__(self):
        self.api = None
        self._initialized = False
    
    async def initialize(self, api_token: str):
        """Initialize MetaAPI with token"""
        if not api_token:
            logger.warning("No MetaAPI token provided")
            return False
        
        try:
            from metaapi_cloud_sdk import MetaApi
            self.api = MetaApi(token=api_token)
            self._initialized = True
            logger.info("MetaAPI initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize MetaAPI: {str(e)}")
            return False
    
    async def get_api_token(self) -> Optional[str]:
        """Get MetaAPI token from settings or environment"""
        # First check database settings
        settings = await db.settings.find_one({"type": "metaapi"})
        if settings and settings.get("api_token"):
            return settings.get("api_token")
        
        # Fallback to environment variable
        return os.environ.get('METAAPI_TOKEN', '')
    
    async def ensure_initialized(self) -> bool:
        """Ensure MetaAPI is initialized"""
        if self._initialized and self.api:
            return True
        
        token = await self.get_api_token()
        if token:
            return await self.initialize(token)
        return False
    
    async def create_account(
        self,
        user_id: str,
        name: str,
        login: str,
        password: str,
        server: str,
        platform: str = "mt5"
    ) -> Dict[str, Any]:
        """Create/connect a new MT5 account via MetaAPI and auto-subscribe to CopyFactory"""
        if not await self.ensure_initialized():
            return {
                "success": False,
                "error": "MetaAPI not configured. Please ask admin to set up MetaAPI credentials."
            }
        
        try:
            # Get master strategy ID from settings
            copyfactory_settings = await db.settings.find_one({"type": "copyfactory"})
            strategy_id = copyfactory_settings.get("strategy_id") if copyfactory_settings else None
            
            # Create account in MetaAPI with SUBSCRIBER role for CopyFactory
            account = await self.api.metatrader_account_api.create_account(
                account={
                    'name': name,
                    'type': 'cloud',
                    'login': login,
                    'password': password,
                    'server': server,
                    'platform': platform,
                    'magic': 123456,
                    'copyFactoryRoles': ['SUBSCRIBER'] if strategy_id else []
                }
            )
            
            # Wait for account to deploy - reduced timeout for faster feedback
            await account.deploy()
            await account.wait_deployed(timeout_in_seconds=120)
            
            # Auto-subscribe to master strategy if available
            subscription_status = "not_subscribed"
            if strategy_id:
                try:
                    subscription_result = await self.subscribe_to_strategy(account.id, strategy_id, user_id)
                    if subscription_result.get("success"):
                        subscription_status = "subscribed"
                        logger.info(f"Account {account.id} auto-subscribed to strategy {strategy_id}")
                except Exception as sub_error:
                    logger.warning(f"Could not auto-subscribe account: {sub_error}")
            
            # Store account info in database
            account_doc = {
                "id": account.id,
                "user_id": user_id,
                "metaapi_account_id": account.id,
                "mt5_login": login,
                "server_name": server,
                "account_name": name,
                "platform": platform,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "state": account.state,
                "is_subscriber": subscription_status == "subscribed",
                "subscribed_to_strategy": strategy_id if subscription_status == "subscribed" else None
            }
            
            await db.mt5_accounts.update_one(
                {"user_id": user_id, "mt5_login": login},
                {"$set": account_doc},
                upsert=True
            )
            
            logger.info(f"MT5 account created: {account.id}")
            
            # Fetch and store initial balance
            try:
                connection = account.get_streaming_connection()
                await connection.connect()
                await connection.wait_synchronized(timeout_in_seconds=60)
                account_info = connection.terminal_state.account_information
                if account_info:
                    await db.mt5_accounts.update_one(
                        {"metaapi_account_id": account.id},
                        {"$set": {
                            "balance": account_info.get('balance', 0),
                            "equity": account_info.get('equity', 0),
                            "currency": account_info.get('currency', 'USD'),
                            "balance_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    logger.info(f"Initial balance stored for account {account.id}: {account_info.get('balance', 0)}")
            except Exception as balance_error:
                logger.warning(f"Could not fetch initial balance: {balance_error}")
            
            return {
                "success": True,
                "account_id": account.id,
                "state": account.state,
                "subscription_status": subscription_status,
                "message": "MT5 account connected and subscribed to copy trading!" if subscription_status == "subscribed" else "MT5 account connected successfully"
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to create MT5 account: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
    
    async def subscribe_to_strategy(self, account_id: str, strategy_id: str, user_id: str = None) -> Dict[str, Any]:
        """Subscribe an account to a CopyFactory strategy with user's lot size settings"""
        try:
            # Ensure MetaAPI is initialized
            if not await self.ensure_initialized():
                return {"success": False, "error": "MetaAPI not configured"}
            
            from metaapi_cloud_copyfactory_sdk import CopyFactory
            
            token = await self.get_api_token()
            copy_factory = CopyFactory(token=token)
            configuration_api = copy_factory.configuration_api
            
            # Get account info for naming
            account = await self.api.metatrader_account_api.get_account(account_id)
            
            # Get user's custom lot size if available
            lot_size_multiplier = 1.0  # Default multiplier
            if user_id:
                user_setting = await db.user_settings.find_one(
                    {"user_id": user_id, "key": "lot_size"},
                    {"_id": 0}
                )
                if user_setting and user_setting.get("value"):
                    # Convert lot size to multiplier (0.01 = 1x, 0.02 = 2x, etc.)
                    lot_size = float(user_setting.get("value", 0.01))
                    lot_size_multiplier = lot_size / 0.01  # Base lot size is 0.01
                    logger.info(f"Using custom lot size {lot_size} (multiplier: {lot_size_multiplier}x) for user {user_id}")
            
            await configuration_api.update_subscriber(account_id, {
                'name': f'{account.name}-{account.login}',
                'subscriptions': [{
                    'strategyId': strategy_id,
                    'multiplier': lot_size_multiplier,
                    'copyStopLoss': True,
                    'copyTakeProfit': True,
                    'skipPendingOrders': False
                }]
            })
            
            logger.info(f"Account {account_id} subscribed to strategy {strategy_id} with multiplier {lot_size_multiplier}x")
            return {"success": True, "message": "Subscribed to copy trading", "multiplier": lot_size_multiplier}
            
        except Exception as e:
            logger.error(f"Failed to subscribe to strategy: {e}")
            return {"success": False, "error": str(e)}
    
    async def remove_account(self, account_id: str) -> Dict[str, Any]:
        """Remove/disconnect an MT5 account from MetaAPI"""
        if not await self.ensure_initialized():
            # Even if MetaAPI is not configured, we can still mark as inactive in DB
            return {
                "success": True,
                "message": "Account marked as disconnected (MetaAPI not configured)"
            }
        
        try:
            account = await self.api.metatrader_account_api.get_account(account_id)
            
            # Try to undeploy first if deployed - with shorter timeout
            if account.state == 'DEPLOYED':
                try:
                    await account.undeploy()
                    await account.wait_undeployed(timeout_in_seconds=30)
                except Exception as undeploy_error:
                    logger.warning(f"Undeploy timeout/error (continuing anyway): {undeploy_error}")
            
            # Try to remove the account from MetaAPI
            try:
                await account.remove()
                logger.info(f"MT5 account {account_id} removed from MetaAPI successfully")
            except Exception as remove_error:
                logger.warning(f"Could not remove from MetaAPI (continuing anyway): {remove_error}")
            
            return {"success": True, "message": "Account disconnected successfully"}
            
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"MetaAPI error during disconnect (marking as inactive anyway): {error_msg}")
            # Return success anyway - we'll mark as inactive in DB
            return {"success": True, "message": "Account disconnected (with warnings)"}
    
    async def get_account_info(self, account_id: str) -> Dict[str, Any]:
        """Get account information including balance"""
        if not await self.ensure_initialized():
            return {
                "success": False,
                "error": "MetaAPI not configured"
            }
        
        try:
            account = await self.api.metatrader_account_api.get_account(account_id)
            
            # Ensure account is deployed - reduced timeout
            if account.state != 'DEPLOYED':
                logger.info(f"Account {account_id} not deployed, deploying...")
                await account.deploy()
                await account.wait_deployed(timeout_in_seconds=60)
            
            # Get streaming connection
            logger.info(f"Getting streaming connection for account {account_id}")
            connection = account.get_streaming_connection()
            await connection.connect()
            
            # Wait for synchronization with timeout
            try:
                await asyncio.wait_for(connection.wait_synchronized(), timeout=30)
            except asyncio.TimeoutError:
                logger.warning(f"Synchronization timeout for account {account_id}, trying terminal state anyway")
            
            # Get account info
            account_info = connection.terminal_state.account_information
            
            if account_info:
                logger.info(f"Got account info for {account_id}: balance={account_info.get('balance', 0)}")
                return {
                    "success": True,
                    "balance": account_info.get('balance', 0),
                    "equity": account_info.get('equity', 0),
                    "free_margin": account_info.get('freeMargin', 0),
                    "margin": account_info.get('margin', 0),
                    "margin_level": account_info.get('marginLevel', 0),
                    "currency": account_info.get('currency', 'USD'),
                    "leverage": account_info.get('leverage', 0),
                    "broker": account_info.get('broker', ''),
                    "name": account_info.get('name', ''),
                    "server": account_info.get('server', '')
                }
            else:
                logger.warning(f"No account info available for {account_id}")
                return {
                    "success": False,
                    "error": "Could not retrieve account information"
                }
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get account info for {account_id}: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
    
    async def get_positions(self, account_id: str) -> Dict[str, Any]:
        """Get open positions for an account"""
        if not await self.ensure_initialized():
            return {
                "success": False,
                "error": "MetaAPI not configured",
                "positions": []
            }
        
        try:
            account = await self.api.metatrader_account_api.get_account(account_id)
            
            if account.state != 'DEPLOYED':
                await account.deploy()
                await account.wait_deployed(timeout_in_seconds=90)
            
            connection = account.get_streaming_connection()
            await connection.connect()
            await connection.wait_synchronized()  # No timeout parameter
            
            positions = connection.terminal_state.positions
            
            return {
                "success": True,
                "positions": [
                    {
                        "id": pos.get('id'),
                        "symbol": pos.get('symbol'),
                        "volume": pos.get('volume'),
                        "type": pos.get('type'),
                        "entry_price": pos.get('openPrice'),
                        "current_price": pos.get('currentPrice'),
                        "profit": pos.get('profit'),
                        "swap": pos.get('swap'),
                        "commission": pos.get('commission'),
                        "open_time": pos.get('time')
                    }
                    for pos in (positions or [])
                ]
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get positions: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "positions": []
            }
    
    async def get_open_positions(self, account_id: str) -> Dict[str, Any]:
        """Alias for get_positions - Get open positions for an account"""
        return await self.get_positions(account_id)
    
    async def get_user_accounts(self, user_id: str) -> List[Dict]:
        """Get all MT5 accounts for a user from database"""
        accounts = await db.mt5_accounts.find(
            {"user_id": user_id, "is_active": True},
            {"_id": 0}
        ).to_list(100)
        return accounts
    
    async def disconnect_account(self, user_id: str, account_id: str) -> Dict[str, Any]:
        """Disconnect/remove an MT5 account"""
        try:
            # Mark as inactive in database
            result = await db.mt5_accounts.update_one(
                {"user_id": user_id, "metaapi_account_id": account_id},
                {"$set": {"is_active": False}}
            )
            
            if result.modified_count > 0:
                return {"success": True, "message": "Account disconnected"}
            else:
                return {"success": False, "error": "Account not found"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_trade_history(
        self, 
        account_id: str, 
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get trade history for an account"""
        if not await self.ensure_initialized():
            return {
                "success": False,
                "error": "MetaAPI not configured",
                "trades": []
            }
        
        try:
            account = await self.api.metatrader_account_api.get_account(account_id)
            
            if account.state != 'DEPLOYED':
                await account.deploy()
                await account.wait_deployed(timeout_in_seconds=90)
            
            connection = account.get_streaming_connection()
            await connection.connect()
            await connection.wait_synchronized()
            
            # Get history orders (completed trades)
            # Use terminal state for recent history
            orders = connection.terminal_state.orders or []
            history_orders = connection.terminal_state.history_orders or []
            deals = connection.history_storage.deals if hasattr(connection, 'history_storage') else []
            
            # Combine and format trades
            formatted_trades = []
            
            # Process completed orders from history
            for order in history_orders[:limit]:
                trade = {
                    "id": order.get('id', ''),
                    "ticket": order.get('ticket', order.get('id', '')),
                    "symbol": order.get('symbol', 'N/A'),
                    "type": order.get('type', 'N/A'),
                    "volume": order.get('volume', 0),
                    "open_price": order.get('openPrice', order.get('price', 0)),
                    "close_price": order.get('closePrice', order.get('currentPrice', 0)),
                    "profit": order.get('profit', 0),
                    "swap": order.get('swap', 0),
                    "commission": order.get('commission', 0),
                    "open_time": order.get('openTime', order.get('time', '')),
                    "close_time": order.get('closeTime', order.get('doneTime', '')),
                    "state": order.get('state', 'FILLED'),
                    "comment": order.get('comment', ''),
                    "magic": order.get('magic', 0)
                }
                formatted_trades.append(trade)
            
            # If no history, check deals
            if not formatted_trades and deals:
                for deal in deals[:limit]:
                    trade = {
                        "id": deal.get('id', ''),
                        "ticket": deal.get('positionId', deal.get('id', '')),
                        "symbol": deal.get('symbol', 'N/A'),
                        "type": 'BUY' if deal.get('type') == 'DEAL_TYPE_BUY' else 'SELL',
                        "volume": deal.get('volume', 0),
                        "open_price": deal.get('price', 0),
                        "close_price": deal.get('price', 0),
                        "profit": deal.get('profit', 0),
                        "swap": deal.get('swap', 0),
                        "commission": deal.get('commission', 0),
                        "open_time": deal.get('time', ''),
                        "close_time": deal.get('time', ''),
                        "state": 'FILLED',
                        "comment": deal.get('comment', ''),
                        "magic": deal.get('magic', 0)
                    }
                    formatted_trades.append(trade)
            
            return {
                "success": True,
                "trades": formatted_trades,
                "total": len(formatted_trades)
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get trade history: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "trades": []
            }


# Global service instance
metaapi_service = MetaAPIService()
