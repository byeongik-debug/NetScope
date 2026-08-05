# GCP deployment

NetScope API is prepared for Cloud Run in Seoul (`asia-northeast3`) with Cloud
SQL for PostgreSQL and Secret Manager.

Required secrets:

- `netscope-secret-key`: long random JWT/encryption secret
- `netscope-database-url`: SQLAlchemy URL such as
  `postgresql+psycopg://USER:PASSWORD@HOST:5432/netscope`

The cloud API provides organization-scoped authentication, device inventory,
incidents, audit actions, and unified dashboards for multiple users.

Important: Cloud Run cannot directly reach private home/office IP addresses.
Ping, SNMP and Traceroute for RFC1918 devices still require an on-premise
collector or VPN/VPC connectivity. The current laptop backend acts as that
collector during development; a separate lightweight collector is the next
production deployment step.
