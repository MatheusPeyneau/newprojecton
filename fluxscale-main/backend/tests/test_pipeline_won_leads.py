"""
Backend tests for:
1. Pipeline is_won_stage toggle and auto-client creation
2. Leads inline edit via PUT /api/leads/{id}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def won_stage_id(headers):
    """Get or create a stage marked as is_won_stage=true for testing."""
    stages_res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
    assert stages_res.status_code == 200
    stages = stages_res.json()
    # Find existing won stage
    for s in stages:
        if s.get("is_won_stage"):
            print(f"Using existing won stage: {s['stage_id']} - {s['name']}")
            return s["stage_id"]
    # Create a new stage and mark as won
    r = requests.post(f"{BASE_URL}/api/pipeline/stages", json={"name": "TEST_Won Stage", "color": "#22c55e", "order": 99}, headers=headers)
    assert r.status_code == 200
    stage_id = r.json()["stage_id"]
    # Mark it as won
    r2 = requests.put(f"{BASE_URL}/api/pipeline/stages/{stage_id}/webhook",
                      json={"webhook_url": "", "webhook_enabled": False, "is_won_stage": True}, headers=headers)
    assert r2.status_code == 200
    assert r2.json().get("is_won_stage") is True
    return stage_id

@pytest.fixture(scope="module")
def other_stage_id(headers):
    """Get a non-won stage for initial deal placement."""
    stages_res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
    stages = stages_res.json()
    for s in stages:
        if not s.get("is_won_stage"):
            return s["stage_id"]
    # Create one
    r = requests.post(f"{BASE_URL}/api/pipeline/stages", json={"name": "TEST_Initial Stage", "color": "#3B82F6", "order": 98}, headers=headers)
    return r.json()["stage_id"]


# ============ STAGE WEBHOOK (is_won_stage) ============

class TestStageWebhook:
    def test_save_stage_webhook_with_is_won_stage(self, headers, won_stage_id):
        """PUT /api/pipeline/stages/{id}/webhook with is_won_stage=true"""
        res = requests.put(
            f"{BASE_URL}/api/pipeline/stages/{won_stage_id}/webhook",
            json={"webhook_url": "", "webhook_enabled": False, "is_won_stage": True},
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("is_won_stage") is True
        print(f"PASS: Stage {won_stage_id} marked as won stage")

    def test_stage_is_won_persisted(self, headers, won_stage_id):
        """Verify is_won_stage persists after save"""
        stages_res = requests.get(f"{BASE_URL}/api/pipeline/stages", headers=headers)
        assert stages_res.status_code == 200
        stages = stages_res.json()
        stage = next((s for s in stages if s["stage_id"] == won_stage_id), None)
        assert stage is not None
        assert stage.get("is_won_stage") is True
        print(f"PASS: is_won_stage persisted for {won_stage_id}")


# ============ AUTO CLIENT CREATION ============

class TestAutoClientCreation:
    def test_move_deal_to_won_stage_creates_client(self, headers, won_stage_id, other_stage_id):
        """PUT /api/pipeline/deals/{id} to won stage returns _client_auto_created=true"""
        # Create a deal in a non-won stage
        deal_title = f"TEST_AutoClient_{uuid.uuid4().hex[:6]}"
        deal_res = requests.post(
            f"{BASE_URL}/api/pipeline/deals",
            json={
                "title": deal_title,
                "value": 1500.0,
                "stage_id": other_stage_id,
                "contact_name": "Test Contact",
                "company": "Test Company LTDA",
                "email": f"test_{uuid.uuid4().hex[:4]}@example.com",
                "cpf_cnpj": "12.345.678/0001-99",
                "billing_type": "PIX",
            },
            headers=headers
        )
        assert deal_res.status_code == 200
        deal_id = deal_res.json()["deal_id"]
        print(f"Created deal: {deal_id}")

        # Move to won stage
        update_res = requests.put(
            f"{BASE_URL}/api/pipeline/deals/{deal_id}",
            json={"stage_id": won_stage_id},
            headers=headers
        )
        assert update_res.status_code == 200
        data = update_res.json()
        assert data.get("_client_auto_created") is True, f"Expected _client_auto_created=true, got: {data}"
        assert "_client_id" in data
        client_id = data["_client_id"]
        print(f"PASS: _client_auto_created=true, client_id={client_id}")

        # Verify client exists in /api/clients
        client_res = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
        assert client_res.status_code == 200
        client = client_res.json()
        assert client["deal_id"] == deal_id
        assert deal_title == client["name"] or "Test" in client["name"]
        assert client["billing_type"] == "PIX"
        assert client["monthly_value"] == 1500.0
        assert client["cpf_cnpj"] == "12.345.678/0001-99"
        print(f"PASS: Client created with correct data: {client['name']}, billing={client['billing_type']}, value={client['monthly_value']}")

        # Store for dedup test
        TestAutoClientCreation._deal_id = deal_id
        TestAutoClientCreation._client_id = client_id

    def test_dedup_move_same_deal_again(self, headers, won_stage_id):
        """Moving same deal to won stage again must NOT create duplicate client."""
        deal_id = getattr(TestAutoClientCreation, "_deal_id", None)
        if not deal_id:
            pytest.skip("Previous test did not create a deal")
        
        # Move to won stage again
        update_res = requests.put(
            f"{BASE_URL}/api/pipeline/deals/{deal_id}",
            json={"stage_id": won_stage_id},
            headers=headers
        )
        assert update_res.status_code == 200
        data = update_res.json()
        # Should return same client_id, not _client_auto_created=true for a new client
        # The dedup returns existing client_id but still includes _client_auto_created and _client_id
        if data.get("_client_id"):
            assert data["_client_id"] == TestAutoClientCreation._client_id, \
                f"Duplicate client created! Expected {TestAutoClientCreation._client_id}, got {data['_client_id']}"
        print(f"PASS: Dedup works — same client_id returned: {data.get('_client_id')}")

        # Verify only 1 client for this deal
        clients_res = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        clients = clients_res.json()
        deal_clients = [c for c in clients if c.get("deal_id") == deal_id]
        assert len(deal_clients) == 1, f"Expected 1 client, found {len(deal_clients)}"
        print(f"PASS: Only 1 client exists for deal {deal_id}")

    def test_client_has_correct_fields_from_deal(self, headers):
        """Verify all required fields are copied from deal to client."""
        client_id = getattr(TestAutoClientCreation, "_client_id", None)
        if not client_id:
            pytest.skip("No client created in previous test")
        
        client_res = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
        assert client_res.status_code == 200
        client = client_res.json()
        
        # Check all fields
        assert client.get("name"), "Client name should not be empty"
        assert client.get("billing_type") in ["BOLETO", "CREDIT_CARD", "PIX"]
        assert client.get("status") == "ativo"
        assert "monthly_value" in client
        assert "company" in client
        print(f"PASS: Client fields valid: name={client['name']}, billing={client['billing_type']}, status={client['status']}")


# ============ LEADS INLINE EDIT ============

class TestLeadsInlineEdit:
    _test_lead_id = None

    def test_create_lead_for_inline_edit(self, headers):
        """Create a test lead to edit inline."""
        res = requests.post(
            f"{BASE_URL}/api/leads",
            json={
                "name": "TEST_InlineEdit_Lead",
                "email": "inline@test.com",
                "phone": "11999999999",
                "company": "Test Corp",
                "cpf_cnpj": "123.456.789-00",
                "billing_type": "BOLETO",
                "value": 500.0,
                "source": "manual",
                "status": "novo",
                "score": 50,
            },
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "TEST_InlineEdit_Lead"
        TestLeadsInlineEdit._test_lead_id = data["lead_id"]
        print(f"PASS: Created test lead {data['lead_id']}")

    def test_inline_edit_put_lead(self, headers):
        """PUT /api/leads/{id} saves inline edit changes."""
        lead_id = TestLeadsInlineEdit._test_lead_id
        if not lead_id:
            pytest.skip("No test lead created")

        update_payload = {
            "name": "TEST_InlineEdit_Updated",
            "email": "updated@test.com",
            "phone": "11888888888",
            "company": "Updated Corp",
            "cpf_cnpj": "98.765.432/0001-10",
            "billing_type": "PIX",
            "value": 1200.0,
            "source": "instagram",
            "status": "qualificado",
            "score": 75,
        }
        res = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "TEST_InlineEdit_Updated"
        assert data["email"] == "updated@test.com"
        assert data["billing_type"] == "PIX"
        assert data["value"] == 1200.0
        assert data["status"] == "qualificado"
        assert data["score"] == 75
        print(f"PASS: PUT /api/leads/{lead_id} updated all fields correctly")

    def test_inline_edit_persisted_via_get(self, headers):
        """Verify inline edit persisted via GET."""
        lead_id = TestLeadsInlineEdit._test_lead_id
        if not lead_id:
            pytest.skip("No test lead")

        res = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "TEST_InlineEdit_Updated"
        assert data["value"] == 1200.0
        assert data["billing_type"] == "PIX"
        print("PASS: Inline edit data persisted in DB")

    def test_cleanup_test_lead(self, headers):
        """Delete the test lead."""
        lead_id = TestLeadsInlineEdit._test_lead_id
        if not lead_id:
            return
        res = requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        assert res.status_code == 200
        print(f"Cleanup: deleted lead {lead_id}")
