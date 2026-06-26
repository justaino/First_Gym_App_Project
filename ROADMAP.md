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

### Phase 7 — Accounts + cross-device sync (Supabase) ☐
**Goal:** log in and see/edit the same workouts on any device, and have data survive
clearing the browser or switching phones.

> 📍 **HANDOFF / CURRENT STATUS (for a fresh session):**
> - **Branch:** all Phase 7 work is on **`feature/auth`** (NOT yet merged to `dev`/`main`).
>   `git checkout feature/auth` and work there. Test locally with Live Server.
> - **Done & tested:** 7a–7f. Login + full data sync (profiles, exercises, sessions) work
>   across devices, with safe first-login migration. Cache is at **`v18`**.
> - **Remaining:** **7g (offline)** and **7h (privacy note + release)** — details below.
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
- ☐ **7g — Offline handling.** Two parts:
      1. **Vendor the Supabase library locally** so the app works offline again. Right now
         `index.html` loads `supabase-js` from a CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`),
         which the service worker can't cache (cross-origin) — so offline is currently
         broken. Fix: download that file into the repo (e.g. `vendor/supabase.js`), change
         `index.html` to load the local copy, add it to `APP_SHELL` in `sw.js`, and bump
         the cache. Verify the app loads with DevTools set to **Offline**.
      2. **Handle writes while offline.** Reads already work (they come from the
         `localStorage` cache). Writes currently `await` Supabase and `alert` on failure.
         *Recommended minimal approach:* detect offline (`navigator.onLine` / the cloud
         call failing) and show a friendly "You're offline — reconnect to save changes"
         message instead of a scary error, while keeping the app usable for viewing.
         ⚠️ Note: profiles/exercises use **cloud-wins** reconcile, so silently allowing
         offline edits could be overwritten on next sync — a full offline write-queue is a
         bigger task; keep 7g minimal (inform + block, or queue only if you do it
         carefully) and leave a proper queue as a future enhancement.
- ☐ **7h — Privacy note + release.**
      1. **Privacy note:** a short, friendly note covering *what's stored* (your email +
         your workout data), *where* (Supabase, a third-party cloud service), and *how to
         delete it* (e.g. delete your data/account). Put it somewhere discoverable — a line
         on the login screen and/or an entry in Settings — and/or a `Documentation/` note.
      2. **Update the tester docs** (a new `Documentation/WhatsNew_*.md`): friends will now
         need to **sign up**, and their existing local data migrates on first login.
      3. **Release:** bump `CACHE_VERSION`, remove the "WIP" pointer from CLAUDE.md, then
         merge `feature/auth` → `dev`, test, then `dev` → `main` (this publishes accounts to
         everyone — a big change, so double-check first).

**Watch-outs:** free Supabase projects **pause after ~1 week of inactivity** (resume with
a click); configure email-confirmation settings for testing; never break the offline
app-shell behaviour; only the anon key in client code.

**Done when:** I can log in on my laptop and my phone and see/edit the same workouts on
both; a brand-new device shows my data after login; and after clearing local data and
logging back in, everything is restored.
