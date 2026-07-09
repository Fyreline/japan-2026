# Japan 2026 — Build Plan

Docs-first (this suite), then phased implementation with explicit owners per task. Model policy per household preference: **[Opus] owns the app scaffold and the core visual/interactive rewrite — Vite project setup, Tailwind/theme wiring, every component, the itinerary drag-reorder + edit engine, Supabase wiring for both tables, and the GitHub Actions workflow. [Sonnet] owns the lighter mechanical follow-up — README/SUPABASE_SETUP rewrites, the committed SQL migration text, `.env.example`, launch.json, theme-sync bookkeeping.** Every phase ends at its acceptance criteria, independently verified by the orchestrator: **run the code, not the report — subagent claims are not evidence.**

What we're building (one line): the current single-file pink static site becomes a React + Vite + TypeScript + Tailwind v4 SPA in the sibling apps' exact stack, wearing the shared Aizome palette, with every existing feature preserved and one big upgrade — a time-slot itinerary that both travellers can edit, reorder and watch sync live ([ARCHITECTURE.md](ARCHITECTURE.md)).

**Phases 1–6 are shipped** — the site above is live. **Phases 7–13 are the feature extension** ([ARCHITECTURE.md](ARCHITECTURE.md) §13–19): installable PWA/offline, Today view, visited marks, packing checklist, weather card, quick reference, trip journal. Same ownership policy: [Opus] builds anything with judgement in it; [Sonnet] takes the mechanical, fully-specced follow-up. Every shipped behaviour must keep working through every extension phase — regressions are stop-and-fix, not follow-ups.

| Phase | Scope | Owner | Spec |
|---|---|---|---|
| 1 | Scaffold & shell: Vite app, tokens, fonts, nav, theme toggle, auth gate, deploy workflow | Opus | ARCHITECTURE §2–5, §9–11 · DESIGN §2–5 |
| 2 | Data port & browse: datasets → TS/JSON modules, Ideas/Restaurants/Attractions/Animal cafés/Full data tabs, Leaflet map + 5 layers | Opus | DATA_MODEL §2–5 · DESIGN §7 |
| 3 | Submit & shared spots: form + `submitted_spots` load/insert/realtime/localStorage | Opus | DATA_MODEL §7–8 · API §2 |
| 4 | Itinerary engine: seed, day pills, slot editing, dnd-kit reorder, `itinerary_slots` sync + realtime + fallback | Opus | DATA_MODEL §6 · API §3 · DESIGN §6 |
| 5 | Cutover & ops: legacy file removal, README/SUPABASE_SETUP rewrites, migration file, .env.example, launch.json, theme-sync registration | Sonnet | DEPLOYMENT · ARCHITECTURE §10 |
| 6 | End-to-end verification against every doc's acceptance list, deploy check | Opus | all acceptance sections |
| 7 | PWA & offline: vite-plugin-pwa, manifest, icon set + script, iOS meta, SW caching, offline banner, update toast | Opus | ARCHITECTURE §14 · DESIGN §12 |
| 8 | Today view + weather card: trip-window logic, day auto-select, now marker, Open-Meteo fetch + cache | Opus | DATA_MODEL §13–14 · API §8 · ARCHITECTURE §15, §18 · DESIGN §13, §16 |
| 9 | Visited marks: `visited_marks` table, canonical item keys, toggle on all place/idea cards, realtime | Opus | DATA_MODEL §10 · API §5 · ARCHITECTURE §16 · DESIGN §14 |
| 10 | Packing checklist: `packing_items` table + seed, packing tab, mobile Plan group | Opus | DATA_MODEL §11 · API §6 · ARCHITECTURE §13b, §17 · DESIGN §15 |
| 11 | Journal + Storage: `journal_entries` table, `journal-photos` bucket + policies, image compression, journal tab | Opus | DATA_MODEL §12 · API §7 · ARCHITECTURE §19 · DESIGN §18 |
| 12 | Reference tab + extension paperwork: quick-reference content, migrations 0002–0004 committed, README/SUPABASE_SETUP additions | Sonnet | DATA_MODEL §15 · DESIGN §17 · DEPLOYMENT §3 |
| 13 | Extension verification: install drills, offline drills, three-table realtime, storage RLS probe, full regression sweep | Opus | all extension acceptance sections |
| 14 | Shared login with Mishka Hub: `apps/server` identity proxy + Supabase session mint, frontend sign-in rewire | Opus | AUTH · ARCHITECTURE §20 · API §9 |

