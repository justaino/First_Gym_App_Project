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
