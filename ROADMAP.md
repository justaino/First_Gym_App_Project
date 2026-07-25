# Athena's Arena — Build Roadmap

A phased plan to follow while building the app with Claude Code. Build one phase at a
time. Don't start a phase until the previous one works and is committed to git.

---

## 1. Vision

Athena's Arena is a friendly, personal gym app where I can set up a profile, add
exercises (with sets, reps, an emoji icon, and a day of the week), and see my plan
grouped by day. Later phases add a workout mode, a rest timer, and simple progress
tracking.

**Look & feel:** soft pastel "cute" style (cream background, rounded white cards,
pill buttons, friendly emoji icons, floating bottom tab bar).

---

## 2. Technical approach (fixed for the whole project)

- Plain **HTML + CSS + vanilla JavaScript**. No frameworks (no React/Vue), no build
  step, no npm packages.
- All data saved in the browser with **localStorage**.
- Runs by opening `index.html` with the **Live Server** VS Code extension.
- This is a learning project — code should be well-commented and built in small steps.

> These rules are also in `CLAUDE.md` so Claude Code follows them automatically.

---

## 3. Design system (the "cute" look)

| Token            | Value                          | Used for                         |
|------------------|--------------------------------|----------------------------------|
| Background       | `#FAF6EE` (warm cream)         | Page background                  |
| Card             | `#FFFFFF`, radius `24px`       | Cards, with soft diffuse shadow  |
| Text             | `#2E2E33` (charcoal)           | Headings & body                  |
| Muted text       | `#9A9A9A`                      | Secondary labels                 |
| Coral            | `#EF7C7C`                      | Primary buttons / "today"        |
| Mint / teal      | `#5FC4BC`                      | Active states / accents          |
| Butter yellow    | `#F6D365`                      | Highlights                       |
| Lavender         | `#B9A7E0`                      | Highlights                       |
| Font             | Nunito or Quicksand (Google)   | Rounded, friendly                |

Buttons are pill-shaped with soft pastel fills. The active item gets a tinted pastel
chip. The bottom tab bar floats, is white and rounded, with icon + label, active tab
tinted. Icons are emoji.

---

## 4. Data model (shared mental model for me and Claude Code)

```
Profile  = { id, name, createdAt }
Exercise = { id, profileId, name, sets, reps, icon (emoji), day (Mon..Sun), notes }
Session  = { id, profileId, date, entries: [{ exerciseId, setsDone, weight }] }   // Phase 2+
```

localStorage keys (suggested): `gym:profiles`, `gym:activeProfileId`,
`gym:exercises`, `gym:sessions`.

---

## 5. Phases

### Phase 0 — Setup ✅
**Goal:** an empty app that loads in the browser, under git.
- ✅ Create project folder and open it in VS Code
- ✅ Scaffold `index.html`, `styles.css`, `app.js`
- ✅ Apply the cream background + font + one test card (to confirm the look)
- ✅ Install Live Server; confirm the page loads and auto-refreshes
- ✅ `git init` + first commit

**Done when:** a styled blank page loads via Live Server and is committed.

*Claude Code prompt:* "Scaffold a plain HTML/CSS/JS project with index.html, styles.css,
app.js. Apply the design system in ROADMAP.md (cream background, Nunito font, one sample
rounded white card). Tell me how to run it with Live Server, then set up git with an
initial commit."

---

### Phase 1 — Profiles + exercises (the MVP) ✅
**Goal:** create a profile, add/edit/delete exercises, see them grouped by day.
- ✅ Create a profile (name only) and pick the active profile
- ✅ Add exercise: name, sets, reps, emoji icon (from a preset list), day of week
- ✅ Main screen: exercises grouped by day, each card shows emoji + name + "3 × 10"
- ✅ Edit an exercise
- ✅ Delete an exercise
- ✅ Data persists after refresh (localStorage)

**Done when:** I can add a few exercises across different days, refresh, and they're
still there, all in the cute style.

*Claude Code prompt:* use the full Phase 1 prompt (with the screenshot attached) that
we drafted. Remind it: Phase 1 only, then stop.

**Test checklist:** add 3 exercises on different days → refresh → still there → edit one
→ delete one → switch profile → each profile keeps its own exercises.

---

