/*
  app.js — all the behaviour for Athena's Arena.

  What this file does, in plain English:
  - Saves and loads data from the browser's localStorage (so it survives refresh).
  - Manages PROFILES: create one, list them, choose which is active.
  - Manages EXERCISES for the active profile: add, edit, delete.
  - Draws ("renders") the screens whenever the data changes.
  - Switches between the four tabs (Today / Schedule / Progress / Settings).

  The code is organised top-to-bottom in sections. Read it in order and it should
  make sense. Functions have descriptive names so you can follow what each does.
*/

/* =========================================================================
   1. CONSTANTS — fixed values we reuse throughout the app
   ========================================================================= */

// localStorage keys (from ROADMAP.md). localStorage only stores text, so we
// turn our data into text with JSON.stringify and back with JSON.parse.
const STORAGE_KEYS = {
  profiles: "gym:profiles",
  activeProfileId: "gym:activeProfileId",
  exercises: "gym:exercises",
  sessions: "gym:sessions", // Phase 2: saved workout history
  theme: "gym:theme", // Phase 4: "light" or "dark"
  // Easter eggs: remembers which workout-count milestones we've already
  // celebrated, per profile, so the trophy only ever plays once each.
  celebratedMilestones: "gym:celebratedMilestones",
  // Insights: each profile's weekly workout goal, as { profileId: number }.
  weeklyGoal: "gym:weeklyGoal",
  // Phase 7: which logged-in user the local cache currently belongs to, so we
  // never upload one person's local data into a different person's account.
  syncedUserId: "gym:syncedUserId",
};

// Easter egg: a workout milestone shows a one-time trophy celebration when your
// total completed-workout count first reaches one of these numbers.
const WORKOUT_MILESTONES = [7, 30, 50, 100];

// Insights: the default weekly workout goal until the owner sets their own.
const DEFAULT_WEEKLY_GOAL = 3;

// The fixed list of emoji icons the user can pick from.
const EMOJI_PRESETS = ["💪", "🏋️", "🚴", "🏃", "🧘", "🤸", "🏊"];

// Days in the order we want to show them.
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/* =========================================================================
   2. STORAGE HELPERS — read and write localStorage safely
   ========================================================================= */

// Read a list (array) from localStorage. Returns [] if nothing is saved yet.
function loadList(key) {
  const text = localStorage.getItem(key);
  if (!text) {
    return [];
  }
  // try/catch protects us if the saved text is somehow broken.
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Could not read", key, error);
    return [];
  }
}

// Save a list (array) to localStorage as text.
function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// The active profile id is a single value, not a list.
function loadActiveProfileId() {
  return localStorage.getItem(STORAGE_KEYS.activeProfileId) || null;
}
function saveActiveProfileId(id) {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.activeProfileId, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeProfileId);
  }
}

/* =========================================================================
   3. SMALL UTILITIES
   ========================================================================= */

// Make a simple unique id (used for new profiles and exercises).
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Find the active profile object (or null if none is chosen).
function getActiveProfile() {
  const profiles = loadList(STORAGE_KEYS.profiles);
  const activeId = loadActiveProfileId();
  return profiles.find((profile) => profile.id === activeId) || null;
}

// Get only the exercises that belong to the active profile (normalized).
function getExercisesForActiveProfile() {
  const activeId = loadActiveProfileId();
  if (!activeId) {
    return [];
  }
  const allExercises = loadList(STORAGE_KEYS.exercises);
  return allExercises
    .filter((exercise) => exercise.profileId === activeId)
    .map(normalizeExercise);
}

// Resize an array to "length": keep existing values, and fill any new slots
// with "fillValue". Used to grow/shrink the per-set reps and weights.
function resizeArray(array, length, fillValue) {
  const result = [];
  for (let i = 0; i < length; i = i + 1) {
    result.push(i < array.length ? array[i] : fillValue);
  }
  return result;
}

// Make sure an exercise has the Phase-2 per-set fields. Older exercises (saved
// before this feature) only had a single `reps`, so we build the per-set arrays
// from it. This never changes what's stored — it just fills in gaps when read.
function normalizeExercise(exercise) {
  const sets = exercise.sets > 0 ? exercise.sets : 1;
  const defaultReps =
    exercise.reps !== undefined && exercise.reps !== null ? exercise.reps : 10;
  const defaultWeight =
    exercise.weight !== undefined && exercise.weight !== null
      ? exercise.weight
      : null;

  const existingReps = Array.isArray(exercise.repsPerSet)
    ? exercise.repsPerSet
    : [];
  const existingWeight = Array.isArray(exercise.weightPerSet)
    ? exercise.weightPerSet
    : [];

  return {
    ...exercise,
    sets: sets,
    reps: defaultReps,
    weight: defaultWeight,
    repsPerSet: resizeArray(existingReps, sets, defaultReps),
    weightPerSet: resizeArray(existingWeight, sets, defaultWeight),
  };
}

// A short text summary for an exercise card, e.g. "3 × 10", "3 × 10,12,15",
// or "3 × 10 · 20" / "3 × 10 · weights vary" when weights are set.
function formatExerciseSummary(exercise) {
  const reps = exercise.repsPerSet;
  const repsUniform = reps.every((value) => value === reps[0]);
  let summary = exercise.sets + " × " + (repsUniform ? reps[0] : reps.join(","));

  const weights = exercise.weightPerSet;
  const hasWeight = weights.some((value) => value !== null && value !== undefined);
  if (hasWeight) {
    const weightUniform =
      weights.every((value) => value === weights[0]) &&
      weights[0] !== null &&
      weights[0] !== undefined;
    summary += " · " + (weightUniform ? weights[0] : "weights vary");
  }
  return summary;
}

// The day name for any date (e.g. "Friday"). getDay(): 0 = Sunday ... 6 = Saturday.
function dayNameOf(date) {
  const namesSundayFirst = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return namesSundayFirst[date.getDay()];
}

// What is today's day name? (e.g. "Monday")
function getTodayName() {
  return dayNameOf(new Date());
}

