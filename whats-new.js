/*
  whats-new.js — the release notes (Phase 16).

  Two jobs:
    1. Hold the list of updates (the RELEASES array below).
    2. Draw them on whats-new.html.

  It's also loaded by the app itself (index.html), which reads the newest date
  to decide whether to show the "new update" dot in Settings. That's why the
  data and the drawing live together: one file to update, and the app and the
  page can never disagree about what the latest release is.

  ── HOW TO ADD A RELEASE ─────────────────────────────────────────────────
  Put a new object at the TOP of RELEASES. The one at the top is drawn in
  full; everything below it folds down to a single tappable line, so the
  entry you write today automatically becomes a folded row tomorrow.

    {
      date: "2026-08-02",              // YYYY-MM-DD, used for sorting + the dot
      title: "Short, plain headline",  // what changed, in the user's words
      intro: "One warm sentence.",     // optional; only the top entry shows it
      items: ["One thing per line."],
    }

  Write it for your friends, not for yourself: "Close friends works both ways
  now", never "changed close_friends to mutual". Skip anything invisible —
  if nobody can see it, it isn't news.
  ─────────────────────────────────────────────────────────────────────────
*/

const RELEASES = [
  {
    date: "2026-07-28",
    title: "Leave yourself a note",
    intro:
      "Thought of something mid-set that you want to remember for next week? " +
      "You can write it down now, right where it happened.",
    items: [
      "Every exercise in a workout has a 📝 Add note button. Tap it and jot down whatever you want: \"next week try 2.5kg more\", \"felt easy\", \"left shoulder twinged\".",
      "Next time you train that exercise, your last note is waiting for you underneath it, next to what you lifted. No digging through history to find it.",
      "Notes save as you type and stay with that day's workout, so you can always look one up later too.",
      "Your notes are private. Close friends can see your workouts, but never what you wrote.",
      "Fixed: a workout now counts only the exercises you actually trained. Planning three and doing one says \"1 exercise\", not \"3\".",
    ],
  },
  {
    date: "2026-07-25",
    title: "Usernames, close friends and a proper guide",
    intro:
      "You've got your own @handle now, close friends became something you " +
      "both agree to, and there's a guide in the app if you ever wonder what " +
      "something does.",
    items: [
      "You have a username, like @mintyowl42. Change it to whatever you like in Settings → Friends.",
      "Add a friend by username or by email, whichever you know.",
      "Close friends now works both ways. You ask, they accept, and you can each open the other's workouts. Either of you can end it.",
      "Prefer to share one way only? \"Share mine only\" does exactly that, and nobody has to accept anything.",
      "Signing up asks for your email twice, so a typo can't lock you out of your own account.",
      "New: Settings → 📖 How to use, a walkthrough of every tab.",
      "The app is now called Athena's Arena. Same app, better name.",
    ],
  },
  {
    date: "2026-07-24",
    title: "Friends, nudges and your week in review",
    items: [
      "A Friends tab. Add people, see who's trained today, and check how many workouts they've done this week.",
      "👋 Nudge a friend once a day to get them off the sofa. They'll see it next time they open the app.",
      "A \"Gym buddies\" panel on Today showing who's been in. Tap the heading to fold it away.",
      "A weekly recap: last week's workouts, sets, weight moved and any records, on Progress and once a week on Today.",
      "Exercise name suggestions when you're adding to your plan, with sets and reps filled in for you.",
      "While training, each exercise now reminds you what you lifted last time.",
      "Switch between kg and lb in Settings. It only changes the label, never your saved numbers.",
      "Drag the ⠿ handle on the Schedule tab to reorder exercises within a day.",
    ],
  },
  {
    date: "2026-06-26",
    title: "Everything before July",
    items: [
      "Accounts and cloud sync, so your workouts follow you between devices.",
      "Workout mode with per-set ticking, weights, and a rest timer that keeps counting even if you lock your phone.",
      "A Progress tab: weekly goal ring, streaks, personal records, a 12-week heatmap and per-exercise charts.",
      "Install it to your home screen and use it like a normal app, offline included.",
      "Dark mode, backup and restore, and a handful of hidden surprises. 🦉",
    ],
  },
];

