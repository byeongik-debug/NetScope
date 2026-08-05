from dataclasses import dataclass
from datetime import datetime, timezone

from pysnmp.hlapi.v3arch.asyncio import (
    CommunityData, ContextData, ObjectIdentity, ObjectType, SnmpEngine,
    UdpTransportTarget, bulk_walk_cmd, get_cmd,
)

SYS_DESCR = "1.3.6.1.2.1.1.1.0"
SYS_UPTIME = "1.3.6.1.2.1.1.3.0"
SYS_NAME = "1.3.6.1.2.1.1.5.0"
IF_HC_IN = "1.3.6.1.2.1.31.1.1.1.6"
IF_HC_OUT = "1.3.6.1.2.1.31.1.1.1.10"
HR_PROCESSOR_LOAD = "1.3.6.1.2.1.25.3.3.1.2"

@dataclass
class SnmpResult:
    sys_name: str | None
    sys_description: str | None
    uptime: float
    total_octets: float
    cpu: float
    collected_at: datetime

async def _walk_numbers(engine, auth, target, oid: str) -> list[float]:
    values: list[float] = []
    async for error_indication, error_status, _, var_binds in bulk_walk_cmd(
        engine, auth, target, ContextData(), 0, 20,
        ObjectType(ObjectIdentity(oid)), lexicographicMode=False, lookupMib=False,
    ):
        if error_indication or error_status:
            break
        for _, value in var_binds:
            try: values.append(float(value))
            except (TypeError, ValueError): pass
    return values

async def collect_v2c(ip: str, community: str, port: int = 161) -> SnmpResult:
    engine = SnmpEngine()
    auth = CommunityData(community, mpModel=1)
    target = await UdpTransportTarget.create((ip, port), timeout=1.5, retries=1)
    error_indication, error_status, _, var_binds = await get_cmd(
        engine, auth, target, ContextData(),
        ObjectType(ObjectIdentity(SYS_NAME)),
        ObjectType(ObjectIdentity(SYS_DESCR)),
        ObjectType(ObjectIdentity(SYS_UPTIME)),
        lookupMib=False,
    )
    if error_indication: raise RuntimeError(str(error_indication))
    if error_status: raise RuntimeError(str(error_status))
    values = [str(value) for _, value in var_binds]
    inbound = await _walk_numbers(engine, auth, target, IF_HC_IN)
    outbound = await _walk_numbers(engine, auth, target, IF_HC_OUT)
    cpu_values = await _walk_numbers(engine, auth, target, HR_PROCESSOR_LOAD)
    return SnmpResult(
        sys_name=values[0] if values else None,
        sys_description=values[1] if len(values) > 1 else None,
        uptime=float(var_binds[2][1]) / 100 if len(var_binds) > 2 else 0,
        total_octets=sum(inbound) + sum(outbound),
        cpu=round(sum(cpu_values) / len(cpu_values), 1) if cpu_values else 0,
        collected_at=datetime.now(timezone.utc),
    )
