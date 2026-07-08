# Japan 2026 — Data Model

Every data shape in the app: the static in-repo datasets (as TypeScript types), the two Supabase tables (TS shape + Postgres schema + the mapping between them), the localStorage keys, and the itinerary seed rules. Where the app and this file diverge, this file wins and the code is corrected. Companion docs: [API.md](API.md) for the SQL + call patterns, [ARCHITECTURE.md](ARCHITECTURE.md) §6–7 for how these shapes move.

**Status: planned.** Shapes marked *existing* are verified against the current `index.html` and JSON files; shapes marked *new* are the redesign's additions. All types live in `apps/web/src/data/types.ts`.

---

## 1. Conventions

- Client-side objects use **camelCase**; Supabase columns use **snake_case**. The mapping functions (`rowToSubmissionEntry`/`submissionToRow`, `rowToSlot`/`slotToRow`) are the only places the two vocabularies meet.
- Every synced record carries a **client-generated stable key** (`client_submission_key` / `slot_key`) so inserts are idempotent, realtime echoes dedupe, and edits have a handle that survives reloads on both devices.
- Timestamps are Postgres `timestamptz` defaulting to `now()`; the client never fabricates them.
- Cities are `'Tokyo' | 'Fuji' | 'Hiroshima' | 'Osaka' | 'Kyoto'` (plus `'Home'` in itinerary legs). Display order: `['Tokyo','Fuji','Hiroshima','Osaka','Kyoto']`.
- **No real names anywhere** — in data, comments, commits or docs. The travellers are "the two of you". The 22 Sep evening slot's text is exactly `Evening — Booked up 🤫` and never more specific (§6b).

## 2. Static dataset — accommodations & events (*existing* → `accommodations.ts`)

Feeds the map's "Hotels / Events" layer and the Full data tab. 10 entries today (2 accommodations, 8 planned events), ported verbatim from the current `accommodations` array.

```ts
export interface Accommodation {
  id: string                        // kebab-case, unique, e.g. 'ryokan-shizuku'
  type: 'accommodation' | 'event'
  title: string                     // may contain Japanese text (font-jp handles it)
  city: City
  suburb: string
  dates: string                     // free display text, e.g. '23–26 Sep 2026 (nights 4–6)'
  lat: number
  lng: number
  details: string                   // popup body; may carry 'Booked ✔' notes
  link: string
  category: 'Accommodation' | 'Event'   // marker icon + Full data grouping
}
```

## 3. Static dataset — trip ideas (*existing* → `ideas.ts`)

44 entries: 28 from the household's own planning notes plus 16 trimmed picks from a coworker's list. Feeds the Ideas tab (grouped by city + suburb, filterable by leg) and the map's Ideas layer.

```ts
export interface TripIdea {
  id: string                        // 'gotokuji'; coworker picks prefixed 'cw-'
  title: string
  city: City
  suburb: string                    // includes '(day trip)' suffixes, e.g. 'Kawagoe (day trip)'
  tag: string                       // free vocab: Culture/Shopping/Food/Nightlife/Art/…
  cost: string                      // display string: 'Free', '£25', '£0+ purchases', '¥1,800'
  lat: number
  lng: number
  source: string                    // 'Your Tokyo notes' | "Coworker's picks" | …
  description: string
  detail: string
  link?: string                     // absent → derived Google-Maps search URL (below)
  leg?: Leg                         // derived lazily via LEG_MAP, never authored
}
```

Port rules from the current site: ideas without a `link` get `https://www.google.com/maps/search/?api=1&query=` + URL-encoded `"{title} {city} Japan"`; `leg` derives as `LEG_MAP[city] ?? city` where `LEG_MAP = { Hakone:'Fuji', Nara:'Kyoto', Tokyo:'Tokyo', Fuji:'Fuji', Kyoto:'Kyoto', Hiroshima:'Hiroshima', Osaka:'Osaka' }`.

## 4. Static JSON files (*existing, content unchanged* → `src/data/*.json`)

The three curated files move from the repo root into `apps/web/src/data/` and are **statically imported** (bundled, typed via `normalize.ts`) rather than runtime-fetched — a malformed file now fails the build instead of a tab at runtime. The friendly "edit a JSON file to add places" workflow survives: edit → push → Actions rebuilds.

### 4a. `restaurants.json`

