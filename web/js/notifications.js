// Notification Manager for R-Service Tracker
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.toastContainer = null;
        this.init();
    }

    // Initialize notification manager
    init() {
        this.toastContainer = document.getElementById('toastContainer');
        this.checkPermission();
    }

    // Check current notification permission
    checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    // Request notification permission
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission();
                if (this.permission === 'granted') {
                    this.showToast('Notifications enabled! You\'ll be notified about paydays.', 'success');
                } else {
                    this.showToast('Notifications denied. Enable them in browser settings for payday alerts.', 'warning');
                }
                return this.permission;
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                this.showToast('Error enabling notifications.', 'error');
                return 'denied';
            }
        } else if ('Notification' in window && Notification.permission === 'denied') {
            this.showToast('Notifications are blocked. Enable them in browser settings.', 'warning');
            return 'denied';
        }
        return this.permission;
    }

    // Show browser notification
    showNotification(title, options = {}) {
        // Update permission status first
        this.checkPermission();
        
        console.log('Attempting to show notification:', title, 'Permission:', this.permission);
        
        if ('Notification' in window && this.permission === 'granted') {
            const defaultOptions = {
                icon: '/assets/favicon.ico',
                badge: '/assets/favicon.ico',
                dir: 'ltr',
                lang: 'en',
                renotify: true, // Allow repeated notifications
                requireInteraction: true, // Make notification stay until user interacts
                silent: false,
                tag: options.tag || 'r-service-tracker-' + Date.now(), // Use provided tag or unique
                timestamp: Date.now(),
                vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
                actions: options.actions || []
            };

            const finalOptions = { ...defaultOptions, ...options };

            try {
                const notification = new Notification(title, finalOptions);
                console.log('Browser notification created successfully');
                
                // Auto close after 10 seconds if requireInteraction is false
                if (!finalOptions.requireInteraction) {
                    setTimeout(() => {
                        notification.close();
                    }, 10000);
                }

                // Handle notification click
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    notification.close();
                    console.log('Notification clicked and closed');
                    
                    // Handle specific actions
                    if (options.onClick) {
                        options.onClick();
                    }
                };

                // Handle notification error
                notification.onerror = (error) => {
                    console.error('Notification error:', error);
                };

                // Handle notification close
                notification.onclose = () => {
                    console.log('Notification closed');
                };

                return notification;
            } catch (error) {
                console.error('Error creating notification:', error);
                // Fallback to toast if notification fails
                this.showToast(title, 'info');
            }
        } else {
            console.log('Browser notifications not available or not granted, showing toast instead');
            // Fallback to toast if notifications not available
            this.showToast(title, 'info');
        }
    }

    // Show payday notification
    showPaydayNotification() {
        const title = 'Payday Alert!';
        const options = {
            body: 'Today is your payday — you\'ve earned ₹100! Mark your payment to update your records.',
            icon: 'assets/favicon.ico',
            tag: 'payday',
            requireInteraction: true,
            actions: [
                {
                    action: 'mark-paid',
                    title: 'Mark as Paid'
                },
                {
                    action: 'later',
                    title: 'Later'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Payday! You\'ve earned ₹100', 'success');
    }

    // Show work completion notification
    showWorkCompletedNotification() {
        const title = 'Work Marked Complete';
        const options = {
            body: 'Great job! You\'ve earned ₹25 today.',
            icon: 'assets/favicon.ico',
            tag: 'work-completed'
        };

        this.showNotification(title, options);
    }

    // Show payment notification
    showPaymentNotification(amount) {
        const title = 'Payment Recorded';
        const options = {
            body: `Payment of ₹${amount} has been recorded successfully.`,
            icon: 'assets/favicon.ico',
            tag: 'payment-recorded'
        };

        this.showNotification(title, options);
    }

    // Show streak notification
    showStreakNotification(streak) {
        const title = 'Streak Achievement!';
        const options = {
            body: `Amazing! You've worked ${streak} days in a row. Keep it up!`,
            icon: 'assets/favicon.ico',
            tag: 'streak-achievement'
        };

        this.showNotification(title, options);
    }

    // Toast notification system
    showToast(message, type = 'info', duration = 5000) {
        if (!this.toastContainer) {
            console.warn('Toast container not found');
            return;
        }

        const toast = this.createToastElement(message, type);
        this.toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Click to dismiss
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });

        return toast;
    }

    // Create toast element
    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${iconMap[type] || iconMap.info}"></i>
                </div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        return toast;
    }

    // Remove toast
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Clear all toasts
    clearAllToasts() {
        if (this.toastContainer) {
            const toasts = this.toastContainer.querySelectorAll('.toast');
            toasts.forEach(toast => this.removeToast(toast));
        }
    }

    // Show loading toast
    showLoadingToast(message) {
        const toast = this.createLoadingToast(message);
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        return toast;
    }

    // Create loading toast
    createLoadingToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast loading';
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
                </div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        return toast;
    }

    // Update loading toast to success/error
    updateLoadingToast(toast, message, type = 'success') {
        if (toast && toast.parentNode) {
            toast.className = `toast ${type}`;
            
            const iconMap = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle'
            };

            toast.innerHTML = `
                <div class="toast-content">
                    <div class="toast-icon">
                        <i class="${iconMap[type]}"></i>
                    </div>
                    <div class="toast-message">${message}</div>
                </div>
            `;

            // Auto remove after delay
            setTimeout(() => {
                this.removeToast(toast);
            }, 3000);
        }
    }

    // Show confirmation dialog
    showConfirmation(message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        if (modal && messageEl && yesBtn && noBtn) {
            messageEl.textContent = message;
            modal.classList.add('show');

            // Handle confirmation
            const handleYes = () => {
                modal.classList.remove('show');
                if (onConfirm) onConfirm();
                cleanup();
            };

            const handleNo = () => {
                modal.classList.remove('show');
                if (onCancel) onCancel();
                cleanup();
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleNo();
                }
            };

            const cleanup = () => {
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                document.removeEventListener('keydown', handleEscape);
            };

            yesBtn.addEventListener('click', handleYes);
            noBtn.addEventListener('click', handleNo);
            document.addEventListener('keydown', handleEscape);

            // Click outside to cancel
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleNo();
                }
            });
        }
    }

    // Play sound notification
    playSound(soundType) {
        try {
            // Create AudioContext if not already created
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (soundType === 'done') {
                this.playSuccessSound();
            } else if (soundType === 'paid') {
                this.playPaymentSound();
            }
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }

    // Play success sound (higher pitch beep)
    playSuccessSound() {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // Play payment sound (modern transaction sound)
    playPaymentSound() {
        if (!this.audioContext) return;

        // Create a more sophisticated transaction sound
        const createTone = (frequency, startTime, duration, volume) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);
            
            oscillator.start(this.audioContext.currentTime + startTime);
            oscillator.stop(this.audioContext.currentTime + startTime + duration);
        };

        // Transaction success sound sequence
        createTone(800, 0, 0.15, 0.3);      // High ping
        createTone(600, 0.1, 0.15, 0.25);   // Mid ping
        createTone(1000, 0.2, 0.3, 0.2);    // Success chime
        createTone(800, 0.35, 0.2, 0.15);   // Echo
    }

    // Play close sound (soft dismiss sound)
    playCloseSound() {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    // Show daily reminder notification
    showDailyReminder() {
        const title = 'Daily Reminder';
        const options = {
            body: 'Don\'t forget to mark your work as done today!',
            icon: 'assets/favicon.ico',
            tag: 'daily-reminder'
        };

        this.showNotification(title, options);
    }

    // Check and show milestone notifications
    checkMilestones(stats) {
        // Streak milestones
        if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
            this.showStreakNotification(stats.currentStreak);
        }

        // Earnings milestones
        if (stats.totalEarned > 0 && stats.totalEarned % 500 === 0) {
            const title = 'Milestone Achieved!';
            const options = {
                body: `Congratulations! You've earned ₹${stats.totalEarned} in total!`,
                icon: 'assets/favicon.ico',
                tag: 'earnings-milestone'
            };
            this.showNotification(title, options);
        }
    }

    // Schedule daily reminders (if service workers were available)
    scheduleReminders() {
        // This would typically use service workers for background notifications
        // For now, we'll just set up a check when the app is active
        this.checkForReminders();
        
        // Set up interval to check periodically
        setInterval(() => {
            this.checkForReminders();
        }, 60000); // Check every minute for better accuracy
    }

    // Check if reminders should be shown
    async checkForReminders() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const today = now.toISOString().split('T')[0];
        
        try {
            // 7 AM Payment Reminder (repeats daily until paid)
            if (hour === 7 && minute === 0) {
                await this.checkPaymentReminder();
            }
            
            // 6 PM Work Reminder (only if work not done today)
            if (hour === 18 && minute === 0) {
                await this.checkWorkReminder(today);
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }
    
    // Check if payment reminder should be shown
    async checkPaymentReminder() {
        try {
            if (this.db) {
                const stats = await this.db.getEarningsStats();
                const unpaidWork = stats.unpaidWork || 0;
                
                if (unpaidWork >= 4) {
                    this.showNotification('💰 Payment Due - R-Service Tracker', {
                        body: `You have ${unpaidWork} unpaid work days (₹${unpaidWork * 25}). Time to collect your payment!`,
                        tag: 'payment-reminder-7am',
                        requireInteraction: true,
                        icon: '/assets/icon-192.png',
                        image: '/assets/icon-512.png',
                        actions: [
                            { action: 'open-app', title: 'Open App' },
                            { action: 'dismiss', title: 'Later' }
                        ],
                        onClick: () => {
                            // Focus on the app when clicked
                            window.focus();
                        }
                    });
                    
                    // Also show in-app notification
                    this.showToast(`Payment reminder: ${unpaidWork} days (₹${unpaidWork * 25}) pending payment`, 'warning', 5000);
                }
            }
        } catch (error) {
            console.error('Error checking payment reminder:', error);
        }
    }
    
    // Check if work reminder should be shown
    async checkWorkReminder(today) {
        try {
            if (this.db) {
                const workRecord = await this.db.getWorkRecord(today);
                
                if (!workRecord || workRecord.status !== 'completed') {
                    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    
                    this.showNotification('📝 Work Reminder - R-Service Tracker', {
                        body: `Don't forget to mark your work as completed for ${dayName}! (₹25 pending)`,
                        tag: 'work-reminder-6pm',
                        requireInteraction: false,
                        icon: '/assets/icon-192.png',
                        image: '/assets/icon-512.png',
                        actions: [
                            { action: 'open-app', title: 'Open App' },
                            { action: 'dismiss', title: 'Later' }
                        ],
                        onClick: () => {
                            // Focus on the app when clicked
                            window.focus();
                        }
                    });
                    
                    // Also show in-app notification
                    this.showToast(`Work reminder: Mark today's work as completed (₹25)`, 'info', 5000);
                }
            }
        } catch (error) {
            console.error('Error checking work reminder:', error);
        }
    }
    
    // Set database reference for reminder checks
    setDatabase(db) {
        this.db = db;
    }
}

// Export the notification manager
window.NotificationManager = NotificationManager;

// Add CSS animations for toast notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .toast.loading .toast-icon .spinner {
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .toast.show {
        opacity: 1;
        transform: translateX(0);
    }
`;
document.head.appendChild(style);