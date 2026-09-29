# Privacy — Athena's Arena (Justaino)

_Last updated: 2026-09-28_

This is a short, plain-English note about what the app stores, who can see it, and how
to remove it. It's a small personal project shared with friends, not a commercial
service.

## What's stored

- **Your email address** — used only to sign in, and so a friend who already knows it
  can send you a friend request. It is never shown to anyone.
- **Your workout data** — your profiles, exercises, workout history, and any notes you
  add to an exercise during a workout.
- **Your friends details** — your display name ("Your name to friends"), your
  `@username`, your friend list and requests, close-friend settings, and nudges.

That's it. No tracking, no ads, no analytics, and nothing is sold or shared outside the
app.

## Where it's stored

- In the **cloud** with [Supabase](https://supabase.com), a third-party hosting
  service, so your data syncs across your devices, and
- In your **browser** (localStorage) on each device you use, so the app opens offline.

Your data is protected by **Row-Level Security** in the database, not just by what the
screen shows. By default nobody but you can read your workouts.

## What friends can see

- **Anyone signed in** can find you only by typing your **exact** email address or
  `@username`. They then see your display name and nothing else until you accept their
  request.
- **Friends** (people whose request you accepted) see your display name and username,
  whether you trained today, and how many workouts you've done this week. They can send
  you a nudge. They can't see your exercises, sets or weights.
- **Close friends** (you both agreed, or you chose "Share mine only") can also open your
  recent workouts: exercise names, sets, reps and weights. You can turn this off any
  time with **Settings → Share my workouts with friends**.
- **Your exercise notes are always private.** Even close friends never see them.

## How to delete it

- **Delete your data yourself:** in the app, go to **Settings → Privacy & data →
  Delete my data**. This permanently removes your profiles, exercises, history, friends
  details, friendships and nudges from both the cloud and your device. It cannot be
  undone, so export a backup first (**Settings → Backup**) if you want to keep a copy.
- **Remove a friend:** use the remove option on their card in the Friends tab. It ends
  the friendship for both of you.
- **Delete your login/account too:** the "Delete my data" button clears your data but
  doesn't remove the login itself (that needs admin access the app deliberately doesn't
  carry in the browser). If you also want your email/account removed, just email the
  owner and it'll be deleted from the dashboard.

## Good to know

- The app only ever uses Supabase's **publishable key** in the browser, which is safe
  to share — the security comes from Row-Level Security, not from hiding the key. The
  secret/admin key is never shipped.
- Because it's a free hobby project, the cloud database may **pause after about a week
  of inactivity** and take a few seconds to wake up on your next visit.
