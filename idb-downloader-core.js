/**
 * idb-downloader-core.js
 * 
 * Robust IndexedDB-backed parallel segmented downloader.
 * 
 * Exports:
 * window.IDBDownloaderManager
 * window.IDBDownloaderUtils
 * 
 * Behavior:
 * manager.start(options) PREPARES and RETURNS a DownloadTask (does NOT auto-start network).
 * DownloadTask.start() begins download (returns when done/paused/cancelled).
 * DownloadTask.pause()/resume()/cancelAndClear() control operation.
 */

(function () {
'use strict';

const DB_NAME = 'idb_downloader_v1';
const DB_VER = 1;
const STORE_META = 'meta';
const STORE_CHUNKS = 'chunks';
const STORE_SESSIONS = 'sessions';
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1 MiB
const DEFAULT_CONCURRENCY = 4;

function nowMs() { return performance.now(); }

function humanBytes(n) {
  if (!n || !Number.isFinite(n)) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n)/Math.log(1024)));
  return `${(n/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
}

function formatPrefer(n){
  if (typeof window.formatFileSize === 'function') {
    try { return window.formatFileSize(n); } catch(e) {}
  }
  return humanBytes(n);
}

/* ---------- IndexedDB helpers ---------- */
function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const st = db.createObjectStore(STORE_CHUNKS, { keyPath: ['id','start'] });
        st.createIndex('by_id_start', ['id','start']);
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'pageId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getMeta(db,id){ return new Promise((res,rej)=>{ const tx=db.transaction(STORE_META,'readonly'); const rq=tx.objectStore(STORE_META).get(id); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
function putMeta(db,meta){ return new Promise((res,rej)=>{ const tx=db.transaction(STORE_META,'readwrite'); const rq=tx.objectStore(STORE_META).put(meta); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); }); }
function deleteMeta(db,id){ return new Promise((res,rej)=>{ if(!id) return res(); const tx=db.transaction(STORE_META,'readwrite'); tx.objectStore(STORE_META).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }

function putChunk(db,id,start,arrayBuffer){ return new Promise((res,rej)=>{ const tx=db.transaction(STORE_CHUNKS,'readwrite'); const st=tx.objectStore(STORE_CHUNKS); const rq=st.put({id,start,data:arrayBuffer}); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); }); }
function listChunkStarts(db,id){ return new Promise((res,rej)=>{ const out=[]; const tx=db.transaction(STORE_CHUNKS,'readonly'); const idx=tx.objectStore(STORE_CHUNKS).index('by_id_start'); const range=IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER]); const curReq = idx.openCursor(range); curReq.onsuccess = e => { const cur = e.target.result; if(!cur){ res(out); return; } out.push(cur.value.start); cur.continue(); }; curReq.onerror = ()=> rej(curReq.error); }); }
function readChunksInOrder(db,id){ return new Promise((res,rej)=>{ const out=[]; const tx=db.transaction(STORE_CHUNKS,'readonly'); const idx=tx.objectStore(STORE_CHUNKS).index('by_id_start'); const range=IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER]); const curReq = idx.openCursor(range); curReq.onsuccess = e => { const cur = e.target.result; if(!cur){ res(out); return; } out.push(cur.value.data); cur.continue(); }; curReq.onerror = ()=> rej(curReq.error); }); }
function deleteChunks(db,id){ return new Promise((res,rej)=>{ if(!id) return res(); const tx=db.transaction(STORE_CHUNKS,'readwrite'); const idx=tx.objectStore(STORE_CHUNKS).index('by_id_start'); const range=IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER]); const cursorReq = idx.openCursor(range); cursorReq.onsuccess = e => { const cur = e.target.result; if(cur){ cur.delete(); cur.continue(); } }; tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }

function getSession(db, pageId){ return new Promise((res,rej)=>{ const tx=db.transaction(STORE_SESSIONS,'readonly'); const rq=tx.objectStore(STORE_SESSIONS).get(pageId); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
function putSession(db, session){ return new Promise((res,rej)=>{ const tx=db.transaction(STORE_SESSIONS,'readwrite'); const rq=tx.objectStore(STORE_SESSIONS).put(session); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); }); }
function deleteSession(db, pageId){ return new Promise((res,rej)=>{ if(!pageId) return res(); const tx=db.transaction(STORE_SESSIONS,'readwrite'); tx.objectStore(STORE_SESSIONS).delete(pageId); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
function getAllSessions(db){ return new Promise((res,rej)=>{ const out=[]; const tx=db.transaction(STORE_SESSIONS,'readonly'); const curReq=tx.objectStore(STORE_SESSIONS).openCursor(); curReq.onsuccess = e => { const cur = e.target.result; if(!cur){ res(out); return; } out.push(cur.value); cur.continue(); }; curReq.onerror = ()=> rej(curReq.error); }); }

/* ---------- quota ---------- */
async function checkQuota(requiredBytes){
  if (!navigator.storage || !navigator.storage.estimate) return { supported:false, usage:0, quota:0, free: Infinity, sufficient:true };
  try {
    const { usage=0, quota=0 } = await navigator.storage.estimate();
    const free = Math.max(0, quota - usage);
    return { supported:true, usage, quota, free, sufficient:(requiredBytes===0)?true:(free >= requiredBytes) };
  } catch(e){ return { supported:false, usage:0, quota:0, free: Infinity, sufficient:true }; }
}

/* ---------- Manager & Task ---------- */
class IDBDownloaderManager {
  constructor(){ 
    this._dbPromise = null; 
    this.active = false; 
    this.current = null; 
    this.pageId = this._generatePageId();
  }

  _generatePageId() {
    try {
      const url = window.location.href;
      const timestamp = Date.now();
      return btoa(unescape(encodeURIComponent(`${url}_${timestamp}`))).slice(0,32);
    } catch(e) {
      return `page_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  }

  async _open(){ if(!this._dbPromise) this._dbPromise = openDB(); return this._dbPromise; }

  makeId(url){ try{ return btoa(unescape(encodeURIComponent(url))).slice(0,64); }catch(e){ return String(Math.abs(this._hash(url))).slice(0,32);} }

  _hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){h=(h^s.charCodeAt(i))*16777619>>>0;} return h>>>0; }

  async checkQuota(requiredBytes){ return checkQuota(requiredBytes); }

  async getMeta(id){ const db=await this._open(); return getMeta(db,id); }

  async _checkForActiveDownloads(){
    const db = await this._open();
    const sessions = await getAllSessions(db);

    const now = Date.now();
    const activeSessions = sessions.filter(session => 
      session.pageId !== this.pageId && 
      session.isActive && 
      (now - session.lastUpdate) < 3600000
    );

    return activeSessions.length > 0 ? activeSessions[0] : null;
  }

  async _updateSession(isActive, downloadId = null, downloadUrl = null) {
    const db = await this._open();
    const session = {
      pageId: this.pageId,
      isActive,
      downloadId,
      downloadUrl,
      lastUpdate: Date.now(),
      userAgent: navigator.userAgent.slice(0, 100)
    };
    await putSession(db, session);
  }

  async _cleanupExpiredSessions() {
    const db = await this._open();
    const sessions = await getAllSessions(db);
    const now = Date.now();

    for (const session of sessions) {
      if (now - session.lastUpdate > 3600000) {
        await deleteSession(db, session.pageId);
      }
    }
  }

  async start(options = {}){
    await this._cleanupExpiredSessions();

    const activeDownload = await this._checkForActiveDownloads();
    if (activeDownload) {
      throw new Error(`Another download is active on a different page. Please complete or cancel the existing download first. (Download ID: ${activeDownload.downloadId?.slice(0,8)}...)`);
    }

    if (this.active && !this.current) this.active = false;
    if (this.active) throw new Error('Another download is active on this page');

    const opt = Object.assign({ chunkSize: DEFAULT_CHUNK_SIZE, concurrency: DEFAULT_CONCURRENCY }, options);
    if (!opt.url) throw new Error('url required');

    const id = opt.id || this.makeId(opt.url);
    const db = await this._open();

    const task = new DownloadTask({
      db, id,
      url: opt.url,
      preferredFileName: opt.fileName,
      totalBytesHint: (typeof opt.fileSizeBytes === 'number') ? opt.fileSizeBytes : 0,
      chunkSize: opt.chunkSize,
      concurrency: opt.concurrency,
      manager: this
    });

    await task.prepare();

    this.current = task;
    this.active = true;

    await this._updateSession(true, id, opt.url);

    task.on('complete', async ()=>{ 
      if (this.current === task) { 
        this.current = null; 
        this.active = false;
        await this._updateSession(false);
      }
    });

    task.on('error', async ()=>{ 
      if (this.current === task) { 
        this.current = null; 
        this.active = false;
        await this._updateSession(false);
      }
    });

    task.on('status', async ({text} = {}) => { 
      if (text && /cancelled/i.test(String(text))) { 
        if (this.current === task) { 
          this.current = null; 
          this.active = false;
          await this._updateSession(false);
        }
      } 
    });

    console.debug('[IDBDownloaderManager] prepared task id=', id);
    return task;
  }

  async pause(){ if (!this.current) throw new Error('No active download'); return this.current.pause(); }

  async resume(downloadId = null, url = null, fileName = null, fileSizeBytes = 0, chunkSize = DEFAULT_CHUNK_SIZE, concurrency = DEFAULT_CONCURRENCY){ 
    // If there's an active task, resume it
    if (this.current) {
      return this.current.resume();
    }

    // If no active task but we have downloadId, create new task from existing metadata
    if (downloadId) {
      const db = await this._open();
      const meta = await getMeta(db, downloadId);

      if (meta && meta.completedStarts && meta.completedStarts.length > 0) {
        // Create new task from existing metadata
        const task = new DownloadTask({
          db,
          id: downloadId,
          url: url || meta.url,
          preferredFileName: fileName || meta.fileName,
          totalBytesHint: fileSizeBytes || meta.totalBytes,
          chunkSize: chunkSize,
          concurrency: concurrency,
          manager: this
        });

        // Set existing metadata
        task.meta = meta;

        this.current = task;
        this.active = true;

        await this._updateSession(true, downloadId, url || meta.url);

        // Wire up events
        task.on('complete', async ()=>{ 
          if (this.current === task) { 
            this.current = null; 
            this.active = false;
            await this._updateSession(false);
          }
        });

        task.on('error', async ()=>{ 
          if (this.current === task) { 
            this.current = null; 
            this.active = false;
            await this._updateSession(false);
          }
        });

        task.on('status', async ({text} = {}) => { 
          if (text && /cancelled/i.test(String(text))) { 
            if (this.current === task) { 
              this.current = null; 
              this.active = false;
              await this._updateSession(false);
            }
          } 
        });

        // Resume the task
        return task.resume();
      }
    }

    throw new Error('No active download to resume');
  }

  async cancelCurrentAndClear(){
    if (this.current) {
      try{ await this.current.cancelAndClear(); }catch(e){ console.warn('cancelCurrentAndClear error', e); }
    }
    this.active = false;
    this.current = null;
    await this._updateSession(false);
  }

  async clearById(id){
    if (!id) return;
    const db = await this._open();
    await deleteChunks(db,id);
    await deleteMeta(db,id);
  }

  async completeCleanup(id) {
    if (!id) return;
    const db = await this._open();

    await deleteChunks(db, id);
    await deleteMeta(db, id);

    await this._updateSession(false);

    this.active = false;
    this.current = null;

    console.debug('[IDBDownloaderManager] Complete cleanup performed for', id);
  }

  async checkForExistingDownload() {
    try {
      const db = await this._open();
      const sessions = await getAllSessions(db);

      // Check current page session first
      const currentSession = sessions.find(s => s.pageId === this.pageId);
      if (currentSession && currentSession.downloadId) {
        const meta = await getMeta(db, currentSession.downloadId);
        if (meta && meta.completedStarts && meta.totalBytes) {
          const allStarts = this._getAllStarts(meta);
          if (meta.completedStarts.length < allStarts.length) {
            return {
              id: currentSession.downloadId,
              meta: meta,
              url: meta.url,
              fileName: meta.fileName,
              totalBytes: meta.totalBytes,
              completedStarts: meta.completedStarts
            };
          }
        }
      }

      // Check other sessions for incomplete downloads
      for (const session of sessions) {
        if (session.pageId !== this.pageId && session.downloadId) {
          const meta = await getMeta(db, session.downloadId);
          if (meta && meta.completedStarts && meta.totalBytes) {
            const allStarts = this._getAllStarts(meta);
            if (meta.completedStarts.length < allStarts.length) {
              return {
                id: session.downloadId,
                meta: meta,
                url: meta.url,
                fileName: meta.fileName,
                totalBytes: meta.totalBytes,
                completedStarts: meta.completedStarts,
                fromOtherPage: true
              };
            }
          }
        }
      }
      
      return null;
    } catch (e) {
      console.warn('[IDBDownloaderManager] Error checking for existing downloads:', e);
      return null;
    }
  }

  _getAllStarts(meta) {
    const total = meta.totalBytes || 0;
    if (!total || total <= 0) return [0];
    const arr = [];
    for (let s=0; s<total; s+=meta.chunkSize) arr.push(s);
    return arr;
  }
}