// Turn a stored ISO date into the value an <input type="date"> expects
// ("YYYY-MM-DD"), using local date parts.
function toDateInputValue(isoString) {
  const d = new Date(isoString);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

/* =========================================================================
   4. RENDER (DRAW) THE SCREENS
   These functions read the saved data and update the page. We call them
   whenever something changes, so the screen always matches the data.
   ========================================================================= */

// Build one exercise card as an HTML element.
function createExerciseCard(exercise) {
  const card = document.createElement("div");
  card.className = "exercise";

  // The emoji icon in a soft circle.
  const icon = document.createElement("div");
  icon.className = "exercise__icon";
  icon.textContent = exercise.icon;

  // The name and "sets × reps" line.
  const info = document.createElement("div");
  info.className = "exercise__info";

  const name = document.createElement("div");
  name.className = "exercise__name";
  name.textContent = exercise.name;

  const detail = document.createElement("div");
  detail.className = "exercise__detail";
  detail.textContent = formatExerciseSummary(exercise);

  info.appendChild(name);
  info.appendChild(detail);

  // Edit + Delete buttons.
  const actions = document.createElement("div");
  actions.className = "exercise__actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn--ghost btn--small";
  editBtn.type = "button";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => openExerciseModalForEdit(exercise.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn--ghost btn--small";
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteExercise(exercise.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  // Put the pieces together.
  card.appendChild(icon);
  card.appendChild(info);
  card.appendChild(actions);
  return card;
}

// Draw the Schedule view: exercises grouped by day.
function renderSchedule() {
  const container = document.getElementById("scheduleList");
  container.innerHTML = ""; // clear whatever was there before

  const subtitle = document.getElementById("scheduleSubtitle");
  const activeProfile = getActiveProfile();

  // If there's no active profile, ask the user to make one first.
  if (!activeProfile) {
    subtitle.textContent = "No profile selected";
    container.appendChild(
      createEmptyState("👤", "Create a profile in Settings to get started.")
    );
    return;
  }

  subtitle.textContent = activeProfile.name + "'s weekly plan";

  const exercises = getExercisesForActiveProfile();

  // No exercises yet → friendly empty state.
  if (exercises.length === 0) {
    container.appendChild(
      createEmptyState("💪", "No exercises yet — add your first one above!")
    );
    return;
  }

  // Go through the days in order and show a group for each day that has exercises.
  DAYS.forEach((day) => {
    const exercisesForDay = exercises.filter((exercise) => exercise.day === day);
    if (exercisesForDay.length === 0) {
      return; // skip days with nothing planned
    }

    const group = document.createElement("div");
    group.className = "day-group";

    // Heading row: the day name on the left, a "Start" button on the right.
    const headingRow = document.createElement("div");
    headingRow.className = "day-group__heading-row";

    const heading = document.createElement("h2");
    heading.className = "day-group__heading";
    heading.textContent = day;

    const startBtn = document.createElement("button");
    startBtn.className = "btn btn--ghost btn--small";
    startBtn.type = "button";
    // Say "Resume" if there's an in-progress workout for this day.
    startBtn.textContent = findInProgressSession(day) ? "▶ Resume" : "▶ Start";
    startBtn.addEventListener("click", () => startWorkout(day));

    headingRow.appendChild(heading);
    headingRow.appendChild(startBtn);
    group.appendChild(headingRow);

    exercisesForDay.forEach((exercise) => {
      group.appendChild(createExerciseCard(exercise));
    });

    container.appendChild(group);
  });
}

// Draw the Today view: only today's exercises.
function renderToday() {
  const container = document.getElementById("todayList");
  container.innerHTML = "";

  const todayName = getTodayName();

  // Fill in the hero header: a greeting and the full date.
  const greeting = document.getElementById("heroGreeting");
  const dateLine = document.getElementById("heroDate");
  const activeProfile = getActiveProfile();
  greeting.textContent = activeProfile
    ? "Hi, " + activeProfile.name + "!"
    : "Hi there!";
  dateLine.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (!activeProfile) {
    document.getElementById("startTodayBtn").hidden = true;
    container.appendChild(
      createEmptyState("👋", "Create a profile in Settings to get started.")
    );
    return;
  }

  const todaysExercises = getExercisesForActiveProfile().filter(
    (exercise) => exercise.day === todayName
  );

  // Only show the button if there's something to do; label it Resume if a
  // workout for today is already in progress.
  const startBtn = document.getElementById("startTodayBtn");
  startBtn.hidden = todaysExercises.length === 0;
  startBtn.textContent = findInProgressSession(todayName)
    ? "▶ Resume workout"
    : "▶ Start workout";

  if (todaysExercises.length === 0) {
    container.appendChild(
      createEmptyState("🛌", "Nothing planned for today — enjoy your rest!")
    );
    return;
  }

  todaysExercises.forEach((exercise) => {
    container.appendChild(createExerciseCard(exercise));
  });
}

// Draw the Settings view: the list of profiles.
function renderProfiles() {
  const container = document.getElementById("profileList");
  container.innerHTML = "";

  const profiles = loadList(STORAGE_KEYS.profiles);
  const activeId = loadActiveProfileId();

  if (profiles.length === 0) {
    container.appendChild(
      createEmptyState("👤", "No profiles yet — create one above.")
    );
    return;
  }

  profiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = "profile-row";

    const name = document.createElement("span");
    name.className = "profile-row__name";
    name.textContent = profile.name;
    row.appendChild(name);

    if (profile.id === activeId) {
      // This is the active profile → show an "Active" badge.
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Active";
      row.appendChild(badge);
    } else {
      // Not active → show a button to make it active.
      const useBtn = document.createElement("button");
      useBtn.className = "btn btn--ghost btn--small";
      useBtn.type = "button";
      useBtn.textContent = "Use";
      useBtn.addEventListener("click", () => setActiveProfile(profile.id));
      row.appendChild(useBtn);
    }

    // Delete button for the profile (also removes its exercises).
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn--ghost btn--small";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteProfile(profile.id));
    row.appendChild(deleteBtn);

    container.appendChild(row);
  });
}

// Update the little active-profile pill in the top bar.
function renderActiveProfileChip() {
  const nameSpan = document.getElementById("activeProfileName");
  const activeProfile = getActiveProfile();
  nameSpan.textContent = activeProfile ? activeProfile.name : "No profile";
}

// A small helper that builds a friendly "nothing here yet" card.
function createEmptyState(emoji, message) {
  const card = document.createElement("div");
  card.className = "card empty-state";

  const emojiDiv = document.createElement("div");
  emojiDiv.className = "empty-state__emoji";
  emojiDiv.textContent = emoji;

  const text = document.createElement("p");
  text.textContent = message;

  card.appendChild(emojiDiv);
  card.appendChild(text);
  return card;
}

// Draw the "Recent workouts" history list on the Today view.
function renderHistory() {
  const heading = document.getElementById("historyHeading");
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  const activeId = loadActiveProfileId();
  const allSessions = loadList(STORAGE_KEYS.sessions);

  // Only this profile's COMPLETED sessions (skip in-progress ones), newest first.
  const sessions = allSessions
    .filter(
      (session) =>
        session.profileId === activeId && isCompletedSession(session)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // No history yet → hide the heading and show nothing.
  if (sessions.length === 0) {
    heading.hidden = true;
    return;
  }
  heading.hidden = false;

  // Show the 10 most recent workouts.
  sessions.slice(0, 10).forEach((session) => {
    const card = document.createElement("div");
    card.className = "history-card";

    const title = document.createElement("div");
    title.className = "history-card__title";
    // session.day is the planned day; fall back to the date if it's missing.
    title.textContent = (session.day || "Workout") + " workout";

    // Add up all the sets that were ticked off across the session.
    const totalSets = session.entries.reduce(
      (sum, entry) => sum + entrySetsDone(entry),
      0
    );

    const meta = document.createElement("div");
    meta.className = "history-card__meta";
    meta.textContent =
      formatDate(session.date) +
      " · " +
      totalSets +
      " sets · " +
      session.entries.length +
      " exercises";

    // The title + meta sit on the left; Edit/Delete on the right.
    const textWrap = document.createElement("div");
    textWrap.className = "history-card__text";
    textWrap.appendChild(title);
    textWrap.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "history-card__actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn--ghost btn--small";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editSession(session.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn--ghost btn--small";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteSession(session.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(textWrap);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

// Turn an ISO date string into something friendly like "Mon, Jun 22".
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ---- Progress view (Phase 3) ---- */

// Work out midnight on Monday of the current week (start of "this week").
function getStartOfWeek() {
  const now = new Date();
  const jsDay = now.getDay(); // 0 = Sunday ... 6 = Saturday
  // How many days back to Monday? (Sunday counts as 6 days after Monday.)
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Build a small, interactive bar chart (as an SVG element) from "points".
// Each point is { date, reps, weight, session }. When any session has a weight,
// each session shows TWO bars: reps (mint) and weight (lavender). The two
// colours are scaled to their OWN maximums, so each shows its trend over time.
// Bars show a tooltip on hover and open that workout's details when clicked.
function buildBarChartSvg(points) {
  const width = 240;
  const height = 60;
  const groupGap = 6; // gap between sessions
  const innerGap = 3; // gap between the two bars within a session
  const namespace = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("class", "barchart");
  svg.setAttribute("preserveAspectRatio", "none");

  // Show the weight series only if at least one session recorded a weight.
  const hasWeight = points.some(
    (point) => point.weight !== null && point.weight !== undefined
  );

  // Each colour is normalised to its own max (avoid divide-by-zero with 1).
  const maxReps = Math.max.apply(null, points.map((p) => p.reps).concat([1]));
  const maxWeight = Math.max.apply(
    null,
    points.map((p) => p.weight || 0).concat([1])
  );

  const groupWidth =
    (width - groupGap * (points.length - 1)) / points.length;
  const barWidth = hasWeight ? (groupWidth - innerGap) / 2 : groupWidth;

  points.forEach((point, index) => {
    const groupX = index * (groupWidth + groupGap);

    // One tooltip per session, shared by both of its bars.
    let label = formatDate(point.date) + " · " + point.reps + " reps";
    if (point.weight !== null && point.weight !== undefined) {
      label += " · " + point.weight + " wt";
    }

    // Helper to add a single bar.
    const addBar = (x, value, maxValue, modifierClass) => {
      const barHeight = Math.max(2, (value / maxValue) * height);
      const rect = document.createElementNS(namespace, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", height - barHeight);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", 3);
      rect.setAttribute("class", "barchart__bar " + modifierClass);

      const title = document.createElementNS(namespace, "title");
      title.textContent = label;
      rect.appendChild(title);

      rect.addEventListener("mouseenter", (event) =>
        showChartTooltip(label, event.clientX, event.clientY)
      );
      rect.addEventListener("mousemove", (event) =>
        showChartTooltip(label, event.clientX, event.clientY)
      );
      rect.addEventListener("mouseleave", hideChartTooltip);
      rect.addEventListener("click", () => {
        hideChartTooltip();
        showSessionDetail(point.session);
      });

      svg.appendChild(rect);
    };

    // Reps bar (always). Weight bar second (only when we have weights).
    addBar(groupX, point.reps, maxReps, "barchart__bar--reps");
    if (hasWeight) {
      const weightValue =
        point.weight !== null && point.weight !== undefined ? point.weight : 0;
      addBar(
        groupX + barWidth + innerGap,
        weightValue,
        maxWeight,
        "barchart__bar--weight"
      );
    }
  });

  return svg;
}

/* ---- Custom chart tooltip (a single floating chip we reuse) ---- */

let chartTooltipEl = null;

// Get (or create once) the tooltip element that floats over the page.
function getChartTooltip() {
  if (!chartTooltipEl) {
    chartTooltipEl = document.createElement("div");
    chartTooltipEl.className = "chart-tooltip";
    chartTooltipEl.hidden = true;
    document.body.appendChild(chartTooltipEl);
  }
  return chartTooltipEl;
}

// Show the tooltip with some text, positioned near the pointer.
function showChartTooltip(text, x, y) {
  const tooltip = getChartTooltip();
  tooltip.textContent = text;
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
  // Default: no tail (the heatmap re-adds it). Keeps chart hovers as plain chips.
  tooltip.classList.remove("chart-tooltip--bubble");
  tooltip.hidden = false;
}

function hideChartTooltip() {
  if (chartTooltipEl) {
    chartTooltipEl.hidden = true;
  }
}

/* ---- Workout detail pop-up (opened by clicking a chart bar) ---- */

// Show every exercise from one saved session in a pop-up.
function showSessionDetail(session) {
  // Title: e.g. "Monday workout — Mon, Jun 22"
  const title = (session.day || "Workout") + " — " + formatDate(session.date);
  document.getElementById("sessionTitle").textContent = title;

  const list = document.getElementById("sessionDetailList");
  list.innerHTML = "";

  // We need exercise names/emojis, which live in the exercises list.
  const allExercises = loadList(STORAGE_KEYS.exercises);

  session.entries.forEach((entry) => {
    const exercise = allExercises.find((item) => item.id === entry.exerciseId);

    const row = document.createElement("div");
    row.className = "exercise"; // reuse the exercise-row styling

    const icon = document.createElement("div");
    icon.className = "exercise__icon";
    icon.textContent = exercise ? exercise.icon : "❓";

    const info = document.createElement("div");
    info.className = "exercise__info";

    const name = document.createElement("div");
    name.className = "exercise__name";
    name.textContent = exercise ? exercise.name : "(deleted exercise)";

    const setsDone = entrySetsDone(entry);
    const detail = document.createElement("div");
    detail.className = "exercise__detail";

    if (Array.isArray(entry.sets)) {
      // New per-set shape: "2/3 sets done" plus a per-set breakdown line.
      detail.textContent = setsDone + "/" + entry.sets.length + " sets done";
      info.appendChild(name);
      info.appendChild(detail);

      const perSet = document.createElement("div");
      perSet.className = "exercise__detail";
      perSet.textContent = entry.sets
        .map((set) => {
          const weight =
            set.weight !== null && set.weight !== undefined
              ? "×" + set.weight
              : "";
          return (set.done ? "✓" : "·") + set.reps + weight;
        })
        .join("   ");
      info.appendChild(perSet);
    } else {
      // Old shape: a single setsDone count (+ optional single weight).
      let detailText = setsDone + " sets done";
      if (entry.weight !== null && entry.weight !== undefined) {
        detailText += " · weight " + entry.weight;
      }
      detail.textContent = detailText;
      info.appendChild(name);
      info.appendChild(detail);
    }

    row.appendChild(icon);
    row.appendChild(info);
    list.appendChild(row);
  });

  document.getElementById("sessionModal").hidden = false;
}

function closeSessionModal() {
  document.getElementById("sessionModal").hidden = true;
}

// Build one "this week" summary card with two stat tiles.
function buildWeekSummaryCard(workouts, sets) {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "history-card__title";
  title.textContent = "This week";
  card.appendChild(title);

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.appendChild(buildStatTile(workouts, "workouts"));
  stats.appendChild(buildStatTile(sets, "sets"));
  card.appendChild(stats);

  return card;
}

// A single tinted stat tile (big number + label).
function buildStatTile(number, label) {
  const tile = document.createElement("div");
  tile.className = "stat";

  const numberEl = document.createElement("div");
  numberEl.className = "stat__number";
  numberEl.textContent = number;

  const labelEl = document.createElement("div");
  labelEl.className = "stat__label";
  labelEl.textContent = label;

  tile.appendChild(numberEl);
  tile.appendChild(labelEl);
  return tile;
}

// Build a per-exercise progress card (totals + a small chart).
function buildExerciseProgressCard(exercise, points, totalSets, lastWeight) {
  const card = document.createElement("div");
  card.className = "card";

  // Top row: emoji + name (reuse the styles from the plan cards).
  const top = document.createElement("div");
  top.className = "workout-exercise__top";

  const icon = document.createElement("div");
  icon.className = "exercise__icon";
  icon.textContent = exercise.icon;

  const info = document.createElement("div");
  info.className = "exercise__info";

  const name = document.createElement("div");
  name.className = "exercise__name";
  name.textContent = exercise.name;

  // Meta line: how many times trained, total sets, and last weight if any.
  let metaText = points.length + " sessions · " + totalSets + " sets total";
  if (lastWeight !== null) {
    metaText += " · last " + lastWeight;
  }
  const meta = document.createElement("div");
  meta.className = "progress-card__meta";
  meta.textContent = metaText;

  info.appendChild(name);
  info.appendChild(meta);
  top.appendChild(icon);
  top.appendChild(info);

  card.appendChild(top);
  // Show a chart of the most recent sessions (up to 12 bars).
  const recentPoints = points.slice(-12);
  card.appendChild(buildBarChartSvg(recentPoints));

  // If any of those sessions had a weight, show a legend for the two colours.
  const hasWeight = recentPoints.some(
    (point) => point.weight !== null && point.weight !== undefined
  );
  if (hasWeight) {
    card.appendChild(buildChartLegend());
  }

  // A small hint so people know the bars are interactive.
  const hint = document.createElement("div");
  hint.className = "chart-hint";
  hint.textContent = "Tap a bar to see that workout";
  card.appendChild(hint);

  return card;
}

// A little legend explaining the two bar colours (reps vs weight).
function buildChartLegend() {
  const legend = document.createElement("div");
  legend.className = "chart-legend";

  const makeItem = (modifier, text) => {
    const item = document.createElement("span");
    item.className = "chart-legend__item";
    const swatch = document.createElement("span");
    swatch.className = "chart-legend__swatch " + modifier;
    const labelText = document.createElement("span");
    labelText.textContent = text;
    item.appendChild(swatch);
    item.appendChild(labelText);
    return item;
  };

  legend.appendChild(makeItem("chart-legend__swatch--reps", "Reps"));
  legend.appendChild(makeItem("chart-legend__swatch--weight", "Weight"));
  return legend;
}

/* ---- Insights card (Phase 6) ----
   Motivating stats computed from the saved sessions: a weekly "showing up"
   streak, days trained this month, lifetime totals, and a personal-records
   board. All client-side — no new data is stored. */

// The Monday (local midnight) of the week a date falls in.
function weekMondayMidnight(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const back = jsDay === 0 ? 6 : jsDay - 1; // days since Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

// A short text key identifying a week (used to group/compare weeks).
function weekKeyOf(date) {
  return weekMondayMidnight(date).toISOString().slice(0, 10);
}

// A key identifying a single calendar day (local), for counting distinct days.
function dayKeyOf(date) {
  const d = new Date(date);
  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}

// Current "showing up" streak: how many weeks in a row (up to now) had at least
// one workout. The current week is allowed to be empty (it may be early in the
// week) — we anchor on this week if it has a workout, otherwise last week.
function computeWeekStreak(sessions) {
  const weeks = new Set(sessions.map((session) => weekKeyOf(session.date)));
  const cursor = weekMondayMidnight(new Date());
  if (!weeks.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 7); // this week empty → try last week
  }
  let streak = 0;
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak = streak + 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Build the Insights card from a profile's completed sessions.
function renderInsights(sessions) {
  const container = document.getElementById("insights");
  container.innerHTML = "";
  if (!sessions || sessions.length === 0) {
    return; // nothing to show yet — the empty states below cover this
  }

  // --- Crunch the numbers ---
  const streak = computeWeekStreak(sessions);

  const now = new Date();
  const daysThisMonth = new Set(
    sessions
      .filter((session) => {
        const d = new Date(session.date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      })
      .map((session) => dayKeyOf(session.date))
  ).size;

  let totalSets = 0;
  let totalReps = 0;
  let weightMoved = 0; // sum of reps × weight across completed sets
  const bestByExercise = {}; // exerciseId -> { weight, date }

  sessions.forEach((session) => {
    session.entries.forEach((entry) => {
      totalSets += entrySetsDone(entry);
      totalReps += entryRepsDone(entry);

      // Weight moved only makes sense for the per-set shape (it has reps+weight).
      if (Array.isArray(entry.sets)) {
        entry.sets.forEach((set) => {
          if (set.done && set.weight !== null && set.weight !== undefined) {
            weightMoved += (Number(set.reps) || 0) * Number(set.weight);
          }
        });
      }

      // Track the heaviest weight ever used for each exercise (a PR).
      const max = entryMaxWeight(entry);
      if (max !== null) {
        const current = bestByExercise[entry.exerciseId];
        if (!current || max > current.weight) {
          bestByExercise[entry.exerciseId] = { weight: max, date: session.date };
        }
      }
    });
  });

  // --- Build the card ---
  const card = document.createElement("div");
  card.className = "card";

  const heading = document.createElement("div");
  heading.className = "history-card__title";
  heading.textContent = "Insights";
  card.appendChild(heading);

  // --- "This week" goal ring ---
  card.appendChild(
    buildGoalRing(sessions, loadWeeklyGoal(loadActiveProfileId()))
  );

  // A wrapping grid of stat tiles (reuses the tinted tile look).
  const stats = document.createElement("div");
  stats.className = "insights-stats";
  stats.appendChild(buildStatTile(streak, "week streak 🔥"));
  stats.appendChild(buildStatTile(daysThisMonth, "days this month"));
  stats.appendChild(buildStatTile(sessions.length, "workouts"));
  stats.appendChild(buildStatTile(totalSets, "sets"));
  stats.appendChild(buildStatTile(totalReps, "reps"));
  // Only show "weight moved" if any weights were actually recorded.
  if (weightMoved > 0) {
    stats.appendChild(
      buildStatTile(weightMoved.toLocaleString(), "weight moved")
    );
  }
  card.appendChild(stats);

  // --- Volume trend (this month vs last) — only when there's weighted volume ---
  const volumeTrend = buildVolumeTrend(sessions);
  if (volumeTrend) {
    card.appendChild(volumeTrend);
  }

  // --- Calendar heatmap of the last 12 weeks ---
  card.appendChild(buildHeatmap(sessions));

  // --- Personal-records board (only exercises that still exist) ---
  const prList = Object.keys(bestByExercise)
    .map((id) => ({ exercise: findExerciseById(id), best: bestByExercise[id] }))
    .filter((item) => item.exercise)
    .sort((a, b) => b.best.weight - a.best.weight);

  if (prList.length > 0) {
    const prHeading = document.createElement("div");
    prHeading.className = "pr-board__heading";
    prHeading.textContent = "Personal records 🏅";
    card.appendChild(prHeading);

    prList.forEach((item) => {
      const row = document.createElement("div");
      row.className = "pr-row";

      const icon = document.createElement("div");
      icon.className = "exercise__icon";
      icon.textContent = item.exercise.icon;

      const info = document.createElement("div");
      info.className = "exercise__info";
      const name = document.createElement("div");
      name.className = "exercise__name";
      name.textContent = item.exercise.name;
      const date = document.createElement("div");
      date.className = "pr-row__date";
      date.textContent = formatDate(item.best.date);
      info.appendChild(name);
      info.appendChild(date);

      const best = document.createElement("div");
      best.className = "pr-row__best";
      best.textContent = item.best.weight;

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(best);
      card.appendChild(row);
    });
  }

  // --- "Since you started" trend callouts (weight gains/drops per exercise) ---
  const trend = buildTrendCallouts(sessions);
  if (trend) {
    card.appendChild(trend);
  }

  container.appendChild(card);
}

// Build the "Since you started" callouts: for each exercise trained with weights
// at least twice, compare the first weighted session's heaviest weight to the
// latest one. Shows the biggest movements (up or down), capped at 3 lines.
function buildTrendCallouts(sessions) {
  const sorted = sessions
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const exercises = getExercisesForActiveProfile();
  const callouts = [];

  exercises.forEach((exercise) => {
    const weights = [];
    sorted.forEach((session) => {
      const entry = session.entries.find(
        (item) => item.exerciseId === exercise.id
      );
      if (entry) {
        const max = entryMaxWeight(entry);
        if (max !== null) {
          weights.push(max);
        }
      }
    });
    // Need a starting point and a current point to show a trend.
    if (weights.length >= 2) {
      const change = weights[weights.length - 1] - weights[0];
      if (change !== 0) {
        callouts.push({ exercise: exercise, change: change });
      }
    }
  });

  if (callouts.length === 0) {
    return null;
  }

  // Biggest movements first (up or down), keep the top few.
  callouts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const top = callouts.slice(0, 3);

  const wrap = document.createElement("div");

  const heading = document.createElement("div");
  heading.className = "pr-board__heading";
  heading.textContent = "Since you started 📈";
  wrap.appendChild(heading);

  top.forEach((item) => {
    const row = document.createElement("div");
    row.className = "pr-row"; // reuse the personal-records row styling

    const icon = document.createElement("div");
    icon.className = "exercise__icon";
    icon.textContent = item.exercise.icon;

    const name = document.createElement("div");
    name.className = "exercise__name";
    name.textContent = item.exercise.name;

    const change = document.createElement("div");
    const up = item.change > 0;
    change.className = "trend-change " + (up ? "is-up" : "is-down");
    change.textContent = (up ? "↑ " : "↓ ") + Math.abs(item.change);

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(change);
    wrap.appendChild(row);
  });

  return wrap;
}

/* ---- Weekly goal (Phase 6) ----
   Each profile has a "workouts per week" goal, shown as a progress ring in the
   Insights card and editable in Settings. Stored as { profileId: number }. */

function loadWeeklyGoalMap() {
  const text = localStorage.getItem(STORAGE_KEYS.weeklyGoal);
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

// The active-or-given profile's goal (falls back to the default if unset).
function loadWeeklyGoal(profileId) {
  const goal = loadWeeklyGoalMap()[profileId];
  return goal > 0 ? goal : DEFAULT_WEEKLY_GOAL;
}

function saveWeeklyGoal(profileId, goal) {
  const map = loadWeeklyGoalMap();
  map[profileId] = goal;
  localStorage.setItem(STORAGE_KEYS.weeklyGoal, JSON.stringify(map));
}

// Set the Settings goal input to the active profile's current goal.
function renderWeeklyGoalInput() {
  const input = document.getElementById("weeklyGoalInput");
  if (!input) {
    return;
  }
  const activeId = loadActiveProfileId();
  input.disabled = !activeId; // nothing to set without a profile
  input.value = activeId ? loadWeeklyGoal(activeId) : DEFAULT_WEEKLY_GOAL;
}

// Build the "this week" goal ring: an SVG circle that fills toward the goal.
function buildGoalRing(sessions, goal) {
  // How many workouts so far this week.
  const startOfWeek = getStartOfWeek();
  const count = sessions.filter(
    (session) => new Date(session.date) >= startOfWeek
  ).length;
  const progress = goal > 0 ? Math.min(count / goal, 1) : 0;

  const wrap = document.createElement("div");
  wrap.className = "goal";

  // Draw the ring as SVG: a faint full-circle track + a coral arc on top.
  const ns = "http://www.w3.org/2000/svg";
  const size = 96;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "goal__ring");
  svg.setAttribute("viewBox", "0 0 " + size + " " + size);

  // Group the two circles so we can rotate them to start at the top (12 o'clock).
  const g = document.createElementNS(ns, "g");
  g.setAttribute("transform", "rotate(-90 " + size / 2 + " " + size / 2 + ")");

  const track = document.createElementNS(ns, "circle");
  track.setAttribute("class", "goal__track");
  track.setAttribute("cx", size / 2);
  track.setAttribute("cy", size / 2);
  track.setAttribute("r", radius);
  track.setAttribute("fill", "none");
  track.setAttribute("stroke-width", stroke);

  const arc = document.createElementNS(ns, "circle");
  arc.setAttribute("class", "goal__arc");
  arc.setAttribute("cx", size / 2);
  arc.setAttribute("cy", size / 2);
  arc.setAttribute("r", radius);
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke-width", stroke);
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", circumference);
  arc.setAttribute("stroke-dashoffset", circumference * (1 - progress));

  g.appendChild(track);
  g.appendChild(arc);
  svg.appendChild(g);

  // The count in the middle (not rotated).
  const text = document.createElementNS(ns, "text");
  text.setAttribute("class", "goal__text");
  text.setAttribute("x", size / 2);
  text.setAttribute("y", size / 2);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = count + "/" + goal;
  svg.appendChild(text);

  wrap.appendChild(svg);

  // The label beside the ring.
  const info = document.createElement("div");
  info.className = "goal__info";
  const title = document.createElement("div");
  title.className = "goal__title";
  title.textContent = "This week";
  const sub = document.createElement("div");
  sub.className = "goal__sub";
  sub.textContent =
    count >= goal
      ? "Goal smashed! 🎉"
      : count + " of " + goal + " workouts done";
  info.appendChild(title);
  info.appendChild(sub);
  wrap.appendChild(info);

  return wrap;
}

// Build the "volume this month vs last month" line. Volume = reps × weight
// summed over completed sets (a measure of total work done). Returns null when
// there's no weighted volume to show (e.g. bodyweight-only history).
function buildVolumeTrend(sessions) {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Total volume in one session (per-set shape only — old sessions can't pair
  // reps with weights reliably, so they contribute 0 here).
  function sessionVolume(session) {
    let vol = 0;
    session.entries.forEach((entry) => {
      if (Array.isArray(entry.sets)) {
        entry.sets.forEach((set) => {
          if (set.done && set.weight !== null && set.weight !== undefined) {
            vol += (Number(set.reps) || 0) * Number(set.weight);
          }
        });
      }
    });
    return vol;
  }

  let thisMonth = 0;
  let lastMonth = 0;
  sessions.forEach((session) => {
    const d = new Date(session.date);
    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    ) {
      thisMonth += sessionVolume(session);
    } else if (
      d.getFullYear() === prevMonth.getFullYear() &&
      d.getMonth() === prevMonth.getMonth()
    ) {
      lastMonth += sessionVolume(session);
    }
  });

  // Nothing weighted in either month → don't show the line at all.
  if (thisMonth === 0 && lastMonth === 0) {
    return null;
  }

  const wrap = document.createElement("div");
  wrap.className = "volume-trend";

  const label = document.createElement("span");
  label.className = "volume-trend__label";
  label.textContent = "Volume this month";

  const value = document.createElement("span");
  value.className = "volume-trend__value";
  value.textContent = thisMonth.toLocaleString();

  wrap.appendChild(label);
  wrap.appendChild(value);

  const change = document.createElement("span");
  change.className = "volume-trend__change";
  if (lastMonth > 0) {
    const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    if (pct > 0) {
      change.classList.add("is-up");
      change.textContent = "↑ " + pct + "% vs last month";
    } else if (pct < 0) {
      change.classList.add("is-down");
      change.textContent = "↓ " + Math.abs(pct) + "% vs last month";
    } else {
      change.textContent = "same as last month";
    }
  } else {
    // No weighted volume last month to compare against.
    change.textContent = "first month with weights 💪";
  }
  wrap.appendChild(change);

  return wrap;
}

// Tapping a heatmap square shows a little rounded bubble (reusing the chart
// tooltip) with that day's info, then hides it after a moment. This is the
// mobile-friendly version of the hover tooltip (phones can't hover).
let heatmapTooltipTimer = null;
function showHeatmapTooltip(label, event) {
  showChartTooltip(label, event.clientX, event.clientY);
  // Add the speech-bubble tail (only the heatmap uses this variant).
  getChartTooltip().classList.add("chart-tooltip--bubble");
  if (heatmapTooltipTimer) {
    clearTimeout(heatmapTooltipTimer);
  }
  heatmapTooltipTimer = setTimeout(hideChartTooltip, 1700);
}

// Build a GitHub-style heatmap of the last 12 weeks: one little square per day,
// tinted by how many sets were done that day (darker = more). Helps you see your
// consistency at a glance ("don't break the chain").
function buildHeatmap(sessions) {
  const WEEKS = 12;

  // Total sets done on each calendar day.
  const setsByDay = {};
  sessions.forEach((session) => {
    const key = dayKeyOf(session.date);
    const sets = session.entries.reduce(
      (sum, entry) => sum + entrySetsDone(entry),
      0
    );
    setsByDay[key] = (setsByDay[key] || 0) + sets;
  });

  const wrap = document.createElement("div");

  const heading = document.createElement("div");
  heading.className = "heatmap-heading";
  heading.textContent = "Last 12 weeks";
  wrap.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "heatmap";

  // Start from the Monday 11 weeks before this week (12 columns total).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = weekMondayMidnight(today);
  startMonday.setDate(startMonday.getDate() - (WEEKS - 1) * 7);

  // Fill column-by-column (each column is a week; rows are Mon→Sun).
  for (let col = 0; col < WEEKS; col = col + 1) {
    for (let row = 0; row < 7; row = row + 1) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + col * 7 + row);

      const sets = setsByDay[dayKeyOf(cellDate)] || 0;
      let level = 0;
      if (sets >= 6) {
        level = 3;
      } else if (sets >= 3) {
        level = 2;
      } else if (sets >= 1) {
        level = 1;
      }

      const label =
        formatDate(cellDate.toISOString()) +
        (sets > 0 ? " · " + sets + " sets" : " · rest");

      const cell = document.createElement("div");
      cell.className = "hm-cell hm-cell--l" + level;
      // Days after today aren't "missed" — just not here yet; dim them.
      if (cellDate > today) {
        cell.classList.add("hm-cell--future");
      }
      cell.title = label; // desktop hover
      // Tap/click shows the same info in a bubble (works on touch screens).
      cell.addEventListener("click", (event) => showHeatmapTooltip(label, event));
      grid.appendChild(cell);
    }
  }
  wrap.appendChild(grid);

  // A small "Less → More" legend.
  const legend = document.createElement("div");
  legend.className = "heatmap-legend";
  const less = document.createElement("span");
  less.textContent = "Less";
  legend.appendChild(less);
  [0, 1, 2, 3].forEach((lvl) => {
    const swatch = document.createElement("span");
    swatch.className = "hm-cell hm-cell--l" + lvl;
    legend.appendChild(swatch);
  });
  const more = document.createElement("span");
  more.textContent = "More";
  legend.appendChild(more);
  wrap.appendChild(legend);

  return wrap;
}

// Draw the whole Progress view.
function renderProgress() {
  const subtitle = document.getElementById("progressSubtitle");
  const summary = document.getElementById("weekSummary");
  const heading = document.getElementById("byExerciseHeading");
  const list = document.getElementById("exerciseProgressList");
  summary.innerHTML = "";
  list.innerHTML = "";
  document.getElementById("insights").innerHTML = ""; // cleared; filled below

  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    subtitle.textContent = "No profile selected";
    heading.hidden = true;
    summary.appendChild(
      createEmptyState("👤", "Create a profile in Settings to get started.")
    );
    return;
  }
  subtitle.textContent = activeProfile.name + "'s activity";

  const activeId = loadActiveProfileId();
  // Only finished workouts count towards progress (skip in-progress ones).
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (session) =>
      session.profileId === activeId && isCompletedSession(session)
  );

  // --- Insights card (streak, days, lifetime totals, personal records) ---
  renderInsights(sessions);

  // --- "This week" summary ---
  const startOfWeek = getStartOfWeek();
  const weekSessions = sessions.filter(
    (session) => new Date(session.date) >= startOfWeek
  );
  const workoutsThisWeek = weekSessions.length;
  const setsThisWeek = weekSessions.reduce(
    (sum, session) =>
      sum +
      session.entries.reduce((inner, entry) => inner + entrySetsDone(entry), 0),
    0
  );
  summary.appendChild(buildWeekSummaryCard(workoutsThisWeek, setsThisWeek));

  // --- Per-exercise breakdown ---
  if (sessions.length === 0) {
    heading.hidden = true;
    list.appendChild(
      createEmptyState("📊", "No workouts yet — finish one to see your progress.")
    );
    return;
  }

  // Sort oldest → newest so the chart reads left (older) to right (newer).
  const sortedSessions = sessions
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const exercises = getExercisesForActiveProfile();
  exercises.forEach((exercise) => {
    // For each session this exercise appears in, remember one "point" of data.
    // We keep the whole session so a bar can show its full details when clicked.
    const points = [];
    let totalSets = 0;
    let lastWeight = null;

    sortedSessions.forEach((session) => {
      const entry = session.entries.find(
        (item) => item.exerciseId === exercise.id
      );
      // Only include sessions where this exercise was actually trained
      // (at least one set ticked done) — skip ones left untouched.
      if (entry && entrySetsDone(entry) > 0) {
        const setsDone = entrySetsDone(entry);
        const entryWeight = entryLastWeight(entry);
        points.push({
          date: session.date,
          reps: entryRepsDone(entry), // mint bar = total reps done
          weight: entryMaxWeight(entry), // lavender bar = heaviest weight
          session: session,
        });
        totalSets += setsDone;
        if (entryWeight !== null) {
          lastWeight = entryWeight;
        }
      }
    });

    // Only show exercises that have actually been trained.
    if (points.length > 0) {
      list.appendChild(
        buildExerciseProgressCard(exercise, points, totalSets, lastWeight)
      );
    }
  });

  heading.hidden = list.children.length === 0;
  if (list.children.length === 0) {
    list.appendChild(
      createEmptyState("📊", "Finish a workout to see per-exercise progress.")
    );
  }
}

// Redraw everything at once (simple and reliable for a small app).
function renderAll() {
  renderActiveProfileChip();
  renderToday();
  renderSchedule();
  renderProfiles();
  renderHistory();
  renderProgress();
  renderWeeklyGoalInput();
}

/* =========================================================================
   5. PROFILE ACTIONS — create, switch, delete
   ========================================================================= */

// Create a profile: write it to the cloud first (the source of truth), then
// mirror it into the local cache. (Phase 7e)
async function createProfile(name) {
  const newProfile = {
    id: makeId(),
    name: name,
    createdAt: new Date().toISOString(),
  };

  // user_id is filled in automatically by the database (default auth.uid()).
  const { error } = await supabaseClient.from("profiles").insert({
    id: newProfile.id,
    name: newProfile.name,
    created_at: newProfile.createdAt,
  });
  if (error) {
    window.alert("Couldn't save the profile to the cloud:\n" + error.message);
    return;
  }

  const profiles = loadList(STORAGE_KEYS.profiles);
  profiles.push(newProfile);
  saveList(STORAGE_KEYS.profiles, profiles);

  // If this is the first profile, make it active automatically.
  if (!loadActiveProfileId()) {
    saveActiveProfileId(newProfile.id);
  }

  renderAll();
}

// Which profile is "active" is a per-device choice, so it stays local-only.
function setActiveProfile(id) {
  saveActiveProfileId(id);
  renderAll();
}

// Delete a profile: remove it from the cloud first (the database cascades to its
// exercises/sessions), then clear it from the local cache. (Phase 7e)
async function deleteProfile(id) {
  const ok = window.confirm(
    "Delete this profile and all of its exercises? This cannot be undone."
  );
  if (!ok) {
    return;
  }

  const { error } = await supabaseClient.from("profiles").delete().eq("id", id);
  if (error) {
    window.alert("Couldn't delete the profile from the cloud:\n" + error.message);
    return;
  }

  // Remove the profile from the local cache.
  let profiles = loadList(STORAGE_KEYS.profiles);
  profiles = profiles.filter((profile) => profile.id !== id);
  saveList(STORAGE_KEYS.profiles, profiles);

  // Remove that profile's exercises too.
  let exercises = loadList(STORAGE_KEYS.exercises);
  exercises = exercises.filter((exercise) => exercise.profileId !== id);
  saveList(STORAGE_KEYS.exercises, exercises);

  // Remove that profile's saved workout sessions too, so no orphan data is left.
  let sessions = loadList(STORAGE_KEYS.sessions);
  sessions = sessions.filter((session) => session.profileId !== id);
  saveList(STORAGE_KEYS.sessions, sessions);

  // If we deleted the active profile, pick another one (or none).
  if (loadActiveProfileId() === id) {
    saveActiveProfileId(profiles.length > 0 ? profiles[0].id : null);
  }

  renderAll();
}

/* =========================================================================
   5b. CLOUD SYNC — profiles (Phase 7e)
   The database is the source of truth; localStorage is a write-through cache.
   On login we reconcile the two (and, on a first login with existing local
   data, upload it). Profiles only for now — exercises/sessions come next.
   ========================================================================= */

// Convert a database row to the app's profile shape.
function mapProfileFromCloud(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

// Fetch this user's profiles from the cloud (or null if the request failed).
async function pullProfilesFromCloud() {
  const { data, error } = await supabaseClient.from("profiles").select("*");
  if (error) {
    console.error("Could not load profiles from cloud:", error.message);
    return null;
  }
  return data;
}

// Upload local profiles to the cloud (used for the first-login migration).
async function uploadProfilesToCloud(localProfiles) {
  const rows = localProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    created_at: profile.createdAt || new Date().toISOString(),
  }));
  const { error } = await supabaseClient.from("profiles").insert(rows);
  if (error) {
    console.error("Could not upload profiles:", error.message);
  }
}

// Wipe the local cache (used when a DIFFERENT user logs in on this device).
function clearLocalData() {
  saveList(STORAGE_KEYS.profiles, []);
  saveList(STORAGE_KEYS.exercises, []);
  saveList(STORAGE_KEYS.sessions, []);
  saveActiveProfileId(null);
}

// Make sure the active profile id still points at a profile that exists.
function ensureValidActiveProfile() {
  const profiles = loadList(STORAGE_KEYS.profiles);
  const activeId = loadActiveProfileId();
  if (!profiles.some((profile) => profile.id === activeId)) {
    saveActiveProfileId(profiles.length > 0 ? profiles[0].id : null);
  }
}

// Reconcile cloud vs local for profiles when a user logs in.
// Reconcile one entity (a localStorage list) with the cloud:
//   - cloud has rows  → the cloud wins; mirror it into the local cache
//   - cloud is empty but we have local rows → upload them (migration)
// (By the time this runs, local data is either this user's or has been cleared,
// so uploading is always safe.)
async function reconcileEntity(storageKey, pullFn, uploadFn, mapFromCloud) {
  const cloud = await pullFn();
  if (cloud === null) {
    return; // offline / error → keep the local cache as-is
  }
  const local = loadList(storageKey);
  if (cloud.length > 0) {
    saveList(storageKey, cloud.map(mapFromCloud));
  } else if (local.length > 0) {
    await uploadFn(local);
  }
}

// Reconcile everything when a user logs in. Order matters: profiles before
// exercises (exercises reference a profile). Sessions come in a later sub-step.
async function syncOnLogin(userId) {
  const syncedUserId = localStorage.getItem(STORAGE_KEYS.syncedUserId);
  // If a DIFFERENT user's data is cached on this device, start fresh first so we
  // never upload their data into this account.
  if (syncedUserId && syncedUserId !== userId) {
    clearLocalData();
  }

  await reconcileEntity(
    STORAGE_KEYS.profiles,
    pullProfilesFromCloud,
    uploadProfilesToCloud,
    mapProfileFromCloud
  );
  await reconcileEntity(
    STORAGE_KEYS.exercises,
    pullExercisesFromCloud,
    uploadExercisesToCloud,
    mapExerciseFromCloud
  );

  localStorage.setItem(STORAGE_KEYS.syncedUserId, userId);
}

// Called by auth.js when a user is signed in: sync, then redraw.
async function onUserLoggedIn(session) {
  await syncOnLogin(session.user.id);
  ensureValidActiveProfile();
  renderAll();
}

/* ---- Exercise cloud helpers (Phase 7e) ---- */

// Convert a database row to the app's exercise shape (and back).
function mapExerciseFromCloud(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    repsPerSet: row.reps_per_set,
    weight: row.weight,
    weightPerSet: row.weight_per_set,
    icon: row.icon,
    day: row.day,
    notes: row.notes,
  };
}
function exerciseToRow(exercise) {
  return {
    id: exercise.id,
    profile_id: exercise.profileId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    reps_per_set: exercise.repsPerSet,
    weight: exercise.weight,
    weight_per_set: exercise.weightPerSet,
    icon: exercise.icon,
    day: exercise.day,
    notes: exercise.notes,
  };
}

async function pullExercisesFromCloud() {
  const { data, error } = await supabaseClient.from("exercises").select("*");
  if (error) {
    console.error("Could not load exercises from cloud:", error.message);
    return null;
  }
  return data;
}

// Upload local exercises (normalized so older ones get their per-set fields).
async function uploadExercisesToCloud(localExercises) {
  const rows = localExercises.map((exercise) =>
    exerciseToRow(normalizeExercise(exercise))
  );
  const { error } = await supabaseClient.from("exercises").insert(rows);
  if (error) {
    console.error("Could not upload exercises:", error.message);
  }
}

/* =========================================================================
   6. EXERCISE ACTIONS — add, edit, delete
   ========================================================================= */

async function deleteExercise(id) {
  const ok = window.confirm(
    "Delete this exercise? Its past workout history will be removed too. " +
      "This cannot be undone (but a backup you exported earlier can restore it)."
  );
  if (!ok) {
    return;
  }

  // Remove it from the cloud first (the source of truth).
  const { error } = await supabaseClient
    .from("exercises")
    .delete()
    .eq("id", id);
  if (error) {
    window.alert("Couldn't delete the exercise from the cloud:\n" + error.message);
    return;
  }

  // Remove the exercise itself from the local cache.
  let exercises = loadList(STORAGE_KEYS.exercises);
  exercises = exercises.filter((exercise) => exercise.id !== id);
  saveList(STORAGE_KEYS.exercises, exercises);

  // Clean up after it: remove this exercise from every saved workout, then
  // drop any workout that's left with no exercises at all. This keeps history
  // and personal-record data honest (no orphaned leftovers in storage).
  const sessions = loadList(STORAGE_KEYS.sessions)
    .map((session) => ({
      ...session,
      entries: session.entries.filter((entry) => entry.exerciseId !== id),
    }))
    .filter((session) => session.entries.length > 0);
  saveList(STORAGE_KEYS.sessions, sessions);

  // Removing workouts may lower a profile's count below a celebrated milestone,
  // so reconcile the trophy tracker too.
  reconcileCelebratedMilestones();

  renderAll();
}

/* =========================================================================
   7. THE EXERCISE MODAL (add/edit form)
   The same pop-up is used for both adding and editing. When the hidden
   "exerciseIdInput" has a value, we're editing; when it's empty, we're adding.
   ========================================================================= */

let selectedEmoji = EMOJI_PRESETS[0]; // remembers which emoji is chosen in the form

// Remembers the day used when adding exercises, so adding several in a row keeps
// the same day. It starts as today and only resets to today on a fresh page load
// (it lives in memory, not localStorage).
let lastChosenDay = getTodayName();

// Build the row of emoji choices once, at startup.
function buildEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  picker.innerHTML = "";

  EMOJI_PRESETS.forEach((emoji) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "emoji-option";
    option.textContent = emoji;
    option.addEventListener("click", () => selectEmoji(emoji));
    picker.appendChild(option);
  });
}

