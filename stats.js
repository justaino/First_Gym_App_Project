/*
  stats.js — the stats under the feathers on the Badges tab (after Owl Quest Q5).

  Four calm cards, each answering one question, drawn from your finished
  workouts (nothing new is stored):
    1. THIS MONTH        — workouts, sets and your week streak, with a small
                           "▲ 2 vs Aug" (compared with the same point last month).
    2. WEEK BY WEEK      — 12 columns, one per week, against your weekly goal.
                           Tap a column for that week.
    3. RECORDS           — each exercise's best weight, when, and how your latest
                           session compares with your first ("▲ 10 kg").
    4. EXERCISE PROGRESS — pick an exercise, see your best set each session as a
                           line. Tap along it, then "See this workout".

  The charts are plain SVG drawn here — no chart library. They use a fixed
  drawing width (CHART_WIDTH) and stretch to fit the card, so they draw
  correctly even while the Badges tab is hidden.

  Loaded after app.js and badges.js, and uses their helpers (loadActiveProfileId,
  loadWeeklyGoal, getExercisesForActiveProfile, findExerciseById, entrySetsDone,
  entryMaxWeight, computeWeekStreak, weekMondayMidnight, weekKeyOf,
  longestWeekStreak, formatDate, formatWeight, unitLabel, pluralise,
  showSessionDetail, createEmptyState).
*/

/* =========================================================================
   1. SETTINGS AND SMALL HELPERS
   ========================================================================= */

// The width the charts are drawn at before they stretch to fit the card.
const CHART_WIDTH = 320;
// How many weeks "Week by week" shows.
const WEEKS_SHOWN = 12;

// Which exercise "Exercise progress" shows (memory only).
let statsExerciseId = null;

const SVG_NS = "http://www.w3.org/2000/svg";

// Make an SVG element with some attributes, optionally adding it to a parent.
function svgEl(name, attributes, parent) {
  const element = document.createElementNS(SVG_NS, name);
  Object.keys(attributes || {}).forEach((key) => {
    element.setAttribute(key, attributes[key]);
  });
  if (parent) {
    parent.appendChild(element);
  }
  return element;
}

