-- ============================================================================
--  Athena's Arena — Phase 12a: Friends + nudges (database setup)
--
--  WHAT THIS IS
--  Run this ONCE in the Supabase SQL editor (Dashboard -> SQL Editor -> New
--  query -> paste -> Run). It creates everything the Friends feature needs.
--  No app code uses any of this yet — that comes in 12b/12c/12d.
--
--  IT IS SAFE TO RE-RUN. Every statement uses "if not exists" or
--  "create or replace", and policies are dropped before being recreated.
--
--  TWO LEVELS OF FRIEND
--  Everyone you accept is a "friend": they can see THAT you trained (a tick for
--  today and your workouts-this-week count) and can nudge you — nothing more.
--  You can then promote someone to "close friend", which lets them open your
--  actual workouts (sets, reps, weights and exercise names).
--
--  This is enforced by the DATABASE, not just by what the screen draws — a
--  plain friend cannot read your workout rows at all, even with the browser's
--  developer tools open. It is also ONE-DIRECTIONAL: marking someone as close
--  controls what THEY see of YOUR data. Them marking you close doesn't give
--  them anything, so nobody can promote themselves.
--
--  WHAT IT BUILDS
--   1. user_directory     — one row per person: email, display name, and the
--                           master "share my workouts" switch.
--   2. find_user_by_email — a locked-down lookup, so you can send a request by
--                           email without anyone being able to browse emails.
--   3. friendships        — who asked whom, and whether it was accepted.
--   4. close_friends      — who YOU have promoted to close friend.
--   5. friend_directory   — safe way to read your friends' DISPLAY NAMES
--                           (never their emails).
--   6. sessions policy    — close friends may read your workouts...
--   7. exercises policy   — ...including the exercise names.
--   8. friend_activity    — the "went today / workouts this week" numbers for
--                           ordinary friends, as counts only.
--   9. nudges             — the "go train!" pokes, max one per friend per day.
--
--  THREE CONCEPTS USED THROUGHOUT
--   * GRANT = "logged-in users are allowed to touch this table at all."
--     Tables created in the SQL editor do NOT get this automatically — that's
--     the classic "42501 permission denied for table ..." error.
--   * RLS (Row-Level Security) = "...but only the specific rows the rule
--     allows." Grants without RLS would let everyone read everyone's data.
--   * auth.uid() is the id of whoever is logged in and making the request.
-- ============================================================================


-- ============================================================================
--  SECTION 1 — user_directory: the "who's on this app" table
-- ============================================================================
-- One row per signed-up person. The app upserts YOUR OWN row when you log in.
-- Email is stored lower-cased so that lookups are case-insensitive.

create table if not exists public.user_directory (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  email          text not null unique,
  display_name   text,
  -- The master switch (Settings -> "Share my workouts with friends"). When
  -- false, friends see nothing at all — not even your went-today tick.
  share_workouts boolean not null default true,
  updated_at     timestamptz not null default now(),
  -- Belt and braces: refuse to store an email with capitals, so the lookup
  -- below can never miss a match because of case.
  constraint user_directory_email_lowercase check (email = lower(email))
);

alter table public.user_directory enable row level security;

-- Permission to use the table at all (RLS below decides WHICH rows).
grant select, insert, update, delete on public.user_directory to authenticated;

-- --- RLS: you can only see and change YOUR OWN row -------------------------
drop policy if exists "directory - read own row"   on public.user_directory;
drop policy if exists "directory - insert own row" on public.user_directory;
drop policy if exists "directory - update own row" on public.user_directory;
drop policy if exists "directory - delete own row" on public.user_directory;

create policy "directory - read own row" on public.user_directory
  for select using (auth.uid() = user_id);

create policy "directory - insert own row" on public.user_directory
  for insert with check (auth.uid() = user_id);

create policy "directory - update own row" on public.user_directory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Needed by Settings -> "Delete my data".
create policy "directory - delete own row" on public.user_directory
  for delete using (auth.uid() = user_id);


-- ============================================================================
--  SECTION 2 — find_user_by_email(): the safe friend lookup
-- ============================================================================
-- The problem: to send a friend request by email, the app must check that the
-- email belongs to a real account. But the RLS above (correctly) stops you
-- reading anybody else's row.
--
-- The fix: a "SECURITY DEFINER" function. It runs with the privileges of its
-- owner rather than the caller's, so it can peek at the table — but it only
-- ever returns a single EXACT match, and only the id + display name. There is
-- no way to list emails or search partially with it.