// Mark one emoji as chosen (and highlight it).
function selectEmoji(emoji) {
  selectedEmoji = emoji;
  const options = document.querySelectorAll(".emoji-option");
  options.forEach((option) => {
    const isChosen = option.textContent === emoji;
    option.classList.toggle("emoji-option--selected", isChosen);
  });
}

/* ---- Per-set rows in the add/edit form (Phase 2) ---- */

// Draw one row per set: "Set N  [reps]  [weight]", pre-filled from the arrays.
function buildSetRows(sets, repsArray, weightArray) {
  const container = document.getElementById("setRows");
  container.innerHTML = "";

  for (let i = 0; i < sets; i = i + 1) {
    const row = document.createElement("div");
    row.className = "set-row";

    const label = document.createElement("span");
    label.className = "set-row__label";
    label.textContent = "Set " + (i + 1);

    const repsInput = document.createElement("input");
    repsInput.className = "input set-row__reps";
    repsInput.type = "number";
    repsInput.min = "1";
    repsInput.max = "999";
    repsInput.setAttribute("aria-label", "Set " + (i + 1) + " reps");
    repsInput.value = repsArray[i];

    const weightInput = document.createElement("input");
    weightInput.className = "input set-row__weight";
    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.step = "any";
    weightInput.placeholder = "weight";
    weightInput.setAttribute("aria-label", "Set " + (i + 1) + " weight");
    if (weightArray[i] !== null && weightArray[i] !== undefined) {
      weightInput.value = weightArray[i];
    }

    row.appendChild(label);
    row.appendChild(repsInput);
    row.appendChild(weightInput);
    container.appendChild(row);
  }
}

