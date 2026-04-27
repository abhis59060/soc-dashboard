import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.append(str(backend_path))

from database import Database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("verify_live_data")

async def verify_alerts(hours_window: int = 24, min_severity: str = "high"):
    """Verify high severity alerts in the database within a time window"""
    db = Database()
    try:
        await db.connect()
        
        # Calculate time threshold
        time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours_window)
        
        logger.info(f"Checking for alerts with severity '{min_severity}' since {time_threshold}")
        
        # Use Database method instead of direct collection access
        filters = {
            "timestamp": {"$gte": time_threshold},
            "severity": min_severity
        }
        
        alerts = await db.get_logs(filters, limit=3)
        
        print(f"\n--- Last {len(alerts)} High Severity Alerts (Window: {hours_window}h) ---")
        if not alerts:
            print(f"No {min_severity} severity alerts found in the last {hours_window} hours.")
        else:
            for alert in alerts:
                alert_id = alert.get('_id')
                event = alert.get('event')
                host = alert.get('host')
                timestamp = alert.get('timestamp')
                print(f"ID: {alert_id} | Host: {host} | Time: {timestamp} | Event: {event}")
        
    except Exception as e:
        logger.error(f"Error during data verification: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(verify_alerts())
