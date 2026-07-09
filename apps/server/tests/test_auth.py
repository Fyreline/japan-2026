"""routers/auth.py — the one login route (docs/AUTH.md §2-3, docs/API.md
§9). Identity verification is stubbed via respx (Mishka Hub calls); the
Supabase mint is stubbed by monkeypatching sessions.mint_session/get_clients
directly — the mint's own internals are covered in test_sessions.py.
"""
from __future__ import annotations

import httpx
import respx

from app.sessions import SessionMintFailed, SessionPair

MISHKA_BASE = "http://127.0.0.1:8000"


def _mock_mishka_login_success(email="amy@example.com", display_name="Amy", mishka_id=7):
    respx.post(f"{MISHKA_BASE}/api/auth/login").mock(
        return_value=httpx.Response(
            200,
            json={
                "access_token": "throwaway",
                "refresh_token": "throwaway-refresh",
                "expires_in": 900,
                "user": {"id": mishka_id, "email": email, "display_name": display_name},
            },
        )
    )
    respx.post(f"{MISHKA_BASE}/api/auth/logout").mock(return_value=httpx.Response(200, json={"logged_out": True}))


def _stub_mint_success(monkeypatch):
    def fake_mint(admin, anon, email_arg):
        return SessionPair(
            access_token="sb-access-abc",
            refresh_token="sb-refresh-xyz",
            expires_in=3600,
            user_id="user-uuid-1",
            user_email=email_arg,
        )

    monkeypatch.setattr("app.routers.auth.get_clients", lambda settings: (object(), object()))
    monkeypatch.setattr("app.routers.auth.mint_session", fake_mint)


@respx.mock
def test_login_success_returns_a_genuine_supabase_session_pair(client, monkeypatch):
    _mock_mishka_login_success()
    _stub_mint_success(monkeypatch)

    res = client.post("/api/auth/login", json={"email": "Amy@Example.com", "password": "hunter2"})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"] == "sb-access-abc"
    assert body["refresh_token"] == "sb-refresh-xyz"
    assert body["expires_in"] == 3600
    assert body["user"]["email"] == "amy@example.com"
    assert body["user"]["id"] == "user-uuid-1"
    # the rotated Supabase password never appears anywhere in the response
    assert "password" not in str(body).lower()


@respx.mock
def test_login_wrong_password_returns_401(client):
    respx.post(f"{MISHKA_BASE}/api/auth/login").mock(
        return_value=httpx.Response(401, json={"detail": "no", "code": "invalid_credentials"})
    )
    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "wrong"})
    assert res.status_code == 401
    assert res.json()["code"] == "invalid_credentials"


@respx.mock
def test_login_mishka_down_returns_503_identity_unavailable(client):
    respx.post(f"{MISHKA_BASE}/api/auth/login").mock(side_effect=httpx.ConnectError("refused"))
    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "hunter2"})
    assert res.status_code == 503
    assert res.json()["code"] == "identity_unavailable"


@respx.mock
def test_login_mishka_rate_limited_returns_429(client):
    respx.post(f"{MISHKA_BASE}/api/auth/login").mock(return_value=httpx.Response(429, json={"detail": "slow down"}))
    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "hunter2"})
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"


@respx.mock
def test_session_mint_failure_returns_503_session_mint_failed_with_no_tokens(client, monkeypatch):
    _mock_mishka_login_success()

    def fake_mint(admin, anon, email_arg):
        raise SessionMintFailed("boom")

    monkeypatch.setattr("app.routers.auth.get_clients", lambda settings: (object(), object()))
    monkeypatch.setattr("app.routers.auth.mint_session", fake_mint)

    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "hunter2"})
    assert res.status_code == 503
    body = res.json()
    assert body["code"] == "session_mint_failed"
    # nothing half-issued — no access/refresh token in a failure body
    assert "access_token" not in body
    assert "refresh_token" not in body


@respx.mock
def test_repeated_failed_logins_trip_japans_own_rate_limit_and_sixth_never_reaches_mishka(client):
    route = respx.post(f"{MISHKA_BASE}/api/auth/login").mock(
        return_value=httpx.Response(401, json={"detail": "no", "code": "invalid_credentials"})
    )
    for _ in range(5):
        res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "wrong"})
        assert res.status_code == 401
    assert route.call_count == 5

    # 6th attempt in the window: Japan's own limiter trips before even
    # calling Mishka Hub — the exact assertion PLAN.md's acceptance list
    # calls out by name.
    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "wrong"})
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"
    assert route.call_count == 5, "the sixth attempt must never reach Mishka Hub"


@respx.mock
def test_rate_limit_is_per_ip(client):
    respx.post(f"{MISHKA_BASE}/api/auth/login").mock(
        return_value=httpx.Response(401, json={"detail": "no", "code": "invalid_credentials"})
    )
    for _ in range(5):
        client.post(
            "/api/auth/login",
            json={"email": "amy@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": "10.0.0.1"},
        )
    # a different IP is unaffected
    res = client.post(
        "/api/auth/login",
        json={"email": "amy@example.com", "password": "wrong"},
        headers={"X-Forwarded-For": "10.0.0.2"},
    )
    assert res.status_code == 401  # not 429 — a fresh IP, not rate-limited


@respx.mock
def test_successful_verification_does_not_count_against_the_rate_limit(client, monkeypatch):
    """A right password that then hits a transient mint failure shouldn't
    burn through the failed-attempt budget — that's Supabase's fault, not a
    wrong password."""
    _mock_mishka_login_success()

    def fake_mint(admin, anon, email_arg):
        raise SessionMintFailed("boom")

    monkeypatch.setattr("app.routers.auth.get_clients", lambda settings: (object(), object()))
    monkeypatch.setattr("app.routers.auth.mint_session", fake_mint)

    for _ in range(5):
        res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "hunter2"})
        assert res.status_code == 503

    # a 6th attempt still reaches Mishka Hub (not rate-limited) — successful
    # verification never got recorded as a failure.
    res = client.post("/api/auth/login", json={"email": "amy@example.com", "password": "hunter2"})
    assert res.status_code == 503
    assert res.json()["code"] == "session_mint_failed"


def test_no_registration_endpoint(client):
    """docs/AUTH.md §2: 'no registration endpoint exists' — there is only
    one credential store (Mishka Hub's)."""
    res = client.post("/api/auth/register", json={})
    assert res.status_code == 404


def test_no_refresh_logout_or_me_endpoints(client):
    """docs/AUTH.md §2's 'deliberately absent' list — these routes must not
    exist; supabase-js owns the session after the one handoff."""
    assert client.post("/api/auth/refresh", json={}).status_code == 404
    assert client.post("/api/auth/logout", json={}).status_code == 404
    assert client.get("/api/auth/me").status_code == 404