// Read the current values out of the per-set rows on screen.
function gatherSetRows() {
  const repsInputs = document.querySelectorAll("#setRows .set-row__reps");
  const weightInputs = document.querySelectorAll("#setRows .set-row__weight");

  const reps = Array.from(repsInputs).map((input) => Number(input.value));
  const weights = Array.from(weightInputs).map((input) => {
    const text = input.value.trim();
    return text === "" ? null : Number(text);
  });
  return { reps: reps, weights: weights };
}

// When the Sets number changes, grow/shrink the rows, keeping what's there and
// seeding any new rows from the current default reps/weight.
function handleSetsCountChange() {
  const setsInput = document.getElementById("setsInput");
  const sets = clampNumber(Number(setsInput.value), 1, 20);
  // Keep the input in sync with what we actually built (e.g. if it was clamped).
  setsInput.value = sets;
  const defaultReps = Number(document.getElementById("repsInput").value) || 10;
  const weightText = document.getElementById("weightInput").value.trim();
  const defaultWeight = weightText === "" ? null : Number(weightText);

  const current = gatherSetRows();
  const newReps = resizeArray(current.reps, sets, defaultReps);
  const newWeights = resizeArray(current.weights, sets, defaultWeight);
  buildSetRows(sets, newReps, newWeights);
}

