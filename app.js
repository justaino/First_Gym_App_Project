/*
  app.js — all the behaviour for the Gym App (Phase 1).

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
};

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

// Get only the exercises that belong to the active profile.
function getExercisesForActiveProfile() {
  const activeId = loadActiveProfileId();
  if (!activeId) {
    return [];
  }
  const allExercises = loadList(STORAGE_KEYS.exercises);
  return allExercises.filter((exercise) => exercise.profileId === activeId);
}

// What is today's day name? (e.g. "Monday")
function getTodayName() {
  // getDay(): 0 = Sunday, 1 = Monday ... 6 = Saturday
  const jsDayNumber = new Date().getDay();
  const namesSundayFirst = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return namesSundayFirst[jsDayNumber];
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
  detail.textContent = exercise.sets + " × " + exercise.reps;

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
    startBtn.textContent = "▶ Start";
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

  const subtitle = document.getElementById("todaySubtitle");
  const todayName = getTodayName();
  subtitle.textContent = todayName;

  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    container.appendChild(
      createEmptyState("👤", "Create a profile in Settings to get started.")
    );
    return;
  }

  const todaysExercises = getExercisesForActiveProfile().filter(
    (exercise) => exercise.day === todayName
  );

  // Only show the "Start workout" button if there's actually something to do.
  const startBtn = document.getElementById("startTodayBtn");
  startBtn.hidden = todaysExercises.length === 0;

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

  // Only this profile's sessions, newest first.
  const sessions = allSessions
    .filter((session) => session.profileId === activeId)
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
      (sum, entry) => sum + entry.setsDone,
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

    card.appendChild(title);
    card.appendChild(meta);
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
// Each point is { date, setsDone, weight, session }. Bars show a tooltip on
// hover and open that workout's details when clicked.
function buildBarChartSvg(points) {
  const width = 240;
  const height = 60;
  const gap = 4;
  const namespace = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("class", "barchart");
  svg.setAttribute("preserveAspectRatio", "none");

  // The tallest bar maps to the full height. Avoid dividing by zero with "1".
  const setCounts = points.map((point) => point.setsDone);
  const max = Math.max.apply(null, setCounts.concat([1]));
  const barWidth = (width - gap * (points.length - 1)) / points.length;

  points.forEach((point, index) => {
    // Always show at least a sliver so small sessions are still visible.
    const barHeight = Math.max(2, (point.setsDone / max) * height);
    const rect = document.createElementNS(namespace, "rect");
    rect.setAttribute("x", index * (barWidth + gap));
    rect.setAttribute("y", height - barHeight);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("rx", 3);
    rect.setAttribute("class", "barchart__bar");

    // The text shown in the tooltip (and as a plain-browser fallback below).
    let label = formatDate(point.date) + " · " + point.setsDone + " sets";
    if (point.weight !== null && point.weight !== undefined) {
      label += " · " + point.weight;
    }

    // Fallback tooltip for any case where our custom one doesn't run.
    const title = document.createElementNS(namespace, "title");
    title.textContent = label;
    rect.appendChild(title);

    // Custom tooltip on hover (follows the pointer).
    rect.addEventListener("mouseenter", (event) =>
      showChartTooltip(label, event.clientX, event.clientY)
    );
    rect.addEventListener("mousemove", (event) =>
      showChartTooltip(label, event.clientX, event.clientY)
    );
    rect.addEventListener("mouseleave", hideChartTooltip);

    // Click (or tap) a bar to see that whole workout.
    rect.addEventListener("click", () => {
      hideChartTooltip();
      showSessionDetail(point.session);
    });

    svg.appendChild(rect);
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

    let detailText = entry.setsDone + " sets done";
    if (entry.weight !== null && entry.weight !== undefined) {
      detailText += " · weight " + entry.weight;
    }
    const detail = document.createElement("div");
    detail.className = "exercise__detail";
    detail.textContent = detailText;

    info.appendChild(name);
    info.appendChild(detail);
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
  card.appendChild(buildBarChartSvg(points.slice(-12)));

  // A small hint so people know the bars are interactive.
  const hint = document.createElement("div");
  hint.className = "chart-hint";
  hint.textContent = "Tap a bar to see that workout";
  card.appendChild(hint);

  return card;
}

// Draw the whole Progress view.
function renderProgress() {
  const subtitle = document.getElementById("progressSubtitle");
  const summary = document.getElementById("weekSummary");
  const heading = document.getElementById("byExerciseHeading");
  const list = document.getElementById("exerciseProgressList");
  summary.innerHTML = "";
  list.innerHTML = "";

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
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (session) => session.profileId === activeId
  );

  // --- "This week" summary ---
  const startOfWeek = getStartOfWeek();
  const weekSessions = sessions.filter(
    (session) => new Date(session.date) >= startOfWeek
  );
  const workoutsThisWeek = weekSessions.length;
  const setsThisWeek = weekSessions.reduce(
    (sum, session) =>
      sum + session.entries.reduce((inner, entry) => inner + entry.setsDone, 0),
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
      if (entry) {
        points.push({
          date: session.date,
          setsDone: entry.setsDone,
          weight: entry.weight,
          session: session,
        });
        totalSets += entry.setsDone;
        if (entry.weight !== null && entry.weight !== undefined) {
          lastWeight = entry.weight;
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
}

/* =========================================================================
   5. PROFILE ACTIONS — create, switch, delete
   ========================================================================= */

