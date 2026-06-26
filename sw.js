/*
  sw.js — the service worker for Justaino (Phase 5 PWA).

  What it does, in plain English:
  - Saves ("caches") the app's files the first time you visit, so the app loads
    instantly afterwards and WORKS OFFLINE.
  - Having a service worker is also what lets Android/desktop browsers offer to
    "Install" the app.

  ⚠️ HOW UPDATES WORK — READ THIS BEFORE YOU DEPLOY CHANGES:
  When you change any app file (index.html / styles.css / app.js / icons), bump
  CACHE_VERSION below (e.g. "v1" -> "v2"). On the next visit the browser notices
  this file changed, re-caches the fresh files under the new name, and deletes
  the old cache — so people aren't stuck seeing an old version. If you DON'T bump
  it, returning visitors may keep getting the cached (old) files.
*/

// 🔼 Bump this whenever you change app files and want everyone to get the update.
const CACHE_VERSION = "v25";
const CACHE_NAME = "justaino-cache-" + CACHE_VERSION;

// The core files that make up the app ("the app shell"). Relative paths so this
// works both locally (Live Server) and under the GitHub Pages /repo-name/ path.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./vendor/supabase.js", // the Supabase library (vendored so offline works)
  "./supabase.js",
  "./auth.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

// INSTALL: pre-cache the app shell, then take over as soon as possible.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ACTIVATE: delete caches left over from older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// FETCH: serve from the cache first (fast + offline), fall back to the network.
// New successful files are added to the cache for next time. If we're offline
// and a page isn't cached, fall back to the app's main page.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return; // only handle GET requests
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          // Cache same-origin successful responses so they work offline later.
          if (
            response &&
            response.status === 200 &&
            request.url.startsWith(self.location.origin)
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: show the app shell for page navigations.
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
