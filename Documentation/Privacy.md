# Privacy — Athena's Arena (Justaino)

_Last updated: 2026-06-26_

This is a short, plain-English note about what the app stores and how to remove it.
It's a small personal project shared with friends, not a commercial service.

## What's stored

- **Your email address** — used only to sign in to your account.
- **Your workout data** — your profiles, exercises, and workout history.

That's it. No tracking, no ads, no analytics, nothing shared with anyone else.

## Where it's stored

- In your **browser** (localStorage) on each device you use, and
- In the **cloud** with [Supabase](https://supabase.com), a third-party hosting
  service, so your data syncs across your devices.

Your data is protected by **Row-Level Security**: each account can only ever read
or write its own rows — no one else (including other signed-in users) can see your
workouts.

## How to delete it

- **Delete your data yourself:** in the app, go to **Settings → Privacy & data →
  Delete my data**. This permanently removes all your profiles, exercises, and
  history from both the cloud and your device. It cannot be undone, so export a
  backup first (**Settings → Backup**) if you want to keep a copy.
- **Delete your login/account too:** the "Delete my data" button clears your data
  but doesn't remove the login itself (that needs admin access the app
  deliberately doesn't carry in the browser). If you also want your email/account
  removed, just email the owner and it'll be deleted from the dashboard.

## Good to know

- The app only ever uses Supabase's **publishable key** in the browser, which is
  safe to share — the security comes from Row-Level Security, not from hiding the
  key. The secret/admin key is never shipped.
- Because it's a free hobby project, the cloud database may **pause after about a
  week of inactivity** and take a few seconds to wake up on your next visit.
