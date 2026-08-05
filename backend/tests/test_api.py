import os
os.environ["NETSCOPE_DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from app.main import app
from app.services.advanced_diagnostics import PortResult, score_and_assess
from app.services.diagnostics import PingResult
from datetime import datetime, timezone

def auth_headers(client: TestClient):
    response = client.post("/api/v1/auth/login", json={"email": "admin@netscope.local", "password": "admin"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}

def test_core_api():
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json() == {"status": "ok"}
        headers = auth_headers(client)
        devices = client.get("/api/v1/devices", headers=headers)
        assert devices.status_code == 200
        assert devices.json() == []
        summary = client.get("/api/v1/dashboard", headers=headers).json()
        assert summary["networkStatus"] == "Healthy"
        assert summary["healthyDevices"] == 0
        diagnostic = {
            "connectionType": "WIFI", "latency": 24.5, "minLatency": 20.1,
            "maxLatency": 31.2, "p95Latency": 29.8, "jitter": 4.2,
            "failureRate": 0, "downloadMbps": 42.1, "qualityScore": 98,
            "riskLevel": "정상", "rootCause": "특이 장애 없음",
            "recommendedAction": "현재 상태를 유지하세요.",
            "symptom": "slow",
            "segments": [{"key": "device", "label": "아이폰 연결", "status": "healthy", "detail": "WIFI 연결됨"}],
            "actionSteps": ["공유기 가까이 이동하세요.", "다시 진단하세요."],
            "completedActions": [],
            "comparisonId": "compare-test",
            "comparisonRole": "first",
        }
        saved = client.post("/api/v1/client-diagnostics", json=diagnostic, headers=headers)
        assert saved.status_code == 201
        diagnostic_id = saved.json()["id"]
        assert saved.json()["symptom"] == "slow"
        detail = client.get(f"/api/v1/client-diagnostics/{diagnostic_id}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["segments"][0]["status"] == "healthy"
        updated = client.patch(f"/api/v1/client-diagnostics/{diagnostic_id}", json={
            "completedActions": [0],
            "comparisonVerdict": "Wi-Fi 환경 문제 가능성이 높습니다.",
        }, headers=headers)
        assert updated.status_code == 200
        assert updated.json()["completedActions"] == [0]
        survey = client.post("/api/v1/wifi-surveys", json={"name": "우리집 Wi-Fi"}, headers=headers)
        assert survey.status_code == 201
        survey_id = survey.json()["id"]
        placement = client.post(f"/api/v1/wifi-surveys/{survey_id}/placements", json={"name": "거실 구석"}, headers=headers)
        assert placement.status_code == 201
        point = client.post(f"/api/v1/wifi-survey-placements/{placement.json()['id']}/points", json={"diagnosticId": diagnostic_id, "locationName": "2층 작업실", "floor": "2층"}, headers=headers)
        assert point.status_code == 201
        assert point.json()["diagnostic"]["p95Latency"] == 29.8
        assert point.json()["diagnostic"]["failureRate"] == 0
        placement_after = client.post(f"/api/v1/wifi-surveys/{survey_id}/placements", json={"name": "계단 중앙"}, headers=headers)
        assert placement_after.status_code == 201
        assert client.post(f"/api/v1/wifi-survey-placements/{placement_after.json()['id']}/points", json={"diagnosticId": diagnostic_id, "locationName": "2층 작업실", "floor": "2층"}, headers=headers).status_code == 201
        report = client.get(f"/api/v1/wifi-surveys/{survey_id}/report", headers=headers)
        assert report.status_code == 200
        assert report.json()["rankings"][0]["name"] == "거실 구석"
        assert report.json()["comparison"]["commonLocationCount"] == 1
        assert report.json()["locationComparisons"][0]["locationName"] == "2층 작업실"
        survey_detail = client.get(f"/api/v1/wifi-surveys/{survey_id}", headers=headers).json()
        assert survey_detail["placements"][0]["points"][0]["locationName"] == "2층 작업실"
        assert survey_detail["placements"][0]["points"][0]["diagnostic"]["p95Latency"] == 29.8
        history = client.get("/api/v1/client-diagnostics", headers=headers).json()
        assert history[-1]["qualityScore"] == 98

def test_missing_incident():
    with TestClient(app) as client:
        headers = auth_headers(client)
        assert client.get("/api/v1/incidents", headers=headers).json() == []
        assert client.post("/api/v1/incidents/999/resolve", headers=headers).status_code == 404

def test_register_real_device():
    with TestClient(app) as client:
        headers = auth_headers(client)
        response = client.post("/api/v1/devices", json={
            "hostname": "Local-Test",
            "ip": "127.0.0.1",
            "type": "Server",
        }, headers=headers)
        assert response.status_code == 201
        assert response.json()["monitorEnabled"] is True
        duplicate = client.post("/api/v1/devices", json={
            "hostname": "Duplicate",
            "ip": "127.0.0.1",
            "type": "Server",
        }, headers=headers)
        assert duplicate.status_code == 409
        device_id = response.json()["id"]
        updated = client.patch(f"/api/v1/devices/{device_id}", json={"hostname": "Local-Renamed", "monitorEnabled": False}, headers=headers)
        assert updated.status_code == 200
        assert updated.json()["hostname"] == "Local-Renamed"
        assert updated.json()["monitorEnabled"] is False
        assert client.get(f"/api/v1/devices/{device_id}/metrics", headers=headers).json() == []
        assert client.delete(f"/api/v1/devices/{device_id}", headers=headers).status_code == 204
        assert client.get(f"/api/v1/devices/{device_id}", headers=headers).status_code == 404

def test_quality_score():
    ping = PingResult(True, 12, 0, 2, datetime.now(timezone.utc))
    score, risk, cause, assessment, action = score_and_assess(ping, True, True, [PortResult(80, "HTTP", True, 4), PortResult(443, "HTTPS", True, 5)])
    assert score == 100
    assert risk == "정상"
    assert "매우 좋습니다" in assessment
    assert "HTTP" in action