// Typing a default reps/weight fills every per-set row with that value.
function applyDefaultRepsToRows() {
  const value = document.getElementById("repsInput").value;
  document
    .querySelectorAll("#setRows .set-row__reps")
    .forEach((input) => {
      input.value = value;
    });
}
function applyDefaultWeightToRows() {
  const value = document.getElementById("weightInput").value;
  document
    .querySelectorAll("#setRows .set-row__weight")
    .forEach((input) => {
      input.value = value;
    });
}

// Keep a number within a range (used for the sets count).
function clampNumber(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

// Show the modal.
function openModal() {
  document.getElementById("formError").hidden = true;
  document.getElementById("exerciseModal").hidden = false;
  // Move keyboard focus into the first field for easy typing.
  document.getElementById("nameInput").focus();
}

// Hide the modal.
function closeModal() {
  document.getElementById("exerciseModal").hidden = true;
}

// Open the modal ready to ADD a new exercise (empty form with defaults).
function openExerciseModalForAdd() {
  // Don't allow adding exercises with no profile selected.
  if (!getActiveProfile()) {
    window.alert("Please create a profile in Settings first.");
    switchView("settings");
    return;
  }

  document.getElementById("modalTitle").textContent = "Add exercise";
  document.getElementById("exerciseIdInput").value = ""; // empty = adding
  document.getElementById("nameInput").value = "";
  document.getElementById("setsInput").value = 3;
  document.getElementById("repsInput").value = 10;
  document.getElementById("weightInput").value = ""; // no weight by default
  // Default to the day last used (today on a fresh load), so adding several
  // exercises to the same day doesn't make you re-pick it each time.
  document.getElementById("dayInput").value = lastChosenDay;
  selectEmoji(EMOJI_PRESETS[0]);

  // Three sets of 10 reps, no weight, to start.
  buildSetRows(3, [10, 10, 10], [null, null, null]);

  openModal();
}

// Open the modal ready to EDIT an existing exercise (form pre-filled).
function openExerciseModalForEdit(id) {
  const stored = loadList(STORAGE_KEYS.exercises).find((item) => item.id === id);
  if (!stored) {
    return;
  }
  // Normalize so older exercises gain the per-set fields before we show them.
  const exercise = normalizeExercise(stored);

  document.getElementById("modalTitle").textContent = "Edit exercise";
  document.getElementById("exerciseIdInput").value = exercise.id; // not empty = editing
  document.getElementById("nameInput").value = exercise.name;
  document.getElementById("setsInput").value = exercise.sets;
  document.getElementById("repsInput").value = exercise.reps;
  document.getElementById("weightInput").value =
    exercise.weight === null ? "" : exercise.weight;
  document.getElementById("dayInput").value = exercise.day;
  selectEmoji(exercise.icon);

  buildSetRows(exercise.sets, exercise.repsPerSet, exercise.weightPerSet);

  openModal();
}

// Handle the form being submitted (covers both add and edit).
async function handleExerciseFormSubmit(event) {
  event.preventDefault(); // stop the browser from reloading the page

  // Read the values from the form.
  const id = document.getElementById("exerciseIdInput").value;
  const name = document.getElementById("nameInput").value.trim();
  const reps = Number(document.getElementById("repsInput").value);
  const day = document.getElementById("dayInput").value;
  // The per-set reps and weights typed into the rows. The rows are the source
  // of truth for how many sets there are.
  const perSet = gatherSetRows();
  const sets = perSet.reps.length;

  // Light validation (per CLAUDE.md): name required, sets/reps positive numbers.
  const errorEl = document.getElementById("formError");
  if (name === "") {
    showFormError("Please enter an exercise name.");
    return;
  }
  if (!Number.isInteger(sets) || sets < 1) {
    showFormError("Sets must be a whole number of 1 or more.");
    return;
  }
  if (!Number.isInteger(reps) || reps < 1) {
    showFormError("Default reps must be a whole number of 1 or more.");
    return;
  }
  // Each set's reps must be a whole number of 1+.
  const repsValid = perSet.reps.every(
    (value) => Number.isInteger(value) && value >= 1
  );
  if (!repsValid) {
    showFormError("Each set's reps must be a whole number of 1 or more.");
    return;
  }
  // Weights are optional, but any entered must be 0 or more.
  const weightsValid = perSet.weights.every(
    (value) => value === null || (!Number.isNaN(value) && value >= 0)
  );
  if (!weightsValid) {
    showFormError("Weights must be 0 or more (or left blank).");
    return;
  }
  errorEl.hidden = true;

  // The optional default weight (blank = none).
  const weightText = document.getElementById("weightInput").value.trim();
  const defaultWeight = weightText === "" ? null : Number(weightText);

  const exercises = loadList(STORAGE_KEYS.exercises);

  if (id === "") {
    // ADDING: build a new exercise, save it to the cloud, then cache it locally.
    const newExercise = {
      id: makeId(),
      profileId: loadActiveProfileId(),
      name: name,
      sets: sets,
      reps: reps, // default reps (used to seed new sets)
      repsPerSet: perSet.reps,
      weight: defaultWeight, // default weight
      weightPerSet: perSet.weights,
      icon: selectedEmoji,
      day: day,
      notes: "", // reserved for a later phase
    };
    const { error } = await supabaseClient
      .from("exercises")
      .insert(exerciseToRow(newExercise));
    if (error) {
      window.alert("Couldn't save the exercise to the cloud:\n" + error.message);
      return;
    }
    exercises.push(newExercise);
  } else {
    // EDITING: update the fields, push the change to the cloud, then cache it.
    const existing = exercises.find((item) => item.id === id);
    if (existing) {
      existing.name = name;
      existing.sets = sets;
      existing.reps = reps;
      existing.repsPerSet = perSet.reps;
      existing.weight = defaultWeight;
      existing.weightPerSet = perSet.weights;
      existing.icon = selectedEmoji;
      existing.day = day;

      const { error } = await supabaseClient
        .from("exercises")
        .update(exerciseToRow(existing))
        .eq("id", id);
      if (error) {
        window.alert("Couldn't update the exercise in the cloud:\n" + error.message);
        return;
      }
    }
  }

  // Remember this day so the next "Add exercise" defaults to it.
  lastChosenDay = day;

  saveList(STORAGE_KEYS.exercises, exercises);
  closeModal();
  renderAll();
}

function showFormError(message) {
  const errorEl = document.getElementById("formError");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

/* =========================================================================
   7b. WORKOUT MODE + REST TIMER (save as you go — Roadmap v2 Phase 3)
   A workout is a Session with status "in-progress". It is saved to localStorage
   continuously as you edit it, so progress survives a refresh. Each entry holds
   a per-set list { reps, weight, done } seeded from the plan. You can edit
   reps/weight, tick sets done, and add/remove sets — all of which affect ONLY
   this day's session, never the saved exercise. "Finish" marks it completed.
   ========================================================================= */

// The session open in workout mode (a working copy kept in sync with
// localStorage), or null when the workout sheet is closed.
let activeSession = null;

// --- Session helpers (also used by history & progress) ---

// Is this a finished session? Old sessions (no status) count as completed.
function isCompletedSession(session) {
  return session.status !== "in-progress";
}

// How many sets were done in an entry. Works for both the new per-set shape
// and the old { setsDone } shape, so existing history still reads correctly.
function entrySetsDone(entry) {
  if (Array.isArray(entry.sets)) {
    return entry.sets.filter((set) => set.done).length;
  }
  return entry.setsDone || 0;
}

// The last weight recorded in an entry (per-set new shape, or old single weight).
function entryLastWeight(entry) {
  if (Array.isArray(entry.sets)) {
    let weight = null;
    entry.sets.forEach((set) => {
      // Only sets the user actually ticked done count as "performed".
      if (set.done && set.weight !== null && set.weight !== undefined) {
        weight = set.weight;
      }
    });
    return weight;
  }
  // Old shape: a weight only counts if at least one set was done.
  return (entry.setsDone || 0) > 0 &&
    entry.weight !== null &&
    entry.weight !== undefined
    ? entry.weight
    : null;
}

// Total reps actually done in an entry (sum of done sets' reps). Old sessions
// didn't store reps, so we fall back to the set count there.
function entryRepsDone(entry) {
  if (Array.isArray(entry.sets)) {
    return entry.sets
      .filter((set) => set.done)
      .reduce((sum, set) => sum + (Number(set.reps) || 0), 0);
  }
  return entry.setsDone || 0;
}

// The heaviest weight used in an entry (for the weight progression bar).
function entryMaxWeight(entry) {
  if (Array.isArray(entry.sets)) {
    let max = null;
    entry.sets.forEach((set) => {
      // Only count done sets, so an untouched/unticked set is never recorded.
      if (set.done && set.weight !== null && set.weight !== undefined) {
        max = max === null ? set.weight : Math.max(max, set.weight);
      }
    });
    return max;
  }
  // Old shape: a weight only counts if at least one set was done.
  return (entry.setsDone || 0) > 0 &&
    entry.weight !== null &&
    entry.weight !== undefined
    ? entry.weight
    : null;
}

// Find an in-progress session for the active profile + day (to resume), or null.
function findInProgressSession(day) {
  const activeId = loadActiveProfileId();
  return (
    loadList(STORAGE_KEYS.sessions).find(
      (session) =>
        session.profileId === activeId &&
        session.day === day &&
        session.status === "in-progress"
    ) || null
  );
}

// Save the active session into gym:sessions (replace if present, else add).
function persistActiveSession() {
  if (!activeSession) {
    return;
  }
  activeSession.updatedAt = new Date().toISOString();
  const sessions = loadList(STORAGE_KEYS.sessions);
  const index = sessions.findIndex((s) => s.id === activeSession.id);
  if (index === -1) {
    sessions.push(activeSession);
  } else {
    sessions[index] = activeSession;
  }
  saveList(STORAGE_KEYS.sessions, sessions);
}

// Look up an exercise (for its name/icon) by id.
function findExerciseById(id) {
  return loadList(STORAGE_KEYS.exercises).find((ex) => ex.id === id) || null;
}

// Begin a NEW workout for a day, or resume the in-progress one if it exists.
function startWorkout(day) {
  let session = findInProgressSession(day);

  if (!session) {
    // No workout in progress for this day → build a fresh one from the plan.
    const exercisesForDay = getExercisesForActiveProfile().filter(
      (exercise) => exercise.day === day
    );
    if (exercisesForDay.length === 0) {
      window.alert("There are no exercises planned for " + day + ".");
      return;
    }
    session = {
      id: makeId(),
      profileId: loadActiveProfileId(),
      date: new Date().toISOString(),
      day: day,
      status: "in-progress",
      // Each entry's sets are seeded from the exercise's per-set plan, including
      // the default weight. Editing them here won't change the plan.
      entries: exercisesForDay.map((exercise) => ({
        exerciseId: exercise.id,
        sets: exercise.repsPerSet.map((reps, i) => ({
          reps: reps,
          weight: exercise.weightPerSet[i],
          done: false,
        })),
      })),
    };
  }

  activeSession = session;
  persistActiveSession(); // a brand-new session is saved immediately

  document.getElementById("workoutTitle").textContent = day + " workout";
  resetTimerDisplay();
  renderWorkoutItems();
  populateWorkoutDate();
  document.getElementById("workoutOverlay").hidden = false;
}

// Fill the date field from the open session.
function populateWorkoutDate() {
  if (activeSession) {
    document.getElementById("workoutDateInput").value = toDateInputValue(
      activeSession.date
    );
  }
}

// Changing the date also re-labels the day (e.g. a Friday date → "Friday
// workout"), so the date and the wording in history always match.
function handleWorkoutDateChange() {
  if (!activeSession) {
    return;
  }
  const value = document.getElementById("workoutDateInput").value; // YYYY-MM-DD
  if (!value) {
    return; // ignore an empty/cleared field
  }
  const parts = value.split("-").map(Number);
  // Noon local, so the day never slips across a timezone boundary.
  const newDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

  activeSession.date = newDate.toISOString();
  activeSession.day = dayNameOf(newDate);
  persistActiveSession();

  // Keep the sheet title in sync with the (possibly new) day.
  document.getElementById("workoutTitle").textContent =
    activeSession.day + " workout";
}

// Draw the workout: each exercise with editable per-set rows.
function renderWorkoutItems() {
  const container = document.getElementById("workoutList");
  container.innerHTML = "";

  activeSession.entries.forEach((entry, entryIndex) => {
    const exercise = findExerciseById(entry.exerciseId);

    const card = document.createElement("div");
    card.className = "workout-exercise";

    // Top row: emoji, name, and a done/total count.
    const top = document.createElement("div");
    top.className = "workout-exercise__top";

    const icon = document.createElement("div");
    icon.className = "exercise__icon";
    icon.textContent = exercise ? exercise.icon : "❓";

    const info = document.createElement("div");
    info.className = "exercise__info";
    const name = document.createElement("div");
    name.className = "exercise__name";
    name.textContent = exercise ? exercise.name : "(deleted exercise)";
    info.appendChild(name);

    const doneCount = entry.sets.filter((set) => set.done).length;
    const progress = document.createElement("div");
    progress.className = "workout-exercise__progress";
    progress.textContent = doneCount + "/" + entry.sets.length;

    top.appendChild(icon);
    top.appendChild(info);
    top.appendChild(progress);
    card.appendChild(top);

    // Column headings for the set rows.
    const head = document.createElement("div");
    head.className = "wset-row wset-row--head";
    head.innerHTML =
      "<span></span><span>Reps</span><span>Weight</span><span></span>";
    card.appendChild(head);

    // One editable row per set.
    entry.sets.forEach((set, setIndex) => {
      card.appendChild(buildWorkoutSetRow(entryIndex, setIndex, set));
    });

    // "Add set" button (for this day only).
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--ghost btn--small wset-add";
    addBtn.textContent = "＋ Add set";
    addBtn.addEventListener("click", () => addWorkoutSet(entryIndex));
    card.appendChild(addBtn);

    container.appendChild(card);
  });
}

// Build one editable set row: [done] [reps] [weight] [remove].
function buildWorkoutSetRow(entryIndex, setIndex, set) {
  const row = document.createElement("div");
  row.className = "wset-row";

  // Done toggle (reuses the round set-dot look; shows the set number or a tick).
  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "set-dot" + (set.done ? " set-dot--done" : "");
  doneBtn.textContent = set.done ? "✓" : String(setIndex + 1);
  doneBtn.setAttribute("aria-label", "Mark set " + (setIndex + 1) + " done");
  doneBtn.addEventListener("click", () => toggleWorkoutSet(entryIndex, setIndex));

  const repsInput = document.createElement("input");
  repsInput.className = "input";
  repsInput.type = "number";
  repsInput.min = "1";
  repsInput.value = set.reps;
  repsInput.setAttribute("aria-label", "Set " + (setIndex + 1) + " reps");
  repsInput.addEventListener("input", () => {
    set.reps = Number(repsInput.value) || 0;
    persistActiveSession();
  });

  const weightInput = document.createElement("input");
  weightInput.className = "input";
  weightInput.type = "number";
  weightInput.min = "0";
  weightInput.step = "any";
  weightInput.placeholder = "—";
  if (set.weight !== null && set.weight !== undefined) {
    weightInput.value = set.weight;
  }
  weightInput.setAttribute("aria-label", "Set " + (setIndex + 1) + " weight");
  weightInput.addEventListener("input", () => {
    const text = weightInput.value.trim();
    set.weight = text === "" ? null : Number(text);
    persistActiveSession();
  });

  // Remove this set (for the day only).
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "wset-remove";
  removeBtn.textContent = "✕";
  removeBtn.setAttribute("aria-label", "Remove set " + (setIndex + 1));
  removeBtn.addEventListener("click", () =>
    removeWorkoutSet(entryIndex, setIndex)
  );

  row.appendChild(doneBtn);
  row.appendChild(repsInput);
  row.appendChild(weightInput);
  row.appendChild(removeBtn);
  return row;
}

// Tick a set done/undone (and save).
function toggleWorkoutSet(entryIndex, setIndex) {
  const set = activeSession.entries[entryIndex].sets[setIndex];
  set.done = !set.done;
  persistActiveSession();
  renderWorkoutItems();
}

// Add a set for today, seeded from the last set's values (and save).
function addWorkoutSet(entryIndex) {
  const sets = activeSession.entries[entryIndex].sets;
  const last = sets[sets.length - 1];
  sets.push({
    reps: last ? last.reps : 10,
    weight: last ? last.weight : null,
    done: false,
  });
  persistActiveSession();
  renderWorkoutItems();
}

// Remove a set for today (keep at least one), then save.
function removeWorkoutSet(entryIndex, setIndex) {
  const sets = activeSession.entries[entryIndex].sets;
  if (sets.length <= 1) {
    window.alert(
      "An exercise needs at least one set. (This only affects today, not the plan.)"
    );
    return;
  }
  sets.splice(setIndex, 1);
  persistActiveSession();
  renderWorkoutItems();
}

// Finish: mark the in-progress session completed, then close.
function finishWorkout() {
  if (!activeSession) {
    return;
  }

  // Count only the sets the user actually ticked done.
  const totalSets = activeSession.entries.reduce(
    (sum, entry) => sum + entry.sets.filter((set) => set.done).length,
    0
  );

  // A workout must have at least one completed set to be recorded — otherwise
  // nothing was actually done, so don't save it as a workout.
  if (totalSets === 0) {
    window.alert(
      "Tick at least one set as done before finishing — or tap Discard if you didn't train."
    );
    return;
  }

  activeSession.status = "completed";
  persistActiveSession();

  // Easter eggs: work out any celebrations BEFORE we clear activeSession.
  // (detectWorkoutMilestone also records the milestone so it only plays once.)
  const personalRecords = detectPersonalRecords(activeSession);
  const milestone = detectWorkoutMilestone();

  closeWorkoutOverlay();
  activeSession = null;
  renderAll();
  window.alert("Workout saved! " + totalSets + " sets done 💪");

  // After the alert is dismissed, play any celebrations on a clean screen.
  celebrateAfterWorkout(personalRecords, milestone);
}

// Discard: delete the in-progress session entirely (after a confirm).
function discardWorkout() {
  if (!activeSession) {
    return;
  }
  const ok = window.confirm(
    "Discard this workout? Today's progress will be deleted."
  );
  if (!ok) {
    return;
  }
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (session) => session.id !== activeSession.id
  );
  saveList(STORAGE_KEYS.sessions, sessions);

  closeWorkoutOverlay();
  activeSession = null;
  renderAll();
}

// Close the sheet but KEEP the in-progress session, so it can be resumed later.
function closeWorkoutOverlay() {
  stopRest();
  document.getElementById("workoutOverlay").hidden = true;
  // Redraw so the Today/Schedule buttons update (e.g. Start → Resume) now that
  // an in-progress workout may exist.
  renderAll();
}

/* ---- Edit & delete a completed workout (Roadmap v2 Phase 4) ---- */

// Convert an entry to the per-set shape if it's still the old { setsDone, weight }
// format. Reps are seeded from the exercise's current plan (or 10 if unknown).
function ensureEntrySets(entry, exercise) {
  if (Array.isArray(entry.sets)) {
    return entry; // already the new shape
  }
  const doneCount = entry.setsDone || 0;
  const rowCount = Math.max(doneCount, 1);
  const plan = exercise ? normalizeExercise(exercise) : null;
  const oldWeight =
    entry.weight !== null && entry.weight !== undefined ? entry.weight : null;

  const sets = [];
  for (let i = 0; i < rowCount; i = i + 1) {
    let reps = 10;
    if (plan && plan.repsPerSet[i] !== undefined) {
      reps = plan.repsPerSet[i];
    } else if (plan) {
      reps = plan.reps;
    }
    sets.push({ reps: reps, weight: oldWeight, done: i < doneCount });
  }
  return { exerciseId: entry.exerciseId, sets: sets };
}

// Reopen a saved workout in the editor (upgrading old sessions to the new shape).
function editSession(sessionId) {
  const session = loadList(STORAGE_KEYS.sessions).find(
    (item) => item.id === sessionId
  );
  if (!session) {
    return;
  }

  // Upgrade every entry to the per-set shape so the editor can show rows.
  session.entries = session.entries.map((entry) =>
    ensureEntrySets(entry, findExerciseById(entry.exerciseId))
  );
  if (!session.status) {
    session.status = "completed";
  }

  activeSession = session;
  persistActiveSession(); // save the upgraded shape straight away

  document.getElementById("workoutTitle").textContent =
    (session.day || "Workout") + " workout";
  resetTimerDisplay();
  renderWorkoutItems();
  populateWorkoutDate();
  document.getElementById("workoutOverlay").hidden = false;
}

// Delete a saved workout from history (after a confirm).
function deleteSession(sessionId) {
  const ok = window.confirm(
    "Delete this workout from history? This cannot be undone."
  );
  if (!ok) {
    return;
  }
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (item) => item.id !== sessionId
  );
  saveList(STORAGE_KEYS.sessions, sessions);
  // Easter egg upkeep: if this drop took you below a celebrated milestone,
  // forget it so re-reaching that count triggers the trophy again.
  reconcileCelebratedMilestones();
  renderAll();
}

