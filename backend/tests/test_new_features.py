"""Tests for iteration 3 new features: period selector, MRR trend, polling alerts"""
import pytest
import requests
import os

BASE_URL = "https://sales-lead-editor.preview.emergentagent.com"

# Auth
def get_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser@agencia.com", "password": "Test1234!"})
    if r.status_code == 200:
        return r.json().get("access_token") or r.json().get("token")
    return None

@pytest.fixture(scope="module")
def headers():
    token = get_token()
    if not token:
        pytest.skip("Auth failed")
    return {"Authorization": f"Bearer {token}"}

class TestMRRTrend:
    """MRR Trend endpoint tests"""

    def test_mrr_trend_returns_200(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/mrr-trend", headers=headers)
        assert r.status_code == 200

    def test_mrr_trend_returns_6_months(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/mrr-trend", headers=headers)
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 6, f"Expected 6 months, got {len(data)}"

    def test_mrr_trend_has_month_and_mrr_fields(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/mrr-trend", headers=headers)
        data = r.json()
        for item in data:
            assert "month" in item, f"Missing 'month' in {item}"
            assert "mrr" in item, f"Missing 'mrr' in {item}"

    def test_mrr_trend_latest_month_has_value(self, headers):
        """Client 'teste' updated to monthly_value=5000, so latest month should show >= 5000"""
        r = requests.get(f"{BASE_URL}/api/dashboard/mrr-trend", headers=headers)
        data = r.json()
        last_mrr = data[-1]["mrr"]
        print(f"Latest month MRR: {last_mrr}")
        assert last_mrr >= 5000, f"Expected MRR >= 5000, got {last_mrr}"


class TestKPIsPeriod:
    """KPIs with period parameter tests"""

    def test_kpis_default_period_30(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("period_days") == 30

    def test_kpis_period_60(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/kpis?period=60", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("period_days") == 60, f"Expected period_days=60, got {data.get('period_days')}"

    def test_kpis_period_90(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/kpis?period=90", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("period_days") == 90, f"Expected period_days=90, got {data.get('period_days')}"

    def test_kpis_has_leads_this_period(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/kpis?period=60", headers=headers)
        data = r.json()
        assert "leads_this_period" in data

    def test_kpis_leads_period_varies(self, headers):
        """60d period should have >= leads than 30d (more time = more or equal leads)"""
        r30 = requests.get(f"{BASE_URL}/api/dashboard/kpis?period=30", headers=headers).json()
        r60 = requests.get(f"{BASE_URL}/api/dashboard/kpis?period=60", headers=headers).json()
        leads_30 = r30.get("leads_this_period", 0)
        leads_60 = r60.get("leads_this_period", 0)
        print(f"leads 30d={leads_30}, leads 60d={leads_60}")
        assert leads_60 >= leads_30, f"60d leads ({leads_60}) should be >= 30d leads ({leads_30})"
