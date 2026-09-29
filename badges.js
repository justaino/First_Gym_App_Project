/*
  badges.js — feathers (badges) on the Badges tab (Owl Quest phase Q5).

  Like XP (xp.js) and the week path (week-path.js), feathers are WORKED OUT from
  the workouts you've already saved. Nothing is stored, so:
    - there are no database changes,
    - everyone's past workouts count straight away,
    - every device shows the same feathers.

  On the Badges tab, a short "Your feathers" card shows your count, a few earned
  feathers and a suggested feather to aim for (it changes each day). "See all" opens a full page with every
  feather: earned ones in colour, locked ones in grey. Tap one there to see how
  to earn it and how close you are.

  ── HOW TO CHANGE THE FEATHERS ───────────────────────────────────────────
  Edit the FEATHERS list below. Each feather says which number it measures
  (one of the names in computeFeatherStats) and the target to reach. Icons are
  Lucide names from icons.js. Bump CACHE_VERSION in sw.js afterwards.
  ─────────────────────────────────────────────────────────────────────────

  Loaded after app.js and xp.js, and uses their helpers (loadList,
  loadActiveProfileId, isCompletedSession, entrySetsDone, entryRepsDone,
  weekKeyOf, dayKeyOf, unitLabel, computeTotalXp, levelForXp,
  countPersonalRecords, iconSvg).
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
//             for yes/no feathers, which just say "Not yet". "{unit}" would be
//             swapped for kg/lb if a feather ever needs it.
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
  // Rep Counter replaced "Heavy Mover" (10,000 kg moved) — kg/lb is only a label
  // in this app, and weight moved grew too fast to mean much.
  { id: "rep-counter", icon: "activity", tone: "mint", name: "Rep Counter", how: "Tick 2,000 reps in total.", measure: "reps", target: 2000, unit: "reps" },

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
  let reps = 0;
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
      reps += entryRepsDone(entry); // app.js: reps of ticked sets only
      if (done > 0) {
        exercisesTrained.add(entry.exerciseId);
      }
      if (entry.note && entry.note.trim() !== "") {
        notes += 1;
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
    reps: reps,
    differentExercises: exercisesTrained.size,
    notes: notes,
    earlyBird: earlyBird,
    lateShift: lateShift,
    level: levelForXp(computeTotalXp(id).total).level, // xp.js
  };
}

// The longest run of weeks in a row with at least one workout. `weekKeys` are
// the Mondays of the weeks you trained ("2026-09-28"), in any order. Repeats
// are fine (e.g. one key per workout): they're removed first, because two
// workouts in the same week must not count as a gap.
function longestWeekStreak(weekKeys) {
  const mondays = Array.from(new Set(weekKeys))
    .map((key) => new Date(key).getTime())
    .sort((a, b) => a - b);
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
   3. NEW FEATHERS AFTER A WORKOUT (Owl Quest Q5b)
   finishWorkout() in app.js asks which feathers you had just BEFORE the
   workout is saved, then which ones are new just after. Nothing is stored:
   if deleting a workout loses you a feather, earning it again celebrates again.
   ========================================================================= */

// The ids of the feathers you've earned right now, e.g. Set {"first-flight"}.
function earnedFeatherIds() {
  return new Set(
    computeFeathers()
      .filter((item) => item.earned)
      .map((item) => item.feather.id)
  );
}

// The feathers earned now that weren't in `beforeIds` (in list order).
function detectNewFeathers(beforeIds) {
  return computeFeathers()
    .filter((item) => item.earned && !beforeIds.has(item.feather.id))
    .map((item) => item.feather);
}

/* =========================================================================
   4. DRAWING — a short card on the Badges tab, and a full page for all 18
   ========================================================================= */

// How many earned feathers the short card shows before "See all".
const FEATHERS_PREVIEW_COUNT = 4;

// Which feather's details are open on the full page (memory only; tap it again
// to close).
let selectedFeatherId = null;

// The short card at the top of the Badges tab. Called from renderProgress().
function renderFeathers() {
  const container = document.getElementById("feathers");
  container.innerHTML = "";
  if (!loadActiveProfileId()) {
    return;
  }

  const feathers = computeFeathers();
  const earned = feathers.filter((item) => item.earned);

  const card = document.createElement("div");
  card.className = "card feathers";

  // Heading row: "Your feathers  4 of 18" on the left, "See all ›" on the right.
  const head = buildFeathersHead(earned.length, feathers.length);
  const seeAll = document.createElement("button");
  seeAll.type = "button";
  seeAll.className = "btn btn--ghost btn--small feathers__see-all";
  seeAll.innerHTML = "See all " + iconSvg("forward");
  seeAll.setAttribute("aria-label", "See all " + feathers.length + " feathers");
  seeAll.addEventListener("click", openFeathersPage);
  head.appendChild(seeAll);
  card.appendChild(head);

  // A row of up to 4 earned feathers — the last ones in the list, which tend to
  // be the harder ones. With none earned, a friendly line.
  const row = document.createElement("div");
  row.className = "feathers__row";
  if (earned.length === 0) {
    const none = document.createElement("p");
    none.className = "feathers__none";
    none.textContent = "No feathers yet. Your first workout earns one!";
    row.appendChild(none);
  } else {
    earned.slice(-FEATHERS_PREVIEW_COUNT).forEach((item) => {
      const medal = buildMedal(item, "feather-medal--small");
      medal.title = item.feather.name;
      row.appendChild(medal);
    });
    if (earned.length > FEATHERS_PREVIEW_COUNT) {
      const more = document.createElement("span");
      more.className = "feathers__more";
      more.textContent = "+" + (earned.length - FEATHERS_PREVIEW_COUNT);
      row.appendChild(more);
    }
  }
  card.appendChild(row);

  card.appendChild(buildNextFeather(feathers));
  container.appendChild(card);
}

