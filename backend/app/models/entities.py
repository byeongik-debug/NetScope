from datetime import datetime
from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    organization: Mapped[Organization] = relationship()

class Device(Base):
    __tablename__ = "devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"), nullable=True, index=True)
    hostname: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    ip: Mapped[str] = mapped_column(String(45), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), index=True)
    cpu: Mapped[float] = mapped_column(Float, default=0)
    memory: Mapped[float] = mapped_column(Float, default=0)
    bandwidth: Mapped[float] = mapped_column(Float, default=0)
    packet_loss: Mapped[float] = mapped_column(Float, default=0)
    latency: Mapped[float] = mapped_column(Float, default=0)
    monitor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    snmp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    snmp_port: Mapped[int] = mapped_column(default=161)
    snmp_community_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    snmp_sys_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    snmp_sys_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    snmp_uptime: Mapped[float] = mapped_column(Float, default=0)
    snmp_last_octets: Mapped[float | None] = mapped_column(Float, nullable=True)
    snmp_last_collected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class MetricSample(Base):
    __tablename__ = "metric_samples"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    latency: Mapped[float] = mapped_column(Float, default=0)
    packet_loss: Mapped[float] = mapped_column(Float, default=0)
    jitter: Mapped[float] = mapped_column(Float, default=0)
    reachable: Mapped[bool] = mapped_column(Boolean, default=False)
    cpu: Mapped[float] = mapped_column(Float, default=0)
    memory: Mapped[float] = mapped_column(Float, default=0)
    bandwidth: Mapped[float] = mapped_column(Float, default=0)
    measured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    device: Mapped[Device] = relationship()

class NetworkEvent(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    message: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(20), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    device: Mapped[Device] = relationship()

class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    problem: Mapped[str] = mapped_column(String(255), index=True)
    severity: Mapped[str] = mapped_column(String(20), index=True)
    probable_cause: Mapped[str] = mapped_column(Text)
    recommended_action: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Open", index=True)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    device: Mapped[Device] = relationship()

class IncidentAction(Base):
    __tablename__ = "incident_actions"
    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class ClientDiagnostic(Base):
    __tablename__ = "client_diagnostics"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    connection_type: Mapped[str] = mapped_column(String(30))
    latency: Mapped[float] = mapped_column(Float)
    min_latency: Mapped[float] = mapped_column(Float, default=0)
    max_latency: Mapped[float] = mapped_column(Float, default=0)
    p95_latency: Mapped[float] = mapped_column(Float, default=0)
    jitter: Mapped[float] = mapped_column(Float)
    failure_rate: Mapped[float] = mapped_column(Float)
    download_mbps: Mapped[float] = mapped_column(Float)
    quality_score: Mapped[int]
    risk_level: Mapped[str] = mapped_column(String(20))
    root_cause: Mapped[str] = mapped_column(String(255))
    recommended_action: Mapped[str] = mapped_column(Text)
    symptom: Mapped[str | None] = mapped_column(String(40), nullable=True)
    segments: Mapped[list] = mapped_column(JSON, default=list)
    action_steps: Mapped[list] = mapped_column(JSON, default=list)
    completed_actions: Mapped[list] = mapped_column(JSON, default=list)
    comparison_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    comparison_role: Mapped[str | None] = mapped_column(String(10), nullable=True)
    comparison_verdict: Mapped[str | None] = mapped_column(Text, nullable=True)
    measured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class WifiSurvey(Base):
    __tablename__ = "wifi_surveys"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class WifiSurveyPlacement(Base):
    __tablename__ = "wifi_survey_placements"
    id: Mapped[int] = mapped_column(primary_key=True)
    survey_id: Mapped[int] = mapped_column(ForeignKey("wifi_surveys.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class WifiSurveyPoint(Base):
    __tablename__ = "wifi_survey_points"
    id: Mapped[int] = mapped_column(primary_key=True)
    placement_id: Mapped[int] = mapped_column(ForeignKey("wifi_survey_placements.id"), index=True)
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("client_diagnostics.id"), index=True)
    location_name: Mapped[str] = mapped_column(String(120), index=True)
    floor: Mapped[str] = mapped_column(String(40), default="")
    measured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
