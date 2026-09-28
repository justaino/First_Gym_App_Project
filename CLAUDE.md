# CLAUDE.md — Project guardrails for Athena's Arena

Read this at the start of every session and follow it for all work in this project.

## What this project is
Athena's Arena is a browser-based gym app (an installable PWA) that the owner shares with
a small group of friends. People sign in, plan their week of exercises, log workouts,
track progress, and add each other as gym buddies. The owner is a **beginner at
front-end web development** (their strength is the Microsoft Power Platform, not
JavaScript frameworks). Build accordingly: explain things simply and comment the code.

**Real people use the live site**, so anything that reaches `main` must already be tested.

## Hard constraints (do not break these)
- Use **plain HTML, CSS, and vanilla JavaScript only**. No frameworks (no React, Vue,
  Svelte, etc.), no TypeScript, no build step, no bundlers, no npm packages.
- **Data lives in Supabase** (accounts + cloud sync, since Phase 7), with
  **localStorage as a write-through cache** so the app still opens offline. The cloud is
  the source of truth. See RUNBOOK §5d for the sync rules before touching any data code.
- The only external JS library is the **Supabase client**, kept locally in
  `vendor/supabase.js` (not loaded from a CDN, so offline works). Don't add others
  without the owner's approval.
- Only the Supabase **publishable key** may appear in the code. The secret /
  `service_role` key must **never** be committed — the repo is public.
- Database changes (new tables, columns, policies) are written as a commented SQL script
  in `Documentation/`, handed to the owner to run in the Supabase SQL editor, and
  **confirmed as run before** any app code relies on them. SQL-created tables need
  explicit `GRANT`s (RUNBOOK §5d).
- The app must run by opening `index.html` with the Live Server VS Code extension.

## Files
| File | What it holds |
|------|---------------|
| `index.html` | Page structure — every screen lives here, shown/hidden by JS |
| `styles.css` | All shared styling and the design tokens |
| `app.js` | Main behaviour: storage, sync, rendering, workouts, progress, settings |
| `auth.js` / `supabase.js` | Login gate / Supabase connection |
| `friends.js` | Friends tab: requests, buddies, nudges, close friends, usernames |
| `exercise-library.js` | Data only: built-in exercise suggestions |
| `guide.js` | In-app guide (wording in lists at the top) |
| `whats-new.js` / `whats-new.html` | Release notes for friends, and the page that shows them |
| `sw.js` | Service worker — caches the app shell |
| `vendor/supabase.js` | The vendored Supabase library (don't edit) |

Splitting `app.js` into a few more clearly-named files is fine if it genuinely helps
readability — add any new file to `index.html` and to `APP_SHELL` in `sw.js`.

## How to work
- Build **one phase at a time** (see ROADMAP.md). Do not jump ahead. After finishing a
  phase, stop and wait for confirmation before starting the next.
- Prefer **small, reviewable changes**. One feature or fix per step.
- **Comment the code** so a beginner can follow what each part does.
- Before making a large or structural change, briefly explain the plan and ask first.
- After a working change, suggest a short git commit message.
- **Always ask before committing or pushing — don't do it automatically.** The owner
  decides when to commit/push.
- **Do not add a `Co-Authored-By` trailer (or similar attribution) to commit messages.**

## Important behaviour rule
- **Never claim to have run, opened, tested, or inspected the app in the owner's browser
  or on their machine.** You cannot see their local environment. Instead, give clear,
  copy-pasteable steps for them to run and test it themselves, and describe what they
  should expect to see. (If you test in your own sandbox browser, say exactly that, and
  say what you could not check — e.g. real login.)
- **When the owner's request isn't possible, or your idea differs from theirs, say so —
  give your opinion/suggestion and ask them to confirm before you proceed.** Don't
  quietly substitute your own solution for what they asked.
- **When the owner asks a question to be answered before you act, answer it and STOP.**
  Do not make edits, run commands, or build anything in the same turn — wait for their
  go-ahead. Answering while simultaneously actioning is not acceptable.

## Branches & releasing
- **`main`** is the published branch — GitHub Pages serves it as the live site that the
  owner's friends use (`https://justaino.github.io/First_Gym_App_Project/`). Keep it
  working. Nothing reaches `main` without the owner testing it on `dev` first.
- **`dev`** is the working branch. Pushing to `dev` does **not** affect the live site.
- **Claude Code cloud sessions** work on their own `claude/…` branch, cut from `dev`.
  When a step is ready (and the owner has said to commit/push), push that branch and open
  a **pull request into `dev`** — never into `main`. The owner reviews the pull request on
  GitHub, merges it, pulls `dev`, and tests locally with Live Server.
- **Releasing = merging `dev` → `main` and pushing.** Only do this when asked. When you do,
  remember to bump `CACHE_VERSION` (see below).
- ⚠️ Testing locally uses the **same Supabase database as the live site** — there is no
  separate test database. Changes made while testing are real. Test with a spare account
  when trying anything destructive.

## PWA / deployment rule (don't forget this)
- The app is a PWA with a service worker (`sw.js`) that caches the app shell. **Whenever
  you change any app file (`index.html`, `styles.css`, any `.js` file, icons, etc.), you
  MUST bump `CACHE_VERSION` in `sw.js`** (e.g. `"v48"` → `"v49"`) in the same change. If
  you don't, returning visitors stay stuck on the old cached version. See RUNBOOK §5b.

## Release notes & guide (keep these current — don't skip)
Two files are written **for the owner's friends**, not for the repo. Treat them as part
of the work, not paperwork afterwards:

- **What's new page** — `whats-new.js`. Whenever a change is visible to a user, add an
  entry at the **top** of the `RELEASES` list:
  `{ date: "YYYY-MM-DD", title, intro (optional), items: [] }`. One entry per release,
  newest first. The newest is drawn in full; older ones fold up automatically, so there's
  nothing else to edit. The `date` also drives the "unread" dot in Settings, so use the
  real release date.
- **In-app guide** — `guide.js`. If a phase adds something a person can see or tap, add a
  line to the right section's `items` array (or the "Easy to miss" list).

Rules for both:
- Write them the way you'd explain it to a friend: *"Close friends works both ways now"*,
  never *"changed close_friends to mutual"*. If a change is invisible to a user, leave it
  out entirely.
- All the wording lives in plain arrays at the top of those two files. Never hand-edit the
  markup or the drawing code to add content.
- These **replace** the old What's New markdown/PDF notes and `USER-GUIDE.md` (all now
  deleted). Don't create new markdown or PDF versions of either.
