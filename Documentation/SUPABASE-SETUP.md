# Supabase setup — how the connection works, and how to redo it yourself

A reference for Athena's Arena. Two parts:
**Part A** explains how the existing connection works.
**Part B** is a step-by-step recipe for wiring up Supabase from scratch (a new project, or a
new app) without help.

For day-to-day operational notes (sync model, gotchas, "project paused" fix) see
`RUNBOOK.md` § *5d. Cloud sync & accounts*.

---

## Part A — How the app connects today

There is **no backend of ours**. The browser talks straight to Supabase's REST + Auth API
over HTTPS. Three files make that happen, loaded in this order in `index.html`:

```html
<script src="vendor/supabase.js"></script>  <!-- 1. the library -->
<script src="supabase.js"></script>         <!-- 2. creates the client -->
<script src="app.js"></script>              <!-- 3. the app -->
<script src="auth.js"></script>             <!-- 4. the login gate -->
```

1. **`vendor/supabase.js`** — the Supabase JavaScript library, kept *inside this repo*
   rather than loaded from a CDN, so the app still works offline. It defines a global
   `window.supabase`.
2. **`supabase.js`** — three real lines. Takes the project **URL** and **publishable key**
   and calls `window.supabase.createClient(...)`, producing a global `supabaseClient`.
3. **`auth.js` / `app.js`** — everything else just calls `supabaseClient.auth.…` (login,
   sign-up, logout) or `supabaseClient.from("exercises")…` (read/write data).

### Why the key in `supabase.js` is safe to commit

| Key | Looks like | Safe in the browser? |
|---|---|---|
| Publishable | `sb_publishable_…` | ✅ Yes — designed to ship in front-end code |
| Secret | `sb_secret_…` | ❌ **Never.** Full bypass of all security |

The publishable key doesn't grant access to data. What protects the data is **Row-Level
Security (RLS)**: every table has a policy saying *"you can only touch rows where
`user_id` = the currently logged-in user"*. Without a valid login, the publishable key can
read nothing.

> ⚠️ This project uses Supabase's **new key system** and the **legacy `anon` JWT is
> disabled** — using the legacy anon key returns `401`. Always take the `sb_publishable_…`
> key.

---

## Part B — Setting it up from scratch

### Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick a region near you; save the database password somewhere safe.
3. Wait for it to finish provisioning (a minute or two).
4. Go to **Project Settings → API** and copy:
   - the **Project URL** (`https://xxxxxxxx.supabase.co`)
   - the **publishable key** (`sb_publishable_…`)

### Step 2 — Get the library into the page

Download the library and save it into the repo:

```bash
curl -L "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" -o vendor/supabase.js
```

Then **open `vendor/supabase.js` and delete the last line** if it starts with
`//# sourceMappingURL=`. jsDelivr appends it; left in, the browser tries to fetch a source
map that isn't in the repo (harmless, but it clutters the console with 404s).

Add the script tag to `index.html`, **before** your own scripts:

```html
<script src="vendor/supabase.js"></script>
```

### Step 3 — Create the client

Make `supabase.js` with your two values from Step 1:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YOUR_KEY";

// `window.supabase` comes from vendor/supabase.js, loaded just before this file.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
```

Load it in `index.html` right after the vendor script.

### Step 4 — Create the tables

Two ways, and the choice has a consequence:

- **Table Editor (dashboard UI)** — tables automatically get the permission grants they
  need. Easier, more clicking.
- **SQL Editor** — faster and repeatable, but tables created this way **do not get the
  grants automatically**. You must add them yourself (Step 5) or every query fails with
  `42501 permission denied for table …`.

This project's tables were made in the **SQL Editor**. The schema:

```sql
-- profiles
create table public.profiles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- exercises
create table public.exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.profiles (id) on delete cascade,
  name text not null,
  sets int,
  reps int,
  reps_per_set jsonb,
  weight numeric,
  weight_per_set jsonb,
  icon text,
  day text,
  notes text
);

