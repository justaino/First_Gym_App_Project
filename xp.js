/*
  xp.js — XP and levels (Owl Quest phase Q2).

  The big idea: XP is WORKED OUT from the workouts you've already saved. It is
  never stored anywhere. Every time the Today screen draws, we add up your
  finished workouts and turn the total into a level. That means:
    - no database changes,
    - everyone's past workouts count straight away,
    - editing or deleting an old workout changes your XP too (fair is fair).

  ── HOW TO TWEAK IT ──────────────────────────────────────────────────────
  All the numbers and names live in the section right below. Change them
  there and nothing else. The drawing code further down reads from them.
  ─────────────────────────────────────────────────────────────────────────

  This file is loaded after app.js and uses its helpers (loadList,
  loadActiveProfileId, isCompletedSession, entrySetsDone, entryMaxWeight).
*/

/* =========================================================================
   1. THE RULES — edit these, nothing else
   ========================================================================= */

// How much XP each thing is worth.
const XP_PER_SET = 10; // every set you ticked done in a finished workout
const XP_PER_WORKOUT = 50; // every finished workout
const XP_PER_RECORD = 25; // every personal record (beating your best weight)

// Levels get harder as you go: going from level L to level L+1 costs
// L × XP_LEVEL_STEP. So level 1 → 2 costs 200, level 2 → 3 costs 400, and so on.
const XP_LEVEL_STEP = 200;

// The highest level. Reaching it takes 87,000 XP (roughly 3 years of training).
const MAX_LEVEL = 30;

// The owl's name for each band of levels. Each name applies from its
// `fromLevel` until the next name takes over. Keep them in order.
const LEVEL_NAMES = [
  { fromLevel: 1, name: "Egg" },
  { fromLevel: 2, name: "Hatchling" },
  { fromLevel: 4, name: "Owlet" },
  { fromLevel: 7, name: "Fledgling" },
  { fromLevel: 10, name: "Night Owl" },
  { fromLevel: 13, name: "Barn Owl" },
  { fromLevel: 16, name: "Snowy Owl" },
  { fromLevel: 19, name: "Great Horned Owl" },
  { fromLevel: 22, name: "Eagle Owl" },
  { fromLevel: 25, name: "Wise Owl" },
  { fromLevel: 28, name: "Elder Owl" },
  { fromLevel: 30, name: "Athena's Owl" },
];

/* =========================================================================
   2. ADDING UP XP
   ========================================================================= */

// Add up the XP for a profile (the active one if you don't pass an id).
// Returns a breakdown so it's easy to check in the console, e.g.
//   computeTotalXp()
//   → { total: 1285, sets: 96, workouts: 6, records: 3, ... }
function computeTotalXp(profileId) {
  const id = profileId || loadActiveProfileId();

  // Only this profile's FINISHED workouts count. A workout that's still in
  // progress earns nothing until you tap Finish.
  const sessions = loadList(STORAGE_KEYS.sessions).filter(
    (session) => session.profileId === id && isCompletedSession(session)
  );

  // Count every set that was ticked done.
  let sets = 0;
  sessions.forEach((session) => {
    session.entries.forEach((entry) => {
      sets += entrySetsDone(entry);
    });
  });

  const workouts = sessions.length;
  const records = countPersonalRecords(sessions);

  const fromSets = sets * XP_PER_SET;
  const fromWorkouts = workouts * XP_PER_WORKOUT;
  const fromRecords = records * XP_PER_RECORD;

  return {
    total: fromSets + fromWorkouts + fromRecords,
    sets: sets,
    workouts: workouts,
    records: records,
    fromSets: fromSets,
    fromWorkouts: fromWorkouts,
    fromRecords: fromRecords,
  };
}