```jsonc
{ "destinations": {
    "Tokyo (Shibuya)": [            // key = "City" or "City (Suburb)" — parsed at load
      { "category": "Cheap Eats",   // sub-category vocabulary, drives filter pills
        "name": "…", "tabelog_rating": "3.5",
        "cost_approx": "£", "cuisine_type": "…",
        "description": "…", "google_maps_link": "…",
        "approx_wait_time_walkin": "…",
        "coordinates": { "lat": 35.66, "lng": 139.70 } } ] } }
```

`normalize.ts` must preserve the current loader behaviour: `city`/`suburb` parsed from the destination key with `/^([^()]+)(?:\s*\((.+)\))?$/`; each item stamped with `type: 'Restaurant'`, `title = name`, and a derived stable `id` (`{city}-{suburb}-{index}` slug).

### 4b. `attractions_by_location.json`

```jsonc
{ "locations": {
    "Tokyo": {
      "top_10":      [ { "name": "…", "rating": "…", "approx_cost": "…",
                         "booking_requirement": "…", "description": "…",
                         "website": "…", "google_maps_link": "…", "google_map_link": "…",
                         "coordinates": { "lat": 0, "lng": 0 } } ],
      "hidden_gems": [ /* same item shape */ ] } } }
```

The tier key becomes the item's `category` (`top_10` → "Top 10", `hidden_gems` → "Hidden Gems"). Note the historical duplicate link keys (`google_maps_link` **and** `google_map_link`) — readers must accept either; the normalizer coalesces them.

### 4c. `animal_cafes.json`

```jsonc
{ "cities": {
    "Tokyo": [ { "name": "…", "animals": ["Cats"], "rating": "…",
                 "approx_cost": "…", "booking_requirement": "…",
                 "description": "…", "website": "…",
                 "google_maps_link": "…", "google_map_link": "…",
                 "coordinates": { "lat": 0, "lng": 0 } } ] } }
```

### 4d. Normalized entry (what tabs/map/Full data actually consume)

```ts
export interface PlaceEntry {
  id: string
  type: 'Restaurant' | 'Attraction' | 'Animal Cafe'
  title: string                     // = name
  name: string
  category: string                  // sub-category / tier ("Cheap Eats", "Top 10", …)
  city: City
  suburb: string
  description: string
  link: string                      // coalesced google_maps_link / google_map_link / website
  coordinates: { lat: number; lng: number } | null
  costDisplay: string               // cost_approx / approx_cost, as-is
  rating?: string                   // tabelog_rating / rating
  bookingRequirement?: string
  // Restaurant-only:
  cuisineType?: string
  approxWait?: string
  // Animal-cafe-only:
  animals?: string[]
  source?: 'User Submission'        // set only on submitted spots (§7)
}
```

## 5. Static dataset — trip essentials + leg lookups (*existing* → `tripEssentials.ts`)

- `TRIP_ESSENTIALS: { title: string; body: string }[]` — flights, cash (~¥20,000), Suica, eSim, car-hire notes, rendered as cards above the itinerary. Flight times are already public in the current site and stay; **no finances beyond the already-public ryokan price appear anywhere**.
- `LEG_COLORS` becomes **token-based** (the current pink hexes are deleted): `{ Tokyo:'var(--color-clay)', Fuji:'var(--color-sky)', Hiroshima:'var(--color-fig)', Osaka:'var(--color-kraft)', Kyoto:'var(--color-olive)', Home:'var(--color-cloud)' }` — see [DESIGN.md](DESIGN.md) §6.
- `LEG_MAP` as in §3.

## 6. Itinerary slots (*new*) — the redesign's centrepiece

### 6a. Day metadata (static, `itineraryDays.ts`)

Day-level facts are trip constants, not collaborative state:

```ts
export interface ItineraryDay {
  day: number            // 1–14
  date: string           // 'Sun 20 Sep' … 'Sat 3 Oct'
  city: string           // display: 'Tokyo', 'Mt. Fuji / Hakone', 'Homeward bound'
  leg: Leg               // 'Tokyo'|'Fuji'|'Hiroshima'|'Osaka'|'Kyoto'|'Home' → LEG_COLORS
  hotel: string          // '' when unknown
  hotelBooked: boolean
}
```

