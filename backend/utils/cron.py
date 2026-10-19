from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()

# Job execution history
job_history = []

# Track last processed trade time for notifications
last_trade_check = datetime.now(timezone.utc)


def log_job_execution(job_name: str, status: str, message: str = ""):
    """Log job execution to history."""
    entry = {
        "job_name": job_name,
        "status": status,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    job_history.append(entry)
    # Keep only last 100 entries
    if len(job_history) > 100:
        job_history.pop(0)
    logger.info(f"Cron Job [{job_name}]: {status} - {message}")


async def refresh_market_data():
    """Refresh market data cache - runs every minute."""
    try:
        from utils.cache import market_cache, clear_cache
        # Clear old market data to force refresh on next request
        market_cache.clear()
        log_job_execution("refresh_market_data", "SUCCESS", "Market cache cleared")
    except Exception as e:
        log_job_execution("refresh_market_data", "ERROR", str(e))


async def refresh_signals_cache():
    """Refresh AI signals cache - runs every 5 minutes."""
    try:
        from utils.cache import signals_cache
        signals_cache.clear()
        log_job_execution("refresh_signals_cache", "SUCCESS", "Signals cache cleared")
    except Exception as e:
        log_job_execution("refresh_signals_cache", "ERROR", str(e))


async def cleanup_old_data():
    """Clean up old data from database - runs every hour."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        mongo_url = os.environ.get('MONGO_URL')
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME')]
        
        # Clean up old status checks (older than 7 days)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        result = await db.status_checks.delete_many({"timestamp": {"$lt": cutoff_date}})
        
        # Clean up old read notifications (older than 30 days)
        notification_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        notif_result = await db.notifications.delete_many({
            "read": True,
            "created_at": {"$lt": notification_cutoff.isoformat()}
        })
        
        log_job_execution("cleanup_old_data", "SUCCESS", 
                         f"Deleted {result.deleted_count} old records, {notif_result.deleted_count} old notifications")
        client.close()
    except Exception as e:
        log_job_execution("cleanup_old_data", "ERROR", str(e))


async def health_check():
    """System health check - runs every minute."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        # Check MongoDB connection
        mongo_url = os.environ.get('MONGO_URL')
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        client.close()
        
        log_job_execution("health_check", "SUCCESS", "All systems operational")
    except Exception as e:
        log_job_execution("health_check", "ERROR", f"Health check failed: {str(e)}")


async def process_trade_alerts():
    """Process new copied trades and send email alerts - runs every second."""
    global last_trade_check
    
    try:
        from services.trade_monitor import trade_monitor
        
        # Check for new copied trades (lightweight check)
        new_trades = await trade_monitor.check_copied_trades()
        
        if new_trades:
            log_job_execution("process_trade_alerts", "SUCCESS", 
                             f"Found {len(new_trades)} new copied trades, notifications sent")
        
        # Update last check time
        last_trade_check = datetime.now(timezone.utc)
        
    except Exception as e:
        # Don't log every second if no error - too noisy
        pass


async def sync_trades():
    """Sync and process new trades - runs every minute."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        mongo_url = os.environ.get('MONGO_URL')
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME')]
        
        # Count recent trades (last hour)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        count = await db.trades.count_documents({"created_at": {"$gte": cutoff.isoformat()}})
        
        log_job_execution("sync_trades", "SUCCESS", f"Found {count} trades in last hour")
        client.close()
    except Exception as e:
        log_job_execution("sync_trades", "ERROR", str(e))


def setup_scheduler():
    """Configure and start the scheduler with all jobs."""
    
    # Job 1: Refresh market data every minute
    scheduler.add_job(
        refresh_market_data,
        IntervalTrigger(minutes=1),
        id="refresh_market_data",
        name="Refresh Market Data",
        replace_existing=True
    )
    
    # Job 2: Health check every minute
    scheduler.add_job(
        health_check,
        IntervalTrigger(minutes=1),
        id="health_check",
        name="System Health Check",
        replace_existing=True
    )
    
    # Job 3: Sync trades every minute
    scheduler.add_job(
        sync_trades,
        IntervalTrigger(minutes=1),
        id="sync_trades",
        name="Sync Trades",
        replace_existing=True
    )
    
    # Job 4: Refresh signals cache every 5 minutes
    scheduler.add_job(
        refresh_signals_cache,
        IntervalTrigger(minutes=5),
        id="refresh_signals_cache",
        name="Refresh Signals Cache",
        replace_existing=True
    )
    
    # Job 5: Cleanup old data every hour
    scheduler.add_job(
        cleanup_old_data,
        IntervalTrigger(hours=1),
        id="cleanup_old_data",
        name="Cleanup Old Data",
        replace_existing=True
    )
    
    # Job 6: Process trade alerts and send emails every 1 second
    scheduler.add_job(
        process_trade_alerts,
        IntervalTrigger(seconds=1),
        id="process_trade_alerts",
        name="Process Trade Alerts",
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    logger.info("Cron scheduler started with 6 jobs")


def get_scheduler_status():
    """Get status of all scheduled jobs."""
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
        "recent_history": job_history[-20:]  # Last 20 executions
    }


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Cron scheduler stopped")
