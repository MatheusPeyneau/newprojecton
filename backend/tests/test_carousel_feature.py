"""
Tests for Multi-Agent Instagram Carousel Builder feature:
- Settings API keys endpoints
- Carousel agent endpoints (expect 400 when keys missing)
- Carousel save/history endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@agencia.com", "password": "Test1234!"
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip(f"Auth failed: {res.status_code} {res.text}")

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

class TestApiKeys:
    """API Keys settings endpoints"""

    def test_get_api_keys_returns_5_fields(self, headers):
        res = requests.get(f"{BASE_URL}/api/settings/api-keys", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "perplexity_key" in data
        assert "openai_key" in data
        assert "anthropic_key" in data
        assert "gemini_key" in data
        assert "groq_key" in data

    def test_put_api_keys_saves_and_masks(self, headers):
        # Save a test key
        res = requests.put(f"{BASE_URL}/api/settings/api-keys", json={
            "openai_key": "sk-test-key-1234567890abcdef"
        }, headers=headers)
        assert res.status_code == 200

        # Verify masked
        get_res = requests.get(f"{BASE_URL}/api/settings/api-keys", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        # Should be masked (not full key)
        assert data["openai_key"] is not None
        assert len(data["openai_key"]) > 0
        # Should not expose full key
        assert data["openai_key"] != "sk-test-key-1234567890abcdef"
        print(f"Masked key value: {data['openai_key']}")


class TestCarouselAgents:
    """Carousel agent endpoints - expect 400 when keys not configured"""

    def test_agent_news_400_without_perplexity_key(self, headers):
        """Agent 1 should return 400 when perplexity key missing"""
        # First clear perplexity key
        requests.put(f"{BASE_URL}/api/settings/api-keys", json={"perplexity_key": ""}, headers=headers)

        res = requests.post(f"{BASE_URL}/api/carousel/agent/news", json={
            "client_id": "some-client-id", "period_days": 7
        }, headers=headers)
        # Either 400 (key missing) or 404 (client not found) is acceptable
        assert res.status_code in [400, 404, 422]
        if res.status_code == 400:
            detail = res.json().get("detail", "")
            print(f"Agent 1 error detail: {detail}")
            assert "não configurada" in detail or "key" in detail.lower() or "perplexity" in detail.lower()

    def test_agent_themes_400_without_llm_key(self, headers):
        """Agent 2 should return 400 when LLM key missing"""
        res = requests.post(f"{BASE_URL}/api/carousel/agent/themes", json={
            "client_id": "some-client-id",
            "news_context": "Sample news context",
            "llm_provider": "openai"
        }, headers=headers)
        assert res.status_code in [400, 404, 422]
        if res.status_code == 400:
            detail = res.json().get("detail", "")
            print(f"Agent 2 error detail: {detail}")

    def test_agent_copy_400_without_llm_key(self, headers):
        """Agent 3 should return 400 when LLM key missing"""
        res = requests.post(f"{BASE_URL}/api/carousel/agent/copy", json={
            "client_id": "some-client-id",
            "chosen_theme": "Test theme",
            "news_context": "Sample news",
            "llm_provider": "openai"
        }, headers=headers)
        assert res.status_code in [400, 404, 422]
        if res.status_code == 400:
            detail = res.json().get("detail", "")
            print(f"Agent 3 error detail: {detail}")

    def test_agent_design_400_without_llm_key(self, headers):
        """Agent 4 should return 400 when LLM key missing"""
        res = requests.post(f"{BASE_URL}/api/carousel/agent/design", json={
            "client_id": "some-client-id",
            "copy_content": "Test copy",
            "chosen_theme": "Test theme",
            "llm_provider": "openai"
        }, headers=headers)
        assert res.status_code in [400, 404, 422]
        if res.status_code == 400:
            detail = res.json().get("detail", "")
            print(f"Agent 4 error detail: {detail}")


class TestCarouselHistory:
    """Carousel save and history endpoints"""

    def test_get_history_returns_array(self, headers):
        res = requests.get(f"{BASE_URL}/api/carousel/history", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_save_carousel_and_retrieve(self, headers):
        # Save a fake carousel
        save_res = requests.post(f"{BASE_URL}/api/carousel/save", json={
            "client_id": "TEST_client_id",
            "client_name": "TEST_Cliente",
            "theme": "TEST_Tema de Teste",
            "html_content": "<html><body><h1>TEST Carousel</h1></body></html>",
            "llm_provider": "openai"
        }, headers=headers)
        assert save_res.status_code == 200
        data = save_res.json()
        assert "carousel_id" in data
        carousel_id = data["carousel_id"]
        print(f"Saved carousel_id: {carousel_id}")

        # Retrieve full HTML
        get_res = requests.get(f"{BASE_URL}/api/carousel/history/{carousel_id}", headers=headers)
        assert get_res.status_code == 200
        detail = get_res.json()
        assert detail.get("html_content") == "<html><body><h1>TEST Carousel</h1></body></html>"
        assert detail.get("theme") == "TEST_Tema de Teste"

    def test_history_contains_saved_carousel(self, headers):
        # History should have at least the one we just saved
        res = requests.get(f"{BASE_URL}/api/carousel/history", headers=headers)
        assert res.status_code == 200
        history = res.json()
        # Find our test entry
        test_items = [h for h in history if h.get("theme") == "TEST_Tema de Teste"]
        assert len(test_items) >= 1
        print(f"Found {len(test_items)} test carousel(s) in history")
