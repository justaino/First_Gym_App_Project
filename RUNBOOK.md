# RUNBOOK — Athena's Arena

A practical reference for running, testing, and poking at the app. This is a
living document — it gets updated as the app grows. If something here ever
disagrees with the code, the code wins (and the runbook should be fixed).

---

## 1. What this app is

A personal, browser-based gym tracker. Plain HTML, CSS, and vanilla JavaScript —
no frameworks, no build step, no backend. All data is stored in the browser with
**localStorage**.

**Files:**

| File | What it holds |
|------|---------------|
| `index.html` | The page structure (all the screens live here, shown/hidden by JS). |
| `styles.css` | All styling, including the design-system colours and animations. |
| `app.js` | All behaviour: storage, rendering, workouts, easter eggs, etc. |

---

## 2. How to run it

**Live (hosted) version:** https://justaino.github.io/First_Gym_App_Project/
Hosted on **GitHub Pages** from the `main` branch of the public repo
`justaino/First_Gym_App_Project`. Every push to `main` auto-publishes within a
minute or two. (This replaced an earlier Netlify site.)

**Locally (for development):**

1. Open the project folder in VS Code.
2. Install the **Live Server** extension (one time).
3. Right-click `index.html` → **Open with Live Server**.
4. It opens at something like `http://127.0.0.1:5500/index.html`.

To stop: click "Port: 5500" in the VS Code status bar, or close the tab.

> Note: the hosted site and your local site are **different origins**, so each
> keeps its own separate localStorage data. Use the backup export/import to move
> data between them.

---

## 3. Where the data lives (localStorage keys)

All keys start with `gym:`.

| Key | What it stores |
|-----|----------------|
| `gym:profiles` | The list of profiles. |
| `gym:activeProfileId` | Which profile is currently selected. |
| `gym:exercises` | All exercises (each tagged with a `profileId`). |
| `gym:sessions` | Saved + in-progress workouts (the history). |
| `gym:theme` | `"light"` or `"dark"`. |
| `gym:celebratedMilestones` | Easter-egg bookkeeping: which workout-count milestones each profile has already celebrated, so the trophy only plays once. |

---

## 4. How to access localStorage (DevTools)

With the app open in your browser:

1. Open DevTools: right-click the page → **Inspect**, or press `F12`
   (`Cmd+Option+I` on Mac).
2. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
3. In the sidebar, expand **Local Storage** and click your site's entry
   (e.g. `http://127.0.0.1:5500`).
4. You'll see a key/value table. Click any `gym:` row to see its JSON value.

---

## 5. Handy console tricks

Switch to the **Console** tab in DevTools and paste any of these. After changing
storage, **refresh the page** so the app re-reads it.

```js
// Pretty-print all your saved workouts
JSON.parse(localStorage.getItem("gym:sessions"))

// See which milestones have been celebrated
localStorage.getItem("gym:celebratedMilestones")

// Reset just the milestone tracker (handy for testing the trophy)
localStorage.removeItem("gym:celebratedMilestones")

// ⚠️ Wipe EVERYTHING the app has saved (all profiles/workouts) — careful!
localStorage.clear()
```

---

## 5b. PWA: install & offline (service worker)

The app is a **Progressive Web App** — installable to a home screen and works
offline.

- **Manifest:** `manifest.webmanifest` (app name "Justaino", icons, standalone).
- **Icons:** in `icons/` — the owl (`Owl.png` is the source) composited onto a
  lavender background at 192/512/180. Regenerate by re-compositing `Owl.png`
  (ask Claude — the generator is a short pure-Python script run with `sips`).
- **Service worker:** `sw.js` caches the app shell for offline use.
- **Install button:** Settings → "Install app". Fires the real prompt on
  Android/desktop; on iPhone/iPad it shows Add-to-Home-Screen steps (iOS has no
  install API — manual Share → Add to Home Screen is the only way).

### ⚠️ Deploying updates (IMPORTANT)
Because the service worker caches files, returning visitors can get **stuck on an
old version** after you push changes. To avoid that:

1. After changing app files, open `sw.js` and **bump `CACHE_VERSION`**
   (e.g. `"v1"` → `"v2"`).
