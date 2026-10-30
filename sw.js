// Offline support: precache the shell on install, then network-first (fresh when online) with cache fallback.
// Paths are relative to where this file is served, so the app works at a site root or in a subfolder.
const CACHE = "laneiq-v11";
const SCOPE = self.registration.scope;
const SHELL = ["./", "camera.js", "manifest.webmanifest", "balls.json", "icon-180.png", "icon-192.png", "icon-512.png"].map((u) => new URL(u, SCOPE).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(SHELL.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== location.origin) {
    // The text reader ("Scan a ball", pattern photos) and the pose model (reading the approach) are downloaded once and kept for offline use.
    if (/^(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)$/.test(url.hostname) || (url.hostname === "storage.googleapis.com" && url.pathname.startsWith("/mediapipe-models/"))) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE);
          const hit = await cache.match(req);
          if (hit) return hit;
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        })(),
      );
    }
    return;
  }
  const file = url.pathname.split("/").pop() || "";
  // The app is opened from what is already on the phone, not after a wait for the network: a bowling center's Wi-Fi made every launch take seconds.
  // - the script has a new address with every build (camera.js?v=...), so a saved copy is always the right one: use it at once;
  // - the ball catalog (3 MB) is shown from the saved copy and refreshed behind it;
  // - the page itself, the version check and the news go to the network first (a short wait), so a new build is noticed, with the saved copy as the fallback.
  const fromSaved = (file === "camera.js" && url.search.includes("v=")) || /\.(png|webmanifest)$/.test(file);
  const refreshBehind = file === "balls.json";
  if (fromSaved || refreshBehind) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        const refresh = fetch(req, { cache: "no-cache" }).then((res) => (res.ok && cache.put(req, res.clone()), res)).catch(() => undefined);
        if (hit) {
          if (refreshBehind) event.waitUntil(refresh);
          return hit;
        }
        return (await refresh) || new Response("Offline and not cached yet. Open the app once while connected.", { status: 503 });
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req, { cache: "no-cache" }), new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 2500))]);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const hit = (await cache.match(req)) || (req.mode === "navigate" ? await cache.match(SCOPE) : undefined);
        return hit || new Response("Offline and not cached yet. Open the app once while connected.", { status: 503 });
      }
    })(),
  );
});