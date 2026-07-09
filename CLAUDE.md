# Japan 2026 — working notes for Claude

Two-person Japan-trip dashboard (20 Sep – 3 Oct 2026), a React + Vite + TypeScript +
Tailwind v4 SPA on Supabase. No backend of ours in the data path — the one exception is
the tiny sign-in proxy (`apps/server`, docs/AUTH.md) that borrows Mishka Hub's login and
mints a Supabase session, then stays out of everything. **docs/ is the spec and it
wins** — read docs/PLAN.md first, then the doc for whatever you're touching. Phases and
[Opus]/[Sonnet] owners live in docs/PLAN.md.

## Commands

```
apps/web:  npm run dev                       # port 5175 — Mishka owns 5173, Michi 5174,
           npm run typecheck && npm run build    #   never take theirs. Must stay green.
```

Preview entry in the shared `~/…/Dev/.claude/launch.json`: `japan-web` (5175).

## Hard rules

- **No real names anywhere** — code, data, comments, commits, docs. The travellers are
  "the two of you". GitHub user is `Fyreline`.
- **The 22 Sep evening stays generic**: the itinerary seed slot is exactly
  `Evening — Booked up 🤫` (type `surprise`). Never name, guess at, or hint at the venue
  in any file. If you think you know it, you still don't.
- **Colours**: only semantic tokens (`bg-paper`, `text-clay`, …). Values live in
  `apps/web/src/theme.css` — a byte-identical mirror of the shared Aizome palette
  (canonical in `learningLanguageMachine`, see its `.claude/skills/theme-sync`).
  Never hardcode a hex in a component; never rename a token. Favicon SVG is the
  sole hex exception.
- `.gitignore`'s `OfflineExample.html` and `Japan Itinerary/` exclusions must stay —
  never remove them, never read those paths into anything you write.
- Secrets: Supabase creds are Vite env vars (`.env.local`, gitignored; repo Actions
  *variables* in CI). The anon key is public by design. The `service_role` key lives
  ONLY in the gitignored `apps/server/.env` on the household Mac — never in git, never
  in `apps/web` or anything `VITE_*`, never logged, placeholders only in committed
  files (docs/AUTH.md §4). No other credentials exist here — Japan holds no passwords;
  login proxies to Mishka Hub.
- `slot_key` / `client_submission_key` values are permanent sync handles — never rename.
- British English microcopy, calm tone, no exclamation-mark cheerleading.
- Commit prefix `phase-N:`; typecheck + build before every commit.
