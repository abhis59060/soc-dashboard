import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend to sys.path to use Database if needed, 
# but a direct script is safer if methods are missing
async def remove_test_nodes():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "soc_dashboard")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    agents_collection = db.agents
    logs_collection = db.logs
    
    target_nodes = ["PRO-LAPTOP-TEST", "TEST-LAPTOP"]
    
    print(f"Connecting to {db_name}...")
    
    # Remove from agents collection
    agent_result = await agents_collection.delete_many({"hostname": {"$in": target_nodes}})
    print(f"Removed {agent_result.deleted_count} documents from 'agents' collection.")
    
    # Also remove associated logs to be clean
    log_result = await logs_collection.delete_many({"host": {"$in": target_nodes}})
    print(f"Removed {log_result.deleted_count} logs associated with these nodes.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(remove_test_nodes())
