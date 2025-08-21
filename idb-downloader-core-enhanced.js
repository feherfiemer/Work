/**
 * idb-downloader-core-enhanced.js
 * 
 * ENHANCED VERSION v1.0.0: Professional-grade IndexedDB downloader with comprehensive improvements
 * All bugs fixed, performance optimized, and user experience enhanced
 */

(function () {
'use strict';

const VERSION = '1.0.0';
const DB_NAME = 'R-ServiceX-DB';
const DB_VER = 5;
const STORE_META = 'meta';
const STORE_CHUNKS = 'chunks';
const STORE_SESSIONS = 'sessions';
const DEFAULT_CHUNK_SIZE = 1024 * 1024;
const DEFAULT_CONCURRENCY = 4;
const PROGRESS_UPDATE_INTERVAL = 150; // Ultra-smooth updates
const SESSION_TIMEOUT = 3600000;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 800;
const CONNECTION_TIMEOUT = 25000;

// ENHANCED: Professional error messages with context
const ERROR_MESSAGES = {
  NETWORK_INTERRUPTED: 'Network connection was interrupted during download. Please check your internet connection and click Resume to continue from where you left off.',
  INVALID_SETTINGS: 'Download settings are outside allowed limits. Please adjust: Threads (1-12 connections), Chunk Size (64-4096 KB). These limits ensure optimal performance and system stability.',
  STORAGE_INSUFFICIENT: 'Insufficient storage space for download. Please free up disk space or use browser download as an alternative.',
  RESUME_UNAVAILABLE: 'Unable to resume download. The download data may be corrupted or the server file may have changed. Please start a fresh download.',
  CONNECTION_TIMEOUT: 'Server connection timed out after multiple attempts. The server may be overloaded or temporarily unavailable. Please try again later or use browser download.',
  CONCURRENT_ACTIVE: 'Another download is currently active in a different tab. Please complete or cancel the existing download before starting a new one.',
  INITIALIZATION_FAILED: 'Failed to initialize download system. Please refresh the page and try again.',
  ASSEMBLY_FAILED: 'Failed to assemble downloaded file. Please try downloading again or use browser download.',
  PERMISSION_DENIED: 'Storage access denied. Please check browser permissions or use browser download instead.',
  QUOTA_EXCEEDED: 'Storage quota exceeded. Consider clearing browser data or using browser download.'
};

// ENHANCED: Progress message templates
const PROGRESS_MESSAGES = {
  INITIALIZING: 'Initializing secure parallel download system...',
  PREPARING: 'Analyzing file and preparing download segments...',
  STARTING: 'Establishing connections and starting download...',
  DOWNLOADING: 'Downloading file using optimized parallel connections...',
  PAUSING: 'Gracefully pausing download and saving progress...',
  RESUMING: 'Resuming download from last saved position...',
  ASSEMBLING: 'Assembling downloaded segments into final file...',
  COMPLETING: 'Finalizing download and preparing file for save...',
  CANCELLING: 'Cancelling download and cleaning up temporary data...'
};

function nowMs() { 
  try {
    return performance.now(); 
  } catch (e) {
    return Date.now();
  }
}

function humanBytes(n) {
  try {
    if (!n || !Number.isFinite(n)) return '0 B';
    const units = ['B','KB','MB','GB','TB','PB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(Math.max(n, 1))/Math.log(1024)));
    const value = n / Math.pow(1024, i);
    return `${(i === 0 ? value : value.toFixed(1))} ${units[i]}`;
  } catch (e) {
    return '0 B';
  }
}

function formatPrefer(n){
  try {
    if (typeof window !== 'undefined' && typeof window.formatFileSize === 'function') {
      return window.formatFileSize(n);
    }
  } catch (e) {
    console.warn('[R-ServiceX-DB] formatFileSize error:', e);
  }
  return humanBytes(n);
}

// ENHANCED: Professional filename utilities
function sanitizeFilename(filename) {
  try {
    if (!filename || typeof filename !== 'string') return 'download';
    
    let sanitized = filename;
    
    try {
      sanitized = decodeURIComponent(sanitized);
    } catch (e) {
      // If decoding fails, use original
    }
    
    sanitized = sanitized
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .replace(/\s+/g, ' ')
      .replace(/_{2,}/g, '_')
      .trim();
    
    if (sanitized.length > 200) {
      const ext = sanitized.split('.').pop();
      const name = sanitized.substring(0, 180);
      sanitized = ext ? `${name}.${ext}` : name;
    }
    
    return sanitized || 'download';
  } catch (e) {
    console.warn('[R-ServiceX-DB] sanitizeFilename error:', e);
    return 'download';
  }
}

function generateConsistentId(url) {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    const cleanUrl = url.split('?')[0].split('#')[0];
    const encoded = btoa(unescape(encodeURIComponent(cleanUrl)));
    return encoded.replace(/[+/=]/g, '_').slice(0, 32);
  } catch (e) {
    console.warn('[R-ServiceX-DB] generateConsistentId error:', e);
    return String(Math.abs(hashString(url || ''))).slice(0, 16);
  }
}

function hashString(str) {
  try {
    if (!str || typeof str !== 'string') return 0;
    
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash = (hash ^ str.charCodeAt(i)) * 16777619;
    }
    return hash >>> 0;
  } catch (e) {
    console.warn('[R-ServiceX-DB] hashString error:', e);
    return Math.floor(Math.random() * 1000000);
  }
}

// ENHANCED: Professional error handling utility
function createContextualError(type, context = {}) {
  const baseMessage = ERROR_MESSAGES[type] || 'An unexpected error occurred during download operation.';
  
  let contextInfo = '';
  if (context.filename) contextInfo += ` File: ${context.filename}.`;
  if (context.progress) contextInfo += ` Progress: ${context.progress}%.`;
  if (context.speed) contextInfo += ` Speed: ${context.speed}.`;
  if (context.remainingTime) contextInfo += ` Estimated time: ${context.remainingTime}.`;
  
  return baseMessage + contextInfo;
}

// ENHANCED: Download message generator
function generateDownloadMessage(concurrency, chunkSizeKB, totalSize) {
  const efficiency = concurrency > 8 ? 'maximum' : concurrency > 4 ? 'high' : 'optimal';
  const sizeCategory = totalSize > 100 * 1024 * 1024 ? 'large file' : 
                      totalSize > 10 * 1024 * 1024 ? 'medium file' : 'file';
  
  return `Downloading ${sizeCategory} using ${concurrency} parallel streams with ${chunkSizeKB}KB segments for ${efficiency} performance and reliability`;
}

/* ---------- Enhanced IndexedDB operations ---------- */
function openDB(){
  return new Promise((resolve, reject) => {
    try {
      if (!window.indexedDB) {
        reject(new Error(ERROR_MESSAGES.INITIALIZATION_FAILED));
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VER);
      
      req.onupgradeneeded = (event) => {
        try {
          const db = req.result;
          const oldVersion = event.oldVersion;
          
          console.log(`[R-ServiceX-DB] Upgrading database from version ${oldVersion} to ${DB_VER}`);
          
          if (oldVersion > 0 && oldVersion < DB_VER) {
            const storeNames = [STORE_META, STORE_CHUNKS, STORE_SESSIONS];
            for (const storeName of storeNames) {
              if (db.objectStoreNames.contains(storeName)) {
                db.deleteObjectStore(storeName);
                console.log(`[R-ServiceX-DB] Deleted existing store: ${storeName}`);
              }
            }
          }

          if (!db.objectStoreNames.contains(STORE_META)) {
            const metaStore = db.createObjectStore(STORE_META, { keyPath: 'id' });
            metaStore.createIndex('by_url', 'url', { unique: false });
            metaStore.createIndex('by_filename', 'fileName', { unique: false });
            metaStore.createIndex('by_created', 'createdAt', { unique: false });
            metaStore.createIndex('by_updated', 'updatedAt', { unique: false });
            metaStore.createIndex('by_status', 'status', { unique: false });
            console.log(`[R-ServiceX-DB] Created enhanced store: ${STORE_META}`);
          }
          
          if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
            const chunksStore = db.createObjectStore(STORE_CHUNKS, { keyPath: ['id','start'] });
            chunksStore.createIndex('by_id_start', ['id','start'], { unique: true });
            chunksStore.createIndex('by_id', 'id', { unique: false });
            chunksStore.createIndex('by_timestamp', 'timestamp', { unique: false });
            chunksStore.createIndex('by_size', 'size', { unique: false });
            console.log(`[R-ServiceX-DB] Created enhanced store: ${STORE_CHUNKS}`);
          }
          
          if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
            const sessionsStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'pageId' });
            sessionsStore.createIndex('by_active', 'isActive', { unique: false });
            sessionsStore.createIndex('by_download_id', 'downloadId', { unique: false });
            sessionsStore.createIndex('by_last_update', 'lastUpdate', { unique: false });
            console.log(`[R-ServiceX-DB] Created enhanced store: ${STORE_SESSIONS}`);
          }
        } catch (e) {
          console.error(`[R-ServiceX-DB] Database upgrade error:`, e);
          reject(new Error(ERROR_MESSAGES.INITIALIZATION_FAILED));
          return;
        }
      };
      
      req.onsuccess = () => {
        try {
          console.log(`[R-ServiceX-DB] Database opened successfully (v${DB_VER})`);
          resolve(req.result);
        } catch (e) {
          console.error(`[R-ServiceX-DB] Database success error:`, e);
          reject(new Error(ERROR_MESSAGES.INITIALIZATION_FAILED));
        }
      };
      
      req.onerror = () => {
        const error = req.error || new Error('Database open failed');
        console.error(`[R-ServiceX-DB] Database open failed:`, error);
        reject(new Error(ERROR_MESSAGES.INITIALIZATION_FAILED));
      };
      
      req.onblocked = () => {
        console.warn(`[R-ServiceX-DB] Database upgrade blocked`);
        setTimeout(() => {
          reject(new Error('Database upgrade blocked by other connections. Please close other tabs and try again.'));
        }, 5000);
      };

    } catch (e) {
      console.error(`[R-ServiceX-DB] Database initialization error:`, e);
      reject(new Error(ERROR_MESSAGES.INITIALIZATION_FAILED));
    }
  });
}