- `RUNBOOK.md`'s change log is the *technical* record and is still required — it's for the
  owner, the What's new page is for everyone else. Both get updated.
- If a change affects what's stored or who can see it, update `Documentation/Privacy.md`
  **and** regenerate `Documentation/Privacy.pdf` (the app links to the PDF).

## Coding conventions
- Plain, readable functions with descriptive names. Avoid clever one-liners.
- No external JS libraries unless explicitly approved. (A Google Font via `<link>` is
  fine.)
- Validate user input lightly (e.g. don't allow empty exercise names; sets/reps are
  positive numbers).
- Handle the "no data yet" case gracefully (friendly empty states).
- Handle the offline case gracefully: reads fall back to the cache; plan edits show the
  friendly offline notice (RUNBOOK §5d).

## Design system (keep styling consistent)
- Background cream `#FAF6EE`; white cards `#FFFFFF` with `24px` radius and soft shadow.
- Text charcoal `#2E2E33`; muted `#9A9A9A`.
- Accents: coral `#EF7C7C`, mint `#5FC4BC`, butter `#F6D365`, lavender `#B9A7E0`.
- Font: Nunito (Google Fonts). Pill-shaped buttons. Floating, rounded bottom tab bar with
  icon + label; active tab tinted. Emoji as exercise icons. Dark mode is supported, so
  new colours need a dark-mode value too.
- A visual style reference is saved at `Design-Reference.png` — open it when working on UI.
- ⏭️ The **Owl Quest** redesign (ROADMAP.md §11) will update this section in its first
  phase. Until that phase is approved, keep to the rules above.

## Data model
Shapes used in the app (localStorage cache). The Supabase tables mirror them in
snake_case plus a `user_id`.
```
Profile  = { id, name, createdAt }
Exercise = { id, profileId, name, icon, day, notes,
             sets, reps, repsPerSet: [n…], weight, weightPerSet: [n…], sortOrder }
Session  = { id, profileId, date, day, status, updatedAt,
             entries: [{ exerciseId, sets: [{ reps, weight, done }], note }] }
```
Older sessions may still use the original `{ exerciseId, setsDone, weight }` entry shape —
always read them through the helpers (`normalizeExercise`, `entrySetsDone`).

Main localStorage keys: `gym:profiles`, `gym:activeProfileId`, `gym:exercises`,
`gym:sessions`, plus per-device settings (`gym:theme`, `gym:unit`, `gym:weeklyGoal`, …).
The full list is in RUNBOOK §3. Friends data (`user_directory`, `friendships`,
`close_friends`, `close_requests`, `nudges`) lives only in Supabase — see RUNBOOK §5j.
