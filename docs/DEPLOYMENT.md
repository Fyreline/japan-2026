# Japan 2026 — Deployment & Operations

The runbook for putting the rebuilt site in production and keeping it there: local dev, GitHub Pages via Actions, the Supabase env-variable wiring, schema-change procedure, and rollback. Written to be executed top-to-bottom on a fresh setup and consulted piecemeal later. Topology rationale: [ARCHITECTURE.md](ARCHITECTURE.md) §11. The friendly, non-technical Supabase walkthrough stays in [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) — this doc cross-references it rather than duplicating it.

**Status: planned.** Today the repo deploys from branch (`main`/root serves the old `index.html`); the cutover to Actions happens in [PLAN.md](PLAN.md) Phase 5. There is nothing else to operate — **no server, no tunnel, no LaunchAgent** ends this doc several sections earlier than its siblings'.

---

## 1. Local development

```bash
cd ~/Documents/Dev/Japan_website/apps/web
npm install
npm run dev          # → http://localhost:5175
```

- **Port 5175 is this app's, permanently** — Mishka web owns 5173, Michi web 5174; all three run side-by-side. The shared `~/…/Dev/.claude/launch.json` carries a `japan-web` entry on 5175 (Phase 5 replaces the old `japan-site` static-server entry).
- **Open mode (default):** with no `.env.local`, `import.meta.env.VITE_SUPABASE_*` are undefined, the Supabase client is null, and the site runs fully — no gate, submissions and itinerary edits persist to this browser's localStorage. This is the intended zero-setup dev experience and the permanent fallback ([ARCHITECTURE.md](ARCHITECTURE.md) §5).
- **Signed-in mode locally:** create `apps/web/.env.local` (gitignored) from the committed template:

```bash
# apps/web/.env.example  →  copy to .env.local and fill in
# Project URL — Supabase dashboard → Project Settings → API
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# anon/publishable key (sb_publishable_…) — same page. Public by design;
# RLS is the security boundary. NEVER put the service_role key anywhere.
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Restart `npm run dev` after creating it (Vite reads env files at startup). Sign in with one of the two household accounts.

- Gates before any commit: `npm run typecheck && npm run build` clean (same bar as the siblings).

## 2. Frontend → GitHub Pages (via Actions)

### 2a. One-time repo setup (manual, in the GitHub UI)

1. Repo `Fyreline/japan-2026` is **public** — free-plan Pages works as-is.
2. **Settings → Pages → Source: GitHub Actions.** (This retires the current deploy-from-branch mode; do it at Phase 5's cutover moment, not before, or the live site briefly races the old one.)
3. **Settings → Secrets and variables → Actions → Variables** (variables, *not* secrets — the anon key is public by design and using a variable keeps it visible/auditable):
   - `VITE_SUPABASE_URL` = the project URL
   - `VITE_SUPABASE_ANON_KEY` = the `sb_publishable_…` key
4. Push to `main` → the site deploys to `https://fyreline.github.io/japan-2026/`.

### 2b. The workflow (`.github/workflows/deploy-pages.yml`)

Mirror of the siblings' pattern (same actions, same node), adapted: no `VITE_API_BASE` — this app's only build-time config is the Supabase pair.

