# Integration adapters

Future collectors and actions live behind this boundary:

- `snmp/`, `netflow/`, `syslog/`
- `prometheus/`, `grafana/`
- `ssh/`, `ping/`, `traceroute/`
- `ai_analysis/`, `llm_recommendations/`
- traffic-series and topology providers

Adapters should emit normalized metrics/events into application services rather
than writing directly to API routes.

