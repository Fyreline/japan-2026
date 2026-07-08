# Japan 2026 🇯🇵

Our trip-planning dashboard: map, day-by-day itinerary, ideas, restaurants, attractions,
animal cafés and a submit-a-spot form. 20 Sep – 3 Oct 2026: Tokyo → Fuji → Hiroshima →
Osaka → Kyoto → home.

A React + Vite + TypeScript + Tailwind SPA, wearing the same "Aizome" indigo-and-crimson
look as our other two household apps. It talks straight to Supabase (no server of ours) —
so it's just a static site with a login gate and a couple of live-syncing tables.

## Tabs

- **Itinerary** — day-by-day plan: trip essentials (cash, Suica, eSim, car), day pills,
  and an editable list of time slots per day. Type, drag to reorder, add or remove a
  slot and it syncs to the other phone within a second when you're both signed in.
- **Map** — every hotel, event, idea, restaurant, attraction and animal café as a pin,
  toggleable by layer.
- **Ideas** — the planning-notes spots, filterable by leg (Tokyo / Fuji / Hiroshima /
  Osaka / Kyoto).
- **Restaurants / Attractions / Animal cafés** — curated place lists with search + filters.
- **Full data** — everything in one searchable place, grouped by city.
- **Submit** — add a new spot from your phone; it appears on the map and tabs instantly.

## Running it locally

```bash
cd apps/web
npm install
npm run dev
```

Opens on <http://localhost:5175>. No `.env.local` needed to get started — the site runs
in **open mode**: no login, and anything you add or edit saves only to that browser (a
small "Sign-in off" pill shows in the header). This is the permanent, zero-setup fallback,
not just a placeholder.

To turn on real sign-in and cross-device sync, follow **`SUPABASE_SETUP.md`** (free,
~10 minutes) and add the two values it gives you to `apps/web/.env.local` (copy
`apps/web/.env.example` as a starting point — that file is gitignored, so your keys never
get committed).

```bash
npm run typecheck   # must stay clean
npm run build        # must stay clean
```

## Repo layout

```
apps/web/              # the app — everything above lives here
  src/
    components/         # shell, tabs, cards, the itinerary/ subfolder
    data/                # datasets: accommodations, ideas, trip essentials,
                         #   itinerary days + seed, and the three curated JSON files
    hooks/               # useSubmittedSpots, useItinerary, useTheme
    auth/                # the Supabase sign-in gate
    lib/                 # Supabase client
supabase/migrations/    # the SQL behind both Supabase tables, for the record
docs/                   # the build spec — architecture, data model, API, design, deployment
```

## Editing the place data

`apps/web/src/data/restaurants.json`, `attractions_by_location.json` and
`animal_cafes.json` are the curated lists behind those three tabs. Edit one of those files,
commit, push to `main` — GitHub Actions rebuilds and redeploys automatically, no other
steps.

The Ideas list and the accommodations/events layer are TypeScript files in the same folder
(`ideas.ts`, `accommodations.ts`) rather than JSON, since they're small and rarely change —
same edit → push → deploy flow.

The itinerary's starting content lives in `itineraryDays.ts` (the 14 days' dates/city/hotel)
and `itinerarySeed.ts` (the starting time slots). Once the table has been seeded in
Supabase, edits made live in the app take over — the seed only applies once, to an empty
table.

## What's kept private (don't publish these)

`.gitignore` already excludes them, but for the record — these are **not** committed:
- `OfflineExample.html` — a third party's reference site containing their own Supabase keys.
- `Japan Itinerary/` — a spreadsheet export with finances, flight logistics, and the 22nd.
- `apps/web/.env.local` — your local Supabase credentials.
- `node_modules/`, `apps/web/dist/`, `.DS_Store`, `.claude/`.

Everything else in the repo — including the itinerary seed text and the curated
datasets — contains no secrets and no real names. The one genuinely private fact (what's
happening on the evening of the 22nd) is never written into any file, in this repo or
anywhere else — it only ever exists as something the two of you type directly into the
gated, signed-in app.

## Putting it online (GitHub Pages)

The live site deploys automatically via `.github/workflows/deploy-pages.yml` on every push
to `main`, once repo **Settings → Pages → Source** is set to **GitHub Actions** and the two
`VITE_SUPABASE_*` repo variables are set (see `SUPABASE_SETUP.md` step 7). It publishes to
`https://fyreline.github.io/japan-2026/`.

> Heads-up: on a **public** repo the curated datasets and itinerary seed are readable in
> the built source even though the live site asks for a login — only the two Supabase
> tables are actually gated. If you want the itinerary content itself private too, make
> the GitHub repo **private** (GitHub Pages on a private repo needs a paid plan).
