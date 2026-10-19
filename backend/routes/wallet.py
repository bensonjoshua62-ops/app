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

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# Helper function to get user from token
async def get_user_from_token(authorization: str):
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
    
    return user


class WalletConnect(BaseModel):
    address: str
    chain: str  # ethereum, polygon, bsc, etc.
    wallet_type: str  # metamask, walletconnect, coinbase, etc.


class TransactionRequest(BaseModel):
    to_address: str
    amount: float
    token: str  # ETH, USDT, etc.
    chain: str


@router.get("/status")
async def get_wallet_status(authorization: str = Header(None)):
    """Check if wallet feature is enabled"""
    user = await get_user_from_token(authorization)
    
    # Check global wallet setting
    settings = await db.settings.find_one({"key": "wallet_enabled"}, {"_id": 0})
    wallet_enabled = settings.get("value", False) if settings else False
    
    # Admins can always access
    if user.get("is_admin"):
        wallet_enabled = True
    
    return {
        "enabled": wallet_enabled,
        "message": "Wallet feature is enabled" if wallet_enabled else "Wallet feature is disabled by admin"
    }


@router.get("")
async def get_wallet(authorization: str = Header(None)):
    """Get connected wallet info"""
    user = await get_user_from_token(authorization)
    
    # Check if wallet is enabled
    settings = await db.settings.find_one({"key": "wallet_enabled"}, {"_id": 0})
    wallet_enabled = settings.get("value", False) if settings else False
    
    if not wallet_enabled and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Wallet feature is disabled")
    
    wallet = await db.wallets.find_one(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not wallet:
        return {
            "connected": False,
            "wallet": None
        }
    
    return {
        "connected": True,
        "wallet": wallet
    }


@router.post("/connect")
async def connect_wallet(
    wallet_data: WalletConnect,
    authorization: str = Header(None)
):
    """Connect a crypto wallet"""
    user = await get_user_from_token(authorization)
    
    # Check if wallet is enabled
    settings = await db.settings.find_one({"key": "wallet_enabled"}, {"_id": 0})
    wallet_enabled = settings.get("value", False) if settings else False
    
    if not wallet_enabled and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Wallet feature is disabled")
    
    # Check if wallet already connected
    existing = await db.wallets.find_one({
        "user_id": user["id"],
        "address": wallet_data.address.lower(),
        "is_active": True
    })
    
    if existing:
        return {"success": True, "message": "Wallet already connected", "wallet": existing}
    
    wallet_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "address": wallet_data.address.lower(),
        "chain": wallet_data.chain,
        "wallet_type": wallet_data.wallet_type,
        "is_active": True,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "balances": {}  # Will be updated by external service
    }
    
    await db.wallets.insert_one(wallet_doc)
    
    return {
        "success": True,
        "message": "Wallet connected successfully",
        "wallet": {k: v for k, v in wallet_doc.items() if k != "_id"}
    }


@router.delete("/disconnect")
async def disconnect_wallet(authorization: str = Header(None)):
    """Disconnect current wallet"""
    user = await get_user_from_token(authorization)
    
    result = await db.wallets.update_one(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"is_active": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No connected wallet found")
    
    return {"success": True, "message": "Wallet disconnected"}


@router.get("/transactions")
async def get_transactions(
    limit: int = 20,
    authorization: str = Header(None)
):
    """Get wallet transaction history"""
    user = await get_user_from_token(authorization)
    
    wallet = await db.wallets.find_one(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not wallet:
        return {"transactions": [], "total": 0}
    
    transactions = await db.wallet_transactions.find(
        {"wallet_id": wallet["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return {"transactions": transactions, "total": len(transactions)}


@router.get("/balances")
async def get_balances(authorization: str = Header(None)):
    """Get wallet token balances"""
    user = await get_user_from_token(authorization)
    
    wallet = await db.wallets.find_one(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not wallet:
        return {"balances": {}, "total_usd": 0}
    
    # Return stored balances (would be updated by external service)
    return {
        "balances": wallet.get("balances", {}),
        "total_usd": wallet.get("total_usd", 0),
        "address": wallet.get("address"),
        "chain": wallet.get("chain")
    }


# Admin endpoints
@router.put("/admin/toggle")
async def toggle_wallet_feature(
    enabled: bool,
    authorization: str = Header(None)
):
    """Enable/disable wallet feature (admin only)"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.settings.update_one(
        {"key": "wallet_enabled"},
        {"$set": {"value": enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Wallet feature {'enabled' if enabled else 'disabled'}"
    }


@router.get("/admin/status")
async def get_wallet_admin_status(authorization: str = Header(None)):
    """Get wallet admin settings"""
    user = await get_user_from_token(authorization)
    
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.settings.find_one({"key": "wallet_enabled"}, {"_id": 0})
    
    # Get wallet stats
    total_wallets = await db.wallets.count_documents({"is_active": True})
    
    return {
        "enabled": settings.get("value", False) if settings else False,
        "total_connected_wallets": total_wallets
    }