class DownloadTask {
  constructor({ db, id, url, preferredFileName=null, totalBytesHint=0, chunkSize=DEFAULT_CHUNK_SIZE, concurrency=DEFAULT_CONCURRENCY, manager=null }){
    this.db = db;
    this.id = id;
    this.url = url;
    this.preferredFileName = preferredFileName;
    this.totalBytesHint = totalBytesHint || 0;
    this.chunkSize = chunkSize;
    this.concurrency = Math.max(1, Math.min(12, concurrency|0));
    this.manager = manager;

    this._listeners = new Map();
    this._aborts = new Map();
    this._running = false;
    this._paused = false;
    this._stopNewFetches = false;
    this._cancelled = false;
    this.meta = null;
    this._speedBps = 0;
    this._lastUpdateTime = nowMs();
    this._lastBytesSeen = 0;
  }

  on(ev, fn){ (this._listeners.get(ev) || this._listeners.set(ev,[]).get(ev)).push(fn); }
  emit(ev,d){ (this._listeners.get(ev) || []).forEach(f => { try { f(d); } catch(e){ console.error(e); } }); }

  async prepare(){
    let m = await getMeta(this.db,this.id);
    if (m) {
      this.meta = m;
      if (!this.meta.chunkSize) this.meta.chunkSize = this.chunkSize;
      const starts = await listChunkStarts(this.db,this.id);
      const set = new Set((this.meta.completedStarts || []).concat(starts || []));
      this.meta.completedStarts = Array.from(set).sort((a,b)=>a-b);
      await putMeta(this.db,this.meta);
      return;
    }

    let total = this.totalBytesHint || 0;
    let filename = this.preferredFileName || (this.url.split('/').pop() || 'download');

    try {
      const head = await fetch(this.url, { method: 'HEAD' });
      if (head && head.ok) {
        const cl = head.headers.get('Content-Length');
        if (cl) total = parseInt(cl,10) || total;
        const cd = head.headers.get('Content-Disposition');
        const p = this._parseContentDisposition(cd);
        if (p) filename = p;
      }
    } catch(e){ /* ignore */ }

    this.meta = {
      id: this.id,
      url: this.url,
      fileName: filename,
      totalBytes: total,
      chunkSize: this.chunkSize,
      completedStarts: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await putMeta(this.db,this.meta);
  }

  _parseContentDisposition(hdr){
    if (!hdr) return null;
    const star = hdr.match(/filename\*\s*=\s*([^']*)''([^;]+)/i);
    if (star) { try { return decodeURIComponent(star[2]); } catch(e){} }
    const simple = hdr.match(/filename\s*=\s*"([^"]+)"/i) || hdr.match(/filename\s*=\s*([^;]+)/i);
    return simple ? simple[1].trim() : null;
  }

  _allStarts(){
    const total = this.meta.totalBytes || 0;
    if (!total || total <= 0) return [0];
    const arr = [];
    for (let s=0; s<total; s+=this.meta.chunkSize) arr.push(s);
    return arr;
  }

  async _refreshCompletedStarts(){
    const starts = await listChunkStarts(this.db,this.id);
    const set = new Set((this.meta.completedStarts || []).concat(starts || []));
    (this.meta.completedStarts || []).forEach(s => set.add(s));
    this.meta.completedStarts = Array.from(set).sort((a,b)=>a-b);
    this.meta.updatedAt = Date.now();
    await putMeta(this.db,this.meta);
    return this.meta.completedStarts;
  }

  async _pendingStarts(){
    const all = this._allStarts();
    await this._refreshCompletedStarts();
    const done = new Set(this.meta.completedStarts || []);
    return all.filter(s => !done.has(s));
  }

  async _fetchRange(start,end,onBytes){
    if (this._cancelled || this._stopNewFetches) return false;

    const ac = new AbortController();
    this._aborts.set(start, ac);

    try {
      const headers = { 'Range': `bytes=${start}-${end}` };
      const resp = await fetch(this.url, { headers, signal: ac.signal });

      if (!(resp.status === 206 || resp.status === 200)) {
        throw new Error('Range request failed: ' + resp.status);
      }

      const arr = await resp.arrayBuffer();

      if (this._cancelled) return false;

      await putChunk(this.db,this.id,start,arr);
      if (!this.meta.completedStarts.includes(start)) {
        this.meta.completedStarts.push(start);
        this.meta.completedStarts.sort((a,b)=>a-b);
        this.meta.updatedAt = Date.now();
        await putMeta(this.db,this.meta);
      }

      if (onBytes) onBytes(arr.byteLength);
      return true;

    } catch (err) {
      const isAbort = err && (err.name === 'AbortError' || /abort/i.test(String(err)));
      if (isAbort) {
        return false;
      }
      throw err;
    } finally {
      this._aborts.delete(start);
    }
  }

  async _assembleAndClear(){
    const bufs = await readChunksInOrder(this.db,this.id);
    const blob = new Blob(bufs, { type: 'application/octet-stream' });

    // Complete cleanup after assembly
    await this._completeCleanup();

    return blob;
  }

  async _completeCleanup() {
    try {
      await deleteChunks(this.db, this.id);
      await deleteMeta(this.db, this.id);

      if (this.manager) {
        await this.manager._updateSession(false);
        this.manager.active = false;
        this.manager.current = null;
      }

      console.debug('[DownloadTask] Complete cleanup performed');
    } catch (e) {
      console.warn('[DownloadTask] Error during cleanup:', e);
    }
  }

  async start(){
    if (this._running) {
      console.debug('[DownloadTask] start() called but task already running');
      return;
    }

    this._cancelled = false;
    this._stopNewFetches = false;

    try {
      if (!this.meta) await this.prepare();
      await this._refreshCompletedStarts();

      const total = this.meta.totalBytes || 0;
      this.emit('start', { totalBytes: total, fileName: this.meta.fileName });

      const allStarts = this._allStarts();
      if (allStarts.length > 0 && Array.isArray(this.meta.completedStarts) && this.meta.completedStarts.length === allStarts.length) {
        this.emit('status', { text: 'Assembling file' });
        const blob = await this._assembleAndClear();
        this.emit('complete', { href: URL.createObjectURL(blob), fileName: this.meta.fileName });
        return;
      }

      this._running = true;
      this._paused = false;
      this._lastUpdateTime = nowMs();
      this._lastBytesSeen = 0;
      this._speedBps = 0;

      let downloadedSoFar = 0;
      (this.meta.completedStarts || []).forEach(s => {
        const chunk = Math.min(this.meta.chunkSize || DEFAULT_CHUNK_SIZE, Math.max(0, (this.meta.totalBytes || 0) - s));
        downloadedSoFar += chunk;
      });

      const onChunkBytes = (n) => {
        downloadedSoFar += n;
        const now = nowMs();
        const dt = (now - this._lastUpdateTime) / 1000;
        if (dt >= 0.5) {
          const delta = downloadedSoFar - this._lastBytesSeen;
          this._speedBps = Math.round(delta / dt);
          this._lastBytesSeen = downloadedSoFar;
          this._lastUpdateTime = now;
          this.emit('speed', { pretty: humanBytes(this._speedBps) + '/s', bps: this._speedBps });
        }

        const percent = total ? Math.round((downloadedSoFar / total) * 1000) / 10 : 0;
        this.emit('progress', { receivedBytes: downloadedSoFar, totalBytes: total, percent });
      };

      let pending = await this._pendingStarts();

      const workerLoop = async () => {
        while (true) {
          if (this._paused || this._stopNewFetches || this._cancelled) return;

          const start = pending.shift();
          if (typeof start !== 'number') return;

          if (this._paused || this._stopNewFetches || this._cancelled) return;

          const end = Math.min(start + this.meta.chunkSize - 1, Math.max(0, (this.meta.totalBytes || 0) - 1));

          try {
            const ok = await this._fetchRange(start, end, onChunkBytes);
            if (!ok && (this._paused || this._cancelled || this._stopNewFetches)) return;
          } catch (err) {
            console.error('[DownloadTask] worker fetch error', err);
            if (this._paused || this._cancelled) { return; }
            this.emit('error', { message: (err && err.message) ? err.message : String(err) });
            return;
          }
        }
      };

      const workers = new Array(this.concurrency).fill(null).map(() => workerLoop());

      await Promise.all(workers);

      if (this._cancelled) {
        this.emit('status', { text: 'Cancelled and cleared' });
        return;
      }

      if (this._paused) {
        this.emit('status', { text: 'Paused' });
        return;
      }

      pending = await this._pendingStarts();
      if (pending.length > 0) {
        throw new Error('Incomplete after workers finished');
      }

      this.emit('status', { text: 'Assembling file' });
      const blob = await this._assembleAndClear();
      this.emit('complete', { href: URL.createObjectURL(blob), fileName: this.meta.fileName });

    } catch (err) {
      console.error('[DownloadTask] error', err);
      if (this._paused) { this.emit('status', { text: 'Paused' }); return; }
      if (this._cancelled) { this.emit('status', { text: 'Cancelled and cleared' }); return; }
      this.emit('error', { message: (err && err.message) ? err.message : String(err) });
    } finally {
      this._running = false;
    }
  }

  async pause(){
    this._paused = true;
    this._stopNewFetches = true;
    this._cancelled = false;

    for (const [k, ac] of Array.from(this._aborts.entries())) {
      try { ac.abort(); } catch(e) {}
    }

    this.emit('status', { text: 'Paused' });
  }

  async resume(){
    if (!this._paused) return;

    this._paused = false;
    this._stopNewFetches = false;
    this._cancelled = false;

    this.emit('status', { text: 'Resuming' });

    if (!this._running) {
      await this.start();
    }
  }

  async cancelAndClear(){
    this._cancelled = true;
    this._paused = false;
    this._stopNewFetches = true;

    for (const [k, ac] of Array.from(this._aborts.entries())) {
      try { ac.abort(); } catch(e) {}
    }
    this._aborts.clear();

    await this._completeCleanup();

    this.emit('status', { text: 'Cancelled and cleared' });
  }
}

if (!window.IDBDownloaderManager) window.IDBDownloaderManager = new IDBDownloaderManager();
if (!window.IDBDownloaderUtils) window.IDBDownloaderUtils = { humanBytes, formatFileSize: formatPrefer };

})();