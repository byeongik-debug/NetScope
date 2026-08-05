# NetScope

NetScope is an extensible network monitoring and incident-response system:

- `mobile/`: Expo + React Native + TypeScript
- `backend/`: FastAPI + SQLAlchemy + SQLite (PostgreSQL-ready)

## Quick start

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload

# Mobile (another terminal)
cd mobile
npm install
npm start
```

The mobile app defaults to `http://127.0.0.1:8000`. For a physical device, set the
server address in Settings to the computer's LAN IP.

Default portfolio login:

```text
Email: admin@netscope.local
Password: admin
```

Change the default password and `NETSCOPE_SECRET_KEY` before deployment.

The app starts with no devices. Register authorized targets from
**Devices → + IP 등록**.

## Real device monitoring

Start the backend with access to the target network, set the mobile server URL,
then use **Devices → + IP 등록**. Newly registered targets are marked `LIVE`.
The server performs an immediate on-demand Ping and repeats monitoring every
30 seconds. Only register systems you own or are authorized to monitor.

Current real diagnostics:

- ICMP reachability
- Average latency
- Packet loss
- Online / Warning / Offline classification
- Automatic incident and WebSocket event creation
- Persistent latency and packet-loss samples
- Recent measurement charts
- Device rename, type update, monitoring toggle, and deletion
- Mobile Wi-Fi/cellular connection state
- Jitter and time-series quality graphs
- DNS, HTTP, TCP service and Traceroute diagnostics
- Normal / Caution / Danger classification with root-cause guidance
- JWT authentication, organization-scoped devices, and admin/operator/viewer roles
- Incident acknowledgement, notes, assignment fields, and action audit history
- iPhone-originated latency, jitter, request-failure and download-speed tests
- User-specific mobile quality history and score chart

## Portfolio cloud architecture

Cloud Run, PostgreSQL and Secret Manager deployment assets are provided in
[`cloudbuild.yaml`](cloudbuild.yaml) and
[`docs/GCP_DEPLOYMENT.md`](docs/GCP_DEPLOYMENT.md). Cloud APIs aggregate
organization-scoped users, devices and incidents. Private network polling still
requires an on-premise collector or VPN because Cloud Run cannot directly reach
RFC1918 addresses.

CPU, memory, interface bandwidth, and device metadata require the next SNMP or
host-agent integration; they remain zero for Ping-only targets.

## SNMP v2c

Open a LIVE device and select **SNMP**. Enter the read-only community and UDP
port configured on the managed device, run the connection test, then save.
NetScope collects standard system identity, uptime, Host Resources CPU (when
supported), and 64-bit interface counters. Bandwidth appears after at least two
successful collection cycles because it is calculated from counter deltas.

Set a unique `NETSCOPE_SECRET_KEY` in `backend/.env` before production use.
The community is encrypted at rest and never returned by the REST API.
