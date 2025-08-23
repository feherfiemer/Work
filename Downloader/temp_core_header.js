/*
 * idb-downloader-dialog-enhanced.js
 * 
 * ENHANCED VERSION v1.8.0: Professional download dialog with bulletproof validation
 * Advanced completion animation, custom location dialog, enhanced chunk sequencing, and premium UI
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
    VERSION: '1.8.0'
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
    location: `dl_location_${tag}`,
    settings: `dl_settings_${tag}`,
    readyMessage: `dl_ready_${tag}`,
    quotaMessage: `dl_quota_${tag}`,
    locationDialog: `location_dialog_${tag}`,
    locationClose: `location_close_${tag}`,
    locationPath: `location_path_${tag}`,
    locationOptionDefault: `location_option_default_${tag}`,
    locationOptionCustom: `location_option_custom_${tag}`
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
  --dl-meta-bg: rgba(173, 216, 230, 0.25);
  --dl-btn-bg: rgba(173, 216, 230, 0.12);
  --dl-border-radius: 20px;
  --dl-error-bg: rgba(244,67,54,0.05);
  --dl-error-border: rgba(244,67,54,0.15);
  --dl-error-text: #d32f2f;
  --dl-text-primary: #000000;
  --dl-text-secondary: #000000;
  --dl-quota-bg: rgba(100,181,246,0.06);
  --dl-quota-border: rgba(100,181,246,0.12);
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
  from { opacity: 1; transform: translateY(0) scale(1); max-height: 300px; }
  to { opacity: 0; transform: translateY(-20px) scale(0.95); max-height: 0; }
}

@keyframes buttonBlur {
  0% { filter: blur(0px); transform: scale(1); }
  50% { filter: blur(2px); transform: scale(0.98); }
  100% { filter: blur(0px); transform: scale(1); }
}

/* ENHANCED: Professional Material Design Completion Animation v1.8.0 */
@keyframes materialTickDraw {
  0% {
    stroke-dasharray: 0, 100;
    stroke-dashoffset: 0;
    opacity: 0;
    transform: scale(0.7) rotate(-5deg);
  }
  30% {
    stroke-dasharray: 50, 100;
    stroke-dashoffset: 0;
    opacity: 0.8;
    transform: scale(0.9) rotate(-2deg);
  }
  70% {
    stroke-dasharray: 100, 100;
    stroke-dashoffset: 0;
    opacity: 0.95;
    transform: scale(1.05) rotate(1deg);
  }
  100% {
    stroke-dasharray: 100, 100;
    stroke-dashoffset: 0;
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes materialSphereEntry {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    box-shadow: 0 0 0 rgba(76, 175, 80, 0);
  }
  15% {
    transform: scale(0.3) rotate(5deg);
    opacity: 0.5;
    background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  }
  40% {
    transform: scale(0.8) rotate(-2deg);
    opacity: 0.8;
    background: linear-gradient(135deg, #a5d6a7 0%, #81c784 100%);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.35);
  }
  70% {
    transform: scale(1.15) rotate(1deg);
    opacity: 0.95;
    background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
    box-shadow: 0 10px 28px rgba(76, 175, 80, 0.45);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
    box-shadow: 0 12px 32px rgba(46, 125, 50, 0.5);
  }
}

@keyframes materialRipple {
  0% {
    transform: scale(1);
    box-shadow: 
      0 0 0 0 rgba(76, 175, 80, 0.7),
      0 12px 32px rgba(46, 125, 50, 0.5);
  }
  40% {
    transform: scale(1.03);
    box-shadow: 
      0 0 0 15px rgba(76, 175, 80, 0.3),
      0 14px 36px rgba(46, 125, 50, 0.4);
  }
  100% {
    transform: scale(1);
    box-shadow: 
      0 0 0 35px rgba(76, 175, 80, 0.0),
      0 12px 32px rgba(46, 125, 50, 0.5);
  }
}

@keyframes materialGlow {
  0%, 100% {
    filter: drop-shadow(0 0 12px rgba(76, 175, 80, 0.5)) brightness(1);
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(76, 175, 80, 0.8)) brightness(1.1);
  }
}

@keyframes completionContainerEntry {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
    filter: blur(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
