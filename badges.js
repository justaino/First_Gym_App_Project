/*
  badges.js — feathers (badges) on the Badges tab (Owl Quest phase Q5).

  Like XP (xp.js) and the week path (week-path.js), feathers are WORKED OUT from
  the workouts you've already saved. Nothing is stored, so:
    - there are no database changes,
    - everyone's past workouts count straight away,
    - every device shows the same feathers.

  The "Your feathers" card at the top of the Badges tab shows every feather:
  earned ones in colour, locked ones in grey. Tap one to see how to earn it and
  how close you are. Underneath, "Next feather" is the locked one you're closest to.

  ── HOW TO CHANGE THE FEATHERS ───────────────────────────────────────────
  Edit the FEATHERS list below. Each feather says which number it measures
  (one of the names in computeFeatherStats) and the target to reach. Icons are
  Lucide names from icons.js. Bump CACHE_VERSION in sw.js afterwards.
  ─────────────────────────────────────────────────────────────────────────

  Loaded after app.js and xp.js, and uses their helpers (loadList,
  loadActiveProfileId, isCompletedSession, entrySetsDone, weekKeyOf, dayKeyOf,
  unitLabel, computeTotalXp, levelForXp, countPersonalRecords, iconSvg).
*/

/* =========================================================================
   1. THE FEATHERS — edit this list
   ========================================================================= */

// Each feather:
//   id      — a short unique name (never shown)
//   icon    — a Lucide icon name from icons.js
//   tone    — the medallion colour: "butter", "coral", "mint" or "lavender"
//   name    — what it's called
//   how     — how to earn it, in plain words
//   measure — which number from computeFeatherStats() it checks
//   target  — the number to reach
//   unit    — words for the progress line ("18 of 30 workouts"). Leave it out
//             for yes/no feathers, which just say "Not yet".
const FEATHERS = [
  // Showing up
  { id: "first-flight", icon: "egg", tone: "butter", name: "First Flight", how: "Finish your first workout.", measure: "workouts", target: 1, unit: "workout" },
  { id: "week-one", icon: "sprout", tone: "butter", name: "Week One", how: "Finish 7 workouts.", measure: "workouts", target: 7, unit: "workouts" },
  { id: "regular", icon: "repeat", tone: "butter", name: "Regular", how: "Finish 30 workouts.", measure: "workouts", target: 30, unit: "workouts" },
  { id: "fifty", icon: "badge-check", tone: "butter", name: "Fifty", how: "Finish 50 workouts.", measure: "workouts", target: 50, unit: "workouts" },
  { id: "century", icon: "gem", tone: "butter", name: "Century", how: "Finish 100 workouts.", measure: "workouts", target: 100, unit: "workouts" },

  // Streaks
  { id: "on-a-roll", icon: "flame", tone: "coral", name: "On a Roll", how: "Train at least once a week, 3 weeks in a row.", measure: "longestStreak", target: 3, unit: "weeks in a row" },
  { id: "unstoppable", icon: "rocket", tone: "coral", name: "Unstoppable", how: "Train at least once a week, 10 weeks in a row.", measure: "longestStreak", target: 10, unit: "weeks in a row" },
  { id: "busy-bee", icon: "zap", tone: "coral", name: "Busy Bee", how: "Do 4 workouts in one week (Monday to Sunday).", measure: "busiestWeek", target: 4, unit: "workouts in your busiest week" },
  { id: "weekend-warrior", icon: "calendar-check", tone: "coral", name: "Weekend Warrior", how: "Train on a Saturday and the Sunday straight after it.", measure: "weekendWarrior", target: 1 },

  // Strength
  { id: "first-record", icon: "trophy", tone: "mint", name: "First Record", how: "Beat your heaviest weight on any exercise.", measure: "records", target: 1, unit: "record" },
  { id: "record-breaker", icon: "crown", tone: "mint", name: "Record Breaker", how: "Set 10 personal records.", measure: "records", target: 10, unit: "records" },
  { id: "set-machine", icon: "dumbbell", tone: "mint", name: "Set Machine", how: "Tick 500 sets.", measure: "sets", target: 500, unit: "sets" },
  { id: "heavy-mover", icon: "weight", tone: "mint", name: "Heavy Mover", how: "Move 10,000 in total (reps × weight, added up).", measure: "weightMoved", target: 10000, unit: "{unit} moved" },

  // Habits
  { id: "mix-it-up", icon: "shuffle", tone: "lavender", name: "Mix It Up", how: "Train 10 different exercises.", measure: "differentExercises", target: 10, unit: "exercises" },
  { id: "note-taker", icon: "notebook-pen", tone: "lavender", name: "Note Taker", how: "Leave yourself 5 notes in your workouts.", measure: "notes", target: 5, unit: "notes" },
  { id: "early-bird", icon: "sunrise", tone: "lavender", name: "Early Bird", how: "Start a workout before 7am.", measure: "earlyBird", target: 1 },
  { id: "late-shift", icon: "moon-star", tone: "lavender", name: "Late Shift", how: "Start a workout after 9pm.", measure: "lateShift", target: 1 },

  // Levels (see xp.js)
  { id: "wings-out", icon: "bird", tone: "butter", name: "Wings Out", how: "Reach level 10 (Night Owl).", measure: "level", target: 10, unit: "levels" },
];

