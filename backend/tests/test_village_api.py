"""End-to-end backend tests for Parent Link - The Village."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://family-support-app-6.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "passienc@gmail.com"
ADMIN_PASSWORD = "VillageAdmin2026!"


def _s():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _unique(prefix):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}"


def _register(role, name=None):
    s = _s()
    email = f"{_unique(role)}@example.com"
    body = {
        "name": name or f"Test {role.title()}",
        "email": email,
        "password": "StrongPass123!",
        "role": role,
        "neighborhood": "Klamath Falls",
    }
    r = s.post(f"{BASE_URL}/api/auth/register", json=body)
    assert r.status_code == 200, f"register {role}: {r.status_code} {r.text}"
    user = r.json()
    # Disable email notifications to avoid Resend sends during tests
    s.put(f"{BASE_URL}/api/profile", json={"email_notifications": False})
    return s, user, email


@pytest.fixture(scope="module")
def admin_session():
    s = _s()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def parent_ctx():
    s, u, e = _register("parent")
    return {"session": s, "user": u, "email": e, "password": "StrongPass123!"}


@pytest.fixture(scope="module")
def volunteer_ctx():
    s, u, e = _register("volunteer")
    return {"session": s, "user": u, "email": e, "password": "StrongPass123!"}


# ---------- Health & Auth ----------
class TestHealthAndAuth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "Village" in r.json().get("message", "")

    def test_admin_login(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        assert r.json()["email"] == ADMIN_EMAIL

    def test_register_parent_and_volunteer(self, parent_ctx, volunteer_ctx):
        assert parent_ctx["user"]["role"] == "parent"
        assert volunteer_ctx["user"]["role"] == "volunteer"
        # Both should get authenticated via cookies
        r = parent_ctx["session"].get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200

    def test_register_duplicate_email(self, parent_ctx):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dup", "email": parent_ctx["email"], "password": "StrongPass123!",
            "role": "parent", "neighborhood": "Klamath Falls",
        })
        assert r.status_code == 400

    def test_register_invalid_role(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "x", "email": f"{_unique('bad')}@example.com", "password": "StrongPass123!",
            "role": "wizard", "neighborhood": "Klamath Falls",
        })
        assert r.status_code == 400

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_bearer_token_also_works(self, parent_ctx):
        # Pull access_token cookie from the session and use as Bearer
        tok = parent_ctx["session"].cookies.get("access_token")
        assert tok, "access_token cookie should exist"
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200

    def test_brute_force_lockout(self):
        # Use a fresh unique email to avoid colliding with other tests
        email = f"{_unique('lock')}@example.com"
        # Create the account first so email exists but password is wrong
        s = _s()
        s.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Lock", "email": email, "password": "StrongPass123!",
            "role": "parent", "neighborhood": "Klamath Falls",
        })
        got_429 = False
        last = None
        for _ in range(7):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "WRONG_pwd_xx"})
            last = r.status_code
            if r.status_code == 429:
                got_429 = True
                break
        assert got_429, f"expected 429 after repeated failures, last={last}"

    def test_logout(self, volunteer_ctx):
        s = _s()
        s.post(f"{BASE_URL}/api/auth/login", json={"email": volunteer_ctx["email"], "password": "StrongPass123!"})
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        r2 = s.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 401


# ---------- Origin guard ----------
class TestOriginGuard:
    def test_disallowed_origin_blocked(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Origin": "https://evil.example.com", "Content-Type": "application/json"},
        )
        assert r.status_code == 403

    def test_allowed_origin_ok(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Origin": BASE_URL, "Content-Type": "application/json"},
        )
        assert r.status_code == 200


# ---------- Requests & permissions ----------
class TestRequestsFlow:
    def test_parent_creates_request_and_sees_mine(self, parent_ctx):
        s = parent_ctx["session"]
        payload = {
            "category": "ride", "title": "TEST ride to school",
            "description": "Need help getting kids to school tomorrow.",
            "neighborhood": "Klamath Falls", "needed_date": "2026-02-01",
            "needed_time": "08:00", "urgency": "normal", "kids_count": 2,
            "location_note": "Main St",
        }
        r = s.post(f"{BASE_URL}/api/requests", json=payload)
        assert r.status_code == 200, r.text
        req = r.json()
        assert req["status"] == "open"
        assert req["parent_id"] == parent_ctx["user"]["user_id"]
        parent_ctx["request_id"] = req["request_id"]

        mine = s.get(f"{BASE_URL}/api/requests/mine").json()
        assert any(x["request_id"] == req["request_id"] for x in mine)

    def test_volunteer_only_denied_create(self, volunteer_ctx):
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests", json={
            "category": "ride", "title": "nope", "description": "nope description",
            "neighborhood": "Klamath Falls", "needed_date": "2026-02-01",
        })
        assert r.status_code == 403

    def test_parent_only_denied_board(self, parent_ctx):
        r = parent_ctx["session"].get(f"{BASE_URL}/api/requests/open")
        assert r.status_code == 403

    def test_volunteer_sees_open_board_and_accepts(self, parent_ctx, volunteer_ctx):
        rid = parent_ctx["request_id"]
        board = volunteer_ctx["session"].get(f"{BASE_URL}/api/requests/open").json()
        assert any(x["request_id"] == rid for x in board)

        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/accept")
        assert r.status_code == 200
        assert r.json()["status"] == "accepted"
        assert r.json()["volunteer_id"] == volunteer_ctx["user"]["user_id"]

    def test_double_accept_conflict(self, parent_ctx, volunteer_ctx):
        rid = parent_ctx["request_id"]
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/accept")
        assert r.status_code == 409

    def test_parent_notified_on_accept(self, parent_ctx):
        r = parent_ctx["session"].get(f"{BASE_URL}/api/notifications").json()
        assert r["unread"] >= 1
        assert any(n["type"] == "accepted" for n in r["items"])

    def test_messages_flow(self, parent_ctx, volunteer_ctx):
        rid = parent_ctx["request_id"]
        # Volunteer sends a message
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/messages", json={"text": "Hi there!"})
        assert r.status_code == 200
        # Parent sends reply
        r = parent_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/messages", json={"text": "Thank you"})
        assert r.status_code == 200
        # Both can list
        msgs = parent_ctx["session"].get(f"{BASE_URL}/api/requests/{rid}/messages").json()
        assert len(msgs) >= 2

    def test_non_participant_denied_messages(self, parent_ctx):
        s, _u, _e = _register("volunteer")
        rid = parent_ctx["request_id"]
        r = s.get(f"{BASE_URL}/api/requests/{rid}/messages")
        assert r.status_code == 403
        r2 = s.post(f"{BASE_URL}/api/requests/{rid}/messages", json={"text": "hi"})
        assert r2.status_code == 403

    def test_status_in_progress_and_complete(self, parent_ctx, volunteer_ctx):
        rid = parent_ctx["request_id"]
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/status", json={"action": "in_progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"
        r = parent_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/status", json={"action": "completed"})
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_withdraw_action(self, parent_ctx, volunteer_ctx):
        # Create new request, accept, withdraw
        payload = {"category": "meals", "title": "TEST meal", "description": "need a meal please",
                   "neighborhood": "Klamath Falls", "needed_date": "2026-02-02"}
        rid = parent_ctx["session"].post(f"{BASE_URL}/api/requests", json=payload).json()["request_id"]
        volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/accept")
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/status", json={"action": "withdraw"})
        assert r.status_code == 200
        assert r.json()["status"] == "open"
        # Parent cancels
        r = parent_ctx["session"].post(f"{BASE_URL}/api/requests/{rid}/status", json={"action": "cancelled"})
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"


# ---------- Profile & reports ----------
class TestProfilesAndReports:
    def test_profile_update(self, parent_ctx):
        r = parent_ctx["session"].put(f"{BASE_URL}/api/profile", json={"bio": "TEST bio text"})
        assert r.status_code == 200
        assert r.json()["bio"] == "TEST bio text"

    def test_public_profile(self, parent_ctx, volunteer_ctx):
        uid = volunteer_ctx["user"]["user_id"]
        r = parent_ctx["session"].get(f"{BASE_URL}/api/users/{uid}")
        assert r.status_code == 200
        assert r.json()["user_id"] == uid
        assert "helped_count" in r.json()

    def test_report_user_and_admin_resolve(self, parent_ctx, volunteer_ctx, admin_session):
        uid = volunteer_ctx["user"]["user_id"]
        r = parent_ctx["session"].post(f"{BASE_URL}/api/reports", json={
            "target_type": "user", "target_id": uid, "reason": "TEST reason", "details": "details"
        })
        assert r.status_code == 200
        rid = r.json()["report_id"]
        reports = admin_session.get(f"{BASE_URL}/api/admin/reports").json()
        assert any(x["report_id"] == rid for x in reports)
        res = admin_session.post(f"{BASE_URL}/api/admin/reports/{rid}/resolve", json={"admin_note": "handled"})
        assert res.status_code == 200

    def test_general_safety_report(self, parent_ctx):
        r = parent_ctx["session"].post(f"{BASE_URL}/api/reports", json={
            "target_type": "general", "reason": "TEST concern", "details": "safety details"
        })
        assert r.status_code == 200


# ---------- Listings ----------
class TestListings:
    def test_resources_seeded(self):
        r = requests.get(f"{BASE_URL}/api/listings", params={"type": "resource"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 6, f"expected >=6 seeded resources, got {len(data)}"

    def test_businesses_empty(self):
        r = requests.get(f"{BASE_URL}/api/listings", params={"type": "business"})
        assert r.status_code == 200
        # Allowed to be empty on fresh env; just check it's a list
        assert isinstance(r.json(), list)

    def test_resources_search_and_filter(self):
        r = requests.get(f"{BASE_URL}/api/listings", params={"type": "resource", "q": "211"})
        assert r.status_code == 200
        assert any("211" in x["name"] for x in r.json())
        r = requests.get(f"{BASE_URL}/api/listings", params={"type": "resource", "category": "Crisis & Safety"})
        assert all(x["category"] == "Crisis & Safety" for x in r.json())

    def test_suggest_and_approve_flow(self, volunteer_ctx, admin_session):
        payload = {"type": "business", "name": "TEST Diner", "category": "Grocery & Market",
                   "description": "TEST business", "town": "Klamath Falls"}
        r = volunteer_ctx["session"].post(f"{BASE_URL}/api/listings/suggest", json=payload)
        assert r.status_code == 200
        lid = r.json()["listing_id"]
        assert r.json()["status"] == "pending"
        # Not shown publicly
        pub = requests.get(f"{BASE_URL}/api/listings", params={"type": "business"}).json()
        assert all(x["listing_id"] != lid for x in pub)
        # Admin approves
        r = admin_session.post(f"{BASE_URL}/api/admin/listings/{lid}/approve")
        assert r.status_code == 200
        # Now visible publicly
        pub2 = requests.get(f"{BASE_URL}/api/listings", params={"type": "business"}).json()
        assert any(x["listing_id"] == lid for x in pub2)
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/admin/listings/{lid}")

    def test_admin_add_listing(self, admin_session):
        payload = {"type": "resource", "name": "TEST Admin Resource", "category": "Food",
                   "description": "admin seeded"}
        r = admin_session.post(f"{BASE_URL}/api/admin/listings", json=payload)
        assert r.status_code == 200
        lid = r.json()["listing_id"]
        assert r.json()["status"] == "approved"
        admin_session.delete(f"{BASE_URL}/api/admin/listings/{lid}")


# ---------- Admin suspend ----------
class TestAdminSuspend:
    def test_suspend_blocks_api(self, admin_session):
        s, u, _e = _register("parent")
        # Confirm access first
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200
        r = admin_session.post(f"{BASE_URL}/api/admin/users/{u['user_id']}/suspend")
        assert r.status_code == 200
        assert r.json()["suspended"] is True
        # Suspended user should 403
        r2 = s.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 403, f"expected 403, got {r2.status_code} {r2.text}"
        # Unsuspend to allow cleanup
        admin_session.post(f"{BASE_URL}/api/admin/users/{u['user_id']}/suspend")

    def test_cannot_suspend_self(self, admin_session):
        me = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        r = admin_session.post(f"{BASE_URL}/api/admin/users/{me['user_id']}/suspend")
        assert r.status_code == 400


# ---------- Admin stats ----------
class TestAdminStats:
    def test_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "open_requests", "active_requests", "completed_requests",
                  "open_reports", "pending_listings"):
            assert k in d

    def test_non_admin_denied(self, parent_ctx):
        r = parent_ctx["session"].get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 403


# ---------- Cleanup ----------
def _mongo_cleanup():
    try:
        from pymongo import MongoClient
    except ImportError:
        return
    import os as _os
    url = _os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    dbname = _os.environ.get("DB_NAME", "test_database")
    cli = MongoClient(url)
    db = cli[dbname]
    # Delete all TEST_ users and their data
    test_users = list(db.users.find({"email": {"$regex": "^test_", "$options": "i"}}))
    uids = [u["user_id"] for u in test_users]
    if uids:
        db.messages.delete_many({"sender_id": {"$in": uids}})
        req_ids = [r["request_id"] for r in db.requests.find({"parent_id": {"$in": uids}})]
        db.messages.delete_many({"request_id": {"$in": req_ids}})
        db.requests.delete_many({"$or": [{"parent_id": {"$in": uids}}, {"volunteer_id": {"$in": uids}}]})
        db.notifications.delete_many({"user_id": {"$in": uids}})
        db.reports.delete_many({"$or": [{"reporter_id": {"$in": uids}}, {"target_id": {"$in": uids}}]})
        db.user_sessions.delete_many({"user_id": {"$in": uids}})
        db.users.delete_many({"user_id": {"$in": uids}})
    db.listings.delete_many({"name": {"$regex": "^TEST ", "$options": "i"}})
    db.login_attempts.delete_many({})
    cli.close()


@pytest.fixture(scope="session", autouse=True)
def _cleanup_at_end():
    yield
    _mongo_cleanup()
