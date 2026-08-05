from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Device, Incident, MetricSample, NetworkEvent

class NetworkRepository:
    def __init__(self, db: Session, organization_id: int | None = None): self.db, self.organization_id = db, organization_id
    def list_devices(self) -> list[Device]:
        query = select(Device)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return list(self.db.scalars(query.order_by(Device.hostname)))
    def get_device(self, device_id: int) -> Device | None:
        query = select(Device).where(Device.id == device_id)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return self.db.scalar(query)
    def get_device_by_ip(self, ip: str) -> Device | None:
        query = select(Device).where(Device.ip == ip)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return self.db.scalar(query)
    def monitored_devices(self) -> list[Device]:
        query = select(Device).where(Device.monitor_enabled.is_(True))
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return list(self.db.scalars(query))
    def add_device(self, hostname: str, ip: str, device_type: str) -> Device:
        item = Device(organization_id=self.organization_id, hostname=hostname, ip=ip, type=device_type, status="Offline", monitor_enabled=True)
        self.db.add(item); self.db.commit(); self.db.refresh(item)
        return item
    def update_device(self, item: Device, values: dict) -> Device:
        for key, value in values.items():
            if value is not None: setattr(item, key, value)
        self.db.commit(); self.db.refresh(item)
        return item
    def delete_device(self, item: Device) -> None:
        self.db.query(MetricSample).filter(MetricSample.device_id == item.id).delete()
        self.db.query(NetworkEvent).filter(NetworkEvent.device_id == item.id).delete()
        self.db.query(Incident).filter(Incident.device_id == item.id).delete()
        self.db.delete(item); self.db.commit()
    def metric_samples(self, device_id: int, limit: int = 60) -> list[MetricSample]:
        rows = list(self.db.scalars(select(MetricSample).where(MetricSample.device_id == device_id).order_by(MetricSample.measured_at.desc()).limit(limit)))
        return list(reversed(rows))
    def list_events(self, limit: int = 100) -> list[NetworkEvent]:
        query = select(NetworkEvent).join(Device)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return list(self.db.scalars(query.order_by(NetworkEvent.occurred_at.desc()).limit(limit)))
    def list_incidents(self) -> list[Incident]:
        query = select(Incident).join(Device)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return list(self.db.scalars(query.order_by(Incident.occurred_at.desc())))
    def get_incident(self, incident_id: int) -> Incident | None:
        query = select(Incident).join(Device).where(Incident.id == incident_id)
        if self.organization_id: query = query.where(Device.organization_id == self.organization_id)
        return self.db.scalar(query)
    def resolve_incident(self, incident_id: int) -> Incident | None:
        item = self.get_incident(incident_id)
        if item:
            item.status = "Resolved"; item.resolved_at = datetime.utcnow(); self.db.commit(); self.db.refresh(item)
        return item