Ported from the current site's `itinerary` array (day/date/city/leg/hotel/hotelBooked). The old `travel`/`acts`/`note` strings do **not** carry over as fields — their content folds into the slot seed (§6b). The prototype's per-day `budget` field is **deliberately dropped**: finance data stays out of this public repo (same policy that gitignores `Japan Itinerary/`).

### 6b. Slot — client shape (in-memory + localStorage + seed)

```ts
export type SlotType =
  | 'travel' | 'food' | 'culture' | 'free' | 'sleep' | 'surprise' | 'default'

export interface ItinerarySlot {
  slotKey: string        // stable id 'dNN-HHMM-slug', unique for all time
  day: number            // 1–14, joins to ItineraryDay
  position: number       // fractional sort key within the day (§6c)
  time: string           // display label, free text (usually 'HH:MM')
  type: SlotType         // drives the coloured left edge (DESIGN.md §6)
  text: string           // the editable content
}
```

`ITINERARY_SEED` in `itinerarySeed.ts` is the initial dataset: the owner's prototype's 14 days of ~6–9 slots each (one every ~1.5–2.5 h), reconciled with the live site's day facts. Seed rules:

- **Day 3 (Tue 22 Sep): daytime slots come from the prototype (breakfast → Edo-Tokyo Museum → lunch → Akihabara → Super Potato → arcade); the evening is exactly** `{ slotKey:'d03-1800-surprise', day:3, position:70, time:'18:00', type:'surprise', text:'Evening — Booked up 🤫' }` **and nothing in the seed occupies day 3 after 18:00.** The prototype's own day-3 evening entries are dropped in its favour, and no seed entry anywhere may hint at a specific venue for that evening. What the travellers later type into the live app is their own business.
- Dinner/meal slots elsewhere stay generic in the seed ("🍣 Dinner — splurge night!"); specific restaurant bookings get typed into the live app, not committed.
- `slotKey`s are deterministic (`dNN-HHMM-slug`), so seeding is idempotent (§6d). They are **never regenerated or renamed** after first commit — they're the sync handle.
- `position` seeds on the 10/20/30… lattice in time order within each day.
- Emoji-led text (the prototype's style: `✈️ Land at Haneda — immigration & baggage`) is kept — it's the wayfinding.

### 6c. Ordering — fractional positions

`position` is a `double precision` sort key, unique-ish within a day but never assumed integral:

- Render order: `ORDER BY day, position`, ties broken by `slotKey` for determinism.
- Drag-drop: the moved slot's new `position = (prev.position + next.position) / 2` — or `first − 10` / `last + 10` at the edges → **one row updated per drag**, one realtime frame.
- Renumber guard: if the midpoint would land within `1e-6` of a neighbour (≈50 consecutive drags into the same gap), the client rewrites that day's positions back onto the 10-lattice in a single batched pass. Rare enough to be a footnote, cheap enough to be safe.

### 6d. Slot — Supabase table `itinerary_slots`

Full SQL with RLS + realtime in [API.md](API.md) §3. Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | surrogate; the client never uses it as a handle |
| `slot_key` | `text not null unique` | the client's stable id — dedup + edit/delete handle (mirrors `client_submission_key`) |
| `day` | `int not null check (day between 1 and 14)` | |
| `position` | `double precision not null` | §6c |
| `time_label` | `text not null default ''` | display time |
| `slot_type` | `text not null default 'default'` + `check (slot_type in ('travel','food','culture','free','sleep','surprise','default'))` | coloured edge |
| `content` | `text not null default ''` | the editable text |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | maintained by a `moddatetime` trigger on UPDATE (API.md §3) — the client never sends it |

Indexes: the `unique` on `slot_key` doubles as the lookup index; plus `create index on public.itinerary_slots (day, "position");` for the ordered read. `REPLICA IDENTITY FULL` so realtime DELETE events carry `slot_key`, not just the surrogate `id` (API.md §3d).

### 6e. Mapping — `rowToSlot` / `slotToRow` (mirrors `rowToSubmissionEntry`)

| Client (`ItinerarySlot`) | Row (`itinerary_slots`) | Direction notes |
|---|---|---|
| `slotKey` | `slot_key` | both ways; never regenerated |
| `day` | `day` | both ways |
| `position` | `position` | both ways; `Number(row.position)` on read |
| `time` | `time_label` | both ways; `row.time_label ?? ''` on read |
| `type` | `slot_type` | both ways; unknown/renamed values fall back to `'default'` on read (forward compatibility) |
| `text` | `content` | both ways; `row.content ?? ''` on read |
| — | `id`, `created_at`, `updated_at` | server-only; ignored by the client shape |

### 6f. Seeding protocol

On the first signed-in load, if `SELECT` over `itinerary_slots` returns zero rows, the client UPSERTs the whole `ITINERARY_SEED` mapped through `slotToRow`, with `{ onConflict: 'slot_key', ignoreDuplicates: true }`. Two devices racing produce one seeded table and zero errors — `slot_key` uniqueness is the referee. The seed is **never re-applied** over a non-empty table: deletions are deliberate, and re-seeding would resurrect them.

## 7. Submitted spots (*existing*, preserved verbatim)

### 7a. Supabase table `submitted_spots`

As created by the original [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) (SQL restated in [API.md](API.md) §2). Live today with real rows — **the rebuild must not alter this table**.

| Column | Type | | Column | Type |
|---|---|---|---|---|
| `id` | `bigint identity pk` | | `speciality` | `text` |
| `created_at` | `timestamptz default now()` | | `description` | `text` |
| `client_submission_key` | `text` | | `google_maps_link` | `text` |
| `category` | `text` (Restaurant/Attraction/Animal Cafe) | | `approx_wait` | `text` |
| `name` | `text` | | `booking_requirement` | `text` |
| `sub_category` | `text` | | `lat` / `lng` | `double precision` |
| `cost_tier` | `int` (1–5 → `'£'.repeat(n)`) | | `city` / `suburb` | `text` |

### 7b. Form payload + mapping (`useSubmittedSpots.ts`)

```ts
export interface SubmissionPayload {          // what SubmitForm collects
  name: string; category: 'Restaurant' | 'Attraction' | 'Animal Cafe'
  subCategory: string; costTier: number       // 1–5
  city: City; suburb: string
  speciality: string; description: string
  googleMapsLink: string; approxWait: string; bookingRequirement: string
}
```

**Read path** (`rowToSubmissionEntry`, ported logic): row → payload with fallbacks (`name ?? speciality ?? 'User Submission'`, `sub_category ?? speciality ?? 'User Submission'`, `cost_tier ?? 1`) → `buildSubmissionEntry(payload, { id: client_submission_key ?? id, coordinates: lat/lng ?? CITY_FALLBACK_COORDS[city] ?? Tokyo })`, which fans out into the **native `PlaceEntry` shape of whichever dataset the category targets**: a Restaurant submission gains `cuisineType` (from speciality) and `approxWait`; an Attraction gains `bookingRequirement || 'Unknown'`; an Animal Cafe gains `animals: [subCategory || speciality]`. All gain `source: 'User Submission'` and `costDisplay = '£'.repeat(costTier)`.

**Write path** (`submissionToRow`): snake_case row from the same payload plus `client_submission_key: entry.submissionKey`, `lat`/`lng` from the entry's resolved coordinates (extracted from the Google-Maps link via the current regexes — `!3d…!4d…` then `?q=lat,lng` — else city fallback).

**Dedup on both paths**: an in-memory `Set` keyed by `client_submission_key ?? id` (the current `seenSubmissionKeys` behaviour) makes realtime echoes and re-loads no-ops.

This is the reference implementation the itinerary sync (§6) deliberately mirrors.

## 8. localStorage keys

| Key | Contents | Written when |
|---|---|---|
| `japan2026UserSubmissions` (*existing*) | JSON array of submission entries | Own submissions — open mode (it *is* the store) or alongside Supabase (local copy) |
| `japan2026ItinerarySlots` (*new*) | JSON array of client-shape slots (§6b), whole trip | Open mode: on every mutation. Signed-in: write-through snapshot after every successful load/mutation — the offline read cache |
| `japan-theme` (*new*) | `'light'` or `'dark'` (absent = follow OS) | Theme toggle |

## 9. Sizing sanity

14 days × ~7 slots ≈ 100 seed rows; a heavily edited trip might double that. `submitted_spots` holds dozens of rows. Everything fits in Supabase's free tier by three orders of magnitude; no pagination anywhere; whole-table reads on load are the right call. The bundled JSON datasets total ~55 KB pre-gzip — a non-issue for a Vite chunk.
