# Japan 2026 — System Architecture

This document is the durable reference for how the rebuilt Japan 2026 trip site fits together: the stack, the repo layout, component responsibilities, the Supabase auth gate, how itinerary edits travel between the two travellers' phones, failure modes, and how the whole thing deploys. Every other doc in this suite assumes the decisions recorded here. For the delivery order see [PLAN.md](PLAN.md); for storage shapes see [DATA_MODEL.md](DATA_MODEL.md); for the Supabase surface see [API.md](API.md); for the visual contract see [DESIGN.md](DESIGN.md); for ops see [DEPLOYMENT.md](DEPLOYMENT.md).

**Status:** §1–§12 describe the **shipped rebuild**, live at `https://fyreline.github.io/japan-2026/` — a **React + Vite + TypeScript + Tailwind v4** SPA in the exact stack of the two sibling household apps (MishkaHub, Michi), wearing the shared Aizome palette, with a fully editable, live-syncing itinerary. §13–§19 specify the **feature extension** (PWA/offline, Today view, visited marks, packing, weather, quick reference, journal — [PLAN.md](PLAN.md) Phases 7–13): strictly additive, nothing shipped changes behaviour.

---

## 1. System overview

A private, two-user trip dashboard for a 14-day Japan holiday (20 Sep – 3 Oct 2026; Glasgow → Tokyo → Fuji → Hiroshima → Osaka → Kyoto → Tokyo → home):

| Component | Technology | Runs on | Role |
|---|---|---|---|
| Web app | React ^19.2.7 + Vite ^8.1.3 + TypeScript ^6.0.3 + Tailwind v4 (^4.3.2 + `@tailwindcss/vite`), static build | GitHub Pages | All UI: itinerary, map, ideas, place lists, submit form, packing, journal, reference |
| Database + auth + realtime + storage | Supabase (Postgres, GoTrue Auth, Realtime, Storage) — free tier, **already provisioned and in use** | Supabase cloud (EU/London) | Sign-in gate, five tables, journal photo bucket, live cross-device sync |
| Map | `leaflet` (npm) + CARTO light tiles | bundled / basemaps.cartocdn.com | Map tab with 5 toggleable pin layers |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | bundled | Itinerary time-slot reordering (touch + keyboard) |
| Installability / offline | `vite-plugin-pwa` (Workbox) service worker + web manifest | generated into the Pages build (§14) | Home-screen install, app-shell precache, read-cache for Supabase GETs, update prompt |

**There is no server of ours anywhere.** The browser talks straight to Supabase with the publishable anon key plus a signed-in session; row-level security is the entire authorisation model. This makes Japan the simplest of the three household apps: same frontend stack as MishkaHub/Michi, but **no FastAPI process, no Cloudflare Tunnel, no LaunchAgent** — nothing runs on the household Mac.

Runtime network dependencies:

| Dependency | Loaded from | Used for | If unreachable |
|---|---|---|---|
| Supabase project | `*.supabase.co` | Auth, all five tables, realtime, journal photos (Storage) | Open mode / localStorage cache (§5, §7, §8) + service-worker read cache (§14) |
| CARTO tile server | basemaps.cartocdn.com | Map tiles | Grey map, pins still plot (last-viewed tiles may serve from the SW cache, §14) |
| Open-Meteo | api.open-meteo.com | Weather card on the itinerary (§18) — **keyless, no auth, the app's only third-party API call** | Cached snapshot (<6 h) or the card hides; nothing else affected |

Everything else — fonts (`@fontsource-variable/*`), Leaflet's JS/CSS, dnd-kit, the three curated JSON datasets — is bundled at build time. The current site's four CDN `<script>`/`<link>` tags (unpkg Leaflet, jsdelivr supabase-js + SortableJS, Google Fonts) all disappear.

## 2. Repository layout (target)

Mirrors the sibling repos' `apps/web` + `docs/` shape:

