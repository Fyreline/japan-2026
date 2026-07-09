"""The Supabase session mint — docs/API.md §9a's exact sequence, docs/AUTH.md
§2-4. The service_role client exists ONLY in this module (docs/AUTH.md §3
point 2) — never imported anywhere else, never logged.

Two layers, deliberately split for testability:
  * ``mint_session(admin, anon, email)`` — the pure sequence, takes both
    supabase-py clients as plain arguments. Tests pass in stub objects with
    the same method shape; no real Supabase call is ever made in the suite.
  * ``get_clients(settings)`` — lazily constructs and caches the two real
    module-level singleton clients from settings. Only ``routers/auth.py``
    calls this, in production.
"""
from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from typing import Any

from .config import Settings

logger = logging.getLogger(__name__)


class SessionMintFailed(Exception):
    """Any Supabase-side failure during the mint (docs/API.md §9a step 4).
    Never carries request details or the rotated password — docs/AUTH.md §4."""


@dataclass
class SessionPair:
    access_token: str
    refresh_token: str
    expires_in: int
    user_id: str
    user_email: str


def _fresh_password() -> str:
    # 32 bytes, base64 — never reused, never returned, never logged
    # (docs/AUTH.md §4).
    return secrets.token_urlsafe(32)


def mint_session(admin: Any, anon: Any, email: str) -> SessionPair:
    """docs/API.md §9a steps 3a-3d, verbatim. ``admin``/``anon`` are
    supabase-py ``Client`` instances (or test doubles with the same shape).
    Any exception anywhere in this sequence becomes ``SessionMintFailed`` —
    nothing is ever half-issued (docs/AUTH.md §2)."""
    email = email.strip().lower()
    try:
        # 3a. list + match by lower(email) — there is no stable get-by-email
        # admin call, and the project holds two users, ever.
        users = admin.auth.admin.list_users()
        user = next((u for u in users if (u.email or "").lower() == email), None)

        # 3b. auto-provision on first login — bounded by Mishka Hub's own
        # account list; an email only reaches this line once Mishka Hub has
        # just verified it.
        if user is None:
            created = admin.auth.admin.create_user(
                {"email": email, "email_confirm": True, "password": _fresh_password()}
            )
            user = created.user

        # 3c. rotate to noise — never reused, returned, or logged. Does NOT
        # revoke existing Supabase sessions (docs/AUTH.md §2).
        password = _fresh_password()
        admin.auth.admin.update_user_by_id(user.id, {"password": password})

        # 3d. a real sign-in with the anon client -> a genuine Supabase session.
        result = anon.auth.sign_in_with_password({"email": email, "password": password})
        session = result.session
        if session is None:
            raise SessionMintFailed("sign_in_with_password returned no session")

        return SessionPair(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in,
            user_id=session.user.id,
            user_email=session.user.email,
        )
    except SessionMintFailed:
        raise
    except Exception as exc:  # noqa: BLE001 - any Supabase-side error maps to 503
        # Never logs the exception's own text — it could echo request
        # details. Type name only (docs/AUTH.md §4).
        logger.warning("sessions: mint failed (%s)", type(exc).__name__)
        raise SessionMintFailed("could not mint a Supabase session") from exc


_admin_client: Any | None = None
_anon_client: Any | None = None


def get_clients(settings: Settings) -> tuple[Any, Any]:
    """Lazily constructs and caches the two real Supabase clients. Only
    called from routers/auth.py — never at import time, never in tests
    (docs/AUTH.md §3 point 2: the service_role client exists only here)."""
    global _admin_client, _anon_client
    if _admin_client is None or _anon_client is None:
        from supabase import create_client

        _admin_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        _anon_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _admin_client, _anon_client
