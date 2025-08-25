// Service Worker for R-Service Tracker PWA with Background Notifications
const CACHE_NAME = 'r-service-tracker-v2.2.0';
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
  '/manifest.json',
  // External resources
  'https://fonts.googleapis.com/css2?family=Exo:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v2.2.0...');
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
  console.log('[SW] Activating service worker v2.2.0...');
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
  
  // Initialize background notification scheduling
  setupBackgroundNotifications();
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

// ===== BACKGROUND NOTIFICATION SYSTEM =====

// Setup background notification scheduling
function setupBackgroundNotifications() {
  console.log('[SW] Setting up background notification system...');
  
  // Clear any existing alarms
  clearBackgroundSchedule();
  
  // Set up periodic check
  schedulePeriodicCheck();
  
  console.log('[SW] Background notification system initialized');
}

// Schedule periodic notification checks
function schedulePeriodicCheck() {
  // Set up a check every minute
  setInterval(() => {
    checkForScheduledNotifications();
  }, 60000); // 60 seconds
  
  // Also check immediately
  checkForScheduledNotifications();
}

// Clear existing background schedule
function clearBackgroundSchedule() {
  // Clear any existing timeouts/intervals if stored
  const existingTimeouts = self.notificationTimeouts || [];
  existingTimeouts.forEach(timeout => clearTimeout(timeout));
  self.notificationTimeouts = [];
}

// Check for scheduled notifications
async function checkForScheduledNotifications() {
  try {
    console.log('[SW] Checking for scheduled notifications...');
    
    // Get current IST time
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const timeKey = `${hour}:${minute.toString().padStart(2, '0')}`;
    const today = istTime.toISOString().split('T')[0];
    
    console.log('[SW] Current IST time:', timeKey, 'Date:', today);
    
    // Get configuration from indexedDB or fallback
    const config = await getStoredConfig();
    console.log('[SW] Loaded config:', config);
    
    if (!config.NOTIFICATIONS_ENABLED) {
      console.log('[SW] Notifications disabled in config');
      return;
    }
    
    // Check for payment reminder
    if (timeKey === config.PAYMENT_REMINDER_TIME) {
      const lastPaymentNotification = await getLastNotificationTime('payment', today);
      if (!lastPaymentNotification) {
        await showBackgroundNotification('payment', config);
        await setLastNotificationTime('payment', today);
      }
    }
    
    // Check for work reminder
    if (timeKey === config.WORK_REMINDER_TIME) {
      const lastWorkNotification = await getLastNotificationTime('work', today);
      if (!lastWorkNotification) {
        await showBackgroundNotification('work', config);
        await setLastNotificationTime('work', today);
      }
    }
    
  } catch (error) {
    console.error('[SW] Error checking for notifications:', error);
  }
}

// Get stored configuration
async function getStoredConfig() {
  try {
    // Try to get from IndexedDB first
    const storedConfig = await getFromIndexedDB('settings', 'notificationConfig');
    if (storedConfig) {
      return validateConfig(storedConfig);
    }
    
    // Fallback configuration
    return {
      NOTIFICATIONS_ENABLED: true,
      PAYMENT_REMINDER_TIME: '10:00',
      WORK_REMINDER_TIME: '18:00',
      TIMEZONE: 'Asia/Kolkata'
    };
  } catch (error) {
    console.error('[SW] Error getting config:', error);
    return {
      NOTIFICATIONS_ENABLED: true,
      PAYMENT_REMINDER_TIME: '10:00',
      WORK_REMINDER_TIME: '18:00',
      TIMEZONE: 'Asia/Kolkata'
    };
  }
}

// Validate configuration
function validateConfig(config) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  return {
    NOTIFICATIONS_ENABLED: config.NOTIFICATIONS_ENABLED !== false,
    PAYMENT_REMINDER_TIME: timeRegex.test(config.PAYMENT_REMINDER_TIME) ? config.PAYMENT_REMINDER_TIME : '10:00',
    WORK_REMINDER_TIME: timeRegex.test(config.WORK_REMINDER_TIME) ? config.WORK_REMINDER_TIME : '18:00',
    TIMEZONE: config.TIMEZONE || 'Asia/Kolkata'
  };
}

