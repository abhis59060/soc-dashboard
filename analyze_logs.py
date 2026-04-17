import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import Database

async def analyze():
    os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
    os.environ['DB_NAME'] = 'soc_dashboard'
    
    db = Database()
    try:
        await db.connect()
        # Query for DESKTOP-VQBBBQR specifically
        # The user mentioned 22 attempts and specific Event IDs (19, 43, 4624)
        logs = await db.get_logs({"host": "DESKTOP-VQBBBQR"}, limit=100)
        
        if not logs:
            print("No logs found for DESKTOP-VQBBBQR")
            return

        event_counts = {}
        for log in logs:
            eid = log.get("event_id", "Unknown")
            event_counts[eid] = event_counts.get(eid, 0) + 1
        
        print(f"Analysis for DESKTOP-VQBBBQR:")
        print(f"Total logs: {len(logs)}")
        print(f"Event ID breakdown: {event_counts}")
        
        for eid, count in event_counts.items():
            desc = "Unknown"
            if str(eid) == "4624": desc = "Successful Logon"
            elif str(eid) == "4625": desc = "Failed Logon"
            elif str(eid) == "4672": desc = "Special Privileges Assigned"
            elif str(eid) == "19": desc = "Windows Update (Installation Successful)"
            elif str(eid) == "43": desc = "Windows Update (Installation Started)"
            
            print(f"Event {eid}: {count} ({desc})")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(analyze())
