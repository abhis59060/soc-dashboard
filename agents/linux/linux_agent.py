"""
Linux Log Collection Agent
Monitors Linux system logs and sends to SOC backend
"""

import os
import re
import json
import requests
import time
from datetime import datetime
from typing import List, Dict, Any
import socket


class LinuxLogAgent:
    """
    Linux log collector for SOC Dashboard
    
    Monitors:
    - /var/log/auth.log (SSH, sudo, authentication)
    - /var/log/syslog (System events)
    - /var/log/ufw.log (Firewall events)
    """
    
    def __init__(self, config_path: str = "config.json"):
        """Initialize Linux log agent"""
        self.config = self._load_config(config_path)
        self.backend_url = self.config.get("backend_url", "http://localhost:8000")
        self.hostname = socket.gethostname()
        self.poll_interval = self.config.get("poll_interval", 10)  # seconds
        
        # Log files to monitor
        self.log_files = {
            "auth": "/var/log/auth.log",
            "syslog": "/var/log/syslog",
            "firewall": "/var/log/ufw.log"
        }
        
        # Track file positions
        self.file_positions = {}
        
        print(f"✅ Linux Log Agent initialized")
        print(f"   Backend: {self.backend_url}")
        print(f"   Hostname: {self.hostname}")
        print(f"   Monitoring: {', '.join(self.log_files.keys())}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("⚠️  Config file not found, using defaults")
            return {
                "backend_url": "http://localhost:8000",
                "poll_interval": 10
            }
    
    def collect_logs(self, log_type: str, max_lines: int = 100) -> List[Dict[str, Any]]:
        """
        Collect new log lines from specified log file
        
        Args:
            log_type: Type of log (auth, syslog, firewall)
            max_lines: Maximum lines to read per poll
        
        Returns:
            List of parsed log entries
        """
        log_file = self.log_files.get(log_type)
        if not log_file or not os.path.exists(log_file):
            return []
        
        logs = []
        
        try:
            # Get current file size
            current_size = os.path.getsize(log_file)
            
            # Get last known position
            last_position = self.file_positions.get(log_type, 0)
            
            # If file was rotated or truncated
            if current_size < last_position:
                last_position = 0
            
            # Read new content
            with open(log_file, 'r') as f:
                f.seek(last_position)
                
                lines_read = 0
                for line in f:
                    if lines_read >= max_lines:
                        break
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse log line based on type
                    parsed_log = self._parse_log_line(line, log_type)
                    if parsed_log:
                        logs.append(parsed_log)
                        lines_read += 1
                
                # Update file position
                self.file_positions[log_type] = f.tell()
        
        except Exception as e:
            print(f"❌ Error reading {log_type}: {e}")
        
        return logs
    
    def _parse_log_line(self, line: str, log_type: str) -> Dict[str, Any]:
        """
        Parse log line based on log type
        
        Args:
            line: Log line text
            log_type: Type of log
        
        Returns:
            Parsed log dictionary
        """
        try:
            if log_type == "auth":
                return self._parse_auth_log(line)
            elif log_type == "syslog":
                return self._parse_syslog(line)
            elif log_type == "firewall":
                return self._parse_firewall_log(line)
        except Exception as e:
            print(f"⚠️  Error parsing line: {e}")
        
        return None
    
    def _parse_auth_log(self, line: str) -> Dict[str, Any]:
        """
        Parse auth.log entry
        
        Example formats:
        - Feb  8 10:30:45 hostname sshd[1234]: Failed password for root from 192.168.1.100
        - Feb  8 10:30:45 hostname sudo: user : TTY=pts/0 ; PWD=/home/user ; COMMAND=/bin/ls
        """
        log_entry = {
            "host": self.hostname,
            "os": "linux",
            "log_type": "auth",
            "raw_log": line,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Extract timestamp
        timestamp_match = re.match(r'(\w+\s+\d+\s+\d+:\d+:\d+)', line)
        if timestamp_match:
            timestamp_str = timestamp_match.group(1)
            try:
                timestamp = datetime.strptime(timestamp_str, "%b %d %H:%M:%S")
                timestamp = timestamp.replace(year=datetime.now().year)
                log_entry["timestamp"] = timestamp.isoformat()
            except:
                pass
        
        # Detect event type
        if "Failed password" in line or "authentication failure" in line:
            log_entry["event"] = "Failed Login Attempt"
            
            # Extract user
            user_match = re.search(r'for (\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
            
            # Extract source IP
            ip_match = re.search(r'from ([\d\.]+)', line)
            if ip_match:
                log_entry["source_ip"] = ip_match.group(1)
        
        elif "Accepted password" in line or "Accepted publickey" in line:
            log_entry["event"] = "Successful Login"
            
            user_match = re.search(r'for (\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
            
            ip_match = re.search(r'from ([\d\.]+)', line)
            if ip_match:
                log_entry["source_ip"] = ip_match.group(1)
        
        elif "sudo" in line.lower():
            log_entry["event"] = "Sudo Command Executed"
            
            # Extract user
            user_match = re.search(r'sudo:\s+(\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
            
            # Extract command
            command_match = re.search(r'COMMAND=(.+)$', line)
            if command_match:
                log_entry["process"] = command_match.group(1)
        
        elif "session opened" in line:
            log_entry["event"] = "Session Opened"
            
            user_match = re.search(r'user (\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
        
        elif "session closed" in line:
            log_entry["event"] = "Session Closed"
            
            user_match = re.search(r'user (\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
        
        elif "Invalid user" in line:
            log_entry["event"] = "Invalid User Login Attempt"
            
            user_match = re.search(r'Invalid user (\w+)', line)
            if user_match:
                log_entry["user"] = user_match.group(1)
            
            ip_match = re.search(r'from ([\d\.]+)', line)
            if ip_match:
                log_entry["source_ip"] = ip_match.group(1)
        
        else:
            log_entry["event"] = "Authentication Event"
        
        return log_entry
    
    def _parse_syslog(self, line: str) -> Dict[str, Any]:
        """Parse syslog entry"""
        log_entry = {
            "host": self.hostname,
            "os": "linux",
            "log_type": "system",
            "event": "System Event",
            "raw_log": line,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Extract timestamp
        timestamp_match = re.match(r'(\w+\s+\d+\s+\d+:\d+:\d+)', line)
        if timestamp_match:
            timestamp_str = timestamp_match.group(1)
            try:
                timestamp = datetime.strptime(timestamp_str, "%b %d %H:%M:%S")
                timestamp = timestamp.replace(year=datetime.now().year)
                log_entry["timestamp"] = timestamp.isoformat()
            except:
                pass
        
        # Detect important system events
        if "error" in line.lower():
            log_entry["event"] = "System Error"
        elif "warning" in line.lower():
            log_entry["event"] = "System Warning"
        elif "started" in line.lower() or "stopped" in line.lower():
            log_entry["event"] = "Service Status Change"
        
        return log_entry
    
    def _parse_firewall_log(self, line: str) -> Dict[str, Any]:
        """
        Parse UFW/iptables firewall log
        
        Example:
        Feb  8 10:30:45 hostname kernel: [UFW BLOCK] IN=eth0 OUT= SRC=192.168.1.100 DST=192.168.1.1 PROTO=TCP DPT=22
        """
        log_entry = {
            "host": self.hostname,
            "os": "firewall",
            "log_type": "firewall",
            "raw_log": line,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Extract timestamp
        timestamp_match = re.match(r'(\w+\s+\d+\s+\d+:\d+:\d+)', line)
        if timestamp_match:
            timestamp_str = timestamp_match.group(1)
            try:
                timestamp = datetime.strptime(timestamp_str, "%b %d %H:%M:%S")
                timestamp = timestamp.replace(year=datetime.now().year)
                log_entry["timestamp"] = timestamp.isoformat()
            except:
                pass
        
        # Detect action
        if "BLOCK" in line.upper() or "DROP" in line.upper():
            log_entry["event"] = "Connection Blocked"
            log_entry["action"] = "BLOCK"
        elif "ALLOW" in line.upper() or "ACCEPT" in line.upper():
            log_entry["event"] = "Connection Allowed"
            log_entry["action"] = "ALLOW"
        else:
            log_entry["event"] = "Firewall Event"
        
        # Extract source IP
        src_match = re.search(r'SRC=([\d\.]+)', line)
        if src_match:
            log_entry["source_ip"] = src_match.group(1)
        
        # Extract destination IP
        dst_match = re.search(r'DST=([\d\.]+)', line)
        if dst_match:
            log_entry["destination_ip"] = dst_match.group(1)
        
        # Extract destination port
        dpt_match = re.search(r'DPT=(\d+)', line)
        if dpt_match:
            log_entry["destination_port"] = int(dpt_match.group(1))
        
        # Extract protocol
        proto_match = re.search(r'PROTO=(\w+)', line)
        if proto_match:
            log_entry["process"] = proto_match.group(1)  # Use process field for protocol
        
        return log_entry
    
    def send_to_backend(self, logs: List[Dict[str, Any]]):
        """
        Send collected logs to backend API
        
        Args:
            logs: List of log dictionaries
        """
        if not logs:
            return
        
        endpoint = f"{self.backend_url}/api/logs/ingest"
        
        success_count = 0
        for log in logs:
            try:
                response = requests.post(
                    endpoint,
                    json=log,
                    timeout=5
                )
                
                if response.status_code == 200:
                    success_count += 1
                else:
                    print(f"⚠️  Backend returned {response.status_code}: {response.text}")
            
            except requests.exceptions.RequestException as e:
                print(f"❌ Failed to send log: {e}")
        
        if success_count > 0:
            print(f"✅ Sent {success_count}/{len(logs)} logs to backend")
    
    def run(self):
        """Main agent loop"""
        print("\n🚀 Starting Linux Log Agent...")
        print(f"   Polling interval: {self.poll_interval} seconds")
        print("   Press Ctrl+C to stop\n")
        
        # Check if running as root
        if os.geteuid() != 0:
            print("⚠️  WARNING: Not running as root. Some logs may be inaccessible.")
        
        try:
            while True:
                # Collect logs from each log file
                for log_type in self.log_files.keys():
                    logs = self.collect_logs(log_type)
                    
                    if logs:
                        print(f"📊 Collected {len(logs)} logs from {log_type}")
                        self.send_to_backend(logs)
                
                # Wait before next poll
                time.sleep(self.poll_interval)
        
        except KeyboardInterrupt:
            print("\n⏹️  Agent stopped by user")
        except Exception as e:
            print(f"\n❌ Agent error: {e}")


def main():
    """Entry point"""
    agent = LinuxLogAgent()
    agent.run()


if __name__ == "__main__":
    main()
