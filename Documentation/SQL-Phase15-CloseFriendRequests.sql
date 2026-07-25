-- ============================================================================
--  Athena's Arena — Phase 15a: mutual close friends
--
--  RUN THIS ONCE in the Supabase SQL editor. Safe to re-run.
--
--  WHAT'S CHANGING
--  Until now "close friend" was a one-way gift: you ticked ⭐ and that person
--  could see your workouts, whether or not they shared back. That still works.
--  What this adds is a MUTUAL version: you ask, they accept, and you both end
--  up close friends in one go.
--
--  WHY IT NEEDS THE DATABASE
--  Accepting has to create TWO grant rows — mine for you and yours for me — and
--  the existing rules deliberately let you write only rows where owner_id is
--  YOU. That's what stops anyone promoting themselves. So acceptance runs
--  through a SECURITY DEFINER function, which is allowed to write both rows
--  after checking that you really were asked.
--
--  WHAT IT BUILDS
--   1. close_requests — "I'd like us to be close friends", awaiting an answer.
--   2. friendships.close_requested — lets a BRAND-NEW friend request carry the
--      same intent, so one Accept can do both jobs.
--   3. accept_close_request() — the only thing that can write both grants.
--   4. end_close_friendship() — ends it for both sides at once.
--   5. friend_directory() gains two flags so the app can show "Asked" and
--      "Wants to be close friends".
--
--  DECISIONS BAKED IN (agreed 2026-07-25)
--   * The one-way ⭐ toggle SURVIVES. Mutual is the headline action; quietly
--     sharing your own training with someone stays possible.
--   * When you ask an EXISTING friend, your side opens immediately — you've
--     just said you want to share. Their side opens when they accept.
--     (For a brand-new person, both sides open on acceptance: you can't grant
--     access to someone who isn't your friend yet.)
--   * Ending it ends BOTH sides. "Close friends" is now one shared state.
--   * Close-friend rows that already exist are left exactly as they are.
-- ============================================================================


-- ============================================================================
--  SECTION 1 — close_requests: "shall we be close friends?"
-- ============================================================================

create table if not exists public.close_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint close_requests_not_self check (from_user <> to_user),
  -- One open request per direction; asking twice is the same ask.
  constraint close_requests_unique unique (from_user, to_user)
);

alter table public.close_requests enable row level security;

grant select, insert, delete on public.close_requests to authenticated;

drop policy if exists "close req - read own"  on public.close_requests;
drop policy if exists "close req - send"      on public.close_requests;
drop policy if exists "close req - withdraw"  on public.close_requests;

-- You can see requests you sent and ones sent to you.
create policy "close req - read own" on public.close_requests
  for select using (
    auth.uid() = from_user or auth.uid() = to_user
  );

-- You can only ask FROM yourself, and only someone who's already an accepted
-- friend. (Asking a stranger happens through the friend request instead — see
-- Section 2.)
create policy "close req - send" on public.close_requests
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

-- Either side can clear it: the sender withdraws, the recipient declines.
create policy "close req - withdraw" on public.close_requests
  for delete using (
    auth.uid() = from_user or auth.uid() = to_user
  );


-- ============================================================================
--  SECTION 2 — let a NEW friend request ask for close as well
-- ============================================================================
-- When you add someone who isn't a friend yet, there's nowhere to put a close
-- request (Section 1 needs an accepted friendship first). So the friend request
-- itself carries the intent, and one Accept settles both.

alter table public.friendships
  add column if not exists close_requested boolean not null default false;


-- ============================================================================
--  SECTION 3 — accept_close_request(): the only thing that grants both sides
-- ============================================================================
-- Call it with the other person's id. It refuses unless you were genuinely
-- asked — either a close_requests row pointing at you, or a friend request you
-- accepted that had close_requested set. Returns true if you're now close
-- friends, false if there was nothing to accept.
--
-- SECURITY DEFINER so it can insert the OTHER person's grant row. Everything it
-- writes is checked against auth.uid() first, so it can't be used to grant
-- yourself access to anybody.