function createProfile(name) {
  const profiles = loadList(STORAGE_KEYS.profiles);

  const newProfile = {
    id: makeId(),
    name: name,
    createdAt: new Date().toISOString(),
  };
  profiles.push(newProfile);
  saveList(STORAGE_KEYS.profiles, profiles);

  // If this is the first profile, make it active automatically.
  if (!loadActiveProfileId()) {
    saveActiveProfileId(newProfile.id);
  }

  renderAll();
}

function setActiveProfile(id) {
  saveActiveProfileId(id);
  renderAll();
}

function deleteProfile(id) {
  const ok = window.confirm(
    "Delete this profile and all of its exercises? This cannot be undone."
  );
  if (!ok) {
    return;
  }

  // Remove the profile.
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
   6. EXERCISE ACTIONS — add, edit, delete
   ========================================================================= */

function deleteExercise(id) {
  const ok = window.confirm("Delete this exercise?");
  if (!ok) {
    return;
  }
  let exercises = loadList(STORAGE_KEYS.exercises);
  exercises = exercises.filter((exercise) => exercise.id !== id);
  saveList(STORAGE_KEYS.exercises, exercises);
  renderAll();
}

/* =========================================================================
   7. THE EXERCISE MODAL (add/edit form)
   The same pop-up is used for both adding and editing. When the hidden
   "exerciseIdInput" has a value, we're editing; when it's empty, we're adding.
   ========================================================================= */

let selectedEmoji = EMOJI_PRESETS[0]; // remembers which emoji is chosen in the form

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

// Show the modal.
function openModal() {
  document.getElementById("formError").hidden = true;
  document.getElementById("exerciseModal").hidden = false;
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
  document.getElementById("dayInput").value = getTodayName();
  selectEmoji(EMOJI_PRESETS[0]);

  openModal();
}

// Open the modal ready to EDIT an existing exercise (form pre-filled).
function openExerciseModalForEdit(id) {
  const exercises = loadList(STORAGE_KEYS.exercises);
  const exercise = exercises.find((item) => item.id === id);
  if (!exercise) {
    return;
  }

  document.getElementById("modalTitle").textContent = "Edit exercise";
  document.getElementById("exerciseIdInput").value = exercise.id; // not empty = editing
  document.getElementById("nameInput").value = exercise.name;
  document.getElementById("setsInput").value = exercise.sets;
  document.getElementById("repsInput").value = exercise.reps;
  document.getElementById("dayInput").value = exercise.day;
  selectEmoji(exercise.icon);

  openModal();
}

// Handle the form being submitted (covers both add and edit).
function handleExerciseFormSubmit(event) {
  event.preventDefault(); // stop the browser from reloading the page

  // Read the values from the form.
  const id = document.getElementById("exerciseIdInput").value;
  const name = document.getElementById("nameInput").value.trim();
  const sets = Number(document.getElementById("setsInput").value);
  const reps = Number(document.getElementById("repsInput").value);
  const day = document.getElementById("dayInput").value;

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
    showFormError("Reps must be a whole number of 1 or more.");
    return;
  }
  errorEl.hidden = true;

  const exercises = loadList(STORAGE_KEYS.exercises);

  if (id === "") {
    // ADDING: build a new exercise and add it to the list.
    const newExercise = {
      id: makeId(),
      profileId: loadActiveProfileId(),
      name: name,
      sets: sets,
      reps: reps,
      icon: selectedEmoji,
      day: day,
      notes: "", // reserved for a later phase
    };
    exercises.push(newExercise);
  } else {
    // EDITING: find the existing exercise and update its fields.
    const existing = exercises.find((item) => item.id === id);
    if (existing) {
      existing.name = name;
      existing.sets = sets;
      existing.reps = reps;
      existing.icon = selectedEmoji;
      existing.day = day;
    }
  }

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
   7b. WORKOUT MODE + REST TIMER (Phase 2)
   While a workout is running we keep its progress in "activeWorkout" (just in
   memory). Only when you press "Finish & save" do we write a Session to
   localStorage. The rest timer is separate and uses a 1-second countdown.
   ========================================================================= */

// Holds the workout currently in progress, or null when none is running.
// Shape: { day, items: [ { exercise, done: [true/false per set] } ] }
let activeWorkout = null;

// Begin a workout for a given day (e.g. "Monday").
function startWorkout(day) {
  const exercisesForDay = getExercisesForActiveProfile().filter(
    (exercise) => exercise.day === day
  );

  if (exercisesForDay.length === 0) {
    window.alert("There are no exercises planned for " + day + ".");
    return;
  }

  // Build the in-progress state: every set starts "not done" (false),
  // and the optional weight starts empty (null).
  activeWorkout = {
    day: day,
    items: exercisesForDay.map((exercise) => ({
      exercise: exercise,
      done: new Array(exercise.sets).fill(false),
      weight: null, // Phase 3: optional weight the user can type in
    })),
  };

  document.getElementById("workoutTitle").textContent = day + " workout";
  resetTimerDisplay();
  renderWorkoutItems();
  document.getElementById("workoutOverlay").hidden = false;
}

// Draw the list of exercises (with their set dots) inside the workout sheet.
function renderWorkoutItems() {
  const container = document.getElementById("workoutList");
  container.innerHTML = "";

  activeWorkout.items.forEach((item, itemIndex) => {
    const card = document.createElement("div");
    card.className = "workout-exercise";

    // Top row: emoji, name + "sets × reps", and a progress count.
    const top = document.createElement("div");
    top.className = "workout-exercise__top";

    const icon = document.createElement("div");
    icon.className = "exercise__icon";
    icon.textContent = item.exercise.icon;

    const info = document.createElement("div");
    info.className = "exercise__info";

    const name = document.createElement("div");
    name.className = "exercise__name";
    name.textContent = item.exercise.name;

    const detail = document.createElement("div");
    detail.className = "exercise__detail";
    detail.textContent = item.exercise.sets + " × " + item.exercise.reps;

    info.appendChild(name);
    info.appendChild(detail);

    const doneCount = item.done.filter(Boolean).length;
    const progress = document.createElement("div");
    progress.className = "workout-exercise__progress";
    progress.textContent = doneCount + "/" + item.exercise.sets;

    top.appendChild(icon);
    top.appendChild(info);
    top.appendChild(progress);

    // The row of tap-to-tick set dots.
    const dots = document.createElement("div");
    dots.className = "set-dots";
    item.done.forEach((isDone, setIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "set-dot" + (isDone ? " set-dot--done" : "");
      dot.textContent = isDone ? "✓" : String(setIndex + 1);
      dot.addEventListener("click", () => toggleSet(itemIndex, setIndex));
      dots.appendChild(dot);
    });

    // Optional weight field (Phase 3). The value is kept on the item so it
    // survives when we redraw the list after ticking a set.
    const weightWrap = document.createElement("div");
    weightWrap.className = "workout-exercise__weight";

    const weightLabel = document.createElement("label");
    weightLabel.textContent = "Weight";

    const weightInput = document.createElement("input");
    weightInput.className = "input weight-input";
    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.step = "any";
    weightInput.placeholder = "optional";
    if (item.weight !== null) {
      weightInput.value = item.weight;
    }
    // Remember what was typed (empty box = no weight recorded).
    weightInput.addEventListener("input", () => {
      const typed = weightInput.value.trim();
      item.weight = typed === "" ? null : Number(typed);
    });

    weightLabel.appendChild(weightInput);
    weightWrap.appendChild(weightLabel);

    card.appendChild(top);
    card.appendChild(dots);
    card.appendChild(weightWrap);
    container.appendChild(card);
  });
}

// Tick a set on or off, then redraw.
function toggleSet(itemIndex, setIndex) {
  const done = activeWorkout.items[itemIndex].done;
  done[setIndex] = !done[setIndex];
  renderWorkoutItems();
}

// Save the workout as a Session and close the sheet.
function finishWorkout() {
  if (!activeWorkout) {
    return;
  }

  // Build the entries: one per exercise, with how many sets were ticked and
  // the optional weight (null if the box was left empty).
  const entries = activeWorkout.items.map((item) => ({
    exerciseId: item.exercise.id,
    setsDone: item.done.filter(Boolean).length,
    weight: item.weight,
  }));

  const totalSets = entries.reduce((sum, entry) => sum + entry.setsDone, 0);

  const session = {
    id: makeId(),
    profileId: loadActiveProfileId(),
    date: new Date().toISOString(),
    day: activeWorkout.day, // handy for showing "Monday workout" in history
    entries: entries,
  };

  const sessions = loadList(STORAGE_KEYS.sessions);
  sessions.push(session);
  saveList(STORAGE_KEYS.sessions, sessions);

  closeWorkout();
  renderAll();
  window.alert("Workout saved! " + totalSets + " sets done 💪");
}

// Close the workout sheet without saving (after a confirmation).
function cancelWorkout() {
  const ok = window.confirm("Discard this workout? It won't be saved.");
  if (!ok) {
    return;
  }
  closeWorkout();
}

// Shared cleanup: stop the timer, hide the sheet, clear the in-progress state.
function closeWorkout() {
  stopRest();
  document.getElementById("workoutOverlay").hidden = true;
  activeWorkout = null;
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
    app: "gym-app",
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
  link.download = "gym-app-backup-" + safeScope + "-" + today + ".json";
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
        window.alert("That file doesn't look like a Gym App backup.");
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

  // Finish / cancel buttons inside the workout sheet.
  document
    .getElementById("finishWorkoutBtn")
    .addEventListener("click", finishWorkout);
  document
    .getElementById("cancelWorkoutBtn")
    .addEventListener("click", cancelWorkout);

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
  document.getElementById("profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("profileNameInput");
    const name = input.value.trim();
    if (name === "") {
      window.alert("Please enter a profile name.");
      return;
    }
    createProfile(name);
    input.value = ""; // clear the box for next time
  });

  // Draw the initial screens from whatever is saved.
  renderAll();

  // Friendly first run: if there are no profiles, start on the Settings tab.
  if (loadList(STORAGE_KEYS.profiles).length === 0) {
    switchView("settings");
  }

  console.log("Gym App loaded — Phase 3 ready ✅");
}

// Wait until the page's HTML is ready, then start the app.
document.addEventListener("DOMContentLoaded", init);
