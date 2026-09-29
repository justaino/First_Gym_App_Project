/*
  workout-screen.js — the live workout screen (Owl Quest phase Q4).

  When you start (or resume) a workout, the sheet shows ONE exercise at a time:

    🏋️ Bench Press                      ← the exercise, with a row of the
    [🏋️ ✓] [💪] [🤸]                       workout's exercises to jump between
    ━━━━━━━━━━━━░░░░░░  4 of 9 sets     ← progress through the whole workout
    🦉 "Last time (22 Sep): 10, 10, 8…"  ← the owl's hint (+ your last note)
    Set 2 of 3   [ 10 ] reps [ 40 ] kg  ← the next set to do, big and editable
    ⭐ ⭐ ☆                               ← tap a star when a set is done
    ▸ Edit sets   📝 Add note           ← the full set table, folded away
    ‹ Previous          Next ›          ← (Next becomes "Finish ✓" at the end)
    Up next: 💪 Overhead Press · 3 sets
    ▸ Workout details (date)

  Everything still saves exactly as before: the stars, boxes and table all
  change `activeSession` and call persistActiveSession() in app.js. Editing a
  SAVED workout from history keeps the old long list (renderWorkoutItems).

  This file is loaded after app.js and uses its helpers (activeSession,
  persistActiveSession, redrawWorkout, findExerciseById, buildLastTimeHint,
  buildLastNoteHint, buildWorkoutSetRow, buildWorkoutNote, addWorkoutSet,
  finishWorkout, handleWorkoutDateChange, unitLabel, pluralise).
*/

/* =========================================================================
   1. WHICH EXERCISE IS SHOWING
   ========================================================================= */

// The position (in activeSession.entries) of the exercise on screen. Kept in
// memory only: resuming a workout starts at the first unfinished exercise.
let focusExerciseIndex = 0;

// Whether the "Edit sets" table is unfolded, so it stays open while you tick
// sets (every tick redraws the screen).
let focusEditSetsOpen = false;

// Has every set in this entry been ticked?
function isEntryComplete(entry) {
  return entry.sets.length > 0 && entry.sets.every((set) => set.done);
}

// The first exercise that still has sets to do (or the first one, if all done).
function firstUnfinishedExerciseIndex(session) {
  const index = session.entries.findIndex((entry) => !isEntryComplete(entry));
  return index === -1 ? 0 : index;
}

// Move to another exercise and redraw, scrolled back to the top.
function goToExercise(index) {
  focusExerciseIndex = index;
  focusEditSetsOpen = false;
  renderWorkoutFocus();
  document.querySelector("#workoutOverlay .sheet__panel").scrollTop = 0;
}

/* =========================================================================
   2. DRAWING THE SCREEN
   ========================================================================= */

function renderWorkoutFocus() {
  const container = document.getElementById("workoutFocus");
  container.innerHTML = "";
  if (!activeSession || activeSession.entries.length === 0) {
    return;
  }

  // Stay in range (e.g. if the workout has fewer exercises than before).
  const entries = activeSession.entries;
  focusExerciseIndex = Math.min(Math.max(focusExerciseIndex, 0), entries.length - 1);
  const entryIndex = focusExerciseIndex;
  const entry = entries[entryIndex];
  const exercise = findExerciseById(entry.exerciseId);

  container.appendChild(buildFocusHeading(exercise, entryIndex, entries.length));
  container.appendChild(buildExerciseJumpRow());
  container.appendChild(buildWorkoutProgress());
  container.appendChild(buildOwlBubble(entry, entryIndex));
  container.appendChild(buildCurrentSet(entry));
  container.appendChild(buildStarRow(entryIndex, entry));
  container.appendChild(buildEditSets(entryIndex, entry));
  container.appendChild(buildWorkoutNote(entryIndex, entry)); // from app.js
  container.appendChild(buildFocusNav(entryIndex, entry));
  container.appendChild(buildWorkoutDetails());
}

