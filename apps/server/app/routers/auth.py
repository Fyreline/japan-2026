"""POST /api/auth/login — docs/AUTH.md §2-3, docs/API.md §9.

Verify against Mishka Hub, then mint a genuine Supabase session and hand it
to the SPA. That is the entire route. No registration endpoint, no
refresh/logout/me routes here — supabase-js owns the session forever after
this one handoff (docs/AUTH.md §2's "deliberately absent" list).
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..errors import JapanHTTPException
from ..identity import (
    IdentityRateLimited,
    IdentityRejected,
    IdentityUnavailable,
    MishkaIdentityClient,
)
from ..sessions import SessionMintFailed, get_clients, mint_session

router = APIRouter(tags=["auth"])

# --- Japan's own login rate limit (docs/AUTH.md §2: "same 5-failures/
# 15-min/IP deque as Mishka and Michi"), in front of the identity proxy call
# so a brute force can't use Japan to hammer Mishka Hub — nor use the mint
# machinery as a password oracle. ---
_LOGIN_WINDOW_SECONDS = 15 * 60
_LOGIN_MAX_FAILURES = 5
_login_failures: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # cloudflared terminates TLS and proxies to loopback-only uvicorn, so
    # X-Forwarded-For is trustworthy here (docs/ARCHITECTURE.md §20d).
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    window = _login_failures[ip]
    while window and now - window[0] > _LOGIN_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= _LOGIN_MAX_FAILURES:
        raise JapanHTTPException(
            status_code=429,
            detail="Too many failed login attempts — try again later.",
            code="rate_limited",
        )


def _record_failure(ip: str) -> None:
    _login_failures[ip].append(time.monotonic())


def _record_success(ip: str) -> None:
    _login_failures.pop(ip, None)


class LoginBody(BaseModel):
    email: str
    password: str


class SessionPairBody(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


@router.post("/auth/login")
async def login(body: LoginBody, request: Request) -> SessionPairBody:
    ip = _client_ip(request)
    _check_rate_limit(ip)

    settings = request.app.state.settings
    identity: MishkaIdentityClient = request.app.state.identity
    email = body.email.strip().lower()

    try:
        await identity.verify(email, body.password)
    except IdentityRejected as exc:
        _record_failure(ip)
        raise JapanHTTPException(
            status_code=401, detail="Incorrect email or password", code="invalid_credentials"
        ) from exc
    except IdentityRateLimited as exc:
        raise JapanHTTPException(
            status_code=429,
            detail="Too many failed login attempts — try again later.",
            code="rate_limited",
        ) from exc
    except IdentityUnavailable as exc:
        raise JapanHTTPException(
            status_code=503,
            detail="Mishka Hub isn't reachable — Japan borrows its login. Is it running?",
            code="identity_unavailable",
        ) from exc

    # Verification succeeded — this attempt does not count against the rate
    # limit even if the mint below fails (that's Supabase's fault, not a
    # wrong password).
    _record_success(ip)

    try:
        admin, anon = get_clients(settings)
        pair = mint_session(admin, anon, email)
    except SessionMintFailed as exc:
        raise JapanHTTPException(
            status_code=503,
            detail="Signed in with Mishka Hub, but the session couldn't be finished — try again shortly.",
            code="session_mint_failed",
        ) from exc

    return SessionPairBody(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        expires_in=pair.expires_in,
        user={"id": pair.user_id, "email": pair.user_email},
    )
