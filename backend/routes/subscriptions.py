"""Subscription Plans and Payment Routes"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import jwt
import logging

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_client = AsyncIOMotorClient(MONGO_URL)
db = db_client[os.environ.get('DB_NAME')]


async def get_user_from_token(authorization: str):
    """Verify token and return user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.split(' ')[1]
    
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET_KEY', 'igris-secret-key-change-in-production'), algorithms=['HS256'])
        # The 'sub' field contains email, 'user_id' contains the actual user ID
        user_id = payload.get('user_id') or payload.get('sub')
        user = await db.users.find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_from_token(authorization: str):
    """Verify admin token"""
    user = await get_user_from_token(authorization)
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Default subscription plans
DEFAULT_PLANS = [
    {
        "id": "starter",
        "name": "Starter",
        "price": 29,
        "currency": "USD",
        "interval": "month",
        "features": [
            "Connect 1 MT5 Account",
            "Basic AI Signals",
            "Daily Email Reports",
            "Standard Support"
        ],
        "is_active": True,
        "order": 1
    },
    {
        "id": "pro",
        "name": "Pro",
        "price": 99,
        "currency": "USD",
        "interval": "month",
        "features": [
            "Connect 3 MT5 Accounts",
            "Advanced AI Signals",
            "Real-time Email Alerts",
            "Priority Support",
            "Chart Analysis AI",
            "Risk Management Tools"
        ],
        "is_active": True,
        "popular": True,
        "order": 2
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 299,
        "currency": "USD",
        "interval": "month",
        "features": [
            "Unlimited MT5 Accounts",
            "Premium AI Signals",
            "Dedicated Account Manager",
            "24/7 VIP Support",
            "Custom Strategy Development",
            "API Access",
            "White-label Options"
        ],
        "is_active": True,
        "order": 3
    }
]


# Models
class PlanCreate(BaseModel):
    name: str
    price: float
    currency: str = "USD"
    interval: str = "month"  # month, year
    features: List[str]
    is_active: bool = True
    popular: bool = False
    order: int = 0


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    interval: Optional[str] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    popular: Optional[bool] = None
    order: Optional[int] = None


class PaymentSettingsUpdate(BaseModel):
    payment_methods: List[str]  # ['stripe', 'paypal', 'razorpay', 'manual']
    stripe_enabled: bool = False
    stripe_public_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    paypal_enabled: bool = False
    paypal_client_id: Optional[str] = None
    paypal_secret: Optional[str] = None
    razorpay_enabled: bool = False
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    manual_enabled: bool = False
    manual_bank_name: Optional[str] = None
    manual_account_number: Optional[str] = None
    manual_account_name: Optional[str] = None
    manual_instructions: Optional[str] = None


class SubscriptionRequest(BaseModel):
    plan_id: str
    payment_method: str  # 'stripe', 'paypal', 'razorpay', 'manual'
    payment_proof: Optional[str] = None  # For manual payments


class SubscriptionApproval(BaseModel):
    subscription_id: str
    approved: bool
    admin_notes: Optional[str] = None


# Initialize default plans if not exists
async def init_default_plans():
    existing = await db.subscription_plans.count_documents({})
    if existing == 0:
        for plan in DEFAULT_PLANS:
            await db.subscription_plans.insert_one(plan)
        logger.info("Default subscription plans initialized")


# ============== PUBLIC ROUTES ==============

@router.get("/plans")
async def get_plans():
    """Get all active subscription plans"""
    await init_default_plans()
    
    plans = await db.subscription_plans.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    return {"plans": plans}