// "Your feathers  7 of 18" for the short card (the button is added after).
function buildFeathersHead(earnedCount, total) {
  const head = document.createElement("div");
  head.className = "feathers__head";
  const title = document.createElement("h2");
  title.className = "feathers__title";
  title.textContent = "Your feathers";
  const count = document.createElement("span");
  count.className = "feathers__count";
  count.textContent = earnedCount + " of " + total;
  head.appendChild(title);
  head.appendChild(count);
  return head;
}

// The full page (a sheet, like the guide): every feather in a grid, the
// details of the tapped one, and the suggested feather.
function renderFeathersPage() {
  const container = document.getElementById("feathersPageContent");
  container.innerHTML = "";

  const feathers = computeFeathers();
  const earnedCount = feathers.filter((item) => item.earned).length;
  document.getElementById("feathersPageCount").textContent =
    earnedCount + " of " + feathers.length + " earned";

  const card = document.createElement("div");
  card.className = "card feathers";

  const grid = document.createElement("div");
  grid.className = "feathers__grid";
  feathers.forEach((item) => grid.appendChild(buildFeatherButton(item)));
  card.appendChild(grid);

  const selected = feathers.find((item) => item.feather.id === selectedFeatherId);
  if (selected) {
    card.appendChild(buildFeatherDetail(selected));
  }

  card.appendChild(buildNextFeather(feathers));
  container.appendChild(card);
}

// Open and close the full page.
function openFeathersPage() {
  selectedFeatherId = null; // always open tidy, with no details showing
  renderFeathersPage();
  const sheet = document.getElementById("feathersSheet");
  sheet.hidden = false;
  sheet.querySelector(".sheet__panel").scrollTop = 0;
  document.getElementById("closeFeathersBtn").focus();
}
function closeFeathersPage() {
  document.getElementById("feathersSheet").hidden = true;
}

// Wire up the Back button (and Escape) once the page exists.
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("closeFeathersBtn")
    .addEventListener("click", closeFeathersPage);
  document.addEventListener("keydown", (event) => {
    const sheet = document.getElementById("feathersSheet");
    if (event.key === "Escape" && !sheet.hidden) {
      closeFeathersPage();
    }
  });
});

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
    renderFeathersPage();
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

// How many of your closest counting feathers go into the daily suggestion pool.
const SUGGESTION_POOL_CLOSEST = 3;

// Pick today's suggested feather, or null if every feather is earned.
// The pool is the 3 counting feathers you're closest to, plus every "do it
// once" feather you haven't got (Early Bird, Weekend Warrior…). The pick
// depends on today's date, so it stays put all day (the tab redraws a lot)
// and moves on tomorrow — or as soon as you earn it.
function pickSuggestedFeather(feathers) {
  const locked = feathers.filter((item) => !item.earned);
  const closest = locked
    .filter((item) => item.feather.unit)
    .sort((a, b) => b.fraction - a.fraction) // closest first
    .slice(0, SUGGESTION_POOL_CLOSEST);
  const doItOnce = locked.filter((item) => !item.feather.unit);
  const pool = closest.concat(doItOnce);
  if (pool.length === 0) {
    return null;
  }

  // A number that goes up by one each day (days since 1 Jan 1970, local time).
  const now = new Date();
  const dayNumber = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000
  );
  return pool[dayNumber % pool.length];
}

// "Suggested feather": one locked feather to aim for today (see above).
// Counting feathers show your progress; "do it once" ones say how to earn them.
function buildNextFeather(feathers) {
  const row = document.createElement("div");
  row.className = "feather-next";

  const next = pickSuggestedFeather(feathers);
  if (!next) {
    row.textContent = "Every feather collected. Athena would be proud 🦉";
    return row;
  }

  row.appendChild(buildMedal(next, "feather-medal--small"));
  const text = document.createElement("div");
  text.className = "feather-next__text";
  // A small "Suggested feather" label, then the feather's name.
  const label = document.createElement("p");
  label.className = "feather-next__label";
  label.textContent = "Suggested feather";
  const title = document.createElement("p");
  title.className = "feather-next__title";
  title.textContent = next.feather.name;
  const detail = document.createElement("p");
  detail.className = "feather-next__progress";
  text.appendChild(label);
  text.appendChild(title);
  text.appendChild(detail);
  if (next.feather.unit) {
    detail.textContent = describeFeatherProgress(next);
    text.appendChild(buildFeatherBar(next));
  } else {
    detail.textContent = next.feather.how; // e.g. "Start a workout before 7am."
  }
  row.appendChild(text);
  return row;
}
