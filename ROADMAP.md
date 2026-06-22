# Gym App — Build Roadmap

A phased plan to follow while building the app with Claude Code. Build one phase at a
time. Don't start a phase until the previous one works and is committed to git.

---

## 1. Vision

A friendly, personal gym app where I can set up a profile, add exercises (with sets,
reps, an emoji icon, and a day of the week), and see my plan grouped by day. Later
phases add a workout mode, a rest timer, and simple progress tracking.

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

### Phase 0 — Setup ☐
**Goal:** an empty app that loads in the browser, under git.
- ☐ Create project folder and open it in VS Code
- ☐ Scaffold `index.html`, `styles.css`, `app.js`
- ☐ Apply the cream background + font + one test card (to confirm the look)
- ☐ Install Live Server; confirm the page loads and auto-refreshes
- ☐ `git init` + first commit

**Done when:** a styled blank page loads via Live Server and is committed.

*Claude Code prompt:* "Scaffold a plain HTML/CSS/JS project with index.html, styles.css,
app.js. Apply the design system in ROADMAP.md (cream background, Nunito font, one sample
rounded white card). Tell me how to run it with Live Server, then set up git with an
initial commit."

---

### Phase 1 — Profiles + exercises (the MVP) ☐
**Goal:** create a profile, add/edit/delete exercises, see them grouped by day.
- ☐ Create a profile (name only) and pick the active profile
- ☐ Add exercise: name, sets, reps, emoji icon (from a preset list), day of week
- ☐ Main screen: exercises grouped by day, each card shows emoji + name + "3 × 10"
- ☐ Edit an exercise
- ☐ Delete an exercise
- ☐ Data persists after refresh (localStorage)

**Done when:** I can add a few exercises across different days, refresh, and they're
still there, all in the cute style.

*Claude Code prompt:* use the full Phase 1 prompt (with the screenshot attached) that
we drafted. Remind it: Phase 1 only, then stop.

**Test checklist:** add 3 exercises on different days → refresh → still there → edit one
→ delete one → switch profile → each profile keeps its own exercises.

---

### Phase 2 — Workout mode + rest timer ☐
**Goal:** actually train against a day's plan.
- ☐ "Start workout" for a chosen day shows that day's exercises
- ☐ Tick off each set as done
- ☐ A rest timer (e.g. 60/90/120s) with a sound or visual cue
- ☐ Save the finished session to history (date + what was done)

**Done when:** I can run through a day, tick sets, use the timer, and the session is
saved.

**Test checklist:** start a day → complete sets → timer counts down → finish → session
appears in history → refresh → still saved.

---

### Phase 3 — Progress + backup ☐
**Goal:** see whether I'm showing up and improving.
- ☐ "This week" summary (workouts done, sets completed)
- ☐ A simple per-exercise chart or count over time (plain JS/SVG, no library if possible)
- ☐ Optional weight per set, stored in the session
- ☐ Export all data to a JSON file, and import it back (manual backup)

**Done when:** the progress screen reflects my real history and I can export/import a
backup file.

---

### Phase 4 — Polish ☐
- ☐ Friendly empty states ("No exercises yet — add your first 💪")
- ☐ A mascot illustration or nicer header art
- ☐ Tidy the bottom nav, spacing, and small animations
- ☐ Basic accessibility (labels, contrast, keyboard use)

---

## 6. Later / out of scope for now (would need a backend)

Real password sign-up, syncing across devices, AI-generated plans, Apple Health /
wearable data, social feeds, and video demos. These need a server and a different skill
set — note them, but don't let them block the phases above.

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
- Keep this file open and tick the ☐ boxes as you go.