// "🏋️ Bench Press" plus "Exercise 1 of 3".
function buildFocusHeading(exercise, entryIndex, total) {
  const heading = document.createElement("div");
  heading.className = "focus-heading";

  const icon = document.createElement("div");
  icon.className = "exercise__icon focus-heading__icon";
  icon.textContent = exercise ? exercise.icon : "❓";

  const text = document.createElement("div");
  text.className = "focus-heading__text";
  const name = document.createElement("h3");
  name.className = "focus-heading__name";
  name.textContent = exercise ? exercise.name : "(deleted exercise)";
  const count = document.createElement("p");
  count.className = "focus-heading__count";
  count.textContent = "Exercise " + (entryIndex + 1) + " of " + total;
  text.appendChild(name);
  text.appendChild(count);

  heading.appendChild(icon);
  heading.appendChild(text);
  return heading;
}

// A row of small emoji buttons, one per exercise, to jump around (handy if a
// machine is busy). Finished ones get a mint ✓; the one on screen is outlined.
function buildExerciseJumpRow() {
  const row = document.createElement("div");
  row.className = "focus-jump";

  activeSession.entries.forEach((entry, index) => {
    const exercise = findExerciseById(entry.exerciseId);
    const name = exercise ? exercise.name : "Deleted exercise";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "focus-jump__btn";
    if (index === focusExerciseIndex) {
      button.classList.add("focus-jump__btn--current");
      button.setAttribute("aria-current", "step");
    }
    if (isEntryComplete(entry)) {
      button.classList.add("focus-jump__btn--done");
    }
    button.textContent = exercise ? exercise.icon : "❓";
    button.setAttribute(
      "aria-label",
      name + (isEntryComplete(entry) ? " (done)" : "")
    );
    button.title = name;
    button.addEventListener("click", () => goToExercise(index));
    row.appendChild(button);
  });

  return row;
}

// A bar showing how many sets of the WHOLE workout are done, e.g. "4 of 9 sets".
function buildWorkoutProgress() {
  let done = 0;
  let total = 0;
  activeSession.entries.forEach((entry) => {
    total += entry.sets.length;
    done += entry.sets.filter((set) => set.done).length;
  });
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const wrap = document.createElement("div");
  wrap.className = "focus-progress";

  const track = document.createElement("div");
  track.className = "focus-progress__track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", "Workout progress");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(total));
  track.setAttribute("aria-valuenow", String(done));
  const fill = document.createElement("div");
  fill.className = "focus-progress__fill";
  fill.style.width = percent + "%";
  track.appendChild(fill);

  const label = document.createElement("span");
  label.className = "focus-progress__label";
  label.textContent = done + " of " + pluralise(total, "set");

  wrap.appendChild(track);
  wrap.appendChild(label);
  return wrap;
}

// The owl and its speech bubble. It says what you did last time (or cheers you
// on), plus the note you left yourself for this exercise, if any.
function buildOwlBubble(entry, entryIndex) {
  const wrap = document.createElement("div");
  wrap.className = "owl-coach";

  const owl = document.createElement("div");
  owl.className = "owl-coach__owl";
  owl.textContent = "🦉";
  owl.setAttribute("aria-hidden", "true");

  const bubble = document.createElement("div");
  bubble.className = "owl-coach__bubble";

  const main = document.createElement("p");
  main.textContent = owlMessageFor(entry, entryIndex);
  bubble.appendChild(main);

  // The last note you wrote for this exercise ("📝 22 Sep: try 2.5kg more").
  const note = buildLastNoteHint(entry.exerciseId, activeSession.id);
  if (note !== "") {
    const noteLine = document.createElement("p");
    noteLine.className = "owl-coach__note";
    noteLine.textContent = note;
    bubble.appendChild(noteLine);
  }

  wrap.appendChild(owl);
  wrap.appendChild(bubble);
  return wrap;
}

// What the owl says, depending on where you are.
function owlMessageFor(entry, entryIndex) {
  const entries = activeSession.entries;
  const isLast = entryIndex === entries.length - 1;

  // This exercise is finished.
  if (isEntryComplete(entry)) {
    if (entries.every(isEntryComplete)) {
      return "That's everything! Tap Finish to save it 🎉";
    }
    if (isLast) {
      return "Last one done! Tap Finish when you're ready.";
    }
    const next = findExerciseById(entries[entryIndex + 1].exerciseId);
    return "Nice work! Next up: " + (next ? next.name : "the next one") + ".";
  }

  // Still going: remind you what you did last time (from app.js, e.g.
  // "Last time (22 Sep): 10, 10, 8 reps at 40 kg").
  const lastTime = buildLastTimeHint(entry.exerciseId, activeSession.id);
  if (lastTime !== "") {
    return lastTime + ". Can you match it?";
  }
  return "First time on this one. Take it steady!";
}

