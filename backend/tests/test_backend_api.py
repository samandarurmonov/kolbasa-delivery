"""Backend tests for Agentlar / Field-agent app — PIN auth + products + order edit/delete/cancel + profile + autofill + stats."""
import os
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path("/app/frontend/.env"))
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZlVJOMAAAAASUVORK5CYII="


# ---------------- Health ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------- Auth (PIN) ----------------
class TestAuthPin:
    def test_default_admin_login(self, admin_auth):
        assert admin_auth["user"]["role"] == "admin"
        assert admin_auth["user"]["phone"] == "+998940634110"
        assert "pin_hash" not in admin_auth["user"]
        assert "_id" not in admin_auth["user"]

    def test_login_wrong_pin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"phone": "+998940634110", "pin": "9999"}, timeout=15)
        assert r.status_code == 401

    def test_login_unknown_phone(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"phone": "+998999999999", "pin": "1234"}, timeout=15)
        assert r.status_code == 404

    def test_login_invalid_format(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"phone": "12345", "pin": "1234"}, timeout=15)
        assert r.status_code == 422

    def test_me(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "admin"
        assert "_id" not in body and "pin_hash" not in body


# ---------------- Profile editing ----------------
class TestProfile:
    def test_update_name_and_pin(self, admin_auth):
        # Create a fresh test user, change name + pin, login again with new pin
        phone = "+998904444444"
        # cleanup if exists
        users = requests.get(f"{BASE_URL}/api/users", headers=admin_auth["headers"], timeout=15).json()
        existing = next((u for u in users if u["phone"] == phone), None)
        if existing:
            requests.delete(f"{BASE_URL}/api/users/{existing['id']}", headers=admin_auth["headers"], timeout=15)
        cr = requests.post(f"{BASE_URL}/api/users",
                           headers={**admin_auth["headers"], "Content-Type": "application/json"},
                           json={"phone": phone, "name": "TEST_Profile", "role": "agent", "pin": "4444"},
                           timeout=15)
        assert cr.status_code == 200
        uid = cr.json()["id"]

        # login
        lr = requests.post(f"{BASE_URL}/api/auth/login", json={"phone": phone, "pin": "4444"}, timeout=15)
        assert lr.status_code == 200
        tok = lr.json()["token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

        # update name
        pr = requests.patch(f"{BASE_URL}/api/auth/me", headers=h, json={"name": "TEST_NewName"}, timeout=15)
        assert pr.status_code == 200
        assert pr.json()["name"] == "TEST_NewName"
        assert "pin_hash" not in pr.json()

        # update pin
        pr2 = requests.patch(f"{BASE_URL}/api/auth/me", headers=h, json={"pin": "5555"}, timeout=15)
        assert pr2.status_code == 200

        # old pin should fail
        bad = requests.post(f"{BASE_URL}/api/auth/login", json={"phone": phone, "pin": "4444"}, timeout=15)
        assert bad.status_code == 401
        # new pin should succeed
        good = requests.post(f"{BASE_URL}/api/auth/login", json={"phone": phone, "pin": "5555"}, timeout=15)
        assert good.status_code == 200

        # cleanup
        requests.delete(f"{BASE_URL}/api/users/{uid}", headers=admin_auth["headers"], timeout=15)


# ---------------- Products ----------------
class TestProducts:
    def test_admin_create_with_category_autofills_name(self, admin_auth):
        cats = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15).json()
        cat = cats[0]
        r = requests.post(f"{BASE_URL}/api/products",
                          headers={**admin_auth["headers"], "Content-Type": "application/json"},
                          json={"name": "TEST_Prod_A", "category_id": cat["id"], "image": TINY_PNG},
                          timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "TEST_Prod_A"
        assert body["category_id"] == cat["id"]
        assert body["category_name"] == cat["name"]
        assert body["image"] == TINY_PNG
        assert "_id" not in body

        # GET verifies persistence
        lst = requests.get(f"{BASE_URL}/api/products", headers=admin_auth["headers"], timeout=15).json()
        match = next((p for p in lst if p["id"] == body["id"]), None)
        assert match is not None
        assert match["category_name"] == cat["name"]
        assert match["image"] == TINY_PNG

        # cleanup
        d = requests.delete(f"{BASE_URL}/api/products/{body['id']}", headers=admin_auth["headers"], timeout=15)
        assert d.status_code == 200

    def test_agent_can_get_products_but_not_post_or_delete(self, agent_auth, admin_auth):
        # Admin creates a product
        cats = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15).json()
        cr = requests.post(f"{BASE_URL}/api/products",
                           headers={**admin_auth["headers"], "Content-Type": "application/json"},
                           json={"name": "TEST_Prod_B", "category_id": cats[0]["id"]},
                           timeout=15)
        assert cr.status_code == 200
        pid = cr.json()["id"]

        # agent GET
        gr = requests.get(f"{BASE_URL}/api/products", headers=agent_auth["headers"], timeout=15)
        assert gr.status_code == 200

        # agent POST -> 403
        pr = requests.post(f"{BASE_URL}/api/products",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"name": "TEST_AgentBlocked"},
                           timeout=15)
        assert pr.status_code == 403

        # agent DELETE -> 403
        dr = requests.delete(f"{BASE_URL}/api/products/{pid}", headers=agent_auth["headers"], timeout=15)
        assert dr.status_code == 403

        # cleanup
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=admin_auth["headers"], timeout=15)