// How many personal records are in this history. We walk through the workouts
// oldest first, remembering the best weight so far for each exercise. Beating
// it counts as a record, using the same rule as the "New personal record!"
// confetti: the very first time you do an exercise there's nothing to beat, so
// that doesn't count.
function countPersonalRecords(sessions) {
  // Oldest first, so "best so far" really means "best before this workout".
  const oldestFirst = sessions.slice().sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const bestSoFar = {}; // exerciseId -> heaviest weight lifted so far
  let records = 0;

  oldestFirst.forEach((session) => {
    session.entries.forEach((entry) => {
      const max = entryMaxWeight(entry); // null when no weight was ticked
      if (max === null) {
        return;
      }
      const previousBest = bestSoFar[entry.exerciseId];
      if (previousBest !== undefined && max > previousBest) {
        records += 1;
      }
      if (previousBest === undefined || max > previousBest) {
        bestSoFar[entry.exerciseId] = max;
      }
    });
  });

  return records;
}

/* =========================================================================
   3. TURNING XP INTO A LEVEL
   ========================================================================= */

// The total XP you need to REACH a level. Level 1 is 0, level 2 is 200,
// level 3 is 600 (200 + 400), level 4 is 1,200 (200 + 400 + 600), and so on.
function xpNeededForLevel(level) {
  return (XP_LEVEL_STEP * level * (level - 1)) / 2;
}

// The owl name for a level, e.g. 11 → "Night Owl".
function levelName(level) {
  let name = LEVEL_NAMES[0].name;
  LEVEL_NAMES.forEach((band) => {
    if (level >= band.fromLevel) {
      name = band.name;
    }
  });
  return name;
}

// Work out which level a total XP puts you on, and how far through it you are.
// Returns e.g. { level: 4, name: "Owlet", xpIntoLevel: 340, xpForLevel: 800,
//                isMax: false }
function levelForXp(totalXp) {
  // Climb up one level at a time while you have enough XP for the next one.
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= xpNeededForLevel(level + 1)) {
    level += 1;
  }

  const isMax = level === MAX_LEVEL;
  const levelStart = xpNeededForLevel(level);

  return {
    level: level,
    name: levelName(level),
    // XP earned since reaching this level, and what this level costs in total.
    xpIntoLevel: totalXp - levelStart,
    xpForLevel: isMax ? 0 : xpNeededForLevel(level + 1) - levelStart,
    isMax: isMax,
  };
}

/* =========================================================================
   4. DRAWING THE LEVEL BAR (on the Today card)
   ========================================================================= */

// Fill in the level bar on the Today card. Called from renderToday() in app.js.
function renderLevelBar() {
  const bar = document.getElementById("levelBar");
  if (!bar) {
    return;
  }

  // No profile yet → nothing to show.
  if (!loadActiveProfileId()) {
    bar.hidden = true;
    return;
  }

  const xp = computeTotalXp();
  const info = levelForXp(xp.total);

  // Left label: "Lv 4 · Owlet".
  document.getElementById("levelBarName").textContent =
    "Lv " + info.level + " · " + info.name;

  // Right label and how full the bar is. toLocaleString() adds the commas
  // (12,400 rather than 12400).
  const xpLabel = document.getElementById("levelBarXp");
  const track = document.getElementById("levelBarTrack");
  let percent;
  if (info.isMax) {
    xpLabel.textContent = "🏆 Max · " + xp.total.toLocaleString() + " XP";
    percent = 100;
  } else {
    xpLabel.textContent =
      info.xpIntoLevel.toLocaleString() +
      " / " +
      info.xpForLevel.toLocaleString() +
      " XP";
    percent = Math.floor((info.xpIntoLevel / info.xpForLevel) * 100);
  }
  document.getElementById("levelBarFill").style.width = percent + "%";

  // For screen readers: a proper progress bar with a spoken description.
  track.setAttribute("aria-valuenow", String(percent));
  track.setAttribute(
    "aria-valuetext",
    "Level " + info.level + ", " + info.name + ". " + xpLabel.textContent
  );

  // Hovering (on a computer) shows your lifetime total.
  bar.title = xp.total.toLocaleString() + " XP in total";

  bar.hidden = false;
}
