from app.repositories.network import NetworkRepository
from app.schemas.network import DashboardOut, EventOut, IncidentOut

def event_out(item) -> EventOut:
    return EventOut(id=item.id, device_id=item.device_id, device_name=item.device.hostname, message=item.message, severity=item.severity, occurred_at=item.occurred_at)

def incident_out(item) -> IncidentOut:
    return IncidentOut(id=item.id, device_id=item.device_id, device_name=item.device.hostname, problem=item.problem, occurred_at=item.occurred_at, severity=item.severity, probable_cause=item.probable_cause, recommended_action=item.recommended_action, status=item.status, assigned_to_id=item.assigned_to_id, acknowledged_at=item.acknowledged_at, resolution_notes=item.resolution_notes, resolved_at=item.resolved_at)

def dashboard(repo: NetworkRepository) -> DashboardOut:
    devices = repo.list_devices()
    active = [d for d in devices if d.status != "Offline"]
    def avg(name: str) -> float: return round(sum(getattr(d, name) for d in active) / max(len(active), 1), 1)
    status = "Critical" if any(d.status == "Offline" for d in devices) else "Degraded" if any(d.status == "Warning" for d in devices) else "Healthy"
    healthy = sum(d.status == "Online" for d in devices)
    return DashboardOut(network_status=status, healthy_devices=healthy, faulty_devices=len(devices)-healthy, average_cpu=avg("cpu"), average_memory=avg("memory"), average_packet_loss=avg("packet_loss"), average_latency=avg("latency"))