# ---------------- Orders: create with product, edit/delete, status, cancel ----------------
class TestOrdersFlow:
    @pytest.fixture(scope="class")
    def product_id(self, admin_auth):
        cats = requests.get(f"{BASE_URL}/api/categories", headers=admin_auth["headers"], timeout=15).json()
        cat = cats[0]
        r = requests.post(f"{BASE_URL}/api/products",
                          headers={**admin_auth["headers"], "Content-Type": "application/json"},
                          json={"name": "TEST_OrderProd", "category_id": cat["id"], "image": TINY_PNG},
                          timeout=15)
        assert r.status_code == 200
        pid = r.json()["id"]
        yield pid
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=admin_auth["headers"], timeout=15)

    def test_agent_create_with_product_autofills_image_and_category(self, agent_auth, product_id, admin_auth):
        r = requests.post(f"{BASE_URL}/api/orders",
                          headers={**agent_auth["headers"], "Content-Type": "application/json"},
                          json={
                              "product_id": product_id,
                              "product_name": "TEST_OrderProd",
                              "client_phone": "+998905555555",
                              "client_name": "TEST_Client",
                              "store_address": "Tashkent, Chilonzor",
                              "latitude": 41.3,
                              "longitude": 69.24,
                              "quantity": "5kg",
                          },
                          timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["product_image"] == TINY_PNG
        assert body["category_name"]  # auto from product
        assert body["status"] == "new"
        assert body["agent_id"] == agent_auth["user"]["id"]
        assert "_id" not in body
        # cleanup
        requests.delete(f"{BASE_URL}/api/orders/{body['id']}", headers=agent_auth["headers"], timeout=15)

    def test_agent_edit_own_new_order(self, agent_auth):
        # create order
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": "X", "client_phone": "+998906000001",
                                 "store_address": "addr"}, timeout=15)
        assert cr.status_code == 200
        oid = cr.json()["id"]
        # edit
        pr = requests.patch(f"{BASE_URL}/api/orders/{oid}",
                            headers={**agent_auth["headers"], "Content-Type": "application/json"},
                            json={"product_name": "X2", "quantity": "9kg"}, timeout=15)
        assert pr.status_code == 200
        assert pr.json()["product_name"] == "X2"
        assert pr.json()["quantity"] == "9kg"
        # cleanup
        requests.delete(f"{BASE_URL}/api/orders/{oid}", headers=agent_auth["headers"], timeout=15)

    def test_agent_cannot_edit_non_new_order(self, agent_auth, warehouse_auth):
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": "Y", "client_phone": "+998906000002",
                                 "store_address": "addr"}, timeout=15)
        oid = cr.json()["id"]
        # warehouse moves to preparing
        wr = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                            headers={**warehouse_auth["headers"], "Content-Type": "application/json"},
                            json={"status": "preparing", "comment": "OK boshladik"}, timeout=15)
        assert wr.status_code == 200
        # comment appended in history
        last = wr.json()["status_history"][-1]
        assert last["status"] == "preparing"
        assert last["comment"] == "OK boshladik"

        # agent edit -> 400 (not new)
        pr = requests.patch(f"{BASE_URL}/api/orders/{oid}",
                            headers={**agent_auth["headers"], "Content-Type": "application/json"},
                            json={"product_name": "Z"}, timeout=15)
        assert pr.status_code == 400
        # agent delete -> 400 (not new)
        dr = requests.delete(f"{BASE_URL}/api/orders/{oid}", headers=agent_auth["headers"], timeout=15)
        assert dr.status_code == 400
        # cleanup via admin
        # re-login admin not needed, use warehouse? warehouse delete is 403; admin can delete
        # We'll need an admin header; obtained from another fixture not available here, so skip cleanup

    def test_agent_can_cancel_own_new_order_but_not_other_status(self, agent_auth):
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": "C", "client_phone": "+998906000003",
                                 "store_address": "addr"}, timeout=15)
        oid = cr.json()["id"]
        # try preparing -> 403
        bad = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                             headers={**agent_auth["headers"], "Content-Type": "application/json"},
                             json={"status": "preparing"}, timeout=15)
        assert bad.status_code == 403
        # cancel -> 200
        ok = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                            headers={**agent_auth["headers"], "Content-Type": "application/json"},
                            json={"status": "cancelled", "comment": "Mijoz bekor qildi"}, timeout=15)
        assert ok.status_code == 200
        body = ok.json()
        assert body["status"] == "cancelled"
        assert body["status_history"][-1]["comment"] == "Mijoz bekor qildi"

    def test_warehouse_cannot_edit_body_but_can_change_status(self, agent_auth, warehouse_auth):
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": "W", "client_phone": "+998906000004",
                                 "store_address": "addr"}, timeout=15)
        oid = cr.json()["id"]
        # warehouse PATCH body -> 403
        pr = requests.patch(f"{BASE_URL}/api/orders/{oid}",
                            headers={**warehouse_auth["headers"], "Content-Type": "application/json"},
                            json={"product_name": "Hacked"}, timeout=15)
        assert pr.status_code == 403
        # warehouse status -> 200
        sr = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                            headers={**warehouse_auth["headers"], "Content-Type": "application/json"},
                            json={"status": "delivered"}, timeout=15)
        assert sr.status_code == 200

    def test_search_and_date_filter(self, agent_auth, admin_auth):
        # create an order with unique product name
        unique = "TEST_SEARCH_TOKEN_ZZZ"
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": unique, "client_phone": "+998906000099",
                                 "store_address": "addr"}, timeout=15)
        assert cr.status_code == 200
        oid = cr.json()["id"]
        # search by q
        sr = requests.get(f"{BASE_URL}/api/orders?q={unique}", headers=admin_auth["headers"], timeout=15)
        assert sr.status_code == 200
        ids = [o["id"] for o in sr.json()]
        assert oid in ids
        # from_date in future returns nothing
        fr = requests.get(f"{BASE_URL}/api/orders?from_date=2099-01-01T00:00:00Z",
                          headers=admin_auth["headers"], timeout=15)
        assert fr.status_code == 200
        assert oid not in [o["id"] for o in fr.json()]
        # cleanup
        requests.delete(f"{BASE_URL}/api/orders/{oid}", headers=agent_auth["headers"], timeout=15)


