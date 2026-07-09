"""Japan 2026 identity proxy — the one API of ours (docs/AUTH.md,
docs/ARCHITECTURE.md §20).

Stateless: verifies against Mishka Hub, mints a genuine Supabase session,
hands it over. No database, no JWT secret, no session store of its own —
after the one handoff, supabase-js owns the session forever.

Run locally with:
    uvicorn app.main:app --port 8103 --reload
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .errors import register_error_handlers
from .identity import MishkaIdentityClient
from .routers import auth, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.identity = MishkaIdentityClient(settings.mishka_base_url)
    logger.info("lifespan: Mishka base url = %s", settings.mishka_base_url)
    yield


def create_app() -> FastAPI:
    app_settings = get_settings()
    app = FastAPI(title="Japan 2026 identity proxy", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        # Bearer-less: the login response body carries the session pair
        # once, then supabase-js owns it. No cookies (docs/AUTH.md §4).
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")

    return app


app = create_app()
