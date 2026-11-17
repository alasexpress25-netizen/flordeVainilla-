// Service worker — Flor de Baunilha
// Mude o número da versão quando quiser forçar atualização do cache.
const CACHE = "fb-v3";
const SHELL = ["./", "index.html", "avatar.jpg", "icon-192.png", "icon-512.png", "qr-flordebaunilha.png", "manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function staleWhileRevalidate(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Páginas: rede primeiro (sempre pega a versão nova), cache se estiver offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./", copy); });
        return res;
      }).catch(function () { return caches.match("./").then(function (r) { return r || caches.match("index.html"); }); })
    );
    return;
  }

  // Arquivos do próprio site e a biblioteca do Supabase (jsDelivr): cache + atualização em segundo plano
  if (url.origin === self.location.origin || url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(staleWhileRevalidate(req));
  }
  // Supabase (dados), WhatsApp etc.: passam direto pela rede
});