# ---------------- Client autofill ----------------
class TestClientLookup:
    def test_lookup_returns_last_order_data(self, agent_auth):
        phone = "+998906999999"
        cr = requests.post(f"{BASE_URL}/api/orders",
                           headers={**agent_auth["headers"], "Content-Type": "application/json"},
                           json={"product_name": "AF", "client_phone": phone,
                                 "client_name": "TEST_Autofill",
                                 "store_address": "AF addr 42",
                                 "latitude": 41.1, "longitude": 69.5}, timeout=15)
        assert cr.status_code == 200
        oid = cr.json()["id"]
        lr = requests.get(f"{BASE_URL}/api/clients/lookup",
                          params={"phone": phone},
                          headers=agent_auth["headers"], timeout=15)
        assert lr.status_code == 200
        body = lr.json()
        assert body is not None
        assert body["client_name"] == "TEST_Autofill"
        assert body["store_address"] == "AF addr 42"
        assert body["latitude"] == 41.1
        assert body["longitude"] == 69.5
        # cleanup
        requests.delete(f"{BASE_URL}/api/orders/{oid}", headers=agent_auth["headers"], timeout=15)

    def test_lookup_unknown_phone_returns_null(self, agent_auth):
        r = requests.get(f"{BASE_URL}/api/clients/lookup?phone=+998900000777",
                         headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json() is None


# ---------------- Stats ----------------
class TestStats:
    def test_admin_stats_has_top_lists_and_cancelled(self, admin_auth):
        r = requests.get(f"{BASE_URL}/api/stats/admin", headers=admin_auth["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        for k in ["total_orders", "today_orders", "new_orders", "preparing_orders",
                  "delivered_orders", "cancelled_orders", "active_agents",
                  "top_agents", "top_products"]:
            assert k in body, f"missing {k}"
        assert isinstance(body["top_agents"], list)
        assert isinstance(body["top_products"], list)
        # top_products items should have name/count and possibly image
        for tp in body["top_products"]:
            assert "name" in tp and "count" in tp
            assert "image" in tp  # may be None

    def test_agent_cannot_get_stats(self, agent_auth):
        r = requests.get(f"{BASE_URL}/api/stats/admin", headers=agent_auth["headers"], timeout=15)
        assert r.status_code == 403
