self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open("finance-store").then((cache) => cache.addAll([
            "./",
            "./index.html", // sesuaikan nama file html anda
        ]))
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});