import asyncio
import logging
import os
import sys
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
logger = logging.getLogger("cleanup_analyst")

async def cleanup_host_data(host_name: str = "SYSTEM-ANALYST"):
    """Delete all logs and agent data for a specific host"""
    db = Database()
    try:
        await db.connect()
        
        # Delete logs for the host
        logger.info(f"Deleting logs for {host_name}...")
        log_count = await db.delete_logs({"host": host_name})
        logger.info(f"Deleted {log_count} logs for {host_name}")
        
        # Delete agent entry for the host
        logger.info(f"Deleting agent info for {host_name}...")
        agent_count = await db.delete_agents({"hostname": host_name})
        logger.info(f"Deleted {agent_count} agents for {host_name}")
        
    except Exception as e:
        logger.error(f"Error during cleanup of {host_name}: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(cleanup_host_data())
