"""
SOC Dashboard Backend - FastAPI Application
Handles log ingestion, processing, and API endpoints
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn

from models import LogEntry, LogResponse, StatsResponse, AlertResponse, Heartbeat
from database import Database
from log_processor import LogProcessor
from severity_engine import SeverityEngine

# Initialize FastAPI app
app = FastAPI(
    title="SOC Dashboard API",
    description="Security Operations Center Log Management System",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db = Database()
log_processor = LogProcessor()
severity_engine = SeverityEngine()


@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    await db.connect()
    print("✅ Connected to MongoDB")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    await db.disconnect()
    print("❌ Disconnected from MongoDB")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "SOC Dashboard API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/agents/heartbeat")
async def agent_heartbeat(heartbeat: Heartbeat):
    """
    Update agent's last_seen status without needing a full log ingest.
    """
    try:
        await db.update_agent_status(heartbeat.host, heartbeat.os)
        return {"status": "success", "message": f"Heartbeat received for {heartbeat.host}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heartbeat failed: {str(e)}")


@app.post("/api/logs/ingest", response_model=dict)
async def ingest_log(log_entry: LogEntry):
    """
    Receive and process logs from agents
    
    Args:
        log_entry: Log data from Windows/Linux/Firewall agents
    
    Returns:
        Success confirmation with log ID
    """
    try:
        # Normalize log format
        normalized_log = log_processor.normalize(log_entry.dict())
        
        # Assign severity level
        severity = severity_engine.classify(normalized_log)
        normalized_log["severity"] = severity
        
        # Set priority flag for critical threats (Virus, Malware, etc.)
        normalized_log["is_priority"] = (severity == "critical")
        
        # Store in database
        log_id = await db.insert_log(normalized_log)

        # REAL-TIME ALERTING ENGINE
        should_alert = False
        alert_reason = ""
        
        # 1. Immediate Alert for Event 666 (Malicious Activity)
        if normalized_log.get("event_id") in [666, "666"]:
            should_alert = True
            alert_reason = "Confirmed Malicious Activity (Event 666)"
        
        # 2. Brute-Force Detection: > 5 Event 4625 (Failed Login) within 1 minute for same host
        elif normalized_log.get("event_id") in [4625, "4625"]:
            one_min_ago = datetime.utcnow() - timedelta(minutes=1)
            failed_count = await db.logs_collection.count_documents({
                "host": normalized_log["host"],
                "event_id": {"$in": [4625, "4625"]},
                "timestamp": {"$gte": one_min_ago}
            })
            
            if failed_count > 5:
                should_alert = True
                alert_reason = f"Brute Force Detected: {failed_count} failed logins in 1 min"

        if should_alert:
            alert_data = {
                "type": "security_alert",
                "reason": alert_reason,
                "host": normalized_log["host"],
                "event_id": normalized_log.get("event_id"),
                "severity": "critical",
                "is_priority": True,
                "is_read": False,
                "timestamp": datetime.utcnow(),
                "source_ip": normalized_log.get("source_ip"),
                "user": normalized_log.get("user"),
                "os": normalized_log.get("os")
            }
            await db.security_alerts_collection.insert_one(alert_data)
        
        return {
            "status": "success",
            "log_id": str(log_id),
            "severity": severity,
            "is_priority": normalized_log["is_priority"],
            "timestamp": normalized_log["timestamp"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log ingestion failed: {str(e)}")


@app.get("/api/logs", response_model=LogResponse)
async def get_logs(
    os_type: Optional[str] = Query(None, description="Filter by OS: windows, linux"),
    severity: Optional[str] = Query(None, description="Filter by severity: high, medium, low"),
    log_type: Optional[str] = Query(None, description="Filter by log type"),
    host: Optional[str] = Query(None, description="Filter by hostname"),
    event_id: Optional[str] = Query(None, description="Filter by Event ID"),
    hours: int = Query(24, description="Time range in hours"),
    limit: int = Query(100, description="Number of logs to return"),
    skip: int = Query(0, description="Number of logs to skip")
):
    """
    Retrieve logs with filtering options
    
    Args:
        os_type: Operating system filter
        severity: Severity level filter
        log_type: Type of log (auth, system, firewall, etc.)
        host: Hostname filter
        event_id: Event ID filter
        hours: Time range to query
        limit: Maximum number of results
        skip: Pagination offset
    
    Returns:
        Filtered logs with metadata
    """
    try:
        # Build filter query
        filters = {}
        
        if os_type:
            filters["os"] = os_type.lower()
        
        if severity:
            filters["severity"] = severity.lower()
        
        if log_type:
            filters["log_type"] = log_type.lower()
            
        if host:
            filters["host"] = host
            
        if event_id:
            # Handle Event ID as both int and string to be safe
            try:
                eid_int = int(event_id)
                filters["event_id"] = {"$in": [eid_int, str(eid_int)]}
            except ValueError:
                filters["event_id"] = event_id
        
        # Time filter
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        filters["timestamp"] = {"$gte": time_filter}
        
        # Query database
        logs = await db.get_logs(filters, limit, skip)
        total_count = await db.count_logs(filters)
        
        return {
            "logs": logs,
            "total": total_count,
            "returned": len(logs),
            "filters_applied": filters
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log retrieval failed: {str(e)}")


@app.get("/api/system/stats")
async def get_system_stats(host: Optional[str] = None):
    """
    Get lightweight system performance metrics.
    Returns simulated CPU and RAM usage if the agent is online.
    If the agent hasn't sent data in > 60 seconds, returns 0 and offline status.
    """
    import random
    import hashlib
    from datetime import datetime, timedelta

    is_online = True
    if host:
        # Check last log timestamp for this host
        last_log = await db.logs_collection.find_one(
            {"host": host},
            sort=[("timestamp", -1)]
        )
        
        if last_log:
            last_seen = last_log.get("timestamp")
            if isinstance(last_seen, str):
                last_seen = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
            
            # If no data in 30 seconds, consider agent disconnected for stats
            diff = (datetime.utcnow() - last_seen).total_seconds()
            print(f"[DEBUG STATS] Host: {host}, Current: {datetime.utcnow()}, Last Seen: {last_seen}, Diff: {diff}s")
            
            if diff > 30:
                is_online = False
        else:
            is_online = False

    if not is_online:
        return {
            "host": host or "system",
            "cpu": 0,
            "ram": 0,
            "status": "disconnected",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Use host to seed random for consistent-ish values per host
    seed = int(hashlib.md5(host.encode()).hexdigest(), 16) if host else None
    rng = random.Random(seed) if seed else random
    
    # Simulate realistic load ranges
    cpu_usage = round(rng.uniform(5.0, 60.0), 1)
    ram_usage = round(rng.uniform(20.0, 75.0), 1)
    
    return {
        "host": host or "system",
        "cpu": cpu_usage,
        "ram": ram_usage,
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.delete("/api/logs/{log_id}")
async def delete_log(log_id: str):
    """Delete a specific log by ID"""
    success = await db.delete_log(log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"status": "success", "message": "Log deleted"}


@app.get("/api/stats", response_model=StatsResponse)
async def get_statistics(hours: int = Query(24, description="Time range in hours")):
    """
    Get dashboard statistics
    
    Args:
        hours: Time range for statistics
    
    Returns:
        Aggregated statistics for dashboard
    """
    try:
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        
        # Get counts by severity
        total_logs = await db.count_logs({"timestamp": {"$gte": time_filter}})
        high_severity = await db.count_logs({
            "timestamp": {"$gte": time_filter},
            "severity": "high"
        })
        medium_severity = await db.count_logs({
            "timestamp": {"$gte": time_filter},
            "severity": "medium"
        })
        low_severity = await db.count_logs({
            "timestamp": {"$gte": time_filter},
            "severity": "low"
        })
        
        # Get counts by OS
        windows_count = await db.count_logs({
            "timestamp": {"$gte": time_filter},
            "os": "windows"
        })
        linux_count = await db.count_logs({
            "timestamp": {"$gte": time_filter},
            "os": "linux"
        })
        
        # Get top threat actors
        top_actors = await db.get_top_threat_actors(limit=10, time_filter=time_filter)
        
        return {
            "total_logs": total_logs,
            "severity_breakdown": {
                "high": high_severity,
                "medium": medium_severity,
                "low": low_severity
            },
            "os_breakdown": {
                "windows": windows_count,
                "linux": linux_count
            },
            "top_threat_actors": top_actors,
            "time_range_hours": hours
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistics retrieval failed: {str(e)}")


@app.get("/api/alerts", response_model=AlertResponse)
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    hours: int = Query(24, description="Time range in hours"),
    limit: int = Query(50, description="Number of alerts")
):
    """
    Get security alerts (Failed Logins & Admin Privileges)
    
    Args:
        severity: Severity filter
        hours: Time range
        limit: Maximum alerts
    
    Returns:
        Security alerts for specific critical event IDs
    """
    try:
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        
        # Strictly filter by Failed Login (4625) or Admin Privileges (4672)
        # OR any log that has been classified as "critical" or "priority"
        filters = {
            "timestamp": {"$gte": time_filter},
            "$or": [
                {"event_id": {"$in": [4625, 4672, "4625", "4672"]}},
                {"severity": "critical"},
                {"is_priority": True}
            ]
        }
        
        if severity:
            filters["severity"] = severity
        
        alerts = await db.get_logs(filters, limit, 0)
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "severity": severity if severity else "all"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert retrieval failed: {str(e)}")


@app.delete("/api/alerts/{alert_id}")
async def dismiss_alert(alert_id: str):
    """
    Dismiss a specific alert by ID
    
    Args:
        alert_id: The ID of the alert to remove
    """
    try:
        from bson.objectid import ObjectId
        result = await db.logs_collection.delete_one({"_id": ObjectId(alert_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
            
        return {"status": "success", "message": "Alert dismissed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dismiss alert: {str(e)}")


@app.get("/api/alerts/unread-count")
async def get_unread_alert_count():
    """Get the count of unread high-priority security alerts"""
    try:
        count = await db.get_unread_alert_count()
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unread count: {str(e)}")


@app.get("/api/logs/timeline")
async def get_timeline(hours: int = Query(24, description="Time range in hours")):
    """Get log timeline data grouped by hour"""
    try:
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        timeline = await db.get_timeline_data(time_filter)
        return {"timeline": timeline, "hours": hours}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline failed: {str(e)}")


@app.get("/api/health/network")
async def get_network_health():
    """Check global network health and system stats"""
    try:
        health = await db.get_network_health()
        stats = await db.get_system_stats()
        return {**health, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
@app.delete("/api/logs/clear")
async def clear_old_logs(days: int = Query(30, description="Delete logs older than X days")):
    """
    Clear old logs from database
    
    Args:
        days: Age threshold for deletion (0 for ALL logs)
    
    Returns:
        Number of deleted logs
    """
    try:
        if days == 0:
            deleted_count = await db.clear_all_logs()
        else:
            time_threshold = datetime.utcnow() - timedelta(days=days)
            deleted_count = await db.delete_old_logs(time_threshold)
        
        return {
            "status": "success",
            "message": "All logs deleted",
            "deleted_count": deleted_count,
            "threshold_days": days
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log deletion failed: {str(e)}")


@app.get("/api/agents")
async def get_agents():
    """Retrieve all tracked agents and their status (derived from logs)"""
    try:
        agents = await db.get_realtime_agents()
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve agents: {str(e)}")


@app.get("/api/nodes/stats")
async def get_node_stats():
    """Retrieve real-time stats for nodes seen ever (debug mode with fallbacks)"""
    try:
        nodes = await db.get_nodes()
        
        # Fallback: If aggregation failed to find nodes but logs exist, try a raw search
        if not nodes:
            # Check if ANY logs exist
            total_logs = await db.logs_collection.count_documents({})
            if total_logs > 0:
                print(f"DEBUG: Found {total_logs} logs but 0 nodes. Trying fallback...")
                # Get last 5 logs and extract host
                last_logs = await db.logs_collection.find({}).sort("timestamp", -1).limit(5).to_list(length=5)
                fallback_hosts = set()
                for log in last_logs:
                    h = log.get("host") or log.get("computer") or "UNKNOWN-HOST"
                    fallback_hosts.add(h)
                
                if fallback_hosts:
                    nodes = [{"hostname": h, "status": "online", "online_agents": 1, "alert_count": 0, "os": "windows"} for h in fallback_hosts]
                    print(f"DEBUG FALLBACK HOSTS: {fallback_hosts}")

        host_names = [n["hostname"] for n in nodes]
        online_count = len([n for n in nodes if n.get("status") == "online"])
        print(f"DEBUG HOSTS FOUND: {host_names} (Online: {online_count})")
        
        total_count = len(nodes)
        response_data = {
            "total": total_count,
            "online": online_count,
            "online_agents": online_count,
            "hosts": nodes
        }
        print(f"[DEBUG RESPONSE] /api/nodes/stats: {response_data}")
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve node stats: {str(e)}")


@app.get("/api/health/network")
async def get_network_health():
    """Check global network health status"""
    try:
        health = await db.get_network_health()
        return health
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check network health: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
