/*
  week-path.js — the week path on the Today tab (Owl Quest phase Q3).

  Your week drawn as a trail of stepping stones, one stone per day in your
  schedule (Monday → Sunday), joined by a dotted line:
    - DONE     (butter yellow, ✓)  you finished a workout that day. Tap it to
                                   see the workout.
    - TODAY    (bigger, coral)     today's planned workout. Tap it to start.
    - COMING UP (pale lavender)    a planned day later this week.
    - MISSED   (faded)             a planned day that went by without a workout.
                                   No red on purpose: it's a nudge, not a telling-off.
    - REST     (small, "Rest")     today, when nothing is planned, so you can
                                   still see where you are in the week.
  Rest days get no stone, and a day you trained that WASN'T in your schedule
  still gets a done stone, so extra effort always shows.

  Like XP (xp.js), nothing is stored: it's worked out from your schedule and
  your saved workouts each time Today draws.

  This file is loaded after app.js and uses its helpers (DAYS, dayNameOf,
  getTodayName, weekMondayMidnight, getExercisesForActiveProfile, loadList,
  isCompletedSession, showSessionDetail, startWorkout).
*/

/* =========================================================================
   1. WORKING OUT THE STONES
   ========================================================================= */

// Build the list of stones for this week, in order Monday → Sunday. Each one is
//   { day: "Monday", status: "done" | "today" | "later" | "missed" | "rest",
//     isToday: true/false, session: (the finished workout, for done stones) }
function buildWeekStones() {
  const activeId = loadActiveProfileId();
  const todayName = getTodayName();
  const todayIndex = DAYS.indexOf(todayName); // 0 = Monday ... 6 = Sunday

  // Which days have exercises planned in the Schedule.
  const plannedDays = new Set(
    getExercisesForActiveProfile().map((exercise) => exercise.day)
  );

  // This week runs from Monday midnight up to (not including) next Monday.
  const weekStart = weekMondayMidnight(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // This week's finished workouts, by the day they actually happened (from the
  // workout's date). If you trained twice in a day, the later one wins.
  const doneByDay = {}; // "Monday" -> session
  loadList(STORAGE_KEYS.sessions).forEach((session) => {
    if (session.profileId !== activeId || !isCompletedSession(session)) {
      return;
    }
    const when = new Date(session.date);
    if (when < weekStart || when >= weekEnd) {
      return; // not this week
    }
    const day = dayNameOf(when);
    const existing = doneByDay[day];
    if (!existing || new Date(existing.date) < when) {
      doneByDay[day] = session;
    }
  });

  const stones = [];
  DAYS.forEach((day, index) => {
    const isToday = index === todayIndex;
    const planned = plannedDays.has(day);
    const done = Boolean(doneByDay[day]);

    let status;
    if (done) {
      status = "done";
    } else if (isToday) {
      status = planned ? "today" : "rest";
    } else if (!planned) {
      return; // a rest day that isn't today: no stone
    } else if (index < todayIndex) {
      status = "missed";
    } else {
      status = "later";
    }

    stones.push({
      day: day,
      status: status,
      isToday: isToday,
      session: doneByDay[day] || null,
    });
  });

  return stones;
}

/* =========================================================================
   2. DRAWING THE PATH
   ========================================================================= */

// The stones sit in a gentle wave: alternately lower and higher. These are the
// heights (in pixels, measured from the top of the path) of their centres.
// A deep enough wave keeps seven stones from bumping into each other on a
// narrow phone.
const WEEK_PATH_HEIGHT = 110;
const WEEK_PATH_LOW = 74;
const WEEK_PATH_HIGH = 36;

// Fill in the "This week" card under the Today card. Called from renderToday().
function renderWeekPath() {
  const card = document.getElementById("weekPathCard");
  if (!card) {
    return;
  }

  // Nothing to show without a profile, or before anything is planned or done.
  const stones = loadActiveProfileId() ? buildWeekStones() : [];
  const hasRealStones = stones.some((stone) => stone.status !== "rest");
  if (!hasRealStones) {
    card.hidden = true;
    return;
  }

  // Header count, e.g. "2 of 4 done". The rest-day stone doesn't count.
  const countable = stones.filter((stone) => stone.status !== "rest");
  const doneCount = countable.filter((stone) => stone.status === "done").length;
  document.getElementById("weekPathCount").textContent =
    doneCount + " of " + countable.length + " done";

  const path = document.getElementById("weekPath");
  path.innerHTML = "";
  path.style.height = WEEK_PATH_HEIGHT + "px";

  // Where each stone's centre goes: spread evenly across the width (as a
  // percentage), alternating low / high.
  const points = stones.map((stone, index) => ({
    x: ((index + 0.5) / stones.length) * 100,
    y: index % 2 === 0 ? WEEK_PATH_LOW : WEEK_PATH_HIGH,
  }));

  // The dotted line goes in first so it sits behind the stones.
  if (points.length > 1) {
    path.appendChild(buildWeekPathLine(points));
  }

  stones.forEach((stone, index) => {
    const element = buildWeekStone(stone);
    element.style.left = points[index].x + "%";
    element.style.top = points[index].y + "px";
    path.appendChild(element);
  });

  card.hidden = false;
}

// The dotted line joining the stones, as an SVG curve. The drawing area is
// 100 units wide (so x matches the stones' percentages) and stretches to fit
// the card; "non-scaling-stroke" keeps the dots round when it stretches.
function buildWeekPathLine(points) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "week-path__line");
  svg.setAttribute("viewBox", "0 0 100 " + WEEK_PATH_HEIGHT);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  // Start at the first stone, then curve smoothly to each next one. The two
  // control points sit halfway across, level with each end, which gives an
  // S-shaped bend between a low stone and a high one.
  let d = "M " + points[0].x + " " + points[0].y;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const midX = (from.x + to.x) / 2;
    d +=
      " C " + midX + " " + from.y + ", " + midX + " " + to.y + ", " + to.x + " " + to.y;
  }

  const line = document.createElementNS(svgNS, "path");
  line.setAttribute("d", d);
  line.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(line);
  return svg;
}

