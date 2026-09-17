// Service worker de l'appli installable (PWA) Rive.
//
// Volontairement minimal pour l'instant : Rive est un tableau de bord
// dynamique par agent (auth + données à jour à chaque page), donc PAS de
// cache agressif du HTML/API qui risquerait de montrer des données
// périmées ou celles d'un autre agent après une déconnexion/reconnexion.
// Seuls les fichiers statiques (icônes, manifest) sont mis en cache, et une
// page "hors ligne" s'affiche si une navigation échoue faute de réseau.
//
// Les notifications push seront ajoutées ici dans un second temps (voir
// discussion en cours) — ce fichier sera republié à ce moment-là avec les
// gestionnaires "push" et "notificationclick".
const CACHE_NAME = 'rive-static-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [OFFLINE_URL]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

// Réseau d'abord pour toute navigation (jamais de HTML mis en cache), avec
// repli sur la page hors-ligne seulement si le réseau échoue vraiment —
// pour ne jamais montrer un tableau de bord obsolète ou celui d'un autre
// agent après un changement de compte.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
  }
})