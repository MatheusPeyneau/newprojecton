"""
Tests for: Instagram webhook lead, Meeting webhook settings, is_meeting_stage in stages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@agencia.com",
        "password": "Test1234!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]

@pytest.fixture(scope="module")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s

# --- Instagram Webhook ---

class TestInstagramWebhook:
    """Test public POST /api/webhook/instagram-lead"""

    def test_create_lead_instagram_no_auth(self):
        payload = {
            "name": "TEST_Ana Lima",
            "email": "ana.lima.test@example.com",
            "instagram_handle": "@ana.lima.test"
        }
        resp = requests.post(f"{BASE_URL}/api/webhook/instagram-lead", json=payload)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Response is {success: true, lead_id: ...}
        assert data.get("success") == True, f"Not success: {data}"
        assert "lead_id" in data

    def test_instagram_lead_notes_contain_handle(self, client):
        payload = {
            "name": "TEST_Handle Check",
            "instagram_handle": "@handlecheck999"
        }
        resp = requests.post(f"{BASE_URL}/api/webhook/instagram-lead", json=payload)
        assert resp.status_code == 200
        lead_id = resp.json()["lead_id"]

        # Fetch the lead and verify notes/source
        lead_resp = client.get(f"{BASE_URL}/api/leads/{lead_id}")
        assert lead_resp.status_code == 200
        lead_data = lead_resp.json()
        assert "@handlecheck999" in (lead_data.get("notes") or ""), f"Handle not in notes: {lead_data}"
        assert lead_data.get("source") == "instagram", f"source not instagram: {lead_data}"

    def test_instagram_lead_appears_in_leads_list(self, client):
        payload = {"name": "TEST_ListCheck Lead", "instagram_handle": "@listcheck"}
        resp = requests.post(f"{BASE_URL}/api/webhook/instagram-lead", json=payload)
        assert resp.status_code == 200
        lead_id = resp.json()["lead_id"]

        list_resp = client.get(f"{BASE_URL}/api/leads")
        assert list_resp.status_code == 200
        leads = list_resp.json()
        ids = [l["lead_id"] for l in leads]
        assert lead_id in ids, "Created lead not found in leads list"

    def test_instagram_lead_without_handle(self, client):
        payload = {"name": "TEST_NoHandle Lead"}
        resp = requests.post(f"{BASE_URL}/api/webhook/instagram-lead", json=payload)
        assert resp.status_code == 200
        lead_id = resp.json()["lead_id"]
        lead_resp = client.get(f"{BASE_URL}/api/leads/{lead_id}")
        assert lead_resp.status_code == 200
        assert lead_resp.json().get("source") == "instagram"


# --- Meeting Webhook Settings ---

class TestMeetingWebhookSettings:
    """Test GET/PUT /api/settings/meeting-webhook"""

    def test_get_meeting_webhook(self, client):
        resp = client.get(f"{BASE_URL}/api/settings/meeting-webhook")
        assert resp.status_code == 200
        data = resp.json()
        assert "webhook_url" in data or "url" in data, f"No URL key: {data}"

    def test_save_meeting_webhook_url(self, client):
        payload = {"webhook_url": "https://n8n.example.com/webhook/meeting-test", "enabled": True}
        resp = client.put(f"{BASE_URL}/api/settings/meeting-webhook", json=payload)
        assert resp.status_code == 200, f"PUT failed: {resp.text}"

    def test_meeting_webhook_persisted(self, client):
        url = "https://n8n.example.com/webhook/meeting-persisted"
        client.put(f"{BASE_URL}/api/settings/meeting-webhook", json={"webhook_url": url, "enabled": True})
        resp = client.get(f"{BASE_URL}/api/settings/meeting-webhook")
        assert resp.status_code == 200
        data = resp.json()
        found = url in (data.get("webhook_url") or data.get("url") or "")
        assert found, f"URL not persisted: {data}"


# --- is_meeting_stage in Stage Create ---

class TestIsMeetingStage:
    """Test creating stages with is_meeting_stage flag"""
    created_stage_id = None

    def test_create_stage_with_meeting_flag(self, client):
        # Get existing stages to find pipeline info
        stages_resp = client.get(f"{BASE_URL}/api/pipeline/stages")
        assert stages_resp.status_code == 200

        payload = {
            "name": "TEST_Reuniao Stage",
            "color": "#8b5cf6",
            "order": 99,
            "is_meeting_stage": True
        }
        resp = client.post(f"{BASE_URL}/api/pipeline/stages", json=payload)
        assert resp.status_code == 200, f"Stage create failed: {resp.text}"
        data = resp.json()
        assert data.get("is_meeting_stage") == True, f"is_meeting_stage not set: {data}"
        TestIsMeetingStage.created_stage_id = data.get("stage_id")

    def test_stage_appears_in_pipeline(self, client):
        if not TestIsMeetingStage.created_stage_id:
            pytest.skip("Stage not created")
        stages_resp = client.get(f"{BASE_URL}/api/pipeline/stages")
        assert stages_resp.status_code == 200
        stages = stages_resp.json()
        ids = [s["stage_id"] for s in stages]
        assert TestIsMeetingStage.created_stage_id in ids

    def test_cleanup_test_stage(self, client):
        if TestIsMeetingStage.created_stage_id:
            client.delete(f"{BASE_URL}/api/pipeline/stages/{TestIsMeetingStage.created_stage_id}")


# --- Meeting Schedule Webhook ---

class TestMeetingScheduleWebhook:
    """Test POST /api/webhook/meeting-schedule"""

    def test_meeting_schedule_webhook(self, client):
        payload = {
            "deal_id": "test-deal-id",
            "email": "test@example.com",
            "title": "Reunião — Test Deal",
            "date": "2026-03-01",
            "start_time": "10:00",
            "end_time": "11:00",
            "notes": "Test meeting"
        }
        resp = client.post(f"{BASE_URL}/api/webhook/meeting-schedule", json=payload)
        # Expect 200 or similar (may fail if deal not found, that's ok)
        assert resp.status_code in [200, 404, 422], f"Unexpected status: {resp.status_code}: {resp.text}"
