import asyncio
import platform
import re
import socket
import time
from dataclasses import dataclass

import httpx

from app.services.diagnostics import PingResult, ping_host

SAFE_PORTS = {22: "SSH", 53: "DNS", 80: "HTTP", 443: "HTTPS"}

@dataclass
class PortResult:
    port: int
    service: str
    open: bool
    latency: float

@dataclass
class HttpResult:
    url: str
    reachable: bool
    status_code: int | None
    latency: float

async def check_port(ip: str, port: int) -> PortResult:
    started = time.perf_counter()
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=1.5)
        writer.close(); await writer.wait_closed()
        return PortResult(port, SAFE_PORTS[port], True, round((time.perf_counter() - started) * 1000, 1))
    except (OSError, asyncio.TimeoutError):
        return PortResult(port, SAFE_PORTS[port], False, 0)

async def check_http(ip: str, scheme: str) -> HttpResult:
    url = f"{scheme}://{ip}"
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(verify=False, follow_redirects=False, timeout=3) as client:
            response = await client.get(url, headers={"User-Agent": "NetScope-Monitor/0.1"})
        return HttpResult(url, True, response.status_code, round((time.perf_counter() - started) * 1000, 1))
    except httpx.HTTPError:
        return HttpResult(url, False, None, 0)

async def check_dns() -> tuple[bool, float]:
    started = time.perf_counter()
    try:
        await asyncio.wait_for(asyncio.get_running_loop().getaddrinfo("example.com", 443, type=socket.SOCK_STREAM), timeout=3)
        return True, round((time.perf_counter() - started) * 1000, 1)
    except (OSError, asyncio.TimeoutError):
        return False, 0

async def check_internet() -> bool:
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection("1.1.1.1", 443), timeout=3)
        writer.close(); await writer.wait_closed()
        return True
    except (OSError, asyncio.TimeoutError):
        return False

async def traceroute(ip: str) -> list[str]:
    if platform.system() == "Windows":
        args = ["tracert", "-d", "-h", "12", "-w", "700", ip]
    else:
        args = ["traceroute", "-n", "-m", "12", "-w", "1", ip]
    try:
        process = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=15)
        output = stdout.decode(errors="ignore")
        hops: list[str] = []
        for line in output.splitlines():
            addresses = re.findall(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)", line)
            if addresses:
                address = addresses[-1]
                if address not in hops: hops.append(address)
        return hops[:12]
    except (OSError, asyncio.TimeoutError):
        return []

def score_and_assess(ping: PingResult, dns_ok: bool, internet_ok: bool, ports: list[PortResult]) -> tuple[int, str, str, str, str]:
    if not ping.reachable:
        return 0, "위험", "인터넷 연결 끊김 또는 대상 장비 응답 없음", "대상이 Ping에 응답하지 않습니다.", "게이트웨이와 케이블, 라우팅, ICMP 방화벽 정책을 확인하세요."
    score = 100
    score -= min(40, round(ping.packet_loss * 1.5))
    if ping.latency > 200: score -= 30
    elif ping.latency > 100: score -= 20
    elif ping.latency > 50: score -= 10
    if not dns_ok: score -= 10
    if not internet_ok: score -= 20
    if ping.jitter > 50: score -= 15
    elif ping.jitter > 20: score -= 8
    score = max(0, score)
    if score >= 90: assessment = "네트워크 품질이 매우 좋습니다."
    elif score >= 70: assessment = "네트워크는 사용 가능하지만 일부 품질 저하가 있습니다."
    elif score >= 40: assessment = "지연 또는 손실이 높아 점검이 필요합니다."
    else: assessment = "심각한 연결 문제가 감지됐습니다."
    if not dns_ok and internet_ok:
        cause, action = "DNS 이상", "DNS 서버 설정과 응답 상태를 확인하고 필요하면 DNS 변경을 검토하세요."
    elif ping.packet_loss >= 5:
        cause, action = "패킷 손실", "Wi-Fi 신호, 케이블, 인터페이스 오류와 게이트웨이 구간을 점검하세요."
    elif ping.latency >= 100 or ping.jitter >= 30:
        cause, action = "높은 지연 또는 지터", "혼잡 시간대와 무선 신호를 확인하고 Traceroute의 지연 구간을 점검하세요."
    elif any(item.port in {80, 443} and not item.open for item in ports):
        cause, action = "서버 응답 지연 또는 서비스 미응답", "대상 웹 서비스 상태와 방화벽 정책을 확인하세요."
    else:
        cause, action = "특이 장애 없음", "현재 상태를 유지하며 시간대별 품질 그래프를 관찰하세요."
    risk = "정상" if score >= 90 else "주의" if score >= 70 else "위험"
    open_services = ", ".join(item.service for item in ports if item.open) or "없음"
    return score, risk, cause, assessment, f"{action} 열린 주요 서비스: {open_services}."

async def run_full_diagnostic(ip: str):
    ping_task = asyncio.create_task(ping_host(ip))
    port_tasks = [asyncio.create_task(check_port(ip, port)) for port in SAFE_PORTS]
    dns_task = asyncio.create_task(check_dns())
    internet_task = asyncio.create_task(check_internet())
    trace_task = asyncio.create_task(traceroute(ip))
    ping = await ping_task
    ports = await asyncio.gather(*port_tasks)
    dns_ok, dns_latency = await dns_task
    internet_ok = await internet_task
    hops = await trace_task
    http_results = []
    if next(item for item in ports if item.port == 80).open: http_results.append(await check_http(ip, "http"))
    if next(item for item in ports if item.port == 443).open: http_results.append(await check_http(ip, "https"))
    score, risk, cause, assessment, action = score_and_assess(ping, dns_ok, internet_ok, ports)
    return ping, ports, http_results, dns_ok, dns_latency, internet_ok, hops, score, risk, cause, assessment, action
