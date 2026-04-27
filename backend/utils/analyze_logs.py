import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any

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
logger = logging.getLogger("analyze_logs")

async def analyze_host_logs(host_name: str = "DESKTOP-VQBBBQR"):
    """Analyze logs for a specific host and print event breakdown"""
    db = Database()
    try:
        await db.connect()
        logger.info(f"Querying logs for host: {host_name}")
        
        # Retrieve logs using Database method
        filters = {"host": host_name}
        logs = await db.get_logs(filters, limit=100)
        
        if not logs:
            logger.warning(f"No logs found for {host_name}")
            return

        event_counts: Dict[str, int] = {}
        for log in logs:
            eid = str(log.get("event_id", "Unknown"))
            event_counts[eid] = event_counts.get(eid, 0) + 1
        
        print(f"\n--- Analysis for {host_name} ---")
        print(f"Total logs: {len(logs)}")
        print(f"Event ID breakdown: {event_counts}")
        
        event_descriptions = {
            "4624": "Successful Logon",
            "4625": "Failed Logon",
            "4672": "Special Privileges Assigned",
            "19": "Windows Update (Installation Successful)",
            "43": "Windows Update (Installation Started)",
            "5379": "Credential Manager Request"
        }
        
        for eid, count in event_counts.items():
            desc = event_descriptions.get(eid, "Unknown Event")
            print(f"Event {eid}: {count} ({desc})")

    except Exception as e:
        logger.error(f"Failed to analyze logs: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(analyze_host_logs())
