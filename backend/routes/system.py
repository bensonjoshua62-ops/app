from fastapi import APIRouter, HTTPException, Header
from utils.auth import decode_token
from utils.cache import get_cache_stats, clear_cache, market_cache, signals_cache, user_cache, general_cache
from utils.cron import get_scheduler_status, job_history

router = APIRouter(prefix="/system", tags=["System"])


async def verify_admin(authorization: str):
    """Verify admin access."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or not payload.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return payload


@router.get("/cache/stats")
async def get_cache_statistics(authorization: str = Header(None)):
    """Get cache statistics (admin only)."""
    await verify_admin(authorization)
    return get_cache_stats()


@router.post("/cache/clear")
async def clear_all_caches(authorization: str = Header(None)):
    """Clear all caches (admin only)."""
    await verify_admin(authorization)
    clear_cache()
    return {"message": "All caches cleared successfully"}


@router.post("/cache/clear/{cache_type}")
async def clear_specific_cache(cache_type: str, authorization: str = Header(None)):
    """Clear specific cache (admin only)."""
    await verify_admin(authorization)
    
    cache_map = {
        "market": market_cache,
        "signals": signals_cache,
        "user": user_cache,
        "general": general_cache
    }
    
    if cache_type not in cache_map:
        raise HTTPException(status_code=400, detail=f"Invalid cache type. Choose from: {list(cache_map.keys())}")
    
    clear_cache(cache_map[cache_type])
    return {"message": f"{cache_type} cache cleared successfully"}


@router.get("/cron/status")
async def get_cron_status(authorization: str = Header(None)):
    """Get cron job status (admin only)."""
    await verify_admin(authorization)
    return get_scheduler_status()


@router.get("/cron/history")
async def get_cron_history(authorization: str = Header(None)):
    """Get cron job execution history (admin only)."""
    await verify_admin(authorization)
    return {"history": job_history}


@router.get("/health")
async def health_check():
    """Public health check endpoint."""
    return {
        "status": "healthy",
        "cache": get_cache_stats(),
        "scheduler": {"running": True}
    }
