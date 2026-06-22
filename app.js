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

    const heading = document.createElement("h2");
    heading.className = "day-group__heading";
    heading.textContent = day;
    group.appendChild(heading);

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

// Redraw everything at once (simple and reliable for a small app).
function renderAll() {
  renderActiveProfileChip();
  renderToday();
  renderSchedule();
  renderProfiles();
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

  console.log("Gym App loaded — Phase 1 ready ✅");
}

// Wait until the page's HTML is ready, then start the app.
document.addEventListener("DOMContentLoaded", init);
