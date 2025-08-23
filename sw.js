// Service Worker for R-Service Tracker
const CACHE_NAME = 'r-service-tracker-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  'https://unpkg.com/mdui@2/mdui.css',
  'https://unpkg.com/mdui@2/mdui.global.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background Sync for work records
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-work-records') {
    event.waitUntil(syncWorkRecords());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Time to record your work!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'record-work',
        title: 'Record Work',
        icon: '/icons/record-work.png'
      },
      {
        action: 'view-stats',
        title: 'View Stats',
        icon: '/icons/stats.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('R-Service Tracker', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'record-work') {
    event.waitUntil(
      clients.openWindow('/?action=record-work')
    );
  } else if (event.action === 'view-stats') {
    event.waitUntil(
      clients.openWindow('/?section=analytics')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

async function syncWorkRecords() {
  // This function would handle syncing work records when connection is restored
  console.log('Syncing work records...');
}