// A short date for chart labels, e.g. "7 Jul".
function shortDate(date) {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// A plain number with at most one decimal: 42.5 -> "42.5", 40 -> "40".
function tidyNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// One card with a title on the left and a small note on the right.
function buildStatsCard(title, meta) {
  const card = document.createElement("section");
  card.className = "card stats-card";
  const head = document.createElement("div");
  head.className = "stats-card__head";
  const heading = document.createElement("h2");
  heading.className = "stats-card__title";
  heading.textContent = title;
  head.appendChild(heading);
  if (meta) {
    const note = document.createElement("span");
    note.className = "stats-card__meta";
    note.textContent = meta;
    head.appendChild(note);
  }
  card.appendChild(head);
  return card;
}

// The floating label used by both charts. `x` and `y` are in the chart's own
// drawing units; we convert them to where they are on screen right now.
function showStatsTip(wrap, svg, x, y, html) {
  let tip = wrap.querySelector(".stats-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "stats-tip";
    tip.setAttribute("role", "status");
    wrap.appendChild(tip);
  }
  tip.innerHTML = html;
  const scale = svg.getBoundingClientRect().width / CHART_WIDTH;
  const half = tip.offsetWidth / 2;
  const left = Math.min(Math.max(x * scale, half), wrap.clientWidth - half);
  tip.style.left = left + "px";
  tip.style.top = y * scale - 10 + "px";
}

/* =========================================================================
   2. DRAWING THE STATS (called from renderProgress in app.js)
   ========================================================================= */

// `sessions` = the active profile's finished workouts.
function renderStats(sessions) {
  const container = document.getElementById("stats");
  container.innerHTML = "";
  if (!loadActiveProfileId()) {
    return;
  }
  if (sessions.length === 0) {
    container.appendChild(
      createEmptyState("📊", "No workouts yet. Finish one to see your stats here.")
    );
    return;
  }

  container.appendChild(buildThisMonthCard(sessions));
  container.appendChild(buildWeekByWeekCard(sessions));
  const records = buildRecordsCard(sessions);
  if (records) {
    container.appendChild(records);
  }
  const progress = buildExerciseProgressSection(sessions);
  if (progress) {
    container.appendChild(progress);
  }
}

/* ---- 2a. This month ---- */

function buildThisMonthCard(sessions) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // "The same point last month": e.g. on 29 Sep, compare with 1–29 Aug. A
  // shorter month stops at its last day (on 31 Mar, compare with all of Feb).
  const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastMonthCutoff = new Date(
    lastMonthStart.getFullYear(),
    lastMonthStart.getMonth(),
    Math.min(now.getDate(), daysInLastMonth),
    23, 59, 59
  );

  const thisMonth = sessions.filter((s) => new Date(s.date) >= monthStart);
  const lastMonth = sessions.filter((s) => {
    const when = new Date(s.date);
    return when >= lastMonthStart && when <= lastMonthCutoff;
  });
  const setsIn = (list) =>
    list.reduce(
      (sum, session) =>
        sum + session.entries.reduce((inner, entry) => inner + entrySetsDone(entry), 0),
      0
    );

  const lastMonthName = lastMonthStart.toLocaleDateString(undefined, { month: "short" });
  const card = buildStatsCard(
    "This month",
    now.toLocaleDateString(undefined, { month: "long" })
  );

  const row = document.createElement("div");
  row.className = "stats-figures";
  row.appendChild(
    buildFigure("Workouts", thisMonth.length, "", compareLine(thisMonth.length, lastMonth.length, lastMonthName))
  );
  row.appendChild(
    buildFigure("Sets", setsIn(thisMonth), "", compareLine(setsIn(thisMonth), setsIn(lastMonth), lastMonthName))
  );

  // The streak: weeks in a row with a workout (same as the old tile), plus
  // your best ever run (badges.js).
  const streak = computeWeekStreak(sessions);
  const best = longestWeekStreak(sessions.map((session) => weekKeyOf(session.date)));
  const bestLine = document.createElement("span");
  bestLine.textContent = "best " + best;
  row.appendChild(buildFigure("Streak", streak, streak === 1 ? "wk" : "wks", bestLine));

  card.appendChild(row);
  return card;
}

// One figure: a small label, a big number (with an optional unit) and a line
// underneath.
function buildFigure(label, value, unit, belowElement) {
  const figure = document.createElement("div");
  figure.className = "stats-figure";
  const labelEl = document.createElement("div");
  labelEl.className = "stats-figure__label";
  labelEl.textContent = label;
  const valueEl = document.createElement("div");
  valueEl.className = "stats-figure__value";
  valueEl.textContent = value.toLocaleString();
  if (unit) {
    const unitEl = document.createElement("span");
    unitEl.className = "stats-figure__unit";
    unitEl.textContent = unit;
    valueEl.appendChild(unitEl);
  }
  const below = document.createElement("div");
  below.className = "stats-figure__below";
  below.appendChild(belowElement);
  figure.appendChild(labelEl);
  figure.appendChild(valueEl);
  figure.appendChild(below);
  return figure;
}

// "▲ 2 vs Aug" (green), "▼ 1 vs Aug" (red) or "same as Aug".
function compareLine(now, before, monthName) {
  const line = document.createElement("span");
  const difference = now - before;
  if (difference === 0) {
    line.textContent = "same as " + monthName;
    return line;
  }
  const arrow = document.createElement("span");
  arrow.className = difference > 0 ? "stats-up" : "stats-down";
  arrow.textContent = (difference > 0 ? "▲ " : "▼ ") + Math.abs(difference).toLocaleString();
  line.appendChild(arrow);
  line.appendChild(document.createTextNode(" vs " + monthName));
  return line;
}

/* ---- 2b. Week by week ---- */

