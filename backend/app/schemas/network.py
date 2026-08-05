from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from ipaddress import ip_address

DEVICE_TYPES = {"Router", "Switch", "Firewall", "Server", "Access Point"}

class DeviceCreate(BaseModel):
    hostname: str = Field(min_length=1, max_length=100)
    ip: str
    type: str

    @field_validator("ip")
    @classmethod
    def valid_ip(cls, value: str) -> str:
        parsed = ip_address(value.strip())
        if parsed.is_multicast or parsed.is_unspecified:
            raise ValueError("Multicast and unspecified addresses are not supported")
        return str(parsed)

    @field_validator("type")
    @classmethod
    def valid_type(cls, value: str) -> str:
        if value not in DEVICE_TYPES:
            raise ValueError("Unsupported device type")
        return value

class DeviceUpdate(BaseModel):
    hostname: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = None
    monitor_enabled: bool | None = Field(default=None, alias="monitorEnabled")

    @field_validator("type")
    @classmethod
    def valid_optional_type(cls, value: str | None) -> str | None:
        if value is not None and value not in DEVICE_TYPES:
            raise ValueError("Unsupported device type")
        return value

class DeviceOut(BaseModel):
    id: int
    hostname: str
    ip: str
    type: str
    status: str
    cpu: float
    memory: float
    bandwidth: float
    packet_loss: float = Field(alias="packetLoss")
    latency: float
    monitor_enabled: bool = Field(alias="monitorEnabled")
    snmp_enabled: bool = Field(alias="snmpEnabled")
    snmp_sys_name: str | None = Field(default=None, alias="snmpSysName")
    snmp_sys_description: str | None = Field(default=None, alias="snmpSysDescription")
    snmp_uptime: float = Field(default=0, alias="snmpUptime")
    last_seen: datetime = Field(alias="lastSeen")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class EventOut(BaseModel):
    id: int
    device_id: int = Field(serialization_alias="deviceId")
    device_name: str = Field(serialization_alias="deviceName")
    message: str
    severity: str
    occurred_at: datetime = Field(serialization_alias="occurredAt")
    model_config = ConfigDict(populate_by_name=True)

class IncidentOut(BaseModel):
    id: int
    device_id: int = Field(serialization_alias="deviceId")
    device_name: str = Field(serialization_alias="deviceName")
    problem: str
    occurred_at: datetime = Field(serialization_alias="occurredAt")
    severity: str
    probable_cause: str = Field(serialization_alias="probableCause")
    recommended_action: str = Field(serialization_alias="recommendedAction")
    status: str
    assigned_to_id: int | None = Field(default=None, serialization_alias="assignedToId")
    acknowledged_at: datetime | None = Field(default=None, serialization_alias="acknowledgedAt")
    resolution_notes: str | None = Field(default=None, serialization_alias="resolutionNotes")
    resolved_at: datetime | None = Field(default=None, serialization_alias="resolvedAt")
    model_config = ConfigDict(populate_by_name=True)

class IncidentActionIn(BaseModel):
    note: str | None = Field(default=None, max_length=2000)
    assigned_to_id: int | None = Field(default=None, alias="assignedToId")

class IncidentActionOut(BaseModel):
    id: int
    incident_id: int = Field(serialization_alias="incidentId")
    user_id: int = Field(serialization_alias="userId")
    user_name: str = Field(serialization_alias="userName")
    action: str
    note: str | None
    created_at: datetime = Field(serialization_alias="createdAt")
    model_config = ConfigDict(populate_by_name=True)

class IncidentWorkflowIn(BaseModel):
    status: str = Field(pattern="^(Open|Acknowledged|In Progress|Resolved)$")
    assigned_to_id: int | None = Field(default=None, alias="assignedToId")
    note: str | None = Field(default=None, max_length=2000)

class OperationsAnalyticsOut(BaseModel):
    incidents_24h: int = Field(serialization_alias="incidents24h")
    open_incidents: int = Field(serialization_alias="openIncidents")
    resolved_24h: int = Field(serialization_alias="resolved24h")
    mean_time_to_resolve: float = Field(serialization_alias="meanTimeToResolve")
    availability: float
    unstable_device: str | None = Field(default=None, serialization_alias="unstableDevice")
    top_cause: str | None = Field(default=None, serialization_alias="topCause")
    model_config = ConfigDict(populate_by_name=True)

