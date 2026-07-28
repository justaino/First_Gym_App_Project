/*
  guide.js — the in-app guide (Phase 13).

  Opened from Settings → "How to use", and from the "New here?" button on the
  empty Today and Schedule screens. It fills a full-screen sheet, the same
  pattern as workout mode.

  The guide has two halves:
    1. THREE STEPS  — what a brand-new person must do, in order.
    2. THE SECTIONS — one collapsible card per tab, for looking things up
                      later, plus an "easy to miss" section at the end.

  ── HOW TO KEEP THIS UP TO DATE ──────────────────────────────────────────
  The words all live in the two plain lists below (GUIDE_STEPS and
  GUIDE_SECTIONS) — you don't need to touch any of the drawing code. When a
  new feature ships, add one line to the right section's `items` array.
  Write it the way you'd explain it to a friend: what they see and what to
  tap, never how it works inside.
  ─────────────────────────────────────────────────────────────────────────
*/

/* =========================================================================
   1. THE CONTENT — edit these two lists, nothing else
   ========================================================================= */

// The first three things to do, in order. Keep it to three.
const GUIDE_STEPS = [
  {
    title: "Make a profile",
    text:
      "Settings → type your name → Create. A profile keeps one person's plan " +
      "and history together, so you can share the app with someone else and " +
      "not mix up your workouts.",
  },
  {
    title: "Build your week",
    text:
      "Schedule → ＋ Add exercise. Start typing a name and pick one of the " +
      "suggestions: it fills in the emoji, sets and reps for you. Choose " +
      "which day it belongs to, then add a few more.",
  },
  {
    title: "Train",
    text:
      "Today → ▶ Start workout. Tick each set as you finish it and type in " +
      "the weight you used. Tap Finish at the end and it's saved to your " +
      "history. That's the whole loop.",
  },
];

// One card per tab, plus the "easy to miss" list. Each item is one short
// sentence — a thing the person can see or do.
const GUIDE_SECTIONS = [
  {
    icon: "☀️",
    title: "Today",
    summary: "Start a workout, see your week",
    items: [
      "Shows the exercises planned for today's day of the week.",
      "▶ Start workout opens training mode. If you close it half way, the button says Resume, and nothing is lost.",
      "Recent workouts lists your last few sessions. Edit one to fix a mistake, including its date.",
      "Once a week you'll get a Your week in review card summing up last week. Dismiss it and it won't come back until next week.",
      "Gym buddies shows which friends have trained today. Tap the heading to fold it away.",
    ],
  },
  {
    icon: "📅",
    title: "Schedule",
    summary: "Your weekly plan",
    items: [
      "＋ Add exercise: name, emoji, sets, reps and which day it's on.",
      "Typing a name suggests common exercises. Tap one to fill in the rest, or ignore them and type your own.",
      "You can set different reps and a different weight for each set, if you want to work up in weight.",
      "Drag the ⠿ handle on the left of a card to reorder exercises within a day. Workout mode follows the same order.",
      "Edit or Delete on any card. Deleting an exercise also removes it from your saved workouts.",
    ],
  },
  {
    icon: "🏋️",
    title: "Workout mode",
    summary: "What happens while you train",
    items: [
      "Tick a set only when you've actually done it. Everything else in the app counts ticked sets and ignores the rest.",
      "Under each exercise you'll see what you lifted last time, so you know what to beat.",
      "The rest timer has 60s / 90s / 120s buttons and beeps when it's up. It keeps counting correctly even if you lock your phone or switch apps.",
      "📝 Add note under an exercise is somewhere to leave yourself a message, like \"next week try 2.5kg more\". It saves as you type and stays with that day's workout.",
      "The last note you left for an exercise shows under it while you train, so the message reaches you when it's useful.",
      "Notes are yours alone. Even close friends who can see your workouts never see them.",
      "Progress saves as you go. Close is safe; Discard throws the session away.",
      "Beat your heaviest weight on an exercise and you'll get confetti and a 🏅 card when you finish.",
    ],
  },
  {
    icon: "📈",
    title: "Progress",
    summary: "Streaks, records and charts",
    items: [
      "The ring at the top shows workouts done this week against your weekly goal (set it in Settings).",
      "Week streak counts how many weeks in a row you've trained at least once.",
      "The 12-week grid is one square per day, and darker means more sets. Tap a square to see that day.",
      "Personal records lists your heaviest weight for every exercise, and when you did it.",
      "Last week is a summary of the week just gone: workouts, sets, total weight moved and any records.",
      "Further down, each exercise gets its own chart. Tap a bar to see that whole workout.",
    ],
  },
  {
    icon: "🤝",
    title: "Friends",
    summary: "Buddies, nudges and sharing",
    items: [
      "Add someone by typing their username (like @mintyowl42) or the email they signed up with, then Send. They accept from their own Friends tab.",
      "A normal friend sees only whether you trained today and how many workouts you've done this week.",
      "Ask to be close friends to see each other's actual workouts: sets, reps, weights and exercise names. They have to accept, and then it works both ways.",
      "You can ask when you first add someone (tick the box on the form), or later from their card.",
      "Either of you can end it, and you both stop seeing each other's workouts. You stay ordinary friends.",
      "Share mine only is the quieter option: they see your workouts, you don't see theirs, and nobody has to accept anything.",
      "👋 Nudge gives a friend a friendly prod. One per friend per day. They'll see it next time they open the app. It isn't a phone notification.",
      "A red dot on the tab means a request or a nudge is waiting for you.",
      "Settings → Friends → Share my workouts with friends turns everything off at once, close friends included.",
      "Your own username is in Settings → Friends. You're given one to start with. Change it to whatever you like, as long as nobody else has it.",
    ],
  },
  {
    icon: "⚙️",
    title: "Settings & your data",
    summary: "Profiles, units, backup",
    items: [
      "Your workouts are saved to your account, so logging in on another device brings everything with you.",
      "Weekly goal sets the target for the ring on Progress.",
      "Weight unit switches every label between kg and lb. It only changes the label, so your saved numbers are never converted.",
      "The 🌙 button in the top corner switches between light and dark. It's remembered on this device only.",
      "Backup → Export downloads a copy of your data as a file. Import merges one back in. Worth doing before any big clear-out.",
      "Install app puts Athena's Arena on your home screen, so it opens full-screen like a normal app.",
      "Delete my data removes everything permanently: workouts, plan and friends. It can't be undone.",
    ],
  },
  {
    icon: "✨",
    title: "Easy to miss",
    summary: "Small things worth knowing",
    items: [
      "You can change a workout's date after the fact. Edit it from Recent workouts. The day name updates to match.",
      "Exercises with no weight are fine. Leave the weight box empty and the app just records your reps.",
      "The app opens and works without a connection, but anything to do with friends, and changes to your plan, need you online.",
      "If the app seems stuck after a quiet spell, it's usually the database waking up, so give it a few seconds.",
      "Emoji are only labels, so pick whichever one helps you spot an exercise in the list.",
      "There may be one or two surprises hidden in the app. Poke around. 🦉",
    ],
  },
];

