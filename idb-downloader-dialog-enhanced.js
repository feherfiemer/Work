/*
 * idb-downloader-dialog-enhanced.js
 * 
 * Enhanced download dialog with sophisticated UI and robust functionality
 * Proper session management and error handling
 * Minimal animations - only pulse icon and completion animation
 */

function openIDBDownloaderDialog({ url, fileName = '', fileSizeBytes = 0, iconName = 'file_download' } = {}) {
  if (!url) throw new Error('url required');

  const manager = window.IDBDownloaderManager;
  const utils = window.IDBDownloaderUtils || {
    humanBytes: (n) => {
      if (!n && n !== 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let i = 0; let v = n;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
    },
    formatFileSize: (n) => {
      if (n === 0) return '0 B';
      if (!n && n !== 0) return '';
      const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(Math.max(n, 1)) / Math.log(k));
      return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
    }
  };
  const fmt = (typeof window.formatFileSize === 'function') ? window.formatFileSize : utils.formatFileSize;

  const id = (manager && typeof manager.makeId === 'function') ? manager.makeId(url) : btoa(unescape(encodeURIComponent(url))).slice(0, 64);
  const tag = Date.now().toString(36).slice(-6);

  const IDS = {
    root: `dl_root_${tag}`,
    meta: `dl_meta_${tag}`,
    icon: `dl_icon_${tag}`,
    fname: `dl_fname_${tag}`,
    fsize: `dl_fsize_${tag}`,
    main: `dl_main_${tag}`,
    status: `dl_status_${tag}`,
    progress: `dl_progress_${tag}`,
    metricsCard: `dl_metrics_${tag}`,
    action: `dl_action_${tag}`,
    cancel: `dl_cancel_${tag}`,
    errorArea: `dl_errorarea_${tag}`,
    controls: `dl_controls_${tag}`,
    conc: `dl_conc_${tag}`,
    chunk: `dl_chunk_${tag}`,
    checkBg: `dl_checkbg_${tag}`,
    checkPath: `dl_checkpath_${tag}`,
    settings: `dl_settings_${tag}`
  };

  const html = `
<style>
:root{
  --dl-font: "Lexend", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  --dl-primary: #1e88e5;
  --dl-accent: #0e4a64;
  --dl-success-fill: #2e7d32;
  --dl-success-fill-light: #e8f5e8;
  --dl-success-outline: #4caf50;
  --dl-success-outline-dashed: #81c784;
  --dl-metrics-bg: rgba(173, 216, 230, 0.22);
  --dl-border-radius: 12px;
}

.download-card{
  font-family: var(--dl-font);
  max-width: 580px;
  padding: 20px;
  border-radius: 16px;
  margin: 0 auto;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(173,216,230,0.3);
  color: #083544;
  text-align: center;
  box-sizing: border-box;
  position: relative;
}

.download-card.download-completed{
  background: linear-gradient(135deg, rgba(76,175,80,0.08), rgba(139,195,74,0.06));
  border-color: rgba(76,175,80,0.25);
}

.file-metadata{
  background: linear-gradient(135deg, rgba(173,216,230,0.15), rgba(135,206,250,0.10));
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
  border: 1px solid rgba(173,216,230,0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.main-icon{
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px !important;
  color: var(--dl-primary);
  border-radius: 8px;
  position: relative;
}

.main-icon.pulse-active::before{
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(30,136,229,0.3), transparent 70%);
  animation: pulseGlow 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulseGlow{
  0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
}

.meta-name{
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.3;
  word-break: break-word;
  overflow-wrap: anywhere;
  margin: 0;
  max-width: 100%;
}

.meta-size{
  font-size: 0.88rem;
  color: #274e57;
  opacity: 0.95;
  font-weight: 600;
  margin: 0;
}

.settings-panel{
  display: flex;
  gap: 18px;
  justify-content: center;
  align-items: center;
  margin: 16px 0;
  padding: 14px 18px;
  background: rgba(173,216,230,0.08);
  border-radius: var(--dl-border-radius);
  border: 1px solid rgba(173,216,230,0.2);
}

.settings-panel.settings-hidden{
  display: none;
}

.setting-group{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 85px;
}

.setting-label{
  font-size: 0.74rem;
  font-weight: 600;
  color: #274e57;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-input{
  width: 68px;
  padding: 8px 10px;
  border: 1px solid rgba(173,216,230,0.4);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: center;
  color: #083544;
  transition: all 0.2s ease;
}

.setting-input:focus{
  outline: none;
  border-color: var(--dl-primary);
  background: rgba(255,255,255,1);
  box-shadow: 0 0 0 2px rgba(30,136,229,0.1);
}

.main-block{
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.status-line{
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.96rem;
  color: var(--dl-accent);
  margin: 0;
  min-height: 28px;
}

.status-line i{
  font-size: 20px;
  color: var(--dl-primary);
}

.progress-container{
  margin: 12px auto;
  max-width: 100%;
  width: 100%;
  height: 6px;
  background: rgba(173,216,230,0.2);
  border-radius: 3px;
  overflow: hidden;
}

.mdui-progress{
  width: 100%;
  height: 100%;
  position: relative;
}

.mdui-progress-determinate{
  height: 100%;
  background: linear-gradient(90deg, var(--dl-primary), #42a5f5);
  border-radius: 3px;
  width: 0%;
  transition: width 0.3s ease;
}

.metrics-card{
  display: inline-block;
  margin: 8px 0;
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--dl-metrics-bg);
  font-size: 0.78rem;
  font-weight: 600;
  color: #083544;
  min-width: 180px;
  border: 1px solid rgba(173,216,230,0.3);
}

.metrics-card.hidden{
  display: none;
}

.buttons-row{
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

.glassy-btn{
  border: 1.5px solid rgba(173,216,230,0.4);
  border-radius: 12px;
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  font-weight: 700;
  color: #073544;
  min-width: 110px;
  font-size: 0.84rem;
  transition: all 0.2s ease;
}

.glassy-btn:hover{
  border-color: var(--dl-primary);
  background: rgba(255,255,255,0.95);
  transform: translateY(-1px);
}

.glassy-btn i{
  font-size: 18px;
}

.glassy-btn.disabled,.glassy-btn[disabled]{
  opacity: 0.5;
  pointer-events: none;
  filter: grayscale(0.3);
}

.glassy-btn.cancel-enabled{ 
  border-color: rgba(244,67,54,0.6); 
  color: #d32f2f;
  background: rgba(255,235,238,0.8);
}

.glassy-btn.cancel-enabled:hover{
  border-color: #d32f2f;
  background: rgba(255,235,238,1);
}

/* NEW COMPLETION ANIMATION */
.completion-wrap{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px 12px;
  background: transparent;
  animation: completionFadeIn 800ms ease;
}

@keyframes completionFadeIn{
  from{opacity:0;transform:translateY(30px);}
  to{opacity:1;transform:translateY(0);}
}

.success-circle{
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(circle, rgba(76,175,80,0.08), rgba(76,175,80,0.18));
  border: 3px solid rgba(76,175,80,0.2);
}

.success-circle::before{
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(76,175,80,0.4), rgba(139,195,74,0.6), rgba(76,175,80,0.4));
  animation: rotateSuccess 3s linear infinite;
  z-index: -1;
}

@keyframes rotateSuccess{
  from{transform:rotate(0deg);}
  to{transform:rotate(360deg);}
}

.success-inner{
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  border: 2px solid rgba(255,255,255,0.3);
  position: relative;
  animation: successPop 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 400ms both;
}

@keyframes successPop{
  from{transform:scale(0);opacity:0;}
  to{transform:scale(1);opacity:1;}
}

.success-check{
  width: 56px;
  height: 56px;
  stroke: #ffffff;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 80;
  stroke-dashoffset: 80;
  animation: drawCheck 800ms ease 800ms both;
}

@keyframes drawCheck{
  to{stroke-dashoffset:0;}
}

.success-message{
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--dl-success-fill);
  margin: 12px 0;
  opacity: 0;
  transform: translateY(15px);
  animation: successMessageIn 500ms ease 1200ms forwards;
}

@keyframes successMessageIn{
  to{opacity:1;transform:translateY(0);}
}

.success-details{
  font-size: 0.82rem;
  color: #083544;
  opacity: 0.8;
  opacity: 0;
  animation: successMessageIn 400ms ease 1600ms forwards;
}

.error-area{
  font-size: 0.88rem;
  color: #d32f2f;
  padding: 14px 18px;
  border-radius: 10px;
  background: rgba(244,67,54,0.06);
  border: 1px solid rgba(244,67,54,0.2);
  margin: 12px 0;
  line-height: 1.4;
}

.download-message{
  font-size: 0.78rem;
  color: var(--dl-accent);
  background: rgba(30,136,229,0.06);
  padding: 10px 16px;
  border-radius: 10px;
  margin: 12px 0;
  border: 1px solid rgba(30,136,229,0.2);
  font-weight: 600;
  line-height: 1.4;
}

.divider{
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg,transparent,rgba(0,0,0,0.10),transparent);
  margin: 20px 0 16px 0;
}

.final-note{
  font-size: 0.8rem;
  color: #083544;
  text-align: center;
  line-height: 1.5;
  padding-bottom: 6px;
  opacity: 0.85;
}

/* Responsive */
@media (max-width: 600px){
  .download-card{
    padding: 16px;
    max-width: 95vw;
    margin: 8px auto;
  }

  .main-icon{
    width: 70px;
    height: 70px;
    font-size: 64px !important;
  }

  .meta-name{
    font-size: 1.0rem;
  }

  .settings-panel{
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .setting-group{
    flex-direction: row;
    gap: 10px;
    min-width: auto;
  }

  .setting-input{
    width: 60px;
    font-size: 0.82rem;
  }

  .setting-label{
    font-size: 0.72rem;
    min-width: 75px;
  }

  .buttons-row{
    gap: 10px;
  }

  .glassy-btn{
    min-width: 100px;
    font-size: 0.8rem;
    padding: 8px 14px;
  }

  .success-circle{
    width: 120px;
    height: 120px;
  }

  .success-inner{
    width: 95px;
    height: 95px;
  }
}

@media (max-width: 400px){
  .download-card{
    padding: 14px;
  }

  .file-metadata{
    padding: 14px;
  }

  .main-icon{
    width: 60px;
    height: 60px;
    font-size: 56px !important;
  }

  .success-circle{
    width: 100px;
    height: 100px;
  }

  .success-inner{
    width: 80px;
    height: 80px;
  }
}

/* Dark theme */
.mdui-dialog-dark .download-card{
  background: rgba(30,30,30,0.95);
  border-color: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.9);
}

.mdui-dialog-dark .file-metadata{
  background: linear-gradient(135deg, rgba(100,149,237,0.12), rgba(70,130,180,0.08));
  border-color: rgba(100,149,237,0.25);
}

.mdui-dialog-dark .settings-panel{
  background: rgba(100,149,237,0.06);
  border-color: rgba(100,149,237,0.15);
}

.mdui-dialog-dark .setting-input{
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.9);
}

.mdui-dialog-dark .setting-input:focus{
  background: rgba(255,255,255,0.12);
  border-color: var(--dl-primary);
}

.mdui-dialog-dark .glassy-btn{
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
}

.mdui-dialog-dark .glassy-btn:hover{
  background: rgba(255,255,255,0.1);
  border-color: var(--dl-primary);
}

.mdui-dialog-dark .metrics-card{
  background: rgba(100,149,237,0.08);
  color: rgba(255,255,255,0.9);
  border-color: rgba(100,149,237,0.2);
}

.mdui-dialog-dark .download-message{
  background: rgba(100,149,237,0.1);
  border-color: rgba(100,149,237,0.3);
  color: rgba(255,255,255,0.9);
}

.mdui-dialog-dark .error-area{
  background: rgba(244,67,54,0.08);
  border-color: rgba(244,67,54,0.25);
  color: #ff6b6b;
}

.mdui-dialog-dark .progress-container{
  background: rgba(255,255,255,0.1);
}

.mdui-dialog-dark .final-note{
  color: rgba(255,255,255,0.7);
}

.mdui-dialog-dark .success-details{
  color: rgba(255,255,255,0.8);
}
</style>

<div class="download-card" id="${IDS.root}" role="dialog" aria-label="Download Manager">
  <div class="file-metadata" id="${IDS.meta}">
    <i class="mdui-icon material-icons-outlined main-icon" id="${IDS.icon}">${iconName}</i>
    <div class="meta-name" id="${IDS.fname}">${fileName || 'File'}</div>
    <div class="meta-size" id="${IDS.fsize}">${fmt(fileSizeBytes)}</div>
  </div>

  <div class="settings-panel" id="${IDS.settings}">
    <div class="setting-group">
      <label class="setting-label">Threads</label>
      <input type="number" class="setting-input" id="${IDS.conc}" value="4" min="1" max="12">
    </div>
    <div class="setting-group">
      <label class="setting-label">Chunk (KB)</label>
      <input type="number" class="setting-input" id="${IDS.chunk}" value="1024" min="64" max="4096" step="64">
    </div>
  </div>

  <div class="main-block" id="${IDS.main}">
    <div class="status-line" id="${IDS.status}">
      <i class="mdui-icon material-icons-outlined">cloud_download</i>
      <span>Ready to download</span>
    </div>

    <div class="progress-container">
      <div class="mdui-progress">
        <div id="${IDS.progress}" class="mdui-progress-determinate"></div>
      </div>
    </div>

    <div id="${IDS.metricsCard}" class="metrics-card hidden">
      0 / ${fmt(fileSizeBytes)} | 0 B/s
    </div>

    <div class="buttons-row">
      <button class="glassy-btn" id="${IDS.action}" data-state="start" aria-label="Start download">
        <i class="mdui-icon material-icons-outlined">download</i>
        <span>Start</span>
      </button>
      <button class="glassy-btn disabled" id="${IDS.cancel}" aria-disabled="true">
        <i class="mdui-icon material-icons-outlined">close</i>
        <span>Cancel</span>
      </button>
    </div>
  </div>

  <div id="${IDS.errorArea}" style="display:none;"></div>

  <div class="divider"></div>

  <div class="final-note">
    Secure parallel downloading with automatic resume capability. 
    Data is encrypted in transit and stored locally for reliability.
  </div>
</div>
`;

  const dialog = mdui.dialog({
    content: html,
    cssClass: (typeof UI !== 'undefined' && UI.dark_mode) ? 'mdui-dialog-dark' : '',
    buttons: [
      { text: 'Close' }
    ],
    history: false,
    modal: true,
    closeOnEsc: true
  });

  const log = (...v) => console.log('[IDBDownloader]', ...v);
  const byId = (id) => document.getElementById(id);

  // Handle dialog close
  if (dialog && dialog.$element) {
    dialog.$element.on('click', '.mdui-dialog-actions .mdui-btn', function (ev) {
      try {
        const text = (this && this.textContent) ? this.textContent.trim() : '';
        if (text === 'Close') dialog.close();
      } catch (e) { /* ignore */ }
    });
  } else {
    setTimeout(() => {
      const root = document.querySelector('.mdui-dialog');
      if (root) {
        root.addEventListener('click', (e) => {
          const btn = e.target.closest('.mdui-dialog-actions .mdui-btn');
          if (!btn) return;
          if ((btn.textContent || '').trim() === 'Close') {
            try { dialog.close(); } catch (e) { /* ignore */ }
          }
        });
      }
    }, 100);
  }

  setTimeout(async () => {
    const dialogs = Array.from(document.querySelectorAll('.mdui-dialog'));
    const rootDialog = dialogs.length ? dialogs[dialogs.length - 1] : document.querySelector('.mdui-dialog');
    if (!rootDialog) { 
      console.error('[IDBDownloader] Dialog root not found'); 
      return; 
    }

    const container = rootDialog.querySelector(`#${IDS.root}`);
    if (!container) { 
      console.error('[IDBDownloader] Container not found'); 
      return; 
    }

    const nodes = {
      container,
      icon: byId(IDS.icon),
      fname: byId(IDS.fname),
      fsize: byId(IDS.fsize),
      main: byId(IDS.main),
      status: byId(IDS.status),
      progress: byId(IDS.progress),
      metricsCard: byId(IDS.metricsCard),
      action: byId(IDS.action),
      cancel: byId(IDS.cancel),
      errorArea: byId(IDS.errorArea),
      conc: byId(IDS.conc),
      chunk: byId(IDS.chunk),
      settings: byId(IDS.settings)
    };

    if (!nodes.action) { 
      console.error('[IDBDownloader] Essential UI elements missing'); 
      return; 
    }

    if (fileName) nodes.fname.textContent = fileName;
    if (fileSizeBytes || fileSizeBytes === 0) nodes.fsize.textContent = fmt(fileSizeBytes);
    nodes.progress.style.width = '0%';
    nodes.errorArea.style.display = 'none';

    const setCancelState = (enabled) => {
      if (!nodes.cancel) return;
      if (enabled) {
        nodes.cancel.classList.remove('disabled');
        nodes.cancel.removeAttribute('aria-disabled');
        nodes.cancel.classList.add('cancel-enabled');
      } else {
        nodes.cancel.classList.add('disabled');
        nodes.cancel.setAttribute('aria-disabled', 'true');
        nodes.cancel.classList.remove('cancel-enabled');
      }
    };

    const showSettings = () => {
      if (nodes.settings) nodes.settings.classList.remove('settings-hidden');
    };

    const hideSettings = () => {
      if (nodes.settings) nodes.settings.classList.add('settings-hidden');
    };

    const showMetrics = () => {
      if (nodes.metricsCard) nodes.metricsCard.classList.remove('hidden');
    };

    const hideMetrics = () => {
      if (nodes.metricsCard) nodes.metricsCard.classList.add('hidden');
    };

    const startPulse = () => {
      if (nodes.icon) nodes.icon.classList.add('pulse-active');
    };

    const stopPulse = () => {
      if (nodes.icon) nodes.icon.classList.remove('pulse-active');
    };

    setCancelState(false);
    showSettings();
    hideMetrics();
    stopPulse();

    let meta = null, task = null, fallbackTimer = null, fallbackActive = false;

    // Check for existing downloads from current session or other pages
    try {
      if (manager && typeof manager.checkForExistingDownload === 'function') {
        const existingDownload = await manager.checkForExistingDownload();
        if (existingDownload) {
          meta = existingDownload.meta;

          if (existingDownload.fromOtherPage) {
            // Show error for downloads from other pages
            showErrorMessage(`Another download is active on a different page. Please complete or cancel the existing download first.`, false);
            setActionButtonState('start');
            setCancelState(false);
            return;
          }

          let downloadedBytes = 0;
          (meta.completedStarts || []).forEach(start => { 
            downloadedBytes += Math.min(
              meta.chunkSize || (1024 * 1024), 
              Math.max(0, (meta.totalBytes || fileSizeBytes) - start)
            ); 
          });

          const percentComplete = meta.totalBytes ? 
            Math.round((downloadedBytes / meta.totalBytes) * 1000) / 10 : 0;

          nodes.progress.style.width = (percentComplete || 0) + '%';
          nodes.metricsCard.textContent = 
            `${fmt(downloadedBytes)} / ${fmt(meta.totalBytes || fileSizeBytes)} | 0 B/s`;
          showMetrics();

          setActionButtonState('resume');
          setStatusText('Resume available', percentComplete);
          setCancelState(true);

          if (meta.fileName) nodes.fname.textContent = meta.fileName;
          if (meta.totalBytes) nodes.fsize.textContent = fmt(meta.totalBytes);

          showSettings();
          log(`Resume available: ${percentComplete.toFixed(1)}%`);
        }
      }
    } catch (e) {
      log('Error checking for existing downloads:', e && e.message);
    }

    if (!meta) {
      try { 
        if (manager && typeof manager.getMeta === 'function') {
          meta = await manager.getMeta(id); 
          if (meta && meta.completedStarts && meta.completedStarts.length > 0) {
            let downloadedBytes = 0;
            (meta.completedStarts || []).forEach(start => { 
              downloadedBytes += Math.min(
                meta.chunkSize || (1024 * 1024), 
                Math.max(0, (meta.totalBytes || fileSizeBytes) - start)
              ); 
            });

            const percentComplete = meta.totalBytes ? 
              Math.round((downloadedBytes / meta.totalBytes) * 1000) / 10 : 0;

            nodes.progress.style.width = (percentComplete || 0) + '%';
            nodes.metricsCard.textContent = 
              `${fmt(downloadedBytes)} / ${fmt(meta.totalBytes || fileSizeBytes)} | 0 B/s`;
            showMetrics();

            setActionButtonState('resume');
            setStatusText('Resume available', percentComplete);
            setCancelState(true);

            if (meta.fileName) nodes.fname.textContent = meta.fileName;
            if (meta.totalBytes) nodes.fsize.textContent = fmt(meta.totalBytes);

            showSettings();
            log(`Resume available: ${percentComplete.toFixed(1)}%`);
          }
        }
      } catch (e) { 
        log('getMeta failed', e && e.message); 
        meta = null; 
      }
    }

    if (!meta || !meta.completedStarts || meta.completedStarts.length === 0) {
      setActionButtonState('start');
      setStatusText('Ready to download');
      showSettings();
      hideMetrics();
      setCancelState(false);
    }

    function readDownloadOptions() {
      const concurrencyInput = nodes.conc;
      const chunkInput = nodes.chunk;

      const concurrency = concurrencyInput ? 
        Math.max(1, Math.min(12, parseInt(concurrencyInput.value || '4', 10) || 4)) : 4;
      const chunkKB = chunkInput ? 
        Math.max(64, parseInt(chunkInput.value || '1024', 10) || 1024) : 1024;

      return { 
        concurrency, 
        chunkSize: chunkKB * 1024 
      };
    }

    function setStatusText(text, percent = null) {
      const percentText = (typeof percent === 'number') ? 
        ` <span style="font-weight:600">(${percent.toFixed(1)}%)</span>` : '';
      nodes.status.innerHTML = `
        <i class="mdui-icon material-icons-outlined">cloud_download</i>
        <span>${text}${percentText}</span>
      `;
    }

    function updateProgressMetrics(received, total, percent, speed) {
      nodes.progress.style.width = (percent || 0) + '%';
      showMetrics();

      const speedText = speed ? utils.humanBytes(speed) + '/s' : '0 B/s';
      nodes.metricsCard.textContent = 
        `${fmt(received)} / ${fmt(total || fileSizeBytes)} | ${speedText}`;
    }

    function setActionButtonState(state) {
      const actionBtn = nodes.action;
      if (!actionBtn) return;

      actionBtn.dataset.state = state;

      switch (state) {
        case 'start':
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">download</i><span>Start</span>';
          actionBtn.classList.remove('disabled');
          actionBtn.removeAttribute('disabled');
          break;
        case 'starting':
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">autorenew</i><span>Starting</span>';
          actionBtn.classList.add('disabled');
          actionBtn.setAttribute('disabled', 'true');
          break;
        case 'pause':
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">pause</i><span>Pause</span>';
          actionBtn.classList.remove('disabled');
          actionBtn.removeAttribute('disabled');
          break;
        case 'resume':
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">play_arrow</i><span>Resume</span>';
          actionBtn.classList.remove('disabled');
          actionBtn.removeAttribute('disabled');
          setCancelState(true);
          break;
        case 'completed':
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">check_circle</i><span>Done</span>';
          actionBtn.classList.add('disabled');
          actionBtn.setAttribute('disabled', 'true');
          break;
        default:
          actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">download</i><span>Start</span>';
      }
    }

    function showDownloadMessage(concurrency, chunkSizeKB) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'download-message';
      msgDiv.textContent = 
        `Downloading with ${concurrency} parallel connections using ${chunkSizeKB}KB chunks for optimal performance.`;

      const statusLine = nodes.status;
      if (statusLine && statusLine.parentNode) {
        statusLine.parentNode.insertBefore(msgDiv, statusLine.nextSibling);

        setTimeout(() => {
          if (msgDiv && msgDiv.parentNode) {
            msgDiv.parentNode.removeChild(msgDiv);
          }
        }, 4000);
      }
    }

    async function completeDataCleanup() {
      try {
        if (task && typeof task.cancelAndClear === 'function') {
          await task.cancelAndClear();
          log('Task data cleared');
        } else if (manager && typeof manager.completeCleanup === 'function') {
          await manager.completeCleanup(id);
          log('Manager complete cleanup performed');
        } else if (manager && typeof manager.clearById === 'function') {
          await manager.clearById(id);
          log('Data cleared by ID');
        }
      } catch (e) {
        log('Error during complete cleanup', e && e.message);
      }

      meta = null;
      task = null;
      nodes.progress.style.width = '0%';
      hideMetrics();
      nodes.metricsCard.textContent = `0 / ${fmt(fileSizeBytes)} | 0 B/s`;
      setActionButtonState('start');
      setStatusText('Ready to download');
      setCancelState(false);
      showSettings();
      stopPulse();
    }

    function showErrorMessage(message, allowFallback = true) {
      hideSettings();

      nodes.errorArea.innerHTML = `
        <div class="error-area">
          <div style="font-weight:700;margin-bottom:8px;">${message}</div>
          ${allowFallback ? `
            <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
              <button id="fallback_${tag}" class="glassy-btn" style="min-width:160px">
                <i class="mdui-icon material-icons-outlined">download</i>
                <span>Use Browser Download</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
      nodes.errorArea.style.display = 'block';

      if (allowFallback) {
        const fallbackBtn = byId(`fallback_${tag}`);
        if (fallbackBtn) {
          fallbackBtn.addEventListener('click', async () => {
            await completeDataCleanup();
            startFallbackDownload('user-requested', message);
          });
        }
      }
    }

    function clearErrorMessage() { 
      nodes.errorArea.style.display = 'none'; 
      nodes.errorArea.innerHTML = ''; 
      showSettings();
    }

    function showCompletionAnimation() {
      const completionHTML = `
        <div class="completion-wrap" aria-live="polite">
          <div class="success-circle">
            <div class="success-inner">
              <svg class="success-check" viewBox="0 0 52 52">
                <path d="M14 27l8 8 16-16"/>
              </svg>
            </div>
          </div>
          <div class="success-message">
            Download completed successfully!
          </div>
          <div class="success-details">
            File has been saved to your downloads folder
          </div>
        </div>
      `;

      nodes.main.innerHTML = completionHTML;

      setTimeout(() => {
        container.classList.add('download-completed');
      }, 1200);

      setStatusText('Download completed successfully', 100);
      updateProgressMetrics(
        (meta && meta.totalBytes) || fileSizeBytes || 0,
        (meta && meta.totalBytes) || fileSizeBytes || 0,
        100,
        0
      );
    }

    function showFallbackCompletionAnimation() {
      const fallbackCompletionHTML = `
        <div class="completion-wrap" aria-live="polite">
          <div class="success-circle">
            <div class="success-inner">
              <svg class="success-check" viewBox="0 0 52 52">
                <path d="M14 27l8 8 16-16"/>
              </svg>
            </div>
          </div>
          <div class="success-message">
            Download initiated via browser!
          </div>
          <div class="success-details">
            Check your downloads folder for the file
          </div>
        </div>
      `;

      nodes.main.innerHTML = fallbackCompletionHTML;

      setTimeout(() => {
        container.classList.add('download-completed');
      }, 1200);

      setStatusText('Browser download initiated', 100);
    }

    function wireTaskEvents(downloadTask) {
      if (!downloadTask || downloadTask.__events_wired) return;

      log('Wiring task events');
      task = downloadTask;
      downloadTask.__events_wired = true;

      try { 
        if (downloadTask.removeAllListeners && typeof downloadTask.removeAllListeners === 'function') {
          downloadTask.removeAllListeners(); 
        }
      } catch (e) { /* ignore */ }

      downloadTask.on && downloadTask.on('start', (data = {}) => {
        const { totalBytes = 0, fileName: actualName } = data;

        if (actualName) nodes.fname.textContent = actualName;
        if (totalBytes) nodes.fsize.textContent = fmt(totalBytes);

        setActionButtonState('pause');
        setStatusText('Downloading', 0);
        hideSettings();
        clearErrorMessage();
        setCancelState(false);
        startPulse();

        const { concurrency, chunkSize } = readDownloadOptions();
        showDownloadMessage(concurrency, Math.round(chunkSize / 1024));
      });

      downloadTask.on && downloadTask.on('progress', (data = {}) => {
        const { receivedBytes = 0, totalBytes = 0, percent = 0 } = data;
        const currentSpeed = downloadTask._speedBps || downloadTask.speed || 0;
        updateProgressMetrics(receivedBytes, totalBytes, percent, currentSpeed);
        setStatusText('Downloading', percent);
      });

      downloadTask.on && downloadTask.on('speed', (data = {}) => {
        try {
          const { pretty, bps } = data;
          const speedDisplay = pretty || (bps ? utils.humanBytes(bps) + '/s' : '0 B/s');
          const progressPart = (nodes.metricsCard.textContent || '').split('|')[0].trim();
          nodes.metricsCard.textContent = `${progressPart} | ${speedDisplay}`;
        } catch (e) { /* ignore */ }
      });

      downloadTask.on && downloadTask.on('status', (data = {}) => {
        const { text } = data;
        if (!text) return;

        const statusLower = String(text).toLowerCase();
        log('Task status:', text);

        if (statusLower.includes('paused')) {
          setStatusText('Download paused');
          setActionButtonState('resume');
          setCancelState(true);
          showSettings();
          stopPulse();
        } else if (statusLower.includes('resum')) {
          setStatusText('Resuming download');
          setActionButtonState('pause');
          setCancelState(false);
          hideSettings();
          startPulse();
        } else if (statusLower.includes('cancel')) {
          setStatusText('Download cancelled');
          setActionButtonState('start');
          setCancelState(false);
          hideMetrics();
          showSettings();
          stopPulse();
        } else {
          setStatusText(text);
        }
      });

      downloadTask.on && downloadTask.on('error', async (data = {}) => {
        const errorMessage = (data && data.message) ? data.message : 'Download error occurred';
        log('Task error:', errorMessage);

        try { 
          if (downloadTask && typeof downloadTask.pause === 'function') {
            await downloadTask.pause(); 
          }
        } catch (e) { 
          log('Pause after error failed', e && e.message); 
        }

        setStatusText('Paused due to connection issue');
        setActionButtonState('resume');
        setCancelState(true);
        stopPulse();

        showErrorMessage(
          `${errorMessage} — Network interruption detected. Resume when ready or use browser download.`, 
          true
        );
      });

      downloadTask.on && downloadTask.on('complete', async (data = {}) => {
        log('Download completed successfully');
        const { href, fileName: completedName, blob } = data || {};
        const finalFileName = completedName || meta && meta.fileName || fileName || 'download';

        try {
          setActionButtonState('completed');
          setCancelState(false);
          stopPulse();

          showCompletionAnimation();

          let downloadUrl = null;
          if (href) {
            downloadUrl = href;
          } else if (blob) {
            downloadUrl = URL.createObjectURL(blob);
          }

          if (downloadUrl) {
            try {
              const downloadLink = document.createElement('a');
              downloadLink.href = downloadUrl;
              downloadLink.download = finalFileName;
              downloadLink.style.display = 'none';
              document.body.appendChild(downloadLink);
              downloadLink.click();
              downloadLink.remove();

              if (blob && downloadUrl.startsWith('blob:')) {
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);
              }
            } catch (e) { 
              log('Auto-save failed', e && e.message); 
            }
          }

          // Complete cleanup after a delay
          setTimeout(async () => {
            try {
              if (manager && typeof manager.completeCleanup === 'function') {
                await manager.completeCleanup(id);
              }
            } catch (e) {
              log('Cleanup after completion failed', e && e.message);
            }
          }, 2000);

        } catch (e) { 
          log('Completion handler error', e && e.message); 
        }
      });
    }

    async function handleActionClick(event) {
      event && event.preventDefault();
      clearErrorMessage();

      const currentState = nodes.action.dataset.state || 'start';
      log('Action button clicked:', currentState);

      try {
        if (currentState === 'start') {
          setActionButtonState('starting');
          setStatusText('Initializing secure download...');

          if (!window.indexedDB) { 
            showErrorMessage('Advanced downloading not supported. Use browser download.', true); 
            return; 
          }

          if (!manager || typeof manager.start !== 'function') { 
            showErrorMessage('Download manager unavailable. Use browser download.', true); 
            return; 
          }

          try {
            if (typeof manager.checkQuota === 'function') {
              const quotaInfo = await manager.checkQuota(fileSizeBytes || 0);
              log('Storage quota check:', quotaInfo);

              if (quotaInfo && quotaInfo.supported && !quotaInfo.sufficient) { 
                showErrorMessage('Insufficient storage space. Use browser download.', true); 
                return; 
              }
            }
          } catch (e) { 
            log('Quota check error', e && e.message); 
          }

          try {
            const { concurrency, chunkSize } = readDownloadOptions();
            const downloadTask = await manager.start({ 
              id, 
              url, 
              fileName, 
              fileSizeBytes, 
              chunkSize, 
              concurrency 
            });

            if (!downloadTask) throw new Error('Download manager returned no task');

            meta = downloadTask.meta || meta;
            if (meta && meta.fileName) nodes.fname.textContent = meta.fileName;
            if (meta && meta.totalBytes) nodes.fsize.textContent = fmt(meta.totalBytes);

            wireTaskEvents(downloadTask);

            setTimeout(() => { 
              setStatusText('Starting download...', 0); 
              showMetrics(); 
              updateProgressMetrics(0, meta?.totalBytes || fileSizeBytes || 0, 0, 0); 
            }, 80);

            await downloadTask.start();
            log('Download task started successfully');
          } catch (error) {
            log('Start download error', error && error.message);

            try {
              if (manager && typeof manager.completeCleanup === 'function') {
                await manager.completeCleanup(id);
              }
            } catch (e) { 
              log('Clear on start error failed', e && e.message); 
            }

            showErrorMessage('Failed to initialize download. Use browser download.', true);
            setActionButtonState('start');
            return;
          }

        } else if (currentState === 'pause') {
          log('Pause requested');

          try {
            if (task && typeof task.pause === 'function') {
              await task.pause();
            } else if (manager && typeof manager.pause === 'function') {
              await manager.pause();
            } else {
              setStatusText('Download paused');
              setActionButtonState('resume');
              setCancelState(true);
              showSettings();
              stopPulse();
            }
          } catch (e) { 
            log('Pause failed', e && e.message); 
            showErrorMessage('Failed to pause download. Use browser download.', true); 
          }

        } else if (currentState === 'resume') {
          log('Resume requested');
          clearErrorMessage();

          try {
            const { concurrency, chunkSize } = readDownloadOptions();

            if (manager && typeof manager.resume === 'function') {
              await manager.resume(id, url, fileName, fileSizeBytes, chunkSize, concurrency);
            } else {
              throw new Error('Resume method not available');
            }

            // Get the current task from manager after resume
            task = manager.current;

            if (task) {
              wireTaskEvents(task);
              log('Resume successful, task events wired');
            }

          } catch (e) { 
            log('Resume failed', e && e.message); 
            showErrorMessage('Failed to resume download. Use browser download.', true); 
          }
        }
      } catch (error) { 
        log('Unexpected action error', error && error.message); 
        showErrorMessage('Unexpected error occurred. Use browser download.', true); 
        setActionButtonState('start'); 
      }
    }

    nodes.action.addEventListener('click', handleActionClick);

    nodes.cancel.addEventListener('click', async (event) => {
      event && event.preventDefault();
      clearErrorMessage();

      if (nodes.cancel.getAttribute('aria-disabled') === 'true') return;

      log('Cancel button clicked');

      try {
        await completeDataCleanup();
        setStatusText('Download cancelled');
      } catch (e) { 
        log('Cancel error', e && e.message); 
        showErrorMessage('Failed to cancel download. Please try again.', false); 
      }
    });

    let longPressTimer = null;
    nodes.action.addEventListener('pointerdown', () => {
      const state = nodes.action.dataset.state || '';
      if (state.toLowerCase().includes('resume')) {
        longPressTimer = setTimeout(async () => {
          log('Long press detected: clearing saved chunks');
          try {
            await completeDataCleanup();
            setStatusText('Saved progress cleared');
          } catch (e) { 
            log('Clear chunks error', e && e.message); 
            showErrorMessage('Failed to clear saved progress.', false); 
          }
        }, 1200);
      }
    });

    document.addEventListener('pointerup', () => { 
      if (longPressTimer) { 
        clearTimeout(longPressTimer); 
        longPressTimer = null; 
      } 
    });

    function startFallbackDownload(reason, errorMessage) {
      if (fallbackActive) return;
      fallbackActive = true;

      log('Starting fallback download:', reason);

      nodes.action.classList.add('disabled');
      nodes.action.setAttribute('disabled', 'true');
      setCancelState(false);
      showMetrics();
      hideSettings();
      startPulse();

      const simulationDuration = 5000 + Math.floor(Math.random() * 3000);
      const startTime = Date.now();
      let lastPercent = 0;
      const updateInterval = 120;

      fallbackTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let progress = Math.min(1, elapsed / simulationDuration);
        progress = Math.pow(progress, 0.9);

        const currentPercent = Math.floor(progress * 100);
        lastPercent = (currentPercent <= lastPercent) ? 
          Math.min(99, lastPercent + 1) : currentPercent;

        nodes.progress.style.width = lastPercent + '%';

        const totalSize = (meta && meta.totalBytes) ? meta.totalBytes : (fileSizeBytes || 0);
        const simulatedReceived = totalSize ? 
          Math.round((lastPercent / 100) * totalSize) : lastPercent * 1024;
        const simulatedSpeed = Math.max(1024, 
          Math.round(simulatedReceived / Math.max(1, elapsed / 1000)));

        nodes.metricsCard.textContent = 
          `${fmt(simulatedReceived)} / ${fmt(totalSize || 0)} | ${utils.humanBytes(simulatedSpeed)}/s`;
        setStatusText('Downloading via browser', lastPercent);

        if (lastPercent >= 98) {
          clearInterval(fallbackTimer);
          fallbackTimer = null;

          setTimeout(async () => {
            try {
              await completeDataCleanup();
            } catch (e) {
              log('Cleanup before browser download failed', e && e.message);
            }
          }, 100);

          try {
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = fileName || '';
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
          } catch (e) { 
            log('Fallback download failed', e && e.message); 
          }

          setTimeout(() => {
            showFallbackCompletionAnimation();
            nodes.action.classList.add('disabled');
            nodes.action.setAttribute('disabled', 'true');
            nodes.cancel.classList.add('disabled');
            nodes.cancel.setAttribute('aria-disabled', 'true');
            stopPulse();
            fallbackActive = false;
          }, 1200);
        }
      }, updateInterval);
    }

    try {
      if (dialog && dialog.$element) {
        dialog.$element.on('close.dialog', () => {
          if (fallbackTimer) clearInterval(fallbackTimer);
          stopPulse();
        });
      }
    } catch (e) { /* ignore */ }

  }, 150);

  return dialog;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openIDBDownloaderDialog };
} else if (typeof window !== 'undefined') {
  window.openIDBDownloaderDialog = openIDBDownloaderDialog;
}