@router.get("/payment-methods")
async def get_payment_methods():
    """Get available payment methods"""
    settings = await db.settings.find_one({"key": "payment_settings"}, {"_id": 0})
    
    if not settings:
        return {
            "methods": [],
            "manual": None
        }
    
    value = settings.get("value", {})
    methods = []
    
    if value.get("stripe_enabled"):
        methods.append({"id": "stripe", "name": "Credit/Debit Card (Stripe)"})
    if value.get("paypal_enabled"):
        methods.append({"id": "paypal", "name": "PayPal"})
    if value.get("razorpay_enabled"):
        methods.append({"id": "razorpay", "name": "Razorpay"})
    if value.get("manual_enabled"):
        methods.append({"id": "manual", "name": "Bank Transfer"})
    
    manual_info = None
    if value.get("manual_enabled"):
        manual_info = {
            "bank_name": value.get("manual_bank_name"),
            "account_number": value.get("manual_account_number"),
            "account_name": value.get("manual_account_name"),
            "instructions": value.get("manual_instructions")
        }
    
    return {
        "methods": methods,
        "manual": manual_info
    }


# ============== USER ROUTES ==============

@router.get("/my-subscription")
async def get_my_subscription(authorization: str = Header(None)):
    """Get current user's subscription"""
    user = await get_user_from_token(authorization)
    
    subscription = await db.user_subscriptions.find_one(
        {"user_id": user["id"]},
        {"_id": 0}
    )
    
    if subscription:
        # Get plan details
        plan = await db.subscription_plans.find_one(
            {"id": subscription.get("plan_id")},
            {"_id": 0}
        )
        subscription["plan"] = plan
    
    return {"subscription": subscription}


@router.post("/subscribe")
async def subscribe(
    request: SubscriptionRequest,
    authorization: str = Header(None)
):
    """Subscribe to a plan"""
    user = await get_user_from_token(authorization)
    
    # Check if plan exists
    plan = await db.subscription_plans.find_one(
        {"id": request.plan_id, "is_active": True},
        {"_id": 0}
    )
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check payment method is enabled
    settings = await db.settings.find_one({"key": "payment_settings"}, {"_id": 0})
    payment_value = settings.get("value", {}) if settings else {}
    
    method_key = f"{request.payment_method}_enabled"
    if not payment_value.get(method_key, False):
        raise HTTPException(status_code=400, detail=f"Payment method {request.payment_method} is not enabled")
    
    # Create subscription record
    subscription_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Determine status based on payment method
    if request.payment_method == "manual":
        status = "pending_approval"  # Manual payments need admin approval
    else:
        status = "pending_payment"  # Other methods need payment completion
    
    subscription = {
        "id": subscription_id,
        "user_id": user["id"],
        "user_email": user.get("email"),
        "user_name": user.get("name"),
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "price": plan["price"],
        "currency": plan["currency"],
        "interval": plan["interval"],
        "payment_method": request.payment_method,
        "payment_proof": request.payment_proof,
        "status": status,
        "created_at": now.isoformat(),
        "expires_at": None,
        "admin_notes": None
    }
    
    # Check if user already has a subscription
    existing = await db.user_subscriptions.find_one({"user_id": user["id"]})
    if existing:
        # Update existing
        await db.user_subscriptions.update_one(
            {"user_id": user["id"]},
            {"$set": subscription}
        )
    else:
        await db.user_subscriptions.insert_one(subscription)
    
    return {
        "success": True,
        "subscription_id": subscription_id,
        "status": status,
        "message": "Subscription request submitted" if status == "pending_approval" else "Complete payment to activate subscription"
    }


# ============== ADMIN ROUTES ==============

@router.get("/admin/plans")
async def admin_get_plans(authorization: str = Header(None)):
    """Admin: Get all plans including inactive"""
    await get_admin_from_token(authorization)
    await init_default_plans()
    
    plans = await db.subscription_plans.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return {"plans": plans}


