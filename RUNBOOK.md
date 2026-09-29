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
| `badges.js` | Feathers (badges) on the Badges tab (Owl Quest Q5). The list is at the top. |
| `stats.js` | The stats under the feathers on Badges: This month, Week by week, Records, Exercise progress. |
| `icons.js` | The app's icons: Lucide (tabs, badges) + Phosphor Duotone (buttons) as SVGs, with their licences. |
| `xp.js` | XP and levels, worked out from saved workouts. The rules are at the top (Owl Quest Q2). |
| `week-path.js` | The "This week" stepping-stone path on Today (Owl Quest Q3). |
| `workout-screen.js` | The live workout screen, one exercise at a time (Owl Quest Q4). |
| `whats-new.js` / `whats-new.html` | The release notes and the page that shows them (Phase 16). |
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

> ⚠️ **Local testing uses the real database.** The hosted site and your local site
> are different origins, so each keeps its own localStorage *cache* — but both talk
> to the **same Supabase project**. Log in locally and you see (and change) your
> real data. There is no separate test database, so use a spare account for
> anything destructive.

**Branches:** `main` = the live site (GitHub Pages only redeploys when `main`
changes). `dev` = testing. Claude Code cloud sessions work on a `claude/…` branch
and open a **pull request into `dev`**. To test the latest `dev` locally:

```bash
git fetch origin
git checkout dev
git pull
```

Then open `index.html` with Live Server as above.

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
| `gym:workoutView` | `"focus"` or `"list"` — how a live workout looks (Q4a+; per device, not synced; default `focus`). |
| `gym:weeklyGoal` | Each profile's weekly workout goal, `{ profileId: n }` (per device, not synced). See §5c. |
| `gym:syncedUserId` | Which logged-in account the local cache belongs to, so one person's data is never uploaded into another's account. See §5d. |
| `gym:celebratedMilestones` | **Retired (Owl Quest Q5b).** Used to record which workout-count trophies had played; feathers replaced the trophy. The app now deletes this key at startup. |
| `gym:whatsNewSeen` | Phase 16: the date of the newest release note you've opened. Older than the newest entry = the "update" dot shows. |
| `gym:buddiesOpen` | Phase 12e: whether the Today "Gym buddies" card is folded open. |
| `gym:recapSeen:<profileId>:<monday>` | Phase 11: you've dismissed the "week in review" card on Today for that profile that week. One key per profile per week; old ones are tidied away automatically (per device, not synced). |

> Exercise **order within a day** (Phase 10) is NOT a separate key — it lives on
> each exercise as `sortOrder` (in `gym:exercises`) and as `sort_order` in the
> Supabase `exercises` table. See §5h.
>
> `gym:profiles`, `gym:exercises` and `gym:sessions` are a **cache** of your cloud
> data (§5d). Editing them in DevTools only changes this device, and the next login
> sync can overwrite them.

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

// See every feather and your progress (Owl Quest Q5)
listFeathers()

// Wipe this device's cache and settings. Your cloud data is NOT touched —
// log in again and it syncs back down. (To delete cloud data, use
// Settings → Privacy & data → Delete my data.)
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

## 5c. Stats on the Badges tab (was "Insights" on Progress)

*Rebuilt 2026-09-29 after the owner reviewed a preview.* Under the feathers,
`renderProgress()` calls `renderStats(sessions)` in **`stats.js`**, which draws four cards
into `#stats` from the active profile's finished workouts (nothing new is stored except
the weekly goal). All charts are plain SVG drawn at `CHART_WIDTH` (320) and stretched to
the card, so they draw correctly even while the tab is hidden.

1. **This month** (`buildThisMonthCard`): workouts and sets this month, each with
   "▲ n vs Aug" / "▼ n" / "same as Aug" — compared with **the same point last month**
   (1st to today's date, capped at the end of a shorter month), so early in the month it
   isn't unfairly red. Plus the week streak (`computeWeekStreak`) and "best N"
   (`longestWeekStreak` from badges.js).
2. **Week by week** (`buildWeekByWeekCard`, `drawWeekChart`): the last 12 Monday–Sunday
   weeks, ending with this week ("This wk"). Columns at/above the weekly goal are
   `--purple`, below it `--stats-bar-below`; a solid coral goal line. Tap/hover/focus a
   column for "Week of 8 Sep · 4 workouts · 44 sets".
3. **Records** (`buildRecordsCard`): exercises that still exist with any weighted set —
   best weight (heaviest first), the date it was first lifted, and the **latest session
   minus the first** ("▲ 10 kg", "no change"; only with 2+ sessions).
4. **Exercise progress** (`buildExerciseProgressSection`, `drawProgressChart`): chips
   pick an exercise (`statsExerciseId`, memory only). The line is the heaviest ticked
   weight per session — or, for an exercise with no weights, the most reps in one set —
   placed by real date, with a dot on each new record and labels on the first/latest
   values. Tap/drag (or ←/→ when focused) to pick a session; "See this workout" opens
   `showSessionDetail()`.

**Removed** (owner's request): the goal ring, the six stat tiles (incl. reps and kg
moved), the volume trend, the 12-week heatmap, the "Since you started" list, the This
week / Last week cards on this tab (the recap stays on Today) and the per-exercise
reps/weight bar charts. Their functions and CSS were deleted.

- **Weekly goal:** stored per profile under `gym:weeklyGoal` (`{ profileId: n }`),
  default 3; edited in **Settings → Weekly goal**. It sets the goal line.

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

A friendly summary of **last week** (Monday → Sunday), on the **Today tab → "Your week
in review 🎉"**, shown **once per week** on your first visit of a new week (a one-line
summary that opens the full card), with a ✕ to dismiss it. *(There used to be an
always-there "Last week" card on Progress too; it was removed in the stats redesign on
2026-09-29 — Week by week on Badges shows last week as its second-last column.)*

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

The 🤝 **Friends** tab (added as a 5th tab; one of four since Settings moved to the
avatar in Owl Quest Q1c). Everything here lives in the **cloud**, not
localStorage, and needs you to be logged in and online.

### Two levels of friend (important)

| Level | What they can see |
|-------|-------------------|
| **Friend** | That you trained today, and your workouts-this-week count. Can nudge you. |
| **Close friend** | All of the above **plus** your actual workouts — sets, reps, weights, exercise names. |

- **Close friendship is mutual (Phase 15).** One of you taps **☆ Ask to be
  close friends** (or ticks the box when first adding them); the other accepts,
  and both sides open at once. Either of you can end it, and both sides close.
- **Asking an existing friend opens your own side straight away** — you've said
  you want to share — with theirs opening on acceptance. For someone who isn't a
  friend yet, both open together on acceptance: you can't grant access to
  somebody who hasn't accepted you.
- **The one-way share survives** as *Share mine only*: they see your workouts,
  you don't see theirs, nobody accepts anything. That's the old Phase 12
  behaviour, kept for when you just want to show someone your training.
- **Nobody can promote themselves.** Accepting is the only way to gain access,
  and it's done by `accept_close_request()` — the one function allowed to write
  both grant rows, and only after checking you really were asked.
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

## 5l. Usernames (Phase 14)

Every account has a **username** — a unique handle like `@mintyowl42` — as well
as a display name. The display name is the friendly one your buddies see
("Justice"); the username is the unique one people can type to find you.

- **Rules:** lower case, 3–20 characters, letters, numbers and underscores. The
  database enforces the format and uniqueness (`user_directory.username`).
