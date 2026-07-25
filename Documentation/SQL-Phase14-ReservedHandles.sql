-- ============================================================================
--  Athena's Arena — Phase 14a follow-up: reserve the owner's handles
--
--  RUN THIS ONCE in the Supabase SQL editor, after SQL-Phase14-Usernames.sql.
--  Safe to re-run.
--
--  TWO CHANGES
--   1. Adds justaino / justaino97 / justaino81 to the reserved list, so nobody
--      else can take them.
--   2. Fixes an edge case: the reserved check used to apply even to the person
--      who ALREADY holds that handle. So if you claimed "justaino" and later
--      opened the username box and saved without changing anything, the app
--      would have told you your own name was unavailable. Now a reserved name
--      counts as available to whoever already owns it.
-- ============================================================================

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with asked as (
    select lower(trim(candidate)) as name
  )
  select
    auth.uid() is not null
    -- Right shape: lower case, 3–20 chars, letters/numbers/underscore.
    and (select name from asked) ~ '^[a-z0-9_]{3,20}$'
    -- Not taken by somebody else.
    and not exists (
      select 1
      from public.user_directory d
      where d.username = (select name from asked)
        and d.user_id <> auth.uid()
    )
    -- Not on the reserved list — UNLESS it's already yours, so you can always
    -- re-save your own handle.
    and (
      (select name from asked) not in (
        -- kept back so nobody can pose as the app itself
        'admin','athena','athenasarena','support','help','root','system','owner',
        -- kept for the owner
        'justaino','justaino97','justaino81'
      )
      or exists (
        select 1
        from public.user_directory d
        where d.user_id = auth.uid()
          and d.username = (select name from asked)
      )
    );
$$;

revoke all on function public.is_username_available(text) from public;
revoke all on function public.is_username_available(text) from anon;
grant execute on function public.is_username_available(text) to authenticated;


-- ============================================================================
--  CLAIMING ONE FOR YOURSELF
-- ============================================================================
-- The reserved list only affects the app's check. A direct update here goes
-- straight to the table, so you can take a reserved handle whenever you like.
--
-- ⚠️ Edit the email to yours, pick the handle you want, then UNCOMMENT and run.
--    It'll fail harmlessly if someone else already holds that username.

-- update public.user_directory
-- set username = 'justaino',
--     updated_at = now()
-- where email = 'jujust97@gmail.com';


-- ============================================================================
--  CHECK IT
-- ============================================================================

-- Who holds what right now.
select display_name, username, email
from public.user_directory
order by username;

-- The function still exists and is SECURITY DEFINER (prosecdef = true).
select proname, prosecdef
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'is_username_available';
