# Setup: shared database + your private login (Supabase) — ~10 minutes, free

The site works right away **without** this (in "open mode" — new spots and itinerary
edits save only on the device that made them, and there's no login). Doing the steps
below gives you:

- a **real sign-in** so only the two of you can open the site, and
- **shared spots and a shared itinerary** that sync live across both your phones.

You'll set **two values** at the end — as a local `.env.local` file for your own machine,
and as two GitHub repo variables for the live site.

---

## 1. Create a free Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub or email.
2. **New project** — Name: `japan-2026`, pick a database password (save it somewhere),
   Region: **London / EU (West)**. Wait ~1 min for it to finish.

## 2. Create the tables (SQL)

Left sidebar → **SQL Editor** → **New query** → paste all of this → **Run**. This is the
`submitted_spots` table (place submissions):

```sql
create table if not exists public.submitted_spots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  client_submission_key text,
  category text,
  name text,
  sub_category text,
  cost_tier int,
  city text,
  suburb text,
  speciality text,
  description text,
  google_maps_link text,
  approx_wait text,
  booking_requirement text,
  lat double precision,
  lng double precision
);

-- Lock the table down: only signed-in users (you two) can read or add spots.
alter table public.submitted_spots enable row level security;

create policy "signed-in can read spots"
  on public.submitted_spots for select
  to authenticated
  using (true);

create policy "signed-in can add spots"
  on public.submitted_spots for insert
  to authenticated
  with check (true);

-- Live updates so new spots pop up on both phones instantly.
alter publication supabase_realtime add table public.submitted_spots;
```

Then **New query** again → paste the itinerary table (this is the committed file
`supabase/migrations/0001_itinerary_slots.sql` — you can copy straight from there instead
of retyping it) → **Run**:

```sql
create table if not exists public.itinerary_slots (
  id bigint generated always as identity primary key,
  slot_key text not null unique,
  day int not null check (day between 1 and 14),
  "position" double precision not null,
  time_label text not null default '',
  slot_type text not null default 'default'
    check (slot_type in ('travel','food','culture','free','sleep','surprise','default')),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itinerary_slots_day_position
  on public.itinerary_slots (day, "position");

create extension if not exists moddatetime schema extensions;
create trigger itinerary_slots_updated_at
  before update on public.itinerary_slots
  for each row execute procedure extensions.moddatetime (updated_at);

alter table public.itinerary_slots enable row level security;

create policy "signed-in can read slots"
  on public.itinerary_slots for select
  to authenticated using (true);

create policy "signed-in can add slots"
  on public.itinerary_slots for insert
  to authenticated with check (true);

create policy "signed-in can edit slots"
  on public.itinerary_slots for update
  to authenticated using (true) with check (true);

create policy "signed-in can remove slots"
  on public.itinerary_slots for delete
  to authenticated using (true);

alter publication supabase_realtime add table public.itinerary_slots;
alter table public.itinerary_slots replica identity full;
```

> The itinerary table needs the full read/edit/delete set (not just read/add) because
> slots get typed into, dragged around and removed, not just appended.

## 3. Create your two accounts

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email + a password, and **tick "Auto Confirm User"** (so you can log in
   straight away without a confirmation email).
3. Do it again for the second person's email + password.

> These are the only two accounts that will exist. Use whatever passwords you like —
> because Supabase checks them on its server (not in the website's code), it's safe to
> reuse your MishkaHub passwords here if you want.

## 4. Stop anyone else signing up

Left sidebar → **Authentication** → **Sign In / Providers** (or **Providers → Email**) →
turn **OFF** "Allow new users to sign up". Now only the two accounts you made can ever log in.

## 5. Copy your two values

Left sidebar → **Project Settings** (gear) → **API**. Copy:
- **Project URL** — `https://xxxx.supabase.co`
- **anon public** key — the long string under *Project API keys*, starts `sb_publishable_…`

## 6. Set them for local dev

In `apps/web/`, copy `.env.example` to `.env.local` and fill in the two values:

```bash
cd apps/web
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...........(your anon key)
```

`.env.local` is gitignored — it never gets committed. Restart `npm run dev` after
creating it. Refresh the site → you'll get the **sign-in screen**. Log in with one of the
accounts from step 3 and you're in. Add a spot from the Submit tab or edit a day in the
Itinerary tab, and it now syncs to both your phones.

## 7. Set them for the live site

Repo → **Settings → Secrets and variables → Actions → Variables tab → New repository
variable**. Add both:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are repo **variables**, not secrets — see the safety note below for why that's fine.
The next push to `main` bakes them into the deployed build.

---

### Is it safe to put the anon key in a variable (even on a public repo)?

Yes. The **anon / publishable** key is meant to live in front-end code. It can't read or
write anything on its own — the row-level security from step 2 means both tables are only
reachable **after** someone signs in with a real account. Never put the *service_role* key
anywhere in this repo, its env files, or its Actions variables; you don't need it here.

> Note: the site's **static content** (ideas, restaurant lists, the itinerary seed text)
> still lives in the built JS, so on a **public** GitHub repo someone could read those from
> the source even though the live site asks for a login. The genuinely sensitive material
> (finances, flight details, the 22nd) is kept out of the repo entirely by `.gitignore` —
> it's never in a file at all, only ever typed live into the gated app. If you want the
> itinerary content itself fully private too, keep the GitHub repo **private** (GitHub
> Pages on a private repo needs a paid plan).

### Wipe test data later?

SQL Editor → `delete from public.submitted_spots;` or `delete from public.itinerary_slots;`
→ Run. Deleting all itinerary rows means the next signed-in load re-seeds the trip plan
from scratch (the app upserts the built-in seed whenever the table is empty).
