import asyncio
import os
import sys
from datetime import datetime

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import Database

async def insert_summary():
    os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
    os.environ['DB_NAME'] = 'soc_dashboard'
    
    db = Database()
    try:
        await db.connect()
        summary_log = {
            'host': 'SYSTEM-ANALYST',
            'event': 'Threat Actor Analysis: DESKTOP-VQBBBQR is SAFE. High log count is due to standard Windows Updates (ID 19/43) and Credential Manager requests (ID 5379), not malicious activity.',
            'severity': 'critical',
            'os': 'windows',
            'timestamp': datetime.utcnow(),
            'event_id': 'INFO',
            'log_type': 'Security'
        }
        await db.insert_log(summary_log)
        print("Summary alert inserted successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(insert_summary())