create or replace function public.find_user_by_email(lookup_email text)
returns table (friend_id uuid, friend_name text)
language sql
security definer          -- runs with the function owner's rights
stable                    -- doesn't change any data
set search_path = public  -- pin the schema (a SECURITY DEFINER safety habit)
as $$
  select d.user_id, d.display_name
  from public.user_directory d
  where d.email = lower(trim(lookup_email))
    and auth.uid() is not null   -- must be logged in to use this at all
  limit 1;
$$;

-- Only logged-in users may call it — never anonymous visitors.
revoke all on function public.find_user_by_email(text) from public;
revoke all on function public.find_user_by_email(text) from anon;
grant execute on function public.find_user_by_email(text) to authenticated;


-- ============================================================================
--  SECTION 3 — friendships: requests and accepted friends
-- ============================================================================
-- One row per PAIR of people. requester_id asked, addressee_id was asked.
-- status is 'pending' until the addressee accepts, then 'accepted'.

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  -- You can't befriend yourself.
  constraint friendships_not_self check (requester_id <> addressee_id),
  -- Can't ask the same person twice.
  constraint friendships_unique_direction unique (requester_id, addressee_id)
);

-- ...and can't have a row in BOTH directions (you ask me, I ask you). Sorting
-- the two ids with least()/greatest() makes the pair the same either way round,
-- so this unique index catches the mirror-image duplicate. The database
-- enforces it, so the app can't get it wrong.
create unique index if not exists friendships_unique_pair
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

alter table public.friendships enable row level security;

grant select, insert, update, delete on public.friendships to authenticated;

-- --- RLS -------------------------------------------------------------------
drop policy if exists "friendships - read own" on public.friendships;
drop policy if exists "friendships - request"  on public.friendships;
drop policy if exists "friendships - accept"   on public.friendships;
drop policy if exists "friendships - remove"   on public.friendships;

-- You can see a row only if you're one of the two people in it.
create policy "friendships - read own" on public.friendships
  for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- You may only create a request FROM yourself, and only as 'pending' (so
-- nobody can insert a pre-accepted friendship).
create policy "friendships - request" on public.friendships
  for insert with check (
    auth.uid() = requester_id
    and status = 'pending'
    and requester_id <> addressee_id
  );

-- Only the person who was ASKED can change the row, and only to 'accepted'.
create policy "friendships - accept" on public.friendships
  for update using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

-- Either side can remove the friendship (or decline a request).
create policy "friendships - remove" on public.friendships
  for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );


-- ============================================================================
--  SECTION 4 — close_friends: who gets to see the detail
-- ============================================================================
-- There's no "tier" column here on purpose: a row simply EXISTING means
-- "owner_id lets friend_id see their workouts". Promoting someone is an
-- insert, demoting them is a delete — and because you may only write rows
-- where owner_id is you, nobody can promote themselves.
--
-- Note the direction: owner_id is the person whose data is being shared,
-- friend_id is the person being trusted with it.

create table if not exists public.close_friends (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  constraint close_friends_not_self check (owner_id <> friend_id)
);

alter table public.close_friends enable row level security;

grant select, insert, delete on public.close_friends to authenticated;

-- --- RLS -------------------------------------------------------------------
drop policy if exists "close - read own"   on public.close_friends;
drop policy if exists "close - promote"    on public.close_friends;
drop policy if exists "close - demote"     on public.close_friends;

-- You can only see your own list of who you've trusted.
create policy "close - read own" on public.close_friends
  for select using (auth.uid() = owner_id);

-- You can only promote someone who is already an ACCEPTED friend of yours.
create policy "close - promote" on public.close_friends
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = friend_id)
          or
          (f.addressee_id = auth.uid() and f.requester_id = friend_id)
        )
    )
  );

create policy "close - demote" on public.close_friends
  for delete using (auth.uid() = owner_id);


-- ============================================================================
--  SECTION 5 — friend_directory(): read your friends' NAMES (never emails)
-- ============================================================================
-- Section 1's RLS means you can't read a friend's user_directory row, so the
-- app couldn't show their name — not even on an incoming request. This fills
-- that gap and nothing more: display name + their sharing switch, for people
-- you already have a friendship row with (pending or accepted). It NEVER
-- returns an email address.
--
-- It also returns the two "close friend" flags the Friends tab needs:
--   i_trust_them  — you have marked them close (they can see your detail)
--   they_trust_me — they have marked you close (you can see their detail)

