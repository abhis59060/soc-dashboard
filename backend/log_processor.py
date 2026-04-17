"""
Log Processor - Log Normalization Module
Converts different log formats into unified structure
"""

from typing import Dict, Any
from datetime import datetime
import re


class LogProcessor:
    """
    Normalizes logs from different sources into a common format
    
    This is critical for SOC operations - all logs must have the same structure
    regardless of source (Windows, Linux, Firewall)
    """
    
    def __init__(self):
        """Initialize log processor with regex patterns"""
        # Common patterns for log parsing
        self.ip_pattern = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
        self.port_pattern = re.compile(r':(\d+)')
        self.user_pattern = re.compile(r'user[:\s=]+([^\s]+)', re.IGNORECASE)
    
    def normalize(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize log entry to standard format
        
        Args:
            log_data: Raw log data from agent
        
        Returns:
            Normalized log dictionary
        """
        # Start with base structure
        normalized = {
            "host": log_data.get("host", "unknown"),
            "os": self._normalize_os(log_data.get("os", "unknown")),
            "log_type": self._normalize_log_type(log_data.get("log_type", "unknown")),
            "event": log_data.get("event", "Unknown Event"),
            "timestamp": self._normalize_timestamp(log_data.get("timestamp")),
            "processed_at": datetime.utcnow()
        }
        
        # Add optional fields if present
        if "source_ip" in log_data and log_data["source_ip"]:
            normalized["source_ip"] = self._clean_ip(log_data["source_ip"])
        
        if "destination_ip" in log_data and log_data["destination_ip"]:
            normalized["destination_ip"] = self._clean_ip(log_data["destination_ip"])
        
        if "destination_port" in log_data and log_data["destination_port"]:
            normalized["destination_port"] = int(log_data["destination_port"])
        
        if "user" in log_data and log_data["user"]:
            normalized["user"] = log_data["user"].lower().strip()
        
        if "process" in log_data and log_data["process"]:
            normalized["process"] = log_data["process"]
        
        if "event_id" in log_data and log_data["event_id"]:
            normalized["event_id"] = int(log_data["event_id"])
        
        if "action" in log_data and log_data["action"]:
            normalized["action"] = log_data["action"].upper()
        
        if "raw_log" in log_data and log_data["raw_log"]:
            normalized["raw_log"] = log_data["raw_log"]
        
        # Extract additional info from raw log if available
        if "raw_log" in log_data:
            self._enrich_from_raw(normalized, log_data["raw_log"])
        
        return normalized
    
    def _normalize_os(self, os_value: str) -> str:
        """Normalize OS type to standard values"""
        os_lower = str(os_value).lower()
        
        if "win" in os_lower:
            return "windows"
        elif "linux" in os_lower or "ubuntu" in os_lower or "debian" in os_lower:
            return "linux"
        elif "firewall" in os_lower or "ufw" in os_lower or "iptables" in os_lower:
            return "firewall"
        else:
            return "unknown"
    
    def _normalize_log_type(self, log_type: str) -> str:
        """Normalize log type to standard categories"""
        log_lower = str(log_type).lower()
        
        type_mapping = {
            "auth": ["auth", "authentication", "login"],
            "security": ["security", "sec"],
            "system": ["system", "sys"],
            "application": ["application", "app"],
            "firewall": ["firewall", "ufw", "iptables"],
            "audit": ["audit"]
        }
        
        for standard_type, variations in type_mapping.items():
            if any(var in log_lower for var in variations):
                return standard_type
        
        return "unknown"
    
    def _normalize_timestamp(self, timestamp) -> datetime:
        """Ensure timestamp is datetime object"""
        if isinstance(timestamp, datetime):
            return timestamp
        elif isinstance(timestamp, str):
            try:
                # Try ISO format first
                return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                # Try common formats
                formats = [
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S",
                    "%d/%b/%Y:%H:%M:%S",
                    "%b %d %H:%M:%S"
                ]
                for fmt in formats:
                    try:
                        return datetime.strptime(timestamp, fmt)
                    except:
                        continue
                # If all fail, use current time
                return datetime.utcnow()
        else:
            return datetime.utcnow()
    
    def _clean_ip(self, ip: str) -> str:
        """Clean and validate IP address"""
        if not ip:
            return None
        
        # Extract IP if embedded in text
        match = self.ip_pattern.search(str(ip))
        if match:
            return match.group(0)
        
        return str(ip).strip()
    
    def _enrich_from_raw(self, normalized: Dict[str, Any], raw_log: str):
        """
        Extract additional information from raw log text
        
        This is useful when agents send raw log lines
        """
        if not raw_log:
            return
        
        # Try to extract user if not already present
        if "user" not in normalized or not normalized["user"]:
            user_match = self.user_pattern.search(raw_log)
            if user_match:
                normalized["user"] = user_match.group(1).lower().strip()
        
        # Try to extract IPs if not present
        if "source_ip" not in normalized or not normalized["source_ip"]:
            ip_matches = self.ip_pattern.findall(raw_log)
            if ip_matches:
                normalized["source_ip"] = ip_matches[0]
                if len(ip_matches) > 1:
                    normalized["destination_ip"] = ip_matches[1]
        
        # Try to extract port
        if "destination_port" not in normalized:
            port_match = self.port_pattern.search(raw_log)
            if port_match:
                try:
                    normalized["destination_port"] = int(port_match.group(1))
                except:
                    pass
    
    def parse_windows_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Windows Event Log specific format
        
        Args:
            event_data: Windows event log data
        
        Returns:
            Parsed log data ready for normalization
        """
        event_id = event_data.get("EventID", 0)
        
        # Map common Windows Event IDs to descriptions
        event_descriptions = {
            4624: "Successful Login",
            4625: "Failed Login Attempt",
            4672: "Special Privileges Assigned to New Logon",
            4688: "New Process Created",
            4689: "Process Terminated",
            4732: "User Added to Security-Enabled Local Group",
            4733: "User Removed from Security-Enabled Local Group",
            4740: "User Account Locked Out",
            4776: "Account Credential Validation",
            5140: "Network Share Object Accessed",
            5142: "Network Share Added",
            5145: "Network Share Checked for Access"
        }
        
        return {
            "host": event_data.get("ComputerName", "unknown"),
            "os": "windows",
            "log_type": "security",
            "event": event_descriptions.get(event_id, f"Event ID {event_id}"),
            "event_id": event_id,
            "user": event_data.get("User"),
            "timestamp": event_data.get("TimeGenerated"),
            "raw_log": event_data.get("Message", "")
        }
    
    def parse_linux_auth(self, auth_line: str) -> Dict[str, Any]:
        """
        Parse Linux auth.log format
        
        Args:
            auth_line: Single line from auth.log
        
        Returns:
            Parsed log data ready for normalization
        """
        # Example: Feb  8 10:30:45 hostname sshd[1234]: Failed password for root from 192.168.1.100
        
        parts = auth_line.split()
        
        event_data = {
            "os": "linux",
            "log_type": "auth",
            "raw_log": auth_line
        }
        
        # Extract timestamp (first 3 parts)
        if len(parts) >= 3:
            timestamp_str = f"{parts[0]} {parts[1]} {parts[2]}"
            try:
                event_data["timestamp"] = datetime.strptime(
                    timestamp_str,
                    "%b %d %H:%M:%S"
                ).replace(year=datetime.now().year)
            except:
                event_data["timestamp"] = datetime.utcnow()
        
        # Extract hostname
        if len(parts) >= 4:
            event_data["host"] = parts[3]
        
        # Detect event type
        if "Failed password" in auth_line or "authentication failure" in auth_line:
            event_data["event"] = "Failed Login Attempt"
        elif "Accepted password" in auth_line or "Accepted publickey" in auth_line:
            event_data["event"] = "Successful Login"
        elif "sudo" in auth_line.lower():
            event_data["event"] = "Sudo Command Executed"
        elif "session opened" in auth_line:
            event_data["event"] = "Session Opened"
        elif "session closed" in auth_line:
            event_data["event"] = "Session Closed"
        else:
            event_data["event"] = "Authentication Event"
        
        return event_data
    
    def parse_firewall_log(self, fw_line: str) -> Dict[str, Any]:
        """
        Parse firewall log format (UFW/iptables)
        
        Args:
            fw_line: Firewall log line
        
        Returns:
            Parsed log data ready for normalization
        """
        event_data = {
            "os": "firewall",
            "log_type": "firewall",
            "raw_log": fw_line
        }
        
        # Detect action (BLOCK, ALLOW, DROP)
        if "BLOCK" in fw_line.upper() or "DROP" in fw_line.upper():
            event_data["event"] = "Connection Blocked"
            event_data["action"] = "BLOCK"
        elif "ALLOW" in fw_line.upper() or "ACCEPT" in fw_line.upper():
            event_data["event"] = "Connection Allowed"
            event_data["action"] = "ALLOW"
        else:
            event_data["event"] = "Firewall Event"
        
        # Extract protocol
        if "TCP" in fw_line.upper():
            event_data["protocol"] = "TCP"
        elif "UDP" in fw_line.upper():
            event_data["protocol"] = "UDP"
        elif "ICMP" in fw_line.upper():
            event_data["protocol"] = "ICMP"
        
        return event_data