function getMeta(db, id) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !id || typeof id !== 'string') {
        resolve(null);
        return;
      }
      
      const tx = db.transaction(STORE_META, 'readonly'); 
      const req = tx.objectStore(STORE_META).get(id); 
      
      req.onsuccess = () => {
        try {
          resolve(req.result || null);
        } catch (e) {
          console.warn(`[R-ServiceX-DB] getMeta result error:`, e);
          resolve(null);
        }
      };
      
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] getMeta error for id ${id}:`, req.error);
        resolve(null);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] getMeta exception:`, e);
      resolve(null);
    }
  }); 
}

function putMeta(db, meta) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !meta || !meta.id || typeof meta.id !== 'string') {
        reject(new Error('Invalid metadata parameters'));
        return;
      }
      
      const validatedMeta = {
        id: String(meta.id),
        url: String(meta.url || ''),
        fileName: String(meta.fileName || 'download'),
        originalFileName: String(meta.originalFileName || meta.fileName || 'download'),
        totalBytes: Math.max(0, Number(meta.totalBytes) || 0),
        chunkSize: Math.max(1024, Number(meta.chunkSize) || DEFAULT_CHUNK_SIZE),
        completedStarts: Array.isArray(meta.completedStarts) ? meta.completedStarts : [],
        status: String(meta.status || 'pending'),
        createdAt: Number(meta.createdAt) || Date.now(),
        updatedAt: Date.now(),
        retryCount: Number(meta.retryCount) || 0,
        lastError: String(meta.lastError || ''),
        downloadSpeed: Number(meta.downloadSpeed) || 0,
        version: VERSION
      };
      
      const tx = db.transaction(STORE_META, 'readwrite'); 
      const req = tx.objectStore(STORE_META).put(validatedMeta); 
      
      req.onsuccess = () => resolve(); 
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] putMeta error:`, req.error);
        reject(req.error);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] putMeta exception:`, e);
      reject(e);
    }
  }); 
}

function deleteMeta(db, id) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!id || typeof id !== 'string') return resolve(); 
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }
      
      const tx = db.transaction(STORE_META, 'readwrite'); 
      const req = tx.objectStore(STORE_META).delete(id);
      
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] deleteMeta error:`, req.error);
        reject(req.error);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] deleteMeta exception:`, e);
      reject(e);
    }
  }); 
}

function putChunk(db, id, start, arrayBuffer) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !id || typeof start !== 'number' || !arrayBuffer) {
        reject(new Error('Invalid parameters for putChunk'));
        return;
      }
      
      if (start < 0 || !ArrayBuffer.isView(new Uint8Array(arrayBuffer))) {
        reject(new Error('Invalid chunk data'));
        return;
      }
      
      const chunkData = {
        id: String(id),
        start: Number(start),
        data: arrayBuffer,
        timestamp: Date.now(),
        size: arrayBuffer.byteLength,
        version: VERSION
      };
      
      const tx = db.transaction(STORE_CHUNKS, 'readwrite'); 
      const store = tx.objectStore(STORE_CHUNKS); 
      const req = store.put(chunkData); 
      
      req.onsuccess = () => resolve(); 
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] putChunk error:`, req.error);
        reject(req.error);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] putChunk exception:`, e);
      reject(e);
    }
  }); 
}

function listChunkStarts(db, id) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !id || typeof id !== 'string') {
        resolve([]);
        return;
      }
      
      const results = []; 
      const tx = db.transaction(STORE_CHUNKS, 'readonly'); 
      const index = tx.objectStore(STORE_CHUNKS).index('by_id_start'); 
      const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]); 
      const cursor = index.openCursor(range); 
      
      cursor.onsuccess = (event) => { 
        try {
          const cur = event.target.result; 
          if (!cur) { 
            resolve(results.sort((a, b) => a - b)); 
            return; 
          } 
          
          if (cur.value && typeof cur.value.start === 'number') {
            results.push(cur.value.start);
          }
          cur.continue(); 
        } catch (e) {
          console.warn(`[R-ServiceX-DB] listChunkStarts cursor processing error:`, e);
          cur.continue();
        }
      }; 
      
      cursor.onerror = () => {
        console.warn(`[R-ServiceX-DB] listChunkStarts cursor error:`, cursor.error);
        resolve(results.sort((a, b) => a - b));
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] listChunkStarts exception:`, e);
      resolve([]);
    }
  }); 
}

// ENHANCED: Improved blob system with better error handling
function readChunksInOrder(db, id) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !id || typeof id !== 'string') {
        resolve([]);
        return;
      }
      
      const chunks = []; 
      const tx = db.transaction(STORE_CHUNKS, 'readonly'); 
      const index = tx.objectStore(STORE_CHUNKS).index('by_id_start'); 
      const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]); 
      const cursor = index.openCursor(range); 
      
      cursor.onsuccess = (event) => { 
        try {
          const cur = event.target.result; 
          if (!cur) { 
            chunks.sort((a, b) => a.start - b.start);
            
            // ENHANCED: Validate chunk continuity
            let expectedStart = 0;
            const validatedChunks = [];
            
            for (const chunk of chunks) {
              if (chunk.start === expectedStart && chunk.data) {
                validatedChunks.push(chunk.data);
                expectedStart = chunk.start + chunk.data.byteLength;
              } else {
                console.warn(`[R-ServiceX-DB] Chunk gap detected at ${expectedStart}, found ${chunk.start}`);
                break;
              }
            }
            
            resolve(validatedChunks); 
            return; 
          } 
          
          if (cur.value && cur.value.data && typeof cur.value.start === 'number') {
            chunks.push({ 
              start: cur.value.start, 
              data: cur.value.data,
              size: cur.value.data.byteLength 
            });
          }
          cur.continue(); 
        } catch (e) {
          console.warn(`[R-ServiceX-DB] readChunksInOrder cursor processing error:`, e);
          cur.continue();
        }
      }; 
      
      cursor.onerror = () => {
        console.warn(`[R-ServiceX-DB] readChunksInOrder cursor error:`, cursor.error);
        resolve([]);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] readChunksInOrder exception:`, e);
      resolve([]);
    }
  }); 
}

