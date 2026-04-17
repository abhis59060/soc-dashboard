import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import Database

async def cleanup():
    os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
    os.environ['DB_NAME'] = 'soc_dashboard'
    
    db = Database()
    try:
        await db.connect()
        
        # Delete from logs
        log_result = await db.logs_collection.delete_many({"host": "SYSTEM-ANALYST"})
        print(f"Deleted {log_result.deleted_count} logs for SYSTEM-ANALYST")
        
        # Delete from agents
        agent_result = await db.agents_collection.delete_many({"hostname": "SYSTEM-ANALYST"})
        print(f"Deleted {agent_result.deleted_count} agents for SYSTEM-ANALYST")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(cleanup())
