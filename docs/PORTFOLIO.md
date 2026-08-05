# NetScope portfolio summary

> 네트워크 품질을 실시간 측정하고 장애 원인 분석 및 대응 가이드를
> 제공하는 모바일 네트워크 관제 애플리케이션

## Implemented highlights

- React Native (Expo) mobile client and FastAPI REST/WebSocket backend
- Wi-Fi/cellular connectivity and internet reachability presentation
- On-device iPhone quality test using repeated HTTP round trips and controlled
  download measurement, independent of router SNMP support
- Two warm-up requests and twelve measured samples with min, average, P95 and
  max latency, jitter, failure rate and download throughput
- Stage-by-stage diagnosis progress, previous-result comparison and native
  shareable diagnosis reports
- Use-case suitability assessment for web browsing, video calls, streaming and
  online gaming
- Symptom-guided diagnosis for outages, slow access, video calls, gaming,
  specific-site failures and recurring Wi-Fi disconnections
- Four-stage fault isolation across the iPhone link, internet reachability,
  DNS/name-based external access and the NetScope diagnostic server
- Action checklist and before/after retest comparison to verify whether a
  recommended remediation actually improved the connection
- Guided Wi-Fi versus cellular A/B diagnosis with network-switch validation,
  side-by-side quality metrics and automatic local-Wi-Fi/carrier fault hints
- Persistent diagnosis sessions including selected symptoms, per-segment
  results, remediation completion and grouped A/B comparison verdicts
- Drill-down history detail with saved metrics, fault path, action audit and
  shareable historical reports
- Home Wi-Fi site-survey projects with multiple router-placement candidates,
  floor/room tags and repeated measurements per location
- Placement ranking based on whole-home average quality, weakest-room score,
  spatial score deviation, P95 latency and request failure rate
- Automatic before/after evidence including average and minimum score deltas,
  P95 reduction and room-to-room quality-variance reduction
- Room-by-room before/after matching with comparison-confidence checks and a
  native shareable report containing score, P95, jitter and failure changes
- Ping latency, packet loss and jitter with persistent time-series charts
- DNS response, TCP services, HTTP latency and Traceroute inspection
- Normal / Caution / Danger scoring
- Root-cause categories: disconnection, latency/jitter, packet loss, DNS and
  server/service response
- Action guidance such as DNS configuration, gateway/path and service checks
- JWT authentication and organization-scoped multi-user RBAC
- Incident acknowledgement, operator notes, resolution and audit trail
- Four-stage incident workflow, assignee selection and visual action timeline
- 24-hour incident analytics, availability, MTTR and unstable-device insight
- SQLite development database with PostgreSQL-ready SQLAlchemy repositories
- GCP Cloud Run, Cloud SQL and Secret Manager deployment configuration

## Architecture note

The GCP control plane aggregates users and monitoring data. Private IP polling
must run through an on-premise collector or network connectivity such as VPN;
the development laptop currently performs this collector role.