function buildWeekByWeekCard(sessions) {
  const goal = loadWeeklyGoal(loadActiveProfileId());
  const card = buildStatsCard("Week by week", "Goal: " + goal + " a week");

  // The last 12 weeks (Monday to Sunday), oldest first, ending with this week.
  const thisMonday = weekMondayMidnight(new Date());
  const weeks = [];
  for (let back = WEEKS_SHOWN - 1; back >= 0; back--) {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - back * 7);
    weeks.push({ monday: monday, key: weekKeyOf(monday), workouts: 0, sets: 0 });
  }
  const byKey = {};
  weeks.forEach((week) => {
    byKey[week.key] = week;
  });
  sessions.forEach((session) => {
    const week = byKey[weekKeyOf(session.date)];
    if (week) {
      week.workouts += 1;
      week.sets += session.entries.reduce((sum, entry) => sum + entrySetsDone(entry), 0);
    }
  });

  // Legend: two column shades plus the goal line.
  const legend = document.createElement("div");
  legend.className = "stats-legend";
  legend.setAttribute("aria-hidden", "true");
  legend.innerHTML =
    '<span><i class="stats-key stats-key--hit"></i>Hit your goal</span>' +
    '<span><i class="stats-key stats-key--below"></i>Below goal</span>' +
    '<span><i class="stats-key stats-key--goal"></i>Goal</span>';
  card.appendChild(legend);

  card.appendChild(drawWeekChart(weeks, goal));

  const hint = document.createElement("p");
  hint.className = "stats-hint";
  hint.textContent = "Last " + WEEKS_SHOWN + " weeks. Tap a column for that week.";
  card.appendChild(hint);
  return card;
}

function drawWeekChart(weeks, goal) {
  const wrap = document.createElement("div");
  wrap.className = "stats-chart";

  const W = CHART_WIDTH;
  const H = 160;
  const left = 22;
  const right = 4;
  const top = 12;
  const bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  // A clean top for the axis: at least the goal, rounded up to an even number.
  const most = Math.max(goal, ...weeks.map((week) => week.workouts));
  const maxY = Math.max(2, Math.ceil(most / 2) * 2);
  const step = maxY <= 4 ? 1 : 2;
  const y = (value) => top + plotH - (value / maxY) * plotH;
  const band = plotW / weeks.length;
  const barW = Math.min(18, band * 0.6);

  const hits = weeks.filter((week) => week.workouts >= goal).length;
  const svg = svgEl("svg", {
    viewBox: "0 0 " + W + " " + H,
    role: "img",
    "aria-label":
      "Workouts per week for the last " + weeks.length + " weeks, against a goal of " +
      goal + ". Goal hit in " + hits + " of " + weeks.length + " weeks.",
  }, wrap);

  // Hairline gridlines with their numbers on the left.
  for (let tick = 0; tick <= maxY; tick += step) {
    svgEl("line", { class: "stats-grid", x1: left, x2: W - right, y1: y(tick), y2: y(tick) }, svg);
    svgEl("text", { class: "stats-axis", x: left - 7, y: y(tick) + 4, "text-anchor": "end" }, svg)
      .textContent = tick;
  }

  weeks.forEach((week, index) => {
    const cx = left + band * index + band / 2;
    const isThisWeek = index === weeks.length - 1;
    const colour = week.workouts >= goal ? "stats-bar--hit" : "stats-bar--below";

    if (week.workouts > 0) {
      // A column with a 4px rounded top and a square bottom.
      const x0 = cx - barW / 2;
      const yTop = y(week.workouts);
      const base = y(0);
      const r = Math.min(4, base - yTop);
      svgEl("path", {
        class: "stats-bar " + colour,
        d: "M" + x0 + "," + base + "V" + (yTop + r) +
          "Q" + x0 + "," + yTop + " " + (x0 + r) + "," + yTop +
          "H" + (x0 + barW - r) + "Q" + (x0 + barW) + "," + yTop + " " + (x0 + barW) + "," + (yTop + r) +
          "V" + base + "Z",
      }, svg);
    } else {
      // An empty week: a short flat stub on the baseline, so it still shows.
      svgEl("line", { class: "stats-stub", x1: cx - barW / 2, x2: cx + barW / 2, y1: y(0) - 1, y2: y(0) - 1 }, svg);
    }

    // A date under every fourth week, and "This wk" under the last one.
    if (index % 4 === 0 || isThisWeek) {
      svgEl("text", { class: "stats-axis", x: cx, y: H - 5, "text-anchor": isThisWeek ? "end" : "middle" }, svg)
        .textContent = isThisWeek ? "This wk" : shortDate(week.monday);
    }
  });

  // The goal: a thin solid coral line across the chart, labelled at the end.
  svgEl("line", { class: "stats-goal", x1: left, x2: W - right, y1: y(goal), y2: y(goal) }, svg);
  svgEl("text", { class: "stats-axis", x: W - right, y: y(goal) - 5, "text-anchor": "end" }, svg)
    .textContent = "Goal";

  // Tapping (or hovering, or tabbing to) a week shows its numbers. Each week's
  // tap area is the whole column height, much bigger than the bar itself.
  let highlighted = null;
  weeks.forEach((week, index) => {
    const cx = left + band * index + band / 2;
    const label = index === weeks.length - 1 ? "This week" : "Week of " + shortDate(week.monday);
    const target = svgEl("rect", {
      class: "stats-hit",
      x: cx - band / 2,
      y: top,
      width: band,
      height: plotH,
      tabindex: 0,
      "aria-label": label + ": " + pluralise(week.workouts, "workout") + ", " + pluralise(week.sets, "set"),
    }, svg);
    const show = () => {
      if (highlighted) {
        highlighted.classList.remove("stats-hit--on");
      }
      target.classList.add("stats-hit--on");
      highlighted = target;
      showStatsTip(wrap, svg, cx, y(Math.max(week.workouts, 0.5)),
        label + "<small>" + pluralise(week.workouts, "workout") + " · " + pluralise(week.sets, "set") + "</small>");
    };
    target.addEventListener("pointerenter", show);
    target.addEventListener("click", show);
    target.addEventListener("focus", show);
  });

  return wrap;
}