### Phase 2 — Workout mode + rest timer ✅
**Goal:** actually train against a day's plan.
- ✅ "Start workout" for a chosen day shows that day's exercises
- ✅ Tick off each set as done
- ✅ A rest timer (e.g. 60/90/120s) with a sound or visual cue
- ✅ Save the finished session to history (date + what was done)

**Done when:** I can run through a day, tick sets, use the timer, and the session is
saved.

**Test checklist:** start a day → complete sets → timer counts down → finish → session
appears in history → refresh → still saved.

---

### Phase 3 — Progress + backup ✅
**Goal:** see whether I'm showing up and improving.
- ✅ "This week" summary (workouts done, sets completed)
- ✅ A simple per-exercise chart or count over time (plain JS/SVG, no library if possible)
- ✅ Optional weight per set, stored in the session
- ✅ Export all data to a JSON file, and import it back (manual backup)

**Done when:** the progress screen reflects my real history and I can export/import a
backup file.

---

### Phase 4 — Polish ✅
- ✅ Friendly empty states ("No exercises yet — add your first 💪")
- ✅ A mascot illustration or nicer header art
- ✅ Tidy the bottom nav, spacing, and small animations
- ✅ Basic accessibility (labels, contrast, keyboard use)

---

## 6. Later / out of scope for now (would need a backend)

AI-generated plans, Apple Health / wearable data, social feeds, and video demos. These
need a server and a different skill set — note them, but don't let them block the phases
above.

> **Cross-device sync and real hosting** were originally listed here, but are now planned
> as Phase 5 and Phase 6 in **section 8** below.

---

## 7. How to work with Claude Code (the loop)

1. Ask for **one small thing** (a single task from the current phase).
2. **Review** what it proposes before approving — read the change, don't just say yes.
3. **Run it** in Live Server and test against the phase checklist.
4. If good, **commit** to git with a short message (e.g. `Phase 1: add exercise form`).
5. If not, tell Claude Code exactly what's wrong and iterate.
6. Only move to the next phase once the current one passes its "Done when".

**Tips**
- One feature per request beats one giant request — easier to review and fix.
- After a working step, commit. Git is your undo button.
- If a change breaks something, say so plainly; Claude Code can revert or fix.
- Keep this file open and tick the ✅ boxes as you go.

---

## 8. Beyond v1 — further phases

> Two different directions live here:
> - **Phase 6 (Insights) stays fully within the original rules** in section 2 (vanilla
>   JS, localStorage, no backend) — it just makes more of the data you already have.
> - **Phase 7 (accounts + cross-device sync) deliberately steps outside them** — data on
>   a server, accounts to maintain, a small ongoing cost. Do that one only when you've
>   decided you want sync, with eyes open about the trade-offs.
>
> **Recommended order:** Phase 5 (done) → **Phase 6 Insights** (high value, low risk, no
> new infrastructure) → **Phase 7 sync** when you actually want cross-device data.

### Phase 5 — Real hosting + installable app (PWA) ☐
**Goal:** the app lives at a public URL and can be installed on a phone's home screen.
Data is still **localStorage**, so it stays per-device (no sync yet) and privacy is
unchanged — this phase is purely "make it a real, installable app."
- ✅ Hosting on a static host — **GitHub Pages** (repo is public), live at
      `https://justaino.github.io/First_Gym_App_Project/` (replaced the old Netlify site)
- ✅ Add a web app **manifest** (app name "Justaino", theme colour, `display: standalone`)
- ✅ Add app **icons** (the uploaded owl on a lavender background, 192/512 + Apple)
- ✅ Add a **service worker** (`sw.js`) that caches the app shell so it works offline
- ✅ Add an in-app **"Install app" button** (real prompt on Android/desktop; how-to
      steps on iOS, which has no install API)
- ☐ Test **"Add to Home Screen"** + offline on a real phone

**Done when:** I can open the public URL on my phone, install it to the home screen, and
use it offline — each device still keeps its own separate data.

### Phase 6 — Insights (stays within the original constraints) ☐
**Goal:** turn the saved workout data into motivating insights, shown on the Progress
tab. Pure client-side — plain JS computed over `gym:sessions`/`gym:exercises`, no backend,
data stays per-device. Build **one insight/card at a time**. The specific insights are the
owner's to choose; candidates below (✅ = picked for the first build).

*Consistency / "showing up":*
- ☐ Current streak (consecutive weeks or days trained) + longest-ever streak
- ☐ Days shown up (this week / this month / all-time)
- ☐ Calendar heatmap of recent training days
- ☐ Favourite training day ("you train most on Wednesdays")

