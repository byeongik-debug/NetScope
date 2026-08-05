from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.network import NetworkRepository
from app.schemas.network import ClientDiagnosticIn, ClientDiagnosticOut, ClientDiagnosticSessionUpdate, DashboardOut, DeviceCreate, DeviceOut, DeviceUpdate, DiagnosticOut, EventOut, FullDiagnosticOut, HttpCheckOut, IncidentActionIn, IncidentActionOut, IncidentOut, IncidentWorkflowIn, MetricSampleOut, OperationsAnalyticsOut, PortCheckOut, SnmpConfigIn, SnmpTestOut, WifiSurveyCreate, WifiSurveyPlacementCreate, WifiSurveyPointCreate
from app.services.diagnostics import diagnose_and_store
from app.core.secrets import encrypt_secret
from app.integrations.snmp.collector import collect_v2c
from app.services.advanced_diagnostics import run_full_diagnostic
from app.services.network import dashboard, event_out, incident_out
from app.core.auth import get_current_user, require_operator
from app.models import ClientDiagnostic, IncidentAction, User, WifiSurvey, WifiSurveyPlacement, WifiSurveyPoint
from datetime import datetime, timedelta
from collections import Counter
from statistics import pstdev

router = APIRouter()
def repo(db: Session = Depends(get_db), user: User = Depends(get_current_user)): return NetworkRepository(db, user.organization_id)

@router.get("/health")
def health(): return {"status": "ok"}

@router.get("/dashboard", response_model=DashboardOut, response_model_by_alias=True)
def get_dashboard(repository: NetworkRepository = Depends(repo)): return dashboard(repository)

@router.get("/devices", response_model=list[DeviceOut], response_model_by_alias=True)
def get_devices(repository: NetworkRepository = Depends(repo)): return repository.list_devices()

@router.post("/devices", response_model=DeviceOut, response_model_by_alias=True, status_code=201)
def create_device(payload: DeviceCreate, repository: NetworkRepository = Depends(repo)):
    if repository.get_device_by_ip(payload.ip):
        raise HTTPException(409, "IP address already registered")
    try:
        return repository.add_device(payload.hostname, payload.ip, payload.type)
    except Exception as exc:
        repository.db.rollback()
        raise HTTPException(409, "Hostname already registered") from exc