function deleteChunks(db, id) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!id || typeof id !== 'string') return resolve(); 
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }
      
      const tx = db.transaction(STORE_CHUNKS, 'readwrite'); 
      const index = tx.objectStore(STORE_CHUNKS).index('by_id'); 
      const range = IDBKeyRange.only(id);
      const cursor = index.openCursor(range); 
      
      let deletedCount = 0;
      
      cursor.onsuccess = (event) => { 
        try {
          const cur = event.target.result; 
          if (cur) { 
            cur.delete(); 
            deletedCount++;
            cur.continue(); 
          } 
        } catch (e) {
          console.warn(`[R-ServiceX-DB] deleteChunks cursor processing error:`, e);
          if (cur) cur.continue();
        }
      }; 
      
      cursor.onerror = () => {
        console.warn(`[R-ServiceX-DB] deleteChunks cursor error:`, cursor.error);
        resolve();
      };
      tx.oncomplete = () => {
        console.log(`[R-ServiceX-DB] Deleted ${deletedCount} chunks for ID: ${id}`);
        resolve();
      }; 
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] deleteChunks exception:`, e);
      resolve();
    }
  }); 
}

function getSession(db, pageId) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !pageId || typeof pageId !== 'string') {
        resolve(null);
        return;
      }
      
      const tx = db.transaction(STORE_SESSIONS, 'readonly'); 
      const req = tx.objectStore(STORE_SESSIONS).get(pageId); 
      
      req.onsuccess = () => {
        try {
          resolve(req.result || null);
        } catch (e) {
          console.warn(`[R-ServiceX-DB] getSession result error:`, e);
          resolve(null);
        }
      };
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] getSession error:`, req.error);
        resolve(null);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] getSession exception:`, e);
      resolve(null);
    }
  }); 
}

function putSession(db, session) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db || !session || !session.pageId || typeof session.pageId !== 'string') {
        reject(new Error('Invalid parameters for putSession'));
        return;
      }
      
      const validatedSession = {
        pageId: String(session.pageId),
        isActive: Boolean(session.isActive),
        downloadId: session.downloadId ? String(session.downloadId) : null,
        downloadUrl: session.downloadUrl ? String(session.downloadUrl) : null,
        lastUpdate: Date.now(),
        userAgent: String(session.userAgent || 'unknown').slice(0, 100),
        tabTitle: String(session.tabTitle || 'unknown').slice(0, 100),
        version: VERSION
      };
      
      const tx = db.transaction(STORE_SESSIONS, 'readwrite'); 
      const req = tx.objectStore(STORE_SESSIONS).put(validatedSession); 
      
      req.onsuccess = () => resolve(); 
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] putSession error:`, req.error);
        reject(req.error);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] putSession exception:`, e);
      reject(e);
    }
  }); 
}

function deleteSession(db, pageId) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!pageId || typeof pageId !== 'string') return resolve(); 
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }
      
      const tx = db.transaction(STORE_SESSIONS, 'readwrite'); 
      const req = tx.objectStore(STORE_SESSIONS).delete(pageId);
      
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn(`[R-ServiceX-DB] deleteSession error:`, req.error);
        resolve();
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] deleteSession exception:`, e);
      resolve();
    }
  }); 
}

function getAllSessions(db) { 
  return new Promise((resolve, reject) => { 
    try {
      if (!db) {
        resolve([]);
        return;
      }
      
      const sessions = []; 
      const tx = db.transaction(STORE_SESSIONS, 'readonly'); 
      const cursor = tx.objectStore(STORE_SESSIONS).openCursor(); 
      
      cursor.onsuccess = (event) => { 
        try {
          const cur = event.target.result; 
          if (!cur) { 
            resolve(sessions); 
            return; 
          } 
          
          if (cur.value && cur.value.pageId) {
            sessions.push(cur.value);
          }
          cur.continue(); 
        } catch (e) {
          console.warn(`[R-ServiceX-DB] getAllSessions cursor processing error:`, e);
          if (cur) cur.continue();
        }
      }; 
      
      cursor.onerror = () => {
        console.warn(`[R-ServiceX-DB] getAllSessions cursor error:`, cursor.error);
        resolve(sessions);
      };
      
    } catch (e) {
      console.warn(`[R-ServiceX-DB] getAllSessions exception:`, e);
      resolve([]);
    }
  }); 
}

