import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
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
logger = logging.getLogger("insert_summary")

async def insert_analysis_summary():
    """Insert a manual summary alert for the SOC analysts"""
    db = Database()
    try:
        await db.connect()
        
        summary_log = {
            'host': 'SYSTEM-ANALYST',
            'event': 'Threat Actor Analysis: DESKTOP-VQBBBQR is SAFE. High log count is due to standard Windows Updates (ID 19/43) and Credential Manager requests (ID 5379), not malicious activity.',
            'severity': 'critical',
            'os': 'windows',
            'timestamp': datetime.now(timezone.utc),
            'event_id': 'INFO',
            'log_type': 'Security'
        }
        
        logger.info("Inserting summary log into database...")
        log_id = await db.ingest_log(summary_log)
        logger.info(f"Summary alert inserted successfully with ID: {log_id}")
        
    except Exception as e:
        logger.error(f"Failed to insert summary log: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(insert_analysis_summary())
