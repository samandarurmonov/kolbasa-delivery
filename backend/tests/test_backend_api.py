"""Backend tests for Agentlar / Field-agent app.

Covers:
- Auth (OTP request/verify, /me, role enforcement)
- Users (admin CRUD, blocking, self-delete protection)
- Categories (seed, CRUD, role enforcement)
- Orders (create as agent, list scoping, status transitions, history)
- Stats (admin)
- _id leak check
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(Path("/app/frontend/.env"))
    BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


# ---------------- Health ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------- Auth ----------------
class TestAuth:
    def test_request_otp_unknown_phone(self):
        r = requests.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": "+998999999999"}, timeout=15)
        assert r.status_code == 404

    def test_request_otp_invalid_phone(self):
        r = requests.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": "12345"}, timeout=15)
        assert r.status_code == 422

    def test_admin_request_otp_returns_dev_code(self, admin_auth):
        # admin_auth fixture exercises the full request+verify path
        assert admin_auth["user"]["role"] == "admin"
        assert admin_auth["user"]["phone"] == "+998940634110"
        assert admin_auth["token"]

    def test_me(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["phone"] == "+998940634110"
        assert body["role"] == "admin"
        assert "_id" not in body

    def test_me_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_verify_wrong_code(self):
        # Request OTP first
        r = requests.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": "+998940634110"}, timeout=15)
        assert r.status_code == 200
        r2 = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"phone": "+998940634110", "code": "000001"},
            timeout=15,
        )
        assert r2.status_code == 400


# ---------------- Categories ----------------
class TestCategories:
    def test_seeded_categories(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6
        names = {c["name"] for c in items}
        for expected in ["Sosiska", "Konserva"]:
            assert expected in names
        # _id leak check
        for c in items:
            assert "_id" not in c

    def test_admin_create_and_delete_category(self, admin_auth):
        new_name = "TEST_Category_X"
        r = requests.post(
            f"{BASE_URL}/api/categories",
            headers={**admin_auth["headers"], "Content-Type": "application/json"},
            json={"name": new_name},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        cat_id = r.json()["id"]

        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15)
        names = {c["name"] for c in r2.json()}
        assert new_name in names

        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/categories/{cat_id}", headers=admin_auth["headers"], timeout=15)
        assert r3.status_code == 200

    def test_agent_can_get_categories(self, agent_auth):
        r = requests.get(f"{BASE_URL}/api/categories", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 200

    def test_agent_cannot_create_category(self, agent_auth):
        r = requests.post(
            f"{BASE_URL}/api/categories",
            headers={**agent_auth["headers"], "Content-Type": "application/json"},
            json={"name": "TEST_AgentBlocked"},
            timeout=15,
        )
        assert r.status_code == 403


# ---------------- Users ----------------
class TestUsers:
    def test_list_users_admin(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/users", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert any(u["role"] == "admin" for u in users)
        for u in users:
            assert "_id" not in u

    def test_agent_cannot_list_users(self, agent_auth):
        r = requests.get(f"{BASE_URL}/api/users", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 403

    def test_create_duplicate_user_fails(self, admin_auth):
        r = requests.post(
            f"{BASE_URL}/api/users",
            headers={**admin_auth["headers"], "Content-Type": "application/json"},
            json={"phone": "+998940634110", "name": "Dup", "role": "admin"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_admin_cannot_self_delete(self, admin_auth):
        admin_id = admin_auth["user"]["id"]
        r = requests.delete(f"{BASE_URL}/api/users/{admin_id}", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 400

    def test_block_user_prevents_otp(self, admin_auth):
        # Create a fresh user, block them, try OTP -> should fail
        phone = "+998903333333"
        # cleanup if exists
        users = requests.get(f"{BASE_URL}/api/users", headers=admin_auth["headers"], timeout=15).json()
        existing = next((u for u in users if u["phone"] == phone), None)
        if existing:
            requests.delete(f"{BASE_URL}/api/users/{existing['id']}", headers=admin_auth["headers"], timeout=15)
        cr = requests.post(
            f"{BASE_URL}/api/users",
            headers={**admin_auth["headers"], "Content-Type": "application/json"},
            json={"phone": phone, "name": "TEST_Block", "role": "agent"},
            timeout=15,
        )
        assert cr.status_code == 200
        uid = cr.json()["id"]
        # Block
        pr = requests.patch(
            f"{BASE_URL}/api/users/{uid}",
            headers={**admin_auth["headers"], "Content-Type": "application/json"},
            json={"is_active": False},
            timeout=15,
        )
        assert pr.status_code == 200
        assert pr.json()["is_active"] is False
        # Try otp
        otp = requests.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": phone}, timeout=15)
        assert otp.status_code == 403
        # cleanup
        requests.delete(f"{BASE_URL}/api/users/{uid}", headers=admin_auth["headers"], timeout=15)


# ---------------- Orders ----------------
TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZlVJOMAAAAASUVORK5CYII="


class TestOrders:
    @pytest.fixture(scope="class")
    def created_order_id(self, agent_auth, admin_auth):
        # Pick a real category id
        cats = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15).json()
        cat = cats[0]
        payload = {
            "category_id": cat["id"],
            "product_name": "TEST_Sosiska premium",
            "quantity": "10kg",
            "client_phone": "+998905555555",
            "client_name": "TEST Client",
            "store_address": "Tashkent, Chilonzor",
            "latitude": 41.2995,
            "longitude": 69.2401,
            "photos": [TINY_PNG, TINY_PNG],
        }
        r = requests.post(
            f"{BASE_URL}/api/orders",
            headers={**agent_auth["headers"], "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "new"
        assert body["agent_id"] == agent_auth["user"]["id"]
        assert body["category_name"] == cat["name"]
        assert len(body["status_history"]) == 1
        assert "_id" not in body
        return body["id"]

    def test_three_photos_rejected(self, agent_auth):
        r = requests.post(
            f"{BASE_URL}/api/orders",
            headers={**agent_auth["headers"], "Content-Type": "application/json"},
            json={
                "product_name": "X",
                "client_phone": "+998900000000",
                "store_address": "Addr",
                "photos": [TINY_PNG, TINY_PNG, TINY_PNG],
            },
            timeout=15,
        )
        assert r.status_code == 422

    def test_agent_lists_only_own_orders(self, agent_auth, created_order_id):
        r = requests.get(f"{BASE_URL}/api/orders", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert all(o["agent_id"] == agent_auth["user"]["id"] for o in items)
        assert any(o["id"] == created_order_id for o in items)

    def test_warehouse_lists_all_orders(self, warehouse_auth, created_order_id):
        r = requests.get(f"{BASE_URL}/api/orders", headers=warehouse_auth["headers"], timeout=15)
        assert r.status_code == 200
        ids = {o["id"] for o in r.json()}
        assert created_order_id in ids

    def test_agent_can_get_own_order(self, agent_auth, created_order_id):
        r = requests.get(f"{BASE_URL}/api/orders/{created_order_id}", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == created_order_id
        assert "status_history" in body

    def test_agent_cannot_update_status(self, agent_auth, created_order_id):
        r = requests.patch(
            f"{BASE_URL}/api/orders/{created_order_id}/status",
            headers={**agent_auth["headers"], "Content-Type": "application/json"},
            json={"status": "preparing"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_warehouse_status_transition_full_flow(self, warehouse_auth, created_order_id):
        for st in ["preparing", "delivered"]:
            r = requests.patch(
                f"{BASE_URL}/api/orders/{created_order_id}/status",
                headers={**warehouse_auth["headers"], "Content-Type": "application/json"},
                json={"status": st},
                timeout=15,
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["status"] == st
            assert body["status_history"][-1]["status"] == st
            assert body["status_history"][-1]["by_id"] == warehouse_auth["user"]["id"]

        # final history must contain new -> preparing -> delivered (at least)
        final = requests.get(f"{BASE_URL}/api/orders/{created_order_id}", headers=warehouse_auth["headers"], timeout=15).json()
        seq = [h["status"] for h in final["status_history"]]
        assert seq[0] == "new"
        assert "preparing" in seq
        assert seq[-1] == "delivered"


# ---------------- Stats ----------------
class TestStats:
    def test_admin_stats(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/stats/admin", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        for key in [
            "total_orders",
            "today_orders",
            "new_orders",
            "preparing_orders",
            "delivered_orders",
            "active_agents",
        ]:
            assert key in body
            assert isinstance(body[key], int)
        assert body["active_agents"] >= 1  # at least the test agent

    def test_agent_cannot_get_stats(self, agent_auth):
        r = requests.get(f"{BASE_URL}/api/stats/admin", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 403
