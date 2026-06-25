# CLAUDE.md — Project guardrails for Athena's Arena

Read this at the start of every session and follow it for all work in this project.

## What this project is
Athena's Arena is a personal, browser-based gym app. The owner is a **beginner at front-end web
development** (their strength is the Microsoft Power Platform, not JavaScript
frameworks). Build accordingly: explain things simply and comment the code.

## Hard constraints (do not break these)
- Use **plain HTML, CSS, and vanilla JavaScript only**. No frameworks (no React, Vue,
  Svelte, etc.), no TypeScript, no build step, no bundlers, no npm packages.
- Store all data in the browser with **localStorage**. No backend, no database.
- The app must run by opening `index.html` with the Live Server VS Code extension.
- Keep the file structure simple: `index.html`, `styles.css`, `app.js` (split JS into a
  few clearly-named files only if it genuinely helps readability).

## How to work
- Build **one phase at a time** (see ROADMAP.md). Do not jump ahead. After finishing a
  phase, stop and wait for confirmation before starting the next.
- Prefer **small, reviewable changes**. One feature or fix per step.
- **Comment the code** so a beginner can follow what each part does.
- Before making a large or structural change, briefly explain the plan and ask first.
- After a working change, suggest a short git commit message.
- **Always ask before committing or pushing — don't do it automatically.** The owner
  decides when to commit/push. (Pushing matters because the live GitHub Pages site only
  updates on a push, so confirm before publishing.)
- **Do not add a `Co-Authored-By` trailer (or similar attribution) to commit messages.**

## Important behaviour rule
- **Never claim to have run, opened, tested, or inspected the app in the owner's browser
  or on their machine.** You cannot see their local environment. Instead, give clear,
  copy-pasteable steps for them to run and test it themselves, and describe what they
  should expect to see.
- **When the owner's request isn't possible, or your idea differs from theirs, say so —
  give your opinion/suggestion and ask them to confirm before you proceed.** Don't
  quietly substitute your own solution for what they asked.
- **When the owner asks a question to be answered before you act, answer it and STOP.**
  Do not make edits, run commands, or build anything in the same turn — wait for their
  go-ahead. Answering while simultaneously actioning is not acceptable.

## Branches & releasing
- **`main`** is the published branch — GitHub Pages serves it as the live site that the
  owner's friends test (`https://justaino.github.io/First_Gym_App_Project/`). Keep it in
  a working state.
- **`dev`** is the working branch — do day-to-day work here. Pushing to `dev` does **not**
  affect the live site (Pages only redeploys when `main` changes).
- **Releasing = merging `dev` → `main` and pushing.** Only do this when asked. When you do,
  remember to bump `CACHE_VERSION` (see below). The owner tests `dev` locally with Live
  Server; there is no separate preview URL for `dev`.

## PWA / deployment rule (don't forget this)
- The app is a PWA with a service worker (`sw.js`) that caches the app shell. **Whenever
  you change any app file (`index.html`, `styles.css`, `app.js`, icons, etc.), you MUST
  bump `CACHE_VERSION` in `sw.js`** (e.g. `"v1"` → `"v2"`) in the same change. If you
  don't, returning visitors stay stuck on the old cached version. See RUNBOOK.md for the
  full update flow.

## Coding conventions
- Plain, readable functions with descriptive names. Avoid clever one-liners.
- No external JS libraries unless explicitly approved. (A Google Font via `<link>` is
  fine.)
- Validate user input lightly (e.g. don't allow empty exercise names; sets/reps are
  positive numbers).
- Handle the "no data yet" case gracefully (friendly empty states).

## Design system (keep styling consistent)
- Background cream `#FAF6EE`; white cards `#FFFFFF` with `24px` radius and soft shadow.
- Text charcoal `#2E2E33`; muted `#9A9A9A`.
- Accents: coral `#EF7C7C`, mint `#5FC4BC`, butter `#F6D365`, lavender `#B9A7E0`.
- Font: Nunito or Quicksand (Google Fonts). Pill-shaped buttons. Floating, rounded
  bottom tab bar with icon + label; active tab tinted. Emoji as exercise icons.
- A visual style reference is saved at design-reference.png — open it when working on UI.

## Data model
```
Profile  = { id, name, createdAt }
Exercise = { id, profileId, name, sets, reps, icon, day, notes }
Session  = { id, profileId, date, entries: [{ exerciseId, setsDone, weight }] }
```
Suggested localStorage keys: `gym:profiles`, `gym:activeProfileId`, `gym:exercises`,
`gym:sessions`.
