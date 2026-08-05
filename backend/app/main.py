import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from app.api.auth_routes import router as auth_router
from app.core.auth import bootstrap_identity
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.migrations import migrate_existing_database
from app.realtime.manager import manager
from app.services.diagnostics import monitoring_loop
from app.core.auth import decode_access_token

@asynccontextmanager
async def lifespan(_: FastAPI):
    migrate_existing_database(engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db: bootstrap_identity(db)
    task = asyncio.create_task(monitoring_loop(SessionLocal))
    yield
    task.cancel()

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)

@app.websocket("/ws/events")
async def events_socket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401); return
    try: payload = decode_access_token(token)
    except Exception:
        await websocket.close(code=4401); return
    await manager.connect(websocket, int(payload["org"]))
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