create or replace function public.friend_directory()
returns table (
  friend_id       uuid,
  friend_name     text,
  shares_workouts boolean,
  i_trust_them    boolean,
  they_trust_me   boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    d.user_id,
    d.display_name,
    d.share_workouts,
    exists (
      select 1 from public.close_friends c
      where c.owner_id = auth.uid() and c.friend_id = d.user_id
    ),
    exists (
      select 1 from public.close_friends c
      where c.owner_id = d.user_id and c.friend_id = auth.uid()
    )
  from public.user_directory d
  where auth.uid() is not null
    and exists (
      select 1
      from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = d.user_id)
         or (f.addressee_id = auth.uid() and f.requester_id = d.user_id)
    );
$$;

revoke all on function public.friend_directory() from public;
revoke all on function public.friend_directory() from anon;
grant execute on function public.friend_directory() to authenticated;


-- ============================================================================
--  SECTION 6 — let CLOSE friends read your workouts
-- ============================================================================
-- This ADDS a policy to the existing sessions table; your own "own rows"
-- policies are untouched. Postgres ORs permissive policies together, so you
-- keep full access to your own rows and close friends gain read-only access to
-- yours.
--
-- THREE things must all be true, so access is easy to revoke: you must still
-- be accepted friends, you must have marked them close, and your master
-- "share my workouts" switch must be on. Turning any one of them off cuts the
-- access off immediately — including unfriending, even if the close_friends
-- row is still lying around.

drop policy if exists "sessions - friends can read"       on public.sessions;
drop policy if exists "sessions - close friends can read" on public.sessions;

create policy "sessions - close friends can read" on public.sessions
  for select using (
    exists (
      select 1
      from public.user_directory d
      join public.close_friends c
        on c.owner_id = sessions.user_id
       and c.friend_id = auth.uid()
      join public.friendships f
        on f.status = 'accepted'
       and (
             (f.requester_id = sessions.user_id and f.addressee_id = auth.uid())
             or
             (f.addressee_id = sessions.user_id and f.requester_id = auth.uid())
           )
      where d.user_id = sessions.user_id
        and d.share_workouts = true
    )
  );


-- ============================================================================
--  SECTION 7 — ...including the exercise NAMES
-- ============================================================================
-- A workout row stores exercise IDs, not names. Without this, a close friend's
-- workout detail would show blanks instead of "Bench press". Exactly the same
-- three conditions as Section 6.

drop policy if exists "exercises - friends can read"       on public.exercises;
drop policy if exists "exercises - close friends can read" on public.exercises;

create policy "exercises - close friends can read" on public.exercises
  for select using (
    exists (
      select 1
      from public.user_directory d
      join public.close_friends c
        on c.owner_id = exercises.user_id
       and c.friend_id = auth.uid()
      join public.friendships f
        on f.status = 'accepted'
       and (
             (f.requester_id = exercises.user_id and f.addressee_id = auth.uid())
             or
             (f.addressee_id = exercises.user_id and f.requester_id = auth.uid())
           )
      where d.user_id = exercises.user_id
        and d.share_workouts = true
    )
  );


-- ============================================================================
--  SECTION 8 — friend_activity(): counts only, for ORDINARY friends
-- ============================================================================
-- The buddy list needs "went today ✅" and "3 workouts this week" for every
-- friend — but an ordinary friend must not be able to read the workout rows
-- themselves. So instead of a policy, they get this function: it does the
-- counting inside the database and hands back nothing but the answers. No
-- dates, no weights, no exercise names can leak through it.
--
-- Close friends get these numbers from here too; their extra access comes from
-- Sections 6 and 7.
--
-- Rows come back only for accepted friends who have sharing switched on — the
-- app shows the others as "not sharing".
--
-- ⚠️ Timezone note: "today" and "this week" are worked out in UTC (that's what
-- the database runs on), while the app's own screens use your phone's local
-- time. Around midnight a friend's tick can therefore be a couple of hours out
-- of step with their own Today screen. Fine for a badge; don't use it for
-- anything that has to be exact. (date_trunc('week') is Monday-based, which
-- matches the rest of the app.)

