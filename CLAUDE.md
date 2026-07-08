# Japan 2026 — working notes for Claude

Two-person Japan-trip dashboard (20 Sep – 3 Oct 2026), being rebuilt as a React + Vite +
TypeScript + Tailwind v4 SPA on Supabase (no backend of ours). **docs/ is the spec and it
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
  *variables* in CI). The anon key is public by design; the `service_role` key must
  never appear in this repo. No other credentials exist here.
- `slot_key` / `client_submission_key` values are permanent sync handles — never rename.
- British English microcopy, calm tone, no exclamation-mark cheerleading.
- Commit prefix `phase-N:`; typecheck + build before every commit.