- **Where it comes from:**
  - **Generated** at first login (e.g. `mintyowl42`) — `ensureMyDirectoryRow()`
    fills in any row that has none, so the SQL backfill never has to be repeated.
    (A username box on the sign-up form was tried in 14b and withdrawn: the
    database can't check availability for someone who isn't logged in yet.)
  - **Changed** in **Settings → Friends → Username**, with a live "is it free?"
    check (14c).
  - **Used** in the add-friend box: `@name`, `name` or an email all work (14d).
- **Reserved handles** (`admin`, `athena`, `support`, `justaino`, …) live in
  **two places on purpose**: `RESERVED_USERNAMES` in `friends.js` (what the app
  refuses) and the list inside `is_username_available()` (what the database
  refuses). The database's *format* constraint does NOT include them — that's
  deliberate, so the owner can still claim one by hand in the SQL editor:

  ```sql
  update public.user_directory
  set username = 'justaino', updated_at = now()
  where email = 'you@example.com';
  ```

  Keep the two lists in step if you add to either.
- **Scripts:** `Documentation/SQL-Phase14-Usernames.sql` (column, backfill,
  lookups) and `SQL-Phase14-ReservedHandles.sql` (the owner's handles, plus the
  fix that lets you re-save your own reserved name).


---

## 5m. The What's new page (Phase 16)

**Settings → 🗞️ What's new** opens `whats-new.html` in a **new tab**. It's a
standalone page, not a screen inside the app, but it borrows `styles.css` so it
matches the app and follows the same dark-mode setting (a tiny inline script at
the top of the page reads `gym:theme` before anything is drawn, so there's no
white flash).

**Layout:** the newest release is shown in full with a butter outline and a warm
one-line intro; everything older is a row with a date pill, a title and a
chevron that turns as it opens. The folding is automatic, so today's headline
entry becomes tomorrow's folded row with no editing.

> ⚠️ **The page's own CSS lives inside `whats-new.html`, not in `styles.css`** —
> deliberately. The service worker caches `styles.css`, so a browser can be
> running yesterday's copy of it; when this page first shipped that stripped its
> styling entirely and the rows rendered as raw OS buttons. Rules that arrive
> *with* the page can't fall out of step. `styles.css` still supplies the shared
> basics (tokens, `.card`, `.app`) and the in-app link + dot. If you add a
> component to this page, style it in the page.

### ✏️ Adding a release — the only thing you need to do

Put a new object at the **top** of `RELEASES` in `whats-new.js`:

```js
{
  date: "2026-08-02",              // YYYY-MM-DD — also drives the unread dot
  title: "Short, plain headline",
  intro: "One warm sentence.",     // optional; only the top entry shows it
  items: ["One thing per line."],
}
```

Write it for the people using the app, not for yourself: *"Close friends works
both ways now"*, never *"changed close_friends to mutual"*. If a change is
invisible to them, leave it out — that's what the change log in §9 is for.

**The unread dot:** the app loads `whats-new.js` too, compares the newest `date`
against `gym:whatsNewSeen`, and shows a coral dot on the **avatar** (top bar — it
opens Settings since Owl Quest Q1c) and on
the What's new button when there's something newer. Opening the page clears it.
Dates are plain `YYYY-MM-DD` text, so a straight string comparison sorts them.

> The page is in the service worker's `APP_SHELL`, so it works offline like the
> rest of the app. If you add another page, add it there too.

## 5n. XP and levels (Owl Quest Q2)

A level bar on the Today card: "Lv 4 · Owlet   340 / 800 XP". Everything is in
`xp.js`.

**XP is calculated, never stored.** Each time Today draws, `computeTotalXp()` adds up
the active profile's **finished** workouts from `gym:sessions`. Nothing new goes into
localStorage or Supabase, so past workouts count straight away and every device agrees.
The flip side: editing or deleting an old workout changes your XP (a level can go down).

| Earns | XP | Rule |
|---|---|---|
| A ticked set | 10 | `entrySetsDone()`, so unticked sets never count |
| A finished workout | 50 | `isCompletedSession()`; an in-progress workout earns nothing yet |
| A personal record | 25 | Workouts oldest first; beating the best weight so far for that exercise. The first time doing an exercise isn't a record (same rule as the PR confetti) |