/* =========================================================================
   Drawing the page (this part only runs on whats-new.html)
   ========================================================================= */

// Turn "2026-07-25" into "25 July 2026".
function formatReleaseDate(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Short form for the folded rows: "25 Jul".
function formatShortDate(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Build the bullet list shared by both the big entry and the opened ones.
function buildReleaseItems(release) {
  const list = document.createElement("ul");
  list.className = "release-items";
  release.items.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.appendChild(item);
  });
  return list;
}

// The newest release, shown in full at the top of the page.
function buildLatestRelease(release) {
  const card = document.createElement("div");
  card.className = "card release release--latest";

  const chip = document.createElement("span");
  chip.className = "release__chip";
  chip.textContent = "Latest · " + formatShortDate(release.date);
  card.appendChild(chip);

  const title = document.createElement("h2");
  title.className = "release__title";
  title.textContent = release.title;
  card.appendChild(title);

  if (release.intro) {
    const intro = document.createElement("p");
    intro.className = "release__intro";
    intro.textContent = release.intro;
    card.appendChild(intro);
  }

  card.appendChild(buildReleaseItems(release));
  return card;
}

// An older release: one tappable row, opening to show its bullets.
function buildFoldedRelease(release) {
  const row = document.createElement("div");
  row.className = "release-row";

  const header = document.createElement("button");
  header.className = "release-row__header";
  header.type = "button";
  header.setAttribute("aria-expanded", "false");

  const date = document.createElement("span");
  date.className = "release-row__date";
  date.textContent = formatShortDate(release.date);

  const title = document.createElement("span");
  title.className = "release-row__title";
  title.textContent = release.title;

  // A chevron in a circle. It's turned by CSS when the row opens, so there's
  // no second character to keep in step here.
  const caret = document.createElement("span");
  caret.className = "release-row__caret";
  caret.setAttribute("aria-hidden", "true");
  caret.textContent = "›";

  header.appendChild(date);
  header.appendChild(title);
  header.appendChild(caret);

  const body = document.createElement("div");
  body.className = "release-row__body";
  body.hidden = true;
  body.appendChild(buildReleaseItems(release));

  header.addEventListener("click", () => {
    const isOpen = !body.hidden;
    body.hidden = isOpen;
    header.setAttribute("aria-expanded", isOpen ? "false" : "true");
    row.classList.toggle("release-row--open", !isOpen);
  });

  row.appendChild(header);
  row.appendChild(body);
  return row;
}

// Draw the whole page. Does nothing inside the app itself, where these
// elements don't exist.
function renderWhatsNew() {
  const latestBox = document.getElementById("latestRelease");
  const olderBox = document.getElementById("olderReleases");
  if (!latestBox || !olderBox) {
    return;
  }

  const updated = document.getElementById("lastUpdated");
  if (updated && RELEASES.length > 0) {
    updated.textContent = "Updated " + formatReleaseDate(RELEASES[0].date);
  }

  latestBox.innerHTML = "";
  olderBox.innerHTML = "";

  if (RELEASES.length === 0) {
    return;
  }

  latestBox.appendChild(buildLatestRelease(RELEASES[0]));

  const older = RELEASES.slice(1);
  if (older.length === 0) {
    return;
  }

  const heading = document.createElement("h3");
  heading.className = "release-heading";
  heading.textContent = "Earlier updates";
  olderBox.appendChild(heading);

  const card = document.createElement("div");
  card.className = "card";
  card.style.padding = "8px"; // the rows carry their own padding
  older.forEach((release) => card.appendChild(buildFoldedRelease(release)));
  olderBox.appendChild(card);
}

document.addEventListener("DOMContentLoaded", renderWhatsNew);
