import { precacheAndRoute } from 'workbox-precaching';

// Workbox inyecta aquí la lista de assets a precachear durante el build
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'khaluby-v1';

// Activar — limpiar caches viejos (no tocar el cache de precache de Workbox)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && !key.startsWith('workbox-'))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.skipWaiting();

// Fetch — estrategia: Network First para API, Cache First para assets dinámicos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls — siempre red, sin cache
  if (url.pathname.startsWith('/api/') || url.hostname.includes('vercel.app') || url.hostname.includes('railway.app')) {
    event.respondWith(
      fetch(request).catch((err) => {
        console.error('[SW] Fetch falló para', request.url, err);
        return new Response(JSON.stringify({ error: 'Offline', detail: String(err) }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Assets dinámicos no precacheados — Cache First
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML y navegación — Network First, fallback a index.html precacheado
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match('/index.html'))
  );
});

// Recibir push y mostrarlo
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
    })
  );
});

// Al tocar la notificación → abrir la app en la URL correcta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
