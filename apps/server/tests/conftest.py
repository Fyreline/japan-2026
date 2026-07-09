"""Shared pytest fixtures. Sets test-only env vars BEFORE anything imports
the ``app`` package, since app/config.py reads settings at import time
(``get_settings()`` runs at module scope in app/main.py). No pytest-asyncio
needed: FastAPI's own dependency (starlette) pulls in anyio, which registers
its own pytest plugin, so plain ``@pytest.mark.anyio`` works for testing
async code directly (e.g. identity.py) without an extra dev dependency —
same as Michi's suite.
"""
from __future__ import annotations

import os

os.environ.setdefault("MISHKA_BASE_URL", "http://127.0.0.1:8000")
os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key-not-real")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-not-real")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import auth as auth_module  # noqa: E402
from app.routers import health as health_module  # noqa: E402


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _clean_state():
    """Reset the login rate-limit deque and the health-reachability cache —
    both module-level state that would otherwise leak between tests."""
    auth_module._login_failures.clear()
    health_module._cache["checked_at"] = 0.0
    health_module._cache["reachable"] = False
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
