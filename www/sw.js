/*
 * Service worker: permite jogar offline depois da primeira visita.
 * Estratégia "rede primeiro, cache como reserva": quando há internet o jogo sempre pega a
 * versão mais nova; sem internet usa o que ficou guardado.
 * Ao publicar mudanças grandes, aumente a VERSAO para limpar o cache antigo.
 */
const VERSAO = 'v6';
const CACHE = 'defensores-' + VERSAO;
const ESSENCIAIS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'fonts/PixelifySans.woff2',
  'icons/icon-192.png', 'icons/icon-512.png',
  'js/config.js', 'js/progress.js', 'js/engine.js', 'js/bot.js', 'js/camera.js',
  'js/sprites.js', 'js/render.js', 'js/ads-config.js', 'js/ads.js', 'js/server-config.js', 'js/cloud.js', 'js/main.js', 'privacidade.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // guarda também as imagens de assets/ que existirem
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
