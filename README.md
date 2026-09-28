# Athena's Arena 🦉

A friendly gym app that runs in the browser and installs to your phone's home screen.
Sign in, plan your week of exercises, log each workout set by set, watch your progress,
and keep each other going with gym buddies and nudges. Built with a soft, pastel "cute"
look as a learning project.

**Live site:** https://justaino.github.io/First_Gym_App_Project/

📖 **New here?** The guide lives **inside the app** — open it with **Settings → 📖 How to
use**, or the "New here? Take the tour" button on the empty Today and Schedule screens.
Its wording is all at the top of `guide.js`, so there's one copy to keep current.

🛠️ **Tinkering or testing?** See the [Runbook](RUNBOOK.md) for storage keys, cloud sync,
DevTools/console tricks, backup & cleanup behaviour, and the easter eggs.

## What it does
- **Accounts + sync** — sign in with email and password; your data follows you between
  devices
- **Schedule** — exercises per day of the week, with sets, reps per set, optional weight,
  an emoji icon, and drag-to-reorder. Name suggestions from a built-in exercise list
- **Workout mode** — tick off sets as you go (saved automatically), a rest timer, "last
  time" hints, and private notes per exercise
- **Progress** — weekly goal ring, streaks, a 12-week heatmap, personal records, volume
  trends, per-exercise charts, and a weekly recap
- **Friends** — add friends by email or `@username`, see who trained today, nudge each
  other, and share workout details with close friends (both sides agree)
- **Settings** — dark mode, kg/lb, weekly goal, backup export/import, privacy controls,
  install-as-app, the guide, and a What's new page

## Tech
- Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step, no npm
- [Supabase](https://supabase.com) for accounts and cloud data, with the browser's
  `localStorage` as an offline cache. The Supabase library is kept in `vendor/`
- A service worker (`sw.js`) makes it an installable, offline-capable PWA
- Hosted on GitHub Pages from the `main` branch

## Run it locally
1. Open this folder in VS Code.
2. Install the **Live Server** extension (Extensions panel → search "Live Server").
3. Right-click `index.html` → **Open with Live Server**.
4. It opens in your browser and auto-refreshes when you save a file.

> ⚠️ Your local copy talks to the **same Supabase database** as the live site, so
> anything you do while testing is real. Use a spare account for risky tests.

## Branches
- `main` — the live site. Only updated by a release (merging `dev` into `main`).
- `dev` — day-to-day work and testing.
- `claude/…` — branches made by Claude Code cloud sessions. They reach `dev` through a
  pull request that the owner reviews and merges.

## Project structure
```
First_Gym_App_Project/
├── index.html            # the page (every screen lives here)
├── styles.css            # styling and design tokens
├── app.js                # main behaviour: data, sync, workouts, progress, settings
├── auth.js               # the login / sign-up gate
├── supabase.js           # connection to the Supabase project
├── friends.js            # the Friends tab
├── exercise-library.js   # built-in exercise suggestions
├── guide.js              # the in-app guide
├── whats-new.js/.html    # release notes page for friends
├── sw.js                 # service worker (bump CACHE_VERSION on every app change)
├── manifest.webmanifest  # makes it installable
├── icons/                # app icons (the owl)
├── vendor/supabase.js    # the Supabase library, kept locally for offline use
├── Documentation/        # privacy note, Supabase setup guide, SQL scripts
├── README.md             # this file
├── RUNBOOK.md            # technical reference + change log
├── ROADMAP.md            # the phased build plan
├── ROADMAP-v2.md         # the round of friend-feedback fixes
└── CLAUDE.md             # rules Claude Code follows automatically
```

## Data & privacy
Your email and workout data are stored in Supabase so they sync across your devices,
and cached in your browser so the app opens offline. Each account can only read its own
data, except what you choose to share with friends. See
[`Documentation/Privacy.md`](Documentation/Privacy.md) for the details, and
**Settings → Privacy & data** in the app to delete your data.

## Status
Phases 0–16 are live, plus the friend-feedback fixes in `ROADMAP-v2.md`.
Next up is the **Owl Quest** redesign — see `ROADMAP.md` §11.
