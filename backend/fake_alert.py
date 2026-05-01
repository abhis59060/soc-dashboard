import requests
from datetime import datetime

URL = "http://localhost:8000/api/logs/ingest"

# Test 1: High Severity but NOT configured ID
unconfigured_log = {
    "host": "DESKTOP-VQBBBQR",
    "event_id": 1102, # Yeh ID configured nahi honi chahiye
    "severity": "high",
    "message": "Audit log was cleared - Testing Filter",
    "os": "windows",
    "log_type": "security",
    "event": "Audit Log Clear",
    "timestamp": datetime.utcnow().isoformat() + "Z"
}

requests.post(URL, json=unconfigured_log)
print("✅ Sent unconfigured log. Check Dashboard: Bell icon should NOT show this.")