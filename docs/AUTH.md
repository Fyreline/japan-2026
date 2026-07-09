# Japan 2026 — Auth: one household identity, shared with Mishka Hub

**Requirement (verbatim from the brief):** Japan signs in with the same email/password as
Mishka Hub, and a change to either is reflected in both automatically — with no changes to
Mishka Hub itself.

**Design answer: there is only one credential store — Mishka Hub's.** Japan never stores,
hashes, or even *sees a hash of* a password. At login, Japan's tiny server verifies the
submitted email/password by calling Mishka Hub's own login endpoint — exactly as Michi
already does in production (`learningLanguageMachine/docs/AUTH.md`). A password or email
changed in Mishka Hub (via its `scripts/set_password.py`) is therefore *instantly and
automatically* the credential for Japan — there is no second copy to update, no sync job,
no drift. This satisfies "update automatically" by construction.

Where Japan departs from Michi is what happens *after* verification. Michi issues its own
JWT/refresh pair because it has its own database and its own session-gated API. Japan has
neither: every synced byte already lives behind **Supabase's own session** (RLS
`to authenticated`, realtime, signed Storage URLs, SDK-owned refresh). So instead of
issuing tokens, Japan's server **mints a genuine Supabase session** for the matching
Supabase Auth user and hands it to the SPA — one handoff, then supabase-js owns the
session forever and the server is out of the picture entirely
([ARCHITECTURE.md](ARCHITECTURE.md) §20e).

## 1. Why not the alternatives

| Option | Verdict |
|---|---|
| Copy the credentials into Supabase Auth + a sync job | Two sources of truth, sync bugs, exactly what the requirement fears. **No.** |
| Japan reads Mishka's SQLite directly | Cross-app DB coupling, schema lock-in, file-lock hazards with two uvicorns. **No.** |
| Shared JWT secret — SPA logs into Mishka, Supabase trusts Mishka tokens | Supabase RLS only honours JWTs signed with the project's own secret; wiring Mishka's secret into a cloud service couples secret rotation across apps and hands Mishka's signing key to a third party. **No.** |
| Michi's full design — proxy verification, then issue our **own** tokens | Right for Michi, waste for Japan: with no database and no API of ours, own tokens would be a second, parallel session system that gates nothing — every byte of Japan's data answers only to a Supabase session. **No.** |
| Proxy verification, then conjure a session via magic-link/OTP internals (`generateLink` etc.) | Less certain to get right without live testing (verification-URL plumbing, PKCE variants, flow-state coupling). **No.** |
| **Proxy the login *verification* to Mishka Hub, then mint a real Supabase session — admin password-rotate + `signInWithPassword` — and hand it to the SPA** | One credential store, zero password handling anywhere new, only boring stable Admin API surface, and after one handoff the session is 100 % Supabase's own: RLS, realtime, offline refresh and the PWA all work exactly as already shipped. **Yes.** |

## 2. Flow

```
LoginScreen ──(email, password over HTTPS)──► Japan POST /api/auth/login (8102)
    rate limit: 5 failures / 15 min / IP, BEFORE any onward call
    Japan server ──POST {MISHKA_BASE_URL}/api/auth/login (httpx, 5s timeout)──► Mishka Hub (8000)
        200 → body.user {id, email, display_name}   → verified ✓
        401 → invalid credentials                    → Japan returns 401, same shape
        429 → Mishka's rate limit tripped            → Japan returns 429, message passed through
        conn error / timeout → Japan returns 503 code="identity_unavailable",
              detail "Mishka Hub isn't reachable — Japan borrows its login. Is it running?"
    on verified — mint a genuine Supabase session (service_role, server-side only):
        1. look up the Supabase Auth user by lower(email)  (admin list — two users, ever)
        2. none? admin.create_user({email, email_confirm: true, password: <fresh random>})
           — auto-provision on first login; bounded by Mishka Hub's own account list
        3. admin.update_user_by_id(user_id, {password: <fresh 32-byte random>})
        4. anon-key client signInWithPassword({email, password: <that same random>})
           → a real Supabase session {access_token, refresh_token, expires_in, user}
        any Supabase-side failure → 503 code="session_mint_failed" (nothing half-issued)
    response body: {access_token, refresh_token, expires_in, user:{id, email}}
LoginScreen ◄── supabase.auth.setSession({access_token, refresh_token})
    — from this moment it is a completely normal Supabase session, persisted in
      localStorage and auto-refreshed by supabase-js against Supabase's cloud.
      The household Mac is out of the picture until the next fresh sign-in.
```

Notes:

- **"What's the Supabase password?" — there isn't a meaningful one.** It is rotated to 32
  bytes of noise on every login, never reused, never returned to the frontend, never
  logged, and irrelevant the moment the session exists. The two Supabase Auth accounts are
  never meant to be signed into any other way; anyone puzzled later about "the Supabase
  password" should reread this line rather than go looking for one.
- The rotation does **not** revoke existing Supabase sessions — two phones signing in the
  same minute each keep a working session (the second rotation lands after the first
  sign-in already completed).
- **The Mishka-side session created by the verification call is discarded** — Japan throws
  away the token pair Mishka returns (never persisted, never logged); the identity client
  fires a best-effort `POST /api/auth/logout` with it so Mishka's `refresh_tokens` table
  stays tidy. Michi's discipline, ported unchanged.
- Japan adds its own login rate limit (same 5-failures/15-min/IP deque as Mishka and
  Michi) *in front of* the proxy call, so a brute force can't use Japan to hammer Mishka
  Hub — nor use the mint machinery as a password oracle.
