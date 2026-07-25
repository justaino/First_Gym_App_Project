-- ============================================================================
--  Athena's Arena — Phase 12 FIX: close friends couldn't actually read anything
--
--  RUN THIS ONCE in the Supabase SQL editor, after SQL-Phase12-Friends.sql.
--  Safe to re-run.
--
--  THE BUG
--  Tapping a close friend's card said "No workouts recorded yet", even though
--  their card correctly showed "2 workouts this week".
--
--  WHY
--  The weekly count comes from friend_activity(), which is SECURITY DEFINER —
--  it runs with its owner's rights and can see everything it needs. The
--  tap-through instead reads the `sessions` table directly, which goes through
--  the "close friends can read" policy... and that policy could never be true.
--
--  The reason is a Postgres rule that's easy to miss: WHEN A POLICY LOOKS AT
--  ANOTHER TABLE, THAT TABLE'S OWN RLS STILL APPLIES TO YOU. The policy tried
--  to find a row in close_friends where owner_id = your friend and friend_id =
--  you — but close_friends only lets you see rows where owner_id is YOU. So the
--  lookup found nothing. Same story for user_directory (it needed to read your
--  friend's share_workouts flag, and you can only read your own row).
--
--  THE FIX
--  Move the whole check into one SECURITY DEFINER function, which is allowed to
--  read those tables, and have both policies just call it. The function only
--  ever answers "may the person asking read this owner's workouts?" — a
--  yes/no about YOU. It can't be used to read anybody's data.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  1. The permission check, in one place
-- ---------------------------------------------------------------------------
-- Answers: may the logged-in user read `owner`'s workouts? True only when all
-- three still hold — accepted friendship, owner has marked them close, and the
-- owner's master sharing switch is on.

create or replace function public.may_read_workouts_of(owner uuid)
returns boolean
language sql
security definer          -- so it can see close_friends / user_directory
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.close_friends c
    join public.user_directory d
      on d.user_id = c.owner_id
    join public.friendships f
      on f.status = 'accepted'
     and (
           (f.requester_id = c.owner_id and f.addressee_id = c.friend_id)
           or
           (f.addressee_id = c.owner_id and f.requester_id = c.friend_id)
         )
    where c.owner_id = owner          -- whose data is being asked for
      and c.friend_id = auth.uid()    -- ...and it's ME asking
      and d.share_workouts = true
  );
$$;

revoke all on function public.may_read_workouts_of(uuid) from public;
revoke all on function public.may_read_workouts_of(uuid) from anon;
grant execute on function public.may_read_workouts_of(uuid) to authenticated;


-- ---------------------------------------------------------------------------
--  2. Point both policies at it
-- ---------------------------------------------------------------------------
-- Your own "own sessions" / "own exercises" policies are untouched: permissive
-- policies are ORed together, so you keep full access to your own rows.

drop policy if exists "sessions - close friends can read" on public.sessions;

create policy "sessions - close friends can read" on public.sessions
  for select using (public.may_read_workouts_of(user_id));

drop policy if exists "exercises - close friends can read" on public.exercises;

create policy "exercises - close friends can read" on public.exercises
  for select using (public.may_read_workouts_of(user_id));


-- ---------------------------------------------------------------------------
--  3. Check it worked
-- ---------------------------------------------------------------------------

-- (a) The function exists and is SECURITY DEFINER (prosecdef = true).
select proname, prosecdef
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'may_read_workouts_of';

-- (b) Both policies now just call it — the "qual" column should read
--     may_read_workouts_of(user_id).
select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
  and policyname in ('sessions - close friends can read',
                     'exercises - close friends can read');

-- (c) As before, calling it here returns false — the SQL editor isn't a
--     logged-in app user, so auth.uid() is null. Test it from the app.
select public.may_read_workouts_of('00000000-0000-0000-0000-000000000000');