/* =========================================================================
   2. THE NUMBERS — worked out from your finished workouts
   ========================================================================= */

// Everything the feathers measure, for one profile (the active one by default).
function computeFeatherStats(profileId) {
  const id = profileId || loadActiveProfileId();
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (session) => session.profileId === id && isCompletedSession(session)
  );

  let sets = 0;
  let weightMoved = 0;
  let notes = 0;
  let earlyBird = 0;
  let lateShift = 0;
  const exercisesTrained = new Set();
  const workoutsPerWeek = {}; // week key -> number of workouts
  const daysTrained = new Set(); // one key per calendar day

  sessions.forEach((session) => {
    const when = new Date(session.date);

    // Early bird / late shift go by the hour the workout was started.
    if (when.getHours() < 7) {
      earlyBird = 1;
    }
    if (when.getHours() >= 21) {
      lateShift = 1;
    }

    const week = weekKeyOf(session.date);
    workoutsPerWeek[week] = (workoutsPerWeek[week] || 0) + 1;
    daysTrained.add(dayKeyOf(session.date));

    session.entries.forEach((entry) => {
      const done = entrySetsDone(entry);
      sets += done;
      if (done > 0) {
        exercisesTrained.add(entry.exerciseId);
      }
      if (entry.note && entry.note.trim() !== "") {
        notes += 1;
      }
      // Weight moved = reps × weight for every ticked set (per-set shape only).
      if (Array.isArray(entry.sets)) {
        entry.sets.forEach((set) => {
          if (set.done && set.weight !== null && set.weight !== undefined) {
            weightMoved += (Number(set.reps) || 0) * Number(set.weight);
          }
        });
      }
    });
  });

  return {
    workouts: sessions.length,
    longestStreak: longestWeekStreak(Object.keys(workoutsPerWeek)),
    busiestWeek: Math.max(0, ...Object.values(workoutsPerWeek)),
    weekendWarrior: trainedOnAWeekend(sessions, daysTrained) ? 1 : 0,
    records: countPersonalRecords(sessions), // xp.js
    sets: sets,
    weightMoved: Math.round(weightMoved),
    differentExercises: exercisesTrained.size,
    notes: notes,
    earlyBird: earlyBird,
    lateShift: lateShift,
    level: levelForXp(computeTotalXp(id).total).level, // xp.js
  };
}

