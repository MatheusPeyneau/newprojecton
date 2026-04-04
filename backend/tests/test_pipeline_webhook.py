"""Pipeline Webhook feature tests: stage webhook config, deal fire-webhook, webhook-logs, cpf_cnpj/billing_type fields"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def stage_id(headers):
    res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
    assert res.status_code == 200
    stages = res.json()
    assert len(stages) > 0
    return stages[0]["stage_id"]

@pytest.fixture(scope="module")
def deal_id(headers, stage_id):
    """Create a deal with cpf_cnpj and billing_type for testing"""
    payload = {
        "title": "TEST_Webhook Deal",
        "value": 999.99,
        "stage_id": stage_id,
        "contact_name": "TEST_User",
        "email": "test_webhook@example.com",
        "phone": "11999990000",
        "cpf_cnpj": "12345678901",
        "billing_type": "PIX",
        "due_date": "2025-12-31",
        "probability": 70,
    }
    res = requests.post(f"{BASE_URL}/api/pipeline/deals", json=payload, headers=headers)
    assert res.status_code == 200
    d = res.json()
    yield d["deal_id"]
    # Cleanup
    requests.delete(f"{BASE_URL}/api/pipeline/deals/{d['deal_id']}", headers=headers)


class TestStageWebhookConfig:
    """PUT /api/pipeline/stages/{stage_id}/webhook"""

    def test_save_webhook_url(self, headers, stage_id):
        res = requests.put(
            f"{BASE_URL}/api/pipeline/stages/{stage_id}/webhook",
            json={"webhook_url": "https://httpbin.org/post", "webhook_enabled": True},
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("webhook_url") == "https://httpbin.org/post"
        assert data.get("webhook_enabled") == True

    def test_disable_webhook(self, headers, stage_id):
        res = requests.put(
            f"{BASE_URL}/api/pipeline/stages/{stage_id}/webhook",
            json={"webhook_url": "https://httpbin.org/post", "webhook_enabled": False},
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("webhook_enabled") == False

    def test_stage_reflects_webhook_config(self, headers, stage_id):
        """Verify GET stages returns updated webhook info"""
        # Re-enable first
        requests.put(
            f"{BASE_URL}/api/pipeline/stages/{stage_id}/webhook",
            json={"webhook_url": "https://httpbin.org/post", "webhook_enabled": True},
            headers=headers
        )
        res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
        assert res.status_code == 200
        stages = res.json()
        stage = next((s for s in stages if s["stage_id"] == stage_id), None)
        assert stage is not None
        assert stage.get("webhook_url") == "https://httpbin.org/post"
        assert stage.get("webhook_enabled") == True


class TestDealFields:
    """Deal creation with cpf_cnpj and billing_type"""

    def test_deal_has_cpf_cnpj(self, headers, deal_id):
        res = requests.get(f"{BASE_URL}/api/pipeline/deals", headers=headers)
        assert res.status_code == 200
        deals = res.json()
        deal = next((d for d in deals if d["deal_id"] == deal_id), None)
        assert deal is not None
        assert deal.get("cpf_cnpj") == "12345678901"

    def test_deal_has_billing_type(self, headers, deal_id):
        res = requests.get(f"{BASE_URL}/api/pipeline/deals", headers=headers)
        assert res.status_code == 200
        deals = res.json()
        deal = next((d for d in deals if d["deal_id"] == deal_id), None)
        assert deal is not None
        assert deal.get("billing_type") == "PIX"


class TestFireWebhook:
    """POST /api/pipeline/deals/{deal_id}/fire-webhook"""

    def test_fire_webhook_returns_200(self, headers, deal_id, stage_id):
        res = requests.post(
            f"{BASE_URL}/api/pipeline/deals/{deal_id}/fire-webhook",
            json={"stage_id": stage_id},
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert "status" in data

    def test_fire_webhook_creates_log(self, headers, deal_id, stage_id):
        requests.post(
            f"{BASE_URL}/api/pipeline/deals/{deal_id}/fire-webhook",
            json={"stage_id": stage_id},
            headers=headers
        )
        logs_res = requests.get(f"{BASE_URL}/api/pipeline/deals/{deal_id}/webhook-logs", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert isinstance(logs, list)
        assert len(logs) > 0


class TestWebhookLogs:
    """GET /api/pipeline/deals/{deal_id}/webhook-logs"""

    def test_get_webhook_logs(self, headers, deal_id):
        res = requests.get(f"{BASE_URL}/api/pipeline/deals/{deal_id}/webhook-logs", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_log_has_expected_fields(self, headers, deal_id, stage_id):
        # Fire once more to ensure log exists
        requests.post(
            f"{BASE_URL}/api/pipeline/deals/{deal_id}/fire-webhook",
            json={"stage_id": stage_id},
            headers=headers
        )
        res = requests.get(f"{BASE_URL}/api/pipeline/deals/{deal_id}/webhook-logs", headers=headers)
        assert res.status_code == 200
        logs = res.json()
        if logs:
            log = logs[0]
            assert "status" in log or "fired_at" in log or "stage_id" in log
