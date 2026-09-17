// Service worker de l'appli installable (PWA) Rive.
//
// Volontairement minimal pour l'instant : Rive est un tableau de bord
// dynamique par agent (auth + données à jour à chaque page), donc PAS de
// cache agressif du HTML/API qui risquerait de montrer des données
// périmées ou celles d'un autre agent après une déconnexion/reconnexion.
// Seuls les fichiers statiques (icônes, manifest) sont mis en cache, et une
// page "hors ligne" s'affiche si une navigation échoue faute de réseau.
//
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

// Réception d'une notification push (voir lib/rive/push-notify.ts côté
// serveur, qui envoie {title, body, url} en JSON). "waitUntil" tient le
// service worker éveillé le temps d'afficher la notification — sans ça, le
// navigateur peut l'arrêter avant que showNotification() ait fini.
self.addEventListener('push', (event) => {
  let data = { title: 'Rive', body: '' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Corps non-JSON (ne devrait pas arriver, tout part en JSON depuis le
    // serveur) : on garde le titre par défaut plutôt que de planter.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Rive', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: { url: data.url || '/dashboard' },
    })
  )
})

// Clic sur une notification : ramène au premier onglet Rive déjà ouvert
// (et le navigue vers l'URL de la notification) plutôt que d'en ouvrir un
// nouveau à chaque fois, sinon l'agent se retrouve vite avec une dizaine
// d'onglets Rive ouverts au fil des notifications.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
