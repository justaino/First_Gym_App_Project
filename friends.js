/*
  friends.js — the Friends tab (Phase 12b).

  What this file does, in plain English:
  - Puts your own row in the `user_directory` table when you log in, so other
    people can find you by email.
  - Lets you send a friend request by email, and accept or decline the ones
    you receive.
  - Draws your list of gym buddies: whether they trained today, how many
    workouts they've done this week, a 👋 nudge button, a "close friend"
    toggle, and a remove option.
  - Opens a close friend's recent workouts in the existing workout pop-up.

  It lives in its own file because it's a self-contained feature — app.js is
  already long. It uses helpers from app.js (showToast, isOffline, formatDate,
  showSessionDetail...), which is fine: both files are loaded before anything
  here actually runs.

  IMPORTANT — the two levels of friend (this is enforced by the DATABASE, see
  Documentation/SQL-Phase12-Friends.sql):
    * friend        — can see THAT you trained and can nudge you.
    * close friend  — can also open your workouts (sets, reps, weights, names).
  Marking someone as a close friend controls what THEY see of YOUR data. It's
  one-directional, so it's normal for one of you to be "close" and not the other.
*/

/* =========================================================================
   1. STATE — what we currently know about your friends
   ========================================================================= */

// Everything the Friends tab needs to draw itself. Refilled by loadFriends().
const friendsState = {
  myId: null, // your logged-in user id
  loading: false, // a load is in flight (stops us asking twice at once)
  loaded: false, // we've successfully loaded at least once
  message: null, // a friendly problem message to show instead of the list
  requests: [], // friend requests waiting for YOUR answer
  buddies: [], // accepted friends
  // Phase 12c: nudges people have sent YOU in the last couple of days, and the
  // subset you haven't been shown yet (those drive the toast and the tab dot).
  nudgesToMe: [],
  unseenNudges: [],
};

// Your own row from the `user_directory` table (holds your display name).
let myDirectoryRow = null;

// Nudges we've already popped a toast for in this browser session, so opening
// the app twice in a row doesn't repeat the same message.
const toastedNudgeIds = new Set();

/* =========================================================================
   2. SMALL HELPERS
   ========================================================================= */

// Who's signed in? Returns the Supabase user object, or null if we can't tell.
async function getSignedInUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data || !data.user) {
    return null;
  }
  return data.user;
}

// The name we suggest for you the first time: your active profile's name, or
// the bit of your email before the "@".
function defaultDisplayName(user) {
  const profile = getActiveProfile();
  if (profile && profile.name) {
    return profile.name;
  }
  const email = user && user.email ? user.email : "";
  return email.split("@")[0] || "Friend";
}

/* ---- Usernames (Phase 14b) ----
   Your username is the handle friends can use to find you, like @mintyowl42.
   It's separate from your display name: the display name is the friendly one
   people see, the username is the unique one they type. */

// The same rule the database enforces: lower case, 3–20 characters, letters,
// numbers and underscores.
function isValidUsernameFormat(name) {
  return /^[a-z0-9_]{3,20}$/.test(name);
}

// Handles nobody should be able to take from the sign-up form. The database
// deliberately does NOT enforce this list (that's what lets the owner claim
// one by hand in the SQL editor), so the app checks it here and in Settings.
const RESERVED_USERNAMES = [
  "admin",
  "athena",
  "athenasarena",
  "support",
  "help",
  "root",
  "system",
  "owner",
  "justaino",
  "justaino97",
  "justaino81",
];

function isReservedUsername(name) {
  return RESERVED_USERNAMES.includes(name);
}

// Build a readable random handle like "mintyowl42". Mirrors the generator in
// Documentation/SQL-Phase14-Usernames.sql, so backfilled names and ones made
// here look the same.
const USERNAME_ADJECTIVES = [
  "calm", "brave", "minty", "sunny", "swift", "bold", "jolly", "keen",
  "lucky", "mighty", "nimble", "plucky", "quiet", "spry", "tidy", "witty",
  "zesty", "breezy",
];
const USERNAME_NOUNS = [
  "owl", "fox", "bear", "hawk", "lynx", "otter", "wolf", "crane", "ibis",
  "koala", "moose", "panda", "raven", "seal", "tiger", "yak", "heron",
  "badger",
];

function makeRandomUsername() {
  const adjective =
    USERNAME_ADJECTIVES[Math.floor(Math.random() * USERNAME_ADJECTIVES.length)];
  const noun =
    USERNAME_NOUNS[Math.floor(Math.random() * USERNAME_NOUNS.length)];
  const number = 10 + Math.floor(Math.random() * 90); // always two digits
  return adjective + noun + number;
}

// Make sure we know your user id before writing anything. Normally loadFriends()
// has already set it; this is a safety net for the case where a first load
// failed (e.g. a dropped connection) and you press a button anyway.
async function ensureMyId() {
  if (friendsState.myId) {
    return true;
  }
  const user = await getSignedInUser();
  if (!user) {
    window.alert("You're not signed in. Log in again to use Friends.");
    return false;
  }
  friendsState.myId = user.id;
  return true;
}

// A "YYYY-MM-DD" key in UTC. The database limits nudges to one per friend per
// UTC day, so we work out "today" the same way to keep the button in step.
function utcDayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

// Turn a cloud error into a friendly sentence. Network problems get the
// "you're offline" wording; anything else shows the real message.
function friendlyCloudMessage(error) {
  if (isOffline() || isNetworkError(error)) {
    return "You're offline 📡. Reconnect to see your friends.";
  }
  return "Couldn't load your friends: " + error.message;
}

/* =========================================================================
   3. YOUR DIRECTORY ROW (how friends find you)
   ========================================================================= */