*Strength & progress:*
- ☐ Personal-records board (heaviest weight per exercise + the date) — reuses the PR
      logic already written for the easter egg
- ☐ Total volume (sets × reps × weight) trended over time
- ☐ Trend callouts (e.g. "Squat +10kg since you started")
- ☐ Estimated 1-rep-max per lift (optional / more advanced)

*Totals & goals:*
- ☐ Lifetime totals (workouts / sets / reps / total weight moved)
- ☐ Weekly goal (e.g. 3 workouts) with a progress ring

**Suggested first build (Phase 6a):** a single "Insights" card on Progress with **current
streak + days shown up + lifetime totals + PR board** — all from data/logic we already have.

**Done when:** the Progress tab shows accurate, motivating insights from real saved
workouts, with friendly empty states when there's no data yet.

### Phase 7 — Accounts + cross-device sync (Supabase) ✅
**Goal:** log in and see/edit the same workouts on any device, and have data survive
clearing the browser or switching phones.

> ✅ **SHIPPED (2026-06-26):** all of Phase 7 (7a–7h) is done, tested, and **merged to
> `main`** — accounts + cloud sync are live for everyone. Cache shipped at **`v24`**.
> Future work goes back on `dev`. The notes below are kept as a reference for how it works.
> - **Where the code lives:** `supabase.js` (client + URL/publishable key), `auth.js` (login
>   gate, calls `onUserLoggedIn` in app.js on sign-in), and app.js section **“5b. CLOUD
>   SYNC”** (the `reconcile*`/`*FromCloud`/`*ToRow` helpers + write-through in
>   create/edit/delete for profiles, exercises, sessions).
> - **Sync model:** cloud = source of truth; `localStorage` = write-through cache. Login
>   reconciles per entity — cloud-wins for profiles/exercises, newest-wins **merge** for
>   sessions (so an un-pushed in-progress workout is never wiped).
> - **Gotchas already hit:** the project uses Supabase’s **new key system** (legacy anon JWT
>   is disabled → use the **publishable key**, already in `supabase.js`); SQL-created tables
>   needed explicit **`GRANT`s** to `anon`/`authenticated`. See RUNBOOK §“Cloud sync”.
> - **Rule reminder:** bump `CACHE_VERSION` in `sw.js` on any app-file change; ask before
>   committing/pushing.

**Decisions made:**
- **Backend = Supabase** (free tier). Chosen because it's SQL/Postgres (maps cleanly to
  the current `profiles`/`exercises`/`sessions` shapes), has built-in **Auth** + **Row-
  Level Security**, and its client loads from a **CDN `<script>`** so it fits the no-build
  setup. Firebase was the runner-up; **Power Platform was set aside (cost).**
- **This deliberately relaxes two hard rules** from section 2: it adds a **backend** and
  an **external JS library** (the Supabase client). Accepted for this phase only.
- **Built on a `feature/auth` branch** off `dev`, so `dev`/`main` stay releasable while
  this big change is in progress.
- **Security:** the app uses ONLY Supabase's **anon public key** (safe to ship, protected
  by Row-Level Security). The **`service_role` key must NEVER be committed** (repo is
  public).