class ClientDiagnosticIn(BaseModel):
    connection_type: str = Field(alias="connectionType")
    latency: float = Field(ge=0)
    min_latency: float = Field(ge=0, alias="minLatency")
    max_latency: float = Field(ge=0, alias="maxLatency")
    p95_latency: float = Field(ge=0, alias="p95Latency")
    jitter: float = Field(ge=0)
    failure_rate: float = Field(ge=0, le=100, alias="failureRate")
    download_mbps: float = Field(ge=0, alias="downloadMbps")
    quality_score: int = Field(ge=0, le=100, alias="qualityScore")
    risk_level: str = Field(alias="riskLevel")
    root_cause: str = Field(alias="rootCause")
    recommended_action: str = Field(alias="recommendedAction")
    symptom: str | None = Field(default=None, pattern="^(no_internet|slow|video_call|gaming|specific_site|wifi_disconnects)$")
    segments: list[dict] = Field(default_factory=list)
    action_steps: list[str] = Field(default_factory=list, alias="actionSteps")
    completed_actions: list[int] = Field(default_factory=list, alias="completedActions")
    comparison_id: str | None = Field(default=None, max_length=80, alias="comparisonId")
    comparison_role: str | None = Field(default=None, pattern="^(first|second)$", alias="comparisonRole")
    comparison_verdict: str | None = Field(default=None, max_length=2000, alias="comparisonVerdict")
    model_config = ConfigDict(populate_by_name=True)

class ClientDiagnosticOut(ClientDiagnosticIn):
    id: int
    measured_at: datetime = Field(serialization_alias="measuredAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ClientDiagnosticSessionUpdate(BaseModel):
    completed_actions: list[int] | None = Field(default=None, alias="completedActions")
    comparison_verdict: str | None = Field(default=None, max_length=2000, alias="comparisonVerdict")

class WifiSurveyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

class WifiSurveyPlacementCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

class WifiSurveyPointCreate(BaseModel):
    diagnostic_id: int = Field(alias="diagnosticId")
    location_name: str = Field(min_length=1, max_length=120, alias="locationName")
    floor: str = Field(default="", max_length=40)
    model_config = ConfigDict(populate_by_name=True)

class DashboardOut(BaseModel):
    network_status: str = Field(serialization_alias="networkStatus")
    healthy_devices: int = Field(serialization_alias="healthyDevices")
    faulty_devices: int = Field(serialization_alias="faultyDevices")
    average_cpu: float = Field(serialization_alias="averageCpu")
    average_memory: float = Field(serialization_alias="averageMemory")
    average_packet_loss: float = Field(serialization_alias="averagePacketLoss")
    average_latency: float = Field(serialization_alias="averageLatency")
    model_config = ConfigDict(populate_by_name=True)

class DiagnosticOut(BaseModel):
    device_id: int = Field(serialization_alias="deviceId")
    reachable: bool
    latency: float
    packet_loss: float = Field(serialization_alias="packetLoss")
    jitter: float
    checked_at: datetime = Field(serialization_alias="checkedAt")
    model_config = ConfigDict(populate_by_name=True)

class MetricSampleOut(BaseModel):
    id: int
    device_id: int = Field(serialization_alias="deviceId")
    latency: float
    packet_loss: float = Field(serialization_alias="packetLoss")
    jitter: float
    reachable: bool
    cpu: float
    memory: float
    bandwidth: float
    measured_at: datetime = Field(serialization_alias="measuredAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SnmpConfigIn(BaseModel):
    enabled: bool = True
    community: str = Field(min_length=1, max_length=255)
    port: int = Field(default=161, ge=1, le=65535)

class SnmpTestOut(BaseModel):
    success: bool
    message: str
    sys_name: str | None = Field(default=None, serialization_alias="sysName")
    sys_description: str | None = Field(default=None, serialization_alias="sysDescription")
    uptime: float = 0
    cpu: float = 0
    bandwidth: float = 0
    model_config = ConfigDict(populate_by_name=True)

class PortCheckOut(BaseModel):
    port: int
    service: str
    open: bool
    latency: float

class HttpCheckOut(BaseModel):
    url: str
    reachable: bool
    status_code: int | None = Field(default=None, serialization_alias="statusCode")
    latency: float
    model_config = ConfigDict(populate_by_name=True)

class FullDiagnosticOut(BaseModel):
    device_id: int = Field(serialization_alias="deviceId")
    checked_at: datetime = Field(serialization_alias="checkedAt")
    reachable: bool
    latency: float
    packet_loss: float = Field(serialization_alias="packetLoss")
    jitter: float
    ports: list[PortCheckOut]
    http: list[HttpCheckOut]
    dns_reachable: bool = Field(serialization_alias="dnsReachable")
    dns_latency: float = Field(serialization_alias="dnsLatency")
    internet_reachable: bool = Field(serialization_alias="internetReachable")
    traceroute_hops: list[str] = Field(serialization_alias="tracerouteHops")
    quality_score: int = Field(serialization_alias="qualityScore")
    risk_level: str = Field(serialization_alias="riskLevel")
    root_cause: str = Field(serialization_alias="rootCause")
    assessment: str
    recommended_action: str = Field(serialization_alias="recommendedAction")
    model_config = ConfigDict(populate_by_name=True)
