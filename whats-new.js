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
    date: "2026-09-29",
    title: "Calmer, clearer stats",
    intro: "The numbers under your feathers have had a tidy-up.",
    items: [
      "This month shows your workouts and sets so far, compared with the same point last month, plus your week streak and your best ever.",
      "Week by week shows your last 12 weeks against your weekly goal. Tap a column to see that week.",
      "Records puts each exercise's best weight next to how far you've come since your first session.",
      "Exercise progress: pick an exercise and see your best set every session as a line. Tap it to open that workout.",
      "Gone: the reps and kg moved totals, the grid of squares and the bar charts. Last week's recap still shows on Today.",
    ],
  },
  {
    date: "2026-09-29",
    title: "Collect feathers",
    intro:
      "The Progress tab is now called Badges, and it has something new to " +
      "collect at the top.",
    items: [
      "Earn feathers for showing up, streaks, personal records, early starts, late sessions and more. There are 18 to find.",
      "Your past workouts count, so open Badges and see which ones you've already got.",
      "The card shows a few of yours and a suggested feather to aim for, a new one each day. Tap See all to see every feather, then tap one to find out how to earn it.",
      "Earn a feather during a workout and you'll get a little party when you finish. (It replaces the old trophy at 7, 30, 50 and 100 workouts, which are feathers now.)",
      "Your stats, records and charts are all still there, just underneath.",
    ],
  },
  {
    date: "2026-09-29",
    title: "One exercise at a time",
    intro:
      "Training mode has been rebuilt so it's easier to use with one hand " +
      "and a sweaty thumb.",
    items: [
      "When you start a workout you now see one exercise at a time, with the next set's reps and weight in big boxes.",
      "Tap a star when a set is done: it turns gold and +10 XP floats up. Tap it again if you tapped by mistake.",
      "The owl is your coach now: it tells you what you lifted last time and reminds you of the note you left yourself.",
      "Next › lights up when an exercise is done, and the row of emoji at the top lets you jump to any exercise if a machine is busy.",
      "Rather see the whole day on one page? Tap List at the top of your workout. Your phone remembers which you like.",
      "The rest timer now floats at the bottom of the screen, so it's always in reach. Start it with 60s, 90s or 120s, add +15s if you need a bit longer, or Skip.",
      "Need to add a set or fix a number? Edit sets has the full table. Editing an old workout still shows everything on one page.",
    ],
  },
  {
    date: "2026-09-29",
    title: "Your week as a path",
    intro:
      "See your whole week at a glance, right under today's plan.",
    items: [
      "A new This week card on Today shows each day in your schedule as a stepping stone, joined by a dotted trail.",
      "Days you've trained turn yellow with a ✓. Tap one to see that workout.",
      "Today is the big coral stone. Tap it to start your workout.",
      "Missed a day? Its stone just goes paler, no guilt trip. And if you train on a day that wasn't planned, it still gets a stone.",
      "The count in the corner shows how you're doing, like \"2 of 4 done\".",
      "Fixed: a workout you left open weeks ago no longer pops back up the next time that day comes round. If you'd ticked any sets it's saved to your history; if not, it's tidied away.",
    ],
  },
  {
    date: "2026-09-29",
    title: "Level up your owl",
    intro:
      "Every workout you've ever logged now counts towards your owl's level. " +
      "Open Today and see where you're starting from.",
    items: [
      "A level bar sits in the card at the top of Today, showing your level, your owl's name and how close you are to the next one.",
      "You earn XP for training: 10 for every set you tick, 50 for every finished workout and 25 for every personal record.",
      "Finish a workout and you'll see how much XP it earned. Go up a level and the owl throws a little party.",
      "Your past workouts count, so you might already be a few levels up.",
      "There are 30 levels, from Egg to Athena's Owl. The early ones come quickly; the top one takes years.",
    ],
  },
  {
    date: "2026-09-29",
    title: "A fresh new look",
    intro:
      "Athena's owl has redecorated. Same app, same data, just a brighter " +
      "place to train.",
    items: [
      "New colours: a lavender sky at the top of every screen, and a night-purple dark mode.",
      "Chunkier buttons that press down when you tap them, and a rounder font for headings and numbers.",
      "Today puts first things first: a card with today's plan and a big Start workout button, right at the top.",
      "Last week's recap is now one tidy line. Tap it when you want the full story.",
      "Cleaner, modern icons on the tabs and buttons. Your exercises keep the emoji you chose.",
      "Settings has moved: tap the round avatar with your initial in the top corner. That leaves four roomier tabs at the bottom.",
      "Exercise names no longer get cut short on your plan. Edit and Delete are now small pencil and bin buttons, so the name gets the room.",
      "Fixed: on a rest day the Start workout button no longer shows up with nothing to start.",
      "The privacy note (Settings → Privacy & data) now explains exactly what friends can see: friends see that you trained, close friends can open your workouts, and nobody ever sees your notes or your email.",
    ],
  },
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
      "Fixed: this page now has a ← Back button. If you've added the app to your home screen, there was no way off it before.",
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
