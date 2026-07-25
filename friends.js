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

// Make sure we know your user id before writing anything. Normally loadFriends()
// has already set it; this is a safety net for the case where a first load
// failed (e.g. a dropped connection) and you press a button anyway.
async function ensureMyId() {
  if (friendsState.myId) {
    return true;
  }
  const user = await getSignedInUser();
  if (!user) {
    window.alert("You're not signed in — log in again to use Friends.");
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
    return "You're offline 📡 — reconnect to see your friends.";
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
    const newRow = {
      user_id: user.id,
      email: email,
      display_name: defaultDisplayName(user),
    };
    const { error: insertError } = await supabaseClient
      .from("user_directory")
      .insert(newRow);
    if (insertError) {
      console.error("Couldn't add you to the directory:", insertError.message);
      return;
    }
    myDirectoryRow = newRow;
  } else {
    myDirectoryRow = existing;
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

// Put your saved display name into the Settings box.
function renderFriendNameInput() {
  const input = document.getElementById("friendNameInput");
  if (!input) {
    return;
  }
  input.value = myDirectoryRow ? myDirectoryRow.display_name || "" : "";
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
      // Their master sharing switch. Missing info = assume not sharing.
      shares: info.shares_workouts === true,
      iTrustThem: info.i_trust_them === true, // they can see MY details
      theyTrustMe: info.they_trust_me === true, // I can see THEIR details
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

  showToast("👋 " + who + " nudged you — go get that workout!");
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
      createEmptyState("🤝", "No friends yet — add someone by email above.")
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
  detail.textContent = "wants to be gym buddies";
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

  // ⭐ Close friend — lets THEM see YOUR workout details.
  const close = document.createElement("button");
  close.className = "btn btn--ghost btn--small friend__close";
  close.type = "button";
  close.textContent = buddy.iTrustThem ? "⭐ Close friend" : "☆ Close friend";
  close.title = buddy.iTrustThem
    ? "Tap to stop " + buddy.name + " seeing your workout details"
    : "Let " + buddy.name + " see your workout details";
  if (buddy.iTrustThem) {
    close.classList.add("is-on");
  }
  close.addEventListener("click", () => toggleCloseFriend(buddy));
  actions.appendChild(close);

  const remove = document.createElement("button");
  remove.className = "btn btn--ghost btn--small";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeFriend(buddy, false));
  actions.appendChild(remove);

  card.appendChild(actions);
  return card;
}

// The little grey line under a buddy's name.
function describeBuddyActivity(buddy) {
  if (buddy.waiting) {
    return "Request sent — waiting for them to accept";
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
async function addFriendByEmail(email) {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    window.alert("Type your friend's email address first.");
    return;
  }
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  const { data, error } = await supabaseClient.rpc("find_user_by_email", {
    lookup_email: clean,
  });

  if (error) {
    reportCloudWriteError("look up that email", error);
    return;
  }

  const match = data && data.length > 0 ? data[0] : null;
  if (!match) {
    window.alert(
      "No account with that email 🤔\n\n" +
        "Double-check the spelling — they need to have signed up to Athena's " +
        "Arena with this exact address."
    );
    return;
  }

  if (match.friend_id === friendsState.myId) {
    window.alert("That's you! 😄 Try a friend's email instead.");
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("friendships")
    .insert({
      requester_id: friendsState.myId,
      addressee_id: match.friend_id,
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
  showToast("Request sent to " + (match.friend_name || clean) + " 🤝");
  loadFriends();
}

async function acceptRequest(buddy) {
  if (blockedByOffline()) {
    return;
  }
  const { error } = await supabaseClient
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", buddy.friendshipId);

  if (error) {
    reportCloudWriteError("accept that request", error);
    return;
  }
  showToast("You and " + buddy.name + " are now gym buddies 🎉");
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
async function toggleCloseFriend(buddy) {
  if (blockedByOffline()) {
    return;
  }
  if (!(await ensureMyId())) {
    return;
  }

  if (buddy.iTrustThem) {
    const { error } = await supabaseClient
      .from("close_friends")
      .delete()
      .eq("owner_id", friendsState.myId)
      .eq("friend_id", buddy.id);
    if (error) {
      reportCloudWriteError("update that friend", error);
      return;
    }
    showToast(buddy.name + " can no longer see your workout details");
  } else {
    const { error } = await supabaseClient.from("close_friends").insert({
      owner_id: friendsState.myId,
      friend_id: buddy.id,
    });
    if (error) {
      reportCloudWriteError("update that friend", error);
      return;
    }
    showToast(buddy.name + " can now see your workout details ⭐");
  }

  loadFriends();
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
    window.alert("You're offline 📡 — reconnect to see their workouts.");
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
    addBtn.addEventListener("click", () => addFriendByEmail(emailInput.value));
    // Enter in the box does the same thing.
    emailInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addFriendByEmail(emailInput.value);
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

  // Settings → the master "share my workouts" switch (Phase 12d).
  const shareToggle = document.getElementById("shareWorkoutsInput");
  if (shareToggle) {
    shareToggle.addEventListener("change", () =>
      saveShareWorkouts(shareToggle.checked)
    );
  }
});