**Data model in Supabase** (mirrors today's shapes + `user_id`):
- `profiles(id, user_id, name, created_at)`
- `exercises(id, user_id, profile_id, name, sets, reps, reps_per_set, weight,
  weight_per_set, icon, day, notes)`
- `sessions(id, user_id, profile_id, date, day, status, entries jsonb, updated_at)`
  — `entries` stays as JSON to match the nested per-set shape with minimal restructuring.
- **Row-Level Security** on every table: a user can only read/write rows where
  `user_id = auth.uid()`.

**Steps (incremental — one at a time, test each, commit on `feature/auth`):**
- ✅ **7a — Project setup:** free Supabase project created; URL + publishable key noted.
      (Project uses the new key system — the legacy anon JWT was disabled.)
- ✅ **7b — Schema + security:** `profiles`/`exercises`/`sessions` tables + Row-Level
      Security created. Note: tables made via SQL needed explicit `GRANT`s to
      `anon`/`authenticated` (dashboard-made tables get these automatically).
- ✅ **7c — Connect the client:** `supabase.js` loads `supabase-js` from a CDN and creates
      the client with the URL + **publishable key**.
- ✅ **7d — Auth UI:** `auth.js` adds a login / sign-up gate (email + password) + a logout
      card in Settings; the app is hidden until signed in.
- ✅ **7e — Swap the data layer:** profiles, exercises, and sessions all read/write through
      Supabase, with `localStorage` as a write-through cache. Login reconciles per entity
      (cloud-wins for profiles/exercises; a newest-wins **merge** for sessions).
- ✅ **7f — First-login migration:** folded into the login reconcile — existing local data
      is uploaded when the cloud is empty, with a one-time "your data is saved" notice.
- ✅ **7g — Offline handling.** Two parts, both done (code-complete, awaiting owner test):
      1. ✅ **Vendored the Supabase library locally.** Downloaded `supabase-js@2` (UMD,
         v2.108.2) into `vendor/supabase.js`; `index.html` now loads that local copy instead
         of the CDN; added `./vendor/supabase.js` to `APP_SHELL` in `sw.js`; bumped the cache
         to `v19`. The app shell can now be cached, so it loads with DevTools set to Offline.
      2. ✅ **Friendly offline handling for writes.** Took the minimal "inform + block"
         approach for the **cloud-wins** entities (profiles/exercises): new helpers
         `isOffline()` / `blockedByOffline()` / `reportCloudWriteError()` (in app.js, just
         above the PROFILE ACTIONS section). `createProfile`, `deleteProfile`,
         `deleteExercise`, and `handleExerciseFormSubmit` bail out early with a friendly
         "You're offline 📡 — reconnect to make changes" alert (instead of a scary error),
         and a mid-request drop also shows the friendly message. Reads still work (from the
         localStorage cache). **Workouts are deliberately left usable offline** — sessions
         use a newest-wins **merge**, so an in-progress workout done offline survives and
         uploads on reconnect. A full offline write-queue for plan edits remains a future
         enhancement.
- ✅ **7h — Privacy note + release.** (Decisions: deletion = self-serve "Delete my data"
      button [Option A]; password reset deferred to a later phase; email confirmation is OFF.)
      1. ✅ **Privacy note + data controls** (built, awaiting owner test): a short privacy line
         on the **login screen**; a **Settings → "Privacy & data"** card explaining what's
         stored (email + workout data) / where (Supabase, third-party) / how to delete it; a
         **"Delete my data"** button (`deleteAllMyData()` in app.js) that wipes all the user's
         cloud rows + local cache then logs out (does NOT delete the auth login itself — that
         needs admin access, so it's a "email the owner" step); and a `Documentation/Privacy.md`.
         Cache bumped to `v22`.
      2. ✅ **Tester docs** (built, awaiting owner review): `Documentation/WhatsNew_Accounts_2026-06-26.md`
         covers signing up, cross-device sync, the first-login migration, offline behaviour,
         and the privacy/delete controls (+ a note that password reset isn't built yet).
      3. ✅ **Release (2026-06-26):** owner tested everything, then we bumped `CACHE_VERSION`
         to `v24`, removed the "WIP" pointer from CLAUDE.md, and merged `feature/auth` → `dev`
         → `main` — accounts + cloud sync are now live for everyone.

**Watch-outs:** free Supabase projects **pause after ~1 week of inactivity** (resume with
a click); configure email-confirmation settings for testing; never break the offline
app-shell behaviour; only the anon key in client code.

**Done when:** I can log in on my laptop and my phone and see/edit the same workouts on
both; a brand-new device shows my data after login; and after clearing local data and
logging back in, everything is restored.

---

## 9. Social & quality-of-life — Phases 8–12 (planned 2026-07-19)

> **Decisions made:**
> - A visual redesign was considered (5 mockup variants) and **parked for now** — no
>   styling changes in these phases. New UI must simply match the current design system
>   (section 3).
> - Friend requests are **in-app only** (no real emails sent — that would need an Edge
>   Function + a third-party email service; maybe later).
> - Phases 8, 9, and 11 are pure client-side. Phases 10 and 12 touch Supabase (small SQL
>   migrations the owner runs in the SQL editor, like Phase 7).
>
> **Standing rules for every phase (from CLAUDE.md — non-negotiable):** work on `dev`;
> one phase at a time, STOP after each for owner testing; comment code for a beginner;
> bump `CACHE_VERSION` in `sw.js` with any app-file change; ask before committing; never
> merge/push without being asked; never claim to have run the app; update RUNBOOK.md as
> you go. For SQL steps: hand the owner the script, **wait for confirmation it ran**
> before writing app code against it. (Reminder: SQL-created tables need explicit
> `GRANT`s to `anon`/`authenticated` — see RUNBOOK §Cloud sync.)

### Phase 8 — Exercise suggestions ✅ *(shipped to `main` 2026-07-24 — cache `v31`)*
**Goal:** stop typing exercise names from scratch.
- ✅ New file `exercise-library.js` (loaded before `app.js` in `index.html`, added to the
  service-worker `APP_SHELL`): a plain array `EXERCISE_LIBRARY` of ~90 common exercises,
  each `{ name, icon, muscleGroup, defaultSets, defaultReps }`, covering chest, back,
  shoulders, arms, legs, core, cardio (+ a small Mobility group). Icons come from the
  app's preset emoji list — `EMOJI_PRESETS` grew from 7 to 14 to cover the library.
- ✅ In the add/edit-exercise modal: typing in the name field shows up to 5
  case-insensitive matches in a dropdown styled like the app (white card, rounded,
  shadow) — emoji + name + muscle group + "3×10". Tapping one fills the name, selects
  the emoji, and applies default sets/reps **only if the owner hasn't already changed
  them**. Arrow keys + Enter select; Escape or an outside tap closes; typing a custom
  name keeps working exactly as before.

**Done when:** typing "ben" offers Bench press etc.; picking it fills the form; a
made-up name still saves fine. **Test:** phone + desktop, add and edit modes, keyboard
navigation, custom names.

### Phase 9 — "Last time" hints in workout mode ✅ *(shipped to `main` 2026-07-24 — cache `v31`)*
**Goal:** see what you lifted last time while training.
- ✅ Pure client-side, computed from saved sessions: for each exercise in the workout
  sheet, find the most recent **completed** session (same profile, any day) whose
  entries include that exercise (with ≥1 ticked set), and show a small muted hint line
  under the exercise name, e.g. `Last time (Mon, Jul 14): 40 kg × 10, 10, 8`. The
  in-progress workout is excluded, so the hint doesn't shift as you tick sets.
- ✅ No hint when there's no history (no empty boxes). Weightless history shows reps
  only; varied weights are spelled out per set. Does not change any saved data or
  prefills.

**Done when:** a repeat workout shows accurate last-time lines; a brand-new exercise
shows nothing. **Test:** finish a workout → start the same day again → hints match.

### Phase 9b — Weight unit (kg / lb) ✅ *(shipped to `main` 2026-07-24 — cache `v31`)*
**Goal:** stop assuming kilograms. Added on 2026-07-19 after Phase 9 introduced the
app's first hard-coded unit label. Pure client-side.
- ✅ **Settings → Weight unit** dropdown (kg / lb), saved in `gym:unit` in
  localStorage. Like the theme this is **per device and not synced** — no SQL needed.
- ✅ **Display only — weights are never converted.** A set saved as `40` stays `40`
  and just reads `40 lb`. (Decided against conversion: it would rewrite real history,
  add rounding drift to PRs/volume, and conflict across synced devices.)
- ✅ Every weight in the app goes through `formatWeight(n)` → `"40 kg"` or
  `unitLabel()` → `"kg"`: schedule summaries, form labels, the workout-sheet Weight
  column, Phase 9 "last time" hints, history detail, chart tooltips + legend, the
  Insights "kg moved" tile, PR board, "since you started" trends, monthly volume, and
  the PR celebration card.

**Done when:** switching to lb relabels every screen immediately, and switching back
leaves all saved numbers exactly as they were. **Test:** switch mid-workout; check
Progress + Insights; confirm the setting survives a refresh and stays per-device.

### Phase 10 — Drag-to-reorder exercises ✅ *(shipped to `main` 2026-07-24 — cache `v31`)*
**Goal:** control the order of exercises within a day (currently fixed).
- ✅ **SQL first (owner ran 2026-07-24):** `alter table exercises add column if not
  exists sort_order integer;` (table-level GRANTs already cover the new column, so no
  new grants/RLS needed).
- ✅ Added `sortOrder` to the Exercise shape (normalized like the Phase-2 per-set fields:
  older exercises without it keep working). All views (Schedule, Today, workout mode)
  sort by `sortOrder` via `sortExercisesByOrder`, falling back to current order for
  legacy rows (legacy first, numbered after). New exercises go to the end of their day
  (`nextSortOrderForDay`); an edit that changes an exercise's day moves it to the end of
  the new day.
- ✅ Schedule view: a ⠿ drag handle on each exercise card. Drag within the same day's
  list container using **Pointer Events** (touch-friendly; `touch-action: none` stops
  the page scrolling); the card moves live to show the drop position. On drop, renumber
  that day's exercises (0,1,2,…) and save cloud-first + localStorage, with the Phase-7g
  offline block (order snaps back with the friendly message when offline).

**Done when:** reordering sticks after refresh AND appears on a second logged-in device;
workout mode follows the new order. **Test:** reorder on phone by touch; go offline →
friendly message, order unchanged.

### Phase 11 — Weekly recap ✅ *(built 2026-07-24 — on `dev`, cache `v32`, awaiting owner test)*
**Goal:** a motivating "your week" summary. Pure client-side.
- ✅ A "Last week" recap card on the **Progress** tab, placed under the existing "This
  week" card: workouts done vs weekly goal, total sets, total volume (reps × weight, in
  the Phase-9b unit), any PRs set last week (same rule as the after-workout celebration —
  last week's best must beat the best from before that week), and the current week
  streak. Friendly empty state if last week was empty; the card is skipped entirely when
  there's no history at all. All figures reuse the existing helpers (`entrySetsDone`,
  `sessionVolume`, `computeWeekStreak`, `loadWeeklyGoal`) so they match the rest of
  Progress. `sessionVolume` was lifted out of `buildVolumeTrend` to be shared.
- ✅ On the **first app open in a new week**, the same recap appears once as a
  dismissible celebration card at the top of Today ("Your week in review 🎉", butter
  outline). Dismissal is remembered per profile per week in
  `gym:recapSeen:<profileId>:<mondayKey>` (profile id added so several profiles on one
  device each get their own recap); older keys are tidied away when a new one is written,
  and "Delete my data" clears them all. After a **blank** week the Today card doesn't
  appear at all — no telling-off.

**Done when:** numbers match the Progress tab's own stats for last week; the Today card
appears once per week and stays dismissed. **Test:** fake the week key to simulate a new
week; empty-history case.

### Phase 12 — Friends + nudges ☐
**Goal:** add friends, see if they trained today, peek at their workouts, and nudge them.
In-app only — no emails. Data refreshes on app open / tab visit (no push notifications;
that's out of scope for a PWA on iOS).

> **Decision (2026-07-24) — two levels of friend.** Everyone you accept is a *friend*:
> they see only that you trained (went-today tick + workouts-this-week) and can nudge
> you. Promote someone to *close friend* and they can open your actual workouts (sets,
> reps, weights, exercise names). This is enforced in the database, not just in the UI —
> a plain friend can't read the workout rows at all. It's **one-directional** (marking
> someone close controls what *they* see of *your* data), so nobody can promote
> themselves. Consequences for the spec below: a `close_friends` table; the `sessions`
> read policy is close-friends-only and a matching one covers `exercises` (names);
> ordinary friends get their counts from a `friend_activity()` aggregate function that
> can't leak dates, weights or names. Script written: `Documentation/SQL-Phase12-Friends.sql`.

- ✅ **12a — SQL (owner ran 2026-07-24; verified via the script's own checks):** one
  commented script (`Documentation/SQL-Phase12-Friends.sql`) creating:
  - `user_directory(user_id pk → auth.users, email unique lowercased, display_name,
    share_workouts boolean default true)` — the app upserts the signed-in user's own row
    at login. RLS: each user can read/update only their own row.
  - `find_user_by_email(text)` — a `SECURITY DEFINER` function returning `(user_id,
    display_name)` for an exact email match, so emails are never browsable.
  - `friendships(id, requester_id, addressee_id, status 'pending'|'accepted',
    created_at, unique (requester_id, addressee_id))`. RLS: participants read their own
    rows; requester inserts (status `pending` only, not to self, no duplicate pair in
    either direction); addressee updates status to `accepted`; either side deletes.
  - A new **SELECT policy on `sessions`**: accepted friends may read a user's sessions
    when that user's `share_workouts` is true (owner's own access unchanged).
  - `nudges(id, from_user, to_user, created_at, seen boolean default false)`. RLS:
    sender inserts only toward an **accepted** friend; recipient reads + marks seen.
    A unique index on `(from_user, to_user, (created_at::date))` = max one nudge per
    friend per day, enforced server-side.
  - Explicit `GRANT`s for all of the above.
- ✅ **12b — Friends tab (built 2026-07-24 — `friends.js`, cache `v33`, awaiting owner
  test; also added Settings → "Your name to friends" and fixed the cloud pulls to filter
  by `user_id`, which the new friend-read policies made necessary):** a 5th tab (🤝 Friends). Add-friend form (email → lookup →
  request; friendly "no account with that email" error). Incoming requests with
  Accept / Decline. Buddy list: display name, "Went today ✅" (a completed session dated
  today) or "Not yet 💤", workouts-this-week count, a **👋 Nudge** button (becomes
  "Nudged! ✓" and disables until tomorrow once used), and a remove-friend option
  (confirm first). Plus a **Friend / Close friend** toggle per buddy (default Friend)
  writing `close_friends`. Tapping a buddy shows their recent workouts via the existing
  session-detail modal — only if they've made *you* a close friend and still share;
  otherwise the card isn't tappable and says "… shares workout details with close
  friends".
- ✅ **12c — Today-tab tie-ins (built 2026-07-25 — cache `v34`, awaiting owner test):** a
  small "Gym buddies" card (hidden with no friends) showing each friend's went-today
  status; on app open, unseen nudges show a friendly toast — "👋 Amara nudged you — go get
  that workout!" (several collapse into one message). Added beyond the original spec at
  the owner's request: a coral **dot on the 🤝 tab** while a request or unseen nudge is
  waiting, and a "👋 Nudged you today" line on the sender's card. Nudges are marked seen
  when the Friends tab is opened (not by the toast) so the dot survives until you've
  actually looked.
- ✅ **12d — Settings + polish (built 2026-07-25 — cache `v35`, awaiting owner test):**
  "Share my workouts with friends" toggle (writes `share_workouts`); friends data uses the
  existing offline handling (reads say "reconnect to see friends"; writes use the friendly
  offline block); empty states; a short `Documentation/WhatsNew_Friends_2026-07-25.md` for
  testers. "Delete my data" now also removes the user's directory row, friendships, nudges
  and close-friend rows.
- ✅ **12e — Collapsible buddies + loading states (added 2026-07-25 at the owner's
  request, cache `v35`):** the Today "Gym buddies" card folds away (heading keeps the
  count + "N went today"; remembered in `gym:buddiesOpen`). A reusable spinner
  (`createLoadingCard()`, `.spinner`, respects `prefers-reduced-motion`) now covers the
  three slow moments — login sync (full-screen overlay), the first Friends load, and
  opening a friend's workouts (the pop-up opens instantly with a spinner rather than after
  the fetch).

**Done when:** two accounts can request/accept, each sees the other's went-today status
and recent workouts, a nudge sent from one shows as a toast on the other's next open
(and can't be repeated until tomorrow), sharing can be switched off, and unfriending
works both ways. **Test with two accounts** (e.g. a second test email) on two browsers.

**Watch-outs:** free Supabase pauses after ~1 week idle; never expose more than
`display_name` via the lookup; keep `service_role` out of the repo; all friend reads
must fail soft when offline.

---

## 10. Guide & usernames — Phases 13–14 (planned 2026-07-25)

### Phase 13 — In-app guide ✅ *(built 2026-07-25 — `guide.js`, cache `v36`, awaiting owner test)*
**Goal:** a tester opening the app cold can work out what everything does. Replaces
`Documentation/USER-GUIDE.md` (decided — one copy, or they drift).

**Owner's decisions (2026-07-25), from the design review artifact:**
- **Layout: direction C** — a short "first three steps" sequence at the top (numbered,
  because it genuinely is an order), then direction A's accordion underneath as the
  reference half. Built as A first, with the hero and step list added on top.
- **Placement: Settings → "How to use"**, opening a full-screen sheet (the same pattern
  as workout mode). No sixth tab — the bar is already tight at five. Pair it with a
  "New here? Take the tour" line on the empty Today/Schedule states.
- **Easter eggs: mention only the ones you'd never otherwise find.** The owl long-press
  and the credits card stay unlisted.

- ✅ One collapsible section per tab (Today / Schedule / Progress / Friends / Settings),
  each a few short lines written from the user's side — no "sortOrder", no "RLS". A
  **Workout mode** section was added on top of the planned five: it's where most of the
  behaviour a beginner needs explaining actually lives.
- ✅ An **"Easy to miss"** section at the end for the findable-but-obscure (rest timer
  surviving a locked phone, ⠿ reorder, "last time" hints, kg/lb being display-only,
  backup, offline limits). The owl and credits card stay unlisted, per the decision above.
- ✅ Deleted `Documentation/USER-GUIDE.md`; README now points at the in-app guide.

**Done when:** a friend who has never seen the app can get from nothing to a finished
workout using only the guide. **Test:** read it on a phone; check both themes.

### Phase 14 — Usernames ✅ *(14a, 14c, 14d done 2026-07-25 — cache `v42`, awaiting owner test; 14b withdrawn)*
**Goal:** send a friend request by `@username` instead of an email address.

- ✅ **14a — SQL (owner ran 2026-07-25):** add `username` to
  `user_directory` with a unique index on `lower(username)` and a format check (3–20
  chars, letters/numbers/underscore); backfill existing users with readable generated
  names (e.g. `mintyowl42`); add `find_user_by_username()` and `is_username_available()`
  as `SECURITY DEFINER` functions alongside the email lookup.
- ❌ **14b — Sign-up: built 2026-07-25, then withdrawn the same day.** A username box on
  the sign-up form could only check a name's *shape*, because `is_username_available()`
  refuses callers who aren't logged in — and at sign-up you aren't. A taken handle was
  therefore swapped for a generated one after the fact, and **silently** when the name was
  *reserved* (that path discarded the choice before any insert, so no alert fired). It
  also showed on the login form, where it made no sense. Replaced by 14c; the useful half
  — always generating a handle, and filling in any row that lacks one — was kept.
- ✅ **14c — Changing it (built 2026-07-25):** Settings → Friends gained a **Username**
  box below "Your name to friends", with a **real** availability check — you're logged in
  here, so the database will answer. Debounced ~400ms while typing (mint "@name is free ✓"
  / coral "already taken"), re-checked on Save, and it copes with someone claiming the
  name in the seconds between. Safe to change — friendships are keyed on user id.
- ✅ **14d — Using it (built 2026-07-25):** the add-friend box accepts either. A leading
  `@` is stripped first, so `mintyowl42` and `@mintyowl42` both work; anything still
  containing an `@` is treated as an email. Handles are format-checked before the database
  is asked, and "no such username" reads differently from "no such email". Buddy cards and
  incoming requests show `@username` under the display name. The in-app guide was updated
  in the same change.

**Decisions:** username **and** display name both stay — display name for warmth,
username for uniqueness.

**Added alongside (2026-07-25):** the login panel gained a **sign-up mode** — pressing
"Sign up" reveals a *Confirm email* field before the account is created, so a typo can't
lock someone out of both their account and their reset email. This is also what makes the
form able to show sign-up-only fields at all, which was half the reason 14b's username box
felt wrong on it.

**Watch-out (accepted trade-off):** usernames are guessable in a way emails aren't, so
someone could probe for which accounts exist. They still can't see anything without an
accepted request. Rate-limiting the lookup is the fix if it ever matters.

### Phase 15 — Mutual close friends ✅ *(built 2026-07-25 — cache `v43`, awaiting owner test)*
**Goal:** asked for by the owner after testing Phase 14 — close friendship should be
something you agree to, not something one person decides alone.

- ✅ **15a — SQL (owner ran 2026-07-25):** `close_requests` (RLS: read/withdraw either
  side, send only to an accepted friend); `friendships.close_requested` so a new friend
  request carries the intent; `accept_close_request()` and `end_close_friendship()` as
  `SECURITY DEFINER` — acceptance must write *both* grant rows and ordinary RLS only lets
  you write your own, which is exactly what stops self-promotion;
  `friend_directory()` extended with the two pending-ask flags.
- ✅ **15b — App:** the ⭐ control became a state machine (Ask → Asked ⭐ → Accept /
  Decline → ⭐ Close friends); "Ask to be close friends too" on the add-friend form;
  accepting a friend request that also asked for close prompts once and settles both;
  ending it ends both sides, with wording that says so.

**Decisions:** the one-way share stays, as *Share mine only*. Asking an existing friend
opens your own side immediately (for a brand-new friend, both open on acceptance — you
can't share with someone who hasn't accepted you). Existing one-way grants were left
untouched by the migration.