```yaml
name: deploy-pages
on:
  push:
    branches: [main]
    paths: ['apps/web/**', '.github/workflows/deploy-pages.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
        working-directory: apps/web
      - run: npm run typecheck
        working-directory: apps/web
      - run: npm run build
        working-directory: apps/web
        env:
          VITE_BASE: /japan-2026/
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
  # (upload-pages-artifact with path: apps/web/dist, then a deploy job
  #  running actions/deploy-pages@v4 — identical to Michi's file.)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(The build job's final step is `actions/upload-pages-artifact@v3` with `path: apps/web/dist` — elided above for brevity; copy Michi's file and adapt.)

Notes:

- `VITE_BASE=/japan-2026/` must match the repo name exactly (case included) or every asset 404s.
- The env pair is **baked at build time**. If the Supabase project URL or key ever changes: update the two repo variables, then re-run the workflow (Actions → deploy-pages → Run workflow) or push any `apps/web/**` change. Variables absent → the deployed site silently runs in open mode — that is the failure smell if the live site ever stops showing the sign-in gate.
- If the variables aren't set yet when the workflow first runs, the build still succeeds (open mode); set them and re-run.

### 2c. How to redeploy (day to day)

`git push` to `main` touching `apps/web/**`. That's the whole procedure: Actions builds (typecheck → build), uploads, Pages flips atomically. Watch the run in the Actions tab; a red build leaves the previous deploy serving.

## 3. Supabase operations

Project facts: one free-tier project (EU/London), two auth users (auto-confirmed, signups disabled), two tables (`submitted_spots` live today, `itinerary_slots` added by this redesign), both RLS-locked to `authenticated` and in the `supabase_realtime` publication. Friendly setup narrative: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md).

### 3a. Applying a schema change

1. The change is written in [API.md](API.md) first (the contract), and mirrored as a numbered file under `supabase/migrations/` (paperwork — there is no CLI pipeline; the dashboard is the applier).
2. Dashboard → **SQL Editor → New query** → paste → **Run**. All the SQL in API.md is idempotent-friendly (`if not exists`, `create policy` guarded by dropping/renaming when revised) — re-running a block should be safe or explicitly documented otherwise.
3. For the initial `itinerary_slots` install, run API.md §3a → §3b → §3c in one paste. Verify: **Table Editor** shows the table; **Database → Publications** lists it under `supabase_realtime`; `select relreplident from pg_class where relname='itinerary_slots'` returns `f` (full).
4. Schema-change policy: **additive only** while the trip data is live (new columns nullable/defaulted; never rename `slot_key`/`client_submission_key` or narrow a check constraint without a data migration written into the same SQL).

### 3b. Housekeeping recipes (SQL editor)

```sql
-- wipe test spots (same recipe as the original setup doc)
delete from public.submitted_spots where name like 'test%';

-- inspect the itinerary as the travellers see it
select day, "position", time_label, slot_type, content
from public.itinerary_slots order by day, "position";

-- re-seed ONE day from scratch (delete its rows; the app reseeds nothing
-- over a non-empty table, so re-insert by hand or temporarily empty the
-- whole table to trigger the app's seed — DATA_MODEL.md §6f)
delete from public.itinerary_slots where day = 8;
```

### 3c. Backup (cheap and sufficient)

The dataset is ~100–200 tiny rows. Before any risky change (and once before the flight): SQL editor → `select * from public.itinerary_slots order by day, "position"` → export CSV from the results pane (same for `submitted_spots`). Free tier has daily automated backups but no PITR — the CSV-in-a-safe-place habit is the real safety net, and localStorage on both phones is an accidental third copy.

## 4. Rollback

| What broke | Procedure |
|---|---|
| Bad deploy (app bug) | `git revert <sha>` → push → Actions redeploys the previous behaviour in ~2 min. (Pages has no built-in "previous artifact" button; revert-and-push *is* the rollback.) |
| Build red on `main` | Previous deploy keeps serving; fix forward or revert at leisure. |
| Wrong/rotated Supabase variables | Fix the two repo variables → re-run the workflow. Symptom of missing vars: live site in open mode (no gate). |
| Schema change gone wrong | Restore from the §3c CSV (Table Editor → insert, or `copy`/`insert` SQL); the additive-only policy (§3a) exists precisely so this stays trivial. |
| Itinerary data mangled by a sync bug | Both phones hold a `japan2026ItinerarySlots` localStorage snapshot — read it via devtools, reconstruct rows, re-insert. Then fix the bug before re-enabling edits. |
| Need the old site urgently | It lives in git history: `git checkout <last-pre-cutover-sha> -- index.html config.js` on a branch, flip Pages back to deploy-from-branch. Break-glass only. |

## 5. Acceptance criteria

- [ ] Fresh clone → `npm install` → `npm run dev` gives a working open-mode app on 5175 with zero configuration.
- [ ] `.env.local` with real values → local sign-in gate works against production Supabase.
- [ ] Push to `main` auto-deploys; site loads at `https://fyreline.github.io/japan-2026/` with correct asset paths (`VITE_BASE`) and shows the gate (variables baked in).
- [ ] Repo variables are Variables, not Secrets; no `service_role` string anywhere in repo or Actions config (search both).
- [ ] `itinerary_slots` verified live: table + 4 policies + publication + replica identity full, per §3a step 3.
- [ ] The two `.gitignore` exclusions (`OfflineExample.html`, `Japan Itinerary/`) still hold post-cutover; `git ls-files` shows neither, and no `.env.local` is tracked.
- [ ] Rollback drill performed once: revert a trivial commit, confirm redeploy; export both tables' CSV and file them somewhere safe.
