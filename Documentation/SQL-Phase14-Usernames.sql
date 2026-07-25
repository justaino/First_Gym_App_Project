-- ============================================================================
--  Athena's Arena — Phase 14a: usernames
--
--  RUN THIS ONCE in the Supabase SQL editor (Dashboard -> SQL Editor -> New
--  query -> paste -> Run). Safe to re-run.
--
--  WHY
--  Today you can only add a friend if you know the email address they signed up
--  with. This adds a username — @mintyowl42 — so people can share a handle
--  instead. Emails keep working exactly as they do now; this is an extra way in,
--  not a replacement.
--
--  WHAT IT DOES
--   1. Adds a `username` column to user_directory, unique and format-checked.
--   2. Gives everyone who already has an account a readable random username
--      (they can change it later in Settings).
--   3. is_username_available() — powers the live "✓ available / ✗ taken" check.
--   4. find_user_by_username() — the lookup, mirroring find_user_by_email().
--   5. Updates friend_directory() to hand back usernames too, so buddy cards
--      can show "@mintyowl42" under a person's display name.
--
--  DECISIONS BAKED IN HERE
--   * Usernames are stored **lower case only**, 3–20 characters, letters,
--     numbers and underscores. That makes "MintyOwl42" and "mintyowl42" the
--     same person and keeps the uniqueness rule simple.
--   * A username is **separate from your display name**. The display name is
--     the friendly one your buddies see ("Justice"); the username is the unique
--     handle used to find you.
--   * The column allows NULL for now, because the app doesn't ask for one yet.
--     Every existing account gets one in step 2, and Phase 14b makes new
--     sign-ups choose theirs.
-- ============================================================================


-- ============================================================================
--  SECTION 1 — the column, the format rule, and uniqueness
-- ============================================================================

alter table public.user_directory
  add column if not exists username text;

-- Format rule: lower case, 3–20 chars, letters/numbers/underscore only.
-- (Dropped first so re-running with a changed rule doesn't error.)
alter table public.user_directory
  drop constraint if exists user_directory_username_format;

alter table public.user_directory
  add constraint user_directory_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- No two people can hold the same handle. Postgres allows any number of NULLs
-- in a unique index, so accounts without one yet don't clash with each other.
create unique index if not exists user_directory_username_key
  on public.user_directory (username);


-- ============================================================================
--  SECTION 2 — give existing accounts a username
-- ============================================================================
-- Everyone who signed up before this phase has no handle. Rather than leave
-- them un-findable, hand out readable ones like "mintyowl42" or "braveotter17".
-- They're meant to be changed — Phase 14c adds a box in Settings.
--
-- The loop tries a fresh random name until it finds a free one (with a cap, so
-- it can never spin forever).

do $$
declare
  adjectives text[] := array[
    'calm','brave','minty','sunny','swift','bold','jolly','keen','lucky',
    'mighty','nimble','plucky','quiet','spry','tidy','witty','zesty','breezy'
  ];
  nouns text[] := array[
    'owl','fox','bear','hawk','lynx','otter','wolf','crane','ibis','koala',
    'moose','panda','raven','seal','tiger','yak','heron','badger'
  ];
  person record;
  candidate text;
  attempts int;
begin
  for person in
    select user_id from public.user_directory where username is null
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;

      candidate :=
        adjectives[1 + floor(random() * array_length(adjectives, 1))::int] ||
        nouns[1 + floor(random() * array_length(nouns, 1))::int] ||
        (10 + floor(random() * 90))::int::text;

      -- Free? Take it and move on to the next person.
      exit when not exists (
        select 1 from public.user_directory u where u.username = candidate
      );

      -- Very unlucky (or a tiny word list): give up rather than loop forever.
      if attempts > 50 then
        candidate := null;
        exit;
      end if;
    end loop;

    if candidate is not null then
      update public.user_directory
      set username = candidate
      where user_id = person.user_id;
    end if;
  end loop;
end $$;


-- ============================================================================
--  SECTION 3 — is_username_available(): the live check while you type
-- ============================================================================
-- Returns true only if the handle is well-formed, not on the reserved list, and
-- not already taken by someone else. Your OWN current username counts as
-- available, so re-saving your settings without changing it doesn't error.
--
-- SECURITY DEFINER because the caller can't read other people's directory rows
-- — but all this ever reveals is a yes/no about one exact handle you typed.

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    auth.uid() is not null
    and lower(trim(candidate)) ~ '^[a-z0-9_]{3,20}$'
    -- A few handles kept back so nobody can impersonate the app itself.
    and lower(trim(candidate)) not in (
      'admin','athena','athenasarena','support','help','root','system','owner'
    )
    and not exists (
      select 1
      from public.user_directory d
      where d.username = lower(trim(candidate))
        and d.user_id <> auth.uid()
    );
$$;

revoke all on function public.is_username_available(text) from public;
revoke all on function public.is_username_available(text) from anon;
grant execute on function public.is_username_available(text) to authenticated;


-- ============================================================================
--  SECTION 4 — find_user_by_username(): the lookup
-- ============================================================================
-- Exactly like find_user_by_email, but by handle. One exact match, id and
-- display name only — no email ever comes back through it.

create or replace function public.find_user_by_username(lookup_username text)
returns table (friend_id uuid, friend_name text)
language sql
security definer
stable
set search_path = public
as $$
  select d.user_id, d.display_name
  from public.user_directory d
  where d.username = lower(trim(lookup_username))
    and auth.uid() is not null
  limit 1;
$$;

revoke all on function public.find_user_by_username(text) from public;
revoke all on function public.find_user_by_username(text) from anon;
grant execute on function public.find_user_by_username(text) to authenticated;


-- ============================================================================
--  SECTION 5 — let friend_directory() return usernames too
-- ============================================================================
-- So a buddy card can read "Justice / @mintyowl42" and you can tell two people
-- with the same first name apart.
--
-- ⚠️ This one has to be DROPPED first, not just replaced: Postgres won't let
-- "create or replace" change the columns a function returns. There's a moment
-- between the drop and the create where the app would get an error — it's
-- milliseconds, and the app retries on the next load, so it's not worth
-- worrying about on a personal project.

drop function if exists public.friend_directory();

create or replace function public.friend_directory()
returns table (
  friend_id       uuid,
  friend_name     text,
  friend_username text,
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
    d.username,
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
--  SECTION 6 — check it worked
-- ============================================================================

-- (a) Everyone now has a username, and they're all different.
--     Expect: as many rows as you have accounts, with_username the same number,
--     and distinct_usernames matching too.
select
  count(*)                            as accounts,
  count(username)                     as with_username,
  count(distinct username)            as distinct_usernames
from public.user_directory;

-- (b) Have a look at them (this is your own project's data).
select display_name, username
from public.user_directory
order by username;

-- (c) All four functions exist and are SECURITY DEFINER (prosecdef = true).
select proname, prosecdef
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('find_user_by_email', 'find_user_by_username',
                  'is_username_available', 'friend_directory');

-- (d) The format rule bites. This SHOULD fail with a constraint error —
--     that's the check working. Run it on its own to try it, then move on.
--     (Nothing else in this script depends on it.)
-- update public.user_directory set username = 'No Spaces Allowed!'
--   where user_id = auth.uid();

-- (e) As always, calling the functions from the SQL editor returns
--     nothing/false — auth.uid() is null here because the editor isn't a
--     logged-in app user. The real test happens from the app in Phase 14b.
select public.is_username_available('mintyowl42');
select * from public.find_user_by_username('mintyowl42');