/* ---- 2c. Records ---- */

// For each exercise that still exists, its weighted sessions in date order.
// Returns [{ exercise, points: [{ date, value, session }] }], using the
// heaviest ticked weight in each session.
function weightedHistoryByExercise(sessions) {
  const oldestFirst = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return getExercisesForActiveProfile()
    .map((exercise) => {
      const points = [];
      oldestFirst.forEach((session) => {
        const entry = session.entries.find((item) => item.exerciseId === exercise.id);
        const max = entry ? entryMaxWeight(entry) : null;
        if (max !== null) {
          points.push({ date: session.date, value: max, session: session });
        }
      });
      return { exercise: exercise, points: points };
    })
    .filter((item) => item.points.length > 0);
}

function buildRecordsCard(sessions) {
  const history = weightedHistoryByExercise(sessions);
  if (history.length === 0) {
    return null; // no weights recorded yet
  }

  const rows = history.map((item) => {
    // The best weight, and the first session it was lifted in.
    let best = item.points[0];
    item.points.forEach((point) => {
      if (point.value > best.value) {
        best = point;
      }
    });
    const first = item.points[0].value;
    const latest = item.points[item.points.length - 1].value;
    return { exercise: item.exercise, best: best, change: latest - first, sessions: item.points.length };
  });
  rows.sort((a, b) => b.best.value - a.best.value); // heaviest first

  const card = buildStatsCard("Records", "best · vs first time");
  const list = document.createElement("div");
  list.className = "stats-records";
  rows.forEach((row) => {
    const line = document.createElement("div");
    line.className = "stats-record";

    const icon = document.createElement("span");
    icon.className = "stats-record__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = row.exercise.icon;

    const text = document.createElement("div");
    text.className = "stats-record__text";
    const name = document.createElement("div");
    name.className = "stats-record__name";
    name.textContent = row.exercise.name;
    const date = document.createElement("div");
    date.className = "stats-record__date";
    date.textContent = formatDate(row.best.date);
    text.appendChild(name);
    text.appendChild(date);

    const right = document.createElement("div");
    right.className = "stats-record__right";
    const best = document.createElement("div");
    best.className = "stats-record__best";
    best.textContent = formatWeight(row.best.value);
    right.appendChild(best);

    // "▲ 10 kg": your LATEST session compared with your FIRST (the card's
    // corner says "vs first time"). Only once there are two to compare.
    if (row.sessions > 1) {
      const change = document.createElement("div");
      change.className = "stats-record__change";
      if (row.change === 0) {
        change.textContent = "no change";
      } else {
        change.classList.add(row.change > 0 ? "stats-up" : "stats-down");
        change.textContent = (row.change > 0 ? "▲ " : "▼ ") + formatWeight(Math.abs(row.change));
      }
      change.setAttribute(
        "aria-label",
        row.change === 0
          ? "Same as your first time"
          : (row.change > 0 ? "Up " : "Down ") + formatWeight(Math.abs(row.change)) + " since your first time"
      );
      right.appendChild(change);
    }

    line.appendChild(icon);
    line.appendChild(text);
    line.appendChild(right);
    list.appendChild(line);
  });
  card.appendChild(list);
  return card;
}