// Make sure you have a row in `user_directory`. Called once at login.
// - No row yet  → create one with a sensible default display name.
// - Row exists  → leave your display name alone (you may have edited it) and
//                 just keep the email in step if it changed.
async function ensureMyDirectoryRow() {
  if (isOffline()) {
    return; // nothing to do until we're back online
  }

  const user = await getSignedInUser();
  if (!user) {
    return;
  }

  const email = (user.email || "").toLowerCase();

  const { data: existing, error } = await supabaseClient
    .from("user_directory")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Couldn't read your directory row:", error.message);
    return;
  }

  if (!existing) {
    await insertMyDirectoryRow(user, email);
  } else {
    myDirectoryRow = existing;

    // Phase 14b backstop: accounts made before usernames existed (and any row
    // created between then and now) have no handle. Give them one rather than
    // leaving them un-findable.
    if (!existing.username) {
      await claimGeneratedUsername(user.id);
    }

    // Keep the email current if you changed it on your account.
    if (existing.email !== email && email) {
      await supabaseClient
        .from("user_directory")
        .update({ email: email, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      myDirectoryRow.email = email;
    }
  }

  renderFriendNameInput();
}

// Create your directory row. Everyone gets a generated handle to start with —
// you choose a proper one in Settings, where we can actually check it's free.
async function insertMyDirectoryRow(user, email) {
  for (let attempt = 0; attempt < 5; attempt = attempt + 1) {
    const candidate = makeRandomUsername();

    const newRow = {
      user_id: user.id,
      email: email,
      display_name: defaultDisplayName(user),
      username: candidate,
    };

    const { error } = await supabaseClient
      .from("user_directory")
      .insert(newRow);

    if (!error) {
      myDirectoryRow = newRow;
      return;
    }

    // 23505 is the database's "that already exists". If it's the username
    // that clashed, try a different one; anything else means retrying won't
    // help (e.g. the row already exists).
    const clashedOnUsername =
      error.code === "23505" && String(error.message).includes("username");
    if (!clashedOnUsername) {
      console.error("Couldn't add you to the directory:", error.message);
      return;
    }
    // That handle was taken — loop round and generate another.
  }

  console.error("Couldn't find a free username after several tries.");
}

// Give an existing row a generated handle (for accounts that predate usernames).
async function claimGeneratedUsername(userId) {
  for (let attempt = 0; attempt < 5; attempt = attempt + 1) {
    const candidate = makeRandomUsername();
    const { error } = await supabaseClient
      .from("user_directory")
      .update({ username: candidate, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (!error) {
      myDirectoryRow.username = candidate;
      return;
    }
    if (error.code !== "23505") {
      console.error("Couldn't set your username:", error.message);
      return;
    }
    // Taken — loop round and try another.
  }
}

// Put your saved display name into the Settings box.
function renderFriendNameInput() {
  const input = document.getElementById("friendNameInput");
  if (!input) {
    return;
  }
  input.value = myDirectoryRow ? myDirectoryRow.display_name || "" : "";

  renderUsernameInput();
  renderShareToggle();
}

// Put your saved sharing setting into the Settings switch (Phase 12d).
function renderShareToggle() {
  const toggle = document.getElementById("shareWorkoutsInput");
  if (!toggle) {
    return;
  }
  // Until we've read your row, assume the default (sharing on).
  toggle.checked = myDirectoryRow ? myDirectoryRow.share_workouts !== false : true;
}

/* ---- Changing your username (Phase 14c) ----
   Unlike the sign-up form, here you ARE logged in — so we can ask the database
   whether a handle is genuinely free and show a real ✓ / ✗ as you type. */

// Put your current handle in the Settings box and enable it.
function renderUsernameInput() {
  const input = document.getElementById("usernameInput");
  if (!input) {
    return;
  }
  if (myDirectoryRow && myDirectoryRow.username) {
    input.value = myDirectoryRow.username;
    input.disabled = false;
    input.placeholder = "yourhandle";
    showUsernameHint("Friends can find you with @" + myDirectoryRow.username, "");
  } else {
    // Still loading (or offline) — leave it disabled rather than let someone
    // type into a box we can't save yet.
    input.value = "";
    input.disabled = true;
    input.placeholder = "Loading…";
  }
}

// The little line under the box. `tone` is "ok", "error", or "" for plain grey.
function showUsernameHint(text, tone) {
  const hint = document.getElementById("usernameHint");
  if (!hint) {
    return;
  }
  hint.textContent = text;
  hint.classList.toggle("is-ok", tone === "ok");
  hint.classList.toggle("is-error", tone === "error");
}

// Check the shape of a handle without asking the database. Returns a problem
// message, or "" when it looks fine.
function usernameFormatProblem(name) {
  if (name.length < 3 || name.length > 20) {
    return "Usernames are 3–20 characters long.";
  }
  if (!isValidUsernameFormat(name)) {
    return "Letters, numbers and underscores only, with no spaces or capitals.";
  }
  if (isReservedUsername(name)) {
    return "That one's reserved, sorry. Try another.";
  }
  return "";
}

// Ask the database whether a handle is free. Returns true/false, or null if we
// couldn't reach it.
async function checkUsernameAvailable(name) {
  const { data, error } = await supabaseClient.rpc("is_username_available", {
    candidate: name,
  });
  if (error) {
    console.error("Couldn't check that username:", error.message);
    return null;
  }
  return data === true;
}

// While you type: check the shape straight away, then (a short pause later, so
// we're not firing a request per keystroke) ask whether it's free.
let usernameCheckTimer = null;
function handleUsernameTyping(rawValue) {
  const typed = rawValue.trim().toLowerCase();

  if (usernameCheckTimer) {
    clearTimeout(usernameCheckTimer);
  }

  if (myDirectoryRow && typed === myDirectoryRow.username) {
    showUsernameHint("That's your current username.", "");
    return;
  }
  if (!typed) {
    showUsernameHint("3–20 characters: letters, numbers and underscores.", "");
    return;
  }

  const problem = usernameFormatProblem(typed);
  if (problem) {
    showUsernameHint(problem, "error");
    return;
  }

  showUsernameHint("Checking…", "");
  usernameCheckTimer = setTimeout(async () => {
    const available = await checkUsernameAvailable(typed);
    if (available === null) {
      showUsernameHint("Couldn't check that right now. Try again.", "error");
    } else if (available) {
      showUsernameHint("@" + typed + " is free ✓", "ok");
    } else {
      showUsernameHint("@" + typed + " is already taken.", "error");
    }
  }, 400);
}

// Save the new handle. Re-checks everything server-side, because the box could
// have been sitting open for a while.
async function saveUsername(rawValue) {
  const wanted = rawValue.trim().toLowerCase();

  if (!myDirectoryRow) {
    return;
  }
  if (wanted === myDirectoryRow.username) {
    showUsernameHint("That's already your username.", "");
    return;
  }

  const problem = usernameFormatProblem(wanted);
  if (problem) {
    showUsernameHint(problem, "error");
    return;
  }
  if (blockedByOffline()) {
    return;
  }

  const available = await checkUsernameAvailable(wanted);
  if (available === null) {
    showUsernameHint("Couldn't check that right now. Try again.", "error");
    return;
  }
  if (!available) {
    showUsernameHint("@" + wanted + " is already taken.", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("user_directory")
    .update({ username: wanted, updated_at: new Date().toISOString() })
    .eq("user_id", myDirectoryRow.user_id);

  if (error) {
    // Someone could have claimed it in the seconds since we checked.
    if (error.code === "23505") {
      showUsernameHint("@" + wanted + " was just taken by someone else.", "error");
    } else {
      reportCloudWriteError("save your username", error);
    }
    return;
  }

  myDirectoryRow.username = wanted;
  showUsernameHint("Friends can find you with @" + wanted, "ok");
  showToast("You're now @" + wanted + " 🎉");
}

// Turn sharing on or off. This is the master switch: with it off, the database
// stops friends reading your workouts AND stops your went-today tick appearing,
// no matter who you've marked as a close friend.
async function saveShareWorkouts(shouldShare) {
  if (blockedByOffline()) {
    renderShareToggle(); // put the switch back where it was
    return;
  }
  if (!myDirectoryRow) {
    await ensureMyDirectoryRow();
    if (!myDirectoryRow) {
      renderShareToggle();
      return;
    }
  }

  const { error } = await supabaseClient
    .from("user_directory")
    .update({ share_workouts: shouldShare, updated_at: new Date().toISOString() })
    .eq("user_id", myDirectoryRow.user_id);

  if (error) {
    reportCloudWriteError("change your sharing setting", error);
    renderShareToggle();
    return;
  }

  myDirectoryRow.share_workouts = shouldShare;
  showToast(
    shouldShare
      ? "Friends can see your workouts again 👀"
      : "Your workouts are private now 🔒"
  );
}

// Save the name your friends see (Settings → "Your name to friends").
async function saveMyDisplayName(name) {
  const clean = name.trim();
  if (!clean) {
    window.alert("Please enter a name your friends will recognise.");
    renderFriendNameInput(); // put the old one back
    return;
  }
  if (blockedByOffline()) {
    renderFriendNameInput();
    return;
  }
  if (!myDirectoryRow) {
    await ensureMyDirectoryRow();
    if (!myDirectoryRow) {
      return;
    }
  }

  const { error } = await supabaseClient
    .from("user_directory")
    .update({ display_name: clean, updated_at: new Date().toISOString() })
    .eq("user_id", myDirectoryRow.user_id);

  if (error) {
    reportCloudWriteError("save your display name", error);
    renderFriendNameInput();
    return;
  }

  myDirectoryRow.display_name = clean;
  showToast("Your friends will see you as " + clean + " 🤝");
}

/* =========================================================================
   4. LOADING THE FRIENDS DATA
   ========================================================================= */

// Fetch everything the tab needs, in one go:
//   friendships    — who you're connected to (RLS only ever returns yours)
//   friend_directory() — their display names + close-friend flags, no emails
//   friend_activity()  — their went-today / workouts-this-week counts
//   nudges         — the ones YOU sent, so we can grey out today's buttons
async function loadFriends() {
  if (friendsState.loading) {
    return; // already fetching — don't stack up requests
  }
  friendsState.loading = true;
  friendsState.message = null;
  renderFriends();

  const user = await getSignedInUser();
  if (!user) {
    friendsState.loading = false;
    friendsState.message = "Log in to see your friends.";
    renderFriends();
    return;
  }
  friendsState.myId = user.id;

  // Only look back a couple of days for nudges TO you — an old one isn't worth
  // announcing. (Opening the Friends tab clears every unseen one regardless.)
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [friendships, directory, activity, nudges, inbox] = await Promise.all([
    supabaseClient.from("friendships").select("*"),
    supabaseClient.rpc("friend_directory"),
    supabaseClient.rpc("friend_activity"),
    supabaseClient
      .from("nudges")
      .select("to_user, created_at")
      .eq("from_user", user.id),
    supabaseClient
      .from("nudges")
      .select("id, from_user, seen, created_at")
      .eq("to_user", user.id)
      .gte("created_at", twoDaysAgo),
  ]);

  const failure =
    friendships.error ||
    directory.error ||
    activity.error ||
    nudges.error ||
    inbox.error;
  if (failure) {
    friendsState.loading = false;
    friendsState.message = friendlyCloudMessage(failure);
    renderFriends();
    return;
  }

  // --- Turn the four result sets into one easy list ---

  // name + flags, keyed by the friend's user id
  const nameById = {};
  (directory.data || []).forEach((row) => {
    nameById[row.friend_id] = row;
  });

  // went-today + weekly count, keyed the same way
  const activityById = {};
  (activity.data || []).forEach((row) => {
    activityById[row.friend_id] = row;
  });

  // who you've already nudged TODAY (the database allows one per day)
  const today = utcDayKey(new Date());
  const nudgedToday = {};
  (nudges.data || []).forEach((row) => {
    if (utcDayKey(row.created_at) === today) {
      nudgedToday[row.to_user] = true;
    }
  });

  // ...and who has nudged YOU today (shown on their card).
  const nudgedMeToday = {};
  (inbox.data || []).forEach((row) => {
    if (utcDayKey(row.created_at) === today) {
      nudgedMeToday[row.from_user] = true;
    }
  });

  const requests = [];
  const buddies = [];

  (friendships.data || []).forEach((row) => {
    // A friendship row has two people in it — the "other" one is the friend.
    const theirId =
      row.requester_id === user.id ? row.addressee_id : row.requester_id;
    const info = nameById[theirId] || {};

    const buddy = {
      friendshipId: row.id,
      id: theirId,
      name: info.friend_name || "Someone",
      username: info.friend_username || null, // Phase 14d: their @handle
      // Their master sharing switch. Missing info = assume not sharing.
      shares: info.shares_workouts === true,
      iTrustThem: info.i_trust_them === true, // they can see MY details
      theyTrustMe: info.they_trust_me === true, // I can see THEIR details
      // Phase 15: a pending "shall we be close friends?" in either direction.
      askedByMe: info.close_asked_by_me === true,
      askedByThem: info.close_asked_by_them === true,
      status: row.status,
      isIncoming: row.addressee_id === user.id,
      activity: activityById[theirId] || null,
      nudgedToday: nudgedToday[theirId] === true,
      nudgedMeToday: nudgedMeToday[theirId] === true,
    };

    if (row.status === "pending") {
      // Only requests sent TO you need an answer; ones you sent just wait.
      if (buddy.isIncoming) {
        requests.push(buddy);
      } else {
        buddy.waiting = true;
        buddies.push(buddy);
      }
    } else {
      buddies.push(buddy);
    }
  });

  // Nicest order: people waiting on you first, then alphabetical.
  buddies.sort((a, b) => a.name.localeCompare(b.name));

  friendsState.requests = requests;
  friendsState.buddies = buddies;
  friendsState.nudgesToMe = inbox.data || [];
  friendsState.unseenNudges = friendsState.nudgesToMe.filter(
    (row) => row.seen === false
  );
  friendsState.loading = false;
  friendsState.loaded = true;

  renderFriends();
  renderTodayBuddies(); // the "Gym buddies" card on Today
  updateFriendsTabDot(); // the little dot on the tab bar
}

/* =========================================================================
   4b. NUDGES YOU'VE RECEIVED (Phase 12c)
   ========================================================================= */

// Show a friendly toast for any nudge you haven't been told about yet.
// Called once when the app opens. Several at once become a single message
// rather than a pile of toasts.
function showNudgeToasts() {
  const fresh = friendsState.unseenNudges.filter(
    (row) => !toastedNudgeIds.has(row.id)
  );
  if (fresh.length === 0) {
    return;
  }
  fresh.forEach((row) => toastedNudgeIds.add(row.id));

  // Turn the sender ids into names using the buddy list we just loaded.
  const nameById = {};
  friendsState.buddies.forEach((buddy) => {
    nameById[buddy.id] = buddy.name;
  });
  const names = [];
  fresh.forEach((row) => {
    const name = nameById[row.from_user] || "Someone";
    if (!names.includes(name)) {
      names.push(name);
    }
  });

  let who;
  if (names.length === 1) {
    who = names[0];
  } else if (names.length === 2) {
    who = names[0] + " and " + names[1];
  } else {
    who = names[0] + " and " + (names.length - 1) + " others";
  }

  showToast("👋 " + who + " nudged you. Go get that workout!");
}

// Mark every unseen nudge as read. Called when you open the Friends tab, which
// is where you can see who it was from — that also clears the tab dot.
async function markNudgesSeen() {
  if (friendsState.unseenNudges.length === 0 || isOffline()) {
    return;
  }
  const { error } = await supabaseClient
    .from("nudges")
    .update({ seen: true })
    .eq("to_user", friendsState.myId)
    .eq("seen", false);

  if (error) {
    console.error("Couldn't mark nudges as seen:", error.message);
    return;
  }
  friendsState.unseenNudges = [];
  updateFriendsTabDot();
}

// Show or hide the coral dot on the 🤝 tab: something is waiting for you if
// there's a friend request or a nudge you haven't looked at.
function updateFriendsTabDot() {
  const dot = document.getElementById("friendsTabDot");
  if (!dot) {
    return;
  }
  const waiting =
    friendsState.requests.length > 0 || friendsState.unseenNudges.length > 0;
  dot.hidden = !waiting;
}

/* =========================================================================
   4c. THE "GYM BUDDIES" CARD ON TODAY (Phase 12c, collapsible in 12e)
   ========================================================================= */

// Is the buddies list folded open? Remembered on this device only (like the
// theme), so it doesn't need a database column. Defaults to open.
const BUDDIES_OPEN_KEY = "gym:buddiesOpen";

function loadBuddiesOpen() {
  return localStorage.getItem(BUDDIES_OPEN_KEY) !== "0";
}

function saveBuddiesOpen(isOpen) {
  localStorage.setItem(BUDDIES_OPEN_KEY, isOpen ? "1" : "0");
}

// A compact who-trained-today list on the Today tab. Draws nothing at all when
// you have no friends yet, so the tab looks exactly as it did before.
function renderTodayBuddies() {
  const container = document.getElementById("todayBuddies");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  // Only accepted friends (not requests you're still waiting on).
  const buddies = friendsState.buddies.filter((buddy) => !buddy.waiting);
  if (buddies.length === 0) {
    return;
  }

  // How many trained today — worth knowing even when the list is folded away.
  const wentToday = buddies.filter(
    (buddy) => buddy.shares && buddy.activity && buddy.activity.trained_today
  ).length;
  const isOpen = loadBuddiesOpen();

  // The heading doubles as the open/close button (Phase 12e), so the card
  // doesn't take over the Today screen once you have a few friends.
  const heading = document.createElement("button");
  heading.className = "section-heading buddies-toggle";
  heading.type = "button";
  heading.setAttribute("aria-expanded", isOpen ? "true" : "false");

  const headingText = document.createElement("span");
  headingText.textContent = "Gym buddies (" + buddies.length + ")";

  const summary = document.createElement("span");
  summary.className = "buddies-toggle__summary";
  summary.textContent = wentToday + " went today";

  const caret = document.createElement("span");
  caret.className = "buddies-toggle__caret";
  caret.textContent = isOpen ? "▾" : "▸";

  heading.appendChild(headingText);
  heading.appendChild(summary);
  heading.appendChild(caret);
  heading.addEventListener("click", () => {
    saveBuddiesOpen(!isOpen);
    renderTodayBuddies(); // redraw in the new state
  });
  container.appendChild(heading);

  if (!isOpen) {
    return; // folded away — just the heading
  }

  const card = document.createElement("div");
  card.className = "card";

  buddies.forEach((buddy) => {
    const row = document.createElement("div");
    row.className = "buddy-row";

    const name = document.createElement("div");
    name.className = "buddy-row__name";
    name.textContent = buddy.name;

    const status = document.createElement("div");
    status.className = "buddy-row__status";
    if (!buddy.shares) {
      status.textContent = "🔒";
      status.title = "Not sharing right now";
    } else if (buddy.activity && buddy.activity.trained_today) {
      status.textContent = "Went today ✅";
      status.classList.add("is-done");
    } else {
      status.textContent = "Not yet 💤";
    }

    row.appendChild(name);
    row.appendChild(status);
    card.appendChild(row);
  });

  container.appendChild(card);
}

/* =========================================================================
   5. DRAWING THE TAB
   ========================================================================= */

function renderFriends() {
  const requestsBox = document.getElementById("friendRequests");
  const listBox = document.getElementById("friendsList");
  if (!requestsBox || !listBox) {
    return;
  }
  requestsBox.innerHTML = "";
  listBox.innerHTML = "";

  // A problem (offline, not logged in...) → say so instead of an empty list.
  if (friendsState.message) {
    listBox.appendChild(createEmptyState("📡", friendsState.message));
    return;
  }

  // First ever load → a spinner rather than a blank screen.
  if (friendsState.loading && !friendsState.loaded) {
    listBox.appendChild(createLoadingCard("Loading your friends…"));
    return;
  }

  // --- Requests waiting for your answer ---
  if (friendsState.requests.length > 0) {
    const heading = document.createElement("h2");
    heading.className = "section-heading";
    heading.textContent = "Friend requests";
    requestsBox.appendChild(heading);
    friendsState.requests.forEach((buddy) => {
      requestsBox.appendChild(buildRequestCard(buddy));
    });
  }

  // --- Your buddies ---
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = "Your gym buddies";
  listBox.appendChild(heading);

  if (friendsState.buddies.length === 0) {
    listBox.appendChild(
      createEmptyState("🤝", "No friends yet. Add someone by username or email above.")
    );
    return;
  }

  friendsState.buddies.forEach((buddy) => {
    listBox.appendChild(buildBuddyCard(buddy));
  });
}

// A card for someone who has asked to be your friend.
function buildRequestCard(buddy) {
  const card = document.createElement("div");
  card.className = "card friend";

  const top = document.createElement("div");
  top.className = "friend__top";

  const icon = document.createElement("div");
  icon.className = "exercise__icon";
  icon.textContent = "🙋";

  const info = document.createElement("div");
  info.className = "exercise__info";
  const name = document.createElement("div");
  name.className = "exercise__name";
  name.textContent = buddy.name;
  const detail = document.createElement("div");
  detail.className = "exercise__detail";
  const wants = buddy.askedByThem
    ? "wants to be close gym buddies ⭐"
    : "wants to be gym buddies";
  detail.textContent = buddy.username ? "@" + buddy.username + " " + wants : wants;
  info.appendChild(name);
  info.appendChild(detail);

  top.appendChild(icon);
  top.appendChild(info);
  card.appendChild(top);

  const actions = document.createElement("div");
  actions.className = "friend__actions";

  const accept = document.createElement("button");
  accept.className = "btn btn--primary btn--small";
  accept.type = "button";
  accept.textContent = "Accept";
  accept.addEventListener("click", () => acceptRequest(buddy));

  const decline = document.createElement("button");
  decline.className = "btn btn--ghost btn--small";
  decline.type = "button";
  decline.textContent = "Decline";
  decline.addEventListener("click", () => declineRequest(buddy));

  actions.appendChild(accept);
  actions.appendChild(decline);
  card.appendChild(actions);

  return card;
}

// A card for an accepted friend (or one you've asked and are waiting on).
function buildBuddyCard(buddy) {
  const card = document.createElement("div");
  card.className = "card friend";

  const top = document.createElement("div");
  top.className = "friend__top";

  const icon = document.createElement("div");
  icon.className = "exercise__icon";
  icon.textContent = "💪";

  const info = document.createElement("div");
  info.className = "exercise__info";

  const name = document.createElement("div");
  name.className = "exercise__name";
  name.textContent = buddy.name;
  info.appendChild(name);

  // Their handle, so two friends with the same first name are tellable apart.
  if (buddy.username) {
    const handle = document.createElement("div");
    handle.className = "exercise__detail friend__handle";
    handle.textContent = "@" + buddy.username;
    info.appendChild(handle);
  }

  const detail = document.createElement("div");
  detail.className = "exercise__detail";
  detail.textContent = describeBuddyActivity(buddy);
  info.appendChild(detail);

  // They gave you a 👋 today — worth calling out on their card.
  if (buddy.nudgedMeToday) {
    const nudgedLine = document.createElement("div");
    nudgedLine.className = "exercise__detail friend__nudged";
    nudgedLine.textContent = "👋 Nudged you today";
    info.appendChild(nudgedLine);
  }

  // Can I open their workouts? Only if they've made me a close friend AND
  // their master sharing switch is on.
  const canSeeDetail = buddy.theyTrustMe && buddy.shares && !buddy.waiting;

  const hint = document.createElement("div");
  hint.className = "exercise__detail friend__hint";
  if (canSeeDetail) {
    hint.textContent = "Tap to see their workouts →";
  } else if (!buddy.waiting && buddy.shares) {
    hint.textContent = buddy.name + " shares workout details with close friends";
  }
  if (hint.textContent) {
    info.appendChild(hint);
  }

  top.appendChild(icon);
  top.appendChild(info);

  if (canSeeDetail) {
    top.classList.add("friend__top--tappable");
    top.addEventListener("click", () => openFriendWorkouts(buddy));
  }
  card.appendChild(top);

  // Someone you've asked but who hasn't answered yet: no buttons except a
  // way to take the request back.
  if (buddy.waiting) {
    const actions = document.createElement("div");
    actions.className = "friend__actions";
    const cancel = document.createElement("button");
    cancel.className = "btn btn--ghost btn--small";
    cancel.type = "button";
    cancel.textContent = "Cancel request";
    cancel.addEventListener("click", () => removeFriend(buddy, true));
    actions.appendChild(cancel);
    card.appendChild(actions);
    return card;
  }

  const actions = document.createElement("div");
  actions.className = "friend__actions";

  // 👋 Nudge — one per friend per day (the database enforces it too).
  const nudge = document.createElement("button");
  nudge.className = "btn btn--ghost btn--small";
  nudge.type = "button";
  if (buddy.nudgedToday) {
    nudge.textContent = "Nudged! ✓";
    nudge.disabled = true;
  } else {
    nudge.textContent = "👋 Nudge";
    nudge.addEventListener("click", () => sendNudge(buddy));
  }
  actions.appendChild(nudge);

  // Close-friend controls (Phase 15) — what shows depends on where you two are
  // in the ask/accept dance.
  buildCloseControls(buddy).forEach((button) => actions.appendChild(button));

  const remove = document.createElement("button");
  remove.className = "btn btn--ghost btn--small";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeFriend(buddy, false));
  actions.appendChild(remove);

  card.appendChild(actions);
  return card;
}

// Build the close-friend button(s) for a buddy card. Being close friends is now
// a MUTUAL state: you ask, they accept, and you can both see each other's
// workouts. The old one-way share is still here as a quieter option.
function buildCloseControls(buddy) {
  const buttons = [];
  const mutual = buddy.iTrustThem && buddy.theyTrustMe;

  const makeButton = (label, title, onClick, isOn) => {
    const button = document.createElement("button");
    button.className = "btn btn--ghost btn--small friend__close";
    button.type = "button";
    button.textContent = label;
    button.title = title;
    if (isOn) {
      button.classList.add("is-on");
    }
    button.addEventListener("click", onClick);
    return button;
  };

  if (mutual) {
    // Done deal — tapping ends it for both of you.
    buttons.push(
      makeButton(
        "⭐ Close friends",
        "You can both see each other's workouts. Tap to end that.",
        () => endCloseFriendship(buddy),
        true
      )
    );
    return buttons;
  }

  if (buddy.askedByThem) {
    // They've asked. Accepting shares YOUR workouts too, so say so plainly.
    buttons.push(
      makeButton(
        "⭐ Accept close friend",
        buddy.name + " wants you both to see each other's workouts",
        () => acceptCloseRequest(buddy),
        true
      )
    );
    buttons.push(
      makeButton("Decline", "Stay ordinary friends", () =>
        declineCloseRequest(buddy)
      )
    );
    return buttons;
  }

  if (buddy.askedByMe) {
    buttons.push(
      makeButton(
        "Asked ⭐",
        "Waiting for " + buddy.name + " to accept. Tap to withdraw.",
        () => cancelCloseRequest(buddy)
      )
    );
    return buttons;
  }

  // Plain friends: offer the mutual ask, plus the quieter one-way share.
  buttons.push(
    makeButton(
      "☆ Ask to be close friends",
      "You'd both see each other's workouts",
      () => sendCloseRequest(buddy)
    )
  );
  buttons.push(
    buddy.iTrustThem
      ? makeButton(
          "Sharing mine ⭐",
          "They can see your workouts, one way. Tap to stop.",
          () => stopOneWayShare(buddy),
          true
        )
      : makeButton(
          "Share mine only",
          "Let " + buddy.name + " see your workouts without them sharing back",
          () => startOneWayShare(buddy)
        )
  );
  return buttons;
}

// The little grey line under a buddy's name.
function describeBuddyActivity(buddy) {
  if (buddy.waiting) {
    return "Request sent, waiting for them to accept";
  }
  if (!buddy.shares) {
    return "Not sharing their workouts right now 🔒";
  }
  if (!buddy.activity) {
    return "No activity yet";
  }
  const wentToday = buddy.activity.trained_today
    ? "Went today ✅"
    : "Not yet today 💤";
  const count = buddy.activity.workouts_this_week || 0;
  const weekly = count === 1 ? "1 workout this week" : count + " workouts this week";
  return wentToday + " · " + weekly;
}

/* =========================================================================
   6. ACTIONS — add, accept, decline, nudge, promote, remove
   ========================================================================= */

// Send a friend request by email. The lookup runs inside the database
// (find_user_by_email) so nobody can browse the list of email addresses.
async function addFriend(typedValue) {
  const typed = typedValue.trim();
  if (!typed) {
    window.alert("Type your friend's username or email first.");
    return;
  }
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  // Work out which one they typed. A leading @ is stripped first, so both
  // "mintyowl42" and "@mintyowl42" work; anything still containing an @ after
  // that must be an email address.
  const cleaned = typed.replace(/^@+/, "").toLowerCase();
  const looksLikeEmail = cleaned.includes("@");

  // Catch an obviously wrong handle before bothering the database.
  if (!looksLikeEmail && !isValidUsernameFormat(cleaned)) {
    window.alert(
      "That doesn't look like a username or an email 🤔\n\n" +
        "Usernames are 3–20 characters: letters, numbers and underscores."
    );
    return;
  }

  const { data, error } = looksLikeEmail
    ? await supabaseClient.rpc("find_user_by_email", { lookup_email: cleaned })
    : await supabaseClient.rpc("find_user_by_username", {
        lookup_username: cleaned,
      });

  if (error) {
    reportCloudWriteError(
      looksLikeEmail ? "look up that email" : "look up that username",
      error
    );
    return;
  }

  const match = data && data.length > 0 ? data[0] : null;
  if (!match) {
    window.alert(
      looksLikeEmail
        ? "No account with that email 🤔\n\n" +
            "Double-check the spelling. They need to have signed up to " +
            "Athena's Arena with this exact address."
        : "Nobody has the username @" + cleaned + " 🤔\n\n" +
            "Check the spelling with them, or try their email instead."
    );
    return;
  }

  if (match.friend_id === friendsState.myId) {
    window.alert("That's you! 😄 Try a friend's username or email instead.");
    return;
  }

  // Phase 15: the tickbox on the form asks for close friendship at the same
  // time. The flag rides along on the friend request, so one Accept does both.
  const closeBox = document.getElementById("addAsCloseInput");
  const alsoClose = closeBox ? closeBox.checked : false;

  const { error: insertError } = await supabaseClient
    .from("friendships")
    .insert({
      requester_id: friendsState.myId,
      addressee_id: match.friend_id,
      close_requested: alsoClose,
    });

  if (insertError) {
    // 23505 = the database's "that already exists" code. Our unique rules stop
    // duplicate requests in either direction.
    if (insertError.code === "23505") {
      window.alert(
        "You're already connected to them, or a request is already waiting. 🤝"
      );
    } else {
      reportCloudWriteError("send that friend request", insertError);
    }
    return;
  }

  document.getElementById("friendEmailInput").value = "";
  if (closeBox) {
    closeBox.checked = false; // don't carry the tick over to the next person
  }
  showToast(
    "Request sent to " +
      (match.friend_name || cleaned) +
      (alsoClose ? " ⭐" : " 🤝")
  );
  loadFriends();
}

async function acceptRequest(buddy) {
  if (blockedByOffline()) {
    return;
  }

  // Phase 15: if they also asked to be close friends, check that's wanted
  // BEFORE accepting — it means opening up your own workouts too.
  let alsoClose = false;
  if (buddy.askedByThem) {
    alsoClose = window.confirm(
      buddy.name + " also wants to be close friends.\n\n" +
        "OK = accept both, and you'll each be able to see the other's " +
        "workouts.\nCancel = become ordinary friends only."
    );
  }

  const { error } = await supabaseClient
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", buddy.friendshipId);

  if (error) {
    reportCloudWriteError("accept that request", error);
    return;
  }

  if (alsoClose) {
    // Now that you're friends, the database will allow the close grant.
    const { error: closeError } = await supabaseClient.rpc(
      "accept_close_request",
      { other_user: buddy.id }
    );
    if (closeError) {
      console.error("Couldn't accept the close request:", closeError.message);
    }
  } else if (buddy.askedByThem) {
    // Said no to the close part — clear the flag so it stops asking.
    await supabaseClient
      .from("friendships")
      .update({ close_requested: false })
      .eq("id", buddy.friendshipId);
  }

  showToast(
    alsoClose
      ? "You and " + buddy.name + " are close friends ⭐"
      : "You and " + buddy.name + " are now gym buddies 🎉"
  );
  loadFriends();
}

async function declineRequest(buddy) {
  if (blockedByOffline()) {
    return;
  }
  const { error } = await supabaseClient
    .from("friendships")
    .delete()
    .eq("id", buddy.friendshipId);

  if (error) {
    reportCloudWriteError("decline that request", error);
    return;
  }
  loadFriends();
}

// Remove a friend (or cancel a request you sent). Also tidies away your
// "close friend" row for them — though the database would ignore it anyway,
// because access needs an accepted friendship as well.
async function removeFriend(buddy, isCancel) {
  const question = isCancel
    ? "Cancel your friend request to " + buddy.name + "?"
    : "Remove " + buddy.name + " from your gym buddies?";
  if (!window.confirm(question)) {
    return;
  }
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  const { error } = await supabaseClient
    .from("friendships")
    .delete()
    .eq("id", buddy.friendshipId);

  if (error) {
    reportCloudWriteError("remove that friend", error);
    return;
  }

  await supabaseClient
    .from("close_friends")
    .delete()
    .eq("owner_id", friendsState.myId)
    .eq("friend_id", buddy.id);

  loadFriends();
}

// Promote/demote a close friend. A row existing in `close_friends` IS the
// promotion, so this is just an insert or a delete.
/* ---- Close friends (Phase 15) ----
   Being close friends is mutual: one of you asks, the other accepts, and both
   grants are written at once by accept_close_request() in the database (the
   only thing allowed to write somebody else's grant row). The one-way share is
   still here for "let them see mine without them sharing back". */

// Ask an existing friend. Your own side opens straight away — you've just said
// you want to share — and theirs opens when they accept.
async function sendCloseRequest(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  const { error } = await supabaseClient.from("close_requests").insert({
    from_user: friendsState.myId,
    to_user: buddy.id,
  });

  // 23505 just means you'd already asked — carry on and make sure your side
  // is open rather than showing an error.
  if (error && error.code !== "23505") {
    reportCloudWriteError("ask to be close friends", error);
    return;
  }

  await grantMySide(buddy.id);
  showToast("Asked " + buddy.name + " to be close friends ⭐");
  loadFriends();
}

// Withdraw an ask you sent, and close your side back up.
async function cancelCloseRequest(buddy) {
  if (!window.confirm("Withdraw your close-friend request to " + buddy.name + "?")) {
    return;
  }
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  const { error } = await supabaseClient
    .from("close_requests")
    .delete()
    .eq("from_user", friendsState.myId)
    .eq("to_user", buddy.id);

  if (error) {
    reportCloudWriteError("withdraw that request", error);
    return;
  }

  await revokeMySide(buddy.id);
  loadFriends();
}

// Accept their ask. This is the moment YOUR workouts open up too, so the
// confirmation says so in as many words.
async function acceptCloseRequest(buddy) {
  const ok = window.confirm(
    "Become close friends with " + buddy.name + "?\n\n" +
      "You'll each be able to open the other's workouts: sets, reps, weights " +
      "and exercise names. Either of you can end it later."
  );
  if (!ok) {
    return;
  }
  if (blockedByOffline()) {
    return;
  }

  const { data, error } = await supabaseClient.rpc("accept_close_request", {
    other_user: buddy.id,
  });

  if (error) {
    reportCloudWriteError("accept that request", error);
    return;
  }
  if (data !== true) {
    // The ask was withdrawn (or the friendship ended) while the page sat open.
    window.alert("That request isn't there any more. It may have been withdrawn.");
    loadFriends();
    return;
  }

  showToast("You and " + buddy.name + " are close friends ⭐");
  loadFriends();
}

// Say no thanks. Clears both ways an ask can reach you: a close_requests row,
// and the flag on a friend request that asked for close as well.
async function declineCloseRequest(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  const { error } = await supabaseClient
    .from("close_requests")
    .delete()
    .eq("from_user", buddy.id)
    .eq("to_user", friendsState.myId);

  if (error) {
    reportCloudWriteError("decline that request", error);
    return;
  }

  // Clear the flag if the ask came in on the original friend request. (We're
  // the addressee of that row, and it stays "accepted", so this is allowed.)
  await supabaseClient
    .from("friendships")
    .update({ close_requested: false })
    .eq("requester_id", buddy.id)
    .eq("addressee_id", friendsState.myId);

  loadFriends();
}

// End it — for both of you. That's what makes it a shared state rather than
// two separate gifts, so the confirmation spells it out.
async function endCloseFriendship(buddy) {
  const ok = window.confirm(
    "Stop being close friends with " + buddy.name + "?\n\n" +
      "You'll both stop seeing each other's workouts. You'll still be friends."
  );
  if (!ok) {
    return;
  }
  if (blockedByOffline()) {
    return;
  }

  const { error } = await supabaseClient.rpc("end_close_friendship", {
    other_user: buddy.id,
  });

  if (error) {
    reportCloudWriteError("update that friend", error);
    return;
  }

  showToast("You're ordinary friends again");
  loadFriends();
}

/* ---- The one-way share (unchanged behaviour from Phase 12) ---- */

// Let someone see your workouts without them sharing back.
async function startOneWayShare(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }
  if (!(await grantMySide(buddy.id))) {
    return;
  }
  showToast(buddy.name + " can now see your workouts ⭐");
  loadFriends();
}

async function stopOneWayShare(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }
  if (!(await revokeMySide(buddy.id))) {
    return;
  }
  showToast(buddy.name + " can no longer see your workouts");
  loadFriends();
}

// Open / close YOUR OWN grant row. (Their row is theirs to write — only
// accept_close_request() in the database can touch both.)
async function grantMySide(friendId) {
  const { error } = await supabaseClient.from("close_friends").insert({
    owner_id: friendsState.myId,
    friend_id: friendId,
  });
  if (error && error.code !== "23505") {
    // 23505 = already granted, which is fine.
    reportCloudWriteError("update that friend", error);
    return false;
  }
  return true;
}

async function revokeMySide(friendId) {
  const { error } = await supabaseClient
    .from("close_friends")
    .delete()
    .eq("owner_id", friendsState.myId)
    .eq("friend_id", friendId);
  if (error) {
    reportCloudWriteError("update that friend", error);
    return false;
  }
  return true;
}

// Send a 👋. The database allows one per friend per day, so a repeat comes
// back as a duplicate error rather than a second nudge.
async function sendNudge(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }
  const { error } = await supabaseClient.from("nudges").insert({
    from_user: friendsState.myId,
    to_user: buddy.id,
  });

  if (error) {
    if (error.code === "23505") {
      window.alert("You've already nudged " + buddy.name + " today 😄");
      loadFriends();
    } else {
      reportCloudWriteError("send that nudge", error);
    }
    return;
  }

  showToast("Nudge sent to " + buddy.name + " 👋");
  loadFriends();
}

/* =========================================================================
   7. LOOKING AT A CLOSE FRIEND'S WORKOUTS
   ========================================================================= */

// Fetch a friend's recent workouts and show them in the existing pop-up.
// If they haven't made you a close friend, the database simply returns
// nothing — there's no way to get at the rows from here.
async function openFriendWorkouts(buddy) {
  if (isOffline()) {
    window.alert("You're offline 📡. Reconnect to see their workouts.");
    return;
  }

  // Open the pop-up straight away with a spinner (Phase 12e). Waiting for the
  // fetch before showing anything made the tap feel like it hadn't worked.
  document.getElementById("sessionTitle").textContent =
    buddy.name + "'s recent workouts";
  const list = document.getElementById("sessionDetailList");
  list.innerHTML = "";
  list.appendChild(createLoadingCard("Fetching their workouts…"));
  document.getElementById("sessionModal").hidden = false;

  const [sessions, exercises] = await Promise.all([
    supabaseClient
      .from("sessions")
      .select("*")
      .eq("user_id", buddy.id)
      .order("date", { ascending: false })
      .limit(20),
    supabaseClient.from("exercises").select("*").eq("user_id", buddy.id),
  ]);

  if (sessions.error || exercises.error) {
    document.getElementById("sessionModal").hidden = true; // close the spinner
    window.alert(
      "Couldn't load " + buddy.name + "'s workouts. Try again in a moment."
    );
    return;
  }

  // Same shapes as your own data, so the existing pop-up can draw them.
  const theirSessions = (sessions.data || [])
    .map(mapSessionFromCloud)
    .filter(isCompletedSession)
    .slice(0, 10);
  const theirExercises = (exercises.data || []).map(mapExerciseFromCloud);

  showFriendWorkoutList(buddy, theirSessions, theirExercises);
}

// A list of the friend's recent workouts inside the workout pop-up. Tapping
// one swaps the pop-up over to the full detail view for that workout.
function showFriendWorkoutList(buddy, sessions, exercises) {
  document.getElementById("sessionTitle").textContent =
    buddy.name + "'s recent workouts";

  const list = document.getElementById("sessionDetailList");
  list.innerHTML = "";

  if (sessions.length === 0) {
    list.appendChild(createEmptyState("💤", "No workouts recorded yet."));
    document.getElementById("sessionModal").hidden = false;
    return;
  }

  sessions.forEach((session) => {
    const row = document.createElement("button");
    row.className = "friend-workout";
    row.type = "button";

    const title = document.createElement("div");
    title.className = "history-card__title";
    title.textContent = (session.day || "Workout") + " workout";

    const totalSets = session.entries.reduce(
      (sum, entry) => sum + entrySetsDone(entry),
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

    row.appendChild(title);
    row.appendChild(meta);
    // Pass THEIR exercises so the names and emojis come out right.
    row.addEventListener("click", () =>
      showSessionDetail(session, exercises)
    );
    list.appendChild(row);
  });

  document.getElementById("sessionModal").hidden = false;
}

/* =========================================================================
   8. HOOK-UPS — called by app.js and the page's buttons
   ========================================================================= */

// Called from app.js once you're logged in and your data has synced.
async function initFriendsOnLogin() {
  await ensureMyDirectoryRow();
  await loadFriends();
  showNudgeToasts(); // "👋 Amara nudged you — go get that workout!"
}

// Called from app.js when you tap the Friends tab: refresh so the went-today
// ticks and nudges are current, then clear any unseen nudges — you're looking
// right at who sent them, so the dot has done its job.
async function onFriendsTabOpened() {
  await loadFriends();
  await markNudgesSeen();
}

// Wire up the tab's own buttons once the page exists.
document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addFriendBtn");
  const emailInput = document.getElementById("friendEmailInput");
  if (addBtn && emailInput) {
    addBtn.addEventListener("click", () => addFriend(emailInput.value));
    // Enter in the box does the same thing.
    emailInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addFriend(emailInput.value);
      }
    });
  }

  // Settings → the name your friends see. Saves when you leave the box.
  const nameInput = document.getElementById("friendNameInput");
  if (nameInput) {
    nameInput.addEventListener("change", () =>
      saveMyDisplayName(nameInput.value)
    );
  }

  // Settings → your username (Phase 14c): live checking as you type, and Save.
  const usernameInput = document.getElementById("usernameInput");
  const saveUsernameBtn = document.getElementById("saveUsernameBtn");
  if (usernameInput) {
    usernameInput.addEventListener("input", () =>
      handleUsernameTyping(usernameInput.value)
    );
    // Enter in the box saves, like the add-friend field.
    usernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveUsername(usernameInput.value);
      }
    });
  }
  if (saveUsernameBtn && usernameInput) {
    saveUsernameBtn.addEventListener("click", () =>
      saveUsername(usernameInput.value)
    );
  }

  // Settings → the master "share my workouts" switch (Phase 12d).
  const shareToggle = document.getElementById("shareWorkoutsInput");
  if (shareToggle) {
    shareToggle.addEventListener("change", () =>
      saveShareWorkouts(shareToggle.checked)
    );
  }
});
