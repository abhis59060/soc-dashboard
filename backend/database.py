"""
Database Module - MongoDB Operations
Handles all database interactions for log storage and retrieval
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from typing import Dict, List, Any, Optional
from datetime import datetime
import os


class Database:
    """MongoDB database handler for SOC logs"""
    
    def __init__(self):
        """Initialize database connection parameters"""
        self.mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        self.db_name = os.getenv("DB_NAME", "soc_dashboard")
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.logs_collection = None
        self.agents_collection = None
        self.alerts_collection = None
        self.security_alerts_collection = None
        self.stats_collection = None
        self.rules_collection = None
    
    async def connect(self):
        """Establish connection to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(self.mongo_url)
            
            # Verify connection
            await self.client.admin.command('ping')
            
            self.db = self.client[self.db_name]
            self.logs_collection = self.db.logs
            self.agents_collection = self.db.agents
            self.alerts_collection = self.db.alerts
            self.security_alerts_collection = self.db.security_alerts
            self.stats_collection = self.db.statistics
            self.rules_collection = self.db.alert_rules
            
            # Create indexes for performance
            await self._create_indexes()
            
            print(f"✅ Connected to MongoDB: {self.db_name}")
        
        except ConnectionFailure as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✅ MongoDB connection closed")
    
    async def _create_indexes(self):
        """Create database indexes for query optimization"""
        # Index on timestamp for time-range queries
        await self.logs_collection.create_index([("timestamp", -1)])
        
        # Index on severity for alert queries
        await self.logs_collection.create_index([("severity", 1)])
        
        # Compound index for common queries
        await self.logs_collection.create_index([
            ("os", 1),
            ("severity", 1),
            ("timestamp", -1)
        ])
        
        # Index on source IP for IP-based queries
        await self.logs_collection.create_index([("source_ip", 1)])
        
        # Index on host for host-based queries
        await self.logs_collection.create_index([("host", 1)])

        # Agent index
        await self.agents_collection.create_index([("hostname", 1)], unique=True)
        
        print("✅ Database indexes created")
    
    async def insert_log(self, log_data: Dict[str, Any]) -> str:
        """
        Insert a single log entry and update agent status
        """
        result = await self.logs_collection.insert_one(log_data)
        
        # Update agent last seen and alert count
        is_alert = log_data.get("severity") in ["high", "critical"]
        await self.update_agent_status(
            log_data["host"], 
            log_data.get("os", "unknown"),
            is_alert
        )
        
        return str(result.inserted_id)

    async def update_agent_status(self, hostname: str, os_type: str, is_alert: bool = False):
        """Update agent's last seen and alert count"""
        update_query = {
            "$set": {
                "hostname": hostname,
                "os": os_type,
                "last_seen": datetime.utcnow()
            }
        }
        
        if is_alert:
            update_query["$inc"] = {"alert_count": 1}
        else:
            # Ensure alert_count exists for new agents
            update_query["$setOnInsert"] = {"alert_count": 0}
            
        await self.agents_collection.update_one(
            {"hostname": hostname},
            update_query,
            upsert=True
        )
    
    async def insert_many_logs(self, logs: List[Dict[str, Any]]) -> List[str]:
        """
        Insert multiple log entries
        
        Args:
            logs: List of normalized log dictionaries
        
        Returns:
            List of inserted document IDs
        """
        result = await self.logs_collection.insert_many(logs)
        return [str(id) for id in result.inserted_ids]
    
    async def get_logs(
        self,
        filters: Dict[str, Any],
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve logs with filters and pagination
        
        Args:
            filters: MongoDB query filters
            limit: Maximum number of results
            skip: Number of results to skip
        
        Returns:
            List of log documents
        """
        cursor = self.logs_collection.find(filters).sort(
            "timestamp", -1
        ).skip(skip).limit(limit)
        
        logs = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for log in logs:
            log["_id"] = str(log["_id"])
        
        return logs
    
    async def count_logs(self, filters: Dict[str, Any]) -> int:
        """
        Count logs matching filters
        
        Args:
            filters: MongoDB query filters
        
        Returns:
            Count of matching documents
        """
        count = await self.logs_collection.count_documents(filters)
        return count
    
    async def get_log_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single log by ID
        
        Args:
            log_id: Document ID
        
        Returns:
            Log document or None
        """
        from bson.objectid import ObjectId
        
        log = await self.logs_collection.find_one({"_id": ObjectId(log_id)})
        
        if log:
            log["_id"] = str(log["_id"])
        
        return log
    
    async def get_top_threat_actors(
        self,
        limit: int = 10,
        time_filter: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get top threat actors by frequency (grouped by host).
        ONLY counts logs with 'high' or 'critical' severity.
        Prioritizes hosts with Malicious activity (Event 666).
        """
        pipeline = []
        
        # Base match criteria: Host must exist and severity must be high/critical
        match_criteria = {
            "host": {"$ne": None},
            "severity": {"$in": ["high", "critical"]}
        }
        
        # Add time filter if provided
        if time_filter:
            match_criteria["timestamp"] = {"$gte": time_filter}
        
        pipeline.append({"$match": match_criteria})
        
        # Group by host and count, also check for Malicious keywords or Event 666
        pipeline.extend([
            {
                "$group": {
                    "_id": "$host",
                    "count": {"$sum": 1},
                    "os": {"$first": "$os"},
                    "has_malicious": {
                        "$max": {
                            "$cond": [
                                {"$or": [
                                    {"$eq": ["$event_id", 666]},
                                    {"$eq": ["$event_id", "666"]},
                                    {"$regexMatch": {"input": {"$ifNull": ["$raw_log", ""]}, "regex": "malicious|666", "options": "i"}},
                                    {"$regexMatch": {"input": {"$ifNull": ["$event", ""]}, "regex": "malicious|666", "options": "i"}}
                                ]},
                                1, 0
                            ]
                        }
                    }
                }
            },
            # Sort by malicious first, then by count
            {"$sort": {"has_malicious": -1, "count": -1}},
            {"$limit": limit},
            {
                "$project": {
                    "_id": 0,
                    "host": "$_id",
                    "count": "$count",
                    "os": 1,
                    "is_malicious": {"$cond": [{"$eq": ["$has_malicious", 1]}, True, False]}
                }
            }
        ])
        
        result = await self.logs_collection.aggregate(pipeline).to_list(length=limit)
        return result
    
    async def get_timeline_data(
        self,
        time_filter: datetime,
        interval_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Get log counts grouped by time intervals
        
        Args:
            time_filter: Start time for timeline
            interval_minutes: Time bucket size in minutes
        
        Returns:
            List of {time, count, high, medium, low} dictionaries
        """
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": time_filter}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateTrunc": {
                            "date": "$timestamp",
                            "unit": "hour"  # Group by hour
                        }
                    },
                    "total": {"$sum": 1},
                    "high": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "high"]}, 1, 0]}
                    },
                    "medium": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "medium"]}, 1, 0]}
                    },
                    "low": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "low"]}, 1, 0]}
                    }
                }
            },
            {"$sort": {"_id": 1}},
            {
                "$project": {
                    "_id": 0,
                    "time": "$_id",
                    "total": 1,
                    "high": 1,
                    "medium": 1,
                    "low": 1
                }
            }
        ]
        
        result = await self.logs_collection.aggregate(pipeline).to_list(length=1000)
        return result
    
    async def delete_old_logs(self, time_threshold: datetime) -> int:
        """
        Delete logs older than threshold
        
        Args:
            time_threshold: Delete logs before this time
        
        Returns:
            Number of deleted documents
        """
        result = await self.logs_collection.delete_many({
            "timestamp": {"$lt": time_threshold}
        })
        
        return result.deleted_count

    async def get_nodes(self) -> List[Dict[str, Any]]:
        """
        Get unique hosts and determine their status using agents_collection.
        This ensures heartbeats (which update agents_collection) are reflected
        immediately even if no new logs are sent.
        """
        cursor = self.agents_collection.find({
            "hostname": {
                "$nin": [None, "SYSTEM-ANALYST", "SYSTEM", "ANALYST"],
                "$not": {"$regex": "SYSTEM|ANALYST", "$options": "i"}
            }
        })
        agents = await cursor.to_list(length=100)
        
        now = datetime.utcnow()
        for agent in agents:
            agent["_id"] = str(agent["_id"])
            last_seen = agent.get("last_seen")
            
            if last_seen:
                if isinstance(last_seen, str):
                    try:
                        last_seen = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                    except ValueError:
                        last_seen = None
                
                if last_seen and last_seen.tzinfo:
                    last_seen = last_seen.replace(tzinfo=None)

                if last_seen:
                    diff = (now - last_seen).total_seconds()
                    # A host is online if seen in the last 15 seconds (account for 5s poll + latency)
                    if diff < 15:
                        agent["status"] = "online"
                        agent["online_agents"] = 1
                    else:
                        agent["status"] = "offline"
                        agent["online_agents"] = 0
                else:
                    agent["status"] = "offline"
                    agent["online_agents"] = 0
            else:
                agent["status"] = "offline"
                agent["online_agents"] = 0
            
            # Ensure alert_count exists
            if "alert_count" not in agent:
                agent["alert_count"] = 0
                
        return agents

    async def get_realtime_agents(self) -> List[Dict[str, Any]]:
        """
        Derive unique hosts and their status directly from logs collection.
        Uses the consolidated get_nodes logic.
        """
        return await self.get_nodes()

    async def get_agents(self) -> List[Dict[str, Any]]:
        """Retrieve all agents and their status calculated on the fly"""
        cursor = self.agents_collection.find({})
        agents = await cursor.to_list(length=100)
        
        now = datetime.utcnow()
        for agent in agents:
            agent["_id"] = str(agent["_id"])
            last_seen = agent.get("last_seen")
            
            # Recalculate status on the fly for consistency
            if last_seen:
                if isinstance(last_seen, str):
                    try:
                        last_seen = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                    except ValueError:
                        last_seen = None
                
                # Ensure offset-naive UTC
                if last_seen and last_seen.tzinfo:
                    last_seen = last_seen.replace(tzinfo=None)

                if last_seen:
                    diff = (now - last_seen).total_seconds()
                    # DEBUG PRINT for deep diagnosis
                    print(f"[DEBUG AGENT] Host: {agent.get('hostname')}, Current: {now}, Last Seen: {last_seen}, Diff: {diff}s")
                    
                    if diff < 30:
                        agent["status"] = "online"
                        agent["online_agents"] = 1
                    else:
                        agent["status"] = "offline"
                        agent["online_agents"] = 0
                else:
                    agent["status"] = "offline"
                    agent["online_agents"] = 0
            else:
                agent["status"] = "offline"
                agent["online_agents"] = 0
                
        return agents

    async def delete_offline_agents(self) -> int:
        """
        Delete agents that are currently offline or haven't sent heartbeats recently.
        Uses a 30-second threshold consistent with the status display logic.
        """
        threshold = datetime.utcnow() - timedelta(seconds=30)
        result = await self.agents_collection.delete_many({
            "$or": [
                {"last_seen": {"$lt": threshold}},
                {"last_seen": None},
                {"status": "offline"}
            ]
        })
        return result.deleted_count

    async def reset_agents(self):
        """Reset agent alert counts and status (keep the hostnames)"""
        await self.agents_collection.update_many(
            {},
            {
                "$set": {
                    "alert_count": 0,
                    "last_seen": None,
                    "status": "offline",
                    "online_agents": 0
                }
            }
        )

    async def clear_all_logs(self) -> int:
        """
        Delete ALL logs, alerts, and stats from the database and reset agents
        """
        # Delete from all relevant collections
        log_result = await self.logs_collection.delete_many({})
        await self.alerts_collection.delete_many({})
        await self.security_alerts_collection.delete_many({})
        await self.stats_collection.delete_many({})
        
        # Reset agents
        await self.reset_agents()
        
        return log_result.deleted_count
    
    async def get_timeline_data(self, time_filter: datetime) -> List[Dict[str, Any]]:
        """Get log counts grouped by hour for the last 24 hours"""
        pipeline = [
            {"$match": {"timestamp": {"$gte": time_filter}}},
            {
                "$project": {
                    "hour": {"$hour": "$timestamp"},
                    "severity": 1
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1},
                    "high": {"$sum": {"$cond": [{"$eq": ["$severity", "high"]}, 1, 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        cursor = self.logs_collection.aggregate(pipeline)
        results = await cursor.to_list(length=24)
        
        # Format for frontend (ensure all hours are present)
        timeline = []
        hour_map = {r["_id"]: r for r in results}
        
        current_hour = datetime.utcnow().hour
        for i in range(24):
            h = (current_hour - 23 + i) % 24
            data = hour_map.get(h, {"count": 0, "high": 0})
            timeline.append({
                "time": f"{h:02d}:00",
                "total": data["count"],
                "high": data["high"]
            })
            
        return timeline

    async def get_system_stats(self) -> Dict[str, Any]:
        """Get simulated/real system stats for CPU, Memory and active nodes"""
        # In a real environment, we'd use psutil or similar
        # For this SOC demo, we'll return healthy simulated values + real node count
        nodes = await self.get_nodes()
        online_nodes = len([n for n in nodes if n.get("status") == "online"])
        
        return {
            "cpu": 12.5 + (online_nodes * 2),
            "memory": 45.2,
            "active_nodes": online_nodes,
            "total_nodes": len(nodes),
            "online_agents": online_nodes
        }

    async def get_network_health(self) -> Dict[str, Any]:
        """Check if multiple hosts have critical alerts or if high alerts exist"""
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        
        # Check for any high/critical alerts in last 5 mins
        high_alert_count = await self.logs_collection.count_documents({
            "timestamp": {"$gte": five_min_ago},
            "severity": {"$in": ["high", "critical"]}
        })
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": five_min_ago}, "severity": "critical"}},
            {"$group": {"_id": "$host"}},
            {"$count": "host_count"}
        ]
        
        cursor = self.logs_collection.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        host_count = result[0]["host_count"] if result else 0
        
        return {
            "critical_hosts_count": host_count,
            "high_alerts_5m": high_alert_count,
            "global_alert": host_count > 2,
            "status": "danger" if host_count > 2 else "warning" if high_alert_count > 0 else "secure",
            "timestamp": datetime.utcnow()
        }

    async def delete_log(self, log_id: str) -> bool:
        """
        Delete a single log entry by ID
        
        Args:
            log_id: The ID of the log to delete
            
        Returns:
            True if deleted, False otherwise
        """
        from bson.objectid import ObjectId
        try:
            result = await self.logs_collection.delete_one({"_id": ObjectId(log_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def get_unread_alert_count(self) -> int:
        """Count unread high-priority alerts in security_alerts collection"""
        return await self.security_alerts_collection.count_documents({"is_read": False})

    async def get_failed_login_count(
        self,
        source_ip: str,
        time_window_minutes: int = 5
    ) -> int:
        """
        Count failed login attempts from an IP in time window
        Used for brute-force detection
        
        Args:
            source_ip: Source IP address
            time_window_minutes: Time window in minutes
        
        Returns:
            Count of failed login attempts
        """
        from datetime import timedelta
        
        time_threshold = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        
        count = await self.logs_collection.count_documents({
            "source_ip": source_ip,
            "event": {"$regex": "Failed|failed|FAILED"},
            "timestamp": {"$gte": time_threshold}
        })
        
        return count
    
    async def get_logs_by_host(
        self,
        hostname: str,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get all logs from a specific host
        
        Args:
            hostname: Host to query
            hours: Time range
        
        Returns:
            List of log documents
        """
        from datetime import timedelta
        
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        
        return await self.get_logs(
            filters={"host": hostname, "timestamp": {"$gte": time_filter}},
            limit=1000
        )

    async def get_alert_rules(self) -> List[Dict[str, Any]]:
        """Retrieve all custom alert rules"""
        cursor = self.rules_collection.find({})
        rules = await cursor.to_list(length=100)
        for rule in rules:
            rule["_id"] = str(rule["_id"])
        return rules

    async def add_alert_rule(self, rule_data: Dict[str, Any]):
        """Add or update an alert rule"""
        await self.rules_collection.update_one(
            {"event_id": str(rule_data["event_id"])},
            {"$set": {
                "description": rule_data.get("description"),
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )

    async def delete_alert_rule(self, event_id: str) -> bool:
        """
        Delete an alert rule by event_id (tries both string and int formats)
        
        Returns:
            True if a document was deleted, False otherwise
        """
        try:
            # Try matching both string and integer versions to be robust
            eid_str = str(event_id)
            eid_int = None
            try:
                eid_int = int(event_id)
            except ValueError:
                pass

            query = {"event_id": {"$in": [eid_str, eid_int]}} if eid_int is not None else {"event_id": eid_str}
            result = await self.rules_collection.delete_one(query)
            return result.deleted_count > 0
        except Exception:
            return False
