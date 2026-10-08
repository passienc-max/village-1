import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://family-support-app-6.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "passienc@gmail.com"
ADMIN_PASSWORD = "VillageAdmin2026!"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def anon():
    return _session()


@pytest.fixture(scope="session")
def admin():
    s = _session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s