/* ---- 2d. Exercise progress ---- */

// Every exercise you've trained, with one point per session: the heaviest
// ticked weight, or (for exercises with no weights, like dips) the most reps
// in one set.
function progressHistoryByExercise(sessions) {
  const oldestFirst = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return getExercisesForActiveProfile()
    .map((exercise) => {
      const trained = [];
      oldestFirst.forEach((session) => {
        const entry = session.entries.find((item) => item.exerciseId === exercise.id);
        if (entry && entrySetsDone(entry) > 0) {
          trained.push({ session: session, entry: entry });
        }
      });
      const usesWeight = trained.some((item) => entryMaxWeight(item.entry) !== null);
      const points = trained
        .map((item) => ({
          date: item.session.date,
          session: item.session,
          value: usesWeight ? entryMaxWeight(item.entry) : mostRepsInASet(item.entry),
        }))
        .filter((point) => point.value !== null && point.value > 0);
      return { exercise: exercise, usesWeight: usesWeight, points: points };
    })
    .filter((item) => item.points.length > 0);
}

// Scroll a chip row sideways just enough that `chip` is fully visible (with a
// little breathing room). Only the row moves — never the page.
function keepChipInView(row, chip) {
  const margin = 16;
  const chipLeft = chip.offsetLeft - row.offsetLeft;
  const chipRight = chipLeft + chip.offsetWidth;
  if (chipLeft - margin < row.scrollLeft) {
    row.scrollLeft = Math.max(0, chipLeft - margin);
  } else if (chipRight + margin > row.scrollLeft + row.clientWidth) {
    row.scrollLeft = chipRight + margin - row.clientWidth;
  }
}

// The most reps in a single ticked set (old-shape entries have no per-set reps).
function mostRepsInASet(entry) {
  if (!Array.isArray(entry.sets)) {
    return null;
  }
  const reps = entry.sets.filter((set) => set.done).map((set) => Number(set.reps) || 0);
  return reps.length > 0 ? Math.max(...reps) : null;
}