create or replace function public.friend_activity()
returns table (
  friend_id          uuid,
  trained_today      boolean,
  workouts_this_week integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    d.user_id,
    exists (
      select 1
      from public.sessions s
      where s.user_id = d.user_id
        and coalesce(s.status, '') <> 'in-progress'
        and (s.date)::timestamptz::date = current_date
    ),
    (
      select count(*)
      from public.sessions s
      where s.user_id = d.user_id
        and coalesce(s.status, '') <> 'in-progress'
        and (s.date)::timestamptz >= date_trunc('week', now())
    )::int
  from public.user_directory d
  where auth.uid() is not null
    and d.share_workouts = true
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = d.user_id)
          or
          (f.addressee_id = auth.uid() and f.requester_id = d.user_id)
        )
    );
$$;

revoke all on function public.friend_activity() from public;
revoke all on function public.friend_activity() from anon;
grant execute on function public.friend_activity() to authenticated;

-- Postgres does NOT automatically index foreign keys. The counts above filter
-- sessions by user_id, so give it an index to use.
create index if not exists sessions_user_id_idx on public.sessions (user_id);


-- ============================================================================
--  SECTION 9 — nudges: "go get that workout!"
-- ============================================================================

create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  seen       boolean not null default false,
  constraint nudges_not_self check (from_user <> to_user)
);

alter table public.nudges enable row level security;

grant select, insert, update, delete on public.nudges to authenticated;

-- ONE NUDGE PER FRIEND PER DAY, enforced by the database rather than trusted to
-- the app. The day is worked out in UTC — "at time zone 'utc'" is required
-- because plain ::date depends on the server's timezone setting, and an index
-- can only use expressions that always give the same answer.
create unique index if not exists nudges_one_per_day
  on public.nudges (from_user, to_user, ((created_at at time zone 'utc')::date));

-- --- RLS -------------------------------------------------------------------
drop policy if exists "nudges - read own"   on public.nudges;
drop policy if exists "nudges - send"       on public.nudges;
drop policy if exists "nudges - mark seen"  on public.nudges;
drop policy if exists "nudges - delete own" on public.nudges;

-- You can see nudges you sent (so the button can say "Nudged! ✓") and ones
-- sent to you (so the app can show the toast).
create policy "nudges - read own" on public.nudges
  for select using (
    auth.uid() = to_user or auth.uid() = from_user
  );

-- You can only send FROM yourself, and only to an ACCEPTED friend. Note this
-- does NOT require close-friend status — any friend can cheer you on.
create policy "nudges - send" on public.nudges
  for insert with check (
    auth.uid() = from_user
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = to_user)
          or
          (f.addressee_id = auth.uid() and f.requester_id = to_user)
        )
    )
  );

-- Only the recipient marks a nudge as seen.
create policy "nudges - mark seen" on public.nudges
  for update using (auth.uid() = to_user)
  with check (auth.uid() = to_user);

-- Either side can delete (used by Settings -> "Delete my data").
create policy "nudges - delete own" on public.nudges
  for delete using (
    auth.uid() = to_user or auth.uid() = from_user
  );


-- ============================================================================
--  SECTION 10 — check it worked
-- ============================================================================
-- Run these after the script. Expected results are in the comments.

-- (a) The four new tables exist and all have RLS on (rowsecurity = true).
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('user_directory', 'friendships', 'close_friends', 'nudges')
order by tablename;

-- (b) The policies are in place. Expect 4 for user_directory, 4 for
--     friendships, 3 for close_friends, 4 for nudges, plus ONE new
--     "close friends can read" policy on each of sessions and exercises
--     (alongside the "own rows" ones you already had).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('user_directory', 'friendships', 'close_friends',
                    'nudges', 'sessions', 'exercises')
order by tablename, policyname;

-- (c) All three helper functions exist and are SECURITY DEFINER
--     (prosecdef = true).
select proname, prosecdef
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('find_user_by_email', 'friend_directory', 'friend_activity');

-- (d) Smoke test. Run these from the SQL editor and you'll get NO rows —
--     that's CORRECT: the SQL editor isn't a logged-in app user, so auth.uid()
--     is null and every function refuses. The real test happens from the app
--     in Phase 12b.
select * from public.find_user_by_email('someone@example.com');
select * from public.friend_directory();
select * from public.friend_activity();
