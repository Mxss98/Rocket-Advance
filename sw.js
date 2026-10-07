// Rocket Advance — offline support.
// Change VERSION whenever any app file changes, so phones pick up the update.
const VERSION = "ra-v15";
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
const NAV_TIMEOUT_MS = 2500;
async function openPage(req) {
  const cached = await caches.match("index.html");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cached ? NAV_TIMEOUT_MS : 30000);
  try {
    const res = await fetch(req.url, { cache: "no-cache", credentials: "same-origin", signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); return res; }
    return cached || res;
  } catch (err) {
    clearTimeout(timer);
    if (cached) return cached;
    throw err;
  }
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // the page itself: ask the server for the latest (no-cache), but never hang on a weak signal:
  // after NAV_TIMEOUT_MS, or on any failure, open the saved copy instead
  if (req.mode === "navigate") {
    e.respondWith(openPage(req));
    return;
  }
  // everything else (engine, icons, fonts): saved copy first, network if missing
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