/* ---- Rest timer ---- */

let restIntervalId = null; // the setInterval handle (null when not running)
let restRemaining = 0; // seconds left on the clock

// One shared sound channel for the whole app. Browsers block audio until the
// user interacts with the page, so we create/unlock this when a timer button is
// tapped (a real tap) and then reuse it for the beep at zero.
let audioContext = null;

// Make sure our sound channel exists and is "running" (not blocked/suspended).
// Safe to call from a button tap.
function ensureAudioReady() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return; // this browser has no Web Audio — we'll just skip sound
    }
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    // If the browser suspended it, a tap lets us resume it.
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  } catch (error) {
    console.log("Could not set up audio:", error);
  }
}

// Start (or restart) the rest timer for a number of seconds.
function startRest(seconds) {
  stopRest(); // clear any timer already running

  // We're inside a real button tap here, so this is the moment to unlock sound.
  ensureAudioReady();

  restRemaining = seconds;

  const display = document.getElementById("timerDisplay");
  display.classList.remove("is-done");
  display.classList.add("is-running");
  updateTimerDisplay();

  // Count down once per second.
  restIntervalId = setInterval(() => {
    restRemaining = restRemaining - 1;
    if (restRemaining <= 0) {
      finishRest();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

// Called when the countdown reaches zero: beep + show "Done".
function finishRest() {
  stopRest();
  const display = document.getElementById("timerDisplay");
  display.textContent = "Done! 💪";
  display.classList.add("is-done");
  playBeep();
}

// Stop the timer (used by Stop button, finishing, and closing the sheet).
function stopRest() {
  if (restIntervalId !== null) {
    clearInterval(restIntervalId);
    restIntervalId = null;
  }
  document.getElementById("timerDisplay").classList.remove("is-running");
}

// Show the time left as M:SS (e.g. "1:30").
function updateTimerDisplay() {
  const minutes = Math.floor(restRemaining / 60);
  const seconds = restRemaining % 60;
  const paddedSeconds = seconds < 10 ? "0" + seconds : String(seconds);
  document.getElementById("timerDisplay").textContent =
    minutes + ":" + paddedSeconds;
}

// Reset the timer back to its idle look (called when a workout starts).
function resetTimerDisplay() {
  stopRest();
  const display = document.getElementById("timerDisplay");
  display.classList.remove("is-done");
  display.textContent = "Rest timer";
}

// Play a friendly double-beep using the browser's Web Audio API (no sound files).
// Reuses the shared audioContext that was unlocked when the timer started.
function playBeep() {
  ensureAudioReady(); // in case it was suspended again in the background
  if (!audioContext) {
    return; // no audio available — skip quietly
  }

  // Play one short tone. We schedule the volume to fade out so it doesn't click.
  function playTone(startTime, frequency) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Start a touch louder, then fade to silence over ~0.25s.
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.25);
  }

  // Two quick beeps so it's easy to notice.
  const now = audioContext.currentTime;
  playTone(now, 880); // first beep
  playTone(now + 0.3, 1175); // second, slightly higher beep
}

/* =========================================================================
   7c. BACKUP — export everything to a file, and import it back (Phase 3)
   ========================================================================= */

// Gather a CLEAN copy of the data for export.
// - profileIdFilter: null = all profiles, or a single profile's id.
// It drops anything that no longer exists, so deleted items never get exported:
//   * exercises belonging to a profile we're not exporting
//   * sessions belonging to a profile we're not exporting
//   * session entries that point at a deleted exercise (and now-empty sessions)
function gatherCleanData(profileIdFilter) {
  let profiles = loadList(STORAGE_KEYS.profiles);
  if (profileIdFilter) {
    profiles = profiles.filter((profile) => profile.id === profileIdFilter);
  }
  // The set of profile ids we're keeping (fast lookups with .includes()).
  const keptProfileIds = profiles.map((profile) => profile.id);

  // Keep only exercises that belong to a kept profile.
  const exercises = loadList(STORAGE_KEYS.exercises).filter((exercise) =>
    keptProfileIds.includes(exercise.profileId)
  );
  const keptExerciseIds = exercises.map((exercise) => exercise.id);

  // Keep sessions for kept profiles, prune entries for deleted exercises,
  // then drop any session that ends up with no entries left.
  const sessions = loadList(STORAGE_KEYS.sessions)
    .filter((session) => keptProfileIds.includes(session.profileId))
    .map((session) => ({
      ...session,
      entries: session.entries.filter((entry) =>
        keptExerciseIds.includes(entry.exerciseId)
      ),
    }))
    .filter((session) => session.entries.length > 0);

  return { profiles, exercises, sessions };
}

// Build the backup object and trigger a file download.
// "scopeLabel" is just used in the filename (e.g. "all" or the profile name).
function downloadBackup(cleanData, activeProfileId, scopeLabel) {
  const backup = {
    app: "athenas-arena",
    version: 1,
    scope: scopeLabel,
    exportedAt: new Date().toISOString(),
    data: {
      [STORAGE_KEYS.profiles]: cleanData.profiles,
      [STORAGE_KEYS.activeProfileId]: activeProfileId,
      [STORAGE_KEYS.exercises]: cleanData.exercises,
      [STORAGE_KEYS.sessions]: cleanData.sessions,
    },
  };

  // Turn the data into nicely-formatted text and wrap it in a downloadable file.
  const text = JSON.stringify(backup, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Trick to trigger a download: make a temporary link and "click" it.
  const link = document.createElement("a");
  link.href = url;
  const today = new Date().toISOString().slice(0, 10); // e.g. 2026-06-22
  // Make the scope safe for a filename (letters/numbers/dashes only).
  const safeScope = scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.download = "athenas-arena-backup-" + safeScope + "-" + today + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // tidy up
}

// Export EVERY profile's data.
function exportAll() {
  const cleanData = gatherCleanData(null);
  downloadBackup(cleanData, loadActiveProfileId(), "all");
}

// Export only the currently active profile's data.
function exportCurrentProfile() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    window.alert("There's no active profile to export. Pick one in Settings.");
    return;
  }
  const cleanData = gatherCleanData(activeProfile.id);
  // The exported file makes this profile the active one when imported.
  downloadBackup(cleanData, activeProfile.id, activeProfile.name);
}

// Read a backup file the user picked and restore the data from it.
function importData(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      const data = backup.data;

      // A quick sanity check that this looks like our backup format.
      if (!data || !Array.isArray(data[STORAGE_KEYS.profiles])) {
        window.alert("That file doesn't look like an Athena's Arena backup.");
        return;
      }

      // The profiles/exercises/sessions coming in from the file.
      const incomingProfiles = data[STORAGE_KEYS.profiles] || [];
      const incomingExercises = data[STORAGE_KEYS.exercises] || [];
      const incomingSessions = data[STORAGE_KEYS.sessions] || [];

      // Which profiles in the file already exist here? (Matched by their id.)
      const existingProfiles = loadList(STORAGE_KEYS.profiles);
      const existingIds = existingProfiles.map((profile) => profile.id);
      const incomingIds = incomingProfiles.map((profile) => profile.id);
      const newCount = incomingProfiles.filter(
        (profile) => !existingIds.includes(profile.id)
      ).length;
      const replacedCount = incomingProfiles.length - newCount;

      const ok = window.confirm(
        "Import this backup?\n\n" +
          newCount +
          " new profile(s) will be added.\n" +
          replacedCount +
          " existing profile(s) will be replaced.\n\n" +
          "Your other profiles will be left untouched."
      );
      if (!ok) {
        return;
      }

      // MERGE: drop any existing profile (and its data) that the file also
      // contains, then add the incoming versions. Profiles not in the file are
      // kept exactly as they were.
      const mergedProfiles = existingProfiles
        .filter((profile) => !incomingIds.includes(profile.id))
        .concat(incomingProfiles);

      const mergedExercises = loadList(STORAGE_KEYS.exercises)
        .filter((exercise) => !incomingIds.includes(exercise.profileId))
        .concat(incomingExercises);

      const mergedSessions = loadList(STORAGE_KEYS.sessions)
        .filter((session) => !incomingIds.includes(session.profileId))
        .concat(incomingSessions);

      saveList(STORAGE_KEYS.profiles, mergedProfiles);
      saveList(STORAGE_KEYS.exercises, mergedExercises);
      saveList(STORAGE_KEYS.sessions, mergedSessions);

      // Keep the current active profile if it still exists. Otherwise fall back
      // to the file's active profile, or just the first one available.
      const currentActiveId = loadActiveProfileId();
      const stillExists = mergedProfiles.some(
        (profile) => profile.id === currentActiveId
      );
      if (!stillExists) {
        const fileActiveId = data[STORAGE_KEYS.activeProfileId];
        const fileActiveExists = mergedProfiles.some(
          (profile) => profile.id === fileActiveId
        );
        if (fileActiveExists) {
          saveActiveProfileId(fileActiveId);
        } else {
          saveActiveProfileId(
            mergedProfiles.length > 0 ? mergedProfiles[0].id : null
          );
        }
      }

      renderAll();
      window.alert(
        "Import complete! " +
          newCount +
          " added, " +
          replacedCount +
          " replaced. 🎉"
      );
    } catch (error) {
      console.error("Import failed:", error);
      window.alert("Sorry, that file couldn't be read.");
    }
  };

  reader.readAsText(file);
}

