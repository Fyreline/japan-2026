# Setup: shared database + your private login (Supabase) — ~10 minutes, free

The site works right away **without** this (in "open mode" — new spots save only on
the device that added them, and there's no login). Doing the steps below gives you:

- a **real sign-in** so only the two of you can open the site, and
- **shared spots** that appear on both your phones live.

You'll edit **one file: `config.js`** at the end.

---

## 1. Create a free Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub or email.
2. **New project** — Name: `japan-2026`, pick a database password (save it somewhere),
   Region: **London / EU (West)**. Wait ~1 min for it to finish.

## 2. Create the table (SQL)

Left sidebar → **SQL Editor** → **New query** → paste all of this → **Run**:

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
- **anon public** key — the long string under *Project API keys*

## 6. Paste them into `config.js`

Open `config.js` (next to `index.html`) and fill in the quotes:

```js
window.JAPAN_CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi..........(your long anon key)',
  SUPABASE_TABLE: 'submitted_spots'
};
```

Save, refresh the site → you'll get the **sign-in screen**. Log in with one of the
accounts from step 3 and you're in. Add a spot from the Submit tab and it now syncs to
both your phones. 🎉

---

### Is it safe to put the anon key in the file (even a public repo)?

Yes. The **anon public** key is meant to live in front-end code. It can't read or write
anything on its own — the row-level security from step 2 means the `submitted_spots` data
is only reachable **after** someone signs in with a real account. Never paste the
*service_role* key (that one is secret); you don't need it here.

> Note: the site's **static content** (itinerary, ideas, restaurant lists) still lives in
> the code, so on a **public** GitHub repo someone could read those from the source even
> though the live site asks for a login. The sensitive stuff (finances, flights, the 22nd)
> is kept out of the repo by `.gitignore`. If you want the itinerary itself fully private
> too, keep the GitHub repo **private**.

### Wipe test data later?

SQL Editor → `delete from public.submitted_spots;` → Run.
