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

// Read the two fields.
function readAuthForm() {
  return {
    email: document.getElementById("authEmailInput").value.trim(),
    password: document.getElementById("authPasswordInput").value,
  };
}

// Log in with email + password.
async function handleLogin() {
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

// Create a new account.
async function handleSignup() {
  const { email, password } = readAuthForm();
  if (!email || !password) {
    showAuthMessage("Enter an email and password to sign up.", true);
    return;
  }
  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.", true);
    return;
  }
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
