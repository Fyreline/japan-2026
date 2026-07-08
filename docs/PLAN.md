# Japan 2026 — Build Plan

Docs-first (this suite), then phased implementation with explicit owners per task. Model policy per household preference: **[Opus] owns the app scaffold and the core visual/interactive rewrite — Vite project setup, Tailwind/theme wiring, every component, the itinerary drag-reorder + edit engine, Supabase wiring for both tables, and the GitHub Actions workflow. [Sonnet] owns the lighter mechanical follow-up — README/SUPABASE_SETUP rewrites, the committed SQL migration text, `.env.example`, launch.json, theme-sync bookkeeping.** Every phase ends at its acceptance criteria, independently verified by the orchestrator: **run the code, not the report — subagent claims are not evidence.**

What we're building (one line): the current single-file pink static site becomes a React + Vite + TypeScript + Tailwind v4 SPA in the sibling apps' exact stack, wearing the shared Aizome palette, with every existing feature preserved and one big upgrade — a time-slot itinerary that both travellers can edit, reorder and watch sync live ([ARCHITECTURE.md](ARCHITECTURE.md)).

| Phase | Scope | Owner | Spec |
|---|---|---|---|
| 1 | Scaffold & shell: Vite app, tokens, fonts, nav, theme toggle, auth gate, deploy workflow | Opus | ARCHITECTURE §2–5, §9–11 · DESIGN §2–5 |
| 2 | Data port & browse: datasets → TS/JSON modules, Ideas/Restaurants/Attractions/Animal cafés/Full data tabs, Leaflet map + 5 layers | Opus | DATA_MODEL §2–5 · DESIGN §7 |
| 3 | Submit & shared spots: form + `submitted_spots` load/insert/realtime/localStorage | Opus | DATA_MODEL §7–8 · API §2 |
| 4 | Itinerary engine: seed, day pills, slot editing, dnd-kit reorder, `itinerary_slots` sync + realtime + fallback | Opus | DATA_MODEL §6 · API §3 · DESIGN §6 |
| 5 | Cutover & ops: legacy file removal, README/SUPABASE_SETUP rewrites, migration file, .env.example, launch.json, theme-sync registration | Sonnet | DEPLOYMENT · ARCHITECTURE §10 |
| 6 | End-to-end verification against every doc's acceptance list, deploy check | Opus | all acceptance sections |

Sequencing: 1 → 2 → 3 → 4 → 5 → 6, strictly — each phase builds on the previous one's verified state, and this repo has no parallel tracks worth the coordination cost. Phases land as commits on `main` (two-person repo, no PR ceremony), message prefix `phase-N:`.

---

## Phase 1 — Scaffold & shell [Opus]

Everything needed for a deployable, gated, empty-but-styled app.

