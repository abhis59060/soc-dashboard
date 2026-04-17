"""
Windows Log Collection Agent
Monitors Windows Event Logs and sends to SOC backend
"""

import win32evtlog
import win32evtlogutil
import win32con
import json
import requests
import time
from datetime import datetime
from typing import List, Dict, Any
import os


class WindowsLogAgent:
    """
    Windows Event Log collector for SOC Dashboard
    
    Monitors:
    - Security Event Log (Event IDs: 4624, 4625, 4672, 4688, etc.)
    - System Event Log
    - Application Event Log
    """
    
    def __init__(self, config_path: str = "config.json"):
        """Initialize Windows log agent"""
        self.config = self._load_config(config_path)
        self.backend_url = self.config.get("backend_url", "http://localhost:8000")
        self.hostname = os.environ.get("COMPUTERNAME", "unknown-windows")
        self.poll_interval = self.config.get("poll_interval", 5)  # seconds
        
        # Event logs to monitor
        self.log_types = ["Security", "System", "Application"]
        
        # Track last read position for each log
        self.last_record_numbers = {}
        
        print(f"✅ Windows Log Agent initialized")
        print(f"   Backend: {self.backend_url}")
        print(f"   Hostname: {self.hostname}")
        print(f"   Monitoring: {', '.join(self.log_types)}")
        
        # Initial heartbeat
        self.send_heartbeat()

    def send_heartbeat(self):
        """Send heartbeat to backend to update last_seen status"""
        endpoint = f"{self.backend_url}/api/agents/heartbeat"
        try:
            response = requests.post(
                endpoint,
                json={
                    "host": self.hostname,
                    "os": "windows",
                    "status": "online",
                    "timestamp": datetime.now().isoformat()
                },
                timeout=3
            )
            if response.status_code != 200:
                print(f"⚠️  Heartbeat failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Heartbeat error: {e}")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("⚠️  Config file not found, using defaults")
            return {
                "backend_url": "http://localhost:8000",
                "poll_interval": 5
            }
    
    def collect_events(self, log_type: str, max_events: int = 50) -> List[Dict[str, Any]]:
        """
        Collect events from specified Windows Event Log
        
        Args:
            log_type: Security, System, or Application
            max_events: Maximum events to collect per poll
        
        Returns:
            List of event dictionaries
        """
        events = []
        
        try:
            # Open event log
            hand = win32evtlog.OpenEventLog(None, log_type)
            
            # Read events in reverse chronological order
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            
            # Get last record number we've seen
            last_record = self.last_record_numbers.get(log_type, 0)
            
            event_count = 0
            while event_count < max_events:
                # Read batch of events
                event_batch = win32evtlog.ReadEventLog(hand, flags, 0)
                
                if not event_batch:
                    break
                
                for event in event_batch:
                    # Skip events we've already processed
                    if event.RecordNumber <= last_record:
                        continue
                    
                    # Parse event
                    parsed_event = self._parse_event(event, log_type)
                    if parsed_event:
                        events.append(parsed_event)
                        event_count += 1
                    
                    # Update last record number
                    if event.RecordNumber > self.last_record_numbers.get(log_type, 0):
                        self.last_record_numbers[log_type] = event.RecordNumber
                
                if event_count >= max_events:
                    break
            
            win32evtlog.CloseEventLog(hand)
        
        except Exception as e:
            print(f"❌ Error collecting {log_type} events: {e}")
        
        return events
    
    def _parse_event(self, event, log_type: str) -> Dict[str, Any]:
        """
        Parse Windows Event into normalized format
        
        Args:
            event: Win32 event object
            log_type: Log type (Security, System, Application)
        
        Returns:
            Parsed event dictionary
        """
        try:
            # Get event message
            try:
                message = win32evtlogutil.SafeFormatMessage(event, log_type)
            except:
                message = "No message available"
            
            # Map event type
            event_type_map = {
                win32con.EVENTLOG_ERROR_TYPE: "ERROR",
                win32con.EVENTLOG_WARNING_TYPE: "WARNING",
                win32con.EVENTLOG_INFORMATION_TYPE: "INFO",
                win32con.EVENTLOG_AUDIT_SUCCESS: "SUCCESS",
                win32con.EVENTLOG_AUDIT_FAILURE: "FAILURE"
            }
            
            event_type_str = event_type_map.get(event.EventType, "UNKNOWN")
            
            # Map event ID to description
            event_descriptions = {
                4624: "Successful Login",
                4625: "Failed Login Attempt",
                4672: "Special Privileges Assigned",
                4688: "New Process Created",
                4689: "Process Terminated",
                4732: "User Added to Security Group",
                4740: "User Account Locked Out",
                4776: "Account Credential Validation"
            }
            
            event_description = event_descriptions.get(
                event.EventID & 0xFFFF,  # Mask to get actual ID
                f"Event ID {event.EventID & 0xFFFF}"
            )
            
            # Extract username from message if available
            user = None
            if "Account Name:" in message:
                try:
                    user = message.split("Account Name:")[1].split()[0].strip()
                except:
                    pass
            
            # Extract source IP if available
            source_ip = None
            if "Source Network Address:" in message:
                try:
                    source_ip = message.split("Source Network Address:")[1].split()[0].strip()
                    if source_ip == "-" or source_ip == "":
                        source_ip = None
                except:
                    pass
            
            return {
                "host": self.hostname,
                "os": "windows",
                "log_type": log_type.lower(),
                "event": event_description,
                "event_id": event.EventID & 0xFFFF,
                "user": user,
                "source_ip": source_ip,
                "timestamp": event.TimeGenerated.isoformat(),
                "raw_log": message[:500]  # Truncate long messages
            }
        
        except Exception as e:
            print(f"⚠️  Error parsing event: {e}")
            return None
    
    def send_to_backend(self, events: List[Dict[str, Any]]):
        """
        Send collected events to backend API
        
        Args:
            events: List of event dictionaries
        """
        if not events:
            return
        
        endpoint = f"{self.backend_url}/api/logs/ingest"
        
        success_count = 0
        for event in events:
            try:
                response = requests.post(
                    endpoint,
                    json=event,
                    timeout=5
                )
                
                if response.status_code == 200:
                    success_count += 1
                else:
                    print(f"⚠️  Backend returned {response.status_code}: {response.text}")
            
            except requests.exceptions.RequestException as e:
                print(f"❌ Failed to send event: {e}")
        
        if success_count > 0:
            print(f"✅ Sent {success_count}/{len(events)} events to backend")
    
    def run(self):
        """Main agent loop"""
        print("\n🚀 Starting Windows Log Agent...")
        print(f"   Polling interval: {self.poll_interval} seconds")
        print("   Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Update status with heartbeat
                self.send_heartbeat()

                # Collect events from each log type
                for log_type in self.log_types:
                    events = self.collect_events(log_type)
                    
                    if events:
                        print(f"📊 Collected {len(events)} events from {log_type}")
                        self.send_to_backend(events)
                
                # Wait before next poll
                time.sleep(self.poll_interval)
        
        except KeyboardInterrupt:
            print("\n⏹️  Agent stopped by user")
        except Exception as e:
            print(f"\n❌ Agent error: {e}")


def main():
    """Entry point"""
    agent = WindowsLogAgent()
    agent.run()


if __name__ == "__main__":
    main()
