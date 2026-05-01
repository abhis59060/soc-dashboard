import requests
import json
from datetime import datetime

URL = "http://localhost:8000/api/logs/ingest"

# Updated to use lowercase 'security' as per backend Enum validation
fake_log = {
    "host": "DESKTOP-VQBBBQR",
    "event_id": 4625,
    "severity": "high",
    "message": "CRITICAL: Multiple failed login attempts detected",
    "os": "windows",
    "source": "Security",
    "log_type": "security",  # Changed 'Security' to 'security'
    "event": "Logon Failure",
    "timestamp": datetime.utcnow().isoformat()
}

try:
    response = requests.post(URL, json=fake_log)
    if response.status_code == 200:
        print("✅ Success: Fake Critical Alert sent!")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"Response Detail: {response.json()}")
except Exception as e:
    print(f"❌ Error: {e}")