-- sessions ("entries" stays as JSON to match the nested per-set shape)
create table public.sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.profiles (id) on delete cascade,
  date text,
  day text,
  status text,
  entries jsonb,
  updated_at timestamptz default now()
);
```

### Step 5 — Grants (only if you used the SQL Editor)

```sql
grant select, insert, update, delete
  on public.profiles, public.exercises, public.sessions
  to authenticated;

grant select
  on public.profiles, public.exercises, public.sessions
  to anon;
```

**Symptom if you skip this:** `42501 permission denied for table exercises` in the console.

### Step 6 — Turn on Row-Level Security ⚠️ do not skip

Grants say *"logged-in users may touch this table"*. RLS says *"…but only their own rows."*
Without RLS, every user can read everyone else's data.

```sql
alter table public.profiles  enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions  enable row level security;
```

Then one policy per table (repeat for `exercises` and `sessions`):

```sql
create policy "own rows - select" on public.profiles
  for select using (auth.uid() = user_id);

create policy "own rows - insert" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "own rows - update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows - delete" on public.profiles
  for delete using (auth.uid() = user_id);
```

**How to check it worked:** in the Table Editor each table should show an "RLS enabled"
badge, and the app must write `user_id` on every insert (see the `*ToRow` mappers in
`app.js` § *5b. CLOUD SYNC*).

### Step 7 — Turn on email authentication

**Authentication → Providers → Email** → enable.

Decide whether **"Confirm email"** is on:
- **On** — the user must click a link in their inbox before they can log in.
- **Off** — sign-up logs them straight in.

`auth.js` already handles both: after `signUp` it checks whether a session came back, and
if not it shows *"Account created! Check your email to confirm, then log in."*

### Step 8 — Test it

1. Run the app with Live Server.
2. Sign up with an email + password → you should land in the app.
3. Create a profile, an exercise, and finish a workout.
4. Open the Supabase dashboard → **Table Editor** → the rows should be there.
5. Cross-device check: log in with the same account in another browser → the same data
   should appear.

If something fails, open DevTools (Mac: `Cmd + Option + I` in Chrome, or Safari's
**Develop** menu) and read the Console + Network tabs — Supabase errors come back with a
readable message and a code (`401` = wrong/legacy key, `42501` = missing grant, empty
results with no error = RLS policy blocking you).

### Step 9 — Bump the cache version

Any time you change an app file (`index.html`, `app.js`, `supabase.js`, `vendor/supabase.js`,
icons…), bump `CACHE_VERSION` in `sw.js` (`"v26"` → `"v27"`). If you don't, returning
visitors stay stuck on the old cached build.

*(Editing files in `Documentation/` doesn't need a bump — they're not in the service
worker's `APP_SHELL`.)*

---

## Things that will bite you later

| Symptom | Cause | Fix |
|---|---|---|
| `401 Unauthorized` on every request | Using the legacy `anon` JWT (disabled on this project) | Use the `sb_publishable_…` key |
| `42501 permission denied for table …` | Table made in SQL Editor without grants | Run the `grant` statements (Step 5) |
| Queries return nothing, no error | RLS policy doesn't match, or `user_id` isn't being saved | Check the policy and the insert payload |
| Console 404 for a `.js.map` file | Left the `sourceMappingURL` line in `vendor/supabase.js` | Delete that last line |
| "Connection error" after a quiet period | **Free Supabase projects pause after ~a week of no *database* activity.** Logging into the dashboard doesn't count — only real app traffic does | Dashboard → your project → **Resume/Restore**. Expect a slow first request while it wakes |
| Testers stuck on an old version | Forgot to bump `CACHE_VERSION` | Bump it and push |

## Updating the vendored library later

Re-download as in Step 2, delete the `sourceMappingURL` line, bump `CACHE_VERSION`, test,
then commit. Current vendored version: `supabase-js@2` (UMD, v2.108.2).
