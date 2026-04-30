"""
Data Models for SOC Dashboard
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class OSType(str, Enum):
    """Operating System types"""
    WINDOWS = "windows"
    LINUX = "linux"
    FIREWALL = "firewall"


class SeverityLevel(str, Enum):
    """Severity classification levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class LogType(str, Enum):
    """Log source types"""
    AUTH = "auth"
    SYSTEM = "system"
    SECURITY = "security"
    APPLICATION = "application"
    FIREWALL = "firewall"
    AUDIT = "audit"


class Heartbeat(BaseModel):
    """Heartbeat signal from agents"""
    host: str
    os: OSType
    status: str = "online"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LogEntry(BaseModel):
    """
    Log entry model for agent submissions
    
    This is the format agents send to the backend
    """
    host: str = Field(..., description="Hostname of the source system")
    os: OSType = Field(..., description="Operating system type")
    log_type: LogType = Field(..., description="Type of log")
    event: str = Field(..., description="Event description")
    source_ip: Optional[str] = Field(None, description="Source IP address")
    destination_ip: Optional[str] = Field(None, description="Destination IP")
    destination_port: Optional[int] = Field(None, description="Destination port")
    user: Optional[str] = Field(None, description="Username involved")
    process: Optional[str] = Field(None, description="Process name")
    event_id: Optional[int] = Field(None, description="Windows Event ID")
    action: Optional[str] = Field(None, description="Action taken (allow/block)")
    raw_log: Optional[str] = Field(None, description="Original log line")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "host": "windows-pc-01",
                "os": "windows",
                "log_type": "security",
                "event": "Failed Login Attempt",
                "source_ip": "192.168.1.100",
                "user": "admin",
                "event_id": 4625,
                "timestamp": "2026-02-08T10:30:00"
            }
        }


class NormalizedLog(BaseModel):
    """
    Normalized log format after processing
    
    All logs are converted to this unified format
    """
    host: str
    os: str
    log_type: str
    event: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    destination_port: Optional[int] = None
    user: Optional[str] = None
    process: Optional[str] = None
    event_id: Optional[int] = None
    action: Optional[str] = None
    severity: SeverityLevel
    is_priority: bool = Field(False, description="High priority flag for critical alerts")
    raw_log: Optional[str] = None
    timestamp: datetime
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "host": "linux-server-01",
                "os": "linux",
                "log_type": "auth",
                "event": "SSH Failed Login",
                "source_ip": "45.33.123.45",
                "user": "root",
                "severity": "high",
                "timestamp": "2026-02-08T10:30:00"
            }
        }


class LogResponse(BaseModel):
    """Response model for log queries"""
    logs: List[Dict[str, Any]]
    total: int
    returned: int
    filters_applied: Dict[str, Any]


class StatsResponse(BaseModel):
    """Response model for dashboard statistics"""
    total_logs: int
    severity_breakdown: Dict[str, int]
    os_breakdown: Dict[str, int]
    top_threat_actors: List[Dict[str, Any]]
    time_range_hours: int


class AlertResponse(BaseModel):
    """Response model for security alerts"""
    alerts: List[Dict[str, Any]]
    count: int
    severity: str


class WindowsEventLog(BaseModel):
    """Windows-specific event log structure"""
    event_id: int
    event_category: str
    source_name: str
    time_generated: datetime
    computer_name: str
    user: Optional[str] = None
    message: str
    event_type: int


class LinuxAuthLog(BaseModel):
    """Linux auth.log structure"""
    timestamp: datetime
    hostname: str
    process: str
    pid: Optional[int] = None
    message: str
    user: Optional[str] = None
    source_ip: Optional[str] = None


class FirewallLog(BaseModel):
    """Firewall log structure"""
    timestamp: datetime
    action: str  # ALLOW, BLOCK, DROP
    protocol: str  # TCP, UDP, ICMP
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    direction: Optional[str] = None  # IN, OUT


class AlertRule(BaseModel):
    """Alert configuration rule"""
    event_id: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AlertRuleCreate(BaseModel):
    """Model for creating a new alert rule"""
    event_id: str
    description: Optional[str] = None

class ThreatIndicator(BaseModel):
    """Threat indicator for pattern matching"""
    indicator_type: str  # ip, domain, hash, pattern
    value: str
    severity: SeverityLevel
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CorrelationRule(BaseModel):
    """Log correlation rule"""
    rule_id: str
    name: str
    description: str
    conditions: Dict[str, Any]
    threshold: int
    time_window_seconds: int
    severity: SeverityLevel
    enabled: bool = True