// One stone. Done and today stones are buttons (you can tap them); the others
// are plain labels.
function buildWeekStone(stone) {
  const shortDay = stone.day.slice(0, 3); // "Monday" -> "Mon"
  const tappable = stone.status === "done" || stone.status === "today";
  const element = document.createElement(tappable ? "button" : "span");
  if (tappable) {
    element.type = "button";
  }

  element.className = "week-stone week-stone--" + stone.status;
  if (stone.isToday) {
    element.classList.add("week-stone--current"); // the coral ring
  }

  // What's written on the stone.
  if (stone.status === "rest") {
    element.textContent = "Rest";
  } else if (stone.isToday) {
    element.textContent = "Today";
  } else {
    element.textContent = shortDay;
  }

  // Done stones get a small mint ✓ badge in the corner.
  if (stone.status === "done") {
    const tick = document.createElement("span");
    tick.className = "week-stone__tick";
    tick.textContent = "✓";
    tick.setAttribute("aria-hidden", "true");
    element.appendChild(tick);
  }

  // What a screen reader says, e.g. "Monday: done. Tap to see the workout."
  const spoken = {
    done: "done. Tap to see the workout.",
    today: "today's workout. Tap to start.",
    later: "coming up.",
    missed: "missed.",
    rest: "today, a rest day.",
  };
  element.setAttribute("aria-label", stone.day + ": " + spoken[stone.status]);

  // Tapping: see a done workout, or start today's.
  if (stone.status === "done") {
    element.addEventListener("click", () => showSessionDetail(stone.session));
  } else if (stone.status === "today") {
    element.addEventListener("click", () => startWorkout(stone.day));
  }

  return element;
}
