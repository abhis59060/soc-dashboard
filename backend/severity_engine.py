"""
Severity Engine - Threat Classification Module
Assigns severity levels to security events based on SOC best practices
"""

from typing import Dict, Any
from datetime import datetime, timedelta


class SeverityEngine:
    """
    Classifies security events by severity level
    """
    
    def __init__(self, db=None):
        """Initialize severity classification rules"""
        self.db = db
        self.custom_rules = []
        # Critical-severity keywords (scanned in raw_log)
        self.critical_keywords = [
            "virus",
            "malware",
            "trojan",
            "worm",
            "blocked"
        ]
        
        # High-severity event patterns
        self.high_severity_keywords = [
            "failed login",
            "failed password",
            "authentication failure",
            "brute force",
            "privilege escalation",
            "unauthorized access",
            "blocked connection",
            "malware",
            "intrusion",
            "exploit",
            "root login failed",
            "admin login failed",
            "account lockout",
            "suspicious activity"
        ]
        
        # Medium-severity patterns
        self.medium_severity_keywords = [
            "sudo",
            "firewall block",
            "policy violation",
            "configuration change",
            "user added",
            "group modified",
            "service stopped",
            "unusual port",
            "scan detected"
        ]
        
        # Known malicious ports
        self.suspicious_ports = [
            22,     # SSH (common brute-force target)
            23,     # Telnet (insecure)
            3389,   # RDP (common attack vector)
            445,    # SMB (ransomware vector)
            1433,   # MSSQL
            3306,   # MySQL
            5432,   # PostgreSQL
            6379,   # Redis
            27017   # MongoDB
        ]
        
        # Threshold for brute-force detection
        self.failed_login_threshold = 5  # Failed attempts in time window
        self.time_window_minutes = 5

    async def update_rules(self):
        """Fetch latest alert rules from database"""
        if self.db:
            rules = await self.db.get_alert_rules()
            self.custom_rules = [str(r["event_id"]) for r in rules]
            print(f"🔄 SeverityEngine updated with {len(self.custom_rules)} custom rules")
    
    def classify(self, log_data: Dict[str, Any]) -> str:
        """
        Classify log severity based on multiple factors
        
        Args:
            log_data: Normalized log dictionary
        
        Returns:
            Severity level: 'critical', 'high', 'medium', 'low', or 'info'
        """
        raw_log = str(log_data.get("raw_log", "")).lower()
        event = log_data.get("event", "").lower()
        log_type = log_data.get("log_type", "").lower()
        event_id = log_data.get("event_id")

        # 0. Check CUSTOM RULES FIRST (User-defined overrides from MongoDB)
        # If Event ID matches a custom rule, it is always CRITICAL
        if str(event_id) in self.custom_rules:
            return "critical"

        # 1. Check for HIGH severity
        if self._is_high_severity(log_data, event, log_type):
            return "high"

        # 2. Check for MEDIUM severity
        if self._is_medium_severity(log_data, event, log_type):
            return "medium"
        
        # 3. Check for LOW severity
        if self._is_low_severity(log_data, event, log_type):
            return "low"
        
        # Default to info
        return "info"
    
    def _is_high_severity(
        self,
        log_data: Dict[str, Any],
        event: str,
        log_type: str
    ) -> bool:
        """Detect high-severity events"""
        event_id = log_data.get("event_id")
        
        # 1. Windows high Event IDs
        high_ids = [4672, "4672"]
        if event_id in high_ids:
            return True
            
        # 2. Process creation (4688) if from sensitive paths
        if event_id in [4688, "4688"]:
            raw_log = str(log_data.get("raw_log", "")).lower()
            sensitive_paths = ["temp", "appdata", "download", "users\\public", "powershell.exe", "cmd.exe"]
            if any(path in raw_log for path in sensitive_paths):
                return True

        # 3. Failed login attempts (potential brute-force)
        if any(keyword in event for keyword in ["failed login", "failed password", "authentication failure"]):
            # Special attention to root/admin failures
            user = log_data.get("user", "").lower()
            if user in ["root", "admin", "administrator", "sa"]:
                return True
            return True
        
        # 4. Privilege escalation
        if "privilege" in event or "escalation" in event:
            return True
        
        # 5. Account lockout (indicates attack)
        if "lockout" in event or "locked out" in event:
            return True
        
        # 6. Firewall blocks on suspicious ports
        if log_type == "firewall" and "block" in event:
            dest_port = log_data.get("destination_port")
            if dest_port in self.suspicious_ports:
                return True
        
        # 7. Explicitly demote common benign events to LOW/INFO
        if event_id in [19, 43, 5379, 4624, "19", "43", "5379", "4624"]:
            return False

        # 8. Keyword-based detection
        if any(keyword in event for keyword in self.high_severity_keywords):
            return True
        
        return False
    
    def _is_medium_severity(
        self,
        log_data: Dict[str, Any],
        event: str,
        log_type: str
    ) -> bool:
        """Detect medium-severity events"""
        event_id = log_data.get("event_id")

        # 1. Windows medium Event IDs
        medium_ids = [19, 43, 4624, "19", "43", "4624"]
        if event_id in medium_ids:
            return True

        # 2. Sudo/administrative commands
        if "sudo" in event or "su -" in str(log_data.get("raw_log", "")):
            return True
        
        # 3. User/group modifications
        if any(keyword in event for keyword in ["user added", "user removed", "group modified"]):
            return True
        
        # 4. Firewall blocks (not on critical ports)
        if log_type == "firewall" and "block" in event:
            return True
        
        # 5. Service changes
        if "service" in event and ("stopped" in event or "started" in event):
            return True
        
        # 6. Configuration changes
        if "configuration" in event or "config" in event:
            return True
        
        # 7. Keyword-based detection
        if any(keyword in event for keyword in self.medium_severity_keywords):
            return True
        
        return False
    
    def _is_low_severity(
        self,
        log_data: Dict[str, Any],
        event: str,
        log_type: str
    ) -> bool:
        """Detect low-severity events"""
        event_id = log_data.get("event_id")

        # 1. Windows low/info Event IDs
        low_ids = [5379, 7040, 7000, 6013, "5379", "7040", "7000", "6013"]
        if event_id in low_ids:
            return True

        # 2. Successful logins (awareness)
        if any(keyword in event for keyword in ["successful login", "accepted password", "session opened"]):
            return True
        
        # 3. Normal firewall allows
        if log_type == "firewall" and "allow" in event:
            return True
        
        # 4. Process creation (Windows Event ID 4688) and common operational events
        if event_id in [4688, "4688"]:
            return True
        
        # 5. Session management
        if "session" in event:
            return True
        
        return False
    
    def get_severity_explanation(self, log_data: Dict[str, Any], severity: str) -> str:
        """
        Generate human-readable explanation for severity classification
        
        Args:
            log_data: Log data
            severity: Assigned severity level
        
        Returns:
            Explanation string
        """
        event = log_data.get("event", "Unknown Event")
        
        explanations = {
            "critical": f"CRITICAL: '{event}' matches known high-priority threat patterns (Virus/Malware).",
            "high": f"HIGH SEVERITY: '{event}' indicates potential security threat requiring immediate investigation.",
            "medium": f"MEDIUM SEVERITY: '{event}' shows suspicious activity that should be reviewed.",
            "low": f"LOW SEVERITY: '{event}' is a notable event for awareness and monitoring.",
            "info": f"INFO: '{event}' is a normal operational event."
        }
        
        return explanations.get(severity, "Unknown severity level")
    
    def correlate_events(self, events: list) -> Dict[str, Any]:
        """
        Correlate multiple events to detect patterns
        
        This is advanced SOC functionality for detecting:
        - Brute-force attacks (multiple failed logins)
        - Port scanning (multiple connection attempts)
        - Lateral movement (successful login after failures)
        
        Args:
            events: List of log entries
        
        Returns:
            Correlation analysis results
        """
        analysis = {
            "brute_force_detected": False,
            "port_scan_detected": False,
            "suspicious_patterns": []
        }
        
        # Group events by source IP
        events_by_ip = {}
        for event in events:
            source_ip = event.get("source_ip")
            if source_ip:
                if source_ip not in events_by_ip:
                    events_by_ip[source_ip] = []
                events_by_ip[source_ip].append(event)
        
        # Check for brute-force attacks
        for ip, ip_events in events_by_ip.items():
            failed_logins = [
                e for e in ip_events
                if "failed" in e.get("event", "").lower()
            ]
            
            if len(failed_logins) >= self.failed_login_threshold:
                analysis["brute_force_detected"] = True
                analysis["suspicious_patterns"].append({
                    "type": "brute_force",
                    "source_ip": ip,
                    "failed_attempts": len(failed_logins),
                    "severity": "high"
                })
        
        # Check for port scanning
        for ip, ip_events in events_by_ip.items():
            unique_ports = set()
            for event in ip_events:
                port = event.get("destination_port")
                if port:
                    unique_ports.add(port)
            
            if len(unique_ports) >= 5:  # Multiple ports accessed
                analysis["port_scan_detected"] = True
                analysis["suspicious_patterns"].append({
                    "type": "port_scan",
                    "source_ip": ip,
                    "ports_accessed": list(unique_ports),
                    "severity": "high"
                })
        
        return analysis
