/*
 * idb-downloader-dialog-enhanced.js
 * 
 * ENHANCED VERSION v1.5.0: Professional download dialog with bulletproof validation
 * All duplicate function errors fixed, complete feature implementation
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
    VERSION: '1.5.0'
  };
  
  const fmt = (typeof window.formatFileSize === 'function') ? window.formatFileSize : utils.humanBytes;

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
    browser: `dl_browser_${tag}`,
    errorArea: `dl_errorarea_${tag}`,
    controls: `dl_controls_${tag}`,
    conc: `dl_conc_${tag}`,
    chunk: `dl_chunk_${tag}`,
    settings: `dl_settings_${tag}`,
    readyMessage: `dl_ready_${tag}`,
    quotaMessage: `dl_quota_${tag}`
  };

  const html = `
<style>
:root{
  --dl-font: "Lexend", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  --dl-primary: #64b5f6;
  --dl-accent: #1976d2;
  --dl-success-fill: #2e7d32;
  --dl-success-fill-light: #e8f5e8;
  --dl-success-outline: #4caf50;
  --dl-meta-bg: rgba(173, 216, 230, 0.3);
  --dl-btn-bg: rgba(173, 216, 230, 0.15);
  --dl-border-radius: 18px;
  --dl-error-bg: rgba(244,67,54,0.06);
  --dl-error-border: rgba(244,67,54,0.2);
  --dl-error-text: #d32f2f;
  --dl-text-primary: #000000;
  --dl-text-secondary: #333333;
}

@keyframes premiumFadeIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); filter: blur(8px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes premiumFadeOut {
  from { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  to { opacity: 0; transform: translateY(-15px) scale(0.98); filter: blur(4px); }
}

@keyframes premiumSlideOut {
  from { opacity: 1; transform: translateY(0) scale(1); max-height: 200px; }
  to { opacity: 0; transform: translateY(-20px) scale(0.95); max-height: 0; }
}

@keyframes buttonBlur {
  0% { filter: blur(0px); transform: scale(1); }
  50% { filter: blur(2px); transform: scale(0.98); }
  100% { filter: blur(0px); transform: scale(1); }
}

/* NEW: Enhanced completion animations with bold tick and green sphere */
@keyframes boldTickEntry {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
    stroke-dasharray: 0, 100;
  }
  50% {
    transform: scale(0.8) rotate(-90deg);
    opacity: 0.7;
    stroke-dasharray: 50, 100;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
    stroke-dasharray: 100, 100;
  }
}

@keyframes greenSphereGrow {
  0% {
    transform: scale(0);
    opacity: 0;
    background: #cccccc;
    border-color: #aaaaaa;
  }
  30% {
    transform: scale(0.6);
    opacity: 0.5;
    background: #81c784;
    border-color: #66bb6a;
  }
  60% {
    transform: scale(1.1);
    opacity: 0.8;
    background: #4caf50;
    border-color: #43a047;
  }
  100% {
    transform: scale(1);
    opacity: 1;
    background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
    border-color: #81c784;
  }
}

@keyframes rippleWave {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.8);
  }
  25% {
    transform: scale(1.05);
    box-shadow: 0 0 0 15px rgba(76, 175, 80, 0.6);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 30px rgba(76, 175, 80, 0.4);
  }
  75% {
    transform: scale(1.05);
    box-shadow: 0 0 0 45px rgba(76, 175, 80, 0.2);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 60px rgba(76, 175, 80, 0);
  }
}

@keyframes borderPulse {
  0%, 100% {
    border-color: #81c784;
    box-shadow: 0 0 20px rgba(129, 199, 132, 0.4);
  }
  50% {
    border-color: #4caf50;
    box-shadow: 0 0 40px rgba(76, 175, 80, 0.6);
  }
}

