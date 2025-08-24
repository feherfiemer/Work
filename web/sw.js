// Service Worker for R-Service Tracker PWA
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
  '/assets/favicon.ico',
  '/assets/favicon.svg',
  '/assets/sounds/done.mp3',
  '/assets/sounds/paid.mp3',
  '/manifest.json',
  // External resources
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
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
  console.log('[SW] Activating service worker...');
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
          console.log('[SW] Serving from cache:', event.request.url);
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
            console.log('[SW] Network request failed, serving offline page');
            // You could return a cached offline page here
            throw err;
          });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks here
      console.log('[SW] Performing background sync...')
    );
  }
});

// Enhanced push notification handling for cross-platform compatibility
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  let title = 'R-Service Tracker';
  let options = {
    body: 'R-Service Tracker notification',
    icon: '/assets/favicon.svg',
    badge: '/assets/favicon.ico',
    image: '/assets/logo-premium.svg', // Rich notification image
    dir: 'ltr',
    lang: 'en',
    renotify: true,
    requireInteraction: true, // Keep visible until user interacts
    silent: false,
    timestamp: Date.now(),
    vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: '/',
      type: 'general'
    },
    actions: [
      {
        action: 'open', 
        title: 'Open App',
        icon: '/assets/favicon.svg'
      },
      {
        action: 'mark-done', 
        title: 'Mark Work Done',
        icon: '/assets/favicon.svg'
      },
      {
        action: 'dismiss', 
        title: 'Dismiss',
        icon: '/assets/favicon.svg'
      }
    ]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = { ...options, ...data.options };
      
      // Enhanced options for specific notification types
      if (data.type === 'payday') {
        options.requireInteraction = true;
        options.vibrate = [300, 100, 300, 100, 300];
        options.actions = [
          { action: 'collect-payment', title: 'Collect Payment', icon: '/assets/favicon.svg' },
          { action: 'view-earnings', title: 'View Earnings', icon: '/assets/favicon.svg' },
          { action: 'dismiss', title: 'Later', icon: '/assets/favicon.svg' }
        ];
      } else if (data.type === 'reminder') {
        options.requireInteraction = false;
        options.vibrate = [150, 50, 150];
        options.actions = [
          { action: 'mark-done', title: 'Mark Done', icon: '/assets/favicon.svg' },
          { action: 'open', title: 'Open App', icon: '/assets/favicon.svg' },
          { action: 'dismiss', title: 'Dismiss', icon: '/assets/favicon.svg' }
        ];
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      // Fallback to text data
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notification displayed successfully');
        
        // Try to focus the client if notification is critical
        if (options.data && options.data.type === 'payday') {
          return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clients => {
              if (clients.length > 0) {
                // Focus existing window
                return clients[0].focus();
              }
            });
        }
      })
      .catch(error => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received. Action:', event.action);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const baseUrl = self.location.origin;
  
  // Handle different actions
  let actionPromise;
  
  switch (event.action) {
    case 'open':
    case 'explore':
    case 'get-started':
      actionPromise = openOrFocusApp('/');
      break;
      
    case 'mark-done':
      actionPromise = openOrFocusApp('/?action=mark-done');
      break;
      
    case 'collect-payment':
      actionPromise = openOrFocusApp('/?action=collect-payment');
      break;
      
    case 'view-earnings':
      actionPromise = openOrFocusApp('/?action=view-earnings');
      break;
      
    case 'learn-more':
      actionPromise = openOrFocusApp('/#about');
      break;
      
    case 'dismiss':
      // Just close the notification, no further action
      actionPromise = Promise.resolve();
      break;
      
    default:
      // Default click action (no specific action button clicked)
      const targetUrl = notificationData.url || '/';
      actionPromise = openOrFocusApp(targetUrl);
      break;
  }
  
  event.waitUntil(actionPromise);
});

// Helper function to open or focus the app
async function openOrFocusApp(url) {
  try {
    // Get all clients (open windows/tabs)
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Check if app is already open
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin)) {
        // Focus existing window and navigate if needed
        await client.focus();
        if (url !== '/' && !client.url.includes(url.replace('/', ''))) {
          client.navigate(url);
        }
        return client;
      }
    }
    
    // No existing client found, open new window
    return self.clients.openWindow(url);
  } catch (error) {
    console.error('[SW] Error in openOrFocusApp:', error);
    // Fallback: just open new window
    return self.clients.openWindow(url);
  }
}