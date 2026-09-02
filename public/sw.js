// app-shell service worker: network-first for navigations (so a fresh deploy is
// picked up immediately when online), stale-while-revalidate for everything else
// (so already-visited assets still render instantly offline/on flaky mobile networks).
// Bump CACHE_NAME whenever this file's own strategy changes, to drop any stale cache.
const CACHE_NAME = "kitty-inc-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // only same-origin GETs are worth caching; POSTs and cross-origin requests (fonts
  // CDN, etc.) just pass straight through to the network untouched
  if (
    request.method !== "GET" ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ??
            (await caches.match(self.registration.scope));
          // a Response must always be returned here, even if nothing was ever
          // cached (e.g. the very first offline load) — resolving to undefined
          // throws "Failed to convert value to 'Response'" and breaks the whole
          // navigation instead of just failing gracefully
          return cached ?? Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});