function buildExerciseProgressSection(sessions) {
  const history = progressHistoryByExercise(sessions);
  if (history.length === 0) {
    return null;
  }
  // Keep the chosen exercise if it still has history; otherwise the first.
  if (!history.some((item) => item.exercise.id === statsExerciseId)) {
    statsExerciseId = history[0].exercise.id;
  }
  const chosen = history.find((item) => item.exercise.id === statsExerciseId);

  const card = buildStatsCard("Exercise progress", chosen.usesWeight ? "best set" : "most reps");

  // A row of chips, one per exercise. Tapping one redraws just this card.
  const chips = document.createElement("div");
  chips.className = "stats-chips";
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", "Choose an exercise");
  history.forEach((item) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "stats-chip";
    chip.textContent = item.exercise.name;
    const isChosen = item.exercise.id === statsExerciseId;
    chip.setAttribute("aria-pressed", isChosen ? "true" : "false");
    chip.addEventListener("click", () => {
      statsExerciseId = item.exercise.id;
      // Redraw this card. The new chip row would start scrolled back to the
      // left, throwing the chip you just tapped out of view — so carry the
      // scroll position across, then make sure the chosen chip is visible.
      const scrolledBy = chips.scrollLeft;
      const newCard = buildExerciseProgressSection(sessions);
      card.replaceWith(newCard);
      const newChips = newCard.querySelector(".stats-chips");
      newChips.scrollLeft = scrolledBy;
      const chosenChip = newChips.querySelector('[aria-pressed="true"]');
      keepChipInView(newChips, chosenChip);
      chosenChip.focus({ preventScroll: true }); // keyboard users stay on it
    });
    chips.appendChild(chip);
  });
  card.appendChild(chips);

  const legend = document.createElement("div");
  legend.className = "stats-legend";
  legend.setAttribute("aria-hidden", "true");
  legend.innerHTML =
    '<span><i class="stats-key stats-key--line"></i>' +
    (chosen.usesWeight ? "Best weight each session" : "Most reps in a set, each session") +
    '</span><span><i class="stats-key stats-key--dot"></i>New record</span>';
  card.appendChild(legend);

  // "See this workout" — enabled once you've picked a point on the line.
  const open = document.createElement("button");
  open.type = "button";
  open.className = "btn btn--ghost btn--small stats-open";
  open.disabled = true;
  open.textContent = "Tap the line to pick a workout";

  card.appendChild(drawProgressChart(chosen, open));

  if (chosen.points.length === 1) {
    const single = document.createElement("p");
    single.className = "stats-hint";
    single.textContent = "Just one session so far. Train it again to see a line.";
    card.appendChild(single);
  }
  card.appendChild(open);
  return card;
}

