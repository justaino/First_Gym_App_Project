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

// Redraw everything at once (simple and reliable for a small app).
function renderAll() {
  renderActiveProfileChip();
  renderToday();
  renderSchedule();
  renderProfiles();
  renderHistory();
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

  // Build the in-progress state: every set starts "not done" (false).
  activeWorkout = {
    day: day,
    items: exercisesForDay.map((exercise) => ({
      exercise: exercise,
      done: new Array(exercise.sets).fill(false),
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

    card.appendChild(top);
    card.appendChild(dots);
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

  // Build the entries: one per exercise, with how many sets were ticked.
  const entries = activeWorkout.items.map((item) => ({
    exerciseId: item.exercise.id,
    setsDone: item.done.filter(Boolean).length,
    weight: null, // optional per-set weight comes in Phase 3
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

  console.log("Gym App loaded — Phase 2 ready ✅");
}

// Wait until the page's HTML is ready, then start the app.
document.addEventListener("DOMContentLoaded", init);