// The next set to do, big: "Set 2 of 3" with large reps and weight boxes you
// can still change. Once every set is ticked it just says so.
function buildCurrentSet(entry) {
  const wrap = document.createElement("div");
  wrap.className = "focus-set";

  const setIndex = entry.sets.findIndex((set) => !set.done);
  if (setIndex === -1) {
    const doneLine = document.createElement("p");
    doneLine.className = "focus-set__title";
    doneLine.textContent = "All " + pluralise(entry.sets.length, "set") + " done ✓";
    wrap.appendChild(doneLine);
    return wrap;
  }

  const set = entry.sets[setIndex];

  const title = document.createElement("p");
  title.className = "focus-set__title";
  title.textContent = "Set " + (setIndex + 1) + " of " + entry.sets.length;
  wrap.appendChild(title);

  const boxes = document.createElement("div");
  boxes.className = "focus-set__boxes";

  // Reps box. Typing saves straight away, like the table rows do. We don't
  // redraw while you type, so the box keeps focus.
  const reps = buildBigNumberBox("reps", set.reps, (text) => {
    set.reps = Number(text) || 0;
    persistActiveSession();
  });
  reps.input.min = "1";
  reps.input.inputMode = "numeric"; // whole numbers: the phone shows 0–9 only
  reps.input.setAttribute("aria-label", "Set " + (setIndex + 1) + " reps");

  // Weight box (empty = no weight, e.g. bodyweight exercises).
  const weightValue = set.weight === null || set.weight === undefined ? "" : set.weight;
  const weight = buildBigNumberBox(unitLabel(), weightValue, (text) => {
    set.weight = text.trim() === "" ? null : Number(text);
    persistActiveSession();
  });
  weight.input.min = "0";
  weight.input.step = "any";
  weight.input.placeholder = "—";
  weight.input.setAttribute("aria-label", "Set " + (setIndex + 1) + " weight");

  boxes.appendChild(reps.wrap);
  boxes.appendChild(weight.wrap);
  wrap.appendChild(boxes);

  const hint = document.createElement("p");
  hint.className = "focus-set__hint";
  hint.textContent = "Tap a star when the set is done";
  wrap.appendChild(hint);
  return wrap;
}

// One big number box with a small label under it ("reps" / "kg").
function buildBigNumberBox(labelText, value, onInput) {
  const wrap = document.createElement("label");
  wrap.className = "focus-set__box";

  const input = document.createElement("input");
  input.className = "input focus-set__input";
  input.type = "number";
  input.inputMode = "decimal";
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));

  const label = document.createElement("span");
  label.className = "focus-set__unit";
  label.textContent = labelText;

  wrap.appendChild(input);
  wrap.appendChild(label);
  return { wrap: wrap, input: input };
}

// One star per set. Tap a grey star to tick that set done (a "+10 XP" floats
// up); tap a gold one to undo it. The next set to do has a soft ring.
function buildStarRow(entryIndex, entry) {
  const row = document.createElement("div");
  row.className = "focus-stars";

  const nextToDo = entry.sets.findIndex((set) => !set.done);

  entry.sets.forEach((set, setIndex) => {
    const star = document.createElement("button");
    star.type = "button";
    star.className = "focus-star";
    if (set.done) {
      star.classList.add("focus-star--done");
    }
    if (setIndex === nextToDo) {
      star.classList.add("focus-star--next");
    }
    star.textContent = "⭐";
    star.setAttribute("aria-pressed", set.done ? "true" : "false");
    star.setAttribute(
      "aria-label",
      "Set " + (setIndex + 1) + (set.done ? ": done. Tap to undo." : ": tap when done.")
    );
    star.addEventListener("click", () => tapStar(entryIndex, setIndex));
    row.appendChild(star);
  });

  return row;
}

// Tick (or untick) a set from its star.
function tapStar(entryIndex, setIndex) {
  const set = activeSession.entries[entryIndex].sets[setIndex];
  set.done = !set.done;
  persistActiveSession();
  renderWorkoutFocus();

  // Celebrate a tick with a little "+10 XP" over the star (XP_PER_SET, xp.js).
  if (set.done) {
    const star = document.querySelectorAll("#workoutFocus .focus-star")[setIndex];
    if (star) {
      const pop = document.createElement("span");
      pop.className = "focus-star__xp";
      pop.textContent = "+" + XP_PER_SET + " XP";
      pop.setAttribute("aria-hidden", "true");
      star.appendChild(pop);
      setTimeout(() => pop.remove(), 1400);
    }
  }
}