- `identity.py` is one small class (`MishkaIdentityClient.verify(email, password) ->
  IdentityUser`), ported near-verbatim from Michi's
  `apps/server/app/identity.py`, so tests stub it trivially.
- **Deliberately absent, and it must stay absent:** refresh/logout/me endpoints, a
  refresh-token table, rotation, the reuse-detection tripwire, a JWT secret, any database.
  Those solve Michi's problem (own sessions over own data); Japan's sessions are
  Supabase's problem, already solved. If you find yourself porting Michi's `security.py`,
  stop — you've misread the design.

## 3. Server pieces (implementation order for the agent)

1. `app/identity.py` — port from Michi `apps/server/app/identity.py` near-verbatim: the
   typed `IdentityUnavailable` / `IdentityRejected` / `IdentityRateLimited` exceptions,
   the loopback-or-HTTPS base-URL guard at construction, the fixed-message
   never-log-the-password discipline, the best-effort logout of the throwaway Mishka
   session, the 1 s `ping()` probe. Config name changes only (`MISHKA_BASE_URL`).
2. `app/sessions.py` — the mint, exactly per [API.md](API.md) §9a's Python sequence:
   admin lookup (list + match by `lower(email)` — two users, ever) → create-if-missing →
   password rotate → anon `sign_in_with_password` → session pair. Raises a typed
   `SessionMintFailed` on any Supabase-side error (mapped to 503). The service_role
   client exists only in this module.
3. `app/main.py` + `app/config.py` — FastAPI app, CORS allow-list
   (`https://fyreline.github.io`, `http://localhost:5175`, `http://127.0.0.1:5175`),
   pydantic-settings over `.env` (`MISHKA_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. `app/routers/auth.py` — the one login route: rate-limit deque (Michi's
   `routers/auth.py` shape, including the `X-Forwarded-For` handling) → identity verify →
   mint → return the pair. `app/routers/health.py` — Michi's health probe minus
   `content_version`.
5. Frontend `src/auth/useAuth.ts` — `signIn()` becomes fetch [API.md](API.md) §9a +
   `setSession()`; error `detail` feeds the existing error line. Nothing else in the auth
   surface moves ([API.md](API.md) §1).

## 4. Security posture

- Passwords transit Japan's process memory during login only; never written to disk,
  logs, or error messages. The identity client must redact the body from any logged
  exception — Michi's §4 rule, ported with the code.
- **The `service_role` key is the most sensitive credential in this design** — it
  bypasses RLS entirely, on the same project that holds the household's real trip data.
  It gets the same handling discipline as passwords, plus: it lives **only** in the
  gitignored `apps/server/.env` on the household Mac; never in git history, never in
  `apps/web` or anything `VITE_*`-prefixed (those bake into the public bundle — the two
  must never meet), never in Actions, never in any committed file or doc (placeholders
  like `<service-role-key-here>` only), never echoed, logged or included in exception
  text — startup config dumps included. Rotating it in the dashboard invalidates nothing
  but this one `.env` line. Comparable sensitivity to Mishka's/Michi's JWT secrets, and
  the discipline is the same.
- The mint runs entirely server-side: the browser only ever receives the same session
  pair an ordinary Supabase sign-in would produce — no admin capability, no rotated
  password, nothing elevated crosses the wire.
- The rotated password is generated with `secrets.token_urlsafe(32)`, used for exactly
  one `sign_in_with_password` call, and goes out of scope. It is never reused, returned,
  or logged (see §2's first note).
- Rate limit 5/15-min/IP in front of the proxy call; `X-Forwarded-For` is trustworthy
  because cloudflared terminates TLS and proxies to loopback-only uvicorn
  ([ARCHITECTURE.md](ARCHITECTURE.md) §20d).
- CORS: explicit origin allow-list; no cookies, no stored credentials — the login
  response body carries the session pair once, then supabase-js owns it.
- The verification call targets loopback (`http://127.0.0.1:8000` — Mishka Hub is on the
  same Mac); `identity.py` refuses a plain-http non-loopback base URL at startup, same
  guard as Michi's.

## 5. Acceptance criteria

- [ ] Logging into Japan with current Mishka Hub credentials succeeds and lands a
      **genuine Supabase session**: `supabase.auth.getSession()` non-null, itinerary rows
      load, realtime frames arrive. Wrong password → 401 `code="invalid_credentials"`.
- [ ] Change the password via Mishka's `set_password.py` → the old password immediately
      fails on Japan, the new one works, with **zero** Japan-side action.
- [ ] Stop Mishka Hub's server → Japan login returns the friendly 503 — **and the big
      one:** an *already signed-in* Japan session keeps working with Mishka Hub down, the
      Japan proxy down, and the whole Mac off: reads, writes, realtime, a token refresh
      past the access token's expiry, and a fully-offline PWA relaunch all succeed.
- [ ] The rotated Supabase password appears in no log, no response body, and no error
      message; signing in to Supabase directly with any human-guessable password fails.
- [ ] `git log -S service_role` and a grep of the repo + built `apps/web/dist` bundle
      find the key nowhere; `apps/server/.env` is untracked; `.env.example` carries
      placeholders only.
- [ ] `grep -ri "jwt_secret\|argon2\|refresh_tokens" apps/server` returns nothing — the
      proof the §2 "deliberately absent" list stayed absent.
- [ ] Rate limit: five wrong passwords from one IP → 429, and the sixth attempt never
      reaches Mishka Hub (assert against the stubbed identity client).
- [ ] Japan and a sibling SPA signed in side-by-side in one browser: signing out of one
      never signs out the other (Japan's session lives under supabase-js's own storage
      key; the siblings' under `mishka-refresh-token` / `michi-refresh-token`).