/* =========================================================================
   7d. DARK MODE (Phase 4)
   We put data-theme="dark" on the <html> element; the CSS does the rest.
   The choice is saved so it sticks between visits.
   ========================================================================= */

// Apply a theme ("light" or "dark") to the page and update the toggle button.
function applyTheme(theme) {
  const toggle = document.getElementById("themeToggle");

  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (toggle) {
      toggle.textContent = "☀️"; // tapping now switches back to light
      toggle.setAttribute("aria-label", "Switch to light mode");
      toggle.setAttribute("aria-pressed", "true");
    }
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (toggle) {
      toggle.textContent = "🌙"; // tapping switches to dark
      toggle.setAttribute("aria-label", "Switch to dark mode");
      toggle.setAttribute("aria-pressed", "false");
    }
  }
}

// Work out which theme to start with: a saved choice wins; otherwise we follow
// the device's system setting.
function getStartingTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === "dark" || saved === "light") {
    return saved;
  }
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

// Flip between light and dark, and remember the choice.
function toggleTheme() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  localStorage.setItem(STORAGE_KEYS.theme, next);
  applyTheme(next);
}

/* =========================================================================
   7e. EASTER EGGS (just for fun) 🎉
   None of this touches your saved workouts — it only adds little surprises:
     1. Type "athena" anywhere to summon a flying owl + "Wisdom +1" toast.
     3. Confetti + a "New PR!" card when you beat a past weight for an exercise.
     4. A one-time trophy when your total workouts reaches a milestone (7, 30 …).
     7. Tap the app title 5 times quickly to reveal a hidden credits card.
   ========================================================================= */

/* ---- Shared little effects (reused by several eggs) ---- */

// Drop a burst of colourful confetti pieces from the top of the screen.
// Each piece is a small <span> that falls and fades, then removes itself.
function launchConfetti(pieceCount) {
  const colors = ["#ef7c7c", "#5fc4bc", "#f6d365", "#b9a7e0"];
  const count = pieceCount || 80;

  for (let i = 0; i < count; i = i + 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    // Random horizontal start, colour, size, and timing so it looks natural.
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.animationDuration = 2 + Math.random() * 1.5 + "s";
    const size = 6 + Math.random() * 8;
    piece.style.width = size + "px";
    piece.style.height = size + "px";

    document.body.appendChild(piece);
    // Clean the piece up after it finishes falling (keeps the page tidy).
    setTimeout(() => piece.remove(), 4000);
  }
}

// Show a small chip at the top of the screen that fades away on its own.
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "egg-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  // Remove after the CSS fade finishes.
  setTimeout(() => toast.remove(), 3200);
}

// Show a big centred celebration card (emoji + title + subtitle) that
// auto-dismisses. Used for both the "New PR!" and milestone trophies.
function showCelebrationCard(emoji, title, subtitle) {
  const card = document.createElement("div");
  card.className = "celebrate";
  card.innerHTML =
    '<div class="celebrate__emoji">' +
    emoji +
    '</div><div class="celebrate__title"></div><div class="celebrate__subtitle"></div>';
  // Use textContent (not innerHTML) for the user-derived text so names can't
  // accidentally inject HTML.
  card.querySelector(".celebrate__title").textContent = title;
  card.querySelector(".celebrate__subtitle").textContent = subtitle;

  document.body.appendChild(card);
  // Tap anywhere on it to dismiss early; otherwise it clears itself.
  card.addEventListener("click", () => card.remove());
  setTimeout(() => card.remove(), 3600);
}

/* ---- Egg #1: type "athena" to summon Athena's owl ---- */

// We keep the last few typed letters in a small buffer and watch for the word.
let secretBuffer = "";

function handleSecretTyping(event) {
  // Ignore typing inside text boxes so it doesn't fire while naming exercises.
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }
  // Only single letters matter; ignore Shift, Enter, arrows, etc.
  if (event.key.length !== 1) {
    return;
  }
  secretBuffer = (secretBuffer + event.key.toLowerCase()).slice(-6); // keep last 6
  if (secretBuffer === "athena") {
    secretBuffer = ""; // reset so it can be triggered again
    summonOwl();
  }
}

// Summon the owl + toast (shared by the typing shortcut and the long-press).
function summonOwl() {
  flyOwl();
  showToast("Athena's blessing — Wisdom +1 🦉");
}

// Touch-friendly version of egg #1: press and HOLD the hero mascot for ~1.5s.
// This works on phones (where there's no physical keyboard) and on a mouse.
let owlPressTimer = null;

function startOwlPress() {
  if (owlPressTimer !== null) {
    return; // a press is already being timed (touch + mouse can both fire)
  }
  owlPressTimer = setTimeout(() => {
    owlPressTimer = null;
    summonOwl();
  }, 1500);
}

// Cancel the hold if the finger/mouse lifts, leaves, or starts scrolling —
// so a normal tap or a scroll never triggers the owl.
function cancelOwlPress() {
  if (owlPressTimer !== null) {
    clearTimeout(owlPressTimer);
    owlPressTimer = null;
  }
}

// Send an owl gliding across the screen, then remove it.
function flyOwl() {
  const owl = document.createElement("div");
  owl.className = "fly-owl";
  owl.textContent = "🦉";
  document.body.appendChild(owl);
  setTimeout(() => owl.remove(), 3000);
}

/* ---- Egg #3: confetti + card when you set a new personal record ---- */

