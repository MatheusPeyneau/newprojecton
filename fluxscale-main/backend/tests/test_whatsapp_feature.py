"""
WhatsApp Feature Tests — Agents CRUD, Toggle, Public Webhook
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

# ---- Agent CRUD ----

class TestWhatsAppAgents:
    agent_id = None

    def test_list_agents(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/whatsapp/agents", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        print(f"PASS: list agents — {len(res.json())} agents found")

    def test_create_agent(self, auth_headers):
        payload = {"name": "TEST_Agent Whatsapp", "description": "Test agent", "phone_number": "5511999990000", "n8n_webhook_url": ""}
        res = requests.post(f"{BASE_URL}/api/whatsapp/agents", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "TEST_Agent Whatsapp"
        assert data["is_active"] == False
        assert "agent_id" in data
        TestWhatsAppAgents.agent_id = data["agent_id"]
        print(f"PASS: create agent — {data['agent_id']}")

    def test_toggle_agent(self, auth_headers):
        aid = TestWhatsAppAgents.agent_id
        assert aid, "No agent_id from create test"
        res = requests.post(f"{BASE_URL}/api/whatsapp/agents/{aid}/toggle", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["is_active"] == True
        print("PASS: toggle agent to active")

    def test_update_agent(self, auth_headers):
        aid = TestWhatsAppAgents.agent_id
        res = requests.patch(f"{BASE_URL}/api/whatsapp/agents/{aid}", json={"description": "Updated desc"}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["description"] == "Updated desc"
        print("PASS: update agent")

    def test_delete_agent(self, auth_headers):
        aid = TestWhatsAppAgents.agent_id
        res = requests.delete(f"{BASE_URL}/api/whatsapp/agents/{aid}", headers=auth_headers)
        assert res.status_code == 200
        print("PASS: delete agent")

# ---- Public Webhook ----

class TestWhatsAppWebhook:
    lead_id = None

    def test_public_webhook_no_auth(self):
        payload = {"name": "TEST_WA Lead", "phone": "5511888880000", "message": "Oi, vi o anúncio"}
        res = requests.post(f"{BASE_URL}/api/webhook/whatsapp-lead", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "created"
        assert "lead_id" in data
        TestWhatsAppWebhook.lead_id = data["lead_id"]
        print(f"PASS: public webhook created lead {data['lead_id']}")

    def test_lead_has_whatsapp_source(self, auth_headers):
        lid = TestWhatsAppWebhook.lead_id
        assert lid
        res = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert res.status_code == 200
        leads = res.json()
        wa_leads = [l for l in leads if l.get("lead_id") == lid]
        assert len(wa_leads) == 1
        assert wa_leads[0]["source"] == "whatsapp"
        assert wa_leads[0]["status"] == "novo"
        print("PASS: lead has source=whatsapp")

# ---- WhatsApp Webhook Settings ----

class TestWhatsAppWebhookSettings:
    def test_get_settings(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/settings/whatsapp-webhook", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "webhook_url" in data
        assert "enabled" in data
        print("PASS: get whatsapp webhook settings")

    def test_save_settings(self, auth_headers):
        res = requests.put(f"{BASE_URL}/api/settings/whatsapp-webhook",
                           json={"webhook_url": "https://n8n.test.com/webhook/wa", "enabled": True},
                           headers=auth_headers)
        assert res.status_code == 200
        print("PASS: save whatsapp webhook settings")