Sequencing: strictly linear within each block — 1 → … → 6 (done), then 7 → … → 13, then 14 (the shared-login extension touches no §13–19 surface, but stays sequenced after them so the regression bar remains single-threaded). Each phase builds on the previous one's verified state, and this repo has no parallel tracks worth the coordination cost. Phases land as commits on `main` (two-person repo, no PR ceremony), message prefix `phase-N:`.

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

# Extension phases (7–13)

## Phase 7 — PWA & offline [Opus]

The foundation the rest of the extension sits on, and the household's first PWA — the config is the pattern Mishka/Michi copy later (ARCHITECTURE §14).

- [ ] [Opus] Add `vite-plugin-pwa` + `sharp` as devDependencies (justifications already written — ARCHITECTURE §3); `VitePWA()` in `vite.config.ts` per ARCHITECTURE §14a: `registerType: 'prompt'`, manifest per §14b with `start_url`/`scope`/`navigateFallback` computed from `VITE_BASE` (never hardcoded — prod serves from `/japan-2026/`, dev from `/`), `devOptions.enabled: false`.
- [ ] [Opus] Write `scripts/generate-pwa-icons.mjs` per ARCHITECTURE §14e and run it once: `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` (torii at ~60%, everything inside the central 80% safe zone), `apple-touch-icon.png` (180², opaque, square). Commit the four PNGs. The clay/paper hexes in the script + manifest carry the DESIGN §12a exception comment.
- [ ] [Opus] iOS meta set in `index.html` per ARCHITECTURE §14c (`apple-mobile-web-app-*`, `mobile-web-app-capable`, `apple-touch-icon` link).
- [ ] [Opus] Workbox runtime caching exactly per the ARCHITECTURE §14f table: NetworkOnly `auth/v1`, NetworkFirst (4s timeout) `rest/v1`, CacheFirst + `ignoreSearch` `storage/v1/object`, CacheFirst CARTO tiles, **nothing** for Open-Meteo. No background-sync, no mutation queue (ARCHITECTURE §4's note stands).
- [ ] [Opus] `useOnline.ts` + `OfflineBanner` (DESIGN §12b); `UpdateToast` on `useRegisterSW`'s `needRefresh` (DESIGN §12c) — refresh only on tap, dismiss defers.

**Acceptance:** `npm run typecheck && npm run build` clean and `dist/` contains `sw.js`, `manifest.webmanifest` and the icon set with `/japan-2026/`-prefixed URLs when built with `VITE_BASE=/japan-2026/`. On the deployed site: Chrome DevTools → Application shows the manifest valid + SW activated; Lighthouse reports installable. On a real iPhone: Share → Add to Home Screen yields the torii icon, opening it shows **no Safari chrome**, then flight-mode relaunch still opens the app with the last-loaded itinerary and the offline banner showing. Deploy a trivial change while the app is open → the refresh toast appears and only refreshes on tap. `npm run dev` behaviour unchanged (no SW in dev).

## Phase 8 — Today view + weather card [Opus]

Two small, independent smartenings of the itinerary tab; no new tables.

- [ ] [Opus] `data/tripWindow.ts` with `tripDayFor()` exactly per DATA_MODEL §14 (device-local, local-midnight maths, null outside the window); `ItineraryPage` initialises `activeDay` from it — once per mount, manual pill taps always win afterwards (ARCHITECTURE §15).
- [ ] [Opus] Now/next slot marker + one-shot centre-scroll per ARCHITECTURE §15 + DESIGN §13 (parse rule `/^(\d{1,2}):(\d{2})/`, unparseable labels skipped, no ticking timer, reduced-motion = instant jump); today's day pill gets its clay dot (DESIGN §13.1).
- [ ] [Opus] `lib/weather.ts` per API §8 — plain `fetch`, **no key, no env var, no supabase import anywhere in the module**; `useWeather.ts` with the DATA_MODEL §13c cache discipline (30 min fresh, 6 h stale ceiling, `japan2026WeatherCache`); `WeatherCard` per DESIGN §16 rendered between `DayHeader` and the slot list, hidden for `Home`, WMO mapping from DATA_MODEL §13b.

**Acceptance:** with the system clock set inside the trip window (e.g. 23 Sep 2026 14:00), opening the Itinerary tab lands on Day 4 with the ~14:00 slot centred and marked NOW, and the weather card reads `FUJI · …`; clock at 07:00 before the first parseable slot shows NEXT; clock outside the window lands on Day 1 with no marker, and the card falls back to `… · RIGHT NOW` (dates beyond the 7-day horizon). Kill the network: cached weather shows "as of HH:MM"; clear the cache + kill the network: no card, no error, no console noise. `grep -ri "api.key\|apikey" apps/web/src` finds nothing weather-related; switching days switches city correctly for all five legs.

## Phase 9 — Visited marks [Opus]

Prereq (one-time, dashboard): apply API §5a — table, RLS (no UPDATE policy), publication, replica identity. The migration file is Phase 12 paperwork.

- [ ] [Opus] `data/itemKey.ts` per DATA_MODEL §10a: `itemSlug` (NFKC, `\p{L}\p{N}`, the exact regex), `itemKeyForIdea`, `itemKeyForEntry` (submissions → `spot:{submissionKey}`, curated → kind-prefixed city/suburb/name — **never the index-suffixed normalized id**).
- [ ] [Opus] `useVisited.ts` per API §5b + ARCHITECTURE §16: load set → optimistic toggle (idempotent upsert / delete) → `japan2026VisitedMarks` snapshot → realtime add/drop → open-mode localStorage store. Provided once from `App.tsx`.
- [ ] [Opus] `VisitedToggle` in `PlaceCard` + the visited card state per DESIGN §14, wired on Ideas, Restaurants, Attractions, Animal cafés and Full data; not on accommodations/events, not on map popups.

**Acceptance:** two signed-in browsers — ticking a café in one dims it and adds the "Visited" pill in the other within a second, in both that tab and Full data (same key, both surfaces); unticking reverses it (DELETE arrives keyed — proves replica identity). Toggle the same card in both browsers near-simultaneously: one row in the table, no errors. Reload: marks persist; flight-mode reload: marks render from the snapshot. Verify in SQL that a marked restaurant's `item_key` is `restaurant:{city}:{suburb}:{name}`-shaped with no trailing index.

## Phase 10 — Packing checklist [Opus]

Prereq (dashboard): apply API §6a–6b. Migration file in Phase 12.

- [ ] [Opus] Types + `PACKING_CATEGORIES` + `data/packingSeed.ts` with the DATA_MODEL §11d seed **verbatim** (keys, categories, labels — generic by rule, no real names, no finances).
- [ ] [Opus] `usePacking.ts` per API §6c — the `useItinerary` engine minus drag: load → seed-if-empty (race-proof upsert) → keyed Map → tick/edit-label/add/remove with optimistic writes + `japan2026PackingItems` snapshot + realtime + open-mode fallback. No dnd-kit wiring (DATA_MODEL §11e — `position` schema-ready, UI deliberately omitted).
- [ ] [Opus] `PackingPage` per DESIGN §15 (category kickers, counts, checkbox rows, no strikethrough, per-category add, ✕ + undo, sync whisper); `tabs.ts` gains `'packing'` + the `PLAN_TABS` group; mobile Plan becomes a group with the segmented control (Itinerary · Packing for now — it grows in Phases 11–12), `lastPlanTab` in `App.tsx` per ARCHITECTURE §13b. Desktop tab row gains Packing.

**Acceptance:** two browsers — tick, re-label, add and delete items in one and watch each apply in the other within a second, in the right category; first-load seeding from two racing tabs produces exactly one seed set (count = the §11d table's 24). Mobile viewport: the five nav items are unchanged, Plan opens last-used of Itinerary/Packing, the segmented control switches between them; every shipped view still reachable. Open mode: full checklist works from localStorage. Typecheck/build clean.

## Phase 11 — Journal + Storage [Opus]

Prereq (dashboard): apply API §7a–7d — table, RLS, publication, replica identity, **bucket + the four storage policies**. Verify per API §7d before writing client code. Migration file in Phase 12.

- [ ] [Opus] `lib/images.ts` per DATA_MODEL §12d: `createImageBitmap` → canvas → `toBlob('image/jpeg', 0.8)`, longest edge ≤ 1600 px, never upscale. No compression library (ARCHITECTURE §3).
- [ ] [Opus] `useJournal.ts` per API §7e + ARCHITECTURE §19: CRUD by `entry_key`, photo upload **only through the compressor**, `photo_path` update after upload, memoised signed URLs (1 h, never persisted), object-then-row delete, realtime, `japan2026JournalEntries` snapshot (text only), open mode text-only with photo UI hidden.
- [ ] [Opus] `JournalPage` per DESIGN §18: composer (date defaults today, textarea, photo attach + preview, single clay button), newest-first entry cards with day-number kickers derived via `tripDayFor`, lazy photos with paper-deep placeholders, in-place edit, ✕ + undo, empty state, sync whisper. `tabs.ts` gains `'journal'`; Plan group + desktop row grow.

**Acceptance:** two browsers — an entry written in one (with a phone-sized test photo ≥ 4 MB) appears in the other within a second, photo included after its signed-URL fetch; the uploaded object is JPEG with longest edge exactly ≤ 1600 px and typically < 500 KB (check in the dashboard). Unauthenticated `fetch` of the object URL path returns an error, and the REST probe on `journal_entries` returns zero rows. Edit and delete sync both ways; delete removes the object (dashboard shows it gone). DevTools-offline: composing saves text locally with the standard note, the photo button is disabled, previously viewed photos still render (SW cache). **No author information exists anywhere** — confirm the table has no user column and the UI no attribution surface.

## Phase 12 — Reference tab + extension paperwork [Sonnet]

Mechanical and fully specced — content is transcription, not judgement. **Do not touch any hook or sync logic in this phase.**

- [ ] [Sonnet] `data/quickReference.ts` + `ReferencePage` per DATA_MODEL §15 (content **verbatim** — 110/119, the gov.uk link labelled "check before you go", the ten phrases, the etiquette list; no embassy phone number, no invented facts) and DESIGN §17 (emergency card with the large mono numbers, `jp` utility on every Japanese run, phrase table, plain list). `tabs.ts` gains `'reference'`; Plan group + desktop row reach their final four/eleven.
- [ ] [Sonnet] Commit `supabase/migrations/0002_visited_marks.sql`, `0003_packing_items.sql`, `0004_journal.sql` — the exact SQL text of API §5a, §6a–6b, §7a–7d, header comments pointing at API.md.
- [ ] [Sonnet] `README.md`: add the three new tabs, the installed-app note ("Add to Home Screen on iOS — it then works offline"), and the icon-regeneration one-liner (`node scripts/generate-pwa-icons.mjs`). `SUPABASE_SETUP.md`: add the three SQL steps (paste from the migrations) and a short "journal photos bucket" walkthrough incl. the §7d verification. Same friendly voice; **no real names; never name or hint at the 22 Sep venue.**

**Acceptance:** fresh clone → `npm install` → `npm run dev` → the Reference tab renders completely in open mode (it is static — no Supabase required); phrases render in Noto Sans JP; the emergency numbers are 110/119 and the only external link is gov.uk. `git log -p` for this phase shows no edits to `hooks/` or `lib/` beyond imports for the new tab; migrations diff-match API.md's SQL blocks exactly.

## Phase 13 — Extension verification [Opus]

- [ ] [Opus] Walk every extension acceptance list (ARCHITECTURE §13–19 behaviours, DATA_MODEL §10–15 shapes, API §5–8 patterns, DESIGN §11's extension items + §12–18, Phases 7–12 above) against the deployed site, both themes, mobile (375px) and desktop, recording real command output and observed behaviour — **run the code, not the report; subagent claims are not evidence.**
- [ ] [Opus] Device drills on production: install on both household iPhones from Safari (standalone, torii icon); flight-mode relaunch on each shows itinerary + packing + journal text + last-viewed photos and map areas; a deploy while one phone is foregrounded raises the refresh toast on it.
- [ ] [Opus] Realtime drill across all three new tables simultaneously (two browsers: a visit toggle, a packing tick and a journal entry inside the same minute — all three land on the other side, correctly keyed). RLS probes: unauthenticated REST reads of `visited_marks`, `packing_items`, `journal_entries` return zero rows; an unauthenticated storage object fetch errors.
- [ ] [Opus] Regression sweep of every shipped behaviour (the Phase 6 list, re-run): all views reachable on desktop and mobile incl. the two segmented groups, map layers + fly-to, submit vocab, itinerary drag/edit/sync, day-3 discretion, dark mode, reduced motion, no console errors, Lighthouse a11y ≥ 95 now including Packing/Journal/Reference, zero hex literals outside `theme.css` + the DESIGN §12a exception files.

**Acceptance:** every box above ticked with logged evidence, or recorded here as a deliberate follow-up; the household can land at Haneda with no signal and still see the plan, tick off the first konbini run, and write the first journal entry.

---

# Shared-login extension (Phase 14)

## Phase 14 — Shared login with Mishka Hub [Opus]

Spec: [AUTH.md](AUTH.md) (design, security posture, acceptance) · [ARCHITECTURE.md](ARCHITECTURE.md) §20 (flow, failure modes, topology) · [API.md](API.md) §1 + §9 (the endpoint contract and the one frontend call that changes). Prereq facts, all real and verified — use them, don't invent others: Mishka Hub's API runs on `127.0.0.1:8000` (LaunchAgent `com.mishka.api`), Michi's on `8100` (prod) / `8101` (dev); the shared tunnel config is `~/.cloudflared/config.yml`; Michi's `apps/server/app/identity.py` is the client to port. **Japan's backend takes port 8102 (production) and 8103 (dev-only)** — the same prod/dev split as Michi's 8100/8101, so local runs never collide with the always-on instance.

- [ ] [Opus] `apps/server` scaffold: `requirements.txt` (fastapi, uvicorn, httpx, supabase, pydantic-settings), `app/main.py` (CORS allow-list per AUTH §3.3), `app/config.py` (pydantic-settings over `.env`). Stateless by design — **no database, no models, no security.py, no JWT secret**; AUTH §2's "deliberately absent" list is a build constraint, not a suggestion.
- [ ] [Opus] `apps/server/.env.example` committed with **placeholders only**: `MISHKA_BASE_URL=http://127.0.0.1:8000`, `SUPABASE_URL=https://<project-ref>.supabase.co`, `SUPABASE_ANON_KEY=sb_publishable_<same public key the web app uses>`, `SUPABASE_SERVICE_ROLE_KEY=<service-role-key-here>`, each with a comment on where the real value comes from. Add `apps/server/.env` (and the venv) to `.gitignore` — **the existing `OfflineExample.html` and `Japan Itinerary/` exclusions stay byte-identical.** The real service_role key is NEVER committed, echoed, or logged — AUTH §4 is the law here.
- [ ] [Opus] `app/identity.py` — Michi's, ported near-verbatim: typed exceptions, loopback/HTTPS guard, never-log-the-password redaction, best-effort logout of the throwaway Mishka session, `ping()`.
- [ ] [Opus] `app/sessions.py` + `app/routers/auth.py` + `app/routers/health.py` per API §9: rate-limit deque in front of the identity call, the mint sequence exactly as written (admin list → create-if-missing → rotate → anon sign-in), the four error shapes, the 60 s-cached health probe. Pytest with a stubbed identity client and stubbed Supabase clients: happy path, 401, 429 (including "sixth attempt never reaches Mishka"), both 503s — same green-suite bar as Michi.
- [ ] [Opus] Frontend rewire: `useAuth.ts` `signIn()` → POST to `VITE_AUTH_API_BASE` (default `https://japan-api.mishka-hub.com`) then `supabase.auth.setSession()`, per API §1a — error `detail` rendered in `LoginScreen.tsx`'s existing error line (visuals untouched); `apps/web/.env.example` gains a commented optional `VITE_AUTH_API_BASE` line for local-proxy dev. **`getSession`/`onAuthStateChange`/`signOut` and every data hook stay untouched** — API §1 says so explicitly; a diff touching them is a misread.
- [ ] [Opus] Household `launch.json` (shared `~/…/Dev/.claude/launch.json`, not a repo file): add a `japan-api` dev entry on **8103**, mirroring the `michi-api` (8101) pattern. Leave every other entry untouched.

**NOT this phase's agent's job — local deployment (orchestrator + owner, on the real machine, afterwards):** writing the real `apps/server/.env` (the owner supplies the service_role key from the Supabase dashboard — the one human-in-the-loop secret); creating the venv and installing requirements on the Mac; the LaunchAgent `~/Library/LaunchAgents/com.japan.api.plist` (mirror `com.michi.api`: uvicorn from the venv, `--host 127.0.0.1 --port 8102`, RunAtLoad + KeepAlive, logs in `~/Library/Logs/japan/`); the tunnel ingress line (`japan-api.mishka-hub.com` → `http://127.0.0.1:8102` in `~/.cloudflared/config.yml`, above the 404 catch-all) + the DNS CNAME route + `sudo launchctl kickstart -k system/com.cloudflare.cloudflared`; then starting and verifying the service end to end. The implementing agent writes code, tests and docs, and stops at the machine's edge.

**Acceptance (run the code, not the report — subagent claims are not evidence):** pytest green in `apps/server`; `typecheck && build` green in `apps/web`. Live drill with the dev proxy (`uvicorn app.main:app --port 8103` + real `.env`) and `npm run dev`: sign in with current household credentials → a working Supabase session (itinerary loads, a realtime frame arrives); wrong password → the calm 401 line; stop Mishka Hub's LaunchAgent → login shows the friendly 503 **and** an already-signed-in tab keeps working — then stop the Japan proxy too and confirm the signed-in tab still reads, writes and refreshes (the AUTH §5 "big one"). Password-change drill per AUTH §5 (`set_password.py`, zero Japan-side action). Grep proofs: no service_role string in git or `apps/web/dist`; `grep -ri "jwt_secret\|argon2\|refresh_tokens" apps/server` empty. Open mode still works with zero setup; the 22 Sep slot untouched; no new hex literals; both load-bearing `.gitignore` exclusions intact.

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
