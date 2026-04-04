"""Instagram features backend tests: settings, pipeline, conversations, webhook"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json().get("token")

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

# --- Instagram API Settings ---

def test_get_instagram_api_settings(headers):
    r = requests.get(f"{BASE_URL}/api/settings/instagram-api", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "page_access_token" in data
    assert "instagram_account_id" in data
    assert "verify_token" in data
    print(f"GET instagram-api settings OK: {data}")

def test_put_instagram_api_settings(headers):
    payload = {
        "page_access_token": "TEST_token_abc",
        "instagram_account_id": "TEST_12345",
        "verify_token": "meu_token_123"
    }
    r = requests.put(f"{BASE_URL}/api/settings/instagram-api", json=payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "message" in data or data.get("verify_token") == "meu_token_123"
    print(f"PUT instagram-api settings OK: {data}")

def test_get_instagram_api_settings_after_save(headers):
    r = requests.get(f"{BASE_URL}/api/settings/instagram-api", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data.get("verify_token") == "meu_token_123"
    assert data.get("instagram_account_id") == "TEST_12345"
    print(f"Persisted settings OK: {data}")

# --- Instagram Pipeline ---

def test_get_instagram_pipeline_stages(headers):
    r = requests.get(f"{BASE_URL}/api/pipeline/stages?type=instagram", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Instagram stages: {len(data)} stages")

def test_get_instagram_pipeline_deals(headers):
    r = requests.get(f"{BASE_URL}/api/pipeline/deals?pipeline_type=instagram", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Instagram deals: {len(data)} deals")

# --- Instagram Conversations ---

def test_get_instagram_conversations(headers):
    r = requests.get(f"{BASE_URL}/api/instagram/conversations", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Instagram conversations: {len(data)}")

# --- Webhook verification ---

def test_webhook_instagram_get_verify(headers):
    """Test webhook verification challenge"""
    r = requests.get(
        f"{BASE_URL}/api/webhook/instagram",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "meu_token_123",
            "hub.challenge": "test_challenge_123"
        }
    )
    assert r.status_code == 200
    assert "test_challenge_123" in r.text
    print(f"Webhook verification OK: {r.text}")

def test_webhook_instagram_wrong_token():
    r = requests.get(
        f"{BASE_URL}/api/webhook/instagram",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "abc"
        }
    )
    assert r.status_code in [403, 400]
    print(f"Wrong token rejected: {r.status_code}")