create or replace function public.accept_close_request(other_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  asked boolean;
begin
  if me is null or other_user is null or me = other_user then
    return false;
  end if;

  -- You must actually be friends.
  if not exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = me and f.addressee_id = other_user)
        or
        (f.addressee_id = me and f.requester_id = other_user)
      )
  ) then
    return false;
  end if;

  -- ...and they must have asked, one way or the other.
  select
    exists (
      select 1 from public.close_requests r
      where r.from_user = other_user and r.to_user = me
    )
    or exists (
      select 1 from public.friendships f
      where f.close_requested = true
        and f.requester_id = other_user
        and f.addressee_id = me
    )
  into asked;

  if not asked then
    return false;
  end if;

  -- Grant both directions. "on conflict do nothing" means an existing one-way
  -- grant is simply left in place.
  insert into public.close_friends (owner_id, friend_id)
  values (me, other_user)
  on conflict do nothing;

  insert into public.close_friends (owner_id, friend_id)
  values (other_user, me)
  on conflict do nothing;

  -- Tidy up whatever asked, so it doesn't sit there looking pending.
  delete from public.close_requests
  where (from_user = other_user and to_user = me)
     or (from_user = me and to_user = other_user);

  update public.friendships
  set close_requested = false
  where (requester_id = other_user and addressee_id = me)
     or (requester_id = me and addressee_id = other_user);

  return true;
end $$;

revoke all on function public.accept_close_request(uuid) from public;
revoke all on function public.accept_close_request(uuid) from anon;
grant execute on function public.accept_close_request(uuid) to authenticated;


-- ============================================================================
--  SECTION 4 — end_close_friendship(): stop sharing, both ways
-- ============================================================================
-- Now that being close friends is a shared state, either of you can end it and
-- both grants go. Also clears any pending request between you, so the buttons
-- go back to their starting state.

create or replace function public.end_close_friendship(other_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or other_user is null or me = other_user then
    return false;
  end if;

  delete from public.close_friends
  where (owner_id = me and friend_id = other_user)
     or (owner_id = other_user and friend_id = me);

  delete from public.close_requests
  where (from_user = me and to_user = other_user)
     or (from_user = other_user and to_user = me);

  update public.friendships
  set close_requested = false
  where (requester_id = me and addressee_id = other_user)
     or (requester_id = other_user and addressee_id = me);

  return true;
end $$;

revoke all on function public.end_close_friendship(uuid) from public;
revoke all on function public.end_close_friendship(uuid) from anon;
grant execute on function public.end_close_friendship(uuid) to authenticated;


-- ============================================================================
--  SECTION 5 — friend_directory() learns about pending close requests
-- ============================================================================
-- Two new flags so a buddy card can say "Asked — waiting" or offer an Accept.
--
-- ⚠️ Dropped and recreated again, because "create or replace" can't change what
-- columns a function returns.

drop function if exists public.friend_directory();

create or replace function public.friend_directory()
returns table (
  friend_id            uuid,
  friend_name          text,
  friend_username      text,
  shares_workouts      boolean,
  i_trust_them         boolean,
  they_trust_me        boolean,
  close_asked_by_me    boolean,
  close_asked_by_them  boolean
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
    ),
    -- I've asked them (either as a standalone ask, or on the friend request)
    exists (
      select 1 from public.close_requests r
      where r.from_user = auth.uid() and r.to_user = d.user_id
    )
    or exists (
      select 1 from public.friendships f
      where f.close_requested = true
        and f.requester_id = auth.uid()
        and f.addressee_id = d.user_id
    ),
    -- They've asked me
    exists (
      select 1 from public.close_requests r
      where r.from_user = d.user_id and r.to_user = auth.uid()
    )
    or exists (
      select 1 from public.friendships f
      where f.close_requested = true
        and f.requester_id = d.user_id
        and f.addressee_id = auth.uid()
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

-- (a) The new table exists with RLS on, and has its three policies.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'close_requests';

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'close_requests'
order by policyname;

-- (b) The friendships flag is there (expect one row: close_requested, boolean).
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'friendships'
  and column_name = 'close_requested';

-- (c) All the functions exist and are SECURITY DEFINER (prosecdef = true).
select proname, prosecdef
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('accept_close_request', 'end_close_friendship',
                  'friend_directory');

-- (d) Existing close-friend grants are untouched — this should show whatever
--     you had before running the script.
select owner_id, friend_id from public.close_friends;

-- (e) As always, calling the functions here does nothing useful: auth.uid() is
--     null in the SQL editor, so they return false. Test from the app.
select public.accept_close_request('00000000-0000-0000-0000-000000000000');