// "Edit sets": the full table for this exercise (reps, weight, remove, add a
// set), folded away because you only need it to fix something.
function buildEditSets(entryIndex, entry) {
  const details = document.createElement("details");
  details.className = "focus-edit";
  details.open = focusEditSetsOpen;
  details.addEventListener("toggle", () => {
    focusEditSetsOpen = details.open;
  });

  const summary = document.createElement("summary");
  summary.className = "focus-edit__summary";
  summary.textContent = "Edit sets";
  details.appendChild(summary);

  // The same rows as the long list, built by app.js.
  const head = document.createElement("div");
  head.className = "wset-row wset-row--head";
  head.innerHTML =
    "<span></span><span>Reps</span><span>Weight (" + unitLabel() + ")</span><span></span>";
  details.appendChild(head);
  entry.sets.forEach((set, setIndex) => {
    details.appendChild(buildWorkoutSetRow(entryIndex, setIndex, set));
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--ghost btn--small wset-add";
  addBtn.textContent = "＋ Add set";
  addBtn.addEventListener("click", () => addWorkoutSet(entryIndex));
  details.appendChild(addBtn);

  return details;
}

// ‹ Previous / Next › (or "Finish ✓" on the last exercise), then a line
// saying what's next.
function buildFocusNav(entryIndex, entry) {
  const entries = activeSession.entries;
  const isFirst = entryIndex === 0;
  const isLast = entryIndex === entries.length - 1;
  const complete = isEntryComplete(entry);

  const wrap = document.createElement("div");
  wrap.className = "focus-nav-wrap";

  const nav = document.createElement("div");
  nav.className = "focus-nav";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "btn btn--ghost";
  prev.textContent = "‹ Previous";
  prev.disabled = isFirst;
  prev.addEventListener("click", () => goToExercise(entryIndex - 1));

  const next = document.createElement("button");
  next.type = "button";
  if (isLast) {
    next.className = "btn btn--primary";
    next.textContent = "Finish ✓";
    next.addEventListener("click", finishWorkout);
  } else {
    // Next "lights up" (coral) once this exercise is done.
    next.className = complete ? "btn btn--primary" : "btn btn--ghost";
    next.textContent = "Next ›";
    next.addEventListener("click", () => goToExercise(entryIndex + 1));
  }

  nav.appendChild(prev);
  nav.appendChild(next);
  wrap.appendChild(nav);

  // "Up next: 💪 Overhead Press · 3 sets"
  if (!isLast) {
    const nextEntry = entries[entryIndex + 1];
    const nextExercise = findExerciseById(nextEntry.exerciseId);
    const upNext = document.createElement("p");
    upNext.className = "focus-upnext";
    upNext.textContent =
      "Up next: " +
      (nextExercise ? nextExercise.icon + " " + nextExercise.name : "another exercise") +
      " · " +
      pluralise(nextEntry.sets.length, "set");
    wrap.appendChild(upNext);
  }

  return wrap;
}

// "Workout details": the date (rarely changed mid-workout, so it's folded).
// It feeds the original date box in the sheet, so app.js's
// handleWorkoutDateChange() does the saving and relabels the day.
function buildWorkoutDetails() {
  const details = document.createElement("details");
  details.className = "focus-edit focus-details";

  const summary = document.createElement("summary");
  summary.className = "focus-edit__summary";
  summary.textContent = "Workout details";
  details.appendChild(summary);

  const label = document.createElement("label");
  label.className = "workout-date";
  const labelText = document.createElement("span");
  labelText.className = "workout-date__label";
  labelText.textContent = "Date";
  const input = document.createElement("input");
  input.className = "input";
  input.type = "date";
  input.value = document.getElementById("workoutDateInput").value;
  input.addEventListener("change", () => {
    document.getElementById("workoutDateInput").value = input.value;
    handleWorkoutDateChange();
  });
  label.appendChild(labelText);
  label.appendChild(input);
  details.appendChild(label);

  const note = document.createElement("p");
  note.className = "sheet__note";
  note.textContent = "Progress saves automatically as you go.";
  details.appendChild(note);

  return details;
}
