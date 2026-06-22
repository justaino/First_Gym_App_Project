# Athena's Arena 💪

A friendly, personal gym planner that runs entirely in the browser. Create a profile,
add exercises (sets, reps, an emoji icon, and a day of the week), and see your plan
grouped by day. Built as a learning project with a soft, pastel "cute" look.

## What it does (Phase 1)
- Create a local profile and pick the active one
- Add, edit, and delete exercises — each with a name, sets, reps, emoji icon, and day
- View exercises grouped by day of the week
- Everything is saved in the browser, so it's still there after a refresh

Later phases add a workout mode with a rest timer, and simple progress tracking.
See `ROADMAP.md`.

## Tech
- Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step, no packages
- Data stored in the browser with `localStorage`

## Run it locally
1. Open this folder in VS Code.
2. Install the **Live Server** extension (Extensions panel → search "Live Server").
3. Right-click `index.html` → **Open with Live Server**.
4. It opens in your browser and auto-refreshes when you save a file.

## Project structure
```
athenas-arena/
├── index.html      # the page
├── styles.css      # the cute pastel styling
├── app.js          # the app logic (profiles, exercises, storage)
├── README.md       # this file
├── ROADMAP.md      # the phased build plan
└── CLAUDE.md       # rules Claude Code follows automatically
```

## Data & privacy
All data lives in your own browser via `localStorage` — nothing is sent anywhere and
there are no accounts on a server. Clearing your browser data (or using a different
browser/device) means starting fresh. Use the export/backup feature (Phase 3) to keep
a copy.

## Status
Phases 0–4 complete ✅ — profiles & exercises, workout mode with a rest timer, progress
tracking (with interactive charts and backups), and polish (dark mode, mascot, and
accessibility). Built phase by phase with Claude Code — see `ROADMAP.md` for the details.
