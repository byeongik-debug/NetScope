from sqlalchemy import inspect, text

def migrate_existing_database(engine) -> None:
    """Small bootstrap migration for the pre-Alembic development database."""
    inspector = inspect(engine)
    if "devices" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("devices")}
    if "monitor_enabled" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE devices ADD COLUMN monitor_enabled BOOLEAN NOT NULL DEFAULT 0"))
    additions = {
        "organization_id": "INTEGER",
        "snmp_enabled": "BOOLEAN NOT NULL DEFAULT 0",
        "snmp_port": "INTEGER NOT NULL DEFAULT 161",
        "snmp_community_encrypted": "TEXT",
        "snmp_sys_name": "VARCHAR(255)",
        "snmp_sys_description": "TEXT",
        "snmp_uptime": "FLOAT NOT NULL DEFAULT 0",
        "snmp_last_octets": "FLOAT",
        "snmp_last_collected_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE devices ADD COLUMN {name} {definition}"))
    inspector = inspect(engine)
    if "metric_samples" in inspector.get_table_names():
        metric_columns = {column["name"] for column in inspector.get_columns("metric_samples")}
        with engine.begin() as connection:
            for name in ("cpu", "memory", "bandwidth", "jitter"):
                if name not in metric_columns:
                    connection.execute(text(f"ALTER TABLE metric_samples ADD COLUMN {name} FLOAT NOT NULL DEFAULT 0"))
    if "incidents" in inspector.get_table_names():
        incident_columns = {column["name"] for column in inspector.get_columns("incidents")}
        incident_additions = {
            "assigned_to_id": "INTEGER",
            "acknowledged_at": "DATETIME",
            "resolution_notes": "TEXT",
        }
        with engine.begin() as connection:
            for name, definition in incident_additions.items():
                if name not in incident_columns:
                    connection.execute(text(f"ALTER TABLE incidents ADD COLUMN {name} {definition}"))
    if "client_diagnostics" in inspector.get_table_names():
        diagnostic_columns = {column["name"] for column in inspector.get_columns("client_diagnostics")}
        diagnostic_additions = {
            "min_latency": "FLOAT NOT NULL DEFAULT 0",
            "max_latency": "FLOAT NOT NULL DEFAULT 0",
            "p95_latency": "FLOAT NOT NULL DEFAULT 0",
            "symptom": "VARCHAR(40)",
            "segments": "JSON NOT NULL DEFAULT '[]'",
            "action_steps": "JSON NOT NULL DEFAULT '[]'",
            "completed_actions": "JSON NOT NULL DEFAULT '[]'",
            "comparison_id": "VARCHAR(80)",
            "comparison_role": "VARCHAR(10)",
            "comparison_verdict": "TEXT",
        }
        with engine.begin() as connection:
            for name, definition in diagnostic_additions.items():
                if name not in diagnostic_columns:
                    connection.execute(text(f"ALTER TABLE client_diagnostics ADD COLUMN {name} {definition}"))