// The longest run of weeks in a row with at least one workout. `weekKeys` are
// the Mondays of the weeks you trained ("2026-09-28"), in any order.
function longestWeekStreak(weekKeys) {
  const mondays = weekKeys.map((key) => new Date(key).getTime()).sort((a, b) => a - b);
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  let longest = 0;
  let run = 0;
  mondays.forEach((monday, index) => {
    // Math.round so a clock change (a 23- or 25-hour day) doesn't break a run.
    const followsLastWeek =
      index > 0 && Math.round((monday - mondays[index - 1]) / oneWeek) === 1;
    run = followsLastWeek ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

// Did you ever train on a Saturday AND the Sunday straight after it?
function trainedOnAWeekend(sessions, daysTrained) {
  return sessions.some((session) => {
    const saturday = new Date(session.date);
    if (saturday.getDay() !== 6) {
      return false; // only start from Saturdays
    }
    const sunday = new Date(saturday);
    sunday.setDate(sunday.getDate() + 1);
    return daysTrained.has(dayKeyOf(sunday));
  });
}

// Each feather with its progress: { feather, current, earned, fraction }.
function computeFeathers(profileId) {
  const stats = computeFeatherStats(profileId);
  return FEATHERS.map((feather) => {
    const current = stats[feather.measure] || 0;
    return {
      feather: feather,
      current: current,
      earned: current >= feather.target,
      fraction: Math.min(current / feather.target, 1),
    };
  });
}

// For checking in the console: a table of every feather and your progress.
//   listFeathers()
function listFeathers() {
  console.table(
    computeFeathers().map((item) => ({
      feather: item.feather.name,
      progress: item.current + " / " + item.feather.target,
      earned: item.earned ? "✓" : "",
    }))
  );
}

/* =========================================================================
   3. DRAWING THE "YOUR FEATHERS" CARD
   ========================================================================= */

// Which feather's details are open (memory only; tap it again to close).
let selectedFeatherId = null;

// Draw the card at the top of the Badges tab. Called from renderProgress().
function renderFeathers() {
  const container = document.getElementById("feathers");
  container.innerHTML = "";
  if (!loadActiveProfileId()) {
    return;
  }

  const feathers = computeFeathers();
  const earnedCount = feathers.filter((item) => item.earned).length;

  const card = document.createElement("div");
  card.className = "card feathers";

  // Heading row: "Your feathers" and "7 of 18".
  const head = document.createElement("div");
  head.className = "feathers__head";
  const title = document.createElement("h2");
  title.className = "feathers__title";
  title.textContent = "Your feathers";
  const count = document.createElement("span");
  count.className = "feathers__count";
  count.textContent = earnedCount + " of " + feathers.length;
  head.appendChild(title);
  head.appendChild(count);
  card.appendChild(head);

  // The grid of medallions. Each is a button: tap for details.
  const grid = document.createElement("div");
  grid.className = "feathers__grid";
  feathers.forEach((item) => grid.appendChild(buildFeatherButton(item)));
  card.appendChild(grid);

  // Details of the tapped feather, if any.
  const selected = feathers.find((item) => item.feather.id === selectedFeatherId);
  if (selected) {
    card.appendChild(buildFeatherDetail(selected));
  }

  card.appendChild(buildNextFeather(feathers));
  container.appendChild(card);
}

// A round medallion with the feather's icon: coloured when earned, grey when not.
function buildMedal(item, extraClass) {
  const medal = document.createElement("span");
  medal.className =
    "feather-medal feather-medal--" +
    item.feather.tone +
    (item.earned ? "" : " feather-medal--locked") +
    (extraClass ? " " + extraClass : "");
  medal.innerHTML = iconSvg(item.feather.icon);
  return medal;
}

// One feather in the grid: the medallion with its name underneath.
function buildFeatherButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "feather" + (item.earned ? "" : " feather--locked");
  const isSelected = item.feather.id === selectedFeatherId;
  if (isSelected) {
    button.classList.add("feather--selected");
  }
  button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  button.setAttribute(
    "aria-label",
    item.feather.name + (item.earned ? ", earned" : ", not earned yet")
  );

  button.appendChild(buildMedal(item));
  const name = document.createElement("span");
  name.className = "feather__name";
  name.textContent = item.feather.name;
  button.appendChild(name);

  // Tap to open its details; tap again to close them.
  button.addEventListener("click", () => {
    selectedFeatherId = isSelected ? null : item.feather.id;
    renderFeathers();
  });
  return button;
}

// "18 of 30 workouts" (or "Not yet" for yes/no feathers).
function describeFeatherProgress(item) {
  const feather = item.feather;
  if (!feather.unit) {
    return item.earned ? "Done!" : "Not yet";
  }
  const unit = feather.unit.replace("{unit}", unitLabel());
  const current = Math.min(item.current, feather.target);
  return current.toLocaleString() + " of " + feather.target.toLocaleString() + " " + unit;
}

// A thin progress bar (used in the details and the next-feather row).
function buildFeatherBar(item) {
  const track = document.createElement("div");
  track.className = "feather-bar";
  const fill = document.createElement("span");
  fill.className = "feather-bar__fill";
  fill.style.width = Math.round(item.fraction * 100) + "%";
  track.appendChild(fill);
  return track;
}

// The details box for the tapped feather: how to earn it, and how close you are.
function buildFeatherDetail(item) {
  const box = document.createElement("div");
  box.className = "feather-detail";
  box.setAttribute("aria-live", "polite");

  box.appendChild(buildMedal(item, "feather-medal--small"));

  const text = document.createElement("div");
  text.className = "feather-detail__text";
  const name = document.createElement("p");
  name.className = "feather-detail__name";
  name.textContent = item.feather.name + (item.earned ? " ✓" : "");
  const how = document.createElement("p");
  how.className = "feather-detail__how";
  how.textContent = item.feather.how;
  text.appendChild(name);
  text.appendChild(how);

  if (!item.earned) {
    const progress = document.createElement("p");
    progress.className = "feather-detail__progress";
    progress.textContent = describeFeatherProgress(item);
    text.appendChild(progress);
    if (item.feather.unit) {
      text.appendChild(buildFeatherBar(item));
    }
  }

  box.appendChild(text);
  return box;
}

// "Next feather": the locked feather you're closest to (by how far along you
// are). Yes/no feathers are skipped, since they have no "closest".
function buildNextFeather(feathers) {
  const row = document.createElement("div");
  row.className = "feather-next";

  const candidates = feathers.filter((item) => !item.earned && item.feather.unit);
  if (candidates.length === 0) {
    row.textContent = feathers.every((item) => item.earned)
      ? "Every feather collected. Athena would be proud 🦉"
      : "Only the surprise feathers are left. Keep training!";
    return row;
  }

  // Closest first; if two are equally close, the one earlier in the list wins.
  const next = candidates.reduce((best, item) =>
    item.fraction > best.fraction ? item : best
  );

  row.appendChild(buildMedal(next, "feather-medal--small"));
  const text = document.createElement("div");
  text.className = "feather-next__text";
  const title = document.createElement("p");
  title.className = "feather-next__title";
  title.textContent = "Next feather: " + next.feather.name;
  const progress = document.createElement("p");
  progress.className = "feather-next__progress";
  progress.textContent = describeFeatherProgress(next);
  text.appendChild(title);
  text.appendChild(progress);
  text.appendChild(buildFeatherBar(next));
  row.appendChild(text);
  return row;
}