```
Japan_website/                       # github.com/Fyreline/japan-2026 (public)
├── CLAUDE.md                        # working rules for agents (short; docs/ wins)
├── README.md                        # friendly front door (rewritten in Phase 5)
├── SUPABASE_SETUP.md                # non-technical Supabase walkthrough (rewritten in Phase 5)
├── .gitignore                       # OfflineExample.html + "Japan Itinerary/" MUST stay excluded;
│                                    #   adds node_modules/, dist/, .env.local
├── .github/workflows/deploy-pages.yml
├── supabase/
│   └── migrations/
│       └── 0001_itinerary_slots.sql # the API.md §3 SQL, committed for the record
├── docs/                            # this suite — the spec, and it wins
└── apps/web/
    ├── package.json                 # deps pinned to the household versions (§3)
    ├── vite.config.ts               # base: VITE_BASE ?? '/', react() + tailwindcss(), port 5175
    ├── tsconfig.json
    ├── index.html                   # <div id="root"> + pre-paint theme script (§9)
    ├── .env.example                 # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY template
    └── src/
        ├── main.tsx                 # createRoot + <App/>
        ├── App.tsx                  # auth gate switch + tab state + shell
        ├── index.css                # @import "tailwindcss" + fonts + theme.css + local @theme
        ├── theme.css                # Aizome tokens — MIRROR of the canonical file (§10)
        ├── lib/
        │   └── supabase.ts          # createClient from env vars; null in open mode
        ├── auth/
        │   └── useAuth.ts           # session hook wrapping supabase-js auth (§5)
        ├── hooks/
        │   ├── useSubmittedSpots.ts # load + realtime + insert + localStorage (§6)
        │   ├── useItinerary.ts      # slots state + sync engine (§7)
        │   └── useTheme.ts          # .dark class + localStorage('japan-theme')
        ├── components/
        │   ├── LoginScreen.tsx      # full-screen gate (Mishka pattern, torii mark)
        │   ├── Header.tsx           # brand + trip strip + theme toggle + sign out
        │   ├── TabNav.tsx           # desktop tab row (8 views)
        │   ├── MobileNav.tsx        # bottom bar, 5 items (DESIGN.md §4)
        │   ├── ThemeToggle.tsx      # port of Mishka's (storage key 'japan-theme')
        │   ├── ToriiMark.tsx        # the site mark (DESIGN.md §8)
        │   ├── MapView.tsx          # Leaflet map + 5 layers + toggles + fly-to
        │   ├── PlaceCard.tsx        # shared list card (idea/restaurant/attraction/café)
        │   ├── FilterPills.tsx      # city/leg/category pill rows
        │   ├── SearchInput.tsx
        │   ├── IdeasList.tsx        # ~44 ideas, grouped by city+suburb, leg filter
        │   ├── RestaurantsList.tsx
        │   ├── AttractionsList.tsx
        │   ├── AnimalCafesList.tsx
        │   ├── FullDataList.tsx     # everything combined, searchable, grouped by city
        │   ├── SubmitForm.tsx       # "Submit a spot" (→ submitted_spots)
        │   └── itinerary/
        │       ├── ItineraryPage.tsx    # essentials + day pills + active day
        │       ├── TripEssentials.tsx   # flights/cash/rail/eSim/car cards
        │       ├── DayPills.tsx         # 14 pills, one active
        │       ├── DayHeader.tsx        # date · city · hotel (+ booked flag)
        │       ├── SlotList.tsx         # dnd-kit sortable context for the day
        │       ├── SlotRow.tsx          # type edge + time + editable text + handle + ✕
        │       └── AddSlotRow.tsx       # inline time/type/text composer
        └── data/
            ├── types.ts             # every shape in DATA_MODEL.md
            ├── accommodations.ts    # hotels + planned events (~10 entries)
            ├── ideas.ts             # the 44 curated ideas
            ├── tripEssentials.ts
            ├── itineraryDays.ts     # 14 day-metadata records (DATA_MODEL.md §6a)
            ├── itinerarySeed.ts     # ~100 seed slots (DATA_MODEL.md §6b)
            ├── normalize.ts         # JSON → typed entries (city/suburb parsing etc.)
            ├── restaurants.json     # moved from repo root, content unchanged
            ├── attractions_by_location.json
            └── animal_cafes.json
```

