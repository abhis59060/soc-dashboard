# SOC-Dashboard Project Details

## 🏗️ Scan Architecture
The SOC-Dashboard is a full-stack security monitoring solution designed to collect, process, and visualize Windows Event Logs in real-time.

- **Data Source (Agents):** Lightweight Python agents (`windows_agent.py`) run on Windows hosts. They utilize the `pywin32` library to monitor the **Security**, **System**, and **Application** event logs.
- **Ingestion & Processing (Backend):** A **FastAPI** server receives log data. 
    - `LogProcessor`: Normalizes diverse log formats into a unified schema.
    - `SeverityEngine`: Analyzes logs using keyword matching and Event ID lookups (e.g., 4625 for Failed Login) to assign severity levels (Info to Critical).
    - `Database`: **MongoDB** (via Motor) stores normalized logs and maintains real-time agent status.
- **Visualization (Frontend):** A **React** dashboard (built with Vite) provides a centralized view of the network's security posture. It polls the backend for updates and uses **WebSockets-like behavior via polling** to keep charts and alerts current.

---

## 📚 Library Analysis

### Backend (Python/FastAPI)
- **FastAPI:** High-performance web framework for building APIs. Used for its speed and native support for asynchronous operations.
- **Motor (PyMongo):** Asynchronous MongoDB driver, ensuring database operations don't block the API during high-volume log ingestion.
- **Pydantic:** Data validation and settings management using Python type annotations.
- **PyWin32 (Agent-side):** Provides access to Windows APIs, specifically for reading the Event Log service.

### Frontend (React/Vite)
- **React:** UI library for building the component-based dashboard.
- **Tailwind CSS:** Utility-first CSS framework for rapid, responsive styling with a dark-themed "SOC" aesthetic.
- **Framer-motion:** Used for smooth UI transitions and "Global Alert" animations.
- **Recharts:** Responsive charting library for visualizing log timelines and severity distributions.
- **Lucide-react:** Clean, consistent iconography.
- **React-hot-toast:** Handles real-time "Toast" notifications for critical security events.

---

## 🚀 Feature Documentation

### 1. Real-time Log Streaming
- **Mechanism:** The Windows agent polls local logs every **5 seconds** (configurable in `config.json`).
- **Dashboard Sync:** The frontend refreshes its data every **5 seconds**, providing a near real-time feed of activity across all monitored hosts.

### 2. Smart Filtering & Search
- **Severity Filtering:** Easily isolate `Critical` and `High` threats.
- **Host Discovery:** Filter logs by specific hostname or IP.
- **Global Search:** Full-text search across raw log messages to find specific indicators of compromise (IoC).

### 3. Automated Alerting
- **Failed Logins (Event 4625):** Automatically flagged as High severity. If more than 5 occur within a minute, it triggers a **Brute Force Detection** alert.
- **Privileged Access (Event 4672):** Detects when "Special Privileges" are assigned to a new logon (e.g., Admin access).
- **Malicious Activity (Event 666):** A custom trigger for immediate critical response.

### 4. Hardware Health Monitoring
- **Status Tracking:** Agents send periodic "heartbeats". If an agent stops sending data for >30 seconds, the dashboard marks the host as `Disconnected`.
- **Resource Simulation:** Provides simulated CPU and RAM usage metrics for online agents to visualize system load.

---

## 🔄 Workflow: From 'Failed Login' to 'Red Toast'

1.  **The Incident:** An unauthorized user attempts to log into a laptop with the wrong password. Windows generates **Event ID 4625** in the Security Log.
2.  **Collection:** The `windows_agent.py` service detects this new entry during its next 5s poll.
3.  **Transmission:** The agent sends a JSON payload containing the event details to the `/api/logs/ingest` endpoint.
4.  **Enrichment:**
    - The `LogProcessor` cleans the IP address and extracts the username.
    - The `SeverityEngine` identifies ID 4625 and classifies it as **HIGH**.
5.  **Persistence:** The backend saves the log to MongoDB and creates a record in the `security_alerts` collection.
6.  **Notification:**
    - The Dashboard's `AlertContext` (polling every 3s) detects the new unread alert.
    - A **Red Toast** notification appears in the top-right corner of the screen, playing an alert sound and allowing the analyst to click through to the investigation view.
