"""docs/AUTH.md §2's "deliberately absent" list, as a standing test — not
just a one-time manual grep. If this ever fails, someone has started porting
Michi's session machinery (refresh-token table, rotation, reuse-detection
tripwire, a JWT secret, a database) into a proxy that doesn't need any of
it — docs/AUTH.md §2's own words: "stop — you've misread the design."
"""
from __future__ import annotations

import subprocess
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]


def test_deliberately_absent_terms_grep_clean():
    """PLAN.md Phase 14's exact acceptance grep, scoped to app/ — not this
    tests/ tree, since this very function's own source necessarily contains
    the pattern it's checking for (the same reason Michi's analogous
    ``test_no_argon2_anywhere`` scopes to ``app/`` rather than the whole
    ``apps/server``). Running the unscoped ``grep -ri "..." apps/server``
    from PLAN.md's acceptance line will show exactly one hit — this file —
    which is the check running, not a violation."""
    result = subprocess.run(
        ["grep", "-riE", "jwt_secret|argon2|refresh_tokens", str(SERVER_DIR / "app")],
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "", f"deliberately-absent term found: {result.stdout}"


def test_no_database_dependency_declared():
    requirements = (SERVER_DIR / "requirements.txt").read_text().lower()
    for forbidden in ("sqlalchemy", "alembic", "psycopg", "asyncpg", "pyjwt"):
        assert forbidden not in requirements, (
            f"{forbidden} should not appear in requirements.txt — this proxy has no "
            "database and mints Supabase sessions rather than issuing its own JWTs"
        )


def test_no_service_role_key_string_anywhere_in_the_committed_app():
    """A cheap standing proxy for the git-history/dist-bundle grep in
    PLAN.md's acceptance list — this one just checks nothing that *looks*
    like a real key literal is sitting in the source tree."""
    result = subprocess.run(
        ["grep", "-rIE", "sb_secret_|service_role.{0,20}=.{20,}", str(SERVER_DIR / "app")],
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "", f"possible hardcoded key found: {result.stdout}"
