/*
  auth.js — login / sign-up gate (Phase 7d).

  Shows a full-screen login screen until the user is signed in, then reveals the
  app. Uses `supabaseClient` from supabase.js. For now this ONLY gates the app —
  your data still comes from localStorage; moving data into the cloud is 7e.
*/

// Show the right thing based on whether someone is logged in.
function updateAuthUI(session) {
  const loggedIn = !!session;

  // The login screen covers everything until you're signed in.
  document.getElementById("authGate").hidden = loggedIn;

  // The "Account" card in Settings shows your email + a log-out button.
  const accountCard = document.getElementById("accountCard");
  const emailEl = document.getElementById("authEmail");
  if (accountCard) {
    accountCard.hidden = !loggedIn;
  }
  if (emailEl && session) {
    emailEl.textContent = session.user.email;
  }
}

// Show a small message under the form (errors in coral, info in mint).
function showAuthMessage(text, isError) {
  const el = document.getElementById("authMessage");
  el.textContent = text || "";
  el.classList.toggle("auth__message--error", !!isError);
  el.hidden = !text;
}

// Read the fields.
function readAuthForm() {
  return {
    email: document.getElementById("authEmailInput").value.trim(),
    password: document.getElementById("authPasswordInput").value,
    // Sign-up only; ignored when logging in.
    emailConfirm: document
      .getElementById("authEmailConfirmInput")
      .value.trim(),
  };
}

/* ---- Sign-up mode ----
   The same form does both jobs. Pressing "Sign up" the first time switches it
   into sign-up mode, which reveals a "Confirm email" box — typing your address
   twice catches the typo that would otherwise lock you out of your own account
   (and out of any password-reset email). Pressing it again creates the account.
   "Log in" always goes back to plain log-in. */

let signupMode = false;

function setSignupMode(on) {
  signupMode = on;

  const confirmInput = document.getElementById("authEmailConfirmInput");
  const signupBtn = document.getElementById("signupBtn");
  const subtitle = document.querySelector(".auth__sub");

  confirmInput.hidden = !on;
  if (!on) {
    confirmInput.value = ""; // don't leave a stale address behind
  }

  // Make it obvious which job the form is doing.
  signupBtn.textContent = on ? "Create account" : "Sign up";
  signupBtn.classList.toggle("btn--primary", on);
  signupBtn.classList.toggle("btn--ghost", !on);
  if (subtitle) {
    subtitle.textContent = on
      ? "Choose a password and confirm your email to get started."
      : "Log in to sync your workouts across devices.";
  }
}

// Log in with email + password. Always plain log-in: if the form happened to be
// in sign-up mode, put it back first.
async function handleLogin() {
  if (signupMode) {
    setSignupMode(false);
  }

  const { email, password } = readAuthForm();
  if (!email || !password) {
    showAuthMessage("Enter your email and password.", true);
    return;
  }
  showAuthMessage("Logging in…", false);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    showAuthMessage(error.message, true);
  } else {
    showAuthMessage("", false); // success — onAuthStateChange reveals the app
  }
}

// Create a new account. The first press only switches the form into sign-up
// mode; the second press does the work.
async function handleSignup() {
  if (!signupMode) {
    setSignupMode(true);
    showAuthMessage("Confirm your email below, then press Create account.", false);
    document.getElementById("authEmailConfirmInput").focus();
    return;
  }

  const { email, password, emailConfirm } = readAuthForm();
  if (!email || !password) {
    showAuthMessage("Enter an email and password to sign up.", true);
    return;
  }
  // Compared case-insensitively: email addresses aren't case-sensitive in
  // practice, and phone keyboards love to capitalise the first letter.
  if (email.toLowerCase() !== emailConfirm.toLowerCase()) {
    showAuthMessage("The two emails don't match. Check for a typo.", true);
    return;
  }
  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.", true);
    return;
  }

  // A username is generated for you when your account is set up — you pick a
  // proper one later in Settings, where we can actually check it's free.

  showAuthMessage("Creating your account…", false);
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
  });
  if (error) {
    showAuthMessage(error.message, true);
  } else if (data.session) {
    showAuthMessage("", false); // logged straight in (email confirmation off)
  } else {
    // Email confirmation is on: they must click the link in their email first.
    showAuthMessage("Account created! Check your email to confirm, then log in.", false);
    setSignupMode(false);
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
}

// Wire everything up once the page is ready.
document.addEventListener("DOMContentLoaded", () => {
  // Submitting the form (or the Log in button) logs in.
  document.getElementById("authForm").addEventListener("submit", (event) => {
    event.preventDefault();
    handleLogin();
  });
  document.getElementById("signupBtn").addEventListener("click", handleSignup);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Sync the cloud data once per signed-in session (not on every token refresh).
  let syncedForSession = false;

  // Keep the UI in sync with login/logout/token-refresh events.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
    if (session && !syncedForSession) {
      syncedForSession = true;
      onUserLoggedIn(session); // (defined in app.js) pull/upload + redraw
    } else if (!session) {
      syncedForSession = false;
    }
  });

  // onAuthStateChange also fires an INITIAL_SESSION event on load, which sets the
  // initial gate state and triggers the first sync if already logged in.

  // Belt-and-braces: also set the gate from getSession, so the login screen is
  // never stuck on if the initial event is missed. (Doesn't trigger the sync.)
  supabaseClient.auth.getSession().then((result) => {
    updateAuthUI(result.data.session);
  });
});
