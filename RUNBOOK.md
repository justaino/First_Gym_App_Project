# RUNBOOK — Athena's Arena

A practical reference for running, testing, and poking at the app. This is a
living document — it gets updated as the app grows. If something here ever
disagrees with the code, the code wins (and the runbook should be fixed).

---

## 1. What this app is

A personal, browser-based gym tracker. Plain HTML, CSS, and vanilla JavaScript —
no frameworks, no build step. Data is kept in the browser with **localStorage**
and, since Phase 7, synced to a **Supabase** account so it follows you between
devices (see §5d — the cloud is the source of truth, localStorage is the cache).

**Files:**

| File | What it holds |
|------|---------------|
| `index.html` | The page structure (all the screens live here, shown/hidden by JS). |
| `styles.css` | All styling, including the design-system colours and animations. |
| `app.js` | All behaviour: storage, rendering, workouts, easter eggs, etc. |
| `exercise-library.js` | Data only: the built-in list of ~90 common exercises used for the name suggestions (Phase 8). |
| `supabase.js` / `auth.js` | The cloud connection and the login gate (Phase 7). |
| `friends.js` | The Friends tab: requests, buddies, nudges, close friends (Phase 12). |
| `guide.js` | The in-app guide. All its wording is in two lists at the top (Phase 13). |
| `sw.js` | Service worker — caches the app shell. Bump `CACHE_VERSION` on every app change. |

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
| `gym:unit` | `"kg"` or `"lb"` — the weight label shown throughout the app (display only; per device, not synced). |

> Exercise **order within a day** (Phase 10) is NOT a separate key — it lives on
> each exercise as `sortOrder` (in `gym:exercises`) and as `sort_order` in the
> Supabase `exercises` table. See §5h.
| `gym:celebratedMilestones` | Easter-egg bookkeeping: which workout-count milestones each profile has already celebrated, so the trophy only plays once. |
| `gym:recapSeen:<profileId>:<monday>` | Phase 11: you've dismissed the "week in review" card on Today for that profile that week. One key per profile per week; old ones are tidied away automatically (per device, not synced). |

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

- **Manifest:** `manifest.webmanifest` (app name "Athena's Arena", short name
  "Athena" so it fits under a home-screen icon, icons, standalone).
- **Icons:** in `icons/` — the owl (`Owl.png`, transparent, is the source)
  composited onto a lavender (`#B9A7E0`) background at 192/512/180. The icons are
  **maskable**, so the owl is scaled to ~74% (a 380px box on the 512 canvas) to
  keep a **safe zone** of padding — otherwise Android crops the ears/wings/feet.
  Regenerate by re-compositing `Owl.png` (a short Python/Pillow script that trims
  the owl to its bounding box, scales it into the safe zone, and centres it on the
  lavender canvas). Don't make the owl bigger or it'll get clipped when installed.
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

## 5d. Cloud sync & accounts (Phase 7 — SHIPPED 2026-06-26)

> ✅ Phase 7 (accounts + cloud sync) is **live on `main`** — the hosted site now requires
> logging in and syncs data across devices. Future work happens on `dev` as usual.