Not in the repo, by design: `OfflineExample.html` (a third party's reference site containing *their* Supabase keys) and `Japan Itinerary/` (a spreadsheet export containing private trip logistics). Both are `.gitignore`d today and stay that way; the docs deliberately do not describe their contents further. The legacy root files (`index.html`, `config.js`, the three root JSONs) are deleted/moved in Phase 5 once the new app is verified — see [PLAN.md](PLAN.md).

## 3. Stack & dependency policy

Locked to the household versions (verified against both sibling `package.json`s):

- `react` / `react-dom` **^19.2.7**, `typescript` **^6.0.3**, `vite` **^8.1.3**, `@vitejs/plugin-react` **^6.0.3**, `tailwindcss` + `@tailwindcss/vite` **^4.3.2**.
- Fonts self-hosted via `@fontsource-variable/schibsted-grotesk`, `source-serif-4`, `inter`, `jetbrains-mono`, `noto-sans-jp` (the data contains Japanese text — ryokan names etc.). **No Google Fonts CDN.**
- New (justified) runtime deps: `@supabase/supabase-js` (^2), `leaflet` (+ `@types/leaflet` dev), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
- **Why dnd-kit over native HTML5 drag-and-drop:** this app is used on two phones in Japan; HTML5 DnD has no touch support without a shim, while dnd-kit gives pointer + touch + keyboard sorting, an accessible announcer, and a small tree-shaken footprint. SortableJS (the prototype's choice) is imperative-DOM and fights React's ownership of the list.
- **Why plain `leaflet` over react-leaflet:** the existing marker/layer/popup logic is imperative and ports 1:1 into one `MapView` component (`useRef` + `useEffect`); react-leaflet would add a wrapper library for a single component's benefit.
- `motion` is **not** included at v1 — dnd-kit provides the drag affordances, and nothing else here earns springs. Adding it later requires written justification in the commit message (same rule as Michi).
- **Extension additions (dev-only; zero new runtime deps):**
  - **`vite-plugin-pwa` (dev):** the PWA feature itself (§14). **Why over a hand-rolled service worker:** the dangerous part of a SW is the update lifecycle — a hand-rolled precache list drifts from the build output and serves a stale shell forever, the classic PWA foot-gun. `vite-plugin-pwa` generates the Workbox precache manifest *from* the Vite build (revision-hashed per file), owns registration + the update prompt, and is the de-facto standard for this stack. Neither sibling app has PWA support yet — this config is written to be the **household pattern** Mishka/Michi can copy later (§14).
  - **`sharp` (dev):** used by one committed script (`scripts/generate-pwa-icons.mjs`, §14e) to rasterise the torii SVG into the PNG icon set, run manually when the mark changes. Never imported by app code, never shipped.
  - **Deliberately avoided:** an image-compression library for journal photos. `createImageBitmap` + canvas + `toBlob` is ~30 lines (`lib/images.ts`, DATA_MODEL.md §12d) and does exactly the one resize this app needs; `browser-image-compression` would add a worker bundle for no additional capability here. Same reasoning pattern as leaflet-over-react-leaflet above.
- Vite config (identical pattern to the siblings, Japan takes port **5175** — Mishka owns 5173, Michi 5174):

```ts
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5175 },
})
```

## 4. Non-goals (locked decisions)

Explicit decisions, not omissions. Revisiting any of them needs a written reason in this file first.

1. **No backend of our own.** No Python/Node API, no Cloudflare Tunnel, no LaunchAgent, no port on the household Mac. Supabase (Postgres + Auth + Realtime behind RLS) is the entire backend, called directly from the SPA. This is what makes Japan structurally simpler than its siblings.
2. **No client-side router.** Eight views switch on React state (`activeTab`), exactly like the siblings' tab shells. Deep links are not a requirement for a two-person app.
3. **No state library.** React state + custom hooks; the only module-level store pattern permitted is the sibling `subscribe/notify` style if a hook genuinely needs cross-component identity (auth does not — supabase-js already is that store).
4. **No new user accounts or roles.** Two fixed Supabase Auth users, signups disabled in the dashboard. No profiles table, no per-user row attribution.
5. **No offline-first sync engine.** localStorage is a fallback and a read cache, not a CRDT. With two cooperating users, last-write-wins is the conflict policy (§7).
6. **No feature loss.** Everything the current site does — map + 5 layers, 44 ideas, three JSON-driven tabs, Full data tab, submit form + `submitted_spots` sync, the auth gate with open-mode fallback, the 14-day itinerary including the discreet 22 Sep evening entry — survives the rebuild. The removals are visual (pink sakura theme) and structural (inline everything, CDN scripts, static itinerary cards).

The feature extension (§13–§19) **does not revisit any of these** — recorded here because this file is where revisiting would have to be argued. Specifically: the PWA adds a service worker that caches the app shell and *read* responses, not a mutation queue or CRDT — offline writes keep the shipped localStorage-plus-quiet-note model, so non-goal 5 stands. The three new tabs switch on the same `activeTab` state — non-goal 2 stands. The three new tables and the photo bucket carry **no per-user attribution** — non-goal 4 stands. And every shipped surface keeps its exact behaviour — non-goal 6 now covers the extension too.

## 5. Auth model — the Supabase sign-in gate

The **visual/UX pattern is MishkaHub's** (full-screen gate covering the app, centred card, site mark, email + password, calm error line — `apps/web/src/components/LoginScreen.tsx` in that repo is the styling reference). The **mechanism is not**: Mishka hand-rolls JWT refresh/rotation against its own FastAPI; supabase-js already does session persistence (localStorage) and token auto-refresh internally. **Do not port Mishka's `auth.ts` token machinery** — `useAuth.ts` is a thin subscription over supabase-js:

```
page load
  │  import.meta.env.VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY both set?
  ├── no ──► OPEN MODE: `supabase` export is null. No gate. Header shows a quiet
  │          "Sign-in off" hint. All data local-only (localStorage), no realtime.
  │          This is how `npm run dev` works with no .env.local — local dev
  │          and the pre-Supabase workflow keep working forever.
  └── yes ─► createClient() → useAuth() starts in status 'loading'
             (App renders nothing but the paper background — content never
             flashes underneath the gate)
             │ supabase.auth.getSession()
             ├── session ──► status 'signedIn' → app renders; shared loads
             │               + realtime subscriptions start (§6, §7)
             └── none ────► status 'signedOut' → <LoginScreen/> full-screen
                            signInWithPassword() on submit
             supabase.auth.onAuthStateChange() drives every later transition:
             SIGNED_IN → app; SIGNED_OUT (sign-out button, revoked session,
             expired refresh) → gate returns. Token refresh is invisible.
```

`useAuth()` returns `{ status: 'open' | 'loading' | 'signedOut' | 'signedIn', user, signIn, signOut }`. Rules carried over from the current implementation:

- The gate covers the **entire viewport** until a session exists; while `loading`, render neither gate nor app (no flash of either).
- Shared reads run **only with a session** (`useSubmittedSpots`/`useItinerary` early-return otherwise) — RLS would reject them anyway; this avoids console noise and wasted calls.
- Supabase dashboard settings (done once, walkthrough in [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)): two users created manually and auto-confirmed; public signups disabled. The anon key is public by design (`sb_publishable_` class); RLS is the security boundary.
- Sign-out is a header button; `onAuthStateChange` re-shows the gate — no manual gate bookkeeping in components.

## 6. Data flow A — Submit a spot (existing behaviour, preserved)

```
SubmitForm ──► buildSubmissionEntry(payload)           (client shape, DATA_MODEL.md §7)
   │                 │
   │                 ├──► optimistic: push into the matching dataset state
   │                 │    (restaurants/attractions/animal cafés) → that tab,
   │                 │    its map layer and Full data re-render. No waiting.
   │                 ├──► localStorage 'japan2026UserSubmissions' (open mode,
   │                 │    or as the local copy alongside Supabase)
   │                 └──► INSERT into submitted_spots (signed-in mode)
   │
other device ◄── realtime channel (postgres_changes INSERT on submitted_spots)
                 └─► rowToSubmissionEntry(row) → same apply path
                     (dedup by client_submission_key via a seen-keys Set)
```

The behaviour, field vocabulary, Google-Maps-link coordinate extraction, city fallback coordinates and dedup logic are ported from the current `index.html` unchanged — [DATA_MODEL.md](DATA_MODEL.md) §7 is the contract. In the rebuild this lives in `useSubmittedSpots.ts` + `SubmitForm.tsx`. It is also the reference implementation the itinerary sync deliberately mirrors.

## 7. Data flow B — Itinerary sync (new — the redesign's centrepiece)

The itinerary tab adopts the owner's prototype interaction model — a day-pill selector showing one day at a time, each day broken into time slots every ~1.5–2.5 h, each slot with a coloured left edge by type, a time label, editable free text, and a drag handle — and fixes the prototype's one real defect: **edits now persist and sync live between the two travellers**, with the same localStorage fallback in open mode.

```
                     ┌────────────── open mode (no Supabase env) ──────────────┐
                     │  read/write localStorage 'japan2026ItinerarySlots'      │
                     │  (seeded from itinerarySeed.ts on first run)            │
                     └──────────────────────────────────────────────────────────┘
signed-in mode (useItinerary):
  load:    SELECT * FROM itinerary_slots ORDER BY day, position
           ├─ table empty? → UPSERT the whole seed
           │  (onConflict: 'slot_key', ignoreDuplicates — two phones racing the
           │   first load produce one seeded table and zero errors)
           └─ rows → rowToSlot() → Map<slotKey, Slot> state → render active day
           → write-through snapshot to localStorage (the read cache that keeps
             the plan viewable on the Shinkansen with no signal)

  edit text/time/type: commit on blur or a 600 ms debounce
           → UPDATE itinerary_slots SET … WHERE slot_key = …
  reorder: dnd-kit onDragEnd → moved slot's position = midpoint(neighbours)
           → UPDATE that ONE row (fractional ordering, DATA_MODEL.md §6c)
  add:     AddSlotRow → INSERT with a fresh slot_key
  remove:  per-slot ✕ → DELETE WHERE slot_key = …
  every successful mutation also refreshes the localStorage snapshot

  other device ◄─ realtime channel (postgres_changes event:'*' on itinerary_slots)
           INSERT/UPDATE → upsert into state by slot_key
           DELETE        → drop by slot_key (needs REPLICA IDENTITY FULL — API.md §3)
           → re-render is cheap; receiving your own echo is a no-op
```

Decisions:

- **Conflict policy: last write wins, per slot.** Two people editing the *same slot's text* in the same minute is the worst case; the loser's text is replaced on the next realtime frame. Understood and accepted for a two-person household app; no merge machinery.
- **Fractional `position` (double precision)** means a drag updates exactly one row — no renumber storm through realtime. If a midpoint ever lands within `1e-6` of a neighbour (~50 consecutive drags into the same gap), the client renumbers that day back onto the 10/20/30… lattice in one batched pass (DATA_MODEL.md §6c).
- **Deterministic `slot_key`s** (`d03-1800-surprise` style) make seeding race-proof and give every edit a stable handle forever.
- **The 22 Sep (day 3) evening ships as `type: 'surprise'` with the exact generic text `Evening — Booked up 🤫`** — the venue is intentionally never named in any file, comment, doc or commit, and nothing in the seed occupies day 3 after 18:00. See DATA_MODEL.md §6b.
- Day-level facts (date, city, leg, hotel + booked flag) are trip constants and stay static in `itineraryDays.ts`; only slots are collaborative state.

## 8. Failure modes & degradation

| Failure | Detection | Behaviour |
|---|---|---|
| Env vars absent (open mode) | `supabase === null` | No gate; header hint "Sign-in off"; submissions + itinerary edits persist to localStorage only |
| Supabase unreachable / offline (plane, tunnel, rural Fuji) | fetch failure on load or mutation | Itinerary renders from the localStorage snapshot; failed mutations show a quiet inline "Saved on this device — sync failed right now" note (mirrors the existing submit-form copy); supabase-js auto-reconnects the realtime channel |
| Session expires / signed out remotely | `onAuthStateChange` fires with null session | Gate returns over the app |
| Seed race (both phones first-load an empty table) | — | UPSERT `ignoreDuplicates` on `slot_key`: one wins, the other inserts nothing |
| CARTO tiles blocked | tile errors | Grey map, pins/popups still work; list tabs unaffected |
| A curated JSON fails to parse at build | `tsc`/Vite build error | Caught in CI before deploy — malformed data can no longer reach production silently (an upgrade over the current runtime fetch) |
| Realtime frame for a slot mid-local-edit | slot_key match on a focused row | Local uncommitted text wins until blur (the update then overwrites the remote value — last write wins, §7) |
| Fully offline relaunch (installed PWA, no signal) | SW serves the precached shell | App opens; itinerary/packing/visited/journal text render from localStorage snapshots; last-fetched Supabase GETs and map tiles serve from the SW runtime caches; offline banner shows (§14) |
| New deploy while the app is open | `needRefresh` from vite-plugin-pwa | Quiet "New version ready — Refresh" toast; nothing auto-reloads mid-edit (§14d) |
| Journal photo upload fails | storage error on `upload()` | The entry's text row still saves independently; the photo slot shows a quiet retry control — no queued upload (§19) |
| Open-Meteo unreachable / beyond horizon | fetch rejects / date out of range | Weather card shows the cached snapshot (<6 h, with "as of" time) or hides entirely — never an error state (§18) |

## 9. Dark mode strategy

Same mechanism as the siblings, verbatim:

- `index.css` declares `@custom-variant dark (&:where(.dark, .dark *));` and imports `theme.css`, whose `.dark { … }` block overrides every colour token in place — components never branch on theme; repainting is 100 % token substitution.
- `ThemeToggle` is a port of Mishka's: persists to `localStorage('japan-theme')`, **defaults to the OS `prefers-color-scheme` on first visit**, manual choice wins thereafter.
- A ≤10-line inline script in `apps/web/index.html` runs pre-paint: reads `localStorage('japan-theme')` (falling back to `matchMedia('(prefers-color-scheme: dark)')`) and stamps `.dark` on `<html>` — no theme flash on load.
- `useTheme.ts` owns the class + storage; nothing else touches `document.documentElement.classList`.

## 10. Theming lineage — the Aizome mirror

`apps/web/src/theme.css` is a **byte-identical mirror** of the canonical household palette: `learningLanguageMachine/apps/web/src/theme.css` (the "Aizome" 藍染 scheme already shared by Michi and MishkaHub). Since this app consumes Tailwind v4 like its siblings, the file drops in unmodified — no port, no translation.

- **Canonical copy stays in the Michi repo.** This repo becomes the **second mirror** (MishkaHub is the first): the Michi repo's `scripts/sync-theme.sh` gains this repo's path as an additional `cp` + verify target, and its `.claude/skills/theme-sync` SKILL.md is updated to list three consumers (a `[Sonnet]` task in [PLAN.md](PLAN.md)).
- The theme-sync discipline applies here in full: **change values, never token names; edit light and dark together; re-check ~4.5:1 contrast; never hardcode a hex in a component.** A colour that isn't a semantic token utility (`bg-paper`, `text-clay`, `border-line`, …) is a review-blocker — restated in [CLAUDE.md](../CLAUDE.md).
- App-local tokens (fonts, radii — no colours) live in `index.css`'s own `@theme` block, exactly like Michi's split. See [DESIGN.md](DESIGN.md) §2.

## 11. Deployment topology (summary — full runbook in DEPLOYMENT.md)

- **GitHub Pages via Actions** (`.github/workflows/deploy-pages.yml`), mirroring the siblings' workflow: push to `main` → `actions/setup-node@v4` (node 22) → `npm ci` → `npm run typecheck` → `npm run build` with `VITE_BASE=/japan-2026/` → `actions/upload-pages-artifact` → `actions/deploy-pages@v4`. One-time switch: repo Settings → Pages → Source: **GitHub Actions** (the current site deploys from branch — that mode dies with the old `index.html`).
- Supabase credentials are baked at build time from **repository variables** (not secrets — the anon key is a public, RLS-guarded `sb_publishable_` key): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Locally the same two live in a gitignored `apps/web/.env.local`; `apps/web/.env.example` documents them. The old plain `config.js` pattern is retired.
- On a public repo the static content (itinerary seed, ideas) is readable in source even though the live site gates on login. Accepted: the genuinely sensitive material lives only in the two gitignored paths (§2) and in Supabase rows — and the one secret-adjacent fact (the 22 Sep venue) is in nobody's files at all.
- Supabase schema changes are applied by pasting the SQL from [API.md](API.md) into the dashboard SQL editor; the same text is committed under `supabase/migrations/` for the record. Procedure: [DEPLOYMENT.md](DEPLOYMENT.md) §3.

## 12. Cross-references

- Storage shapes, seed dataset, mapping functions: [DATA_MODEL.md](DATA_MODEL.md)
- Supabase tables, RLS, realtime config, exact supabase-js call patterns: [API.md](API.md)
- Design system (Aizome application, slot colours, motif, mobile nav, contrast): [DESIGN.md](DESIGN.md)
- Phases and task ownership ([Opus]/[Sonnet]): [PLAN.md](PLAN.md)
- Ops runbook (Pages, env variables, Supabase changes, rollback): [DEPLOYMENT.md](DEPLOYMENT.md)

---

# The feature extension (§13–§19)

Seven additions to the shipped app: installable PWA/offline, Today view, visited marks, packing checklist, weather card, quick reference, trip journal. All additive — the flows in §5–§7 are untouched, and every new synced feature deliberately reuses their patterns (stable client keys, optimistic writes, localStorage snapshots, realtime channels, last-write-wins).

## 13. Extension overview — new surfaces, files and navigation

### 13a. New files (extends the §2 tree; nothing existing moves)

```
apps/web/
├── vite.config.ts                     # gains VitePWA() — §14a
├── index.html                         # gains iOS PWA meta + apple-touch-icon link — §14c
├── public/
│   ├── pwa-192.png  pwa-512.png       # §14e icon set, generated once, committed
│   ├── pwa-maskable-512.png
│   └── apple-touch-icon.png           # 180×180
├── scripts/
│   └── generate-pwa-icons.mjs         # sharp; torii SVG → the PNG set (§14e)
└── src/
    ├── tabs.ts                        # + 'packing' | 'journal' | 'reference'; PLAN_TABS group
    ├── hooks/
    │   ├── useVisited.ts              # §16 — mirrors useItinerary, simpler
    │   ├── usePacking.ts              # §17
    │   ├── useJournal.ts              # §19
    │   ├── useWeather.ts              # §18 — fetch + cache, no Supabase
    │   └── useOnline.ts               # navigator.onLine + events → offline banner
    ├── lib/
    │   ├── images.ts                  # journal photo compression (DATA_MODEL §12d)
    │   └── weather.ts                 # the Open-Meteo fetch (API §8)
    ├── data/
    │   ├── itemKey.ts                 # visited-mark canonical keys (DATA_MODEL §10a)
    │   ├── packingSeed.ts             # DATA_MODEL §11d
    │   ├── quickReference.ts          # DATA_MODEL §15
    │   └── tripWindow.ts              # DATA_MODEL §14
    └── components/
        ├── OfflineBanner.tsx          # §14d
        ├── UpdateToast.tsx            # §14d
        ├── VisitedToggle.tsx          # §16 — rendered inside PlaceCard
        ├── weather/WeatherCard.tsx    # §18
        ├── packing/                   # PackingPage, CategoryGroup, PackingRow, AddItemRow
        ├── journal/                   # JournalPage, EntryComposer, EntryCard
        └── reference/ReferencePage.tsx
supabase/migrations/
├── 0002_visited_marks.sql             # API §5
├── 0003_packing_items.sql             # API §6
└── 0004_journal.sql                   # API §7 — table + bucket + storage policies
```

### 13b. Navigation growth — 8 views become 11

- **Desktop tab row:** `Itinerary · Map · Ideas · Restaurants · Attractions · Animal cafés · Full data · Packing · Journal · Reference · Submit`. The row already scrolls horizontally when cramped (DESIGN.md §4) — no structural change.
- **Mobile bottom nav: the five items do not change.** The three new views join a **"Plan" group** on the existing Places-group mechanic: tapping Plan opens the last-used of Itinerary / Packing / Journal / Reference, and those four views show a segmented control on mobile — `App.tsx` grows a `lastPlanTab` alongside the shipped `lastPlacesTab`, and `tabs.ts` a `PLAN_TABS` list beside `PLACES_TABS`. This is the zero-disruption option: every shipped nav item keeps its slot and meaning, and the grouping mechanic is one the household already uses daily.
- **Quick reference** is the one new view with no architecture: a static module (`data/quickReference.ts`, content canonical in DATA_MODEL.md §15) rendered by one component. No storage, no network, works offline by construction once the shell is precached.

## 14. PWA & offline architecture

The goal is a **genuine installed-app experience on iOS** — own home-screen icon, standalone window with no Safari chrome, opens with the last-known data on zero signal — without a native app (no Apple Developer Program, no signing). The mechanism is `vite-plugin-pwa` (Workbox under the hood; §3 justification). **Neither sibling app has PWA support yet — this section is written as the household pattern**, and everything below (config shape, icon script, update toast) ports to Mishka/Michi by changing names and colours only.

### 14a. Plugin config (`vite.config.ts`)

```ts
VitePWA({
  registerType: 'prompt',                        // §14d — deliberate, not autoUpdate
  includeAssets: ['torii-icon.svg', 'apple-touch-icon.png'],
  manifest: { /* §14b — note base-aware start_url/scope */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],   // shell + fonts + icons
    navigateFallback: `${base}index.html`,                 // SPA route fallback
    runtimeCaching: [ /* §14f */ ],
  },
  devOptions: { enabled: false },                // SW off in dev — dev stays simple
})
```

`base` is the same `process.env.VITE_BASE ?? '/'` the config already uses — the manifest's `start_url`/`scope` and the fallback URL must be computed from it, because the app serves from `/japan-2026/` on Pages but `/` locally.

### 14b. Manifest

| Field | Value | Notes |
|---|---|---|
| `name` / `short_name` | `Japan 2026` | short enough for both fields |
| `description` | `Two of you, two weeks, one plan.` | the login line, reused |
| `display` | `standalone` | the whole point — no browser chrome |
| `start_url` / `scope` | `VITE_BASE` (`/japan-2026/` in prod) | computed, never hardcoded |
| `theme_color` | `#f7fbfa` | Aizome light `paper` |
| `background_color` | `#f7fbfa` | splash background |
| `icons` | `pwa-192.png` (192, `any`), `pwa-512.png` (512, `any`), `pwa-maskable-512.png` (512, `maskable`) | §14e |

The two manifest hexes are **the second documented hex exception** (the favicon SVG being the first — DESIGN.md §8): manifests can't read CSS variables, the values are copied from `theme.css` light `paper`, and a theme-value change means updating them by hand. A manifest has no dark variant; committing to the light paper value is the calm choice (matches the iOS status-bar treatment below).

### 14c. iOS specifics (`index.html` `<head>`)

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Japan 2026" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
```

Facts to hold, so nobody debugs a non-bug later: iOS has **no install prompt** — installation is Safari → Share → *Add to Home Screen*, always. With the manifest + these tags, what lands is the real thing: own icon (iOS reads `apple-touch-icon`, not manifest icons), standalone window, SW-served offline shell. iOS may evict SW caches after weeks of disuse — irrelevant for a daily-use trip app, noted for the household pattern. The `apple-touch-icon` must be opaque (no alpha): full-bleed paper background, no rounded corners (iOS applies its own mask).

### 14d. Update flow + offline indicator

- **`registerType: 'prompt'`, deliberately.** Rationale recorded: this app is edited live mid-trip; `autoUpdate` swaps the SW underneath a session and a mid-edit reload is exactly the wrong moment. Instead `useRegisterSW` (from `virtual:pwa-register/react`) drives an `UpdateToast`: when `needRefresh` fires, show the standard toast (DESIGN.md §12) — "A new version is ready · Refresh" — and call `updateServiceWorker(true)` only on tap. Dismissal leaves the old version running until next launch; deploys are never urgent here.
- **`OfflineBanner`**: `useOnline.ts` subscribes to `online`/`offline` events (`navigator.onLine` initial). Offline → a slim strip under the header: "Offline — showing the last synced copy" (DESIGN.md §12). It complements, not replaces, the itinerary's per-surface sync whisper; mutations offline already degrade correctly via the shipped optimistic-write path (§8).

### 14e. Icons — generated from the torii mark

One committed script, `scripts/generate-pwa-icons.mjs` (`sharp`, dev-only), run manually once and re-run only if the mark changes; the four PNGs are committed to `public/`. What Opus produces:

| File | Size | Construction (from `public/torii-icon.svg`'s geometry) |
|---|---|---|
| `pwa-192.png` | 192² | paper `#f7fbfa` rounded-rect ground (the SVG's own), clay torii at the SVG's proportions |
| `pwa-512.png` | 512² | same, scaled |
| `pwa-maskable-512.png` | 512² | **full-bleed square** paper ground, torii scaled to ~60% and centred — everything meaningful inside the central 80% safe zone (maskable spec) |
| `apple-touch-icon.png` | 180² | full-bleed square paper ground (opaque, **no rounded corners** — iOS masks it), torii at ~70% |

The two hexes involved are the same pair already excepted in the favicon (`clay #c33c54`, `paper #f7fbfa`) — the script reads them as constants with a comment pointing at the DESIGN.md §8 exception.

### 14f. Service-worker caching strategy

Precache: the whole build output (shell, JS/CSS, self-hosted fonts, icons) — revision-hashed by the plugin, so updates are exact. Runtime caching, in matching order:

| Route (regex on URL) | Strategy | Cache | Why |
|---|---|---|---|
| `*.supabase.co/auth/v1/*` | **NetworkOnly** | — | Tokens are never cache material |
| `*.supabase.co/rest/v1/*` (GET only — Workbox default) | **NetworkFirst**, `networkTimeoutSeconds: 4`, maxEntries 64, maxAge 7 d | `supabase-rest` | Freshness matters when online; availability wins when not. The last-loaded slots/spots/marks/packing/journal rows render on the Shinkansen. **Not** CacheFirst — a stale itinerary shown while online would fight the realtime channel |
| `*.supabase.co/storage/v1/object/*` | **CacheFirst**, `matchOptions: { ignoreSearch: true }`, maxEntries 40, maxAge 30 d | `journal-photos` | Signed URLs differ only by token query — `ignoreSearch` makes the object path the cache key, so last-viewed photos work offline; the bytes at a path never change (overwrite = same path, rare, self-heals on expiry) |
| `basemaps.cartocdn.com/*` | **CacheFirst**, maxEntries 200, maxAge 7 d | `carto-tiles` | Last-viewed map areas survive offline; 200 tiles ≈ a few MB |
| `api.open-meteo.com` | **not listed → no SW involvement** | — | The app-level cache (DATA_MODEL.md §13c) already owns weather staleness; two cache layers would fight |

What the SW deliberately does **not** do: queue mutations (no Workbox background-sync). Offline writes keep the shipped model — optimistic local state + localStorage + the quiet "saved on this device" note (§4 note, §8). Realtime is a WebSocket and is untouched by all of this.

## 15. Today view — the itinerary's smart default

Pure client logic, no storage, no new components — behaviour added to `ItineraryPage`:

```
ItineraryPage mounts (or the app opens onto the Itinerary tab)
  │ tripDayFor(new Date())        — DATA_MODEL.md §14; device-local by design
  ├── null (outside 20 Sep – 3 Oct 2026) ──► activeDay = 1, exactly as shipped
  └── n (1–14) ──► activeDay = n ("today's pill" auto-selected)
        │ find the current/next slot: parse slot.time via /^(\d{1,2}):(\d{2})/,
        │ ignore unparseable labels; current = last slot ≤ now, else next = first
        └─► one-shot scrollIntoView({ block: 'center' }) + the "now" marker
            (DESIGN.md §13); respects prefers-reduced-motion (instant, no smooth)
```

Rules: the auto-selection runs **once per mount**, never re-yanks the day while the user browses other days, and manual pill taps always win. No ticking timer — the marker recomputes on mount and day-switch only (a phone glance remounts often enough). Timezone reasoning is recorded in DATA_MODEL.md §14: device-local time *is* JST exactly when the window check can pass.

## 16. Data flow C — visited marks (extension)

The lightest sync loop in the app, deliberately shaped like §6/§7:

```
VisitedToggle tap on a card
  │ key = itemKeyForEntry(entry) | itemKeyForIdea(idea)   (DATA_MODEL.md §10a —
  │       canonical, index-free; NEVER the raw normalized id)
  ├──► optimistic: flip in the Set → card dims/undims instantly
  ├──► localStorage 'japan2026VisitedMarks' snapshot
  └──► signed-in: upsert {item_key} (ignoreDuplicates) | delete eq item_key
                                                          (API.md §5b)
other device ◄── realtime '*' on visited_marks
                 INSERT → add key · DELETE → drop key (replica identity full)
```

`useVisited` is provided once in `App.tsx` (like `useSubmittedSpots`) and passed down — the same set backs Ideas, the three place tabs and Full data, so a tick on a Restaurants card is instantly visible on the same place in Full data. Accommodations/events cards get no toggle (DATA_MODEL.md §10a). Open mode: the Set lives in localStorage alone.

## 17. Data flow D — packing checklist (extension)

`usePacking` is `useItinerary` with the serial numbers filed off — same load → seed-if-empty → keyed-Map state → optimistic mutations → snapshot → realtime loop (API.md §6c), with category standing in for day and no drag machinery (DATA_MODEL.md §11e). Conflict policy, seeding race-proofing, offline behaviour: all identical to §7 by construction. The one wrinkle worth naming: `checked` toggles from two phones are last-write-wins like everything else — ticking the same passport twice in the same second converges trivially.

## 18. Weather widget — the app's one third-party call

**Unlike everything else in this app, this is a network call to a third party with no auth of any kind** — no Supabase, no key, no session (API.md §8 confirms Open-Meteo's free tier is genuinely keyless; there is nothing to provision). It is also the only feature allowed to fail into silence:

```
Itinerary renders day N
  │ leg = ITINERARY_DAYS[N].leg  ── 'Home'? ──► no card
  │ cache['japan2026WeatherCache'][leg city] fresh (<30 min)? ──► render it
  └─ else fetchWeather(city)  (lib/weather.ts — plain fetch, JST-pinned days)
       ├─ ok ──► snapshot → cache → render: selected day's real date within the
       │        7-day horizon? that day's forecast · else current conditions only
       └─ fail ──► cached <6 h? render with "as of HH:MM" · else render nothing
```

The card follows the **selected** day (which, during the trip, the Today view makes today by default). One compact card under the day header (DESIGN.md §16) — not a dashboard, and never a loading spinner or error state.

## 19. Data flow E — journal + Storage (extension)

The app's first Supabase Storage use. Two independent halves per entry — text row and photo object — so a photo failure never costs words:

```
EntryComposer save
  │ entry = { entryKey:'jr-…', date (defaults today), text, photoPath:null }
  ├──► optimistic: into state + localStorage 'japan2026JournalEntries'
  ├──► INSERT journal_entries row                        (API.md §7e)
  └──► photo chosen? compressImage(file)  — lib/images.ts, ≤1600 px JPEG q0.8,
       │             REQUIRED before any upload (DATA_MODEL.md §12d)
       ├─ upload to journal-photos at '{entryKey}.jpg' (upsert)
       ├─ ok ──► UPDATE row photo_path
       └─ fail ──► row + text stand; photo slot shows quiet retry (§8)

display: photoPath → createSignedUrl(path, 3600), memoised per session;
         <img> loads via the SW CacheFirst route (§14f) → last-viewed photos
         work offline. URLs expire and are never persisted.

other device ◄── realtime '*' on journal_entries — upsert/drop by entry_key;
                 its next signed-URL fetch pulls the photo.

delete: remove object first, then row; orphaned objects are harmless
        (housekeeping recipe, API.md §7e). Open mode: text-only, no photo UI.
```

No attribution anywhere — no author column, no per-user path prefixes, nothing in metadata (§4.4). Entries are the couple's, jointly editable, last write wins.