/* =========================================================================
   2. DRAWING IT — you shouldn't need to change anything below
   ========================================================================= */

// Build the whole guide into the sheet. Called each time it opens, so the
// sections always start closed and tidy.
function renderGuide() {
  const container = document.getElementById("guideContent");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  // --- The welcome + three steps ---
  const hero = document.createElement("div");
  hero.className = "guide-hero";

  const heroTitle = document.createElement("h3");
  heroTitle.className = "guide-hero__title";
  heroTitle.textContent = "New here? 👋";

  const heroText = document.createElement("p");
  heroText.className = "guide-hero__text";
  heroText.textContent =
    "Three steps and you're training. Everything else can wait.";

  hero.appendChild(heroTitle);
  hero.appendChild(heroText);
  container.appendChild(hero);

  const stepsCard = document.createElement("div");
  stepsCard.className = "card";
  const stepsList = document.createElement("ol");
  stepsList.className = "guide-steps";

  GUIDE_STEPS.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = "guide-step";

    const number = document.createElement("span");
    number.className = "guide-step__number";
    number.textContent = index + 1;

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "guide-step__title";
    title.textContent = step.title;
    const text = document.createElement("div");
    text.className = "guide-step__text";
    text.textContent = step.text;
    body.appendChild(title);
    body.appendChild(text);

    item.appendChild(number);
    item.appendChild(body);
    stepsList.appendChild(item);
  });

  stepsCard.appendChild(stepsList);
  container.appendChild(stepsCard);

  // --- The reference half ---
  const heading = document.createElement("h3");
  heading.className = "section-heading";
  heading.textContent = "Then explore";
  container.appendChild(heading);

  GUIDE_SECTIONS.forEach((section) => {
    container.appendChild(buildGuideSection(section));
  });
}

// One collapsible card. Closed to start with, so the guide opens as a short
// menu instead of a wall of text.
function buildGuideSection(section) {
  const card = document.createElement("div");
  card.className = "card guide-section";

  // The whole header row is the button that opens and closes it.
  const header = document.createElement("button");
  header.className = "guide-section__header";
  header.type = "button";
  header.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "exercise__icon";
  icon.textContent = section.icon;

  const text = document.createElement("span");
  text.className = "exercise__info";
  const title = document.createElement("span");
  title.className = "exercise__name";
  title.textContent = section.title;
  const summary = document.createElement("span");
  summary.className = "exercise__detail";
  summary.textContent = section.summary;
  text.appendChild(title);
  text.appendChild(summary);

  const caret = document.createElement("span");
  caret.className = "guide-section__caret";
  caret.textContent = "▾";

  header.appendChild(icon);
  header.appendChild(text);
  header.appendChild(caret);

  // The bullet list, hidden until the header is tapped.
  const body = document.createElement("ul");
  body.className = "guide-list";
  body.hidden = true;
  section.items.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    body.appendChild(item);
  });

  header.addEventListener("click", () => {
    const isOpen = !body.hidden;
    body.hidden = isOpen;
    header.setAttribute("aria-expanded", isOpen ? "false" : "true");
    caret.textContent = isOpen ? "▾" : "▴";
  });

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

/* =========================================================================
   3. OPENING AND CLOSING THE SHEET
   ========================================================================= */

function openGuide() {
  renderGuide();
  const sheet = document.getElementById("guideSheet");
  if (sheet) {
    sheet.hidden = false;
    sheet.scrollTop = 0;
  }
}

function closeGuide() {
  const sheet = document.getElementById("guideSheet");
  if (sheet) {
    sheet.hidden = true;
  }
}

// Wire up the buttons once the page exists.
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openGuideBtn");
  if (openBtn) {
    openBtn.addEventListener("click", openGuide);
  }
  const closeBtn = document.getElementById("closeGuideBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeGuide);
  }
});
