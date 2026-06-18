"""PureNorth Städ backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://purenorth-stad.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@purenorthstad.se"
ADMIN_PASSWORD = "PureNorth2026!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---- Health / Root ----
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "PureNorth" in r.json().get("message", "")


# ---- Auth ----
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pass"})
    assert r.status_code == 401


def test_login_invalid_email_format():
    r = requests.post(f"{API}/auth/login", json={"email": "not-an-email", "password": "x"})
    assert r.status_code == 422


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_me_with_token(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---- Booking creation (public) ----
def test_create_booking_public():
    payload = {
        "name": "TEST_Anna Andersson",
        "email": "test_anna@example.com",
        "phone": "070-1234567",
        "kvm": "75",
        "services": ["Hemstädning", "Storstädning"],
        "preferred_date": "2026-02-15",
    }
    r = requests.post(f"{API}/bookings", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert data["status"] == "new"
    assert "id" in data or "_id" in data
    assert set(data["services"]) == {"Hemstädning", "Storstädning"}


def test_create_booking_with_annat():
    payload = {
        "name": "TEST_Annat User",
        "email": "test_annat@example.com",
        "phone": "070-0000000",
        "services": ["Annat"],
        "other_description": "Fönsterputs",
    }
    r = requests.post(f"{API}/bookings", json=payload)
    assert r.status_code == 200
    assert r.json()["other_description"] == "Fönsterputs"


def test_create_booking_missing_required():
    r = requests.post(f"{API}/bookings", json={"email": "x@y.com"})
    assert r.status_code == 422


# ---- Booking list (admin) ----
def test_list_bookings_no_auth():
    r = requests.get(f"{API}/bookings")
    assert r.status_code == 401


def test_list_bookings_invalid_token():
    r = requests.get(f"{API}/bookings", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 401


def test_list_bookings_admin(auth_headers):
    r = requests.get(f"{API}/bookings", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # at least our seeded ones
    assert any(b["name"].startswith("TEST_") for b in data)


# ---- CRUD: create, update status, delete ----
def test_full_booking_lifecycle(auth_headers):
    create = requests.post(f"{API}/bookings", json={
        "name": "TEST_Lifecycle",
        "email": "test_lifecycle@example.com",
        "phone": "070-9999999",
        "services": ["Kontorsstädning"],
    })
    assert create.status_code == 200
    bid = create.json().get("id") or create.json().get("_id")
    assert bid

    # Update status
    upd = requests.patch(f"{API}/bookings/{bid}/status", json={"status": "contacted"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json().get("success") is True

    # Verify persisted
    lst = requests.get(f"{API}/bookings", headers=auth_headers).json()
    match = [b for b in lst if (b.get("id") == bid or b.get("_id") == bid)]
    assert match and match[0]["status"] == "contacted"

    # Update status without auth
    no_auth = requests.patch(f"{API}/bookings/{bid}/status", json={"status": "done"})
    assert no_auth.status_code == 401

    # Delete
    delr = requests.delete(f"{API}/bookings/{bid}", headers=auth_headers)
    assert delr.status_code == 200

    # Verify deletion: subsequent delete returns 404
    delr2 = requests.delete(f"{API}/bookings/{bid}", headers=auth_headers)
    assert delr2.status_code == 404


def test_update_status_invalid_id(auth_headers):
    # Non-existent but valid ObjectId
    r = requests.patch(f"{API}/bookings/507f1f77bcf86cd799439011/status",
                       json={"status": "done"}, headers=auth_headers)
    assert r.status_code == 404


# ---- Cleanup ----
def test_cleanup_test_bookings(auth_headers):
    lst = requests.get(f"{API}/bookings", headers=auth_headers).json()
    for b in lst:
        if b.get("name", "").startswith("TEST_"):
            bid = b.get("id")
            if bid:
                requests.delete(f"{API}/bookings/{bid}", headers=auth_headers)
