import asyncio
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self): self.connections: dict[WebSocket, int] = {}
    async def connect(self, websocket: WebSocket, organization_id: int):
        await websocket.accept(); self.connections[websocket] = organization_id
    def disconnect(self, websocket: WebSocket):
        self.connections.pop(websocket, None)
    async def broadcast(self, payload: dict, organization_id: int | None = None):
        for connection, connection_org in list(self.connections.items()):
            if organization_id is not None and connection_org != organization_id: continue
            try: await connection.send_json(payload)
            except Exception: self.disconnect(connection)

manager = ConnectionManager()

async def demo_event_stream():
    samples = [
        {"id": 1001, "deviceId": 1, "deviceName": "Router01", "message": "Packet Loss 35%", "severity": "High"},
        {"id": 1002, "deviceId": 2, "deviceName": "Switch02", "message": "Device Offline", "severity": "Critical"},
        {"id": 1003, "deviceId": 3, "deviceName": "Firewall01", "message": "CPU 98%", "severity": "Critical"},
    ]
    index = 0
    while True:
        await asyncio.sleep(12)
        if manager.connections:
            from datetime import datetime, timezone
            sample = samples[index % len(samples)]
            payload = {
                **sample,
                "id": 1001 + index,
                "occurredAt": datetime.now(timezone.utc).isoformat(),
            }
            await manager.broadcast(payload); index += 1