// Compare the just-finished session against your earlier completed workouts.
// For each exercise, if the heaviest weight today beats your previous best,
// that's a personal record (PR). Returns a list like
// [{ name: "Squat", weight: 60 }, ...] (empty if no PRs this time).
function detectPersonalRecords(session) {
  const activeId = loadActiveProfileId();

  // Every OTHER completed session for this profile (exclude the one we just did).
  const pastSessions = loadList(STORAGE_KEYS.sessions).filter(
    (item) =>
      item.profileId === activeId &&
      item.id !== session.id &&
      isCompletedSession(item)
  );

  const records = [];

  session.entries.forEach((entry) => {
    const todayMax = entryMaxWeight(entry);
    // No weight recorded for this exercise today → it can't be a weight PR.
    if (todayMax === null) {
      return;
    }

    // Find the best weight ever lifted for this exercise before today.
    let previousBest = null;
    pastSessions.forEach((past) => {
      const pastEntry = past.entries.find(
        (item) => item.exerciseId === entry.exerciseId
      );
      if (pastEntry) {
        const pastMax = entryMaxWeight(pastEntry);
        if (pastMax !== null) {
          previousBest =
            previousBest === null ? pastMax : Math.max(previousBest, pastMax);
        }
      }
    });

    // A PR only counts if there was a previous best to beat.
    if (previousBest !== null && todayMax > previousBest) {
      const exercise = findExerciseById(entry.exerciseId);
      records.push({
        name: exercise ? exercise.name : "Exercise",
        weight: todayMax,
      });
    }
  });

  return records;
}

/* ---- Egg #4: one-time trophy when you hit a workout milestone ---- */

// Read/save the map of { profileId: [milestones already celebrated] }.
function loadCelebratedMap() {
  const text = localStorage.getItem(STORAGE_KEYS.celebratedMilestones);
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}
function saveCelebratedMap(map) {
  localStorage.setItem(
    STORAGE_KEYS.celebratedMilestones,
    JSON.stringify(map)
  );
}

// Keep the "already celebrated" list honest: if a profile's completed-workout
// count has dropped below a milestone we'd celebrated (e.g. you deleted a
// workout), forget that milestone so reaching it again re-triggers the trophy.
// Safe to call any time; it only removes milestones above the current count.
function reconcileCelebratedMilestones() {
  const map = loadCelebratedMap();
  let changed = false;

  // For each profile we've recorded milestones for...
  Object.keys(map).forEach((profileId) => {
    const completedCount = loadList(STORAGE_KEYS.sessions).filter(
      (item) => item.profileId === profileId && isCompletedSession(item)
    ).length;

    // Keep only milestones you've actually still reached.
    const kept = (map[profileId] || []).filter(
      (milestone) => milestone <= completedCount
    );
    if (kept.length !== (map[profileId] || []).length) {
      changed = true;
    }
    map[profileId] = kept;
  });

  if (changed) {
    saveCelebratedMap(map);
  }
}

// If the active profile's completed-workout count has just reached a milestone
// we haven't celebrated yet, record it and return that number. Otherwise null.
function detectWorkoutMilestone() {
  const activeId = loadActiveProfileId();
  if (!activeId) {
    return null;
  }

  const completedCount = loadList(STORAGE_KEYS.sessions).filter(
    (item) => item.profileId === activeId && isCompletedSession(item)
  ).length;

  // Is this exact count one of our milestones?
  if (!WORKOUT_MILESTONES.includes(completedCount)) {
    return null;
  }

  // Have we already celebrated it for this profile? If so, do nothing.
  const map = loadCelebratedMap();
  const already = map[activeId] || [];
  if (already.includes(completedCount)) {
    return null;
  }

  // Remember it so the trophy only ever plays once per profile per milestone.
  already.push(completedCount);
  map[activeId] = already;
  saveCelebratedMap(map);

  return completedCount;
}

// Play the celebrations after a workout: PR first, then any milestone trophy.
function celebrateAfterWorkout(personalRecords, milestone) {
  let delay = 0;

  if (personalRecords.length > 0) {
    launchConfetti();
    // Build a friendly line, e.g. "Squat 60 · Bench 40".
    const summary = personalRecords
      .map((record) => record.name + " " + record.weight)
      .join(" · ");
    showCelebrationCard("🏅", "New personal record!", summary);
    delay = 3000; // let the PR card clear before the trophy appears
  }

  if (milestone) {
    setTimeout(() => {
      launchConfetti(120);
      showCelebrationCard(
        "🏆",
        milestone + " workouts done!",
        "What a streak — keep it up! 💪"
      );
    }, delay);
  }
}

/* ---- Egg #7: tap the app title 5 times quickly for a credits card ---- */

let brandTapCount = 0;
let lastBrandTapTime = 0;

function handleBrandTap() {
  const now = Date.now();
  // If it's been more than 2 seconds since the last tap, start counting over.
  if (now - lastBrandTapTime > 2000) {
    brandTapCount = 0;
  }
  lastBrandTapTime = now;
  brandTapCount = brandTapCount + 1;

  if (brandTapCount >= 5) {
    brandTapCount = 0; // reset so it can be found again later
    document.getElementById("creditsCard").hidden = false;
    launchConfetti(40); // a small celebratory sprinkle
  }
}

// Wire up the always-on eggs (typing + title taps). Called once at startup.
function setupEasterEggs() {
  // Egg #1 (PC): type "athena".
  document.addEventListener("keydown", handleSecretTyping);

  // Egg #1 (mobile + mouse): long-press the hero mascot. We start a timer on
  // press-down and cancel it on any lift/leave/scroll so only a real hold fires.
  const mascot = document.getElementById("heroMascot");
  mascot.addEventListener("touchstart", startOwlPress);
  mascot.addEventListener("touchend", cancelOwlPress);
  mascot.addEventListener("touchmove", cancelOwlPress);
  mascot.addEventListener("touchcancel", cancelOwlPress);
  mascot.addEventListener("mousedown", startOwlPress);
  mascot.addEventListener("mouseup", cancelOwlPress);
  mascot.addEventListener("mouseleave", cancelOwlPress);

  document.getElementById("appBrand").addEventListener("click", handleBrandTap);
  document
    .getElementById("creditsClose")
    .addEventListener("click", () => {
      document.getElementById("creditsCard").hidden = true;
    });
}

/* =========================================================================
   7f. INSTALL TO HOME SCREEN (PWA)
   Android/desktop browsers fire a "beforeinstallprompt" event when the app can
   be installed — we catch it and trigger it from our own button. iOS gives no
   such event (you must use Safari's Share → Add to Home Screen), so on iOS the
   button opens a short how-to instead. The button hides itself once installed.
   ========================================================================= */

// The saved install event (Android/desktop), or null if we don't have one.
let deferredInstallPrompt = null;

// Is the app already running as an installed app (full-screen, no browser bar)?
function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true // iOS-specific flag
  );
}

// Is this an iPhone/iPad? (iOS can only add to the home screen manually.)
function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function showInstallCard() {
  document.getElementById("installCard").hidden = false;
}
function hideInstallCard() {
  document.getElementById("installCard").hidden = true;
}

function setupInstall() {
  const installBtn = document.getElementById("installBtn");

  // Decide whether to show the button on first load.
  if (isAppInstalled()) {
    hideInstallCard(); // already installed — nothing to do
  } else if (isIosDevice()) {
    showInstallCard(); // iOS: show it so it opens the how-to (no auto-prompt)
  }

  // Android/desktop: the browser tells us the app is installable.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // stop the default mini-bar; we use our own button
    deferredInstallPrompt = event;
    showInstallCard();
  });

  // Clicking our button: fire the real prompt, or show the iOS instructions.
  installBtn.addEventListener("click", () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt(); // the real native install dialog
      deferredInstallPrompt.userChoice.finally(() => {
        deferredInstallPrompt = null;
        hideInstallCard();
      });
    } else if (isIosDevice()) {
      document.getElementById("installModal").hidden = false;
    }
  });

  // Once installed, hide the button.
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    hideInstallCard();
  });

  // The iOS instructions modal closes via its button or its backdrop.
  document
    .getElementById("closeInstallBtn")
    .addEventListener("click", closeInstallModal);
  document
    .getElementById("installBackdrop")
    .addEventListener("click", closeInstallModal);
}

function closeInstallModal() {
  document.getElementById("installModal").hidden = true;
}

/* =========================================================================
   8. TAB / VIEW SWITCHING
   ========================================================================= */

function switchView(viewName) {
  // Show the matching <section> and hide the others.
  const views = document.querySelectorAll(".view");
  views.forEach((view) => {
    const isMatch = view.dataset.view === viewName;
    view.classList.toggle("view--active", isMatch);
  });

  // Highlight the matching tab button.
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    const isMatch = tab.dataset.view === viewName;
    tab.classList.toggle("tab--active", isMatch);
    if (isMatch) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });
}

/* =========================================================================
   9. STARTUP — wire up buttons and draw the first screen
   This runs once when the page loads.
   ========================================================================= */

function init() {
  buildEmojiPicker();

  // Dark mode: apply the saved/system theme, then wire up the toggle button.
  applyTheme(getStartingTheme());
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Tab bar: clicking a tab switches view.
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  // Top-bar profile chip jumps to Settings.
  document
    .getElementById("activeProfileChip")
    .addEventListener("click", () => switchView("settings"));

  // "Add exercise" button opens the modal.
  document
    .getElementById("addExerciseBtn")
    .addEventListener("click", openExerciseModalForAdd);

  // ---- Workout mode (Phase 2) ----
  // "Start workout" on the Today tab starts today's workout.
  document
    .getElementById("startTodayBtn")
    .addEventListener("click", () => startWorkout(getTodayName()));

  // Workout sheet buttons: Finish (complete), Discard (delete), Close (keep).
  document
    .getElementById("finishWorkoutBtn")
    .addEventListener("click", finishWorkout);
  document
    .getElementById("discardWorkoutBtn")
    .addEventListener("click", discardWorkout);
  document
    .getElementById("closeWorkoutBtn")
    .addEventListener("click", closeWorkoutOverlay);

  // Editing the workout's date (also re-labels the day).
  document
    .getElementById("workoutDateInput")
    .addEventListener("change", handleWorkoutDateChange);

  // Rest timer: the 60/90/120 buttons each have a data-seconds value.
  document.querySelectorAll(".timer-btn[data-seconds]").forEach((button) => {
    button.addEventListener("click", () => {
      startRest(Number(button.dataset.seconds));
    });
  });
  // The Stop button stops the countdown and resets the display.
  document
    .getElementById("stopTimerBtn")
    .addEventListener("click", resetTimerDisplay);

  // Modal: cancel button and backdrop both close it.
  document
    .getElementById("cancelExerciseBtn")
    .addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeModal);

  // Exercise form submit (add or edit).
  document
    .getElementById("exerciseForm")
    .addEventListener("submit", handleExerciseFormSubmit);

  // Per-set rows react to the Sets count and the default reps/weight fields.
  document
    .getElementById("setsInput")
    .addEventListener("input", handleSetsCountChange);
  document
    .getElementById("repsInput")
    .addEventListener("input", applyDefaultRepsToRows);
  document
    .getElementById("weightInput")
    .addEventListener("input", applyDefaultWeightToRows);

  // Workout detail pop-up: close button and backdrop both close it.
  document
    .getElementById("closeSessionBtn")
    .addEventListener("click", closeSessionModal);
  document
    .getElementById("sessionBackdrop")
    .addEventListener("click", closeSessionModal);

  // ---- Backup (Phase 3) ----
  document
    .getElementById("exportCurrentBtn")
    .addEventListener("click", exportCurrentProfile);
  document.getElementById("exportAllBtn").addEventListener("click", exportAll);
  // The visible "Import" button just opens the hidden file picker.
  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importInput").click();
  });
  // When a file is chosen, import it.
  document.getElementById("importInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      importData(file);
    }
    event.target.value = ""; // reset so picking the same file again still works
  });

  // Create-profile form submit.
  document.getElementById("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("profileNameInput");
    const name = input.value.trim();
    if (name === "") {
      window.alert("Please enter a profile name.");
      return;
    }
    await createProfile(name);
    input.value = ""; // clear the box for next time
  });

  // Keyboard: pressing Escape closes whichever pop-up is open.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!document.getElementById("exerciseModal").hidden) {
      closeModal();
    } else if (!document.getElementById("sessionModal").hidden) {
      closeSessionModal();
    } else if (!document.getElementById("installModal").hidden) {
      closeInstallModal();
    } else if (!document.getElementById("workoutOverlay").hidden) {
      closeWorkoutOverlay(); // keeps the in-progress workout to resume later
    }
  });

  // Weekly goal (Insights): saving the number updates the goal ring on Progress.
  document.getElementById("weeklyGoalInput").addEventListener("change", (event) => {
    const activeId = loadActiveProfileId();
    if (!activeId) {
      return;
    }
    const goal = clampNumber(Number(event.target.value), 1, 14);
    event.target.value = goal; // reflect any clamping
    saveWeeklyGoal(activeId, goal);
    renderProgress(); // redraw the ring with the new goal
  });

  // Wire up the just-for-fun easter eggs (typing "athena", title taps, etc.).
  setupEasterEggs();

  // PWA (Phase 5): register the service worker for offline + installability,
  // and wire up the "Install app" button.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .catch((error) => console.log("Service worker failed to register:", error));
    });
  }
  setupInstall();

  // Draw the initial screens from whatever is saved.
  // The app always opens on the Today tab (set as the active view in index.html).
  renderAll();

  console.log("Athena's Arena loaded — Phase 4 ready ✅");
}

// Wait until the page's HTML is ready, then start the app.
document.addEventListener("DOMContentLoaded", init);