async function clearAllData(db) {
  console.log('[R-ServiceX-DB] Starting complete data clearing...');
  
  if (!db) {
    console.warn('[R-ServiceX-DB] Database not available for clearing');
    return;
  }
  
  const stores = [STORE_META, STORE_CHUNKS, STORE_SESSIONS];
  
  for (const storeName of stores) {
    let retryCount = 0;
    
    while (retryCount < MAX_RETRY_ATTEMPTS) {
      try {
        if (db.objectStoreNames.contains(storeName)) {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.clear();
            
            req.onsuccess = () => {
              console.log(`[R-ServiceX-DB] Cleared store: ${storeName}`);
              resolve();
            };
            req.onerror = () => {
              console.warn(`[R-ServiceX-DB] Error clearing store ${storeName}:`, req.error);
              reject(req.error);
            };
          });
          break;
        } else {
          console.log(`[R-ServiceX-DB] Store ${storeName} does not exist, skipping`);
          break;
        }
      } catch (e) {
        retryCount++;
        console.error(`[R-ServiceX-DB] Failed to clear store ${storeName} (attempt ${retryCount}):`, e);
        
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          console.error(`[R-ServiceX-DB] Max retries reached for store ${storeName}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.log('[R-ServiceX-DB] Complete data clearing finished');
}

async function checkQuota(requiredBytes) {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { supported: false, usage: 0, quota: 0, free: Infinity, sufficient: true };
    }
    
    const estimate = await navigator.storage.estimate();
    const usage = Number(estimate.usage) || 0;
    const quota = Number(estimate.quota) || 0;
    const free = Math.max(0, quota - usage);
    const requiredWithBuffer = (Number(requiredBytes) || 0) * 1.2;
    const sufficient = requiredBytes === 0 ? true : free >= requiredWithBuffer;
    
    console.log(`[R-ServiceX-DB] Storage: ${formatPrefer(usage)} used, ${formatPrefer(free)} free of ${formatPrefer(quota)}`);
    
    if (!sufficient) {
      console.warn(`[R-ServiceX-DB] Insufficient storage: need ${formatPrefer(requiredWithBuffer)}, have ${formatPrefer(free)}`);
    }
    
    return { supported: true, usage, quota, free, sufficient };
  } catch (e) {
    console.warn('[R-ServiceX-DB] Storage estimation failed:', e);
    return { supported: false, usage: 0, quota: 0, free: Infinity, sufficient: true };
  }
}

/* ---------- Enhanced Browser Background Manager ---------- */
class BrowserBackgroundManager {
  constructor() {
    this.isActive = false;
    this.dialogOpen = false;
    this.visibilityHandler = null;
    this.beforeUnloadHandler = null;
    this.initialized = false;
    this.performanceMetrics = {
      startTime: 0,
      backgroundTime: 0,
      foregroundTime: 0
    };
    
    try {
      this.setupEventListeners();
      this.initialized = true;
    } catch (e) {
      console.error('[R-ServiceX-DB] BrowserBackgroundManager initialization failed:', e);
    }
  }

  setupEventListeners() {
    try {
      this.visibilityHandler = () => {
        try {
          const now = Date.now();
          if (this.isActive && this.dialogOpen) {
            if (document.hidden) {
              console.log('[R-ServiceX-DB] Browser backgrounded, download continues');
              this.performanceMetrics.backgroundTime = now;
            } else {
              console.log('[R-ServiceX-DB] Browser foregrounded, download active');
              this.performanceMetrics.foregroundTime = now;
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in visibility handler:', e);
        }
      };

      this.beforeUnloadHandler = (event) => {
        try {
          if (this.isActive && this.dialogOpen) {
            console.log('[R-ServiceX-DB] Browser closing, download will stop');
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in beforeunload handler:', e);
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.visibilityHandler);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
      }
    } catch (e) {
      console.error('[R-ServiceX-DB] Error setting up event listeners:', e);
    }
  }

  setDialogState(isOpen) {
    try {
      this.dialogOpen = Boolean(isOpen);
      if (!isOpen) {
        this.isActive = false;
      }
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error setting dialog state:', e);
    }
  }

  setDownloadState(isActive) {
    try {
      this.isActive = Boolean(isActive);
      if (isActive) {
        this.performanceMetrics.startTime = Date.now();
      }
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error setting download state:', e);
    }
  }

  cleanup() {
    try {
      if (this.visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.visibilityHandler);
      }
      if (this.beforeUnloadHandler && typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
      this.isActive = false;
      this.dialogOpen = false;
      this.initialized = false;
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error during BrowserBackgroundManager cleanup:', e);
    }
  }
}

/* ---------- Enhanced Manager with comprehensive improvements ---------- */
class IDBDownloaderManager {
  constructor() { 
    this._dbPromise = null; 
    this.active = false; 
    this.current = null; 
    this.pageId = this._generatePageId();
    this.browserBackgroundManager = null;
    this.initialized = false;
    this.version = VERSION;
    this._performanceMetrics = {
      startTime: 0,
      bytesTransferred: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      errorCount: 0,
      retryCount: 0
    };
    
    try {
      this.browserBackgroundManager = new BrowserBackgroundManager();
      this.initialized = true;
      console.log(`[R-ServiceX-DB] Enhanced Manager v${VERSION} initialized with pageId: ${this.pageId}`);
    } catch (e) {
      console.error('[R-ServiceX-DB] Manager initialization failed:', e);
    }
  }

  _generatePageId() {
    try {
      const url = (typeof window !== 'undefined' && window.location) ? window.location.href : 'unknown';
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const combined = `${url}_${timestamp}_${random}`;
      return `page_${btoa(unescape(encodeURIComponent(combined))).slice(0, 24)}`;
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error generating page ID:', e);
      return `page_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  async _open() { 
    try {
      if (!this._dbPromise) {
        this._dbPromise = openDB();
      }
      return await this._dbPromise;
    } catch (e) {
      console.error('[R-ServiceX-DB] Failed to open database:', e);
      this._dbPromise = null;
      throw e;
    }
  }

  makeId(url) { 
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided to makeId');
      }
      return generateConsistentId(url);
    } catch (e) {
      console.warn('[R-ServiceX-DB] makeId error:', e);
      return String(Date.now()).slice(-16);
    }
  }

  async checkQuota(requiredBytes) { 
    try {
      return await checkQuota(requiredBytes);
    } catch (e) {
      console.warn('[R-ServiceX-DB] checkQuota error:', e);
      return { supported: false, usage: 0, quota: 0, free: Infinity, sufficient: true };
    }
  }

  async getMeta(id) { 
    try {
      if (!id || typeof id !== 'string') return null;
      
      const db = await this._open(); 
      return await getMeta(db, id);
    } catch (e) {
      console.warn('[R-ServiceX-DB] getMeta failed:', e);
      return null;
    }
  }

  async _checkForActiveDownloads() {
    try {
      const db = await this._open();
      const sessions = await getAllSessions(db);

      const now = Date.now();
      const activeSessions = sessions.filter(session => {
        try {
          return session.pageId !== this.pageId && 
                 session.isActive && 
                 (now - session.lastUpdate) < SESSION_TIMEOUT;
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error filtering session:', e);
          return false;
        }
      });

      return activeSessions.length > 0 ? activeSessions[0] : null;
    } catch (e) {
      console.warn('[R-ServiceX-DB] _checkForActiveDownloads failed:', e);
      return null;
    }
  }

  async _updateSession(isActive, downloadId = null, downloadUrl = null) {
    try {
      const db = await this._open();
      const session = {
        pageId: this.pageId,
        isActive: Boolean(isActive),
        downloadId: downloadId ? String(downloadId) : null,
        downloadUrl: downloadUrl ? String(downloadUrl) : null,
        lastUpdate: Date.now(),
        userAgent: (typeof navigator !== 'undefined') ? navigator.userAgent.slice(0, 100) : 'unknown',
        tabTitle: (typeof document !== 'undefined') ? document.title.slice(0, 100) : 'unknown',
        version: VERSION
      };
      await putSession(db, session);
    } catch (e) {
      console.warn('[R-ServiceX-DB] _updateSession failed:', e);
    }
  }

  async _cleanupExpiredSessions() {
    try {
      const db = await this._open();
      const sessions = await getAllSessions(db);
      const now = Date.now();
      let cleaned = 0;

      for (const session of sessions) {
        try {
          if (session && session.lastUpdate && (now - session.lastUpdate) > SESSION_TIMEOUT) {
            await deleteSession(db, session.pageId);
            cleaned++;
          }
        } catch (e) {
          console.warn(`[R-ServiceX-DB] Error cleaning session ${session?.pageId}:`, e);
        }
      }

      if (cleaned > 0) {
        console.log(`[R-ServiceX-DB] Cleaned up ${cleaned} expired sessions`);
      }
    } catch (e) {
      console.warn('[R-ServiceX-DB] _cleanupExpiredSessions failed:', e);
    }
  }

  async start(options = {}) {
    try {
      if (!this.initialized) {
        throw new Error(ERROR_MESSAGES.INITIALIZATION_FAILED);
      }

      await this._cleanupExpiredSessions();

      const activeDownload = await this._checkForActiveDownloads();
      if (activeDownload) {
        const downloadIdDisplay = activeDownload.downloadId ? activeDownload.downloadId.slice(0, 8) + '...' : 'unknown';
        throw new Error(ERROR_MESSAGES.CONCURRENT_ACTIVE + ` Active download: ${downloadIdDisplay}`);
      }

      if (this.active && !this.current) this.active = false;
      if (this.active) throw new Error(ERROR_MESSAGES.CONCURRENT_ACTIVE);

      const opt = {
        chunkSize: Number(options.chunkSize) || DEFAULT_CHUNK_SIZE,
        concurrency: Math.max(1, Math.min(16, Number(options.concurrency) || DEFAULT_CONCURRENCY)),
        url: String(options.url || ''),
        fileName: options.fileName ? String(options.fileName) : null,
        fileSizeBytes: Number(options.fileSizeBytes) || 0,
        id: options.id ? String(options.id) : null
      };
      
      if (!opt.url) throw new Error('url required');

      const id = opt.id || this.makeId(opt.url);
      const db = await this._open();

      const task = new DownloadTask({
        db, 
        id,
        url: opt.url,
        preferredFileName: opt.fileName,
        totalBytesHint: opt.fileSizeBytes,
        chunkSize: opt.chunkSize,
        concurrency: opt.concurrency,
        manager: this
      });

      await task.prepare();

      this.current = task;
      this.active = true;
      this._performanceMetrics.startTime = Date.now();

      await this._updateSession(true, id, opt.url);

      if (this.browserBackgroundManager) {
        this.browserBackgroundManager.setDialogState(true);
        this.browserBackgroundManager.setDownloadState(true);
      }

      task.on('complete', async () => { 
        try {
          if (this.current === task) { 
            this.current = null; 
            this.active = false;
            if (this.browserBackgroundManager) {
              this.browserBackgroundManager.setDownloadState(false);
            }
            await this._updateSession(false);
            console.log('[R-ServiceX-DB] Download completed and cleaned up');
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in complete handler:', e);
        }
      });

      task.on('error', async (errorData) => { 
        try {
          this._performanceMetrics.errorCount++;
          console.log('[R-ServiceX-DB] Task error recorded:', errorData);
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in error handler:', e);
        }
      });

      task.on('status', async ({ text } = {}) => { 
        try {
          if (text && /cancelled/i.test(String(text))) { 
            if (this.current === task) { 
              this.current = null; 
              this.active = false;
              if (this.browserBackgroundManager) {
                this.browserBackgroundManager.setDownloadState(false);
              }
              await this._updateSession(false);
              console.log('[R-ServiceX-DB] Download cancelled, cleaned up');
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in status handler:', e);
        }
      });

      console.log('[R-ServiceX-DB] Prepared task with ID:', id);
      return task;
    } catch (e) {
      console.error('[R-ServiceX-DB] start failed:', e);
      throw e;
    }
  }

  async pause() { 
    try {
      if (!this.current) throw new Error('No active download'); 
      return await this.current.pause();
    } catch (e) {
      console.error('[R-ServiceX-DB] pause failed:', e);
      throw e;
    }
  }

  // ENHANCED: Resume method with comprehensive improvements
  async resume(downloadId = null, url = null, fileName = null, fileSizeBytes = 0, chunkSize = DEFAULT_CHUNK_SIZE, concurrency = DEFAULT_CONCURRENCY) { 
    try {
      console.log('[R-ServiceX-DB] Resume method called with:', { downloadId, url, fileName });

      if (this.current) {
        console.log('[R-ServiceX-DB] Resuming current task');
        return await this.current.resume();
      }

      let targetId = downloadId;
      let targetMeta = null;

      if (!targetId && url) {
        targetId = this.makeId(url);
        console.log('[R-ServiceX-DB] Generated ID from URL:', targetId);
      }
      
      if (targetId) {
        const db = await this._open();
        targetMeta = await getMeta(db, targetId);
        console.log('[R-ServiceX-DB] Found metadata:', targetMeta);
        
        if (!targetMeta) {
          console.log('[R-ServiceX-DB] No metadata found for resume');
          targetId = null;
          targetMeta = null;
        }
      }
      
      if (!targetId) {
        const existing = await this.checkForExistingDownload();
        if (existing && !existing.fromOtherPage) {
          targetId = existing.id;
          targetMeta = existing.meta;
          console.log('[R-ServiceX-DB] Using existing download:', targetId);
        }
      }

      if (targetId && targetMeta) {
        console.log('[R-ServiceX-DB] Creating resume task for:', targetId);
        const db = await this._open();
        
        const task = new DownloadTask({
          db,
          id: targetId,
          url: url || targetMeta.url,
          preferredFileName: fileName || targetMeta.fileName,
          totalBytesHint: fileSizeBytes || targetMeta.totalBytes,
          chunkSize: chunkSize || targetMeta.chunkSize || DEFAULT_CHUNK_SIZE,
          concurrency: Math.max(1, Math.min(16, concurrency)),
          manager: this
        });

        task.meta = { ...targetMeta };
        
        try {
          await task._refreshCompletedStarts();
          console.log('[R-ServiceX-DB] Refreshed completed starts:', task.meta.completedStarts?.length || 0);
        } catch (refreshError) {
          console.warn('[R-ServiceX-DB] Failed to refresh starts, using existing:', refreshError);
        }

        this.current = task;
        this.active = true;

        await this._updateSession(true, targetId, url || targetMeta.url);

        if (this.browserBackgroundManager) {
          this.browserBackgroundManager.setDialogState(true);
          this.browserBackgroundManager.setDownloadState(true);
        }

        task.on('complete', async () => { 
          try {
            if (this.current === task) { 
              this.current = null; 
              this.active = false;
              if (this.browserBackgroundManager) {
                this.browserBackgroundManager.setDownloadState(false);
              }
              await this._updateSession(false);
            }
          } catch (e) {
            console.warn('[R-ServiceX-DB] Error in resume complete handler:', e);
          }
        });

        task.on('error', async (errorData) => { 
          try {
            this._performanceMetrics.errorCount++;
            console.log('[R-ServiceX-DB] Task error in resume:', errorData);
          } catch (e) {
            console.warn('[R-ServiceX-DB] Error in resume error handler:', e);
          }
        });

        task.on('status', async ({ text } = {}) => { 
          try {
            if (text && /cancelled/i.test(String(text))) { 
              if (this.current === task) { 
                this.current = null; 
                this.active = false;
                if (this.browserBackgroundManager) {
                  this.browserBackgroundManager.setDownloadState(false);
                }
                await this._updateSession(false);
              }
            }
          } catch (e) {
            console.warn('[R-ServiceX-DB] Error in resume status handler:', e);
          }
        });

        console.log('[R-ServiceX-DB] Resume task created successfully');
        return task;
      }

      throw new Error(ERROR_MESSAGES.RESUME_UNAVAILABLE);
    } catch (e) {
      console.error('[R-ServiceX-DB] resume failed:', e);
      throw e;
    }
  }

  async cancelCurrentAndClear() {
    try {
      if (this.current) {
        try { 
          await this.current.cancelAndClear(); 
        } catch (e) { 
          console.warn('[R-ServiceX-DB] Cancel current error:', e); 
        }
      }
      this.active = false;
      this.current = null;
      if (this.browserBackgroundManager) {
        this.browserBackgroundManager.setDownloadState(false);
      }
      await this._updateSession(false);
    } catch (e) {
      console.warn('[R-ServiceX-DB] cancelCurrentAndClear failed:', e);
    }
  }

  async clearById(id) {
    try {
      if (!id || typeof id !== 'string') return;
      
      const db = await this._open();
      await deleteChunks(db, id);
      await deleteMeta(db, id);
      console.log(`[R-ServiceX-DB] Cleared data for ID: ${id}`);
    } catch (e) {
      console.warn(`[R-ServiceX-DB] clearById failed for ${id}:`, e);
    }
  }

  async completeCleanup(id) {
    try {
      if (!id || typeof id !== 'string') return;
      
      const db = await this._open();

      await deleteChunks(db, id);
      await deleteMeta(db, id);
      await this._updateSession(false);

      this.active = false;
      this.current = null;
      if (this.browserBackgroundManager) {
        this.browserBackgroundManager.setDownloadState(false);
      }

      console.log('[R-ServiceX-DB] Complete cleanup performed for:', id);
    } catch (e) {
      console.warn(`[R-ServiceX-DB] completeCleanup failed for ${id}:`, e);
    }
  }

  async clearAllData() {
    try {
      const db = await this._open();
      await clearAllData(db);
      
      this.active = false;
      this.current = null;
      if (this.browserBackgroundManager) {
        this.browserBackgroundManager.setDownloadState(false);
      }
      
      console.log('[R-ServiceX-DB] All data cleared completely');
    } catch (e) {
      console.warn('[R-ServiceX-DB] clearAllData failed:', e);
    }
  }

  setDialogOpen(isOpen) {
    try {
      if (this.browserBackgroundManager) {
        this.browserBackgroundManager.setDialogState(isOpen);
        if (!isOpen && this.current) {
          this.current.cancelAndClear().catch(e => {
            console.warn('[R-ServiceX-DB] Error canceling download on dialog close:', e);
          });
        }
      }
    } catch (e) {
      console.warn('[R-ServiceX-DB] setDialogOpen failed:', e);
    }
  }

  async checkForExistingDownload() {
    try {
      const db = await this._open();
      const sessions = await getAllSessions(db);
      const allMetas = [];
      
      for (const session of sessions) {
        try {
          if (session && session.downloadId) {
            const meta = await getMeta(db, session.downloadId);
            if (meta && meta.completedStarts && meta.totalBytes) {
              const allStarts = this._getAllStarts(meta);
              if (Array.isArray(meta.completedStarts) && meta.completedStarts.length < allStarts.length) {
                allMetas.push({
                  id: session.downloadId,
                  meta: meta,
                  url: meta.url,
                  fileName: meta.fileName,
                  totalBytes: meta.totalBytes,
                  completedStarts: meta.completedStarts,
                  fromCurrentPage: session.pageId === this.pageId,
                  sessionAge: Date.now() - (session.lastUpdate || 0)
                });
              }
            }
          }
        } catch (e) {
          console.warn(`[R-ServiceX-DB] Error checking session ${session?.pageId}:`, e);
        }
      }

      try {
        const tx = db.transaction(STORE_META, 'readonly');
        const store = tx.objectStore(STORE_META);
        const request = store.openCursor();
        
        await new Promise((resolve, reject) => {
          request.onsuccess = (event) => {
            try {
              const cursor = event.target.result;
              if (cursor) {
                const meta = cursor.value;
                if (meta && meta.completedStarts && meta.totalBytes) {
                  const allStarts = this._getAllStarts(meta);
                  if (Array.isArray(meta.completedStarts) && meta.completedStarts.length < allStarts.length) {
                    const hasSession = sessions.some(s => s && s.downloadId === meta.id);
                    if (!hasSession) {
                      allMetas.push({
                        id: meta.id,
                        meta: meta,
                        url: meta.url,
                        fileName: meta.fileName,
                        totalBytes: meta.totalBytes,
                        completedStarts: meta.completedStarts,
                        fromCurrentPage: false,
                        sessionAge: Date.now() - (meta.updatedAt || meta.createdAt || 0),
                        orphaned: true
                      });
                    }
                  }
                }
                cursor.continue();
              } else {
                resolve();
              }
            } catch (e) {
              console.warn('[R-ServiceX-DB] Error processing cursor result:', e);
              try {
                if (cursor) cursor.continue();
              } catch (e2) {
                resolve();
              }
            }
          };
          request.onerror = () => {
            console.warn('[R-ServiceX-DB] Cursor request error:', request.error);
            resolve();
          };
        });
      } catch (e) {
        console.warn('[R-ServiceX-DB] Error checking orphaned metadata:', e);
      }

      if (allMetas.length === 0) return null;

      allMetas.sort((a, b) => {
        try {
          if (a.fromCurrentPage && !b.fromCurrentPage) return -1;
          if (!a.fromCurrentPage && b.fromCurrentPage) return 1;
          return (a.sessionAge || 0) - (b.sessionAge || 0);
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error sorting metas:', e);
          return 0;
        }
      });

      const bestMatch = allMetas[0];
      
      if (bestMatch && !bestMatch.fromCurrentPage && !bestMatch.orphaned) {
        bestMatch.fromOtherPage = true;
      }

      return bestMatch;
      
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error checking for existing downloads:', e);
      return null;
    }
  }

  _getAllStarts(meta) {
    try {
      if (!meta || typeof meta.totalBytes !== 'number' || typeof meta.chunkSize !== 'number') {
        return [0];
      }
      
      const total = meta.totalBytes;
      const chunkSize = meta.chunkSize;
      
      if (total <= 0 || chunkSize <= 0) return [0];
      
      const arr = [];
      for (let s = 0; s < total; s += chunkSize) {
        arr.push(s);
      }
      return arr;
    } catch (e) {
      console.warn('[R-ServiceX-DB] _getAllStarts error:', e);
      return [0];
    }
  }
}

/* ---------- Enhanced DownloadTask with comprehensive improvements ---------- */
class DownloadTask {
  constructor({ db, id, url, preferredFileName = null, totalBytesHint = 0, chunkSize = DEFAULT_CHUNK_SIZE, concurrency = DEFAULT_CONCURRENCY, manager = null }) {
    try {
      this.db = db;
      this.id = String(id || '');
      this.url = String(url || '');
      this.preferredFileName = preferredFileName ? String(preferredFileName) : null;
      this.totalBytesHint = Number(totalBytesHint) || 0;
      this.chunkSize = Math.max(1024, Number(chunkSize) || DEFAULT_CHUNK_SIZE);
      this.concurrency = Math.max(1, Math.min(16, Number(concurrency) || DEFAULT_CONCURRENCY));
      this.manager = manager;
      this.version = VERSION;

      this._listeners = new Map();
      this._aborts = new Map();
      this._running = false;
      this._paused = false;
      this._pauseRequested = false;
      this._resumeRequested = false;
      this._stopNewFetches = false;
      this._cancelled = false;
      this.meta = null;
      this._speedBps = 0;
      this._lastUpdateTime = nowMs();
      this._lastBytesSeen = 0;
      this._retryCount = 0;
      this._initialized = true;
      this._progressUpdateTimer = null;
      this._connectionErrors = 0;
      this._performanceData = {
        startTime: 0,
        chunks: [],
        speeds: [],
        errors: []
      };
      
      if (!this.id || !this.url) {
        throw new Error('Invalid task parameters: id and url required');
      }
    } catch (e) {
      console.error('[R-ServiceX-DB] DownloadTask constructor error:', e);
      throw e;
    }
  }

  on(ev, fn) { 
    try {
      if (!ev || typeof ev !== 'string' || typeof fn !== 'function') return;
      
      const listeners = this._listeners.get(ev) || [];
      listeners.push(fn);
      this._listeners.set(ev, listeners);
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error adding event listener:', e);
    }
  }
  
  emit(ev, d) { 
    try {
      if (!ev || typeof ev !== 'string') return;
      
      const listeners = this._listeners.get(ev) || [];
      listeners.forEach(f => { 
        try { 
          f(d); 
        } catch (e) { 
          console.error('[R-ServiceX-DB] Event handler error:', e); 
        } 
      });
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error emitting event:', e);
    }
  }

  async prepare() {
    try {
      if (!this._initialized) {
        throw new Error(ERROR_MESSAGES.INITIALIZATION_FAILED);
      }

      let m = await getMeta(this.db, this.id);
      if (m) {
        this.meta = m;
        if (!this.meta.chunkSize || this.meta.chunkSize <= 0) {
          this.meta.chunkSize = this.chunkSize;
        }
        
        const starts = await listChunkStarts(this.db, this.id);
        const existingStarts = Array.isArray(this.meta.completedStarts) ? this.meta.completedStarts : [];
        const allStarts = Array.isArray(starts) ? starts : [];
        
        const set = new Set([...existingStarts, ...allStarts]);
        this.meta.completedStarts = Array.from(set).sort((a, b) => a - b);
        this.meta.version = VERSION;
        await putMeta(this.db, this.meta);
        return;
      }

      let total = this.totalBytesHint || 0;
      let filename = this.preferredFileName || this._extractFilenameFromUrl(this.url);

      let headRetries = 0;
      while (headRetries < MAX_RETRY_ATTEMPTS) {
        try {
          const head = await fetch(this.url, { 
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(CONNECTION_TIMEOUT),
            headers: {
              'User-Agent': (typeof navigator !== 'undefined') ? navigator.userAgent : 'R-ServiceX-Downloader/1.0.0'
            }
          });
          
          if (head && head.ok) {
            const cl = head.headers.get('Content-Length');
            if (cl && !isNaN(parseInt(cl, 10))) {
              total = parseInt(cl, 10);
            }
            
            const cd = head.headers.get('Content-Disposition');
            const parsedFilename = this._parseContentDisposition(cd);
            if (parsedFilename) {
              filename = parsedFilename;
            }
          }
          break;
        } catch (e) {
          headRetries++;
          console.warn(`[R-ServiceX-DB] HEAD request failed (attempt ${headRetries}):`, e);
          
          if (headRetries >= MAX_RETRY_ATTEMPTS) {
            console.warn('[R-ServiceX-DB] Max HEAD request retries reached, continuing with defaults');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      filename = sanitizeFilename(filename);
      if (filename && !filename.includes('.') && this.url) {
        const urlExt = this._extractExtensionFromUrl(this.url);
        if (urlExt) {
          filename += '.' + urlExt;
        }
      }

      this.meta = {
        id: this.id,
        url: this.url,
        fileName: filename,
        originalFileName: filename,
        totalBytes: Math.max(0, total),
        chunkSize: this.chunkSize,
        completedStarts: [],
        status: 'prepared',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        lastError: '',
        downloadSpeed: 0,
        version: VERSION
      };
      
      await putMeta(this.db, this.meta);
      console.log(`[R-ServiceX-DB] Prepared download:`, {
        id: this.id,
        fileName: filename,
        totalBytes: total,
        chunkSize: this.chunkSize
      });
    } catch (e) {
      console.error('[R-ServiceX-DB] prepare failed:', e);
      throw e;
    }
  }

  _extractFilenameFromUrl(url) {
    try {
      if (!url || typeof url !== 'string') return 'download';
      
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').pop() || 'download';
      return decodeURIComponent(filename);
    } catch (e) {
      try {
        const filename = url.split('/').pop() || 'download';
        return decodeURIComponent(filename);
      } catch (e2) {
        return url.split('/').pop() || 'download';
      }
    }
  }

  _extractExtensionFromUrl(url) {
    try {
      if (!url || typeof url !== 'string') return null;
      
      const pathname = new URL(url).pathname;
      const parts = pathname.split('.');
      if (parts.length > 1) {
        const ext = parts[parts.length - 1].split(/[?#]/)[0];
        return ext && ext.length <= 5 && /^[a-zA-Z0-9]+$/.test(ext) ? ext : null;
      }
      return null;
    } catch (e) {
      try {
        const parts = url.split('.');
        if (parts.length > 1) {
          const ext = parts[parts.length - 1].split(/[?#]/)[0];
          return ext && ext.length <= 5 && /^[a-zA-Z0-9]+$/.test(ext) ? ext : null;
        }
        return null;
      } catch (e2) {
        return null;
      }
    }
  }

  _parseContentDisposition(hdr) {
    try {
      if (!hdr || typeof hdr !== 'string') return null;
      
      const encodedMatch = hdr.match(/filename\*\s*=\s*([^']*)'([^']*)'(.+)/i);
      if (encodedMatch && encodedMatch[3]) {
        try {
          return decodeURIComponent(encodedMatch[3]);
        } catch (e) {
          console.warn('[R-ServiceX-DB] Failed to decode RFC 5987 filename:', e);
        }
      }
      
      const quotedMatch = hdr.match(/filename\s*=\s*"([^"]+)"/i);
      if (quotedMatch && quotedMatch[1]) {
        return quotedMatch[1].trim();
      }
      
      const unquotedMatch = hdr.match(/filename\s*=\s*([^;]+)/i);
      if (unquotedMatch && unquotedMatch[1]) {
        return unquotedMatch[1].trim();
      }
      
      return null;
    } catch (e) {
      console.warn('[R-ServiceX-DB] _parseContentDisposition error:', e);
      return null;
    }
  }

  _allStarts() {
    try {
      if (!this.meta || typeof this.meta.totalBytes !== 'number' || typeof this.meta.chunkSize !== 'number') {
        return [0];
      }
      
      const total = this.meta.totalBytes;
      const chunkSize = this.meta.chunkSize;
      
      if (total <= 0 || chunkSize <= 0) return [0];
      
      const arr = [];
      for (let s = 0; s < total; s += chunkSize) {
        arr.push(s);
      }
      return arr;
    } catch (e) {
      console.warn('[R-ServiceX-DB] _allStarts error:', e);
      return [0];
    }
  }

  async _refreshCompletedStarts() {
    try {
      if (!this.meta) {
        console.warn('[R-ServiceX-DB] No meta available for refresh');
        return [];
      }
      
      const starts = await listChunkStarts(this.db, this.id);
      const existingStarts = Array.isArray(this.meta.completedStarts) ? this.meta.completedStarts : [];
      const newStarts = Array.isArray(starts) ? starts : [];
      
      const set = new Set([...existingStarts, ...newStarts]);
      this.meta.completedStarts = Array.from(set).sort((a, b) => a - b);
      this.meta.updatedAt = Date.now();
      this.meta.version = VERSION;
      
      await putMeta(this.db, this.meta);
      return this.meta.completedStarts;
    } catch (e) {
      console.warn('[R-ServiceX-DB] _refreshCompletedStarts failed:', e);
      return this.meta ? (this.meta.completedStarts || []) : [];
    }
  }

  async _pendingStarts() {
    try {
      const all = this._allStarts();
      await this._refreshCompletedStarts();
      const done = new Set(this.meta.completedStarts || []);
      return all.filter(s => !done.has(s));
    } catch (e) {
      console.warn('[R-ServiceX-DB] _pendingStarts failed:', e);
      return [];
    }
  }

  // ENHANCED: Real-time progress update system
  _startProgressUpdates() {
    try {
      if (this._progressUpdateTimer) {
        clearInterval(this._progressUpdateTimer);
      }

      this._progressUpdateTimer = setInterval(() => {
        try {
          if (!this._running || this._paused || this._cancelled) {
            return;
          }

          const total = this.meta?.totalBytes || 0;
          if (total > 0) {
            const percent = Math.round((this._lastBytesSeen / total) * 1000) / 10;
            this.emit('progress', { 
              receivedBytes: this._lastBytesSeen, 
              totalBytes: total, 
              percent 
            });
          }

          if (this._speedBps > 0) {
            this.emit('speed', { 
              pretty: humanBytes(this._speedBps) + '/s', 
              bps: this._speedBps 
            });
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in progress update timer:', e);
        }
      }, PROGRESS_UPDATE_INTERVAL);
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error starting progress updates:', e);
    }
  }

  _stopProgressUpdates() {
    try {
      if (this._progressUpdateTimer) {
        clearInterval(this._progressUpdateTimer);
        this._progressUpdateTimer = null;
      }
    } catch (e) {
      console.warn('[R-ServiceX-DB] Error stopping progress updates:', e);
    }
  }

  // ENHANCED: Fetch range with better error handling and connection loss recovery
  async _fetchRange(start, end, onBytes) {
    try {
      if (this._cancelled || this._stopNewFetches) return false;
      
      if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end < start) {
        throw new Error('Invalid range parameters');
      }

      const ac = new AbortController();
      this._aborts.set(start, ac);

      const headers = { 
        'Range': `bytes=${start}-${end}`,
        'User-Agent': (typeof navigator !== 'undefined') ? navigator.userAgent : 'R-ServiceX-Downloader/1.0.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      };
      
      const fetchWithTimeout = (url, options, timeout = CONNECTION_TIMEOUT) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };

      const resp = await fetchWithTimeout(this.url, { 
        headers, 
        signal: ac.signal,
        cache: 'no-cache',
        mode: 'cors'
      });

      if (!(resp.status === 206 || resp.status === 200)) {
        throw new Error(`Range request failed: ${resp.status} ${resp.statusText}`);
      }

      const arr = await resp.arrayBuffer();

      if (this._cancelled) return false;

      if (!arr || arr.byteLength === 0) {
        throw new Error('Empty chunk received');
      }

      await putChunk(this.db, this.id, start, arr);
      
      if (!this.meta.completedStarts.includes(start)) {
        this.meta.completedStarts.push(start);
        this.meta.completedStarts.sort((a, b) => a - b);
        this.meta.updatedAt = Date.now();
        this.meta.status = 'downloading';
        this.meta.version = VERSION;
        await putMeta(this.db, this.meta);
      }

      if (onBytes && typeof onBytes === 'function') {
        onBytes(arr.byteLength);
      }
      
      return true;

    } catch (err) {
      const isAbort = err && (err.name === 'AbortError' || /abort/i.test(String(err)));
      if (isAbort) {
        return false;
      }
      
      const isConnectionError = err && (
        /network/i.test(String(err)) ||
        /timeout/i.test(String(err)) ||
        /fetch/i.test(String(err)) ||
        /connection/i.test(String(err)) ||
        err.name === 'TypeError' ||
        err.name === 'NetworkError'
      );

      if (isConnectionError) {
        this._connectionErrors++;
        console.warn(`[R-ServiceX-DB] Connection error for range ${start}-${end}:`, err.message);
        throw new Error(`Connection lost: ${err.message}`);
      }

      console.error(`[R-ServiceX-DB] Fetch range ${start}-${end} failed:`, err);
      throw err;
    } finally {
      this._aborts.delete(start);
    }
  }

        // ENHANCED: File assembly with improved blob system and filename URL support
  async _assembleAndClear() {
    try {
      console.log('[R-ServiceX-DB] Assembling file from chunks...');
      const bufs = await readChunksInOrder(this.db, this.id);
      
      if (!Array.isArray(bufs) || bufs.length === 0) {
        throw new Error(ERROR_MESSAGES.ASSEMBLY_FAILED);
      }
      
      // ENHANCED: Validate total size matches expected
      const totalAssembledSize = bufs.reduce((sum, buf) => sum + (buf?.byteLength || 0), 0);
      const expectedSize = this.meta?.totalBytes || 0;
      
      if (expectedSize > 0 && Math.abs(totalAssembledSize - expectedSize) > this.chunkSize) {
        console.warn(`[R-ServiceX-DB] Size mismatch: assembled ${totalAssembledSize}, expected ${expectedSize}`);
      }
      
      let finalFileName = this.meta.fileName || this.meta.originalFileName || this.preferredFileName || 'download';
      finalFileName = sanitizeFilename(finalFileName);
      
      // ENHANCED: Improved MIME type detection
      let mimeType = 'application/octet-stream';
      if (finalFileName) {
        const ext = finalFileName.split('.').pop()?.toLowerCase();
        const mimeMap = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'txt': 'text/plain',
          'rtf': 'application/rtf',
          'zip': 'application/zip',
          'rar': 'application/x-rar-compressed',
          '7z': 'application/x-7z-compressed',
          'tar': 'application/x-tar',
          'gz': 'application/gzip',
          'bz2': 'application/x-bzip2',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'avi': 'video/x-msvideo',
          'mov': 'video/quicktime',
          'wmv': 'video/x-ms-wmv',
          'flv': 'video/x-flv',
          'mkv': 'video/x-matroska',
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'flac': 'audio/flac',
          'aac': 'audio/aac',
          'm4a': 'audio/mp4',
          'html': 'text/html',
          'css': 'text/css',
          'js': 'application/javascript',
          'json': 'application/json',
          'xml': 'application/xml',
          'csv': 'text/csv'
        };
        mimeType = mimeMap[ext] || mimeType;
      }
      
      // ENHANCED: Create blob with better options
      const blob = new Blob(bufs, { 
        type: mimeType,
        endings: 'native'
      });
      
      console.log(`[R-ServiceX-DB] File assembled: ${finalFileName} (${formatPrefer(blob.size)}) - ${mimeType}`);

      await this._completeCleanup();

      return { 
        blob, 
        fileName: finalFileName,
        mimeType,
        size: blob.size
      };
    } catch (e) {
      console.error('[R-ServiceX-DB] _assembleAndClear failed:', e);
      throw e;
    }
  }

  async _completeCleanup() {
    try {
      this._stopProgressUpdates();
      
      await deleteChunks(this.db, this.id);
      await deleteMeta(this.db, this.id);

      if (this.manager) {
        await this.manager._updateSession(false);
        this.manager.active = false;
        this.manager.current = null;
        if (this.manager.browserBackgroundManager) {
          this.manager.browserBackgroundManager.setDownloadState(false);
        }
      }

      console.log('[R-ServiceX-DB] Complete cleanup performed');
    } catch (e) {
      console.error('[R-ServiceX-DB] Error during cleanup:', e);
    }
  }

  async start() {
    try {
      if (this._running) {
        console.log('[R-ServiceX-DB] Start called but task already running');
        return;
      }

      if (!this._initialized) {
        throw new Error(ERROR_MESSAGES.INITIALIZATION_FAILED);
      }

      this._cancelled = false;
      this._stopNewFetches = false;
      this._pauseRequested = false;
      this._resumeRequested = false;
      this._retryCount = 0;
      this._connectionErrors = 0;

      if (!this.meta) await this.prepare();
      await this._refreshCompletedStarts();

      const total = this.meta.totalBytes || 0;
      this.emit('start', { totalBytes: total, fileName: this.meta.fileName });

      const allStarts = this._allStarts();
      const completedStarts = Array.isArray(this.meta.completedStarts) ? this.meta.completedStarts : [];
      
      if (allStarts.length > 0 && completedStarts.length === allStarts.length) {
        this.emit('status', { text: PROGRESS_MESSAGES.ASSEMBLING });
        const result = await this._assembleAndClear();
        
        // ENHANCED: Create blob URL with filename metadata for better browser compatibility
        const blobUrl = URL.createObjectURL(result.blob);
        const enhancedBlobUrl = `${blobUrl}#filename=${encodeURIComponent(result.fileName)}`;
        
        this.emit('complete', { 
          href: enhancedBlobUrl, 
          fileName: result.fileName,
          blob: result.blob,
          mimeType: result.mimeType,
          size: result.size
        });
        return;
      }

      this._running = true;
      this._paused = false;
      this._lastUpdateTime = nowMs();
      this._lastBytesSeen = 0;
      this._speedBps = 0;
      this._performanceData.startTime = nowMs();

      let downloadedSoFar = 0;
      completedStarts.forEach(s => {
        const chunkSize = Math.min(this.meta.chunkSize || DEFAULT_CHUNK_SIZE, Math.max(0, total - s));
        downloadedSoFar += chunkSize;
      });
      this._lastBytesSeen = downloadedSoFar;

      this._startProgressUpdates();

      const initialPercent = total > 0 ? Math.round((downloadedSoFar / total) * 1000) / 10 : 0;
      this.emit('progress', { receivedBytes: downloadedSoFar, totalBytes: total, percent: initialPercent });

      const onChunkBytes = (n) => {
        try {
          downloadedSoFar += n;
          this._lastBytesSeen = downloadedSoFar;
          const now = nowMs();
          
          const dt = (now - this._lastUpdateTime) / 1000;
          if (dt >= 0.4) {
            const delta = downloadedSoFar - (this._lastBytesSeen - n);
            this._speedBps = Math.round(delta / dt);
            this._lastUpdateTime = now;
            
            // Track performance data
            this._performanceData.speeds.push(this._speedBps);
            if (this._performanceData.speeds.length > 100) {
              this._performanceData.speeds.shift();
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-DB] Error in onChunkBytes:', e);
        }
      };

      let pending = await this._pendingStarts();

      // ENHANCED: Worker loop with comprehensive error handling
      const workerLoop = async () => {
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 5;

        while (true) {
          try {
            if (this._paused || this._stopNewFetches || this._cancelled) return;

            const start = pending.shift();
            if (typeof start !== 'number') return;

            if (this._paused || this._stopNewFetches || this._cancelled) return;

            const end = Math.min(start + this.meta.chunkSize - 1, Math.max(0, total - 1));

            try {
              const ok = await this._fetchRange(start, end, onChunkBytes);
              if (!ok && (this._paused || this._cancelled || this._stopNewFetches)) return;
              
              consecutiveErrors = 0;
              this._performanceData.chunks.push({ start, end, timestamp: nowMs() });
            } catch (fetchError) {
              consecutiveErrors++;
              this._performanceData.errors.push({ 
                error: fetchError.message, 
                timestamp: nowMs(), 
                consecutiveCount: consecutiveErrors 
              });
              
              console.warn(`[R-ServiceX-DB] Worker fetch error (${consecutiveErrors}/${maxConsecutiveErrors}):`, fetchError);
              
              if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error('[R-ServiceX-DB] Too many consecutive errors, pausing download');
                this._pauseRequested = true;
                this._paused = true;
                this._running = false;
                this._stopProgressUpdates();
                this.emit('error', { 
                  message: createContextualError('CONNECTION_TIMEOUT', {
                    filename: this.meta.fileName,
                    progress: total > 0 ? Math.round((this._lastBytesSeen / total) * 100) : 0
                  })
                });
                return;
              }

              pending.unshift(start);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.min(consecutiveErrors, 5)));
            }
          } catch (err) {
            console.error('[R-ServiceX-DB] Worker loop error:', err);
            if (this._paused || this._cancelled) { return; }
            this._stopProgressUpdates();
            this.emit('error', { 
              message: createContextualError('NETWORK_INTERRUPTED', {
                filename: this.meta.fileName,
                progress: total > 0 ? Math.round((this._lastBytesSeen / total) * 100) : 0
              })
            });
            return;
          }
        }
      };

      const workers = new Array(this.concurrency).fill(null).map(() => workerLoop());

      await Promise.all(workers);

      this._stopProgressUpdates();

      if (this._cancelled) {
        this.emit('status', { text: PROGRESS_MESSAGES.CANCELLING });
        return;
      }

      if (this._paused) {
        this.emit('status', { text: 'Download paused' });
        return;
      }

      pending = await this._pendingStarts();
      if (pending.length > 0) {
        throw new Error(`Incomplete after workers finished: ${pending.length} chunks remaining`);
      }

      this.emit('status', { text: PROGRESS_MESSAGES.ASSEMBLING });
      const result = await this._assembleAndClear();
      
      // ENHANCED: Create blob URL with filename metadata for better browser compatibility
      const blobUrl = URL.createObjectURL(result.blob);
      const enhancedBlobUrl = `${blobUrl}#filename=${encodeURIComponent(result.fileName)}`;
      
      this.emit('complete', { 
        href: enhancedBlobUrl, 
        fileName: result.fileName,
        blob: result.blob,
        mimeType: result.mimeType,
        size: result.size
      });

    } catch (err) {
      console.error('[R-ServiceX-DB] Task error:', err);
      this._stopProgressUpdates();
      if (this._paused) { 
        this.emit('status', { text: 'Download paused' }); 
        return; 
      }
      if (this._cancelled) { 
        this.emit('status', { text: PROGRESS_MESSAGES.CANCELLING }); 
        return; 
      }
      this.emit('error', { 
        message: createContextualError('NETWORK_INTERRUPTED', {
          filename: this.meta.fileName,
          progress: this.meta.totalBytes > 0 ? Math.round((this._lastBytesSeen / this.meta.totalBytes) * 100) : 0
        })
      });
    } finally {
      this._running = false;
      this._stopProgressUpdates();
    }
  }

  // ENHANCED: Improved pause method with better state management
  async pause() {
    try {
      if (this._pauseRequested || this._paused) {
        console.log('[R-ServiceX-DB] Pause already requested or active');
        return;
      }

      console.log('[R-ServiceX-DB] Pause requested');
      this._pauseRequested = true;
      this._paused = true;
      this._stopNewFetches = true;
      this._cancelled = false;

      this._stopProgressUpdates();

      for (const [k, ac] of Array.from(this._aborts.entries())) {
        try { 
          if (ac && typeof ac.abort === 'function') {
            ac.abort(); 
          }
        } catch (e) {
          console.warn(`[R-ServiceX-DB] Error aborting request ${k}:`, e);
        }
      }

      if (this.meta) {
        this.meta.status = 'paused';
        this.meta.version = VERSION;
        await putMeta(this.db, this.meta);
      }

      this.emit('status', { text: 'Download paused' });
    } catch (e) {
      console.error('[R-ServiceX-DB] pause failed:', e);
      throw e;
    }
  }

  // ENHANCED: Improved resume method with better state management
  async resume() {
    try {
      console.log('[R-ServiceX-DB] Resume called, current state:', { 
        paused: this._paused, 
        running: this._running, 
        pauseRequested: this._pauseRequested 
      });

      if (!this._paused && this._running) {
        console.log('[R-ServiceX-DB] Already running, no need to resume');
        return;
      }

      this._paused = false;
      this._pauseRequested = false;
      this._resumeRequested = true;
      this._stopNewFetches = false;
      this._cancelled = false;

      if (this.meta) {
        this.meta.status = 'resuming';
        this.meta.version = VERSION;
        await putMeta(this.db, this.meta);
      }

      this.emit('status', { text: PROGRESS_MESSAGES.RESUMING });

      this._running = false;
      await this.start();
    } catch (e) {
      console.error('[R-ServiceX-DB] resume failed:', e);
      throw e;
    }
  }

  async cancelAndClear() {
    try {
      console.log('[R-ServiceX-DB] Cancel and clear requested');
      this._cancelled = true;
      this._paused = false;
      this._pauseRequested = false;
      this._resumeRequested = false;
      this._stopNewFetches = true;

      this._stopProgressUpdates();

      for (const [k, ac] of Array.from(this._aborts.entries())) {
        try { 
          if (ac && typeof ac.abort === 'function') {
            ac.abort(); 
          }
        } catch (e) {
          console.warn(`[R-ServiceX-DB] Error aborting request ${k}:`, e);
        }
      }
      this._aborts.clear();

      await this._completeCleanup();

      this.emit('status', { text: PROGRESS_MESSAGES.CANCELLING });
    } catch (e) {
      console.error('[R-ServiceX-DB] cancelAndClear failed:', e);
      throw e;
    }
  }
}

// ENHANCED: Global initialization with comprehensive error handling
try {
  if (typeof window !== 'undefined') {
    if (!window.IDBDownloaderManager) {
      window.IDBDownloaderManager = new IDBDownloaderManager();
    }

    if (!window.IDBDownloaderUtils) {
      window.IDBDownloaderUtils = { 
        humanBytes, 
        formatFileSize: formatPrefer,
        sanitizeFilename,
        generateConsistentId,
        hashString,
        createContextualError,
        generateDownloadMessage,
        ERROR_MESSAGES,
        PROGRESS_MESSAGES,
        VERSION
      };
    }

    console.log(`[R-ServiceX-DB] Enhanced Core module v${VERSION} loaded successfully with comprehensive improvements`);
  }
} catch (e) {
  console.error('[R-ServiceX-DB] Error initializing enhanced global instances:', e);
}

})();