2. Commit & push as usual.
3. On the next visit the browser fetches the new `sw.js`, re-caches the fresh
   files, and deletes the old cache. It can take **one or two reloads** to fully
   switch over.

To force a refresh while testing: DevTools → **Application → Service Workers →
Unregister** (and **Clear storage**), then reload.

---

## 5c. Insights (Progress tab)

The **Insights** card at the top of Progress is computed live from
`gym:sessions` (no new data is stored except the weekly goal). It shows: a weekly
**goal ring**, **week streak**, **days this month**, **lifetime totals**, a
**personal-records board**, a **12-week heatmap** (tap a square for a bubble with
that day's info), a **volume this-month-vs-last** line, and **"since you started"**
per-exercise weight trends (up/down). All per-device, like the rest of the data.

- **Weekly goal:** stored per profile under `gym:weeklyGoal` (`{ profileId: n }`),
  default 3; edited in **Settings → Weekly goal**.

### What counts as "done" (important)
Only sets the user **ticks done** are recorded. A workout **can't be finished**
with zero done sets, and weights/reps/PRs/insights ignore unticked sets. (This
fixed an earlier bug where seeded-but-unticked sets triggered false PRs.)

### Editing a workout's date
The workout editor has a **Date** field. Changing it updates `session.date` **and**
re-labels `session.day` to match (e.g. a Friday date → "Friday workout"), so the
date and the history wording stay in sync.

---

## 5d. Cloud sync & accounts (Phase 7 — IN PROGRESS on `feature/auth`)

> ⚠️ This is **not on `main` yet**. All of it lives on the **`feature/auth`** branch.
> The live site is still the local-only PWA until Phase 7 is merged.

**Backend:** [Supabase](https://supabase.com) (free tier). Project URL + **publishable
key** live in `supabase.js` (both are safe to ship — protected by Row-Level Security).
The **secret key is never committed**.

- **New key system:** this project uses Supabase's new keys; the **legacy `anon` JWT is
  disabled**, so the app uses the **publishable key** (`sb_publishable_…`). The legacy
  JWT returned 401.
- **Tables:** `profiles`, `exercises`, `sessions` (mirror the local shapes + a `user_id`;
  `sessions.entries` is JSON). **Row-Level Security** restricts each user to their own rows.
- **Grants gotcha:** tables created via the **SQL Editor** needed explicit
  `GRANT select/insert/update/delete … TO authenticated;` (+ `select` to `anon`). Tables
  made via the **Table Editor** get these automatically. Symptom if missing: `42501
  permission denied for table …`.

**Code map:**
- `supabase.js` — creates `supabaseClient` from the URL + publishable key.
- `auth.js` — the login/sign-up gate; calls `onUserLoggedIn(session)` (in app.js) once per
  sign-in; logout lives in Settings.
- `app.js` section **“5b. CLOUD SYNC”** — `*FromCloud` / `*ToRow` mappers,
  `reconcileEntity` (profiles/exercises) + `reconcileSessions` (merge), `syncOnLogin`, and
  write-through inside `createProfile`/`deleteProfile`/`handleExerciseFormSubmit`/
  `deleteExercise`/`finishWorkout`/`closeWorkoutOverlay`/`discardWorkout`/`deleteSession`.

**Sync model:** the **cloud is the source of truth**; `localStorage` is a **write-through
cache**. On login, `syncOnLogin` reconciles per entity — **cloud-wins** for profiles/
exercises, **newest-wins merge** for sessions (so an un-pushed in-progress workout isn't
wiped). `gym:syncedUserId` records which user the cache belongs to, so one person's local
data is never uploaded into another's account.

**Quick test:** log in → create a profile/exercise/workout → check **Supabase → Table
Editor**. Cross-device: log in with the same account in another browser → data appears.

**Still TODO:** 7g (offline — the Supabase lib is CDN-loaded so must be vendored locally to
work offline) and 7h (privacy note + release). See ROADMAP.md §8.

---

## 6. Backup & restore (import / export)

Found in **Settings → Backup**.

- **Export** downloads a `.json` file containing your data (it cleans out
  deleted/orphaned items as it goes).
- **Import** reads a backup file and merges it back in: profiles in the file
  **replace** matching ones (by id) and new ones are **added**; profiles not in
  the file are left untouched.

**Key point:** deleting things (an exercise, a workout) removes them permanently
from storage. They can only come back by **importing a backup you exported
before the deletion**. So export a backup before any big cleanup.

---

## 7. Deletion & cleanup behaviour

The app cleans up related data so nothing is left orphaned:

- **Delete an exercise** → also removes that exercise from every saved workout,
  deletes any workout left empty, and reconciles the milestone tracker.
- **Delete a workout** → reconciles the milestone tracker (so re-earning a
  milestone re-triggers its trophy).
- **Delete a profile** → also removes that profile's exercises and workouts.

---

## 8. Easter eggs (the fun stuff) 🎉

All live in the `7e. EASTER EGGS` section of `app.js`. None of them affect your
saved workout data.

| # | Trigger | What happens |
|---|---------|--------------|
| 1 | **PC:** type `athena` (not in a text box). **Mobile/mouse:** long-press the Today-header mascot (sun/moon) for ~1.5s. | An owl 🦉 glides across + a "Wisdom +1" toast. |
| 3 | Finish a workout where you beat a past weight for an exercise | Confetti + a "New personal record!" card. |
| 4 | Reach a workout-count milestone (7, 30, 50, 100) | One-time confetti + 🏆 trophy card per milestone. |
| 7 | Tap the app title 5× within 2 seconds | A hidden credits card slides up. |

### Testing the milestone trophy (#4)
The trophy fires when a profile's **completed**-workout count first reaches a
milestone. To preview it without doing 7 real workouts:

1. In the console, run `localStorage.removeItem("gym:celebratedMilestones")`.
2. Temporarily add `1` to the `WORKOUT_MILESTONES` list near the top of `app.js`.
3. Finish one workout → trophy appears.
4. Put `WORKOUT_MILESTONES` back to `[7, 30, 50, 100]`.

### How personal records (#3) are decided
PRs are matched by an exercise's internal **id**, not its name. Beating a past
weight for the same exercise triggers it. A brand-new exercise has no history, so
its first weighted workout won't fire a PR (there's nothing to beat yet).

---

## 9. Change log

Newest first. Add a line here whenever behaviour changes.

- **2026-06-26** — **Phase 7 (accounts + cloud sync) in progress on `feature/auth`:**
  Supabase login + full data sync (profiles/exercises/sessions) with first-login
  migration (7a–7f done). NOT on `main` yet. Remaining: 7g (offline) + 7h (privacy +
  release). See §5d and ROADMAP.md §8. Cache at `v18`.
- **2026-06-25** — **Insights phase (6):** added the Insights card (goal ring,
  streak, days, lifetime totals, PR board, 12-week heatmap with tap bubbles,
  month-vs-last volume, "since you started" trends) and an editable workout date.
  **Bug fix:** only ticked sets are recorded — finishing now requires ≥1 done set,
  and unticked sets no longer count toward weights/PRs/insights. Cache at `v11`.
- **2026-06-25** — **PWA complete:** added `sw.js` (offline app-shell cache) and an
  in-app "Install app" button (real prompt on Android/desktop; how-to on iOS).
  Renamed the installed app to "Justaino" and switched to the uploaded owl icon.
  **Remember to bump `CACHE_VERSION` in `sw.js` when deploying app changes.**
- **2026-06-25** — Went live on **GitHub Pages**
  (`https://justaino.github.io/First_Gym_App_Project/`); repo made public and
  renamed to `First_Gym_App_Project`. (Phase 5 hosting step done.)
- **2026-06-24** — Easter egg #1 now also works on touchscreens: long-press the
  Today-header mascot (~1.5s) to summon the owl. The "type athena" shortcut still
  works on desktop.
- **2026-06-24** — Added easter eggs (Athena's owl, PR confetti, milestone
  trophy, hidden credits card). Made exercise deletion clean up related workout
  history and reconcile milestones. Created this runbook.
