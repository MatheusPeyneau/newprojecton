"""
Backend tests for Pipeline Edit Deal feature:
- Auth: register/login
- Pipeline deals CRUD with email/phone fields
- PUT /api/pipeline/deals/:id with email and phone
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_EMAIL = "testpipeline@agencia.com"
TEST_PASSWORD = "Test1234!"
TEST_NAME = "Test Pipeline User"

@pytest.fixture(scope="module")
def auth_token():
    # Try register first, then login
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/register", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
    if r.status_code in [200, 201]:
        return r.json()["token"]
    # Already exists, login
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {auth_token}"})
    return s

class TestAuth:
    """Auth endpoint tests"""

    def test_register_or_login(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register", json={"name": TEST_NAME, "email": "tmp_test@agencia.com", "password": TEST_PASSWORD})
        assert r.status_code in [200, 201, 400]  # 400 = already exists

    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        # May be 401 if user not registered yet, so register first
        if r.status_code == 401:
            requests.post(f"{BASE_URL}/api/auth/register", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data

class TestPipelineStages:
    """Pipeline stages tests"""

    def test_list_stages(self, client):
        r = client.get(f"{BASE_URL}/api/pipeline/stages")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} stages: {[s['name'] for s in data]}")

class TestPipelineDeals:
    """Pipeline deals tests with email and phone fields"""

    created_deal_id = None

    def test_list_deals(self, client):
        r = client.get(f"{BASE_URL}/api/pipeline/deals")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} deals")

    def test_create_deal_with_email_phone(self, client):
        # Get first stage
        stages_r = client.get(f"{BASE_URL}/api/pipeline/stages")
        stages = stages_r.json()
        assert len(stages) > 0
        stage_id = stages[0]["stage_id"]

        r = client.post(f"{BASE_URL}/api/pipeline/deals", json={
            "title": "TEST_Deal Pipeline Edit",
            "value": 5000.0,
            "stage_id": stage_id,
            "contact_name": "João Teste",
            "company": "Empresa Teste",
            "email": "joao@empresa.com",
            "phone": "11999999999",
            "probability": 70,
            "notes": "Test deal with email and phone"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Deal Pipeline Edit"
        assert data["email"] == "joao@empresa.com"
        assert data["phone"] == "11999999999"
        assert "deal_id" in data
        TestPipelineDeals.created_deal_id = data["deal_id"]
        print(f"Created deal: {data['deal_id']}")

    def test_update_deal_email_phone(self, client):
        assert TestPipelineDeals.created_deal_id, "Need created deal"
        deal_id = TestPipelineDeals.created_deal_id

        r = client.put(f"{BASE_URL}/api/pipeline/deals/{deal_id}", json={
            "email": "updated@empresa.com",
            "phone": "11888888888",
            "value": 8000.0,
            "notes": "Updated notes"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "updated@empresa.com"
        assert data["phone"] == "11888888888"
        assert data["value"] == 8000.0
        print(f"Updated deal: {data}")

    def test_update_deal_persist_to_db(self, client):
        """Verify update is persisted - GET after PUT"""
        assert TestPipelineDeals.created_deal_id, "Need created deal"
        deal_id = TestPipelineDeals.created_deal_id

        # GET all deals and find our deal
        r = client.get(f"{BASE_URL}/api/pipeline/deals")
        assert r.status_code == 200
        deals = r.json()
        our_deal = next((d for d in deals if d["deal_id"] == deal_id), None)
        assert our_deal is not None
        assert our_deal["email"] == "updated@empresa.com"
        assert our_deal["phone"] == "11888888888"
        print("Data persisted correctly")

    def test_update_deal_all_fields(self, client):
        """Test updating all drawer fields"""
        assert TestPipelineDeals.created_deal_id, "Need created deal"
        deal_id = TestPipelineDeals.created_deal_id

        stages_r = client.get(f"{BASE_URL}/api/pipeline/stages")
        stages = stages_r.json()
        new_stage_id = stages[1]["stage_id"] if len(stages) > 1 else stages[0]["stage_id"]

        r = client.put(f"{BASE_URL}/api/pipeline/deals/{deal_id}", json={
            "title": "TEST_Deal Updated Name",
            "contact_name": "Maria Silva",
            "company": "Nova Empresa",
            "email": "maria@novaempresa.com",
            "phone": "11777777777",
            "value": 12000.0,
            "stage_id": new_stage_id,
            "probability": 85,
            "notes": "All fields updated"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Deal Updated Name"
        assert data["contact_name"] == "Maria Silva"
        assert data["email"] == "maria@novaempresa.com"
        assert data["phone"] == "11777777777"
        assert data["value"] == 12000.0
        assert data["probability"] == 85
        print(f"All fields updated successfully")

    def test_delete_created_deal(self, client):
        """Cleanup: delete test deal"""
        if not TestPipelineDeals.created_deal_id:
            pytest.skip("No deal to delete")
        deal_id = TestPipelineDeals.created_deal_id
        r = client.delete(f"{BASE_URL}/api/pipeline/deals/{deal_id}")
        assert r.status_code == 200
        print(f"Deleted deal {deal_id}")
