// Offline support: precache the shell on install, then network-first (fresh when online) with cache fallback.
// Paths are relative to where this file is served, so the app works at a site root or in a subfolder.
const CACHE = "laneiq-v7";
const SCOPE = self.registration.scope;
const SHELL = ["./", "camera.js", "manifest.webmanifest", "balls.json", "patterns.json", "icon-180.png", "icon-192.png", "icon-512.png"].map((u) => new URL(u, SCOPE).href);

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
    // The text reader used by "Scan a ball" is downloaded once and kept for offline use.
    if (/^(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)$/.test(url.hostname)) {
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
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000))]);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const hit = (await cache.match(req)) || (req.mode === "navigate" ? await cache.match(SCOPE) : undefined);
        return hit || new Response("Offline and not cached yet. Open the app once while connected.", { status: 503 });
      }
    })(),
  );
});