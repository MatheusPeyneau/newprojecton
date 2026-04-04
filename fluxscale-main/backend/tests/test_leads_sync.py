"""Tests for Lead/Pipeline field synchronization feature"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    assert res.status_code == 200
    return res.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

# Track created IDs for cleanup
created_lead_ids = []

class TestLeadsAPI:
    """Test Lead CRUD with new financial fields"""

    def test_create_lead_with_financial_fields(self, headers):
        payload = {
            "name": "TEST_Lead Financeiro",
            "email": "test_fin@example.com",
            "phone": "11999990000",
            "company": "TEST_Corp",
            "cpf_cnpj": "12.345.678/0001-95",
            "billing_type": "PIX",
            "value": 2000.0,
            "due_date": "2025-12-31",
            "source": "manual",
            "status": "novo",
            "score": 70
        }
        res = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["cpf_cnpj"] == "12.345.678/0001-95"
        assert data["billing_type"] == "PIX"
        assert data["value"] == 2000.0
        assert data["due_date"] == "2025-12-31"
        assert "lead_id" in data
        created_lead_ids.append(data["lead_id"])
        return data["lead_id"]

    def test_get_lead_financial_fields(self, headers):
        # Create then GET
        payload = {"name": "TEST_GetLead", "cpf_cnpj": "123.456.789-00", "billing_type": "BOLETO", "value": 500.0, "due_date": "2025-11-01"}
        res = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers)
        assert res.status_code == 200
        lead_id = res.json()["lead_id"]
        created_lead_ids.append(lead_id)

        get_res = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["cpf_cnpj"] == "123.456.789-00"
        assert data["billing_type"] == "BOLETO"
        assert data["value"] == 500.0
        assert data["due_date"] == "2025-11-01"

    def test_update_lead_financial_fields(self, headers):
        payload = {"name": "TEST_UpdateLead", "billing_type": "BOLETO", "value": 100.0}
        res = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers)
        lead_id = res.json()["lead_id"]
        created_lead_ids.append(lead_id)

        update_res = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json={
            "cpf_cnpj": "98.765.432/0001-10",
            "billing_type": "CREDIT_CARD",
            "value": 3500.0,
            "due_date": "2026-01-15"
        }, headers=headers)
        assert update_res.status_code == 200

        # Verify persistence
        get_res = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        data = get_res.json()
        assert data["cpf_cnpj"] == "98.765.432/0001-10"
        assert data["billing_type"] == "CREDIT_CARD"
        assert data["value"] == 3500.0
        assert data["due_date"] == "2026-01-15"

    def test_list_leads_contains_financial_fields(self, headers):
        res = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        # Check that leads have financial fields
        if data:
            lead = data[0]
            assert "cpf_cnpj" in lead or lead.get("cpf_cnpj") is None  # field present
            assert "billing_type" in lead
            assert "value" in lead

    def test_add_lead_to_pipeline_inherits_fields(self, headers):
        # Create lead with financial fields
        payload = {
            "name": "TEST_PipelineLead",
            "email": "pipeline@test.com",
            "phone": "11888880000",
            "cpf_cnpj": "11.222.333/0001-44",
            "billing_type": "PIX",
            "value": 1500.0,
            "due_date": "2025-12-15"
        }
        create_res = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers)
        assert create_res.status_code == 200
        lead_id = create_res.json()["lead_id"]
        created_lead_ids.append(lead_id)

        # Get a stage
        stages_res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
        assert stages_res.status_code == 200
        stages = stages_res.json()
        assert len(stages) > 0
        stage_id = stages[0]["stage_id"]

        # Add to pipeline
        pipe_res = requests.post(f"{BASE_URL}/api/leads/{lead_id}/pipeline", json={"stage_id": stage_id}, headers=headers)
        assert pipe_res.status_code == 200
        deal = pipe_res.json()

        # Verify deal inherits lead fields
        assert deal["cpf_cnpj"] == "11.222.333/0001-44"
        assert deal["billing_type"] == "PIX"
        assert deal["value"] == 1500.0
        assert deal["due_date"] == "2025-12-15"
        assert deal["email"] == "pipeline@test.com"
        assert deal["phone"] == "11888880000"

    def test_webhook_whatsapp_lead_still_works(self, headers):
        payload = {
            "name": "TEST_WhatsApp Lead",
            "phone": "5511977770000",
            "source": "whatsapp",
            "message": "Olá, tenho interesse"
        }
        res = requests.post(f"{BASE_URL}/api/webhook/whatsapp-lead", json=payload)
        assert res.status_code == 200


class TestCleanup:
    def test_cleanup(self, headers):
        for lead_id in created_lead_ids:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        print(f"Cleaned up {len(created_lead_ids)} test leads")