.download-card{
  font-family: var(--dl-font);
  max-width: 480px;
  padding: 16px;
  border-radius: var(--dl-border-radius);
  margin: 0 auto;
  background: rgba(255,255,255,0.98);
  color: var(--dl-text-primary);
  text-align: center;
  box-sizing: border-box;
  position: relative;
  animation: premiumFadeIn 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.file-metadata{
  background: var(--dl-meta-bg);
  border-radius: var(--dl-border-radius);
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: premiumFadeIn 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms both;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.file-metadata.fade-out {
  animation: premiumFadeOut 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.main-icon{
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px !important;
  color: var(--dl-text-primary);
  border-radius: var(--dl-border-radius);
  position: relative;
  transition: all 0.3s ease;
}

.main-icon.downloading {
  animation: iconPulse 2s ease-in-out infinite;
}

.main-icon.completed {
  color: var(--dl-success-fill);
}

@keyframes iconPulse{
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

.meta-name{
  font-weight: 400;
  font-size: 1.0rem;
  line-height: 1.3;
  word-break: break-word;
  overflow-wrap: anywhere;
  margin: 0;
  max-width: 100%;
  color: var(--dl-text-primary);
}

.meta-size{
  font-size: 0.86rem;
  color: var(--dl-text-secondary);
  opacity: 0.95;
  font-weight: 300;
  margin: 0;
}

.settings-panel{
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin: 8px 0 12px 0;
  padding: 8px;
  animation: premiumFadeIn 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 400ms both;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.settings-panel.settings-hidden{
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  animation: premiumSlideOut 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.setting-group{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.setting-label{
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--dl-text-secondary);
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-input{
  width: 64px;
  padding: 5px 7px;
  border: 1px solid rgba(120,120,120,0.3);
  border-radius: 8px;
  background: rgba(255,255,255,0.95);
  font-size: 0.82rem;
  font-weight: 400;
  text-align: center;
  color: var(--dl-text-primary);
  transition: all 0.2s ease;
}

.setting-input:focus{
  outline: none;
  border-color: var(--dl-primary);
  background: rgba(255,255,255,1);
  box-shadow: 0 0 0 2px rgba(100,181,246,0.1);
}

.setting-input.invalid {
  border-color: var(--dl-error-text) !important;
  background: rgba(244,67,54,0.05) !important;
  color: var(--dl-error-text) !important;
  box-shadow: 0 0 0 2px rgba(244,67,54,0.1) !important;
}

.main-block{
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  animation: premiumFadeIn 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 300ms both;
}

.ready-message, .quota-message{
  font-size: 0.9rem;
  color: var(--dl-accent);
  background: rgba(100,181,246,0.08);
  padding: 12px 16px;
  border-radius: var(--dl-border-radius);
  margin: 8px 0;
  border: 1px solid rgba(100,181,246,0.15);
  font-weight: 300;
  line-height: 1.4;
  animation: premiumFadeIn 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.ready-message i, .quota-message i{
  font-size: 20px;
  color: var(--dl-primary);
}

.ready-message.hidden, .quota-message.hidden{
  display: none;
}

.status-line{
  display: none;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-weight: 400;
  font-size: 0.94rem;
  color: var(--dl-accent);
  margin: 0;
  min-height: 26px;
}

.status-line.visible{
  display: flex;
}

.status-line i{
  font-size: 18px;
  color: var(--dl-primary);
}

.metrics-card{
  display: none;
  margin: 2px 0;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--dl-meta-bg);
  font-size: 0.62rem;
  font-weight: 300;
  color: var(--dl-text-primary);
  min-width: 100px;
  line-height: 1.1;
  transition: all 0.3s ease;
  position: relative;
  max-width: 200px;
  margin-left: auto;
  margin-right: auto;
}

.metrics-card.visible{
  display: inline-block;
  animation: premiumFadeIn 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.metrics-card.hidden{
  display: none;
  animation: premiumFadeOut 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.buttons-row{
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
  animation: premiumFadeIn 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 500ms both;
}

.glassy-btn{
  border: none;
  border-radius: var(--dl-border-radius);
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--dl-btn-bg) !important;
  cursor: pointer;
  font-weight: 400;
  color: var(--dl-accent);
  min-width: 90px;
  font-size: 0.8rem;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
  z-index: 10;
  pointer-events: all;
  touch-action: manipulation;
  user-select: none;
  box-shadow: 0 2px 8px rgba(100,181,246,0.15);
}

.glassy-btn::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  z-index: -1;
}

.glassy-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100,181,246,0.2), transparent);
  transition: left 0.5s ease;
}

.glassy-btn:hover::after {
  left: 100%;
}

.glassy-btn:hover{
  color: #1565c0;
  background: rgba(173, 216, 230, 0.35) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(100, 181, 246, 0.4);
}

.glassy-btn:active {
  animation: buttonBlur 200ms ease;
  transform: translateY(0);
}

.glassy-btn.enabled {
  background: var(--dl-btn-bg) !important;
}

.glassy-btn.enabled:hover {
  background: rgba(173, 216, 230, 0.35) !important;
}

.glassy-btn i{
  font-size: 16px;
}

.glassy-btn.disabled,.glassy-btn[disabled]{
  opacity: 0.5;
  pointer-events: none;
  filter: grayscale(0.3);
  transform: none !important;
}

.glassy-btn.cancel-enabled{ 
  color: #d32f2f;
  background: rgba(244,67,54,0.08) !important;
  box-shadow: 0 2px 8px rgba(244,67,54,0.15);
}

.glassy-btn.cancel-enabled:hover{
  background: rgba(244,67,54,0.18) !important;
  box-shadow: 0 6px 16px rgba(244,67,54,0.3);
}

/* NEW: Bold Tick and Green Sphere Completion Animation */
.completion-container{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 20px;
  background: linear-gradient(135deg, 
    rgba(129,199,132,0.1) 0%, 
    rgba(102,187,106,0.15) 25%, 
    rgba(76,175,80,0.2) 50%, 
    rgba(67,160,71,0.15) 75%, 
    rgba(56,142,60,0.1) 100%);
  border-radius: var(--dl-border-radius);
  position: relative;
  overflow: hidden;
}

.completion-sphere{
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border: 4px solid #81c784;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: 
    greenSphereGrow 1000ms cubic-bezier(0.68, -0.55, 0.265, 1.55) both,
    rippleWave 2s ease-out 1200ms infinite,
    borderPulse 3s ease-in-out 1500ms infinite;
  box-shadow: 
    0 8px 32px rgba(76, 175, 80, 0.3),
    inset 0 4px 12px rgba(255, 255, 255, 0.2);
}

.completion-tick{
  width: 60px;
  height: 60px;
  position: relative;
  animation: boldTickEntry 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55) 600ms both;
}

.completion-tick svg {
  width: 100%;
  height: 100%;
  stroke: white;
  stroke-width: 6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.completion-message{
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--dl-success-fill);
  margin: 0;
  animation: premiumFadeIn 600ms ease 1400ms both;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  letter-spacing: 0.5px;
}

.completion-details{
  font-size: 0.88rem;
  color: var(--dl-text-primary);
  animation: premiumFadeIn 500ms ease 1600ms both;
  text-align: center;
  line-height: 1.6;
  opacity: 0.9;
  max-width: 340px;
  font-weight: 300;
  margin: 0;
}

.error-area{
  font-size: 0.86rem;
  color: var(--dl-error-text);
  padding: 14px 18px;
  border-radius: var(--dl-border-radius);
  background: var(--dl-error-bg);
  border: 1px solid var(--dl-error-border);
  margin: 10px 0;
  line-height: 1.4;
  animation: premiumFadeIn 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 2px 8px rgba(244,67,54,0.1);
  font-weight: 300;
}

.error-area.fade-out {
  animation: premiumFadeOut 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.download-message{
  font-size: 0.74rem;
  color: var(--dl-accent);
  background: rgba(100,181,246,0.06);
  padding: 6px 12px;
  border-radius: var(--dl-border-radius);
  margin: 4px 0;
  border: 1px solid rgba(100,181,246,0.2);
  font-weight: 300;
  line-height: 1.3;
  animation: premiumFadeIn 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.download-message.fade-out {
  animation: premiumFadeOut 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.divider{
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg,transparent,rgba(0,0,0,0.10),transparent);
  margin: 20px 0 16px 0;
}

.final-note{
  font-size: 0.78rem;
  color: var(--dl-text-primary);
  text-align: center;
  line-height: 1.5;
  padding-bottom: 6px;
  opacity: 0.85;
  font-weight: 300;
}

@media (max-width: 600px){
  .download-card{
    padding: 14px;
    max-width: 95vw;
    margin: 6px auto;
  }
  .main-icon{
    width: 60px;
    height: 60px;
    font-size: 56px !important;
  }
  .meta-name{
    font-size: 0.96rem;
  }
  .settings-panel{
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  .setting-group{
    flex-direction: row;
    gap: 8px;
    min-width: auto;
  }
  .setting-input{
    width: 56px;
    font-size: 0.8rem;
  }
  .setting-label{
    font-size: 0.7rem;
    min-width: 70px;
  }
  .buttons-row{
    gap: 8px;
  }
  .glassy-btn{
    min-width: 85px;
    font-size: 0.78rem;
    padding: 8px 14px;
  }
  .completion-sphere{
    width: 100px;
    height: 100px;
  }
  .completion-tick{
    width: 50px;
    height: 50px;
  }
  .metrics-card{
    font-size: 0.58rem;
    padding: 1px 4px;
    max-width: 180px;
  }
}
</style>

  <div class="download-card" id="${IDS.root}" role="dialog" aria-label="Download Manager v1.5.0">
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
    <div class="ready-message" id="${IDS.readyMessage}">
      <i class="mdui-icon material-icons-outlined">info</i>
      <span>Click Start to begin secure parallel download with automatic resume capability</span>
    </div>

    <div class="quota-message hidden" id="${IDS.quotaMessage}">
      <i class="mdui-icon material-icons-outlined">storage</i>
      <span>Checking available storage space...</span>
    </div>

    <div class="status-line" id="${IDS.status}">
      <i class="mdui-icon material-icons-outlined">cloud_download</i>
      <span>Ready to download</span>
    </div>

    <div class="mdui-progress" id="${IDS.progress}" style="display: none;">
      <div class="mdui-progress-indeterminate"></div>
    </div>

    <div id="${IDS.metricsCard}" class="metrics-card hidden">
      Fetching details
    </div>

    <div class="buttons-row">
      <button class="glassy-btn disabled" id="${IDS.action}" data-state="start" aria-label="Start download">
        <i class="mdui-icon material-icons-outlined">download</i>
        <span>Start</span>
      </button>
      <button class="glassy-btn disabled" id="${IDS.cancel}" aria-disabled="true">
        <i class="mdui-icon material-icons-outlined">close</i>
        <span>Cancel</span>
      </button>
      <button class="glassy-btn disabled" id="${IDS.browser}" aria-label="Use browser download">
        <i class="mdui-icon material-icons-outlined">open_in_browser</i>
        <span>Browser</span>
      </button>
    </div>
  </div>

  <div id="${IDS.errorArea}" style="display:none;"></div>

  <div class="divider"></div>

  <div class="final-note">
    Secure parallel downloading with automatic resume capability v1.5.0. 
    Downloads continue when browser is in background with dialog open.
  </div>
</div>
`;

  const dialog = mdui.dialog({
    content: html,
    buttons: [
      { text: 'Close' }
    ],
    history: false,
    modal: true,
    closeOnEsc: true
  });

  const log = (...v) => console.log('[R-ServiceX-Downloader]', ...v);
  const byId = (id) => document.getElementById(id);

  const handleDialogClose = () => {
    try {
      if (manager && typeof manager.setDialogOpen === 'function') {
        manager.setDialogOpen(false);
      }
    } catch (e) {
      console.warn('[R-ServiceX-Downloader] Error handling dialog close:', e);
    }
  };

  const setupDialogEventHandlers = () => {
    try {
      if (dialog && dialog.$element) {
        dialog.$element.on('click', '.mdui-dialog-actions .mdui-btn', function (ev) {
          try {
            const text = (this && this.textContent) ? this.textContent.trim() : '';
            if (text === 'Close') {
              handleDialogClose();
              dialog.close();
            }
          } catch (e) { 
            console.warn('[R-ServiceX-Downloader] Error in close button handler:', e);
          }
        });

        dialog.$element.on('close.dialog', handleDialogClose);
      } else {
        setTimeout(() => {
          try {
            const root = document.querySelector('.mdui-dialog');
            if (root) {
              root.addEventListener('click', (e) => {
                try {
                  const btn = e.target.closest('.mdui-dialog-actions .mdui-btn');
                  if (!btn) return;
                  if ((btn.textContent || '').trim() === 'Close') {
                    handleDialogClose();
                    dialog.close(); 
                  }
                } catch (err) {
                  console.warn('[R-ServiceX-Downloader] Error in click handler:', err);
                }
              });
            }
          } catch (e) {
            console.warn('[R-ServiceX-Downloader] Error setting up close handler:', e);
          }
        }, 100);
      }
    } catch (e) {
      console.error('[R-ServiceX-Downloader] Error setting up dialog handlers:', e);
    }
  };

  setupDialogEventHandlers();

  setTimeout(async () => {
    try {
      const dialogs = Array.from(document.querySelectorAll('.mdui-dialog'));
      const rootDialog = dialogs.length ? dialogs[dialogs.length - 1] : document.querySelector('.mdui-dialog');
      if (!rootDialog) { 
        console.error('[R-ServiceX-Downloader] Dialog root not found'); 
        return; 
      }

      const container = rootDialog.querySelector(`#${IDS.root}`);
      if (!container) { 
        console.error('[R-ServiceX-Downloader] Container not found'); 
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
        browser: byId(IDS.browser),
        errorArea: byId(IDS.errorArea),
        conc: byId(IDS.conc),
        chunk: byId(IDS.chunk),
        settings: byId(IDS.settings),
        readyMessage: byId(IDS.readyMessage),
        quotaMessage: byId(IDS.quotaMessage)
      };

      if (!nodes.action) { 
        console.error('[R-ServiceX-Downloader] Essential UI elements missing'); 
        return; 
      }

      try {
        if (manager && typeof manager.setDialogOpen === 'function') {
          manager.setDialogOpen(true);
        }
      } catch (e) {
        console.warn('[R-ServiceX-Downloader] Error setting dialog open:', e);
      }

      try {
        if (fileName) nodes.fname.textContent = fileName;
        if (fileSizeBytes || fileSizeBytes === 0) nodes.fsize.textContent = fmt(fileSizeBytes);
        nodes.errorArea.style.display = 'none';
      } catch (e) {
        console.warn('[R-ServiceX-Downloader] Error initializing UI state:', e);
      }

      // State variables
      let hasStarted = false;
      let isCompleted = false;
      let isProcessing = false;
      let currentProgressPercent = 0;
      let meta = null;
      let task = null;
      let fallbackTimer = null;
      let fallbackActive = false;
      let pauseInProgress = false;
      let pauseClickTimeout = null;
      let persistentDownloadMessage = null;
      let actualDownloadStarted = false;

      const setProgressIndeterminate = (indeterminate) => {
        try {
          if (!nodes.progress) return;
          
          const progressContainer = nodes.progress;
          
          if (indeterminate) {
            progressContainer.innerHTML = '<div class="mdui-progress-indeterminate"></div>';
          } else {
            if (currentProgressPercent >= 0) {
              progressContainer.innerHTML = `<div class="mdui-progress-determinate" style="width: ${currentProgressPercent}%;"></div>`;
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting progress indeterminate:', e);
        }
      };

      const showMetrics = () => {
        try {
          if (nodes.metricsCard) {
            nodes.metricsCard.classList.remove('hidden');
            nodes.metricsCard.classList.add('visible');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing metrics:', e);
        }
      };

      const hideMetrics = () => {
        try {
          if (nodes.metricsCard) {
            nodes.metricsCard.classList.remove('visible');
            nodes.metricsCard.classList.add('hidden');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding metrics:', e);
        }
      };

      const showReadyMessage = () => {
        try {
          if (nodes.readyMessage) {
            nodes.readyMessage.classList.remove('hidden');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing ready message:', e);
        }
      };

      const hideReadyMessage = () => {
        try {
          if (nodes.readyMessage) {
            nodes.readyMessage.classList.add('hidden');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding ready message:', e);
        }
      };

      const showQuotaMessage = (message) => {
        try {
          if (nodes.quotaMessage) {
            nodes.quotaMessage.querySelector('span').textContent = message;
            nodes.quotaMessage.classList.remove('hidden');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing quota message:', e);
        }
      };

      const hideQuotaMessage = () => {
        try {
          if (nodes.quotaMessage) {
            nodes.quotaMessage.classList.add('hidden');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding quota message:', e);
        }
      };

      const showProgressBar = () => {
        try {
          if (nodes.progress) {
            nodes.progress.style.display = 'block';
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing progress bar:', e);
        }
      };

      const hideProgressBar = () => {
        try {
          if (nodes.progress) {
            nodes.progress.style.display = 'none';
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding progress bar:', e);
        }
      };

      const showStatusLine = () => {
        try {
          if (nodes.status) {
            nodes.status.classList.add('visible');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing status line:', e);
        }
      };

      const hideStatusLine = () => {
        try {
          if (nodes.status) {
            nodes.status.classList.remove('visible');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding status line:', e);
        }
      };



      const setProgressDeterminate = (percent) => {
        try {
          if (!nodes.progress) return;
          const clampedPercent = Math.max(0, Math.min(100, percent || 0));
          nodes.progress.innerHTML = `<div class="mdui-progress-determinate" style="width: ${clampedPercent}%;"></div>`;
          currentProgressPercent = clampedPercent;
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting progress determinate:', e);
        }
      };

      const setStatusText = (text, percent = null) => {
        try {
          if (!nodes.status) return;
          
          const percentText = (typeof percent === 'number') ? 
            ` <span style="font-weight:400">(${percent.toFixed(1)}%)</span>` : '';
          
          const cleanText = String(text || '').replace(/\.+$/, '');
          
          nodes.status.innerHTML = `
            <i class="mdui-icon material-icons-outlined">cloud_download</i>
            <span>${cleanText}${percentText}</span>
          `;
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting status text:', e);
        }
      };

      const showSettings = () => {
        try {
          if (nodes.settings && !isCompleted) {
            nodes.settings.classList.remove('settings-hidden');
            nodes.settings.style.display = 'flex';
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing settings:', e);
        }
      };

      const hideSettings = () => {
        try {
          if (nodes.settings) {
            nodes.settings.classList.add('settings-hidden');
            setTimeout(() => {
              if (nodes.settings && nodes.settings.classList.contains('settings-hidden')) {
                nodes.settings.style.display = 'none';
              }
            }, 400);
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error hiding settings:', e);
        }
      };

      const startIconPulse = () => {
        try {
          if (nodes.icon) {
            nodes.icon.classList.remove('completed');
            nodes.icon.classList.add('downloading');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error starting icon pulse:', e);
        }
      };

      const stopIconPulse = () => {
        try {
          if (nodes.icon) {
            nodes.icon.classList.remove('downloading');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error stopping icon pulse:', e);
        }
      };

      const setIconCompleted = () => {
        try {
          if (nodes.icon) {
            nodes.icon.classList.remove('downloading');
            nodes.icon.classList.add('completed');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting icon completed:', e);
        }
      };

      const setCancelState = (enabled) => {
        try {
          if (!nodes.cancel) return;
          if (enabled && !isCompleted) {
            nodes.cancel.classList.remove('disabled');
            nodes.cancel.removeAttribute('aria-disabled');
            nodes.cancel.classList.add('cancel-enabled');
          } else {
            nodes.cancel.classList.add('disabled');
            nodes.cancel.setAttribute('aria-disabled', 'true');
            nodes.cancel.classList.remove('cancel-enabled');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting cancel state:', e);
        }
      };

      const setBrowserButtonState = (enabled) => {
        try {
          if (!nodes.browser) return;
          
          const actionState = nodes.action.dataset.state || 'start';
          const shouldEnable = enabled && !isCompleted && !isProcessing && 
            (actionState === 'start' || actionState === 'resume' || 
             (actionState === 'pause' && hasStarted));
          
          if (shouldEnable) {
            nodes.browser.classList.remove('disabled');
            nodes.browser.removeAttribute('disabled');
            nodes.browser.classList.add('enabled');
          } else {
            nodes.browser.classList.add('disabled');
            nodes.browser.setAttribute('disabled', 'true');
            nodes.browser.classList.remove('enabled');
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting browser button state:', e);
        }
      };

      const updateProgressMetrics = (received, total, percent, speed) => {
        try {
          if (!nodes.progress || !nodes.metricsCard) return;
          
          const newPercent = Math.max(0, Math.min(100, percent || 0));
          
          if (actualDownloadStarted && !nodes.progress.querySelector('.mdui-progress-determinate')) {
            setProgressIndeterminate(false);
          }
          
          currentProgressPercent = newPercent;
          
          const progressBar = nodes.progress.querySelector('.mdui-progress-determinate');
          if (progressBar) {
            progressBar.style.width = currentProgressPercent + '%';
          }
          
          showMetrics();

          const receivedFormatted = fmt(received || 0);
          const totalFormatted = fmt(total || fileSizeBytes || 0);
          const speedText = speed ? utils.humanBytes(speed) + '/s' : '0 B/s';
          
          if (received > 0 || speed > 0) {
            nodes.metricsCard.innerHTML = `${receivedFormatted} / ${totalFormatted} @ ${speedText}`;
          } else {
            nodes.metricsCard.innerHTML = 'Fetching details';
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error updating progress metrics:', e);
        }
      };

      const setActionButtonState = (state) => {
        try {
          const actionBtn = nodes.action;
          if (!actionBtn) return;

          actionBtn.dataset.state = state;

          switch (state) {
            case 'start':
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">download</i><span>Start</span>';
              actionBtn.classList.remove('disabled');
              actionBtn.classList.add('enabled');
              actionBtn.removeAttribute('disabled');
              isProcessing = false;
              setBrowserButtonState(true);
              actualDownloadStarted = false;
              break;
            case 'starting':
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">autorenew</i><span>Starting</span>';
              actionBtn.classList.add('disabled');
              actionBtn.classList.remove('enabled');
              actionBtn.setAttribute('disabled', 'true');
              isProcessing = true;
              setBrowserButtonState(false);
              break;
            case 'pause':
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">pause</i><span>Pause</span>';
              actionBtn.classList.remove('disabled');
              actionBtn.classList.add('enabled');
              actionBtn.removeAttribute('disabled');
              isProcessing = false;
              setBrowserButtonState(true);
              actualDownloadStarted = true;
              break;
            case 'resume':
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">play_arrow</i><span>Resume</span>';
              actionBtn.classList.remove('disabled');
              actionBtn.classList.add('enabled');
              actionBtn.removeAttribute('disabled');
              isProcessing = false;
              setCancelState(true);
              setBrowserButtonState(true);
              break;
            case 'completed':
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">check_circle</i><span>Done</span>';
              actionBtn.classList.add('disabled');
              actionBtn.classList.remove('enabled');
              actionBtn.setAttribute('disabled', 'true');
              isProcessing = false;
              setCancelState(false);
              setBrowserButtonState(false);
              hideSettings();
              break;
            default:
              actionBtn.innerHTML = '<i class="mdui-icon material-icons-outlined">download</i><span>Start</span>';
              isProcessing = false;
              setBrowserButtonState(true);
              actualDownloadStarted = false;
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error setting action button state:', e);
        }
      };

      const validateSettings = () => {
        try {
          if (isCompleted) return true;
          
          const concInput = nodes.conc;
          const chunkInput = nodes.chunk;
          
          let isValid = true;
          
          if (concInput) {
            const concValue = parseInt(concInput.value);
            if (isNaN(concValue) || concValue < 1 || concValue > 12) {
              concInput.classList.add('invalid');
              isValid = false;
            } else {
              concInput.classList.remove('invalid');
            }
          }
          
          if (chunkInput) {
            const chunkValue = parseInt(chunkInput.value);
            if (isNaN(chunkValue) || chunkValue < 64 || chunkValue > 4096) {
              chunkInput.classList.add('invalid');
              isValid = false;
            } else {
              chunkInput.classList.remove('invalid');
            }
          }
          
          return isValid;
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error validating settings:', e);
          return false;
        }
      };

      const readDownloadOptions = () => {
        try {
          const concurrencyInput = nodes.conc;
          const chunkInput = nodes.chunk;

          const concurrency = concurrencyInput ? 
            Math.max(1, Math.min(12, parseInt(concurrencyInput.value || '4', 10) || 4)) : 4;
          const chunkKB = chunkInput ? 
            Math.max(64, Math.min(4096, parseInt(chunkInput.value || '1024', 10) || 1024)) : 1024;

          return { 
            concurrency, 
            chunkSize: chunkKB * 1024 
          };
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error reading download options:', e);
          return { concurrency: 4, chunkSize: 1024 * 1024 };
        }
      };

      const showDownloadMessage = (concurrency, chunkSizeKB, totalSize, persistent = false) => {
        try {
          if (isCompleted) return;
          
          if (persistentDownloadMessage && persistentDownloadMessage.parentNode) {
            persistentDownloadMessage.parentNode.removeChild(persistentDownloadMessage);
            persistentDownloadMessage = null;
          }
          
          const efficiency = concurrency > 8 ? 'maximum' : concurrency > 4 ? 'high' : 'optimal';
          const sizeCategory = totalSize > 100 * 1024 * 1024 ? 'large file' : 
                              totalSize > 10 * 1024 * 1024 ? 'medium file' : 'file';
          
          const message = `Downloading ${sizeCategory} using ${concurrency} parallel streams with ${chunkSizeKB}KB segments for ${efficiency} performance and reliability`;
          
          const msgDiv = document.createElement('div');
          msgDiv.className = 'download-message';
          msgDiv.textContent = message;

          const statusLine = nodes.status;
          if (statusLine && statusLine.parentNode) {
            statusLine.parentNode.insertBefore(msgDiv, statusLine.nextSibling);
            
            if (persistent) {
              persistentDownloadMessage = msgDiv;
            } else {
              setTimeout(() => {
                if (msgDiv && msgDiv.parentNode && msgDiv !== persistentDownloadMessage) {
                  msgDiv.classList.add('fade-out');
                  setTimeout(() => {
                    if (msgDiv && msgDiv.parentNode) {
                      msgDiv.parentNode.removeChild(msgDiv);
                    }
                  }, 400);
                }
              }, 4000);
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing download message:', e);
        }
      };

      const completeDataCleanup = async () => {
        try {
          if (persistentDownloadMessage && persistentDownloadMessage.parentNode) {
            persistentDownloadMessage.parentNode.removeChild(persistentDownloadMessage);
            persistentDownloadMessage = null;
          }
          
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
        hasStarted = false;
        isCompleted = false;
        isProcessing = false;
        pauseInProgress = false;
        currentProgressPercent = 0;
        actualDownloadStarted = false;
        
        setProgressIndeterminate(true);
        hideMetrics();
        if (nodes.metricsCard) nodes.metricsCard.innerHTML = 'Fetching details';
        setActionButtonState('start');
        setStatusText('Ready to download');
        setCancelState(false);
        setBrowserButtonState(true);
        showSettings();
        stopIconPulse();
      };

      const showErrorMessage = (message, allowFallback = true) => {
        try {
          if (isCompleted) {
            log('Suppressing error after completion:', message);
            return;
          }

          if (persistentDownloadMessage && persistentDownloadMessage.parentNode) {
            persistentDownloadMessage.parentNode.removeChild(persistentDownloadMessage);
            persistentDownloadMessage = null;
          }

          const isValidationError = String(message || '').toLowerCase().includes('invalid settings') || 
                                  String(message || '').toLowerCase().includes('correct the invalid') ||
                                  String(message || '').toLowerCase().includes('download settings are outside allowed limits');
          
          // Only hide settings if it's not a validation error and download is actually starting
          if (!isValidationError && hasStarted && actualDownloadStarted) {
            hideSettings();
          }

          let safeMessage = String(message || 'Unknown error occurred');
          
          if (isValidationError) {
            safeMessage = utils.ERROR_MESSAGES?.INVALID_SETTINGS || safeMessage;
          }
          
          nodes.errorArea.innerHTML = `
            <div class="error-area">
              <div style="font-weight:400;margin-bottom:8px;">${safeMessage}</div>
              ${allowFallback ? `
                <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
                  <button id="fallback_${tag}" class="glassy-btn enabled" style="min-width:160px">
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
                startFallbackDownload('user-requested', safeMessage);
              });
            }
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing error message:', e);
        }
      };

      const clearErrorMessage = () => { 
        try {
          if (nodes.errorArea && nodes.errorArea.style.display !== 'none') {
            nodes.errorArea.classList.add('fade-out');
            setTimeout(() => {
              if (nodes.errorArea) {
                nodes.errorArea.style.display = 'none'; 
                nodes.errorArea.innerHTML = '';
                nodes.errorArea.classList.remove('fade-out');
                if (!isCompleted) showSettings();
              }
            }, 300);
          }
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error clearing error message:', e);
        }
      };

      const showCompletionAnimation = () => {
        try {
          const completionHTML = `
            <div class="completion-container" aria-live="polite">
              <div class="completion-sphere">
                <div class="completion-tick">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              </div>
              <div class="completion-message">
                Download completed successfully!
              </div>
              <div class="completion-details">
                File has been saved to your chosen location with the correct filename
              </div>
            </div>
          `;

          nodes.main.innerHTML = completionHTML;
          setIconCompleted();
          isCompleted = true;
          hideSettings();

          setStatusText('Download completed successfully', 100);
          currentProgressPercent = 100;
          updateProgressMetrics(
            (meta && meta.totalBytes) || fileSizeBytes || 0,
            (meta && meta.totalBytes) || fileSizeBytes || 0,
            100,
            0
          );
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing completion animation:', e);
        }
      };

      const showFallbackCompletionAnimation = () => {
        try {
          const fallbackCompletionHTML = `
            <div class="completion-container" aria-live="polite">
              <div class="completion-sphere">
                <div class="completion-tick">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              </div>
              <div class="completion-message">
                Download initiated via browser!
              </div>
              <div class="completion-details">
                Check your downloads folder for the file
              </div>
            </div>
          `;

          nodes.main.innerHTML = fallbackCompletionHTML;
          setIconCompleted();
          isCompleted = true;
          hideSettings();

          setStatusText('Browser download initiated', 100);
          currentProgressPercent = 100;
        } catch (e) {
          console.warn('[R-ServiceX-Downloader] Error showing fallback completion animation:', e);
        }
      };

      const downloadBlobWithRealFilename = (blob, filename) => {
        return new Promise((resolve, reject) => {
          try {
            if (!blob || !filename) {
              reject(new Error('Invalid blob or filename'));
              return;
            }

            const cleanFilename = String(filename)
              .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
              .replace(/^\.+/, '')
              .replace(/\.+$/, '')
              .trim() || 'download';

            log(`Attempting enhanced download with filename: ${cleanFilename}`);

            if (window.showSaveFilePicker) {
              const fileExtension = cleanFilename.includes('.') ? 
                cleanFilename.split('.').pop().toLowerCase() : 'bin';
              
              window.showSaveFilePicker({
                suggestedName: cleanFilename,
                types: [{
                  description: 'Downloaded file',
                  accept: { [`application/${fileExtension}`]: [`.${fileExtension}`] }
                }]
              }).then(async (handle) => {
                setStatusText('Saving file to device');
                setProgressIndeterminate(true);
                
                const writable = await handle.createWritable();
                
                // For large files, show progress during write
                if (blob.size > 10 * 1024 * 1024) { // 10MB+
                  const chunkSize = 1024 * 1024; // 1MB chunks
                  const totalChunks = Math.ceil(blob.size / chunkSize);
                  
                  for (let i = 0; i < totalChunks; i++) {
                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, blob.size);
                    const chunk = blob.slice(start, end);
                    
                    await writable.write(chunk);
                    
                    const progress = ((i + 1) / totalChunks) * 100;
                    setProgressDeterminate(progress);
                    setStatusText(`Saving file to device (${Math.round(progress)}%)`);
                    
                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 1));
                  }
                } else {
                  await writable.write(blob);
                }
                
                await writable.close();
                log(`File saved via File System Access API: ${cleanFilename}`);
                resolve('success');
              }).catch((error) => {
                if (error.name !== 'AbortError') {
                  log('File System Access API failed:', error);
                }
                downloadBlobMethod2();
              });
            } else {
              downloadBlobMethod2();
            }

            function downloadBlobMethod2() {
              try {
                const url = URL.createObjectURL(blob);
                const enhancedUrl = `${url}#filename=${encodeURIComponent(cleanFilename)}`;
                const link = document.createElement('a');
                
                link.href = enhancedUrl;
                link.download = cleanFilename;
                link.style.cssText = 'display:none;position:absolute;top:-1000px;left:-1000px;';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                
                link.setAttribute('data-filename', cleanFilename);
                link.setAttribute('data-size', blob.size);
                link.setAttribute('data-type', blob.type);
                
                document.body.appendChild(link);
                
                try {
                  const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    buttons: 1
                  });
                  link.dispatchEvent(clickEvent);
                  log(`Download initiated via enhanced click: ${cleanFilename}`);
                } catch (clickError) {
                  link.click();
                  log(`Download initiated via fallback click: ${cleanFilename}`);
                }
                
                setTimeout(() => {
                  try {
                    if (link.parentNode) {
                      document.body.removeChild(link);
                    }
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    log('Cleanup error:', e);
                  }
                }, 2000);
                
                resolve('success');
                
              } catch (error) {
                log('Enhanced blob download failed:', error);
                reject(error);
              }
            }

          } catch (error) {
            log('Download blob error:', error);
            reject(error);
          }
        });
      };

      const wireTaskEvents = (downloadTask) => {
        try {
          if (!downloadTask || downloadTask.__events_wired) return;

          log('Wiring task events');
          task = downloadTask;
          downloadTask.__events_wired = true;

          downloadTask.on && downloadTask.on('start', (data = {}) => {
            try {
              const { totalBytes = 0, fileName: actualName } = data;

              hasStarted = true;
              isProcessing = false;
              pauseInProgress = false;
              actualDownloadStarted = true;
              clearErrorMessage();
              
              setProgressIndeterminate(false);

              if (actualName) nodes.fname.textContent = actualName;
              if (totalBytes) nodes.fsize.textContent = fmt(totalBytes);

              setActionButtonState('pause');
              setStatusText('Downloading', 0);
              hideSettings();
              setCancelState(false);
              setBrowserButtonState(true);
              startIconPulse();

              const { concurrency, chunkSize } = readDownloadOptions();
              showDownloadMessage(concurrency, Math.round(chunkSize / 1024), totalBytes, true);
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in start event handler:', e);
            }
          });

          downloadTask.on && downloadTask.on('progress', (data = {}) => {
            try {
              const { receivedBytes = 0, totalBytes = 0, percent = 0 } = data;
              const currentSpeed = downloadTask._speedBps || 0;
              updateProgressMetrics(receivedBytes, totalBytes, percent, currentSpeed);
              setStatusText('Downloading', percent);
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in progress event handler:', e);
            }
          });

          downloadTask.on && downloadTask.on('speed', (data = {}) => {
            try {
              const { pretty, bps } = data;
              const speedDisplay = pretty || (bps ? utils.humanBytes(bps) + '/s' : '0 B/s');
              const progressPart = (nodes.metricsCard.innerHTML || '').split('@')[0].trim();
              nodes.metricsCard.innerHTML = `${progressPart} @ ${speedDisplay}`;
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in speed event handler:', e);
            }
          });

          downloadTask.on && downloadTask.on('status', (data = {}) => {
            try {
              const { text } = data;
              if (!text) return;

              const statusLower = String(text).toLowerCase();
              log('Task status:', text);

              if (statusLower.includes('paused')) {
                setStatusText('Download paused');
                setActionButtonState('resume');
                setCancelState(true);
                setBrowserButtonState(true);
                showSettings();
                stopIconPulse();
                pauseInProgress = false;
              } else if (statusLower.includes('resum')) {
                clearErrorMessage();
                setStatusText('Resuming download');
                setActionButtonState('pause');
                setCancelState(false);
                setBrowserButtonState(true);
                hideSettings();
                startIconPulse();
                actualDownloadStarted = true;
                setProgressIndeterminate(false);
              } else if (statusLower.includes('cancel')) {
                setStatusText('Download cancelled');
                setActionButtonState('start');
                setCancelState(false);
                setBrowserButtonState(true);
                hideMetrics();
                showSettings();
                stopIconPulse();
                hasStarted = false;
                isCompleted = false;
                pauseInProgress = false;
                currentProgressPercent = 0;
                actualDownloadStarted = false;
                setProgressIndeterminate(true);
              } else if (statusLower.includes('assembling')) {
                setStatusText('Assembling file');
                setProgressIndeterminate(true);
                stopIconPulse();
              } else {
                setStatusText(text);
              }
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in status event handler:', e);
            }
          });

          downloadTask.on && downloadTask.on('error', async (data = {}) => {
            try {
              if (isCompleted) {
                log('Ignoring error after completion:', data);
                return;
              }

              const errorMessage = (data && data.message) ? String(data.message) : 'Download error occurred';
              log('Task error:', errorMessage);

              pauseInProgress = false;

              setStatusText('Connection issue detected');
              setActionButtonState('resume');
              setCancelState(true);
              setBrowserButtonState(true);
              showSettings();
              stopIconPulse();

              showErrorMessage(errorMessage + ' — Network interruption detected. Resume when ready or use browser download', true);
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in error event handler:', e);
            }
          });

          downloadTask.on && downloadTask.on('complete', async (data = {}) => {
            try {
              log('Download completed successfully');
              isCompleted = true;
              pauseInProgress = false;
              clearErrorMessage();
              setProgressIndeterminate(false);
              currentProgressPercent = 100;

              const { href, fileName: completedName, blob, mimeType, size } = data || {};
              
              let finalFileName = (meta && meta.fileName) || 
                                 (meta && meta.originalFileName) || 
                                 completedName || 
                                 nodes.fname.textContent || 
                                 fileName;
              
              if (!finalFileName || finalFileName === 'File') {
                finalFileName = completedName || fileName || 'download';
              }

              if (utils && utils.sanitizeFilename) {
                finalFileName = utils.sanitizeFilename(finalFileName);
              } else {
                finalFileName = String(finalFileName).replace(/[<>:"/\\|?*]/g, '_') || 'download';
              }

              log(`Using final filename: ${finalFileName} (${fmt(size || blob?.size || 0)})`);

              setActionButtonState('completed');
              stopIconPulse();

              showCompletionAnimation();

              if (blob && finalFileName) {
                try {
                  await downloadBlobWithRealFilename(blob, finalFileName);
                  log(`File successfully downloaded with name: ${finalFileName}`);
                } catch (downloadError) {
                  log('Enhanced download failed, trying simple method:', downloadError);
                  
                  try {
                    const url = URL.createObjectURL(blob);
                    const enhancedUrl = `${url}#filename=${encodeURIComponent(finalFileName)}`;
                    const link = document.createElement('a');
                    link.href = enhancedUrl;
                    link.download = finalFileName;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    log(`File downloaded via simple fallback: ${finalFileName}`);
                  } catch (finalError) {
                    log('All download methods failed:', finalError);
                  }
                }
              } else if (href && finalFileName) {
                const link = document.createElement('a');
                link.href = href;
                link.download = finalFileName;
                link.click();
                log(`File downloaded via href: ${finalFileName}`);
              }

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
              console.warn('[R-ServiceX-Downloader] Error in complete event handler:', e);
            }
          });
        } catch (e) {
          console.error('[R-ServiceX-Downloader] Error wiring task events:', e);
        }
      };

      const startFallbackDownload = (reason, errorMessage) => {
        try {
          if (fallbackActive || isCompleted) return;
          fallbackActive = true;

          log('Starting fallback download:', reason);

          nodes.action.classList.add('disabled');
          nodes.action.classList.remove('enabled');
          nodes.action.setAttribute('disabled', 'true');
          setCancelState(false);
          setBrowserButtonState(false);
          showMetrics();
          hideSettings();
          startIconPulse();

          const simulationDuration = 5000 + Math.floor(Math.random() * 3000);
          const startTime = Date.now();
          let lastPercent = 0;
          const updateInterval = 120;

          setProgressIndeterminate(false);

          fallbackTimer = setInterval(() => {
            try {
              if (isCompleted) {
                clearInterval(fallbackTimer);
                return;
              }

              const elapsed = Date.now() - startTime;
              let progress = Math.min(1, elapsed / simulationDuration);
              progress = Math.pow(progress, 0.9);

              const currentPercent = Math.floor(progress * 100);
              lastPercent = (currentPercent <= lastPercent) ? 
                Math.min(99, lastPercent + 1) : currentPercent;

              currentProgressPercent = lastPercent;
              const progressBar = nodes.progress.querySelector('.mdui-progress-determinate');
              if (progressBar) {
                progressBar.style.width = lastPercent + '%';
              }

              const totalSize = (meta && meta.totalBytes) ? meta.totalBytes : (fileSizeBytes || 0);
              const simulatedReceived = totalSize ? 
                Math.round((lastPercent / 100) * totalSize) : lastPercent * 1024;
              const simulatedSpeed = Math.max(1024, 
                Math.round(simulatedReceived / Math.max(1, elapsed / 1000)));

              if (nodes.metricsCard) {
                nodes.metricsCard.innerHTML = 
                  `${fmt(simulatedReceived)} / ${fmt(totalSize || 0)} @ ${utils.humanBytes(simulatedSpeed)}/s`;
              }
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
                  downloadLink.href = `${url}#filename=${encodeURIComponent(fileName || 'download')}`;
                  if (fileName) {
                    downloadLink.download = fileName;
                  }
                  downloadLink.style.display = 'none';
                  downloadLink.target = '_blank';
                  downloadLink.rel = 'noopener noreferrer';
                  
                  document.body.appendChild(downloadLink);
                  
                  try {
                    downloadLink.click();
                    log(`Browser download initiated for: ${fileName || url}`);
                  } catch (clickError) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                    log(`Browser download via window.open for: ${url}`);
                  }
                  
                  if (downloadLink.parentNode) {
                    downloadLink.remove();
                  }
                  log('Fallback download initiated successfully');
                } catch (e) { 
                  log('Fallback download failed', e && e.message);
                  try {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } catch (finalError) {
                    log('All fallback methods failed', finalError);
                  }
                }

                setTimeout(() => {
                  if (!isCompleted) {
                    showFallbackCompletionAnimation();
                    nodes.action.classList.add('disabled');
                    nodes.action.classList.remove('enabled');
                    nodes.action.setAttribute('disabled', 'true');
                    nodes.cancel.classList.add('disabled');
                    nodes.cancel.setAttribute('aria-disabled', 'true');
                    setBrowserButtonState(false);
                  }
                  fallbackActive = false;
                }, 1200);
              }
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in fallback timer:', e);
            }
          }, updateInterval);
        } catch (e) {
          console.error('[R-ServiceX-Downloader] Error starting fallback download:', e);
        }
      };

      const handleActionClick = async (event) => {
        try {
          event && event.preventDefault();
          
          if (isCompleted) return;
          if (pauseClickTimeout) return;
          
          clearErrorMessage();

          if (!validateSettings()) {
            showErrorMessage(utils.ERROR_MESSAGES?.INVALID_SETTINGS || 'Please correct the invalid settings before continuing. Threads: 1-12 connections, Chunk Size: 64-4096 KB for optimal performance.', false);
            return;
          }

          const currentState = nodes.action.dataset.state || 'start';
          log('Action button clicked:', currentState);

          if (currentState === 'start') {
            hideReadyMessage();
            showStatusLine();
            showProgressBar();
            setProgressIndeterminate(true);
            
            setActionButtonState('starting');
            setStatusText('Initializing secure download');
            isProcessing = true;

            if (!window.indexedDB) { 
              showErrorMessage('Advanced downloading not supported. Use browser download', true); 
              return; 
            }

            if (!manager || typeof manager.start !== 'function') { 
              showErrorMessage('Download manager unavailable. Use browser download', true); 
              return; 
            }

            // Show quota checking message
            try {
              if (typeof manager.checkQuota === 'function') {
                setStatusText('Checking available storage space');
                showQuotaMessage('Checking available storage space...');
                
                const quotaInfo = await manager.checkQuota(fileSizeBytes || 0);
                log('Storage quota check:', quotaInfo);

                if (quotaInfo && quotaInfo.message) {
                  showQuotaMessage(quotaInfo.message);
                  
                  setTimeout(() => {
                    hideQuotaMessage();
                  }, 3000);
                }

                if (quotaInfo && quotaInfo.supported && !quotaInfo.sufficient) { 
                  showErrorMessage(utils.ERROR_MESSAGES?.STORAGE_INSUFFICIENT || 'Insufficient storage space. Use browser download', true); 
                  return; 
                }
              }
            } catch (e) { 
              log('Quota check error', e && e.message); 
              hideQuotaMessage();
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
                setStatusText('Starting download', 0); 
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

              showErrorMessage(utils.ERROR_MESSAGES?.INITIALIZATION_FAILED || 'Failed to initialize download. Use browser download', true);
              setActionButtonState('start');
              setProgressIndeterminate(true);
              currentProgressPercent = 0;
              actualDownloadStarted = false;
              return;
            }

          } else if (currentState === 'pause') {
            pauseClickTimeout = setTimeout(() => {
              pauseClickTimeout = null;
            }, 500);

            if (pauseInProgress) {
              log('Pause already in progress, ignoring click');
              return;
            }

            pauseInProgress = true;
            log('Pause requested');

            try {
              setStatusText('Pausing download...');
              nodes.action.classList.add('disabled');
              nodes.action.setAttribute('disabled', 'true');

              if (task && typeof task.pause === 'function') {
                await task.pause();
              } else if (manager && typeof manager.pause === 'function') {
                await manager.pause();
              } else {
                setStatusText('Download paused');
                setActionButtonState('resume');
                setCancelState(true);
                setBrowserButtonState(true);
                showSettings();
                stopIconPulse();
                pauseInProgress = false;
              }
            } catch (e) { 
              log('Pause failed', e && e.message); 
              showErrorMessage(utils.ERROR_MESSAGES?.NETWORK_INTERRUPTED || 'Failed to pause download. Use browser download', true); 
              pauseInProgress = false;
            }

          } else if (currentState === 'resume') {
            log('Resume requested');
            clearErrorMessage();

            if (!validateSettings()) {
              showErrorMessage(utils.ERROR_MESSAGES?.INVALID_SETTINGS || 'Please correct the invalid settings before resuming. Threads: 1-12 connections, Chunk Size: 64-4096 KB.', false);
              return;
            }

            try {
              const { concurrency, chunkSize } = readDownloadOptions();

              if (manager && typeof manager.resume === 'function') {
                setStatusText('Preparing to resume');
                setActionButtonState('starting');
                isProcessing = true;
                setProgressIndeterminate(true);
                
                const resumeTask = await manager.resume(id, url, fileName, fileSizeBytes, chunkSize, concurrency);
                
                if (resumeTask) {
                  task = resumeTask;
                  log('Resume successful, wiring task events');
                  wireTaskEvents(resumeTask);
                  
                  if (resumeTask.meta && resumeTask.meta.completedStarts) {
                    let downloadedBytes = 0;
                    (resumeTask.meta.completedStarts || []).forEach(start => { 
                      downloadedBytes += Math.min(
                        resumeTask.meta.chunkSize || (1024 * 1024), 
                        Math.max(0, (resumeTask.meta.totalBytes || fileSizeBytes) - start)
                      ); 
                    });
                    const percent = resumeTask.meta.totalBytes ? 
                      Math.round((downloadedBytes / resumeTask.meta.totalBytes) * 1000) / 10 : 0;
                    
                    log(`Updating UI with progress: ${downloadedBytes}/${resumeTask.meta.totalBytes} (${percent}%)`);
                    currentProgressPercent = percent;
                    actualDownloadStarted = true;
                    setProgressIndeterminate(false);
                    updateProgressMetrics(downloadedBytes, resumeTask.meta.totalBytes, percent, 0);
                    setStatusText('Resuming', percent);
                    setActionButtonState('pause');
                  }
                  
                  log('Task events wired and UI updated');
                  await resumeTask.resume();
                } else {
                  throw new Error('No task returned from resume');
                }
              } else {
                throw new Error('Resume method not available');
              }

            } catch (e) { 
              log('Resume failed', e && e.message); 
              showErrorMessage(utils.ERROR_MESSAGES?.RESUME_UNAVAILABLE || 'Failed to resume download. Use browser download', true); 
              setActionButtonState('resume');
            }
          }
        } catch (error) { 
          log('Unexpected action error', error && error.message); 
          showErrorMessage(utils.ERROR_MESSAGES?.INITIALIZATION_FAILED || 'Unexpected error occurred. Use browser download', true); 
          setActionButtonState('start');
          setProgressIndeterminate(true);
          currentProgressPercent = 0;
          pauseInProgress = false;
          actualDownloadStarted = false;
        }
      };

      const setupEventListeners = () => {
        try {
          if (nodes.action) {
            nodes.action.addEventListener('click', handleActionClick);
          }

          if (nodes.cancel) {
            nodes.cancel.addEventListener('click', async (event) => {
              try {
                event && event.preventDefault();
                
                if (isCompleted) return;
                
                clearErrorMessage();

                if (nodes.cancel.getAttribute('aria-disabled') === 'true') return;

                log('Cancel button clicked');

                await completeDataCleanup();
                setStatusText('Download cancelled');
              } catch (e) { 
                log('Cancel error', e && e.message); 
                showErrorMessage('Failed to cancel download. Please try again', false); 
              }
            });
          }

          if (nodes.browser) {
            nodes.browser.addEventListener('click', async (event) => {
              try {
                event && event.preventDefault();
                
                if (isCompleted) return;
                
                if (nodes.browser.classList.contains('disabled')) return;
                
                log('Browser button clicked');
                
                await completeDataCleanup();
                startFallbackDownload('user-requested', 'Using browser download as requested');
              } catch (e) {
                log('Browser download error', e && e.message);
                showErrorMessage('Failed to initiate browser download', false);
              }
            });
          }

          let longPressTimer = null;
          if (nodes.action) {
            nodes.action.addEventListener('pointerdown', () => {
              try {
                if (isCompleted) return;
                
                const state = nodes.action.dataset.state || '';
                if (state.toLowerCase().includes('resume')) {
                  longPressTimer = setTimeout(async () => {
                    log('Long press detected: clearing saved chunks');
                    try {
                      await completeDataCleanup();
                      setStatusText('Saved progress cleared');
                    } catch (e) { 
                      log('Clear chunks error', e && e.message); 
                      showErrorMessage('Failed to clear saved progress', false); 
                    }
                  }, 1200);
                }
              } catch (e) {
                console.warn('[R-ServiceX-Downloader] Error in pointerdown handler:', e);
              }
            });

            document.addEventListener('pointerup', () => { 
              try {
                if (longPressTimer) { 
                  clearTimeout(longPressTimer); 
                  longPressTimer = null; 
                }
              } catch (e) {
                console.warn('[R-ServiceX-Downloader] Error in pointerup handler:', e);
              }
            });
          }

          if (nodes.conc) {
            nodes.conc.addEventListener('input', validateSettings);
            nodes.conc.addEventListener('blur', validateSettings);
          }
          if (nodes.chunk) {
            nodes.chunk.addEventListener('input', validateSettings);
            nodes.chunk.addEventListener('blur', validateSettings);
          }
        } catch (e) {
          console.error('[R-ServiceX-Downloader] Error setting up event listeners:', e);
        }
      };

      // Initialize UI state - fix browser button state after restart
      setCancelState(false);
      showSettings();
      stopIconPulse();
      showReadyMessage();
      hideProgressBar();
      hideStatusLine();
      hideMetrics();

      // Enable buttons after validation - ensure they start enabled
      setTimeout(() => {
        if (validateSettings()) {
          setBrowserButtonState(true);
          setActionButtonState('start');
        } else {
          // Even with invalid settings, enable browser button
          setBrowserButtonState(true);
          // Keep start button disabled until settings are valid
          const actionBtn = nodes.action;
          if (actionBtn) {
            actionBtn.classList.add('disabled');
            actionBtn.classList.remove('enabled');
            actionBtn.setAttribute('disabled', 'true');
          }
        }
      }, 100);

      setupEventListeners();

      try {
        if (manager && typeof manager.checkForExistingDownload === 'function') {
          const existingDownload = await manager.checkForExistingDownload();
          if (existingDownload) {
            meta = existingDownload.meta;

            if (existingDownload.fromOtherPage) {
              showErrorMessage(utils.ERROR_MESSAGES?.CONCURRENT_ACTIVE || `Another download is active on a different page. Please complete or cancel the existing download first.`, false);
              setActionButtonState('start');
              setCancelState(false);
              setBrowserButtonState(true);
              setProgressIndeterminate(true);
              currentProgressPercent = 0;
              hideMetrics();
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

            currentProgressPercent = percentComplete;
            setProgressIndeterminate(false);
            if (nodes.metricsCard) {
              nodes.metricsCard.innerHTML = 
                `${fmt(downloadedBytes)} / ${fmt(meta.totalBytes || fileSizeBytes)} @ 0 B/s`;
            }
            showMetrics();

            setActionButtonState('resume');
            setStatusText('Resume available', percentComplete);
            setCancelState(true);
            setBrowserButtonState(true);

            if (meta.fileName) nodes.fname.textContent = meta.fileName;
            if (meta.totalBytes) nodes.fsize.textContent = fmt(meta.totalBytes);

            showSettings();
            log(`Resume available: ${percentComplete.toFixed(1)}%`);
          } else {
            setProgressIndeterminate(true);
            currentProgressPercent = 0;
            hideMetrics();
          }
        } else {
          setProgressIndeterminate(true);
          currentProgressPercent = 0;
          hideMetrics();
        }
      } catch (e) {
        log('Error checking for existing downloads:', e && e.message);
        setProgressIndeterminate(true);
        currentProgressPercent = 0;
        hideMetrics();
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

              currentProgressPercent = percentComplete;
              setProgressIndeterminate(false);
              if (nodes.metricsCard) {
                nodes.metricsCard.innerHTML = 
                  `${fmt(downloadedBytes)} / ${fmt(meta.totalBytes || fileSizeBytes)} @ 0 B/s`;
              }
              showMetrics();

              setActionButtonState('resume');
              setStatusText('Resume available', percentComplete);
              setCancelState(true);
              setBrowserButtonState(true);

              if (meta.fileName) nodes.fname.textContent = meta.fileName;
              if (meta.totalBytes) nodes.fsize.textContent = fmt(meta.totalBytes);

              showSettings();
              log(`Resume available: ${percentComplete.toFixed(1)}%`);
            } else {
              setProgressIndeterminate(true);
              currentProgressPercent = 0;
              hideMetrics();
            }
          } else {
            setProgressIndeterminate(true);
            currentProgressPercent = 0;
            hideMetrics();
          }
        } catch (e) { 
          log('getMeta failed', e && e.message); 
          meta = null;
          setProgressIndeterminate(true);
          currentProgressPercent = 0;
          hideMetrics();
        }
      }

      if (!meta || !meta.completedStarts || meta.completedStarts.length === 0) {
        setActionButtonState('start');
        setStatusText('Ready to download');
        showSettings();
        setCancelState(false);
        setBrowserButtonState(true);
        setProgressIndeterminate(true);
        currentProgressPercent = 0;
        hideMetrics();
      }

      try {
        if (dialog && dialog.$element) {
          dialog.$element.on('close.dialog', () => {
            try {
              if (fallbackTimer) {
                clearInterval(fallbackTimer);
                fallbackTimer = null;
              }
              if (persistentDownloadMessage && persistentDownloadMessage.parentNode) {
                persistentDownloadMessage.parentNode.removeChild(persistentDownloadMessage);
                persistentDownloadMessage = null;
              }
              stopIconPulse();
              handleDialogClose();
            } catch (e) {
              console.warn('[R-ServiceX-Downloader] Error in close handler:', e);
            }
          });
        }
      } catch (e) {
        console.warn('[R-ServiceX-Downloader] Error setting up dialog close handler:', e);
      }

    } catch (e) {
      console.error('[R-ServiceX-Downloader] Critical error in dialog initialization:', e);
    }
  }, 150);

  return dialog;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openIDBDownloaderDialog };
} else if (typeof window !== 'undefined') {
  window.openIDBDownloaderDialog = openIDBDownloaderDialog;
      console.log('[R-ServiceX-Downloader] Enhanced Dialog v1.5.0 loaded successfully');
}