**Backend:** [Supabase](https://supabase.com) (free tier). Project URL + **publishable
key** live in `supabase.js` (both are safe to ship — protected by Row-Level Security).
The **secret key is never committed**.

> 📘 **Setting this up from scratch?** `Documentation/SUPABASE-SETUP.md` explains how the
> connection works and gives a step-by-step recipe (create project → vendor the library →
> create client → tables → grants → RLS → auth → test), plus a troubleshooting table.

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

**Offline (7g):** the Supabase library is now **vendored** at `vendor/supabase.js` (loaded
by `index.html` and cached in `sw.js`'s `APP_SHELL`) instead of from a CDN, so the app shell
works offline again. Plan edits (profiles/exercises) are **cloud-wins**, so editing them
offline would be wiped on next sync — instead they show a friendly "you're offline" notice
and block (helpers `isOffline()` / `blockedByOffline()` / `reportCloudWriteError()` in
app.js). Because `navigator.onLine` isn't reliable (Chrome's DevTools "Offline" throttling
doesn't flip it), a failed write is also caught after the fact via `isNetworkError()` and
shown as the same friendly notice. Workouts stay usable offline (sessions **merge**, so they
sync on reconnect). `reconcileSessions` also drops **orphaned** sessions (whose profile no
longer exists) so they don't repeatedly fail the `sessions_profile_id_fkey` constraint.
To update the vendored library: re-download `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
into `vendor/supabase.js`, **delete the trailing `//# sourceMappingURL=…` line** (jsDelivr
appends it; left in, it makes the browser 404-request a source map that isn't in the repo —
harmless console noise), and bump `CACHE_VERSION`.

**Privacy & deletion (7h):** Settings → "Privacy & data" explains what's stored / where, links
the privacy note (`Documentation/Privacy.pdf`), and offers **"Delete my data"** (`deleteAllMyData()`
— wipes the user's cloud rows + local cache, then logs out; does not delete the auth login
itself). See ROADMAP.md §8 for the full Phase 7 record.

**⚠️ If the app shows a connection error after a quiet period:** free Supabase projects pause
after a stretch of **no activity** (the long-standing rule is ~1 week — it's based on database
activity, *not* on whether you log into the dashboard, so real app usage keeps it awake). If
it has paused, the next visitor sees errors until it's resumed: open the **Supabase dashboard
→ your project → Resume/Restore**. There may be a short cold-start delay on the first request
after it wakes. (Exact thresholds are Supabase's policy and can change — check Project Settings.)

---

## 5e. Exercise-name suggestions (Phase 8)

Typing in the **Exercise name** box (add/edit form) shows up to **5** matching
exercises from a built-in list, as a dropdown under the field.

- **The list:** `exercise-library.js` — a plain `EXERCISE_LIBRARY` array of ~90
  entries, each `{ name, icon, muscleGroup, defaultSets, defaultReps }`, covering
  chest, back, shoulders, arms, legs, core, cardio and mobility. It's **data only**,
  loaded before `app.js` in `index.html` and cached in `sw.js`'s `APP_SHELL`.
- **The behaviour:** app.js section **"7b. EXERCISE SUGGESTIONS"**
  (`findExerciseSuggestions` / `updateSuggestions` / `applySuggestion` /
  `setupExerciseSuggestions`).
- **Matching** is case-insensitive "contains", ranked: name starts with what you
  typed → a word in the name starts with it → appears anywhere.
- **Picking one** fills the name and icon, and applies the suggested sets/reps
  **only if you haven't typed your own**. Editing an existing exercise counts as
  "your own", so its sets/reps are never overwritten (`setsRepsTouchedByUser`).
- **Keyboard:** ↑/↓ move, Enter picks, Escape closes just the dropdown (not the
  modal), Tab or an outside tap closes it.
- Typing a name that isn't in the list saves exactly as before — this is only a
  shortcut.

### Adding your own exercises to the list
Open `exercise-library.js`, copy a line, and change the words. **The `icon` must
already be in `EMOJI_PRESETS`** near the top of `app.js` (that's the emoji picker's
list) — otherwise the picker won't highlight it. Phase 8 extended `EMOJI_PRESETS`
from 7 to 14 icons (added 🦵 🧗 🤾 🔥 🥊 ⏱️ 🚣) to cover the library. Bump
`CACHE_VERSION` after editing either file.

> Note: for holds (plank) `reps` means **seconds**, and for cardio it's usually
> **minutes**. The app doesn't know the difference — it's just a number you adjust.

---

## 5f. "Last time" hints in workout mode (Phase 9)

In workout mode, each exercise shows a small grey line under its name reminding
you what you did last time, e.g.

```
Last time (Mon, Jul 14): 40 kg × 10, 10, 8
```

- **Where:** app.js, just above `findInProgressSession` —
  `findLastTimeForExercise` / `describeDoneSets` / `buildLastTimeHint`, rendered
  by `renderWorkoutItems`.
- **Nothing is stored.** It's computed live from `gym:sessions` every time the
  workout sheet redraws, and it never pre-fills or changes your current numbers.
- **What counts:** the most recent **completed** workout for the **active
  profile**, on **any day**, that recorded this exercise with **at least one
  ticked set**. The workout you're doing right now is always excluded, so the
  hint doesn't change as you tick sets.
- **No history → no line at all** (not an empty box). A brand-new exercise, or
  one whose only past workouts had nothing ticked, shows nothing.
- **Formats:**

  | History | Shown as |
  |---|---|
  | Same weight every set | `40 kg × 10, 10, 8` |
  | No weights recorded | `12, 10 reps` |
  | Weight varied per set | `40 kg × 10, 35 kg × 8` |
  | Very old `{ setsDone }` sessions | `20 kg × 3 sets` |

The unit shown comes from the **Settings → Weight unit** setting (see §5g).

---

## 5g. Weight unit — kg or lb (Phase 9b)

**Settings → Weight unit** switches the label shown next to every weight in the
app between **kg** and **lb**.

> **It only changes the LABEL.** Nothing in storage is converted or rewritten —
> a set saved as `40` stays `40` and simply reads `40 lb` instead of `40 kg`.
> This was a deliberate choice: auto-converting would rewrite your real history,
> put rounding drift into the PR board and volume totals, and get messy when two
> synced devices disagree. The number is whatever you typed at the gym.

- **Stored as:** `gym:unit` in localStorage (`"kg"` or `"lb"`, default `kg`).
  Like `gym:theme`, this is **per device and NOT synced to your account** — set
  it once on your laptop and once on your phone.
- **Where:** app.js — `loadUnit` / `saveUnit` / **`formatWeight(value)`** /
  `unitLabel()` (just below the storage helpers), plus `renderUnitControls` and
  `handleUnitChange` (near the weekly-goal helpers). `renderAll` calls
  `renderUnitControls`, so the dropdown and form labels stay in sync.
- **To add a unit to a new bit of UI:** use `formatWeight(n)` → `"40 kg"` (it
  returns `""` for a missing weight, so you can safely leave it out), or
  `unitLabel()` → `"kg"` for headings like `Weight (kg)`.

### Everywhere the unit appears
Schedule card summaries · add/edit form labels · workout-sheet "Weight (kg)"
column · Phase 9 "last time" hints · workout history detail · per-exercise chart
tooltips · Progress chart legend · Insights "kg moved" tile · PR board · "since
you started" trends · monthly volume · the PR celebration card.

---

## 5h. Drag-to-reorder exercises (Phase 10)

On the **Schedule** tab each exercise card has a grip handle (⠿) on the left.
Drag it up/down to reorder that exercise **within its day**. The order then
shows the same everywhere (Schedule, Today, and workout mode) and syncs to your
other devices.

- **Stored as:** a `sort_order` column on the Supabase `exercises` table (added
  by the Phase 10 SQL migration) and a `sortOrder` field on the local exercise
  shape. Lower numbers come first.
- **Where in the code (app.js):**
  - `sortExercisesByOrder(list)` — the ordering rule; used by `renderSchedule`,
    `renderToday` and `startWorkout` so all three agree.
  - `nextSortOrderForDay(profileId, day)` — the number a new exercise gets so it
    lands at the end of its day. Also used when an edit moves an exercise to a
    different day.
  - Section **"DRAG-TO-REORDER EXERCISES"** — `enableDragReorder` /
    `startCardDrag` (Pointer Events) and `saveDayOrder` (cloud-first write with
    the Phase-7g offline guard).
- **Ordering rule (handles old data):** exercises saved before Phase 10 have no
  number ("legacy"). Legacy ones keep their current order and sit **first**;
  numbered ones follow, in number order. So a brand-new exercise (which gets a
  number) lands at the **end** of its day, and the **first drag on a day
  renumbers every exercise in it** (0,1,2,…), after which order is purely by
  number.
- **Touch:** dragging uses Pointer Events with `touch-action: none` on the
  handle, so the page doesn't scroll while you drag. You can only reorder within
  a day (the cards live in a per-day list container).
  - ⚠️ **Gotcha (fixed):** the pointer is captured on the **list container**, not
    on the handle. The handle sits inside the card, and dragging moves that card
    in the DOM — capturing on the handle makes the browser drop the capture the
    instant the card moves, freezing the drag ("lifts but won't move"). The list
    container never moves, so capture there holds for the whole drag.
- **Offline:** reordering is a plan edit, so if you're offline it shows the
  friendly "you're offline" notice and the order snaps back — reconnect to
  change it.

> **Note:** there's no keyboard reorder (drag only), and reordering does not
> touch any saved workout history — only the plan's display order.

---

## 5i. Weekly recap (Phase 11)

A friendly summary of **last week** (Monday → Sunday), in two places:

1. **Progress tab → "Last week" card**, just under "This week". Always there
   (once you have any workout history).
2. **Today tab → "Your week in review 🎉"**, shown **once per week** on your
   first visit of a new week, with a ✕ to dismiss it.

**What it shows:** workouts vs your weekly goal, total sets, volume moved
(reps × weight, in your kg/lb setting), your current week streak, and any
**personal records set last week**. Plus one encouraging line about the goal.

- **Nothing is stored** except the "you've seen it" flag —
  `gym:recapSeen:<profileId>:<monday>` (see §3). It's per profile, per device,
  and **not synced**; keys from older weeks are deleted automatically when a new
  one is written, and "Delete my data" clears them all.
- **Empty weeks:** the Progress card says *"No workouts last week — this week is
  a fresh start 💪"*. The Today card **doesn't appear at all** after a blank
  week (deliberate — no telling-off).
- **The numbers agree with Progress** because they're computed from the same
  list (this profile's completed sessions) using the same helpers:
  `entrySetsDone`, `sessionVolume`, `computeWeekStreak`, `loadWeeklyGoal`.
- **PR rule** matches the after-workout celebration: last week's heaviest weight
  for an exercise must beat the heaviest weight **before** that week — so a
  brand-new exercise isn't an instant "record".
- **Where in the code (app.js):** section *"Weekly recap (Phase 11)"* —
  `lastWeekRange`, `computeLastWeekRecap`, `findLastWeekRecords`,
  `buildRecapCard`, and the Today side `renderTodayRecap` /
  `markWeeklyRecapSeen` / `removeRecapSeenKeys`.

### Testing it (fake a new week)

In DevTools → Application → Local Storage, **delete** any `gym:recapSeen:…` row
and refresh — the Today card comes back. To simulate "last week had workouts",
edit a workout's **Date** (Today → Recent workouts → Edit) to a date in the
previous Mon–Sun window.

---

## 5j. Friends + nudges (Phase 12)

A 5th tab (🤝 **Friends**). Everything here lives in the **cloud**, not
localStorage, and needs you to be logged in and online.

### Two levels of friend (important)

| Level | What they can see |
|-------|-------------------|
| **Friend** | That you trained today, and your workouts-this-week count. Can nudge you. |
| **Close friend** | All of the above **plus** your actual workouts — sets, reps, weights, exercise names. |

- You promote someone with the **⭐ Close friend** button on their card. It is
  **one-directional**: it controls what *they* see of *your* data. It's normal
  for one of you to be close and not the other, and nobody can promote
  themselves.
- It's enforced by the **database**, not the screen — an ordinary friend can't
  read your workout rows even with DevTools open. Their counts come from a
  `friend_activity()` function that returns numbers only.

### Using it

- **Add a friend:** type their email → **Send**. They must have signed up with
  that exact address, or you get "no account with that email". The lookup runs
  inside the database (`find_user_by_email`), so nobody can browse emails.
- **Requests to you** appear at the top with Accept / Decline. Requests *you*
  sent show as "waiting" with a Cancel option.
- **👋 Nudge:** one per friend per day. The button becomes "Nudged! ✓" — and the
  database rejects a second one anyway, so it can't be spammed from two devices.
  - **What the person on the other end sees (Phase 12c):** the next time they
    **open the app**, a toast — "👋 Justice nudged you — go get that workout!" —
    and a coral **dot on the 🤝 tab** until they visit it. Their card also says
    "👋 Nudged you today". There is **no push notification**: this is a PWA, so
    nothing appears on their lock screen. A nudge is a nice surprise on their
    next visit, not a prod in the moment.
- **The tab dot** means "something's waiting": a friend request, or a nudge you
  haven't looked at. Opening the Friends tab marks nudges as seen and clears it;
  a request keeps it lit until you accept or decline.
- **Today tab → "Gym buddies"** lists each friend with Went today ✅ / Not yet 💤
  (🔒 if they've stopped sharing). It's hidden entirely when you have no friends.
  Tap the heading to fold it away — the heading still shows the count and how
  many went today. Open/closed is remembered in `gym:buddiesOpen` (per device).
- **Settings → Friends → "Share my workouts with friends"** is the master
  switch. Off = friends see nothing, not even your went-today tick, and it
  overrides close-friend status. It writes `share_workouts` on your directory
  row, and all three database rules check it.
- **"Delete my data"** now also clears your directory row, friendships, nudges
  and your close-friend list (`deleteMyFriendsData` in app.js). One thing it
  can't remove: if someone else marked *you* as their close friend, that row is
  theirs to delete — harmless, since access also needs a live friendship.
- **Tapping a buddy** opens their recent workouts, but only if they've made you
  a close friend *and* their sharing switch is on. Otherwise the card isn't
  tappable and says so.
- **Your name to friends:** Settings → Friends. Saved to your **account**
  (unlike the theme and unit, which are per device), so it's the same on every
  phone. It's created for you at first login from your active profile's name,
  or the part of your email before the `@`.

### Where things live

- **Database:** `Documentation/SQL-Phase12-Friends.sql` — `user_directory`,
  `friendships`, `close_friends`, `nudges`, plus the functions
  `find_user_by_email()`, `friend_directory()`, `friend_activity()`. Run once in
  the Supabase SQL editor (done 2026-07-24).
- **App:** `friends.js` (its own file — app.js was long enough). app.js calls
  into it in three places: `initFriendsOnLogin()` after login,
  `onFriendsTabOpened()` from `switchView`, and `renderFriendNameInput()` for
  the Settings box.

> ⚠️ **Cloud-pull gotcha (fixed in the same change).** `pullExercisesFromCloud`
> and `pullSessionsFromCloud` used to `select("*")` and let RLS return "only
> your rows". Now close friends can read your rows, so those queries **must**
> filter `.eq("user_id", userId)` — otherwise a friend's workouts get merged
> into your own history. If you ever add another cloud read, filter it too.

### Testing it (needs two accounts)

Use two browsers (or one normal + one private window) and two email addresses.
Send a request from A, accept on B, then check the buddy list on both. Promote
one side to close friend and confirm only that side can open the workouts.

---

## 5k. The in-app guide (Phase 13)

**Settings → 📖 How to use** opens a full-screen sheet (the same pattern as
workout mode). It's also reachable from a "New here? Take the tour" button on
the two screens a first-timer lands on: Today with no profile, and Schedule with
no exercises.

It has two halves: **three numbered steps** (make a profile → build your week →
train), then a **collapsible section per tab** for looking things up, ending
with an "Easy to miss" list.

### ✏️ Editing the wording — read this before changing anything

All the text lives in **two plain lists at the top of `guide.js`**:
`GUIDE_STEPS` and `GUIDE_SECTIONS`. Add a feature = add one line to the right
section's `items` array. You never need to touch the drawing code below them.
Write it as you'd say it to a friend: what they see and what to tap.

> **This replaced `Documentation/USER-GUIDE.md`, which was deleted.** One copy on
> purpose — two would drift apart within a phase or two. The README now points at
> the in-app guide instead.

**Deliberately not documented:** the owl long-press and the credits card stay
secret (see §8). The "Easy to miss" section ends with a nudge to go poking, and
nothing more.

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

- **2026-07-25** — **Renamed to Athena's Arena (on `dev`, awaiting owner test):** the top
  bar said "Jonathan's Journey 💪" and the PWA was still called "Justaino". Now everywhere
  the user can see: the top bar (**Athena's Arena 🦉** — flex emoji swapped for the owl),
  the browser tab title, the login panel, the install copy, and the manifest
  (`name` "Athena's Arena", `short_name` **"Athena"** so it isn't truncated under a
  home-screen icon). The service-worker cache prefix changed to `athenas-arena-cache-`;
  the activate step deletes any cache that isn't the current one, so the old
  `justaino-cache-*` is cleared automatically. **Left alone on purpose:** 💪 as an
  exercise icon and in encouraging copy ("you've got this 💪"), and the repo/Pages URL
  (`justaino.github.io/First_Gym_App_Project`) — changing that would break the live link
  your friends have. Cache `v38`.

- **2026-07-25** — **Phase 13 — in-app guide (on `dev`, awaiting owner test):** new
  `guide.js` + **Settings → 📖 How to use**, opening a full-screen sheet: three numbered
  starting steps, then a collapsible section per tab and an "Easy to miss" list. Also
  reachable via "New here? Take the tour" on the empty Today/Schedule states
  (`createEmptyState` gained optional button arguments). All wording lives in two lists at
  the top of `guide.js`. **`Documentation/USER-GUIDE.md` was deleted** — the in-app guide
  replaces it, and the README now points there. See §5k. Cache `v36`.

- **2026-07-25** — **Phase 12d + 12e — finishing Friends, and loading states (on `dev`,
  awaiting owner test):**
  - **12d:** Settings → Friends gained the master **"Share my workouts with friends"**
    switch (writes `share_workouts`); **"Delete my data"** now also wipes your directory
    row, friendships, nudges and close-friend list; a tester note went into
    `Documentation/WhatsNew_Friends_2026-07-25.md`; and a stale comment in `supabase.js`
    (claiming the library came from a CDN) was corrected — it's vendored.
  - **12e:** a reusable **spinner** (`createLoadingCard()` in app.js, `.spinner` in CSS,
    honours `prefers-reduced-motion`) now covers the three slow moments: logging in (a
    full-screen "Getting your workouts…" overlay, since a sleeping Supabase project takes
    seconds to wake), the first Friends load, and opening a friend's workouts — that
    pop-up now opens **immediately** with a spinner instead of after the fetch. The Today
    **"Gym buddies"** card became collapsible (`gym:buddiesOpen`), with the count and
    "N went today" kept in the heading. See §5j. Cache `v35`.

- **2026-07-25** — **Phase 12c — nudges you can actually see (on `dev`, awaiting owner
  test):** unseen nudges now pop a friendly toast when the app opens (several at once
  collapse into one message), a coral **dot** appears on the 🤝 tab while a request or
  unseen nudge is waiting, a buddy's card shows "👋 Nudged you today", and Today gained a
  **"Gym buddies"** card with each friend's went-today status (hidden when you have no
  friends). Nudges are marked seen when you open the Friends tab, which is what clears the
  dot. See §5j. Cache `v34`.

- **2026-07-25** — **Phase 12 FIX — close friends could never read anything:** tapping a
  close friend's card said "No workouts recorded yet" while their weekly count showed
  fine. Cause: a policy that looks at another table is still subject to THAT table's RLS,
  so the `sessions`/`exercises` policies couldn't see the `close_friends` or
  `user_directory` rows they needed (you may only read your own). Fixed by moving the
  check into a `SECURITY DEFINER` function, `may_read_workouts_of(owner)`, which both
  policies now call — `Documentation/SQL-Phase12-Fix-CloseFriendReads.sql` (owner ran it).
  No app change.

- **2026-07-24** — **Phase 12a/12b — friends (on `dev`, awaiting owner test):** the
  Supabase side was created by `Documentation/SQL-Phase12-Friends.sql` (owner ran it;
  4 tables + 3 functions, all RLS-checked). New **🤝 Friends tab** in `friends.js`: add by
  email, accept/decline requests, buddy list with went-today + weekly count, 👋 nudge
  (one per friend per day), ⭐ close-friend toggle, remove, and a tap-through to a close
  friend's recent workouts (reusing the workout pop-up via a new optional
  `showSessionDetail(session, exercisesOverride)` argument). Settings gained **"Your name
  to friends"** (stored on your account, not the device). ⚠️ Also fixed
  `pullExercisesFromCloud` / `pullSessionsFromCloud` to filter by `user_id` — with the new
  friend-read policies, `select("*")` would have merged a friend's data into your local
  cache. See §5j. Cache `v33`.

- **2026-07-24** — **Phase 11 — weekly recap (on `dev`, awaiting owner test):** a
  **"Last week"** card on Progress (under "This week") showing workouts vs goal, sets,
  volume, week streak and any PRs set last week — plus the same recap once per week as a
  dismissible **"Your week in review 🎉"** card at the top of Today. Pure client-side; the
  only thing stored is the dismissal flag `gym:recapSeen:<profileId>:<monday>` (per device,
  auto-tidied, cleared by "Delete my data"). The Today card is skipped after a blank week.
  Small refactor: `sessionVolume()` lifted out of `buildVolumeTrend` so both features share
  one definition. See §5i. Cache `v32`.

- **2026-07-24** — **Phase 10 — drag-to-reorder exercises (on `dev`, awaiting owner
  test):** SQL migration added a `sort_order` column to the Supabase `exercises` table;
  the app now stores `sortOrder` per exercise, sorts every view by it
  (`sortExercisesByOrder`), and adds a ⠿ drag handle on Schedule cards (Pointer Events,
  touch-friendly, reorder within a day only). New exercises land at the end of their day;
  the first drag on a day renumbers it. Cloud-first write with the offline guard. See §5h.
  Cache `v30`.

- **2026-07-19** — **Phase 9b — kg/lb unit setting (on `dev`, awaiting owner test):**
  new **Settings → Weight unit** dropdown; every weight in the app now reads through
  `formatWeight()` / `unitLabel()` instead of a bare number or a hard-coded "kg".
  **Display only** — saved weights are never converted, so history and PRs are
  untouched. Saved per device in `gym:unit` (not synced), like the theme. See §5g.
  Cache `v29`.

- **2026-07-19** — **Phase 9 — "last time" hints (on `dev`, awaiting owner test):** in
  workout mode each exercise now shows a small grey `Last time (Mon, Jul 14): 40 kg × 10,
  10, 8` line under its name, computed live from completed sessions (same profile, any
  day, ≥1 ticked set; the current workout is excluded). No history = no line; nothing new
  is stored and no prefills changed. See §5f. Cache `v28`.

- **2026-07-19** — **Phase 8 — exercise suggestions (on `dev`, awaiting owner test):**
  new `exercise-library.js` (~90 common exercises) + a suggestion dropdown under the
  Exercise name field in the add/edit form (up to 5 matches; tap or ↑/↓ + Enter to fill
  in name, icon and — only if untouched — sets/reps). Extended `EMOJI_PRESETS` from 7 to
  14 icons so every library exercise has one. Custom names are unaffected. See §5e.
  Cache `v27`.

- **2026-06-26** — **Rest-timer fixes (on `dev`):** the countdown now runs off an absolute end
  time (`restEndsAt`) and recalculates from the clock each tick + on `visibilitychange`, so it
  stays correct when the phone freezes background code and finishes (with a beep) the moment you
  return. Audio is unlocked more robustly on iPhone (a one-time silent buffer played inside the
  tap), and `playBeep` waits for the async `resume()` before scheduling tones. Known limit: the
  alarm still can't sound *while* the app is backgrounded/locked (a mobile-web limitation), and
  the iPhone hardware mute switch silences Web Audio. Cache `v25`.
- **2026-06-26** — **Phase 7 SHIPPED 🚀:** accounts + cross-device cloud sync (Supabase) are
  now **live on `main`** — the hosted site requires logging in and syncs data across devices.
  Merged `feature/auth` → `dev` → `main` after owner testing; removed the Phase-7 WIP note from
  CLAUDE.md. Cache shipped at **`v24`**. Future work goes back on `dev`.

- **2026-06-26** — **Phase 7h (part 1) — privacy + data controls (`feature/auth`):** added a
  short privacy note on the login screen, a **Settings → "Privacy & data"** card (what's
  stored / where / how to delete), a **"Delete my data"** button (`deleteAllMyData()` —
  deletes all the user's cloud rows + local cache, then logs out; does NOT delete the auth
  login itself, which needs admin access → "email the owner"). The Settings card links to
  **`Documentation/Privacy.pdf`** ("Read the full privacy note" — opens the styled PDF in a
  new tab); `Documentation/Privacy.md` is kept as the editable source. Cache `v24`.
- **2026-06-26** — **Phase 7h (part 2) — tester doc:** added
  `Documentation/WhatsNew_Accounts_2026-06-26.md` (sign-up, cross-device sync, first-login
  migration, offline behaviour, privacy/delete controls, password-reset-not-yet note). Docs
  only — no app-file change, so no cache bump. Remaining in 7h: release (gated on owner test).
- **2026-06-26** — **Phase 7g follow-up fixes (`feature/auth`):** (1) **orphan sessions** —
  `reconcileSessions` now drops sessions whose `profileId` no longer exists (they fail the
  `sessions_profile_id_fkey` constraint and can never upload); this clears the repeating
  console error on login and removes the dead sessions from the local cache. (2) **offline
  detection** — added `isNetworkError()`, used in `reportCloudWriteError`, so a failed cloud
  write shows the friendly "you're offline" notice even when `navigator.onLine` wrongly
  reports online (e.g. Chrome DevTools "Offline" throttling doesn't flip it). Cache `v20`.
- **2026-06-26** — **Phase 7g (offline) — code-complete on `feature/auth`:** vendored the
  Supabase library locally (`vendor/supabase.js`) so the app shell works offline again, and
  added friendly "you're offline" handling that blocks **plan edits** (profiles/exercises)
  when offline (they're cloud-wins, so offline edits would be lost); workouts stay usable
  offline (sessions merge). Cache bumped to `v19`. Remaining: 7h (privacy + release).
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