- [ ] [Opus] `apps/web` Vite project: `package.json` pinned to the household versions (react ^19.2.7, vite ^8.1.3, typescript ^6.0.3, tailwindcss + @tailwindcss/vite ^4.3.2, @vitejs/plugin-react ^6.0.3), `vite.config.ts` exactly per ARCHITECTURE §3 (**port 5175** — never 5173/5174), `tsconfig.json`, `npm run dev/build/typecheck` scripts.
- [ ] [Opus] Copy `theme.css` **byte-identical** from `learningLanguageMachine/apps/web/src/theme.css`; write `index.css` per DESIGN §2 (fonts via `@fontsource-variable/*` incl. Noto Sans JP, `@custom-variant dark`, app-local `@theme` for fonts/radii only); pre-paint theme script in `index.html`; `useTheme.ts` + `ThemeToggle.tsx` (port of Mishka's, storage key `japan-theme`).
- [ ] [Opus] Shell: `App.tsx` tab state, `Header.tsx` (wordmark, route strip, toggle, sign out / "Sign-in off" pill), `TabNav.tsx` (8 desktop tabs), `MobileNav.tsx` (5-item bottom bar with the Places grouping), `ToriiMark.tsx` + `public/torii-icon.svg` favicon, the seigaiha band (DESIGN §8), placeholder panels.
- [ ] [Opus] Auth: `lib/supabase.ts` (env-driven, null = open mode), `auth/useAuth.ts` per API §1, `LoginScreen.tsx` (Mishka layout, torii mark). Verify all four states: open (no `.env.local`), loading (no flash), signedOut (gate), signedIn.
- [ ] [Opus] `.github/workflows/deploy-pages.yml` per DEPLOYMENT §2 (`VITE_BASE=/japan-2026/`, repo **variables** `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, typecheck before build). Local `.env.local` (gitignored) carries the same two vars for dev; the committed `.env.example` lands in Phase 5.
- [ ] [Opus] `.gitignore` additions: `node_modules/`, `apps/web/dist/`, `apps/web/.env.local`, `.env*.local`. **The existing `OfflineExample.html` and `Japan Itinerary/` lines must remain untouched.**

**Acceptance:** `npm run typecheck && npm run build` clean; dev server on 5175 while Mishka (5173)/Michi (5174) run simultaneously; gate appears with creds and not without; dark/light both correct with no load flash; pushing the workflow file does NOT yet replace the live site (Pages still on deploy-from-branch until Phase 5's cutover).

## Phase 2 — Data port & browse tabs [Opus]

- [ ] [Opus] `data/types.ts` (every DATA_MODEL shape); port `accommodations.ts` (10 entries), `ideas.ts` (44 entries), `tripEssentials.ts`, `LEG_COLORS` (token-based)/`LEG_MAP` from the current `index.html` **verbatim in content** — no copy edits, no real names introduced.
- [ ] [Opus] Move the three JSON files into `src/data/`; write `normalize.ts` (destination-key parsing, tier→category, link coalescing, derived ids — DATA_MODEL §4) with a vitest or typecheck-level guarantee that all three files parse.
- [ ] [Opus] `IdeasList` (leg pills, search, city/suburb grouping, "See on map"), `RestaurantsList` / `AttractionsList` / `AnimalCafesList` (city + collapsible category pills, search), `FullDataList` (combined, grouped by city), all on shared `PlaceCard`/`FilterPills`/`SearchInput`; mobile segmented control across the four list views (DESIGN §4).
- [ ] [Opus] `MapView.tsx`: Leaflet via npm, CARTO light/dark tiles by theme, centre/zoom/maxBounds ported, 5 `layerGroup`s + toggle panel, token-coloured divIcon markers per DESIGN §5, popups, route polyline, fly-to integration from list cards.

**Acceptance:** every count matches the old site (44 ideas, 10 hotels/events, all restaurants/attractions/cafés render); each layer toggles; "See on map" flies and opens the right popup; search/filters behave like today; zero hex literals in any new file.

## Phase 3 — Submit & shared spots [Opus]

- [ ] [Opus] `SubmitForm.tsx`: current fields/vocab/validation ported (name, category, sub-category per category, cost tier 1–5, city, suburb, speciality, description, Google-Maps link, wait, booking).
- [ ] [Opus] `useSubmittedSpots.ts` per API §2 + DATA_MODEL §7: optimistic apply into the right dataset, coordinate extraction regexes, city fallbacks, localStorage `japan2026UserSubmissions`, Supabase insert, realtime INSERT channel, seen-keys dedup.
- [ ] [Opus] Success/failure copy ported ("Saved on this device. Shared sync failed right now." etc.), restyled per DESIGN.

**Acceptance:** two browsers signed in as the two users — a spot submitted in one appears live in the other's tab, map layer and Full data without reload; with `.env.local` removed, submissions persist locally across reloads; existing production rows load and render.

## Phase 4 — Itinerary engine [Opus]

The centrepiece. Prereq (one-time, human or orchestrator at the dashboard): apply API §3's SQL — table, RLS, trigger, publication, replica identity. The committed migration file itself is Phase 5's paperwork.

- [ ] [Opus] `itineraryDays.ts` (14 days from the live site's facts) + `itinerarySeed.ts` (~100 slots from the owner's prototype, reconciled per DATA_MODEL §6b — **day-3 evening is exactly the generic surprise slot, nothing after 18:00, no venue hints anywhere; no per-day budgets**).
- [ ] [Opus] `useItinerary.ts` per API §3d: load → seed-if-empty (race-proof upsert) → state Map; update/insert/delete by `slot_key`; fractional-position reorder + renumber guard; realtime channel (INSERT/UPDATE upsert, DELETE drop); localStorage snapshot + open-mode fallback; last-write-wins.
- [ ] [Opus] UI per DESIGN §6: `ItineraryPage`, collapsible `TripEssentials`, `DayPills` (leg-colour ticks), `DayHeader`, `SlotList` + `SlotRow` on `@dnd-kit/sortable` (touch + keyboard), inline text editing (blur/600 ms commit), type/time popover, ✕ with undo toast, `AddSlotRow` (no `prompt()`s), sync whisper line.

**Acceptance:** two browsers — edit text / change a type / drag a slot / add / delete in one, watch it apply in the other within a second, on the correct day only; reload mid-flight-mode (dev tools offline) still renders the last snapshot; first-load seeding from two racing tabs produces exactly one seed set; day-3 renders the surprise slot styled per DESIGN §6 with its generic text; keyboard-only reorder works.

## Phase 5 — Cutover & ops [Sonnet]

Mechanical, well-specified, no design judgment. **Do not touch `apps/web/src` logic in this phase.**

- [ ] [Sonnet] Commit `supabase/migrations/0001_itinerary_slots.sql` — the exact SQL text of API.md §3a–3c, header comment pointing at API.md.
- [ ] [Sonnet] Write `apps/web/.env.example` (per DEPLOYMENT §1: both `VITE_SUPABASE_*` vars, comments on where each value comes from and that the anon key is public-by-design).
- [ ] [Sonnet] Rewrite `README.md` for the new architecture: what the site is, the tabs, `apps/web` layout, local dev (`npm install`, `.env.local`, `npm run dev` → 5175), how to edit the JSON datasets now (edit → push → auto-deploy), what stays gitignored and why. Keep the friendly non-technical voice; **no real names; never name or hint at the 22 Sep venue.**
- [ ] [Sonnet] Rewrite `SUPABASE_SETUP.md`: keep the existing project/table/users/signups-off walkthrough, replace the `config.js` step with `.env.local` + the two GitHub repo **variables**, add the `itinerary_slots` SQL step (paste from the migration file), keep the anon-key safety explainer.
- [ ] [Sonnet] Cutover: delete legacy root `index.html` and `config.js`; confirm the three JSONs now live only under `apps/web/src/data/`; flip repo Settings → Pages → Source to **GitHub Actions** (coordinate with the owner — this is the moment the new site goes live); verify the workflow run deploys.
- [ ] [Sonnet] Update the shared `~/Documents/Dev/.claude/launch.json` (on the household machine — not a repo file): replace the old `japan-site` (python http.server 8123) entry with `japan-web` → `cd ~/Documents/Dev/Japan_website/apps/web && exec npm run dev`, port **5175**, `autoPort: false`. Leave every other entry untouched.
- [ ] [Sonnet] Theme-sync registration: in the **Michi repo**, add this repo's `apps/web/src/theme.css` as a second mirror target in `scripts/sync-theme.sh` and list it in `.claude/skills/theme-sync/SKILL.md` (values-only discipline now covers three apps).

**Acceptance:** fresh-clone test — `git clone` → `cd apps/web` → `npm install` → `npm run dev` runs in open mode with zero further steps; the live Pages URL serves the new app; both root guides read correctly against the shipped reality; `git log -p` for this phase shows no edits under `apps/web/src` beyond file moves.

## Phase 6 — Verification [Opus]

- [ ] [Opus] Walk **every acceptance checklist** in ARCHITECTURE/DATA_MODEL/DESIGN/API/DEPLOYMENT against the deployed site and local dev, both themes, mobile (375px) and desktop viewports, and record real command output / observed behaviour in the completion report.
- [ ] [Opus] Two-device realtime drill on production (two browsers, both real accounts): spots and slots sync both directions; sign-out re-gates; RLS probe — an unauthenticated `fetch` to the REST endpoint returns zero rows for both tables.
- [ ] [Opus] Regression sweep of preserved behaviours: all 8 views reachable on desktop, all views reachable on mobile via the Places grouping, layer toggles, fly-to, submit vocabularies, essentials content, day-3 discretion.
- [ ] [Opus] Lighthouse a11y ≥95 on Itinerary/Map/Ideas; reduced-motion pass; no console errors; network panel shows no CDN font/script fetches.

**Acceptance:** every box in every doc's checklist ticked or logged as a deliberate follow-up in this file; the household can plan dinner on two phones and watch it sync.

---

## Ground rules for implementing agents

1. Read the referenced docs **fully** before writing code; **docs/ wins over instinct.** A contradiction between docs is a stop-and-report, not a coin flip.
2. Ports are ports: the datasets, submission logic, map behaviour and gate semantics come from the current `index.html`; the visual layer comes from the sibling repos. Copy the real things and adapt — do not reinvent.
3. No dependencies beyond ARCHITECTURE §3's list without written justification in the commit message.
4. **No real names** in code, comments, data, commits or docs. **Never name or hint at the 22 Sep evening venue** — the seed text is `Evening — Booked up 🤫`, final.
5. No hex colours outside `theme.css` (favicon exception only). Token names are frozen.
6. `.gitignore`'s `OfflineExample.html` and `Japan Itinerary/` exclusions are load-bearing — never remove, never read those paths into any artefact.
7. Ports 5173/5174 belong to Mishka/Michi; this app is 5175 everywhere (dev, docs, launch.json).
8. Leave proof: each phase's completion report includes commands run and their real output (typecheck, build, the two-browser sync test) — the orchestrator re-runs them.
