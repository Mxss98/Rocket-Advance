// Rocket Advance — offline support.
// Change VERSION whenever any app file changes, so phones pick up the update.
const VERSION = "ra-v3";
const APP = ["./", "index.html", "manifest.webmanifest", "mgba_libretro.js", "mgba_libretro.wasm",
             "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's HTTP cache, so a new version never stores stale files
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(APP.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // the page itself: always ask the server for the latest (no-cache), fall back to the saved copy offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); }
      return res;
    }).catch(() => caches.match("index.html")));
    return;
  }
  // everything else (engine, icons, fonts): saved copy first, network if missing
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
