console.log('[DEBUG] notifications.js loading...');

class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.init();
    }

    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            console.warn('Toast container not found, creating one');
            this.createToastContainer();
        }
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
        `;
        document.body.appendChild(container);
        this.toastContainer = container;
    }

    showToast(message, type = 'info', duration = 4000) {
        if (!this.toastContainer) {
            console.warn('Toast container not available');
            return null;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Toast styling
        toast.style.cssText = `
            background: var(--toast-bg, #333);
            color: var(--toast-color, #fff);
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            font-size: 0.875rem;
            line-height: 1.4;
            border-left: 4px solid var(--toast-accent, #007bff);
        `;

        // Set colors based on type
        switch (type) {
            case 'success':
                toast.style.setProperty('--toast-bg', '#d4edda');
                toast.style.setProperty('--toast-color', '#155724');
                toast.style.setProperty('--toast-accent', '#28a745');
                break;
            case 'error':
                toast.style.setProperty('--toast-bg', '#f8d7da');
                toast.style.setProperty('--toast-color', '#721c24');
                toast.style.setProperty('--toast-accent', '#dc3545');
                break;
            case 'warning':
                toast.style.setProperty('--toast-bg', '#fff3cd');
                toast.style.setProperty('--toast-color', '#856404');
                toast.style.setProperty('--toast-accent', '#ffc107');
                break;
            case 'info':
            default:
                toast.style.setProperty('--toast-bg', '#d1ecf1');
                toast.style.setProperty('--toast-color', '#0c5460');
                toast.style.setProperty('--toast-accent', '#17a2b8');
                break;
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="flex: 1;">${message}</span>
                <button style="
                    background: none;
                    border: none;
                    color: currentColor;
                    cursor: pointer;
                    padding: 0;
                    font-size: 1.2rem;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
            </div>
        `;

        // Close button functionality
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto-remove after duration
        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Click to dismiss
        toast.addEventListener('click', (e) => {
            if (e.target !== closeBtn) {
                clearTimeout(timeoutId);
                this.removeToast(toast);
            }
        });

        // Add to container with animation
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    showLoadingToast(message = 'Loading...') {
        const toast = this.showToast(message, 'info', 0); // 0 duration means no auto-remove
        
        if (toast) {
            // Add loading spinner
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 16px;
                height: 16px;
                border: 2px solid currentColor;
                border-top: 2px solid transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 0.5rem;
                flex-shrink: 0;
            `;
            
            // Add spinner animation
            if (!document.getElementById('spinner-styles')) {
                const style = document.createElement('style');
                style.id = 'spinner-styles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            const contentDiv = toast.querySelector('div');
            contentDiv.insertBefore(spinner, contentDiv.firstChild);
        }
        
        return toast;
    }

    updateLoadingToast(toast, message, type = 'success') {
        if (!toast) return;
        
        // Remove spinner
        const spinner = toast.querySelector('div[style*="animation"]');
        if (spinner) {
            spinner.remove();
        }
        
        // Update message
        const messageSpan = toast.querySelector('span');
        if (messageSpan) {
            messageSpan.textContent = message;
        }
        
        // Update toast type
        this.removeToast(toast);
        this.showToast(message, type);
    }

    // Simplified success/error/warning methods
    showSuccess(message, duration = 4000) {
        return this.showToast(message, 'success', duration);
    }

    showError(message, duration = 6000) {
        return this.showToast(message, 'error', duration);
    }

    showWarning(message, duration = 5000) {
        return this.showToast(message, 'warning', duration);
    }

    showInfo(message, duration = 4000) {
        return this.showToast(message, 'info', duration);
    }

    // Clear all toasts
    clearAll() {
        if (this.toastContainer) {
            const toasts = this.toastContainer.querySelectorAll('.toast');
            toasts.forEach(toast => this.removeToast(toast));
        }
    }
}

// Export to window
window.NotificationManager = NotificationManager;
console.log('[DEBUG] NotificationManager exported to window:', NotificationManager);