@router.get("/devices/{device_id}", response_model=DeviceOut, response_model_by_alias=True)
def get_device(device_id: int, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    return item

@router.patch("/devices/{device_id}", response_model=DeviceOut, response_model_by_alias=True)
def update_device(device_id: int, payload: DeviceUpdate, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    try:
        return repository.update_device(item, payload.model_dump(exclude_unset=True))
    except Exception as exc:
        repository.db.rollback()
        raise HTTPException(409, "Hostname already registered") from exc

@router.delete("/devices/{device_id}", status_code=204)
def delete_device(device_id: int, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    repository.delete_device(item)
    return Response(status_code=204)

@router.post("/devices/{device_id}/diagnose", response_model=DiagnosticOut, response_model_by_alias=True)
async def diagnose_device(device_id: int, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    result = await diagnose_and_store(repository.db, item)
    return DiagnosticOut(device_id=item.id, reachable=result.reachable, latency=result.latency, packet_loss=result.packet_loss, jitter=result.jitter, checked_at=result.checked_at)

@router.get("/devices/{device_id}/metrics", response_model=list[MetricSampleOut], response_model_by_alias=True)
def get_device_metrics(device_id: int, limit: int = Query(default=30, ge=1, le=500), repository: NetworkRepository = Depends(repo)):
    if not repository.get_device(device_id): raise HTTPException(404, "Device not found")
    return repository.metric_samples(device_id, limit)

@router.put("/devices/{device_id}/snmp", response_model=DeviceOut, response_model_by_alias=True)
def configure_snmp(device_id: int, payload: SnmpConfigIn, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    item.snmp_enabled = payload.enabled
    item.snmp_port = payload.port
    item.snmp_community_encrypted = encrypt_secret(payload.community)
    repository.db.commit(); repository.db.refresh(item)
    return item

@router.post("/devices/{device_id}/snmp/test", response_model=SnmpTestOut, response_model_by_alias=True)
async def test_snmp(device_id: int, payload: SnmpConfigIn, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    try:
        result = await collect_v2c(item.ip, payload.community, payload.port)
        return SnmpTestOut(success=True, message="SNMP 응답 정상", sys_name=result.sys_name, sys_description=result.sys_description, uptime=result.uptime, cpu=result.cpu)
    except Exception as exc:
        return SnmpTestOut(success=False, message=f"SNMP 응답 실패: {exc}")

@router.post("/devices/{device_id}/diagnostics/full", response_model=FullDiagnosticOut, response_model_by_alias=True)
async def full_diagnostic(device_id: int, repository: NetworkRepository = Depends(repo)):
    item = repository.get_device(device_id)
    if not item: raise HTTPException(404, "Device not found")
    ping, ports, http_results, dns_ok, dns_latency, internet_ok, hops, score, risk, cause, assessment, action = await run_full_diagnostic(item.ip)
    return FullDiagnosticOut(
        device_id=item.id, checked_at=ping.checked_at, reachable=ping.reachable,
        latency=ping.latency, packet_loss=ping.packet_loss, jitter=ping.jitter,
        ports=[PortCheckOut(**vars(result)) for result in ports],
        http=[HttpCheckOut(**vars(result)) for result in http_results],
        dns_reachable=dns_ok, dns_latency=dns_latency,
        internet_reachable=internet_ok, traceroute_hops=hops,
        quality_score=score, risk_level=risk, root_cause=cause, assessment=assessment, recommended_action=action,
    )

@router.get("/events", response_model=list[EventOut], response_model_by_alias=True)
def get_events(repository: NetworkRepository = Depends(repo)): return [event_out(x) for x in repository.list_events()]

@router.get("/incidents", response_model=list[IncidentOut], response_model_by_alias=True)
def get_incidents(repository: NetworkRepository = Depends(repo)): return [incident_out(x) for x in repository.list_incidents()]

@router.post("/incidents/{incident_id}/resolve", response_model=IncidentOut, response_model_by_alias=True)
def resolve(incident_id: int, payload: IncidentActionIn = IncidentActionIn(), repository: NetworkRepository = Depends(repo), user: User = Depends(require_operator)):
    item = repository.resolve_incident(incident_id)
    if not item: raise HTTPException(404, "Incident not found")
    item.resolution_notes = payload.note
    repository.db.add(IncidentAction(incident_id=item.id, user_id=user.id, action="Resolved", note=payload.note))
    repository.db.commit(); repository.db.refresh(item)
    return incident_out(item)

@router.post("/incidents/{incident_id}/acknowledge", response_model=IncidentOut, response_model_by_alias=True)
def acknowledge(incident_id: int, payload: IncidentActionIn = IncidentActionIn(), repository: NetworkRepository = Depends(repo), user: User = Depends(require_operator)):
    item = repository.get_incident(incident_id)
    if not item: raise HTTPException(404, "Incident not found")
    item.status = "Acknowledged"; item.acknowledged_at = datetime.utcnow()
    if payload.assigned_to_id is not None: item.assigned_to_id = payload.assigned_to_id
    repository.db.add(IncidentAction(incident_id=item.id, user_id=user.id, action="Acknowledged", note=payload.note))
    repository.db.commit(); repository.db.refresh(item)
    return incident_out(item)

@router.post("/incidents/{incident_id}/notes", response_model=IncidentActionOut, response_model_by_alias=True)
def add_incident_note(incident_id: int, payload: IncidentActionIn, repository: NetworkRepository = Depends(repo), user: User = Depends(require_operator)):
    if not repository.get_incident(incident_id): raise HTTPException(404, "Incident not found")
    action = IncidentAction(incident_id=incident_id, user_id=user.id, action="Note", note=payload.note)
    repository.db.add(action); repository.db.commit(); repository.db.refresh(action)
    return IncidentActionOut(id=action.id, incident_id=action.incident_id, user_id=action.user_id, user_name=user.display_name, action=action.action, note=action.note, created_at=action.created_at)

@router.get("/incidents/{incident_id}/actions", response_model=list[IncidentActionOut], response_model_by_alias=True)
def incident_actions(incident_id: int, repository: NetworkRepository = Depends(repo)):
    if not repository.get_incident(incident_id): raise HTTPException(404, "Incident not found")
    rows = repository.db.query(IncidentAction, User).join(User, User.id == IncidentAction.user_id).filter(IncidentAction.incident_id == incident_id).order_by(IncidentAction.created_at).all()
    return [IncidentActionOut(id=action.id, incident_id=action.incident_id, user_id=action.user_id, user_name=actor.display_name, action=action.action, note=action.note, created_at=action.created_at) for action, actor in rows]

@router.patch("/incidents/{incident_id}/workflow", response_model=IncidentOut, response_model_by_alias=True)
def update_incident_workflow(incident_id: int, payload: IncidentWorkflowIn, repository: NetworkRepository = Depends(repo), user: User = Depends(require_operator)):
    item = repository.get_incident(incident_id)
    if not item: raise HTTPException(404, "Incident not found")
    if payload.assigned_to_id is not None:
        assignee = repository.db.get(User, payload.assigned_to_id)
        if not assignee or assignee.organization_id != user.organization_id:
            raise HTTPException(400, "Invalid assignee")
        item.assigned_to_id = assignee.id
    item.status = payload.status
    if payload.status == "Acknowledged" and not item.acknowledged_at: item.acknowledged_at = datetime.utcnow()
    if payload.status == "Resolved":
        item.resolved_at = datetime.utcnow(); item.resolution_notes = payload.note
    elif payload.status != "Resolved":
        item.resolved_at = None
    repository.db.add(IncidentAction(incident_id=item.id, user_id=user.id, action=payload.status, note=payload.note))
    repository.db.commit(); repository.db.refresh(item)
    return incident_out(item)

@router.get("/analytics/operations", response_model=OperationsAnalyticsOut, response_model_by_alias=True)
def operations_analytics(repository: NetworkRepository = Depends(repo)):
    since = datetime.utcnow() - timedelta(hours=24)
    incidents = repository.list_incidents()
    recent = [item for item in incidents if item.occurred_at >= since]
    resolved = [item for item in recent if item.resolved_at]
    durations = [(item.resolved_at - item.occurred_at).total_seconds() / 60 for item in resolved]
    devices = repository.list_devices()
    samples = []
    for device in devices: samples.extend(repository.metric_samples(device.id, 500))
    samples = [sample for sample in samples if sample.measured_at >= since]
    availability = round(sum(sample.reachable for sample in samples) / len(samples) * 100, 1) if samples else 100
    device_counts = Counter(item.device.hostname for item in recent)
    cause_counts = Counter(item.problem for item in recent)
    return OperationsAnalyticsOut(
        incidents_24h=len(recent), open_incidents=sum(item.status != "Resolved" for item in incidents),
        resolved_24h=len(resolved), mean_time_to_resolve=round(sum(durations) / len(durations), 1) if durations else 0,
        availability=availability, unstable_device=device_counts.most_common(1)[0][0] if device_counts else None,
        top_cause=cause_counts.most_common(1)[0][0] if cause_counts else None,
    )

@router.get("/client-diagnostics/pulse")
def client_pulse(user: User = Depends(get_current_user)):
    return {"ok": True, "serverTime": datetime.utcnow().isoformat(), "userId": user.id}

@router.get("/client-diagnostics/download")
def client_download(size_kb: int = Query(default=512, ge=64, le=2048), user: User = Depends(get_current_user)):
    return Response(content=b"0" * (size_kb * 1024), media_type="application/octet-stream", headers={"Cache-Control": "no-store"})

@router.post("/client-diagnostics", response_model=ClientDiagnosticOut, response_model_by_alias=True, status_code=201)
def save_client_diagnostic(payload: ClientDiagnosticIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = ClientDiagnostic(user_id=user.id, **payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("/client-diagnostics", response_model=list[ClientDiagnosticOut], response_model_by_alias=True)
def client_diagnostic_history(limit: int = Query(default=30, ge=1, le=200), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(ClientDiagnostic).filter(ClientDiagnostic.user_id == user.id).order_by(ClientDiagnostic.measured_at.desc()).limit(limit).all()
    return list(reversed(rows))

@router.get("/client-diagnostics/{diagnostic_id}", response_model=ClientDiagnosticOut, response_model_by_alias=True)
def client_diagnostic_detail(diagnostic_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(ClientDiagnostic).filter(ClientDiagnostic.id == diagnostic_id, ClientDiagnostic.user_id == user.id).first()
    if not item: raise HTTPException(404, "Diagnostic not found")
    return item

@router.patch("/client-diagnostics/{diagnostic_id}", response_model=ClientDiagnosticOut, response_model_by_alias=True)
def update_client_diagnostic(diagnostic_id: int, payload: ClientDiagnosticSessionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(ClientDiagnostic).filter(ClientDiagnostic.id == diagnostic_id, ClientDiagnostic.user_id == user.id).first()
    if not item: raise HTTPException(404, "Diagnostic not found")
    for name, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, name, value)
    db.commit(); db.refresh(item)
    return item

def client_diagnostic_data(item: ClientDiagnostic):
    return ClientDiagnosticOut.model_validate(item).model_dump(by_alias=True, mode="json")

def wifi_survey_detail_data(survey: WifiSurvey, db: Session):
    placements = db.query(WifiSurveyPlacement).filter(WifiSurveyPlacement.survey_id == survey.id).order_by(WifiSurveyPlacement.id).all()
    result = []
    for placement in placements:
        rows = db.query(WifiSurveyPoint, ClientDiagnostic).join(ClientDiagnostic, ClientDiagnostic.id == WifiSurveyPoint.diagnostic_id).filter(WifiSurveyPoint.placement_id == placement.id).order_by(WifiSurveyPoint.measured_at).all()
        result.append({"id": placement.id, "name": placement.name, "createdAt": placement.created_at, "points": [{"id": point.id, "locationName": point.location_name, "floor": point.floor, "measuredAt": point.measured_at, "diagnostic": client_diagnostic_data(diagnostic)} for point, diagnostic in rows]})
    return {"id": survey.id, "name": survey.name, "createdAt": survey.created_at, "placements": result}

@router.get("/wifi-surveys")
def list_wifi_surveys(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    surveys = db.query(WifiSurvey).filter(WifiSurvey.user_id == user.id).order_by(WifiSurvey.created_at.desc()).all()
    return [{"id": item.id, "name": item.name, "createdAt": item.created_at, "placementCount": db.query(WifiSurveyPlacement).filter(WifiSurveyPlacement.survey_id == item.id).count(), "measurementCount": db.query(WifiSurveyPoint).join(WifiSurveyPlacement, WifiSurveyPlacement.id == WifiSurveyPoint.placement_id).filter(WifiSurveyPlacement.survey_id == item.id).count()} for item in surveys]

@router.post("/wifi-surveys", status_code=201)
def create_wifi_survey(payload: WifiSurveyCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = WifiSurvey(user_id=user.id, name=payload.name.strip())
    db.add(item); db.commit(); db.refresh(item)
    return wifi_survey_detail_data(item, db)

@router.get("/wifi-surveys/{survey_id}")
def get_wifi_survey(survey_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(WifiSurvey).filter(WifiSurvey.id == survey_id, WifiSurvey.user_id == user.id).first()
    if not item: raise HTTPException(404, "Wi-Fi survey not found")
    return wifi_survey_detail_data(item, db)

@router.post("/wifi-surveys/{survey_id}/placements", status_code=201)
def create_wifi_survey_placement(survey_id: int, payload: WifiSurveyPlacementCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    survey = db.query(WifiSurvey).filter(WifiSurvey.id == survey_id, WifiSurvey.user_id == user.id).first()
    if not survey: raise HTTPException(404, "Wi-Fi survey not found")
    item = WifiSurveyPlacement(survey_id=survey.id, name=payload.name.strip())
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "name": item.name, "createdAt": item.created_at, "points": []}

@router.post("/wifi-survey-placements/{placement_id}/points", status_code=201)
def create_wifi_survey_point(placement_id: int, payload: WifiSurveyPointCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    placement = db.query(WifiSurveyPlacement).join(WifiSurvey, WifiSurvey.id == WifiSurveyPlacement.survey_id).filter(WifiSurveyPlacement.id == placement_id, WifiSurvey.user_id == user.id).first()
    diagnostic = db.query(ClientDiagnostic).filter(ClientDiagnostic.id == payload.diagnostic_id, ClientDiagnostic.user_id == user.id).first()
    if not placement or not diagnostic: raise HTTPException(404, "Placement or diagnostic not found")
    item = WifiSurveyPoint(placement_id=placement.id, diagnostic_id=diagnostic.id, location_name=payload.location_name.strip(), floor=payload.floor.strip())
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "locationName": item.location_name, "floor": item.floor, "measuredAt": item.measured_at, "diagnostic": client_diagnostic_data(diagnostic)}

@router.get("/wifi-surveys/{survey_id}/report")
def wifi_survey_report(survey_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    survey = db.query(WifiSurvey).filter(WifiSurvey.id == survey_id, WifiSurvey.user_id == user.id).first()
    if not survey: raise HTTPException(404, "Wi-Fi survey not found")
    placements = db.query(WifiSurveyPlacement).filter(WifiSurveyPlacement.survey_id == survey.id).order_by(WifiSurveyPlacement.id).all()
    rankings = []
    placement_locations = {}
    for placement in placements:
        rows = db.query(WifiSurveyPoint, ClientDiagnostic).join(ClientDiagnostic, ClientDiagnostic.id == WifiSurveyPoint.diagnostic_id).filter(WifiSurveyPoint.placement_id == placement.id).all()
        diagnostics = [diagnostic for _, diagnostic in rows]
        if not diagnostics: continue
        location_groups = {}
        for point, diagnostic in rows:
            key = f"{point.floor.strip().lower()}|{point.location_name.strip().lower()}"
            group = location_groups.setdefault(key, {"floor": point.floor, "locationName": point.location_name, "items": []})
            group["items"].append(diagnostic)
        placement_locations[placement.id] = {key: {"floor": group["floor"], "locationName": group["locationName"], "sampleCount": len(group["items"]), "averageScore": round(sum(item.quality_score for item in group["items"]) / len(group["items"]), 1), "averageP95": round(sum(item.p95_latency for item in group["items"]) / len(group["items"]), 1), "averageJitter": round(sum(item.jitter for item in group["items"]) / len(group["items"]), 1), "averageFailureRate": round(sum(item.failure_rate for item in group["items"]) / len(group["items"]), 1)} for key, group in location_groups.items()}
        scores = [item.quality_score for item in diagnostics]
        average_score = sum(scores) / len(scores); deviation = pstdev(scores) if len(scores) > 1 else 0; minimum_score = min(scores)
        placement_score = max(0, average_score - deviation * 0.5 - max(0, 70 - minimum_score) * 0.3)
        rankings.append({"placementId": placement.id, "name": placement.name, "measurementCount": len(scores), "averageScore": round(average_score, 1), "minimumScore": minimum_score, "scoreDeviation": round(deviation, 1), "averageP95": round(sum(item.p95_latency for item in diagnostics) / len(diagnostics), 1), "averageFailureRate": round(sum(item.failure_rate for item in diagnostics) / len(diagnostics), 1), "placementScore": round(placement_score, 1)})
    ordered_rankings = list(rankings)
    baseline = ordered_rankings[0] if ordered_rankings else None
    rankings.sort(key=lambda item: item["placementScore"], reverse=True)
    recommended = rankings[0] if rankings else None
    comparison = None
    comparison_target = recommended if baseline and recommended and baseline["placementId"] != recommended["placementId"] else ordered_rankings[-1] if len(ordered_rankings) > 1 else None
    location_comparisons = []
    comparison_confidence = None
    if baseline and comparison_target:
        baseline_locations = placement_locations.get(baseline["placementId"], {})
        target_locations = placement_locations.get(comparison_target["placementId"], {})
        common_keys = sorted(set(baseline_locations) & set(target_locations))
        for key in common_keys:
            before = baseline_locations[key]; after = target_locations[key]
            location_comparisons.append({"floor": before["floor"], "locationName": before["locationName"], "beforeSampleCount": before["sampleCount"], "afterSampleCount": after["sampleCount"], "beforeScore": before["averageScore"], "afterScore": after["averageScore"], "scoreDelta": round(after["averageScore"] - before["averageScore"], 1), "beforeP95": before["averageP95"], "afterP95": after["averageP95"], "p95Delta": round(after["averageP95"] - before["averageP95"], 1), "beforeJitter": before["averageJitter"], "afterJitter": after["averageJitter"], "beforeFailureRate": before["averageFailureRate"], "afterFailureRate": after["averageFailureRate"]})
        complete_locations = set(baseline_locations) == set(target_locations)
        sufficient_samples = bool(common_keys) and all(baseline_locations[key]["sampleCount"] >= 3 and target_locations[key]["sampleCount"] >= 3 for key in common_keys)
        comparison_confidence = "높음" if complete_locations and sufficient_samples else "보통" if len(common_keys) >= 2 else "낮음"
        comparison = {
            "baselineName": baseline["name"], "recommendedName": comparison_target["name"],
            "averageScoreDelta": round(comparison_target["averageScore"] - baseline["averageScore"], 1),
            "minimumScoreDelta": round(comparison_target["minimumScore"] - baseline["minimumScore"], 1),
            "p95ReductionPercent": round((baseline["averageP95"] - comparison_target["averageP95"]) / baseline["averageP95"] * 100, 1) if baseline["averageP95"] else 0,
            "deviationReductionPercent": round((baseline["scoreDeviation"] - comparison_target["scoreDeviation"]) / baseline["scoreDeviation"] * 100, 1) if baseline["scoreDeviation"] else 0,
            "confidence": comparison_confidence, "commonLocationCount": len(common_keys), "baselineLocationCount": len(baseline_locations), "afterLocationCount": len(target_locations),
        }
    location_comparisons.sort(key=lambda item: item["scoreDelta"], reverse=True)
    return {"surveyId": survey.id, "recommendedPlacementId": recommended["placementId"] if recommended else None, "summary": f"{recommended['name']} 배치가 전체 위치의 평균 품질과 균일성 기준으로 가장 안정적입니다." if recommended else "측정 데이터가 필요합니다.", "comparison": comparison, "locationComparisons": location_comparisons, "rankings": rankings}
