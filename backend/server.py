from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    # Startup
    logger.info("Starting IGRIS API Server...")
    
    # Initialize SMTP service with config from DB or env vars
    from services.smtp_service import smtp_service
    await smtp_service.load_config_from_db()
    if smtp_service.is_configured():
        logger.info(f"SMTP configured: {smtp_service.smtp_host}")
    else:
        logger.warning("SMTP not configured - email notifications will be disabled")
    
    # Initialize cron scheduler
    from utils.cron import setup_scheduler
    setup_scheduler()
    logger.info("Cron scheduler initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down IGRIS API Server...")
    from utils.cron import stop_scheduler
    stop_scheduler()
    client.close()
    logger.info("Server shutdown complete")


# Create the main app with lifespan
app = FastAPI(
    title="IGRIS Trading Platform API",
    description="AI-Powered Trading Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


# Basic routes
@api_router.get("/")
async def root():
    return {"message": "IGRIS API Server", "version": "1.0.0"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Import and include routes
from routes.auth import router as auth_router
from routes.trades import router as trades_router
from routes.downloads import router as downloads_router
from routes.settings import router as settings_router
from routes.system import router as system_router
from routes.notifications import router as notifications_router
from routes.metaapi import router as metaapi_router
from routes.signals import router as signals_router
from routes.tutorials import router as tutorials_router
from routes.profile import router as profile_router
from routes.wallet import router as wallet_router
from routes.admin import router as admin_router
from routes.email_templates import router as email_templates_router
from routes.chat import router as chat_router
from routes.subscriptions import router as subscriptions_router
from routes.verification import router as verification_router
from routes.speech import router as speech_router

api_router.include_router(auth_router)
api_router.include_router(trades_router)
api_router.include_router(downloads_router)
api_router.include_router(settings_router)
api_router.include_router(system_router)
api_router.include_router(notifications_router)
api_router.include_router(metaapi_router)
api_router.include_router(signals_router)
api_router.include_router(tutorials_router)
api_router.include_router(profile_router)
api_router.include_router(wallet_router)
api_router.include_router(admin_router)
api_router.include_router(email_templates_router)
api_router.include_router(chat_router)
api_router.include_router(subscriptions_router)
api_router.include_router(verification_router)
api_router.include_router(speech_router)

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response caching headers middleware
@app.middleware("http")
async def add_cache_headers(request, call_next):
    response = await call_next(request)
    
    # Add cache headers based on endpoint
    path = request.url.path
    
    # Check if response already has Cache-Control header (e.g., from notification endpoints)
    if "Cache-Control" in response.headers:
        # Don't override existing cache headers
        return response
    
    if path.startswith("/api/system/health"):
        # No cache for health checks
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    elif path.startswith("/api/trades"):
        # Short cache for trades
        response.headers["Cache-Control"] = "private, max-age=30"
    elif path.startswith("/api/settings"):
        # No cache for settings
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    elif "/static/" in path:
        # Long cache for static assets
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        # Default short cache
        response.headers["Cache-Control"] = "private, max-age=60"
    
    return response
