const CACHE = "licentia-static-v2";
const CORE = ["./data/manifest.json", "./data/catalog.json", "./manifest.webmanifest"];

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (request.headers.has("authorization") || request.cache === "no-store") return false;

  return /\/(?:data|assets)\//.test(url.pathname)
    || /\/(?:manifest\.webmanifest|icon-(?:192|512)\.png|og\.png)$/.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isCacheableStaticRequest(event.request, url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cacheControl = response.headers.get("cache-control") ?? "";
        if (response.ok && !/\b(?:no-store|private)\b/i.test(cacheControl)) {
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error())),
  );
});