**Levels:** going from level L to L+1 costs L × 200 XP, so reaching level L needs
100 × L × (L − 1) XP in total. 30 levels; the max (Athena's Owl) is **87,000 XP**, about
500 workouts. Names change in bands (`LEVEL_NAMES`): Egg, Hatchling (2), Owlet (4),
Fledgling (7), Night Owl (10), Barn Owl (13), Snowy Owl (16), Great Horned Owl (19),
Eagle Owl (22), Wise Owl (25), Elder Owl (28), Athena's Owl (30). At the max the bar is
full and says "🏆 Max · 91,250 XP".

### ✏️ Changing the numbers or names
Edit the constants at the top of `xp.js` (`XP_PER_SET`, `XP_PER_WORKOUT`,
`XP_PER_RECORD`, `XP_LEVEL_STEP`, `MAX_LEVEL`, `LEVEL_NAMES`) and nothing else. Because
XP is recalculated each time, a change applies to everyone's whole history at once.
Bump `CACHE_VERSION` and update the guide line in the Today section.

### After a workout (Q2b)
`finishWorkout()` takes `computeTotalXp().total` just before marking the session
completed and again just after. The difference is what the workout earned: it's added to
the "Workout saved!" alert and popped over the bar by `showXpGain()` (a `.level-bar__gain`
bubble that floats up and fades, only if the bar is on screen). `detectLevelUp(before,
after)` returns the new level (or null); `celebrateAfterWorkout()` then plays its cards 3
seconds apart: PR 🏅 → level up 🦉 ("Top level!" at 30) → new feathers 🪶 (Q5b). A level up isn't
remembered anywhere, so if a deleted workout drops you a level, earning it back
celebrates again.

**Previewing without training** (console, on the Today tab):
- `showXpGain(170)` shows the bubble.
- `celebrateAfterWorkout([], levelForXp(9000), [])` shows the "Level up! Level 10 · Night Owl" card.
- `celebrateAfterWorkout([], levelForXp(87000), [])` shows the "Top level!" card.
- `celebrateAfterWorkout([], null, FEATHERS.slice(0, 2))` shows "🪶 2 new feathers!".
  (The arguments changed in Q5b: records, level up, new feathers.)

### Checking the maths (console)
- `computeTotalXp()` → `{ total, sets, workouts, records, fromSets, fromWorkouts, fromRecords }`
- `levelForXp(5000)` → `{ level, name, xpIntoLevel, xpForLevel, isMax }`
- `xpNeededForLevel(10)` → `9000`

## 5o. The week path (Owl Quest Q3)

The "This week" card under the Today card (`#weekPathCard`), drawn by `renderWeekPath()`
in `week-path.js`, called from `renderToday()`. Nothing is stored.

**Which stones appear** (`buildWeekStones()`), Monday → Sunday:
| Stone | When |
|---|---|
| **done** (butter, mint ✓) | A finished workout whose **date** is that day this week (by the date, not `session.day`). Tap → `showSessionDetail()` |
| **today** (big coral, pulses) | Today is planned and not done yet (an in-progress workout doesn't count as done). Tap → `startWorkout()` |
| **later** (lavender) | A planned day after today |
| **missed** (paler) | A planned day before today with no finished workout |
| **rest** (small, dashed coral) | Today, when nothing is planned and you haven't trained |

"Planned" = any exercise in the Schedule for that day. A day you trained that isn't
planned still gets a done stone; rest days otherwise get no stone. Today, once done, stays
butter but keeps the coral ring (`.week-stone--current`). The week starts Monday
(`weekMondayMidnight()`, same as the recap and streak).

**The count** ("2 of 4 done") = done stones ÷ all stones except the rest stone. The card
is hidden with no profile, or when the only stone would be "Rest" (nothing planned or
done this week).

**Layout:** stones are absolutely positioned by their centre: `left` = evenly spread
percentages, `top` alternating `WEEK_PATH_LOW` / `WEEK_PATH_HIGH` (px). The dotted line is
an SVG (`viewBox` 100 wide, `preserveAspectRatio="none"`, `vector-effect:
non-scaling-stroke` so the dots stay round) with an S-curve between each pair of stones.
Colours are `--stone-*`, `--path-line` and `--on-accent` tokens (light + dark).

**Testing:** add an exercise to another day in Schedule → a new stone appears. To see a
missed stone, plan something for a day earlier this week that you didn't train.

## 5r. Feathers (badges) — Owl Quest Q5

The **Badges** tab (still `data-view="progress"` / `renderProgress()` in the code; only the
label and title changed) starts with a short "Your feathers" card, drawn by
`renderFeathers()` in `badges.js` into `#feathers`: the count, "See all ›", up to
`FEATHERS_PREVIEW_COUNT` (4) earned medallions (the last earned ones in list order) and
the suggested feather. **See all** opens `#feathersSheet`, a full-page sheet like the guide
(`openFeathersPage()` / `closeFeathersPage()`, ‹ Back button `#closeFeathersBtn`, Escape
also closes it), which `renderFeathersPage()` fills with the full grid, the tapped
feather's details and Next feather (Q5c). Nothing is stored: it's recalculated from the active
profile's finished workouts every time the tab draws.

- **The list:** `FEATHERS` at the top of `badges.js` — `id`, Lucide `icon`, `tone`
  (medallion colour), `name`, `how`, `measure`, `target`, optional `unit` (progress words;
  `{unit}` becomes kg/lb; no unit = a yes/no feather that says "Not yet").
- **The numbers:** `computeFeatherStats()` returns `workouts`, `longestStreak` (longest
  run of weeks with a workout, `longestWeekStreak()`), `busiestWeek` (most workouts in one
  Monday–Sunday week), `weekendWarrior` (a Saturday then the Sunday after,
  `trainedOnAWeekend()`), `records` (`countPersonalRecords()` from xp.js), `sets`,
  `reps` (`entryRepsDone()`, for Rep Counter — it replaced Heavy Mover / `weightMoved`
  in Q5c), `differentExercises`, `notes` (non-empty
  entry notes), `earlyBird` (a workout **started** before 07:00), `lateShift` (started at
  21:00 or later) and `level` (xp.js). A workout whose date was edited is at noon, so it
  never counts as early or late.
- **Earned** = `current >= target` (`computeFeathers()`). **Suggested feather**
  (`pickSuggestedFeather()`, owner's request in Q5c — it was a fixed "Next feather"): the
  pool is the 3 locked counting feathers you're closest to (`SUGGESTION_POOL_CLOSEST`) plus
  every locked yes/no feather; the pick is `pool[dayNumber % pool.length]`, so it's the
  same all day (the tab redraws often), changes the next day, and moves on once earned.
  Counting feathers show progress + bar; yes/no ones show their `how` text.
- **Tapping** a medallion on the feathers page sets `selectedFeatherId` (memory only) and
  redraws the page with a details box; tapping it again closes it. Opening the page
  always starts with nothing selected.
- **Colours:** `--medal-*` tokens (butter, coral, mint, lavender + edges, `--medal-ink`,
  `--medal-locked*`), light and dark.
- **After a workout (Q5b):** `finishWorkout()` takes `earnedFeatherIds()` just before
  marking the session completed and `detectNewFeathers(before)` just after; any new ones
  get one "🪶 New feather!" / "2 new feathers!" card (names joined with ·), played after
  the PR and level-up cards by `celebrateAfterWorkout(personalRecords, levelUp,
  newFeathers)`. Nothing is remembered, so a feather lost by deleting a workout
  celebrates again when re-earned. This replaced the 🏆 workout-milestone trophy.
- **Console:** `listFeathers()` prints a table of every feather and your progress;
  `computeFeatherStats()` shows the raw numbers.

## 5q. Icons (icons.js)

Two open-source sets, copied in as SVG text (no library, works offline):
**Lucide** (ISC) for the tab bar and badges, **Phosphor Duotone** (MIT) for buttons.
Licence notices are at the top of `icons.js`; the credits card (tap the app title 5×)
says "Icons by Lucide and Phosphor". Every icon uses `currentColor`, so it follows the
text colour — a button that shows an icon must set `color` (e.g. `.icon-action`,
`.icon-btn` use `--text`), or it'll be black in dark mode.

- **In HTML:** `<span data-icon="play"></span>` — `fillIconPlaceholders()` fills these
  on `DOMContentLoaded` (icons.js loads before app.js).
- **In JS:** `el.innerHTML = iconSvg("play") + " Start"`. It's called `iconSvg`, not
  `icon`, because many functions already have a local variable called `icon` (the
  exercise's emoji circle), which would hide the helper.
- **Sizing:** `.ic` is 1.2em square by default; tab icons are 24px, round buttons 20px,
  workout stars 32px (`styles.css`, "ICONS" section at the end).
- **Names in use:** Lucide `today`, `schedule`, `progress`, `friends`; Phosphor `edit`,
  `delete`, `moon`, `sun`, `play`, `plus`, `star`, `star-filled` (Phosphor Fill), `list`,
  `timer`, `install`, `news`, `guide`, `wave`, `close`.
- **Adding one:** copy the SVG from lucide.dev or phosphoricons.com (Duotone), strip
  `width` / `height` / `class` from the `<svg>` tag only (not from inner shapes — a
  Lucide `<rect>` needs its own width/height), add it to `ICONS`, bump `CACHE_VERSION`.

## 5p. The live workout screen (Owl Quest Q4)

The workout sheet (`#workoutOverlay`) has **two looks**, set by `setWorkoutMode()` in
`app.js`:
- **live** — `startWorkout()` (Today button, Today stone, Schedule's Start). Adds the
  `sheet--live` class, which hides `#workoutList`, `#workoutSaveNote` and
  `#workoutDateRow` and shows `#workoutFocus`, drawn by `renderWorkoutFocus()` in
  `workout-screen.js`.
- **edit** — `editSession()` (Recent workouts → edit). The original long list
  (`renderWorkoutItems()`), unchanged.

**Choosing the live view (Q4a+):** a live workout shows the "⭐ One at a time | ☰ List"
toggle (`#workoutViewToggle`). `switchWorkoutView(view, exerciseIndex?)` saves the choice
to `gym:workoutView` (`loadWorkoutView()` / `saveWorkoutView()`, default `"focus"`),
updates the classes and redraws. Classes on the sheet: `sheet--live` (training — shows the
toggle) and `sheet--focus` (one-at-a-time showing — hides the list, date row and save
note). `isFocusViewShowing()` = live + `"focus"`. In List view while training, each
exercise name is a button (`.exercise__name--link`) that calls
`switchWorkoutView("focus", entryIndex)`. Editing a saved workout never shows the toggle.

`redrawWorkout()` redraws whichever look is showing; `toggleWorkoutSet()`,
`addWorkoutSet()`, `removeWorkoutSet()` and the unit change all call it.

**The live screen, top to bottom** (each piece is one `build…()` function):
heading ("Exercise 1 of 3") → emoji jump row (✓ on finished exercises) → progress bar
(sets done of the whole workout) → owl bubble (`owlMessageFor()`: "Nice work! Next up…"
when the exercise is done, otherwise `buildLastTimeHint()` + "Can you match it?", or
"First time on this one" — plus `buildLastNoteHint()`) → the next unticked set in big
boxes → a star per set (`tapStar()` toggles `done`, saves, redraws and pops "+10 XP") →
"Edit sets" fold (the old `buildWorkoutSetRow()` rows + Add set) → note button
(`buildWorkoutNote()`) → ‹ Previous / Next › (purple once the exercise is done; no Next
on the last — the big Finish is the way out) + "Up next" → "Workout details" fold with a date box
that copies into `#workoutDateInput` and calls `handleWorkoutDateChange()`.

**Rest timer (Q4b):** the `#restTimer` pill sits just above Discard / Finish with
`position: sticky; bottom: 12px`, so it floats over the content while you scroll (both
views) and settles in place at the end. The state classes moved from `#timerDisplay` to
`#restTimer`: `is-running` swaps the 60/90/120s buttons (`.rest-pill__idle`) for +15s
(`#addRestBtn` → `addRestTime(15)`, which moves `restEndsAt` on) and Skip
(`#stopTimerBtn` → `resetTimerDisplay()`); `is-done` turns the text mint. The countdown
itself (wall-clock `restEndsAt`, `visibilitychange` catch-up, beep) is unchanged. Colours:
`--ink` / `--ink-text` / `--ink-edge` (they flip in dark mode) + new `--rest-chip-bg`.

**Memory only:** `focusExerciseIndex` (which exercise is showing) and `focusEditSetsOpen`.
Starting or resuming opens on `firstUnfinishedExerciseIndex()`. Nothing about the data or
saving changed: every change still goes through `activeSession` +
`persistActiveSession()`, and the rest timer / Discard / Finish below are the same.

---

## 6. Backup & restore (import / export)

Found in **Settings → Backup**.

- **Export** downloads a `.json` file containing your data (it cleans out
  deleted/orphaned items as it goes).
- **Import** reads a backup file and merges it back in: profiles in the file
  **replace** matching ones (by id) and new ones are **added**; profiles not in
  the file are left untouched.

> ⚠️ **Known issue — import doesn't reach the cloud.** Import only writes to this
> device's localStorage cache; it doesn't upload to Supabase. Because profiles and
> exercises are **cloud-wins** on login (§5d), the next login sync can replace
> what you imported. Imported workouts may survive (sessions merge) but aren't
> guaranteed. Don't rely on import to restore lost data until this is fixed
> (listed in ROADMAP.md §13).

**Key point:** deleting things (an exercise, a workout) removes them permanently
from storage. They can only come back by **importing a backup you exported
before the deletion**. So export a backup before any big cleanup.

---

## 7. Deletion & cleanup behaviour

The app cleans up related data so nothing is left orphaned:

- **Delete an exercise** → also removes that exercise from every saved workout,
  deletes any workout left empty.
- **Delete a workout** → just removes it. XP, levels and feathers are recalculated from
  what's left, so nothing else needs tidying (a lost feather celebrates again when
  re-earned).
- **Delete a profile** → also removes that profile's exercises and workouts.

---

## 8. Easter eggs (the fun stuff) 🎉

All live in the `7e. EASTER EGGS` section of `app.js`. None of them affect your
saved workout data.

| # | Trigger | What happens |
|---|---------|--------------|
| 1 | **PC:** type `athena` (not in a text box). **Mobile/mouse:** long-press the Today-header mascot (sun/moon) for ~1.5s. | An owl 🦉 glides across + a "Wisdom +1" toast. |
| 3 | Finish a workout where you beat a past weight for an exercise | Confetti + a "New personal record!" card. |
| ~~4~~ | *Retired in Owl Quest Q5b.* The workout-count trophy (7, 30, 50, 100) is now the feathers Week One, Regular, Fifty and Century, celebrated with a 🪶 card. | — |
| 7 | Tap the app title 5× within 2 seconds | A hidden credits card slides up. |

### How personal records (#3) are decided
PRs are matched by an exercise's internal **id**, not its name. Beating a past
weight for the same exercise triggers it. A brand-new exercise has no history, so
its first weighted workout won't fire a PR (there's nothing to beat yet).

---

## 9. Change log

Newest first. Add a line here whenever behaviour changes.

> Entries below marked "on `dev`, awaiting owner test" were written at build time.
> Everything up to 2026-09-29 has since been tested and released to `main`.

- **2026-09-29** — **Release to `main`: the Owl Quest redesign so far** (owner said
  "merge to main"). Brings to the live site: the docs refresh, Q1 (new look, Today card,
  four tabs), full exercise names, Q2 (XP + levels), Q3 (week path), closing workouts
  left open, Q4 (one-at-a-time workout screen, list toggle, floating rest timer), the
  Lucide/Phosphor icons, Q5 (feathers on the Badges tab) and the new Badges stats.
  What's new: the two entries dated 2026-09-28 were re-dated to the release day. Cache
  `v70` (main was on `v48`). No database changes in this release.

- **2026-09-29** — **New stats on Badges (released to `main` 2026-09-29):** see §5c.
  Built from the preview the owner approved.
  - New `stats.js` (in `index.html` after `badges.js`, and in `APP_SHELL`):
    `renderStats()` and the four cards.
  - `index.html`: `#insights`, `#weekSummary`, `#byExerciseHeading` and
    `#exerciseProgressList` replaced by `#stats`; Settings' weekly-goal hint mentions the
    goal line.
  - `app.js`: `renderProgress()` is now feathers + `renderStats()`. Deleted
    `getStartOfWeek`, `buildBarChartSvg`, the chart tooltip (`getChartTooltip`,
    `showChartTooltip`, `hideChartTooltip`), `buildWeekSummaryCard`,
    `buildExerciseProgressCard`, `buildChartLegend`, `renderInsights`,
    `buildTrendCallouts`, `buildGoalRing`, `buildVolumeTrend`, `showHeatmapTooltip`,
    `buildHeatmap`, `entryLastWeight`. Kept: the week helpers, weekly goal,
    `sessionVolume` and `buildStatTile` (the Today recap uses them).
  - `badges.js`: `longestWeekStreak()` now removes repeated weeks itself (stats.js passes
    one key per workout; repeats had been counted as gaps).
  - `styles.css`: the `.stats-*` section; new tokens `--stats-up`, `--stats-down`,
    `--stats-bar-below`, `--stats-area`; removed the old chart, goal ring, heatmap,
    volume and trend rules.
  - Guide (Badges section), What's new ("Calmer, clearer stats"), `CLAUDE.md`. Cache
    `v68`.
  - Fix (owner's report): tapping a chip near the end of the Exercise progress row made
    it jump out of view, because the redrawn card's chip row started scrolled to the
    left. The chip handler now carries `scrollLeft` across, calls `keepChipInView()`
    (scrolls only the row, never the page) and re-focuses the chosen chip. Cache `v69`.

- **2026-09-29** — **Owl Quest Q5c — shorter feathers card + feathers page (released to
  `main` 2026-09-29):** see §5r.
  - `badges.js`: `renderFeathers()` now draws the short card; new `renderFeathersPage()`,
    `openFeathersPage()`, `closeFeathersPage()`, `buildFeathersHead()`,
    `FEATHERS_PREVIEW_COUNT`. Heavy Mover → **Rep Counter** (`reps` ≥ 2,000;
    `weightMoved` removed from `computeFeatherStats()`). "Next feather" became a
    **Suggested feather** that changes daily (`pickSuggestedFeather()`).
  - `index.html`: new `#feathersSheet` (Back button, title, `#feathersPageCount`,
    `#feathersPageContent`).
  - `icons.js`: Lucide `weight` → `activity`; Phosphor `back` / `forward` carets.
  - `styles.css`: `.feathers__row`, `.feathers__more`, `.feathers__none`,
    `.feathers__see-all`, `.sheet__header--back`, `.back-btn`, `.sheet__subtitle`.
  - Guide + What's new wording. Cache `v67`.

- **2026-09-29** — **Owl Quest Q5b — new feather celebration (released to `main` 2026-09-29):**
  - `badges.js`: `earnedFeatherIds()`, `detectNewFeathers(beforeIds)`.
  - `app.js` `finishWorkout()`: feathers before/after, then
    `celebrateAfterWorkout(personalRecords, levelUp, newFeathers)` — the arguments
    changed (the milestone one is gone). A "🪶 New feather!" card (or "N new feathers!")
    plays last, with confetti.
  - **Trophy retired:** removed `WORKOUT_MILESTONES`, `loadCelebratedMap()`,
    `saveCelebratedMap()`, `reconcileCelebratedMilestones()` (and its two calls when
    deleting exercises / workouts) and `detectWorkoutMilestone()`. `init()` now deletes
    the old `gym:celebratedMilestones` key; the key name stays in `STORAGE_KEYS` for that
    and for "delete my data". §3, §5, §7, §8 updated.
  - Guide + What's new lines. Cache `v65`.

- **2026-09-29** — **Owl Quest Q5a — the feathers card (released to `main` 2026-09-29):**
  see §5r.
  - New `badges.js` (in `index.html` after `workout-screen.js`, and in `APP_SHELL`).
  - `index.html`: the tab label and view title are now **Badges** (`data-view` is still
    `progress`); new `#feathers` above `#insights`; the tab uses the Lucide `badges`
    (award) icon. `renderProgress()` calls `renderFeathers()` first.
  - `icons.js`: the Progress chart icon became `badges`; 19 Lucide badge icons added.
  - `styles.css`: `.feathers*`, `.feather*`, `.feather-medal*`, `.feather-detail*`,
    `.feather-next*`, `.feather-bar*`; new `--medal-*` tokens (light + dark).
  - Guide (the section is now "Badges"), What's new ("Collect feathers"), ROADMAP (Q5
    split), `CLAUDE.md`. Cache `v64`.

- **2026-09-29** — **Modern icons (released to `main` 2026-09-29):**
  see §5q.
  - New `icons.js` (19 icons + licences; in `index.html` before `app.js`, and in
    `APP_SHELL`): `ICONS`, `iconSvg(name)`, `fillIconPlaceholders()`.
  - `index.html`: `data-icon` placeholders on the four tabs, the theme button, Start
    workout, Add exercise, Install / What's new / How to use, the view toggle, the rest
    timer and the credits ✕; credits line "Icons by Lucide and Phosphor".
  - JS: `createExerciseCard()` edit/delete, Schedule Start/Resume, the Today button,
    `applyTheme()` sun/moon, both recap ✕ buttons, Add set (both views), remove-set ✕,
    workout stars (`star` → `star-filled` when done), Friends' Nudge — `textContent`
    became `innerHTML = iconSvg(...)`.
  - `styles.css`: `.ic` sizing section; `.icon-action` / `.icon-btn` now set `color`;
    stars lost their greyscale filter and use new tokens `--star-empty` / `--star-gold`.
  - Guide and What's new wording no longer names the old emoji buttons. `CLAUDE.md`
    design system + file table. Cache `v63`.

- **2026-09-29** — **Owl Quest Q4b — floating rest timer (released to `main` 2026-09-29):**
  - `index.html`: the `.card.timer` became `.rest-pill#restTimer` (icon, `#timerDisplay`
    with `role="timer"`, 60/90/120s buttons, new `#addRestBtn` "+15s", `#stopTimerBtn`
    now labelled "Skip").
  - `app.js`: `startRest()`, `finishRest()`, `stopRest()`, `resetTimerDisplay()` put
    `is-running` / `is-done` on `#restTimer` instead of the display; idle text "Rest"
    (was "Rest timer"). New `addRestTime(seconds)`. The duration buttons are selected by
    `.rest-pill__btn[data-seconds]`; +15s wired in `init()`.
  - `styles.css`: old `.timer*` / `.timer-btn*` rules replaced by `.rest-pill*`; new token
    `--rest-chip-bg` (light + dark).
  - Guide (Workout mode), What's new, ROADMAP (Q4 complete), §5p. Cache `v60`.
  - Owner's feedback, same step: `.focus-nav .btn` are compact (15px, `9px 20px`, no
    longer `flex: 1`; the row is `space-between`), and a finished exercise's Next uses
    the new `.btn--next-ready` (`--purple` / `--avatar-text` / `--purple-edge`) instead of
    `btn--primary`, so it doesn't match the coral Finish. Cache `v61`.
  - Then (owner's choice "A"): `buildFocusNav()` no longer adds the small "Finish ✓" on
    the last exercise — the big Finish below is the only one — and skips the whole row
    when the workout has a single exercise. Cache `v62`.

- **2026-09-29** — **Owl Quest Q4a+ — choose your view (released to `main` 2026-09-29):**
  owner's request: people should be able to see the whole day without clicking through.
  - `app.js`: new key `STORAGE_KEYS.workoutView` (`gym:workoutView`), `WORKOUT_VIEWS`,
    `loadWorkoutView()`, `saveWorkoutView()`, `isFocusViewShowing()`,
    `applyWorkoutViewClasses()`, `switchWorkoutView()`; `redrawWorkout()` now picks by
    `isFocusViewShowing()`. `renderWorkoutItems()` makes the name a button while live.
    Toggle clicks wired in `init()`.
  - `index.html`: `#workoutViewToggle` (two `data-view` buttons) under the sheet header.
  - `styles.css`: hide rules now key off `.sheet--focus`; `.view-toggle*`,
    `.exercise__name--link`; new token `--view-toggle-current` (light + dark).
  - Guide, What's new, §3 key table, §5p. Cache `v59`.

- **2026-09-29** — **Owl Quest Q4a — one exercise at a time (released to `main` 2026-09-29):**
  - New file `workout-screen.js` (in `index.html` after `week-path.js`, and in
    `APP_SHELL`): the live screen (see §5p).
  - `app.js`: `workoutMode`, `setWorkoutMode()`, `redrawWorkout()`. `startWorkout()`
    now fills the date first, switches to live and opens on the first unfinished
    exercise; `editSession()` switches to edit. `toggleWorkoutSet()`, `addWorkoutSet()`,
    `removeWorkoutSet()` and `handleUnitChange()` call `redrawWorkout()` instead of
    `renderWorkoutItems()`.
  - `index.html`: ids `workoutSaveNote` and `workoutDateRow`, and the new
    `#workoutFocus` container.
  - `styles.css`: the `.sheet--live` show/hide rules and `.focus-*`, `.owl-coach*`
    styles; new tokens `--star-done-bg`, `--star-done-edge`.
  - Guide (step 3 + Workout mode section), What's new ("One exercise at a time"),
    ROADMAP (Q4 split into Q4a/Q4b), `CLAUDE.md` file table. Cache `v58`.

- **2026-09-29** — **Fix: workouts left open are closed quietly (released to `main` 2026-09-29):** the owner tapped the Today stone and got an old Tuesday workout showing two
  "(deleted exercise)" rows. Cause: `findInProgressSession(day)` matched by day **name**
  only, so a workout left open in an earlier week was resumed; its exercises had since
  been deleted (the entry clean-up in `deleteExercise()` only runs on the device that
  deletes, and the sync keeps a newer local in-progress copy).
  - `app.js`: `STALE_WORKOUT_HOURS = 12`; `isStaleWorkout()` (in progress and
    `sessionTime()` more than 12 h ago); `findInProgressSession()` now skips stale ones.
  - `closeStaleWorkouts()` drops entries for exercises that no longer exist, then
    **finishes** the workout (status `completed`, `pushSessionToCloud`) if any set was
    ticked, or **removes** it (`deleteSessionFromCloud`) if not. It skips the workout
    that's open right now. Called in `onUserLoggedIn()` after the sync (before
    `renderAll()`) and at the top of `startWorkout()`. If a cloud delete fails offline,
    the next login pulls it back and closes it again.
  - What's new: a "Fixed:" line on "Your week as a path". Cache `v57`.

- **2026-09-29** — **Owl Quest Q3 — the week path (released to `main` 2026-09-29):**
  - New file `week-path.js` (in `index.html` after `xp.js`, and in `APP_SHELL`):
    `buildWeekStones()`, `renderWeekPath()`, `buildWeekPathLine()`, `buildWeekStone()`.
  - `index.html`: `#weekPathCard` (title, `#weekPathCount`, `#weekPath`) between the
    Today card and the recap. `renderToday()` calls `renderWeekPath()`.
  - `styles.css`: `.week-path*` and `.week-stone*` rules (done / today / later / missed /
    rest / current, press-down, a pulse on today that's off with reduced motion). New
    tokens `--stone-*`, `--path-line`, `--on-accent`. Missed stones use solid paler
    colours rather than opacity, so the dotted line doesn't show through them.
  - Guide (Today), What's new ("Your week as a path", 2026-09-29), §5o, `CLAUDE.md`
    file table. Cache `v56`.

- **2026-09-28** — **Owl Quest Q2b — XP after a workout (released to `main` 2026-09-29):**
  - `finishWorkout()` (`app.js`) measures XP before/after saving; the alert now reads
    "Workout saved! 5 sets done · +170 XP 💪". Then `showXpGain()` and
    `celebrateAfterWorkout(personalRecords, milestone, levelUp)`.
  - `celebrateAfterWorkout()` rewritten as a list of celebrations played 3s apart (it was
    two hard-coded steps), adding a 🦉 level-up card between the PR and the trophy.
  - `xp.js`: `detectLevelUp()` and `showXpGain()`. `styles.css`: `.level-bar` is now
    `position: relative`; `.level-bar__gain` bubble with an `xp-gain-float` animation
    (a plain fade with reduced motion); new token `--xp-fill-text`.
  - Guide + What's new lines added; §5n updated. Cache `v55`.

- **2026-09-28** — **Owl Quest Q2a — XP and levels (released to `main` 2026-09-29):**
  - New file `xp.js` (added to `index.html` after `app.js`, and to `APP_SHELL`). Rules at
    the top: 10 XP per ticked set, 50 per finished workout, 25 per personal record; 30
    levels where level L → L+1 costs L × 200 XP (max 87,000). `computeTotalXp()`,
    `countPersonalRecords()`, `xpNeededForLevel()`, `levelName()`, `levelForXp()`,
    `renderLevelBar()`. Nothing is stored and there are no database changes (see §5n).
  - `index.html`: `#levelBar` (labels + a `role="progressbar"` track) inside the Today
    card, between the greeting and today's plan. `renderToday()` calls
    `renderLevelBar()`, which hides the bar when there's no profile.
  - `styles.css`: `.level-bar*` rules; new tokens `--xp-track` / `--xp-fill` (see-through
    white + purple in light mode, dark groove + lilac in dark mode). The fill slides
    (off with reduced motion). Labels wrap on very narrow phones.
  - Guide (Today section), What's new ("Level up your owl"), `CLAUDE.md` file table
    updated. Removed the stale untracked `AGENTS.md`. Cache `v54`.

- **2026-09-28** — **Full exercise names on cards (released to `main` 2026-09-29):** on a phone the
  text "Edit" / "Delete" buttons squeezed names down to "Bench…". In
  `createExerciseCard()` (`app.js`) they're now `.icon-action` round buttons showing ✏️ /
  🗑️, each with an `aria-label` ("Edit Bench Press") and a `title` tooltip; the click
  handlers and the delete confirm are unchanged. `styles.css`: `.exercise__name` now
  wraps up to 3 lines (`-webkit-line-clamp: 3`, `overflow-wrap: anywhere`) instead of
  one-line ellipsis — this also applies everywhere else that class is used (PR board,
  recap, history detail, friends' workouts). The card is a little tighter (padding 14,
  gap 10, emoji circle 46px, buttons 38px). Guide (Schedule) + What's new updated.
  Cache `v53`.

- **2026-09-28** — **Owl Quest Q1c — four tabs, Settings behind the avatar (released to
  `main` 2026-09-29):**
  - `index.html`: the Settings `.tab` is gone. The top bar's name chip became
    `.avatar-btn` — same id (`#activeProfileChip`, still wired to
    `switchView("settings")` in `init()`), now holding `#activeProfileInitial` and the
    What's new dot `#settingsTabDot` (id kept, so `renderWhatsNewDot()` needed no
    change). Settings view title "Profiles" → "Settings", plus a "Profiles" section
    heading above the create-profile form.
  - `app.js`: `renderActiveProfileChip()` shows the first character of the profile name
    (via `Array.from`, so emoji/accents survive) or "?", and sets an aria-label.
    `switchView()` toggles `.avatar-btn--active` + `aria-current` on the avatar when on
    Settings.
  - `styles.css`: `.profile-chip` rules replaced by `.avatar-btn` (purple, chunky edge,
    lavender outline when active). New tokens `--purple-edge`, `--avatar-text`. The dot
    uses `.avatar-btn .avatar-btn__dot` to beat the later `.tab__dot` position rule. Tabs
    get `padding: 8px 14px` now there are four.
  - Guide (step 1 + Settings section) and What's new updated. Cache `v52`.

- **2026-09-28** — **Owl Quest Q1b — Today screen (released to `main` 2026-09-29):**
  - `index.html`: the `.hero` card now has three parts — `.hero__top` (mascot +
    greeting, unchanged ids so the owl long-press still works), a new `#heroPlan`
    (`#heroPlanTitle` + `#heroPlanIcons`), and `#startTodayBtn`, which moved *inside* the
    card. New `#todayListHeading` above `#todayList`.
  - `renderToday()` fills the plan line ("3 exercises · 10 sets" via `pluralise()`, plus
    the exercises' emoji). On a rest day the card says so and the button and heading are
    hidden; the old rest-day empty-state card is gone (the hero says it). No profile →
    plan and button hidden, tour empty state as before.
  - **Recap:** `renderTodayRecap()` now draws `buildRecapSummaryRow()` — a one-line pill
    ("🎉 Last week: 3 of 3 workouts · 2 new records ›", text from
    `describeRecapInOneLine()`) with its own ✕. Tapping it sets `todayRecapOpen` (memory
    only, so it's folded again next time the app opens) and redraws the full
    `buildRecapCard()`. Dismissal is unchanged (`gym:recapSeen:…`).
  - `styles.css`: `.hero` is now a column; new `--hero-from/--hero-to` tokens (sunrise in
    light, night-sky purple → plum in dark — fixes the muddy dark card); new `.btn--ink`
    button (`--ink`, `--ink-text`, `--ink-edge`; dark on light, light on dark) because a
    coral button disappears on the warm card; `.recap-row` styles.
  - **Bug fix (was live):** a class that sets `display` (e.g. `.btn--block`) beat the
    browser's built-in `[hidden]` rule, so the Start workout button showed on rest days.
    Added a global `[hidden] { display: none !important; }` in the reset. A sandbox check
    of every tab found that button was the only element affected.
  - Guide (Today section) and What's new updated. Cache `v51`.

- **2026-09-28** — **Owl Quest Q1a — colours, font and buttons (released to `main` 2026-09-29):** the
  first step of the redesign (ROADMAP §11). All in `styles.css` except where noted:
  - **Colour tokens** at the top of the file replaced: lavender sky `--bg-top` fading
    into `--bg` (painted once at the top of `body` as a `no-repeat` gradient), deep indigo
    `--text`, new `--purple` accent, and new `--edge` / `--coral-edge` / `--mint-edge` /
    `--danger-edge` for the chunky look. Dark mode is now a night-purple palette.
  - **Fonts:** new `--font-body` (Nunito) and `--font-display` (Baloo 2). Baloo 2 is
    applied to a list of heading/number selectors in the new "OWL QUEST THEME" section at
    the bottom of the file, plus `.btn`. The Google Fonts link in `index.html` and
    `whats-new.html` now loads both.
  - **Chunky:** `--shadow-card` is now a solid `0 4px 0 var(--edge)` edge, so every card
    that used it changed at once. Filled buttons have a darker edge and slide down onto
    it when pressed (`translateY(3px)` instead of the old `scale(0.97)`).
  - **Active tab** is lavender-tinted with `--purple` text (was coral).
  - **Status bar colour:** `theme-color` meta + `manifest.webmanifest` now lavender;
    `applyTheme()` in `app.js` swaps it to night purple in dark mode
    (`THEME_BAR_COLOURS`).
  - Known leftover: the Today greeting card keeps its butter→coral gradient, which looks
    muddy in dark mode. It's redesigned in Q1b.
  Cache `v50`.

- **2026-09-28** — **Documentation refresh (on a `claude/…` branch → pull request into
  `dev`):** brought the docs in line with the app as it is now. `CLAUDE.md` rewritten for
  Supabase (it still said "localStorage only, no backend"), the current file list, the
  `claude/…` → `dev` → `main` pull-request workflow, the current data shapes, and a
  reminder that local testing hits the real database. `README.md` rewritten (it still
  described Phase 1). `ROADMAP.md`: phases 5, 6 and 11–16 marked as shipped, Phase 6's
  built insights ticked, and new sections for the **Owl Quest** redesign plan (§11),
  unplanned additions (§12) and a known-issues backlog (§13). `ROADMAP-v2.md` marked
  complete, Netlify note corrected. This runbook: local-testing warning + branch steps
  (§2), missing `gym:weeklyGoal`/`gym:syncedUserId` keys and the broken key table fixed
  (§3), `localStorage.clear()` note (§5), usernames section updated for 14c/14d (§5l),
  known import-doesn't-sync issue (§6). `Documentation/Privacy.md` + `Privacy.pdf`
  updated for friends (what buddies and close friends can see). Deleted the old What's
  New / user-guide markdown and PDFs from `Documentation/` (replaced by the in-app pages
  in Phases 13 and 16; still in git history). Stale code comments fixed in `index.html`,
  `auth.js` and `app.js` (comments only, no behaviour change). The Settings → Privacy & data card no longer says "Only you can see your data" (not true since close friends) and its delete text now mentions friends details. What's new entry added for the privacy wording. Cache `v49`.

- **2026-07-28** — **Back button on the What's new page (SHIPPED 2026-07-28):** the page
  is opened with `target="_blank"`, which is fine in a browser but traps you when the app
  is installed to a home screen — that window has no chrome, so no back arrow and no
  address bar. Added a `← Back` control to the page's topbar. It's a real
  `<a href="index.html">` so it works without JavaScript, with a click handler that calls
  `history.back()` instead **only when `history.length > 1`** (i.e. the page was opened in
  the same tab, where going back returns you to the Settings tab you left rather than
  reloading the app onto Today). Opened in a new tab, `history.length` is 1 and the plain
  href runs. Per §5m the styling lives in the page's own `<style>` block, not `styles.css`.
  Cache `v48`.

- **2026-07-28** — **Per-exercise workout notes + exercise-count fix (SHIPPED 2026-07-28):**
  suggested by one of the owner's friends. Each exercise in workout mode
  now has a **📝 Add note** button that reveals a small textarea (`buildWorkoutNote()` in
  `app.js`). The text is stored as `note` on the session **entry** — deliberately inside
  the existing `entries` JSON column, so Supabase needed **no schema change** and notes
  sync with the workout for free. It saves on every keystroke via `persistActiveSession()`
  and never redraws the list (that would steal focus mid-sentence). Notes are **private**:
  `showSessionDetail()` gained a third `hideNotes` argument and `friends.js` passes `true`,
  so a close friend viewing your workout sees everything except what you wrote. Notes
  belong to one dated session, not to the exercise in your plan — next week's workout
  starts blank. (Not to be confused with the `notes` field on `Exercise`, which is still
  an unused placeholder with a column in the `exercises` table and no UI.)
  A note is only useful if it comes back, so workout mode also shows the **last** note
  for each exercise under the existing "Last time:" hint (`buildLastNoteHint()`). That
  uses its own lookup, `findLastNoteForExercise()`, rather than reusing
  `findLastTimeForExercise()` — the latter skips workouts where nothing was ticked, but
  "shoulder hurt, skip next week" is precisely the note you write on a day you didn't
  train. The hint always carries its own date, since the note can be older than the sets
  quoted on the line above it, and it's clamped to three lines (full text on hover).
  Same change fixes a counting bug: Recent workouts printed `session.entries.length`,
  i.e. every exercise **planned** for the day, so planning 3 and training 1 read
  "3 exercises". Now uses `sessionExercisesDone()` (entries with ≥1 set ticked), matching
  how the sets figure has always worked, plus a `pluralise()` helper so it says
  "1 exercise". Fixed in both `app.js` (your history) and `friends.js` (a friend viewing
  yours). Cache `v47`.

- **2026-07-25** — **What's new page: styling moved into the page + nicer rows (on `dev`,
  released to `main` 2026-09-29):** the folded rows rendered as unstyled OS buttons ("24 JulFriends…")
  because the service worker was serving a `styles.css` from before Phase 16 — the page was
  new, the stylesheet wasn't. Fixed properly by moving the page's component CSS into a
  `<style>` block in `whats-new.html`, so it can never lag behind the page again;
  `styles.css` keeps the shared tokens and the in-app link. Rows were redesigned at the
  same time: date as a lavender pill, bolder title, a chevron in a soft circle that rotates
  on open, a faint mint tint on the open row, and the bullets tucked behind a left rule.
  Cache `v46`.

- **2026-07-25** — **Phase 16 — What's new page (released to `main` 2026-09-29):** a
  standalone `whats-new.html`, opened in a new tab from **Settings → 🗞️ What's new**,
  listing releases newest-first: the latest in full with a warm intro, older ones folded
  to a tappable line each. Content lives in `RELEASES` at the top of `whats-new.js`, which
  the app also loads so it can show an unread dot (on the Settings tab and the button)
  by comparing the newest date against `gym:whatsNewSeen`. History starts with one
  "everything before July" summary entry, as agreed. Page is in `APP_SHELL` so it works
  offline, and it follows the app's dark-mode setting. See §5m. Cache `v45`.

- **2026-07-25** — **Copy pass: fewer em dashes (released to `main` 2026-09-29):** the
  owner felt the app's writing leaned on "—" too heavily and it read as machine-written.
  Every user-visible em dash was rewritten as a full stop, comma, colon or joining word,
  across `index.html`, `app.js`, `friends.js`, `guide.js`, `auth.js` and the Friends
  what's-new note. Two were **kept**: the `—` placeholders in the hero date and the weight
  box, where it's a glyph meaning "nothing here yet" rather than punctuation. Also fixed
  two stale strings found on the way: the empty Friends state still said "add someone by
  email" (usernames work now), and the workout-detail title separator became "·" to match
  the rest of the app. Code comments and the internal docs were left as they are.
  Cache `v44`.

- **2026-07-25** — **Phase 15 — close friends became mutual (released to `main` 2026-09-29):** SQL from `Documentation/SQL-Phase15-CloseFriendRequests.sql` (owner ran it):
  a `close_requests` table, a `close_requested` flag on `friendships` so a brand-new
  friend request can carry the intent, and `accept_close_request()` /
  `end_close_friendship()` as `SECURITY DEFINER` — acceptance has to write BOTH grant
  rows, and normal RLS lets you write only your own. `friend_directory()` gained
  `close_asked_by_me` / `close_asked_by_them`. In the app: the ⭐ button became a small
  state machine (Ask → Asked ⭐ → Accept/Decline → ⭐ Close friends), a tickbox on the
  add-friend form asks in the same breath, accepting a friend request that asked for close
  prompts once for both, and ending it now ends both sides. The **one-way share was kept**
  as "Share mine only". Guide updated. See §5j. Cache `v43`.

- **2026-07-25** — **Phase 14d — add a friend by handle (released to `main` 2026-09-29):**
  the add-friend box now takes **either** a username or an email. A leading `@` is
  stripped, then anything still containing an `@` is treated as an email and anything else
  as a handle (checked against the format rule before the database is asked), so
  `mintyowl42`, `@mintyowl42` and `them@example.com` all work. Buddy cards and incoming
  requests now show the person's `@handle` under their display name. `addFriendByEmail()`
  became `addFriend()`. The guide's Friends section was updated to match. Cache `v42`.

- **2026-07-25** — **Sign-up: confirm your email (released to `main` 2026-09-29):** the
  login panel now has a **sign-up mode**. Pressing "Sign up" reveals a **Confirm email**
  box (and relabels the button "Create account"); pressing it again creates the account,
  refusing if the two addresses don't match (compared case-insensitively). Pressing
  "Log in" always returns the form to plain log-in and clears the confirm box. A typo'd
  address otherwise locks someone out of both their account and any reset email.
  Cache `v41`.

- **2026-07-25** — **Phase 14c — pick your own username (released to `main` 2026-09-29):**
  **Settings → Friends → Username** is now an editable box with a live ✓/✗ availability
  check (debounced ~400ms) and a Save that re-checks server-side. **The sign-up field
  added in 14b was removed**: it showed on the login form too, and it could only check a
  name's shape — a taken handle was swapped for a generated one, silently when the name
  was *reserved* (that path discarded the choice before any insert, so no alert fired).
  Everyone now gets a generated handle at row creation and renames it here, where the
  check actually works. Cache `v40`.

- **2026-07-25** — **Phase 14a/14b — usernames (released to `main` 2026-09-29):** the
  database side ran from `Documentation/SQL-Phase14-Usernames.sql` (+ the
  `SQL-Phase14-ReservedHandles.sql` follow-up): a unique, format-checked `username` on
  `user_directory`, everyone backfilled with a readable handle (`mintyowl42`),
  `is_username_available()`, `find_user_by_username()`, and `friend_directory()` extended
  to return usernames. In the app: an optional **Username** box on the sign-up form
  (shape-checked live), and `ensureMyDirectoryRow()` now always sets a handle — claiming
  the one you asked for, or generating one if it's taken or you skipped it. Older accounts
  with no handle get one on their next login, so the backfill never needs repeating.
  Settings → Friends shows your handle read-only (14c makes it editable). See §5l.
  Cache `v39`.

- **2026-07-25** — **Renamed to Athena's Arena (released to `main` 2026-09-29):** the top
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

- **2026-07-25** — **Phase 13 — in-app guide (released to `main` 2026-09-29):** new
  `guide.js` + **Settings → 📖 How to use**, opening a full-screen sheet: three numbered
  starting steps, then a collapsible section per tab and an "Easy to miss" list. Also
  reachable via "New here? Take the tour" on the empty Today/Schedule states
  (`createEmptyState` gained optional button arguments). All wording lives in two lists at
  the top of `guide.js`. **`Documentation/USER-GUIDE.md` was deleted** — the in-app guide
  replaces it, and the README now points there. See §5k. Cache `v36`.

- **2026-07-25** — **Phase 12d + 12e — finishing Friends, and loading states (on `dev`,
  released to `main` 2026-09-29):**
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

- **2026-07-25** — **Phase 12c — nudges you can actually see (released to `main` 2026-09-29):** unseen nudges now pop a friendly toast when the app opens (several at once
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

- **2026-07-24** — **Phase 12a/12b — friends (released to `main` 2026-09-29):** the
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

- **2026-07-24** — **Phase 11 — weekly recap (released to `main` 2026-09-29):** a
  **"Last week"** card on Progress (under "This week") showing workouts vs goal, sets,
  volume, week streak and any PRs set last week — plus the same recap once per week as a
  dismissible **"Your week in review 🎉"** card at the top of Today. Pure client-side; the
  only thing stored is the dismissal flag `gym:recapSeen:<profileId>:<monday>` (per device,
  auto-tidied, cleared by "Delete my data"). The Today card is skipped after a blank week.
  Small refactor: `sessionVolume()` lifted out of `buildVolumeTrend` so both features share
  one definition. See §5i. Cache `v32`.

- **2026-07-24** — **Phase 10 — drag-to-reorder exercises (released to `main` 2026-09-29):** SQL migration added a `sort_order` column to the Supabase `exercises` table;
  the app now stores `sortOrder` per exercise, sorts every view by it
  (`sortExercisesByOrder`), and adds a ⠿ drag handle on Schedule cards (Pointer Events,
  touch-friendly, reorder within a day only). New exercises land at the end of their day;
  the first drag on a day renumbers it. Cloud-first write with the offline guard. See §5h.
  Cache `v30`.

- **2026-07-19** — **Phase 9b — kg/lb unit setting (released to `main` 2026-09-29):**
  new **Settings → Weight unit** dropdown; every weight in the app now reads through
  `formatWeight()` / `unitLabel()` instead of a bare number or a hard-coded "kg".
  **Display only** — saved weights are never converted, so history and PRs are
  untouched. Saved per device in `gym:unit` (not synced), like the theme. See §5g.
  Cache `v29`.

- **2026-07-19** — **Phase 9 — "last time" hints (released to `main` 2026-09-29):** in
  workout mode each exercise now shows a small grey `Last time (Mon, Jul 14): 40 kg × 10,
  10, 8` line under its name, computed live from completed sessions (same profile, any
  day, ≥1 ticked set; the current workout is excluded). No history = no line; nothing new
  is stored and no prefills changed. See §5f. Cache `v28`.

- **2026-07-19** — **Phase 8 — exercise suggestions (released to `main` 2026-09-29):**
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
