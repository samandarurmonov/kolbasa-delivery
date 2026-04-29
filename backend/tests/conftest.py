import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend env to get the public backend URL used by the app
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
ADMIN_PHONE = "+998940634110"
ADMIN_PIN = "1234"

AGENT_PHONE = "+998901111111"
AGENT_NAME = "TEST_Agent"
AGENT_PIN = "1111"

WAREHOUSE_PHONE = "+998902222222"
WAREHOUSE_NAME = "TEST_Warehouse"
WAREHOUSE_PIN = "2222"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


def _login(phone, pin):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": phone, "pin": pin},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed for {phone}: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


def _ensure_user(headers, phone, name, role, pin):
    """Create or reset a user as admin so login with `pin` works."""
    r = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=15)
    users = r.json() if r.status_code == 200 else []
    found = next((u for u in users if u["phone"] == phone), None)
    if not found:
        cr = requests.post(
            f"{BASE_URL}/api/users",
            headers={**headers, "Content-Type": "application/json"},
            json={"phone": phone, "name": name, "role": role, "pin": pin},
            timeout=15,
        )
        assert cr.status_code == 200, f"create {role} failed: {cr.text}"
    else:
        # ensure active and right role
        requests.patch(
            f"{BASE_URL}/api/users/{found['id']}",
            headers={**headers, "Content-Type": "application/json"},
            json={"is_active": True, "role": role, "name": name},
            timeout=15,
        )
        # reset pin so we can login deterministically
        requests.post(
            f"{BASE_URL}/api/users/{found['id']}/reset-pin",
            headers={**headers, "Content-Type": "application/json"},
            json={"pin": pin},
            timeout=15,
        )


@pytest.fixture(scope="session")
def admin_auth():
    token, user = _login(ADMIN_PHONE, ADMIN_PIN)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def agent_auth(admin_auth):
    _ensure_user(admin_auth["headers"], AGENT_PHONE, AGENT_NAME, "agent", AGENT_PIN)
    token, user = _login(AGENT_PHONE, AGENT_PIN)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def warehouse_auth(admin_auth):
    _ensure_user(admin_auth["headers"], WAREHOUSE_PHONE, WAREHOUSE_NAME, "warehouse", WAREHOUSE_PIN)
    token, user = _login(WAREHOUSE_PHONE, WAREHOUSE_PIN)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}
