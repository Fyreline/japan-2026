"""app/sessions.py — the Supabase session mint (docs/API.md §9a), exercised
against stub admin/anon clients shaped like supabase-py's. No real Supabase
call is ever made in this suite — get_clients() (the only place that
constructs a real client) is never invoked here.
"""
from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.sessions import SessionMintFailed, mint_session


@dataclass
class FakeUser:
    id: str
    email: str


@dataclass
class FakeSession:
    access_token: str
    refresh_token: str
    expires_in: int
    user: FakeUser


class _Resp:
    """A tiny stand-in for supabase-py's response wrapper objects, which
    carry the payload on a named attribute (.user / .session)."""


class FakeAdminAuth:
    def __init__(self, existing_users=None):
        self.users = list(existing_users or [])
        self.updated: list[tuple[str, dict]] = []
        self.created: list[dict] = []

    def list_users(self):
        return list(self.users)

    def create_user(self, attrs):
        user = FakeUser(id="new-user-id", email=attrs["email"])
        self.users.append(user)
        self.created.append(attrs)
        resp = _Resp()
        resp.user = user
        return resp

    def update_user_by_id(self, user_id, attrs):
        self.updated.append((user_id, attrs))


class FakeAdminClient:
    def __init__(self, existing_users=None):
        self._admin_auth = FakeAdminAuth(existing_users)
        self.auth = type("Auth", (), {"admin": self._admin_auth})()


class FakeAnonAuth:
    def __init__(self, session_factory):
        self._session_factory = session_factory
        self.calls: list[dict] = []

    def sign_in_with_password(self, creds):
        self.calls.append(creds)
        resp = _Resp()
        resp.session = self._session_factory(creds)
        return resp


class FakeAnonClient:
    def __init__(self, session_factory):
        self.auth = FakeAnonAuth(session_factory)


def _default_session_factory(creds):
    return FakeSession(
        access_token="access-abc",
        refresh_token="refresh-xyz",
        expires_in=3600,
        user=FakeUser(id="user-1", email=creds["email"]),
    )


def test_mint_existing_user_rotates_and_signs_in():
    existing = FakeUser(id="user-1", email="amy@example.com")
    admin = FakeAdminClient(existing_users=[existing])
    anon = FakeAnonClient(_default_session_factory)

    pair = mint_session(admin, anon, "amy@example.com")

    assert pair.access_token == "access-abc"
    assert pair.refresh_token == "refresh-xyz"
    assert pair.expires_in == 3600
    assert pair.user_id == "user-1"
    assert pair.user_email == "amy@example.com"

    # never auto-provisioned a new user, since one already existed
    assert admin._admin_auth.created == []
    # rotated exactly once, keyed on the existing user's id
    assert len(admin._admin_auth.updated) == 1
    assert admin._admin_auth.updated[0][0] == "user-1"
    rotated_password = admin._admin_auth.updated[0][1]["password"]
    assert len(rotated_password) > 20  # secrets.token_urlsafe(32)-shaped

    # the rotated password is what actually signed in
    assert anon.auth.calls[0]["password"] == rotated_password
    assert anon.auth.calls[0]["email"] == "amy@example.com"


def test_mint_unknown_user_auto_provisions():
    admin = FakeAdminClient(existing_users=[])
    anon = FakeAnonClient(_default_session_factory)

    pair = mint_session(admin, anon, "new@example.com")

    assert pair.user_email == "new@example.com"
    assert len(admin._admin_auth.created) == 1
    assert admin._admin_auth.created[0]["email"] == "new@example.com"
    assert admin._admin_auth.created[0]["email_confirm"] is True
    # rotated AFTER creation too — the create-time password is never the one used
    assert len(admin._admin_auth.updated) == 1


def test_mint_lowercases_email_for_lookup():
    existing = FakeUser(id="user-1", email="amy@example.com")
    admin = FakeAdminClient(existing_users=[existing])
    anon = FakeAnonClient(_default_session_factory)

    pair = mint_session(admin, anon, "AMY@EXAMPLE.com")

    assert pair.user_id == "user-1"
    assert admin._admin_auth.created == [], "should have matched the existing user, no duplicate"


def test_mint_never_reuses_the_rotated_password():
    existing = FakeUser(id="user-1", email="amy@example.com")
    admin = FakeAdminClient(existing_users=[existing])
    anon = FakeAnonClient(_default_session_factory)

    mint_session(admin, anon, "amy@example.com")
    mint_session(admin, anon, "amy@example.com")

    passwords_used = [c["password"] for c in anon.auth.calls]
    assert passwords_used[0] != passwords_used[1]


def test_mint_does_not_revoke_a_concurrent_sessions_password_mid_flight():
    """docs/AUTH.md §2: rotation does not revoke existing Supabase sessions —
    two phones racing each get a working session pair from their own call."""
    existing = FakeUser(id="user-1", email="amy@example.com")
    admin = FakeAdminClient(existing_users=[existing])
    anon = FakeAnonClient(_default_session_factory)

    pair_1 = mint_session(admin, anon, "amy@example.com")
    pair_2 = mint_session(admin, anon, "amy@example.com")

    assert pair_1.access_token == "access-abc"
    assert pair_2.access_token == "access-abc"
    assert len(admin._admin_auth.updated) == 2


def test_mint_raises_session_mint_failed_on_admin_error():
    class ExplodingAdminAuth(FakeAdminAuth):
        def list_users(self):
            raise RuntimeError("supabase admin api unreachable")

    admin = FakeAdminClient()
    admin._admin_auth = ExplodingAdminAuth()
    admin.auth = type("Auth", (), {"admin": admin._admin_auth})()
    anon = FakeAnonClient(_default_session_factory)

    with pytest.raises(SessionMintFailed):
        mint_session(admin, anon, "amy@example.com")


def test_mint_raises_session_mint_failed_when_sign_in_returns_no_session():
    existing = FakeUser(id="user-1", email="amy@example.com")
    admin = FakeAdminClient(existing_users=[existing])
    anon = FakeAnonClient(lambda creds: None)

    with pytest.raises(SessionMintFailed):
        mint_session(admin, anon, "amy@example.com")


def test_session_mint_failed_never_carries_the_password_in_its_message():
    class ExplodingAdminAuth(FakeAdminAuth):
        def list_users(self):
            raise RuntimeError("supabase admin api unreachable")

    admin = FakeAdminClient()
    admin._admin_auth = ExplodingAdminAuth()
    admin.auth = type("Auth", (), {"admin": admin._admin_auth})()
    anon = FakeAnonClient(_default_session_factory)

    with pytest.raises(SessionMintFailed) as exc_info:
        mint_session(admin, anon, "amy@example.com")

    assert "password" not in str(exc_info.value).lower()