function drawProgressChart(item, openButton) {
  const wrap = document.createElement("div");
  wrap.className = "stats-chart";
  const points = item.points;
  const unit = item.usesWeight ? " " + unitLabel() : " reps";

  const W = CHART_WIDTH;
  const H = 180;
  const left = 32;
  const right = 44; // room for the latest value's label
  const top = 20;
  const bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  // Clean round numbers for the gridlines, a little beyond the data.
  const values = points.map((point) => point.value);
  const spread = Math.max(...values) - Math.min(...values);
  const step = spread > 30 ? 20 : spread > 12 ? 10 : spread > 4 ? 5 : item.usesWeight ? 2.5 : 1;
  const lo = Math.max(0, Math.floor((Math.min(...values) - step / 2) / step) * step);
  const hi = Math.ceil((Math.max(...values) + step / 2) / step) * step;
  const y = (value) => top + plotH - ((value - lo) / (hi - lo)) * plotH;

  // Along the bottom by real date, so a long gap looks like a gap.
  const firstTime = new Date(points[0].date).getTime();
  const lastTime = new Date(points[points.length - 1].date).getTime();
  const x = (date) =>
    points.length === 1 || lastTime === firstTime
      ? left + plotW / 2
      : left + ((new Date(date).getTime() - firstTime) / (lastTime - firstTime)) * plotW;

  const first = points[0];
  const latest = points[points.length - 1];
  const svg = svgEl("svg", {
    viewBox: "0 0 " + W + " " + H,
    role: "img",
    "aria-label":
      item.exercise.name + ": " + tidyNumber(first.value) + unit + " in your first session, " +
      tidyNumber(latest.value) + unit + " in your latest, over " + pluralise(points.length, "session") + ".",
  }, wrap);

  for (let tick = lo; tick <= hi + 0.001; tick += step) {
    svgEl("line", { class: "stats-grid", x1: left, x2: W - right, y1: y(tick), y2: y(tick) }, svg);
    svgEl("text", { class: "stats-axis", x: left - 7, y: y(tick) + 4, "text-anchor": "end" }, svg)
      .textContent = tidyNumber(tick);
  }

  const xy = points.map((point) => [x(point.date), y(point.value)]);
  if (points.length > 1) {
    const line = "M" + xy.map((pair) => pair.join(",")).join("L");
    // A soft wash under the line, then the 2px line itself.
    svgEl("path", { class: "stats-area", d: line + "L" + xy[xy.length - 1][0] + "," + y(lo) + "L" + xy[0][0] + "," + y(lo) + "Z" }, svg);
    svgEl("path", { class: "stats-line", d: line }, svg);
  }

  // A dot on every new record (beating every earlier session; the first
  // session has nothing to beat). A single session just gets a dot.
  let bestSoFar = points[0].value;
  points.forEach((point, index) => {
    const isRecord = index > 0 && point.value > bestSoFar;
    if (isRecord) {
      bestSoFar = point.value;
    }
    if (isRecord || points.length === 1) {
      svgEl("circle", { class: "stats-dot", cx: xy[index][0], cy: xy[index][1], r: 4.5 }, svg);
    }
  });

  // Labels on the first and latest values only.
  svgEl("text", { class: "stats-value", x: xy[0][0], y: xy[0][1] - 9, "text-anchor": "start" }, svg)
    .textContent = tidyNumber(first.value);
  if (points.length > 1) {
    const end = xy[xy.length - 1];
    svgEl("text", { class: "stats-value", x: end[0] + 8, y: end[1] + 4, "text-anchor": "start" }, svg)
      .textContent = tidyNumber(latest.value) + unit;
  }
  svgEl("text", { class: "stats-axis", x: xy[0][0], y: H - 5, "text-anchor": points.length > 1 ? "start" : "middle" }, svg)
    .textContent = shortDate(first.date);
  if (points.length > 1) {
    svgEl("text", { class: "stats-axis", x: xy[xy.length - 1][0], y: H - 5, "text-anchor": "end" }, svg)
      .textContent = shortDate(latest.date);
  }

  // Picking a session: a crosshair and a dot snap to the nearest session, the
  // label shows its numbers, and "See this workout" opens it.
  const cross = svgEl("line", { class: "stats-cross", y1: top, y2: top + plotH }, svg);
  const marker = svgEl("circle", { class: "stats-dot stats-dot--picked", r: 5.5 }, svg);
  cross.style.display = "none";
  marker.style.display = "none";

  let pickedIndex = null;
  function pick(index) {
    pickedIndex = index;
    const point = points[index];
    cross.setAttribute("x1", xy[index][0]);
    cross.setAttribute("x2", xy[index][0]);
    marker.setAttribute("cx", xy[index][0]);
    marker.setAttribute("cy", xy[index][1]);
    cross.style.display = "";
    marker.style.display = "";
    showStatsTip(wrap, svg, xy[index][0], xy[index][1],
      formatDate(point.date) + "<small>" + tidyNumber(point.value) + unit + "</small>");
    openButton.disabled = false;
    openButton.innerHTML = "See this workout " + iconSvg("forward");
    openButton.onclick = () => showSessionDetail(point.session);
  }

  const hit = svgEl("rect", {
    class: "stats-hit",
    x: 0,
    y: 0,
    width: W,
    height: H,
    tabindex: 0,
    "aria-label": "Pick a session: use the left and right arrow keys",
  }, svg);
  hit.addEventListener("pointermove", (event) => pickNearest(event));
  hit.addEventListener("click", (event) => pickNearest(event));
  // Keyboard: left/right arrows step between sessions.
  hit.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const start = pickedIndex === null ? points.length - 1 : pickedIndex;
    const next = event.key === "ArrowLeft" ? start - 1 : start + 1;
    pick(Math.min(Math.max(next, 0), points.length - 1));
  });
  function pickNearest(event) {
    const box = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    xy.forEach((pair, index) => {
      if (Math.abs(pair[0] - pointerX) < Math.abs(xy[nearest][0] - pointerX)) {
        nearest = index;
      }
    });
    pick(nearest);
  }

  return wrap;
}
