// Service Worker for R-Service Tracker PWA v1.0.0
const CACHE_NAME = 'r-service-tracker-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/database.js',
  '/js/notifications.js',
  '/js/calendar.js',
  '/js/charts.js',
  '/js/utils.js',
  '/js/constants.js',
  '/assets/favicon.ico',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.json'
  // Note: External resources are loaded dynamically for better performance
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v1.0.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Failed to cache resources:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v1.0.0...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(err => {
            console.log('[SW] Network request failed, serving offline');
            throw err;
          });
      })
  );
});

// ===== BASIC PWA FUNCTIONALITY =====

// IndexedDB helper functions
function getFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RServiceTracker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(key);
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result);
    };
  });
}

function saveToIndexedDB(storeName, key, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RServiceTracker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        const upgradeRequest = indexedDB.open('RServiceTracker', db.version + 1);
        upgradeRequest.onupgradeneeded = () => {
          const upgradeDb = upgradeRequest.result;
          upgradeDb.createObjectStore(storeName);
        };
        upgradeRequest.onsuccess = () => {
          const newDb = upgradeRequest.result;
          const transaction = newDb.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(value, key);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        return;
      }
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put(value, key);
      
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

// ===== MINIMAL MESSAGING SYSTEM =====

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type } = event.data || {};
  
  if (type === 'UPDATE_CONFIG') {
    console.log('[SW] Configuration updated');
  }
});

console.log('[SW] R-Service Tracker Service Worker v1.0.0 loaded');