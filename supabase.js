/*
  supabase.js — connects the app to our Supabase backend (Phase 7).

  Loaded BEFORE app.js (see index.html), so the rest of the app can use the
  `supabaseClient` it creates.

  About the values below — they are SAFE to be public and committed:
  - SUPABASE_URL is just the address of our project.
  - SUPABASE_PUBLISHABLE_KEY (sb_publishable_…) is designed to be shipped in the
    browser. The database's Row-Level Security (the policies we set up) is what
    actually protects the data, so this key can't read anyone else's rows.
  ⚠️ The SECRET key (sb_secret_…) must NEVER be put here or committed.
*/

const SUPABASE_URL = "https://nbtrnhoeecrvjwmudlbp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_MQ8zRLntHhG9J8pWefYayg_Hdvyqttk";

// `window.supabase` comes from the CDN <script> loaded just before this file.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// --- Quick connection check (Phase 7c) ---
// Logs to the browser console so we can confirm the app can reach Supabase and
// that Row-Level Security is on. Not logged in yet, so the count should be 0
// (and importantly, NO error). We'll remove this once auth is wired up.
supabaseClient
  .from("profiles")
  .select("*", { count: "exact", head: true })
  .then((result) => {
    if (result.error) {
      console.error("❌ Supabase connection problem:", result.error.message);
    } else {
      console.log(
        "✅ Supabase connected. Profiles visible to you right now:",
        result.count
      );
    }
  });
