import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta

async def verify():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "soc_dashboard")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logs_collection = db.logs

    print(f"Connecting to {db_name} at {mongo_url}...")
    
    # Simulate the /api/alerts query (last 24h, severity: high)
    time_filter = datetime.utcnow() - timedelta(hours=24)
    filters = {
        "timestamp": {"$gte": time_filter},
        "severity": "high"
    }
    
    cursor = logs_collection.find(filters).sort("timestamp", -1).limit(3)
    alerts = await cursor.to_list(length=3)
    
    print("\n--- Last 3 High Severity Alerts in MongoDB ---")
    if not alerts:
        print("No high severity alerts found in the last 24 hours.")
    for alert in alerts:
        print(f"ID: {str(alert['_id'])} | Event: {alert.get('event')} | Host: {alert.get('host')} | Time: {alert.get('timestamp')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify())
