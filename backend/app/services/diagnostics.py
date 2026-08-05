import asyncio
import platform
import re
import statistics
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Device, Incident, MetricSample, NetworkEvent
from app.realtime.manager import manager
from app.core.secrets import decrypt_secret
from app.integrations.snmp.collector import collect_v2c

PING_COUNT = 3

@dataclass
class PingResult:
    reachable: bool
    latency: float
    packet_loss: float
    jitter: float
    checked_at: datetime

async def ping_host(ip: str) -> PingResult:
    is_windows = platform.system() == "Windows"
    args = ["ping", "-n" if is_windows else "-c", str(PING_COUNT)]
    if is_windows:
        args += ["-w", "1000"]
    else:
        args += ["-W", "1"]
    args.append(ip)
    process = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=8)
    except (asyncio.CancelledError, asyncio.TimeoutError):
        process.kill()
        await process.communicate()
        raise
    output = stdout.decode(errors="ignore")
    replies = len(re.findall(r"ttl[=\s]", output, re.IGNORECASE))
    times = [float(value) for value in re.findall(r"(?:time|시간)[=<]?\s*(\d+(?:\.\d+)?)\s*ms", output, re.IGNORECASE)]
    reachable = process.returncode == 0 and replies > 0
    loss = round((1 - replies / PING_COUNT) * 100, 1)
    latency = round(sum(times) / len(times), 1) if times else (1.0 if reachable else 0.0)
    jitter = round(statistics.pstdev(times), 1) if len(times) > 1 else 0
    return PingResult(reachable, latency, loss, jitter, datetime.now(timezone.utc))

async def diagnose_and_store(db: Session, device: Device) -> PingResult:
    previous = device.status
    try:
        result = await ping_host(device.ip)
    except (OSError, asyncio.TimeoutError):
        result = PingResult(False, 0, 100, 0, datetime.now(timezone.utc))

    device.status = "Offline" if not result.reachable else "Warning" if result.packet_loss >= 20 or result.latency >= 200 else "Online"
    device.latency = result.latency
    device.packet_loss = result.packet_loss
    device.last_seen = result.checked_at.replace(tzinfo=None)
    if device.snmp_enabled and device.snmp_community_encrypted and result.reachable:
        try:
            snmp = await collect_v2c(device.ip, decrypt_secret(device.snmp_community_encrypted), device.snmp_port)
            bandwidth = 0.0
            if device.snmp_last_octets is not None and device.snmp_last_collected_at:
                seconds = (snmp.collected_at.replace(tzinfo=None) - device.snmp_last_collected_at).total_seconds()
                delta = max(0, snmp.total_octets - device.snmp_last_octets)
                if seconds > 0: bandwidth = round(delta * 8 / seconds / 1_000_000, 2)
            device.cpu = snmp.cpu
            device.bandwidth = bandwidth
            device.snmp_sys_name = snmp.sys_name
            device.snmp_sys_description = snmp.sys_description
            device.snmp_uptime = snmp.uptime
            device.snmp_last_octets = snmp.total_octets
            device.snmp_last_collected_at = snmp.collected_at.replace(tzinfo=None)
        except Exception:
            pass
    db.add(MetricSample(
        device_id=device.id,
        latency=result.latency,
        packet_loss=result.packet_loss,
        jitter=result.jitter,
        reachable=result.reachable,
        cpu=device.cpu,
        memory=device.memory,
        bandwidth=device.bandwidth,
        measured_at=result.checked_at.replace(tzinfo=None),
    ))

    problem = None
    severity = "Low"
    if device.status == "Offline" and previous != "Offline":
        problem, severity = "Device Offline", "Critical"
    elif result.packet_loss >= 20:
        problem, severity = f"Packet Loss {result.packet_loss}%", "High"
    elif result.latency >= 200:
        problem, severity = f"High Latency {result.latency}ms", "Medium"
    elif device.status == "Online" and previous in {"Offline", "Warning"}:
        problem, severity = "Device Recovered", "Low"

    event = None
    if problem:
        event = NetworkEvent(device_id=device.id, message=problem, severity=severity, occurred_at=result.checked_at.replace(tzinfo=None))
        db.add(event)
        if severity in {"Critical", "High", "Medium"}:
            open_incident = db.query(Incident).filter(
                Incident.device_id == device.id,
                Incident.problem == problem,
                Incident.status == "Open",
            ).first()
            if not open_incident:
                db.add(Incident(
                    device_id=device.id,
                    problem=problem,
                    severity=severity,
                    probable_cause="Host unreachable, path failure, congestion, or ICMP filtering",
                    recommended_action="Verify power and cabling, check routing/firewall policy, then run Ping and Traceroute from the NetScope server.",
                    occurred_at=result.checked_at.replace(tzinfo=None),
                ))
    db.commit()
    if event:
        db.refresh(event)
        await manager.broadcast({
            "id": event.id, "deviceId": device.id, "deviceName": device.hostname,
            "message": event.message, "severity": event.severity,
            "occurredAt": event.occurred_at.isoformat(),
        }, device.organization_id)
    return result

async def monitoring_loop(session_factory, interval: int = 30):
    while True:
        with session_factory() as db:
            devices = list(db.query(Device).filter(Device.monitor_enabled.is_(True)))
            for device in devices:
                await diagnose_and_store(db, device)
        await asyncio.sleep(interval)
