"""Application settings, loaded from environment / .env file.

Env var names deliberately UNPREFIXED (docs/AUTH.md §3, docs/PLAN.md
Phase 14) — SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY match
the names Supabase's own tooling uses; MISHKA_BASE_URL is the one call this
proxy makes outward. No JWT secret, no database URL — this app is stateless
(docs/AUTH.md §2's "deliberately absent" list is a build constraint, not a
suggestion).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .../Japan_website/apps/server/app/config.py — parents[1] = apps/server,
# where .env lives.
SERVER_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(SERVER_DIR / ".env"),
        extra="ignore",
    )

    environment: str = "development"

    # The one call this proxy makes outward (docs/AUTH.md §2). Loopback by
    # default; identity.py refuses a plain-http non-loopback URL at startup.
    mishka_base_url: str = "http://127.0.0.1:8000"

    # Supabase project — the mint (docs/API.md §9a). supabase_service_role_key
    # is the most sensitive credential in this project (docs/AUTH.md §4):
    # never in git, never in apps/web or anything VITE_*-prefixed, never
    # logged, placeholders only in any committed file.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # CORS — the SPA's origins only; no cookies, so no credentials needed
    # (docs/ARCHITECTURE.md §20d).
    cors_origins: list[str] = [
        "https://fyreline.github.io",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
