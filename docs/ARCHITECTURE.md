# Japan 2026 — System Architecture

This document is the durable reference for how the rebuilt Japan 2026 trip site fits together: the stack, the repo layout, component responsibilities, the Supabase auth gate, how itinerary edits travel between the two travellers' phones, failure modes, and how the whole thing deploys. Every other doc in this suite assumes the decisions recorded here. For the delivery order see [PLAN.md](PLAN.md); for storage shapes see [DATA_MODEL.md](DATA_MODEL.md); for the Supabase surface see [API.md](API.md); for the visual contract see [DESIGN.md](DESIGN.md); for ops see [DEPLOYMENT.md](DEPLOYMENT.md).

**Status: planned.** The current site is a single ~140 KB `index.html` (inline styles + scripts, pink sakura theme, CDN scripts, static itinerary cards). This suite specifies its replacement: a **React + Vite + TypeScript + Tailwind v4** SPA in the exact stack of the two sibling household apps (MishkaHub, Michi), wearing the shared Aizome palette, with a fully editable, live-syncing itinerary.

---

## 1. System overview

A private, two-user trip dashboard for a 14-day Japan holiday (20 Sep – 3 Oct 2026; Glasgow → Tokyo → Fuji → Hiroshima → Osaka → Kyoto → Tokyo → home):

| Component | Technology | Runs on | Role |
|---|---|---|---|
| Web app | React ^19.2.7 + Vite ^8.1.3 + TypeScript ^6.0.3 + Tailwind v4 (^4.3.2 + `@tailwindcss/vite`), static build | GitHub Pages | All UI: itinerary, map, ideas, place lists, submit form |
| Database + auth + realtime | Supabase (Postgres, GoTrue Auth, Realtime) — free tier, **already provisioned and in use** | Supabase cloud (EU/London) | Sign-in gate, `submitted_spots`, `itinerary_slots`, live cross-device sync |
| Map | `leaflet` (npm) + CARTO light tiles | bundled / basemaps.cartocdn.com | Map tab with 5 toggleable pin layers |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | bundled | Itinerary time-slot reordering (touch + keyboard) |

**There is no server of ours anywhere.** The browser talks straight to Supabase with the publishable anon key plus a signed-in session; row-level security is the entire authorisation model. This makes Japan the simplest of the three household apps: same frontend stack as MishkaHub/Michi, but **no FastAPI process, no Cloudflare Tunnel, no LaunchAgent** — nothing runs on the household Mac.

Runtime network dependencies:

| Dependency | Loaded from | Used for | If unreachable |
|---|---|---|---|
| Supabase project | `*.supabase.co` | Auth, both tables, realtime | Open mode / localStorage cache (§5, §7, §8) |
| CARTO tile server | basemaps.cartocdn.com | Map tiles | Grey map, pins still plot |

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
