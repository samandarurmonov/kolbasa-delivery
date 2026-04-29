import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend env to get the public backend URL used by the app
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
ADMIN_PHONE = "+998940634110"

AGENT_PHONE = "+998901111111"
AGENT_NAME = "TEST_Agent"
WAREHOUSE_PHONE = "+998902222222"
WAREHOUSE_NAME = "TEST_Warehouse"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, phone):
    r = session.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": phone}, timeout=15)
    assert r.status_code == 200, f"request-otp failed for {phone}: {r.status_code} {r.text}"
    code = r.json().get("dev_code")
    assert code, f"dev_code missing: {r.json()}"
    r2 = session.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"phone": phone, "code": code},
        timeout=15,
    )
    assert r2.status_code == 200, f"verify-otp failed: {r2.status_code} {r2.text}"
    data = r2.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def admin_auth(session):
    token, user = _login(session, ADMIN_PHONE)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def agent_auth(session, admin_auth):
    # Ensure agent user exists
    headers = admin_auth["headers"]
    r = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=15)
    users = r.json() if r.status_code == 200 else []
    found = next((u for u in users if u["phone"] == AGENT_PHONE), None)
    if not found:
        cr = requests.post(
            f"{BASE_URL}/api/users",
            headers={**headers, "Content-Type": "application/json"},
            json={"phone": AGENT_PHONE, "name": AGENT_NAME, "role": "agent"},
            timeout=15,
        )
        assert cr.status_code == 200, f"create agent failed: {cr.text}"
    else:
        # ensure active
        requests.patch(
            f"{BASE_URL}/api/users/{found['id']}",
            headers={**headers, "Content-Type": "application/json"},
            json={"is_active": True, "role": "agent"},
            timeout=15,
        )
    token, user = _login(requests.Session(), AGENT_PHONE)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def warehouse_auth(session, admin_auth):
    headers = admin_auth["headers"]
    r = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=15)
    users = r.json() if r.status_code == 200 else []
    found = next((u for u in users if u["phone"] == WAREHOUSE_PHONE), None)
    if not found:
        cr = requests.post(
            f"{BASE_URL}/api/users",
            headers={**headers, "Content-Type": "application/json"},
            json={"phone": WAREHOUSE_PHONE, "name": WAREHOUSE_NAME, "role": "warehouse"},
            timeout=15,
        )
        assert cr.status_code == 200, f"create warehouse failed: {cr.text}"
    else:
        requests.patch(
            f"{BASE_URL}/api/users/{found['id']}",
            headers={**headers, "Content-Type": "application/json"},
            json={"is_active": True, "role": "warehouse"},
            timeout=15,
        )
    token, user = _login(requests.Session(), WAREHOUSE_PHONE)
    return {"token": token, "user": user, "headers": {"Authorization": f"Bearer {token}"}}