@router.post("/admin/plans")
async def admin_create_plan(
    plan: PlanCreate,
    authorization: str = Header(None)
):
    """Admin: Create a new subscription plan"""
    await get_admin_from_token(authorization)
    
    plan_id = str(uuid.uuid4())[:8]
    plan_data = {
        "id": plan_id,
        **plan.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscription_plans.insert_one(plan_data)
    
    return {"success": True, "plan": {**plan_data, "_id": None}}


@router.put("/admin/plans/{plan_id}")
async def admin_update_plan(
    plan_id: str,
    update: PlanUpdate,
    authorization: str = Header(None)
):
    """Admin: Update a subscription plan"""
    await get_admin_from_token(authorization)
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan = await db.subscription_plans.find_one({"id": plan_id}, {"_id": 0})
    return {"success": True, "plan": plan}


@router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(
    plan_id: str,
    authorization: str = Header(None)
):
    """Admin: Delete a subscription plan"""
    await get_admin_from_token(authorization)
    
    result = await db.subscription_plans.delete_one({"id": plan_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"success": True, "message": "Plan deleted"}


@router.get("/admin/payment-settings")
async def admin_get_payment_settings(authorization: str = Header(None)):
    """Admin: Get payment settings"""
    await get_admin_from_token(authorization)
    
    settings = await db.settings.find_one({"key": "payment_settings"}, {"_id": 0})
    
    if settings:
        value = settings.get("value", {})
        # Mask sensitive keys
        for key in ["stripe_secret_key", "paypal_secret", "razorpay_key_secret"]:
            if value.get(key):
                value[key] = value[key][:8] + "..." if len(value[key]) > 8 else "***"
        return {"settings": value}
    
    return {"settings": None}


@router.post("/admin/payment-settings")
async def admin_save_payment_settings(
    settings: PaymentSettingsUpdate,
    authorization: str = Header(None)
):
    """Admin: Save payment settings"""
    await get_admin_from_token(authorization)
    
    await db.settings.update_one(
        {"key": "payment_settings"},
        {
            "$set": {
                "key": "payment_settings",
                "value": settings.dict(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Payment settings saved"}


@router.get("/admin/subscriptions")
async def admin_get_subscriptions(
    status: Optional[str] = None,
    authorization: str = Header(None)
):
    """Admin: Get all user subscriptions"""
    await get_admin_from_token(authorization)
    
    query = {}
    if status:
        query["status"] = status
    
    subscriptions = await db.user_subscriptions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"subscriptions": subscriptions}


@router.post("/admin/approve")
async def admin_approve_subscription(
    request: SubscriptionApproval,
    authorization: str = Header(None)
):
    """Admin: Approve or reject a subscription"""
    admin = await get_admin_from_token(authorization)
    
    subscription = await db.user_subscriptions.find_one(
        {"id": request.subscription_id},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    now = datetime.now(timezone.utc)
    
    if request.approved:
        # Calculate expiry based on interval
        interval = subscription.get("interval", "month")
        if interval == "month":
            expires_at = now + timedelta(days=30)
        elif interval == "year":
            expires_at = now + timedelta(days=365)
        else:
            expires_at = now + timedelta(days=30)
        
        update_data = {
            "status": "active",
            "activated_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "approved_by": admin["id"],
            "admin_notes": request.admin_notes
        }
    else:
        update_data = {
            "status": "rejected",
            "rejected_at": now.isoformat(),
            "rejected_by": admin["id"],
            "admin_notes": request.admin_notes
        }
    
    await db.user_subscriptions.update_one(
        {"id": request.subscription_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "status": "active" if request.approved else "rejected",
        "message": "Subscription approved" if request.approved else "Subscription rejected"
    }


# Admin: Get/Set global risk score
@router.get("/admin/risk-score")
async def admin_get_risk_score(authorization: str = Header(None)):
    """Admin: Get global risk score setting"""
    await get_admin_from_token(authorization)
    
    risk_setting = await db.settings.find_one({"key": "global_risk_score"}, {"_id": 0})
    positions_setting = await db.settings.find_one({"key": "max_positions"}, {"_id": 0})
    
    return {
        "risk_score": risk_setting.get("value", "Medium") if risk_setting else "Medium",
        "max_positions": positions_setting.get("value", 10) if positions_setting else 10
    }


@router.post("/admin/risk-score")
async def admin_set_risk_score(
    risk_score: str,
    authorization: str = Header(None)
):
    """Admin: Set global risk score for all users"""
    await get_admin_from_token(authorization)
    
    if risk_score not in ["Low", "Medium", "High"]:
        raise HTTPException(status_code=400, detail="Risk score must be Low, Medium, or High")
    
    await db.settings.update_one(
        {"key": "global_risk_score"},
        {
            "$set": {
                "key": "global_risk_score",
                "value": risk_score,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "risk_score": risk_score}


@router.post("/admin/risk-settings")
async def admin_set_risk_settings(
    request: dict,
    authorization: str = Header(None)
):
    """Admin: Set global risk management settings for all users"""
    await get_admin_from_token(authorization)
    
    risk_score = request.get("risk_score", "Medium")
    max_positions = request.get("max_positions", 10)
    
    if risk_score not in ["Low", "Medium", "High"]:
        raise HTTPException(status_code=400, detail="Risk score must be Low, Medium, or High")
    
    if not isinstance(max_positions, int) or max_positions < 1 or max_positions > 100:
        raise HTTPException(status_code=400, detail="Max positions must be between 1 and 100")
    
    # Update risk score
    await db.settings.update_one(
        {"key": "global_risk_score"},
        {
            "$set": {
                "key": "global_risk_score",
                "value": risk_score,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Update max positions
    await db.settings.update_one(
        {"key": "max_positions"},
        {
            "$set": {
                "key": "max_positions",
                "value": max_positions,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "risk_score": risk_score, "max_positions": max_positions}


@router.get("/risk-score")
async def get_risk_score():
    """Public: Get global risk management settings for all users"""
    risk_setting = await db.settings.find_one({"key": "global_risk_score"}, {"_id": 0})
    positions_setting = await db.settings.find_one({"key": "max_positions"}, {"_id": 0})
    
    return {
        "risk_score": risk_setting.get("value", "Medium") if risk_setting else "Medium",
        "max_positions": positions_setting.get("value", 10) if positions_setting else 10
    }


# Pydantic model for plan updates
class PlanUpdate(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    currency: str = "USD"
    interval: str = "month"  # month, year, week
    description: Optional[str] = ""
    features: Optional[List[str]] = []
    is_active: bool = True
    popular: bool = False
    order: int = 1


@router.post("/admin/plans")
async def admin_create_or_update_plan(
    plan: PlanUpdate,
    authorization: str = Header(None)
):
    """Admin: Create or update a subscription plan"""
    await get_admin_from_token(authorization)
    
    plan_data = plan.dict()
    
    if plan.id:
        # Update existing plan
        existing = await db.subscription_plans.find_one({"id": plan.id})
        if not existing:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        plan_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.subscription_plans.update_one(
            {"id": plan.id},
            {"$set": plan_data}
        )
        return {"success": True, "message": "Plan updated successfully", "plan": plan_data}
    else:
        # Create new plan
        plan_data["id"] = f"plan_{str(uuid.uuid4())[:8]}"
        plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.subscription_plans.insert_one(plan_data)
        plan_data.pop("_id", None)
        return {"success": True, "message": "Plan created successfully", "plan": plan_data}


@router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(
    plan_id: str,
    authorization: str = Header(None)
):
    """Admin: Delete a subscription plan"""
    await get_admin_from_token(authorization)
    
    result = await db.subscription_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"success": True, "message": "Plan deleted successfully"}


@router.put("/admin/plans/{plan_id}/toggle")
async def admin_toggle_plan(
    plan_id: str,
    authorization: str = Header(None)
):
    """Admin: Toggle plan active status"""
    await get_admin_from_token(authorization)
    
    plan = await db.subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    new_status = not plan.get("is_active", True)
    await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "is_active": new_status}