// Show background notification
async function showBackgroundNotification(type, config) {
  const baseUrl = self.registration.scope;
  const iconUrl = `${baseUrl}assets/favicon.ico`;
  const badgeUrl = `${baseUrl}assets/favicon.svg`;
  
  let title, body, actions;
  
  if (type === 'payment') {
    title = 'Payment Reminder - R-Service Tracker';
    body = 'Time to check your payment status! Don\'t forget to collect your earnings.';
    actions = [
      {
        action: 'open-payments',
        title: '💰 Check Payments',
        icon: iconUrl
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss',
        icon: iconUrl
      }
    ];
  } else if (type === 'work') {
    title = 'Work Reminder - R-Service Tracker';
    body = 'Don\'t forget to mark your work as completed today! Keep your streak going.';
    actions = [
      {
        action: 'mark-done',
        title: '✅ Mark as Done',
        icon: iconUrl
      },
      {
        action: 'remind-later',
        title: '⏰ Remind Later',
        icon: iconUrl
      }
    ];
  }
  
  const options = {
    body: body,
    icon: iconUrl,
    badge: badgeUrl,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: actions,
    data: {
      type: type,
      timestamp: Date.now(),
      url: baseUrl
    },
    tag: `${type}-reminder-${Date.now()}`
  };
  
  console.log('[SW] Showing notification:', title, options);
  
  try {
    await self.registration.showNotification(title, options);
    console.log('[SW] Notification shown successfully');
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
  }
}

// Get/Set last notification time to prevent duplicates
async function getLastNotificationTime(type, date) {
  try {
    const key = `lastNotification_${type}_${date}`;
    return await getFromIndexedDB('notifications', key);
  } catch (error) {
    return null;
  }
}

async function setLastNotificationTime(type, date) {
  try {
    const key = `lastNotification_${type}_${date}`;
    await saveToIndexedDB('notifications', key, true);
  } catch (error) {
    console.error('[SW] Error saving notification time:', error);
  }
}

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

// ===== NOTIFICATION INTERACTION HANDLING =====

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received:', event.action);
  
  event.notification.close();
  
  const { action } = event;
  const { type, url } = event.notification.data || {};
  
  if (action === 'mark-done') {
    // Handle mark as done action
    event.waitUntil(handleMarkAsDone(url));
  } else if (action === 'remind-later') {
    // Schedule reminder for 1 hour later
    event.waitUntil(scheduleRemindLater());
  } else if (action === 'open-payments') {
    // Open payments view
    event.waitUntil(openApp(url, '#payments'));
  } else if (action === 'dismiss') {
    // Just dismiss
    console.log('[SW] Notification dismissed');
  } else {
    // Default click - open app
    event.waitUntil(openApp(url));
  }
});

// Handle mark as done action
async function handleMarkAsDone(baseUrl) {
  try {
    console.log('[SW] Handling mark as done...');
    
    // Store the action for the app to process when opened
    await saveToIndexedDB('pendingActions', 'markDone', {
      action: 'mark-done',
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });
    
    // Open the app
    await openApp(baseUrl);
    
    console.log('[SW] Mark as done action queued');
  } catch (error) {
    console.error('[SW] Error handling mark as done:', error);
  }
}

// Schedule remind later
async function scheduleRemindLater() {
  console.log('[SW] Scheduling reminder for later...');
  
  // Schedule notification for 1 hour later
  setTimeout(async () => {
    const config = await getStoredConfig();
    await showBackgroundNotification('work', config);
  }, 60 * 60 * 1000); // 1 hour
}

// Open app
async function openApp(baseUrl, fragment = '') {
  const url = `${baseUrl || self.registration.scope}${fragment}`;
  
  try {
    // Try to focus existing window
    const clientList = await clients.matchAll({ type: 'window' });
    
    for (const client of clientList) {
      if (client.url.startsWith(baseUrl || self.registration.scope)) {
        await client.focus();
        if (fragment) {
          client.postMessage({ type: 'navigate', fragment });
        }
        return;
      }
    }
    
    // Open new window if no existing window found
    await clients.openWindow(url);
  } catch (error) {
    console.error('[SW] Error opening app:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data || {};
  
  if (type === 'SCHEDULE_NOTIFICATIONS') {
    // Update notification schedule
    setupBackgroundNotifications();
  } else if (type === 'UPDATE_CONFIG') {
    // Configuration updated
    console.log('[SW] Configuration updated');
  }
});

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(
      checkForScheduledNotifications()
    );
  }
});

// Push notification handling (for future server-side notifications)
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  let title = 'R-Service Tracker';
  let options = {
    body: 'You have a new notification',
    icon: `${self.registration.scope}assets/favicon.ico`,
    badge: `${self.registration.scope}assets/favicon.svg`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = { ...options, ...data.options };
    } catch (e) {
      // Fallback to text data
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

console.log('[SW] R-Service Tracker Service Worker v2.2.0 loaded');