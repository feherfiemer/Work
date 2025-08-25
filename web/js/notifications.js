// Notification Manager for R-Service Tracker
console.log('[DEBUG] notifications.js loading...');
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.toastContainer = null;
        this.init();
    }

    // Initialize notification manager
    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            console.warn('Toast container not found, creating one');
            this.createToastContainer();
        }
        this.checkPermission();
    }
    
    // Create toast container if it doesn't exist
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

    // Check current notification permission
    checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    // Request notification and audio permissions
    async requestPermission() {
        let results = {
            notifications: this.permission,
            audio: 'granted'
        };
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission();
                results.notifications = this.permission;
                
                if (this.permission === 'granted') {
                    this.showToast('Notifications enabled! You\'ll be notified about paydays.', 'success');
                } else {
                    this.showToast('Notifications denied. Enable them in browser settings for payday alerts.', 'warning');
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                this.showToast('Error enabling notifications.', 'error');
                results.notifications = 'denied';
            }
        } else if ('Notification' in window && Notification.permission === 'denied') {
            this.showToast('Notifications are blocked. Enable them in browser settings.', 'warning');
            results.notifications = 'denied';
        }
        
        // Request microphone/speaker permission for audio feedback
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Request minimal audio permission to enable Web Audio API
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 8000,
                        channelCount: 1
                    } 
                });
                
                // Immediately stop the stream as we only need permission
                stream.getTracks().forEach(track => track.stop());
                results.audio = 'granted';
                
                this.showToast('Audio feedback enabled for better notifications!', 'success');
                console.log('Audio permission granted successfully');
                
            } else {
                console.log('MediaDevices API not supported');
                results.audio = 'not-supported';
            }
        } catch (audioError) {
            console.log('Audio permission denied or not available:', audioError.message);
            results.audio = 'denied';
            // Don't show error toast for audio as it's not critical
        }
        
        // Ensure AudioContext can be created for sound effects
        try {
            if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Resume AudioContext if suspended (required by some browsers)
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                console.log('AudioContext initialized successfully');
            }
        } catch (contextError) {
            console.log('AudioContext initialization failed:', contextError.message);
        }
        
        return results;
    }

    // Show browser notification with enhanced delivery for mobile
    showNotification(title, options = {}) {
        // Update permission status first
        this.checkPermission();
        
        console.log('Attempting to show notification:', title, 'Permission:', this.permission);
        
        // Always show toast notification as backup
        this.showToast(title + (options.body ? ': ' + options.body : ''), options.toastType || 'info', options.toastDuration || 5000);
        
        if ('Notification' in window && this.permission === 'granted') {
            const defaultOptions = {
                icon: location.origin + '/assets/favicon.ico',
                badge: location.origin + '/assets/favicon.ico',
                image: location.origin + '/assets/favicon.ico', // Add image for better mobile support
                dir: 'ltr',
                lang: 'en',
                renotify: true,
                requireInteraction: true, // Keep notification visible on mobile
                silent: false,
                tag: options.tag || 'r-service-tracker-' + Date.now(),
                timestamp: Date.now(),
                vibrate: [200, 100, 200, 100, 200, 100, 200], // Stronger vibration for mobile
                data: { // Add data for service worker handling
                    url: window.location.origin,
                    timestamp: Date.now(),
                    type: options.type || 'general'
                },
                actions: options.actions || []
            };

            const finalOptions = { ...defaultOptions, ...options };

            try {
                // Always prefer service worker for better mobile support
                if ('serviceWorker' in navigator) {
                    return navigator.serviceWorker.ready.then(registration => {
                        console.log('Using service worker for notification:', title);
                        console.log('Notification options:', finalOptions);
                        
                        // For mobile compatibility, ensure service worker shows notification
                        return registration.showNotification(title, finalOptions).then(() => {
                            console.log('Service worker notification displayed successfully');
                            
                            // Add additional vibration for mobile
                            if ('vibrate' in navigator) {
                                navigator.vibrate([200, 100, 200]);
                            }
                            
                            return true;
                        });
                    }).catch(error => {
                        console.error('Service worker notification failed:', error);
                        console.log('Notification shown via toast only due to service worker error');
                        return null;
                    });
                } else {
                    console.log('Service worker not available, notification shown via toast only');
                    return null;
                }
            } catch (error) {
                console.error('Error creating notification:', error);
                this.showToast('Browser notification failed: ' + title, 'warning');
            }
        } else if ('Notification' in window && this.permission === 'denied') {
            console.log('Notifications denied by user');
            this.showToast('Enable notifications in browser settings for better alerts', 'warning', 3000);
        } else {
            console.log('Browser notifications not supported');
            this.showToast('Your browser doesn\'t support notifications', 'info', 3000);
        }
        
        return null;
    }

    // Create regular notification (fallback method) - only when no service worker
    createRegularNotification(title, finalOptions) {
        // Check if service worker is available - if so, don't use regular notification
        if ('serviceWorker' in navigator) {
            console.log('Service worker available, skipping regular notification to avoid constructor error');
            return null;
        }

        try {
            const notification = new Notification(title, finalOptions);
            console.log('Browser notification created successfully:', title);
            
            // Auto close after duration or 8 seconds
            const autoCloseTime = finalOptions.duration || 8000;
            setTimeout(() => {
                try {
                    notification.close();
                    console.log('Notification auto-closed after', autoCloseTime, 'ms');
                } catch (e) {
                    // Notification might already be closed
                }
            }, autoCloseTime);

            // Handle notification click
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
                console.log('Notification clicked and closed');
                
                // Handle specific actions
                if (finalOptions.onClick) {
                    try {
                        finalOptions.onClick();
                    } catch (e) {
                        console.error('Error in notification click handler:', e);
                    }
                }
            };

            // Handle notification error
            notification.onerror = (error) => {
                console.error('Notification error:', error);
                // Additional toast notification for errors
                this.showToast('Notification delivery failed', 'error', 3000);
            };

            // Handle notification close
            notification.onclose = () => {
                console.log('Notification closed:', title);
            };

            return notification;
        } catch (error) {
            console.error('Error creating regular notification:', error);
            this.showToast('Browser notification failed: ' + title, 'warning');
            return null;
        }
    }

    // Show enhanced welcome notification for first-time users
    showWelcomeNotification() {
        const title = 'Welcome to R-Service Tracker!';
        const options = {
            body: 'Setting up your daily work tracker... We\'re configuring notifications, initializing your dashboard, and preparing your work tracking system. You\'ll be ready to track your daily work and earnings in just a moment!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'welcome-setup',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            actions: [
                {
                    action: 'get-started',
                    title: 'Get Started'
                },
                {
                    action: 'learn-more',
                    title: 'Learn More'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Welcome! Your work tracker is being set up...', 'success', 8000);
        
        console.log('Welcome notification shown for first-time user');
    }

    // Request notification permission on every visit if not granted
    async checkAndRequestPermission() {
        if ('Notification' in window) {
            const permission = Notification.permission;
            console.log('Current notification permission:', permission);
            
            if (permission === 'default') {
                // Show a friendly prompt before requesting permission
                this.showToast('Enable notifications to get daily work reminders and payment alerts!', 'info', 6000);
                
                // Wait a bit then show the browser permission request
                setTimeout(async () => {
                    try {
                        console.log('Requesting notification permission from browser...');
                        
                        // Request permission using the browser's native dialog
                        const result = await Notification.requestPermission();
                        console.log('Permission request result:', result);
                        
                        this.permission = result;
                        
                        if (result === 'granted') {
                            this.showToast('Notifications enabled successfully!', 'success', 4000);
                            
                            // Show welcome notification for new users after permission is granted
                            const hasShownWelcome = localStorage.getItem('welcomeNotificationShown');
                            if (!hasShownWelcome) {
                                setTimeout(() => {
                                    this.showWelcomeNotification();
                                    localStorage.setItem('welcomeNotificationShown', 'true');
                                }, 2000); // Wait 2 seconds after permission granted
                            } else {
                                // Show a quick check-in notification for returning users
                                setTimeout(() => {
                                    this.showNotification('Daily Check-in', {
                                        body: 'Welcome back! Ready to track your work today? Don\'t forget to mark your tasks as completed.',
                                        tag: 'daily-checkin',
                                        icon: location.origin + '/assets/favicon.ico'
                                    });
                                }, 1500);
                            }
                        } else if (result === 'denied') {
                            this.showToast('Notifications were denied. You can enable them later in browser settings.', 'warning', 6000);
                        } else {
                            this.showToast('Notification permission was dismissed. You can enable them later.', 'info', 4000);
                        }
                    } catch (error) {
                        console.error('Error requesting notification permission:', error);
                        this.showToast('Error requesting notification permission', 'error', 4000);
                    }
                }, 3000); // Wait 3 seconds before showing permission request
                
            } else if (permission === 'denied') {
                // Create a more helpful message for denied permissions
                const helpMessage = 'Notifications are blocked. To enable:\n' +
                                  '1. Click the 🔒 icon in your address bar\n' +
                                  '2. Set Notifications to "Allow"\n' +
                                  '3. Refresh the page';
                this.showToast(helpMessage.replace(/\n/g, ' '), 'warning', 10000);
                
                // Also show a clickable notification to help users
                setTimeout(() => {
                    this.showToast('Click here for help enabling notifications', 'info', 8000);
                }, 2000);
                
            } else if (permission === 'granted') {
                console.log('Notifications already granted');
                this.permission = permission;
                
                // Check if this is a new session and show appropriate notification
                const lastSessionDate = localStorage.getItem('lastSessionDate');
                const today = new Date().toISOString().split('T')[0];
                
                if (lastSessionDate !== today) {
                    localStorage.setItem('lastSessionDate', today);
                    setTimeout(() => {
                        this.showNotification('Daily Check-in', {
                            body: 'Welcome back! Ready to track your work today? Don\'t forget to mark your tasks as completed.',
                            tag: 'daily-checkin',
                            icon: location.origin + '/assets/favicon.ico'
                        });
                    }, 2000);
                }
            }
        } else {
            console.warn('Notifications not supported in this browser');
            this.showToast('Notifications are not supported in your browser', 'warning', 5000);
        }
    }

    // Show payday notification
    showPaydayNotification() {
        const title = 'Payday Alert!';
        const options = {
            body: 'Today is your payday — you\'ve earned ₹100! Mark your payment to update your records.',
            icon: location.origin + '/assets/favicon.ico',
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
            body: `Great job! You've earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || window.R_SERVICE_CONFIG?.INCREMENT_VALUE || 25} today.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'work-completed'
        };

        this.showNotification(title, options);
    }

    // Show payment notification
    showPaymentNotification(amount) {
        const title = 'Payment Recorded';
        const options = {
            body: `Payment of ₹${amount} has been recorded successfully.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'payment-recorded'
        };

        this.showNotification(title, options);
    }

    // Show streak notification
    showStreakNotification(streak) {
        const title = 'Streak Achievement!';
        const options = {
            body: `Amazing! You've worked ${streak} days in a row. Keep it up!`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'streak-achievement'
        };

        this.showNotification(title, options);
    }

    // Show advance payment notification
    showAdvancePaymentNotification() {
        const title = 'Advance Payment Reminder';
        const options = {
            body: 'You have advance payments that need to be worked off. Complete your remaining work days!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'advance-payment-reminder',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-status',
                    title: 'View Status'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Advance payment reminder: Complete your remaining work days!', 'warning', 6000);
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
                
                // Resume audio context if suspended (required on mobile)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                        this.playSoundType(soundType);
                    }).catch(error => {
                        console.warn('Could not resume audio context:', error);
                    });
                    return;
                }
            }

            this.playSoundType(soundType);
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }
    
    // Helper method to play specific sound type
    playSoundType(soundType) {
        if (soundType === 'done') {
            this.playSystematicSound('success', 'medium');
        } else if (soundType === 'paid') {
            this.playSystematicSound('payment', 'medium');
        }
    }

    // Play success sound (premium achievement sound with coin collection)
    playSuccessSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create master gain node with dynamic compression
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.6, now);

            // Stage 1: Premium coin drop with multiple metallic layers
            this.createPremiumCoinSound(ctx, masterGain, now);
            
            // Stage 2: Magical sparkle effect (like collecting coins in premium games)
            this.createSparkleEffect(ctx, masterGain, now + 0.15);
            
            // Stage 3: Satisfying completion chord progression
            this.createCompletionChord(ctx, masterGain, now + 0.3);
            
            // Stage 4: Subtle reverb tail for premium feel
            this.createReverbTail(ctx, masterGain, now + 0.5);

            console.log('Premium achievement sound sequence played');
        } catch (error) {
            console.warn('Error playing premium success sound:', error);
        }
    }

    // Create premium coin sound with multiple metallic layers
    createPremiumCoinSound(ctx, masterGain, startTime) {
        // Primary coin ping - crisp and bright
        const coinPing = ctx.createOscillator();
        const coinGain = ctx.createGain();
        const coinFilter = ctx.createBiquadFilter();
        
        coinPing.connect(coinFilter);
        coinFilter.connect(coinGain);
        coinGain.connect(masterGain);
        
        coinPing.type = 'triangle';
        coinFilter.type = 'bandpass';
        coinFilter.frequency.setValueAtTime(2800, startTime);
        coinFilter.Q.setValueAtTime(12, startTime);
        
        coinPing.frequency.setValueAtTime(2800, startTime);
        coinPing.frequency.exponentialRampToValueAtTime(2200, startTime + 0.08);
        coinPing.frequency.exponentialRampToValueAtTime(2600, startTime + 0.15);
        
        coinGain.gain.setValueAtTime(0.9, startTime);
        coinGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        
        coinPing.start(startTime);
        coinPing.stop(startTime + 0.3);

        // Secondary metallic resonance - deeper and richer
        const resonance = ctx.createOscillator();
        const resGain = ctx.createGain();
        const resFilter = ctx.createBiquadFilter();
        
        resonance.connect(resFilter);
        resFilter.connect(resGain);
        resGain.connect(masterGain);
        
        resonance.type = 'sawtooth';
        resFilter.type = 'bandpass';
        resFilter.frequency.setValueAtTime(1400, startTime);
        resFilter.Q.setValueAtTime(6, startTime);
        
        resonance.frequency.setValueAtTime(1400, startTime);
        resonance.frequency.exponentialRampToValueAtTime(1100, startTime + 0.12);
        
        resGain.gain.setValueAtTime(0.5, startTime);
        resGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        resonance.start(startTime);
        resonance.stop(startTime + 0.25);

        // Tertiary harmonic - crystal-like overtones
        const crystal = ctx.createOscillator();
        const crystalGain = ctx.createGain();
        const crystalFilter = ctx.createBiquadFilter();
        
        crystal.connect(crystalFilter);
        crystalFilter.connect(crystalGain);
        crystalGain.connect(masterGain);
        
        crystal.type = 'sine';
        crystalFilter.type = 'highpass';
        crystalFilter.frequency.setValueAtTime(3000, startTime);
        
        crystal.frequency.setValueAtTime(5600, startTime);
        crystal.frequency.exponentialRampToValueAtTime(4200, startTime + 0.06);
        
        crystalGain.gain.setValueAtTime(0.3, startTime);
        crystalGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        
        crystal.start(startTime);
        crystal.stop(startTime + 0.2);
    }

    // Create magical sparkle effect
    createSparkleEffect(ctx, masterGain, startTime) {
        const sparkles = [
            { freq: 3520, delay: 0, duration: 0.1 },
            { freq: 4400, delay: 0.03, duration: 0.08 },
            { freq: 2794, delay: 0.06, duration: 0.12 },
            { freq: 3520, delay: 0.09, duration: 0.1 }
        ];

        sparkles.forEach((sparkle, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(sparkle.freq, startTime + sparkle.delay);
            filter.Q.setValueAtTime(20, startTime + sparkle.delay);
            
            osc.frequency.setValueAtTime(sparkle.freq, startTime + sparkle.delay);
            
            gain.gain.setValueAtTime(0.4 - index * 0.08, startTime + sparkle.delay);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + sparkle.delay + sparkle.duration);
            
            osc.start(startTime + sparkle.delay);
            osc.stop(startTime + sparkle.delay + sparkle.duration);
        });
    }

    // Create satisfying completion chord
    createCompletionChord(ctx, masterGain, startTime) {
        const chord = [
            { freq: 523.25, gain: 0.4 }, // C5
            { freq: 659.25, gain: 0.3 }, // E5
            { freq: 783.99, gain: 0.25 } // G5
        ];

        chord.forEach((note, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, startTime);
            filter.Q.setValueAtTime(1, startTime);
            
            osc.frequency.setValueAtTime(note.freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(note.gain, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
            
            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    }

    // Create subtle reverb tail
    createReverbTail(ctx, masterGain, startTime) {
        const tail = ctx.createOscillator();
        const tailGain = ctx.createGain();
        const tailFilter = ctx.createBiquadFilter();
        
        tail.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(masterGain);
        
        tail.type = 'sine';
        tailFilter.type = 'lowpass';
        tailFilter.frequency.setValueAtTime(800, startTime);
        tailFilter.Q.setValueAtTime(0.5, startTime);
        
        tail.frequency.setValueAtTime(220, startTime); // A3
        
        tailGain.gain.setValueAtTime(0.15, startTime);
        tailGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        
        tail.start(startTime);
        tail.stop(startTime + 0.8);
    }

    // Play payment sound (premium transaction sound)
    playPaymentSound() {
        try {
            // Try to use Web Audio API for better sound quality
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create a premium transaction success sound
            this.createPremiumTransactionSound();
        } catch (error) {
            console.warn('Web Audio API not available, trying fallback sound');
            // Fallback to playing a simple professional sound
            this.playSimpleTransactionSound();
        }
    }

    // Premium payment success sound (ultra-realistic transaction with luxury feel)
    createPremiumTransactionSound() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
        
            // Create master gain node with professional dynamics processing
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, now);
            compressor.knee.setValueAtTime(30, now);
            compressor.ratio.setValueAtTime(12, now);
            compressor.attack.setValueAtTime(0.003, now);
            compressor.release.setValueAtTime(0.25, now);
            
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.7, now);
            
            // Stage 1: Premium card tap with NFC authenticity
            this.createCardTapSound(ctx, masterGain, now);
            
            // Stage 2: Advanced processing with multiple tones
            this.createProcessingSequence(ctx, masterGain, now + 0.15);
            
            // Stage 3: Luxury success melody with harmonics
            this.createLuxurySuccessSound(ctx, masterGain, now + 0.45);
            
            // Stage 4: Digital confirmation with modern touch
            this.createDigitalConfirmation(ctx, masterGain, now + 0.8);
            
            // Stage 5: Premium finishing touch with reverb
            this.createPremiumFinish(ctx, masterGain, now + 1.1);

            console.log('Ultra-premium transaction sound sequence played');
        } catch (error) {
            console.warn('Error playing premium payment sound:', error);
        }
    }

    // Create authentic card tap sound
    createCardTapSound(ctx, masterGain, startTime) {
        // NFC activation sound - subtle electronic chirp
        const nfcChirp = ctx.createOscillator();
        const chirpGain = ctx.createGain();
        const chirpFilter = ctx.createBiquadFilter();
        
        nfcChirp.connect(chirpFilter);
        chirpFilter.connect(chirpGain);
        chirpGain.connect(masterGain);
        
        nfcChirp.type = 'sine';
        chirpFilter.type = 'bandpass';
        chirpFilter.frequency.setValueAtTime(2400, startTime);
        chirpFilter.Q.setValueAtTime(8, startTime);
        
        nfcChirp.frequency.setValueAtTime(2400, startTime);
        nfcChirp.frequency.exponentialRampToValueAtTime(2800, startTime + 0.03);
        nfcChirp.frequency.exponentialRampToValueAtTime(2200, startTime + 0.08);
        
        chirpGain.gain.setValueAtTime(0.3, startTime);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        
        nfcChirp.start(startTime);
        nfcChirp.stop(startTime + 0.12);

        // Card contact sound - subtle physical texture
        const contactSound = ctx.createOscillator();
        const contactGain = ctx.createGain();
        const contactFilter = ctx.createBiquadFilter();
        
        contactSound.connect(contactFilter);
        contactFilter.connect(contactGain);
        contactGain.connect(masterGain);
        
        contactSound.type = 'triangle';
        contactFilter.type = 'highpass';
        contactFilter.frequency.setValueAtTime(1500, startTime + 0.02);
        
        contactSound.frequency.setValueAtTime(800, startTime + 0.02);
        contactSound.frequency.linearRampToValueAtTime(600, startTime + 0.08);
        
        contactGain.gain.setValueAtTime(0.15, startTime + 0.02);
        contactGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        
        contactSound.start(startTime + 0.02);
        contactSound.stop(startTime + 0.1);
    }

    // Create sophisticated processing sequence
    createProcessingSequence(ctx, masterGain, startTime) {
        // Primary processing tone - modern and clean
        const processingTone = ctx.createOscillator();
        const processGain = ctx.createGain();
        const processFilter = ctx.createBiquadFilter();
        
        processingTone.connect(processFilter);
        processFilter.connect(processGain);
        processGain.connect(masterGain);
        
        processingTone.type = 'square';
        processFilter.type = 'lowpass';
        processFilter.frequency.setValueAtTime(1800, startTime);
        processFilter.Q.setValueAtTime(2, startTime);
        
        processingTone.frequency.setValueAtTime(1200, startTime);
        
        processGain.gain.setValueAtTime(0.25, startTime);
        processGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        
        processingTone.start(startTime);
        processingTone.stop(startTime + 0.15);

        // Secondary processing chirp - authentication feedback
        const authChirp = ctx.createOscillator();
        const authGain = ctx.createGain();
        const authFilter = ctx.createBiquadFilter();
        
        authChirp.connect(authFilter);
        authFilter.connect(authGain);
        authGain.connect(masterGain);
        
        authChirp.type = 'sine';
        authFilter.type = 'bandpass';
        authFilter.frequency.setValueAtTime(1600, startTime + 0.08);
        authFilter.Q.setValueAtTime(12, startTime + 0.08);
        
        authChirp.frequency.setValueAtTime(1600, startTime + 0.08);
        authChirp.frequency.linearRampToValueAtTime(1800, startTime + 0.12);
        
        authGain.gain.setValueAtTime(0.2, startTime + 0.08);
        authGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        
        authChirp.start(startTime + 0.08);
        authChirp.stop(startTime + 0.18);
    }

    // Create luxury success sound with rich harmonics
    createLuxurySuccessSound(ctx, masterGain, startTime) {
        // Main success melody - sophisticated and uplifting
        const melody = [
            { freq: 523.25, time: 0, duration: 0.15 },    // C5
            { freq: 659.25, time: 0.08, duration: 0.2 },  // E5  
            { freq: 783.99, time: 0.16, duration: 0.25 }, // G5
            { freq: 1046.50, time: 0.24, duration: 0.3 }  // C6
        ];

        melody.forEach((note, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2500, startTime + note.time);
            filter.Q.setValueAtTime(1.5, startTime + note.time);
            
            osc.frequency.setValueAtTime(note.freq, startTime + note.time);
            
            gain.gain.setValueAtTime(0, startTime + note.time);
            gain.gain.linearRampToValueAtTime(0.4 - index * 0.05, startTime + note.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + note.duration);
            
            osc.start(startTime + note.time);
            osc.stop(startTime + note.time + note.duration);
        });

        // Rich harmonic accompaniment
        const harmony = ctx.createOscillator();
        const harmonyGain = ctx.createGain();
        const harmonyFilter = ctx.createBiquadFilter();
        
        harmony.connect(harmonyFilter);
        harmonyFilter.connect(harmonyGain);
        harmonyGain.connect(masterGain);
        
        harmony.type = 'triangle';
        harmonyFilter.type = 'lowpass';
        harmonyFilter.frequency.setValueAtTime(1200, startTime);
        
        harmony.frequency.setValueAtTime(261.63, startTime); // C4
        harmony.frequency.linearRampToValueAtTime(329.63, startTime + 0.15); // E4
        harmony.frequency.linearRampToValueAtTime(392.00, startTime + 0.3); // G4
        
        harmonyGain.gain.setValueAtTime(0.2, startTime);
        harmonyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        
        harmony.start(startTime);
        harmony.stop(startTime + 0.4);
    }

    // Create digital confirmation with modern touch
    createDigitalConfirmation(ctx, masterGain, startTime) {
        // Digital success ping - clean and modern
        const digitalPing = ctx.createOscillator();
        const pingGain = ctx.createGain();
        const pingFilter = ctx.createBiquadFilter();
        
        digitalPing.connect(pingFilter);
        pingFilter.connect(pingGain);
        pingGain.connect(masterGain);
        
        digitalPing.type = 'sine';
        pingFilter.type = 'peaking';
        pingFilter.frequency.setValueAtTime(2200, startTime);
        pingFilter.Q.setValueAtTime(6, startTime);
        pingFilter.gain.setValueAtTime(8, startTime);
        
        digitalPing.frequency.setValueAtTime(2200, startTime);
        digitalPing.frequency.exponentialRampToValueAtTime(1800, startTime + 0.1);
        
        pingGain.gain.setValueAtTime(0.5, startTime);
        pingGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        digitalPing.start(startTime);
        digitalPing.stop(startTime + 0.25);

        // Subtle digital texture overlay
        const texture = ctx.createOscillator();
        const textureGain = ctx.createGain();
        const textureFilter = ctx.createBiquadFilter();
        
        texture.connect(textureFilter);
        textureFilter.connect(textureGain);
        textureGain.connect(masterGain);
        
        texture.type = 'sawtooth';
        textureFilter.type = 'highpass';
        textureFilter.frequency.setValueAtTime(4000, startTime + 0.05);
        
        texture.frequency.setValueAtTime(4400, startTime + 0.05);
        texture.frequency.linearRampToValueAtTime(3800, startTime + 0.15);
        
        textureGain.gain.setValueAtTime(0.08, startTime + 0.05);
        textureGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        
        texture.start(startTime + 0.05);
        texture.stop(startTime + 0.2);
    }

    // Create premium finishing touch
    createPremiumFinish(ctx, masterGain, startTime) {
        // Final luxury bell - crystal clear and satisfying
        const luxuryBell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        const bellFilter = ctx.createBiquadFilter();
        
        luxuryBell.connect(bellFilter);
        bellFilter.connect(bellGain);
        bellGain.connect(masterGain);
        
        luxuryBell.type = 'sine';
        bellFilter.type = 'peaking';
        bellFilter.frequency.setValueAtTime(1570, startTime); // G6
        bellFilter.Q.setValueAtTime(4, startTime);
        bellFilter.gain.setValueAtTime(6, startTime);
        
        luxuryBell.frequency.setValueAtTime(1568, startTime); // G6
        
        bellGain.gain.setValueAtTime(0.45, startTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        
        luxuryBell.start(startTime);
        luxuryBell.stop(startTime + 0.8);

        // Sophisticated reverb tail
        const reverbTail = ctx.createOscillator();
        const tailGain = ctx.createGain();
        const tailFilter = ctx.createBiquadFilter();
        
        reverbTail.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(masterGain);
        
        reverbTail.type = 'sine';
        tailFilter.type = 'lowpass';
        tailFilter.frequency.setValueAtTime(600, startTime + 0.1);
        tailFilter.Q.setValueAtTime(0.7, startTime + 0.1);
        
        reverbTail.frequency.setValueAtTime(392, startTime + 0.1); // G4
        
        tailGain.gain.setValueAtTime(0.12, startTime + 0.1);
        tailGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
        
        reverbTail.start(startTime + 0.1);
        reverbTail.stop(startTime + 1.0);
    }

    // Enhanced cash register sound for older browsers
    playSimpleTransactionSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Realistic cash register bell sequence with authentic frequencies
            const cashRegisterSequence = [
                { freq: 1760, time: 0, duration: 0.5 },     // A6 - main bell
                { freq: 2200, time: 0.1, duration: 0.4 },   // C#7 - harmony bell
                { freq: 1320, time: 0.2, duration: 0.6 }    // E6 - bass bell
            ];
            
            cashRegisterSequence.forEach((note, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine'; // Pure bell tone
                osc.frequency.setValueAtTime(note.freq, now + note.time);
                gain.gain.setValueAtTime(0.4 - index * 0.1, now + note.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
                
                osc.start(now + note.time);
                osc.stop(now + note.time + note.duration);
            });
            
            console.log('Enhanced cash register sound played');
        } catch (error) {
            console.warn('Audio not available:', error);
        }
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
            icon: location.origin + '/assets/favicon.ico',
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
                icon: location.origin + '/assets/favicon.ico',
                tag: 'earnings-milestone'
            };
            this.showNotification(title, options);
        }
    }

    // Test all notification types
    testAllNotifications() {
        console.log('Testing all notification types...');
        
        // Test toast notifications
        this.showToast('Test Info Toast', 'info', 3000);
        setTimeout(() => this.showToast('Test Success Toast', 'success', 3000), 1000);
        setTimeout(() => this.showToast('Test Warning Toast', 'warning', 3000), 2000);
        setTimeout(() => this.showToast('Test Error Toast', 'error', 3000), 3000);
        
        // Test browser notifications
        setTimeout(() => {
            this.showNotification('Test Browser Notification', {
                body: 'This is a test browser notification',
                toastType: 'info',
                tag: 'test-notification'
            });
        }, 4000);
        
        // Test specific notifications
        setTimeout(() => this.showPaydayNotification(), 5000);
        setTimeout(() => this.showWorkCompletedNotification(), 6000);
        setTimeout(() => this.showStreakNotification(5), 7000);
        setTimeout(() => this.showAdvancePaymentNotification(), 8000);
        
        this.showToast('All notification tests scheduled! Check your browser and app.', 'success', 5000);
    }

    // Schedule daily reminders (enhanced implementation)
    scheduleReminders() {
        // Clear any existing intervals to prevent duplicates
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }
        
        // Check immediately on app load
        this.checkForReminders();
        
        // Set up interval to check every minute for precise timing
        this.reminderInterval = setInterval(() => {
            this.checkForReminders();
        }, 60000); // Check every minute
        
        console.log('[REMINDERS] Daily reminder system activated');
    }

    // Enhanced reminder checking with better time management and user configuration
    async checkForReminders() {
        // Get user configuration for notifications
        const config = this.getUserConfig();
        
        // Skip if notifications are disabled
        if (config.NOTIFICATIONS_ENABLED === false) {
            return;
        }
        
        // Use IST timezone for all time calculations
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const hour = istTime.getHours();
        const minute = istTime.getMinutes();
        const today = istTime.toISOString().split('T')[0];
        const timeKey = `${hour}:${minute.toString().padStart(2, '0')}`;
        
        // Get configured reminder times
        const paymentReminderTime = config.PAYMENT_REMINDER_TIME || '10:00';
        const workReminderTime = config.WORK_REMINDER_TIME || '18:00';
        
        // Prevent duplicate notifications on the same day for the same time
        const lastPaymentNotificationKey = `lastPaymentNotification_${today}`;
        const lastWorkNotificationKey = `lastWorkNotification_${today}`;
        const lastPaymentNotified = localStorage.getItem(lastPaymentNotificationKey);
        const lastWorkNotified = localStorage.getItem(lastWorkNotificationKey);
        
        try {
            // Payment Reminder (based on user configured time)
            if (timeKey === paymentReminderTime && !lastPaymentNotified) {
                localStorage.setItem(lastPaymentNotificationKey, 'true');
                await this.checkPaymentReminder();
            }
            
            // Work Reminder (based on user configured time, only if work not done today)
            if (timeKey === workReminderTime && !lastWorkNotified) {
                localStorage.setItem(lastWorkNotificationKey, 'true');
                await this.checkWorkReminder(today);
            }
            
            // Clean up old notification flags (older than 24 hours)
            if (timeKey === '0:00') {
                this.cleanupOldNotificationFlags();
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    // Get user configuration with fallback to defaults
    getUserConfig() {
        try {
            if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
                return window.ConfigManager.getConfig();
            } else if (window.R_SERVICE_CONFIG) {
                return window.R_SERVICE_CONFIG;
            } else {
                // Fallback configuration
                return {
                    NOTIFICATIONS_ENABLED: true,
                    PAYMENT_REMINDER_TIME: '10:00',
                    WORK_REMINDER_TIME: '18:00',
                    TIMEZONE: 'Asia/Kolkata'
                };
            }
        } catch (error) {
            console.error('Error getting user config:', error);
            return {
                NOTIFICATIONS_ENABLED: true,
                PAYMENT_REMINDER_TIME: '10:00',
                WORK_REMINDER_TIME: '18:00',
                TIMEZONE: 'Asia/Kolkata'
            };
        }
    }
    
    // Clean up old notification flags
    cleanupOldNotificationFlags() {
        const keys = Object.keys(localStorage);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        keys.forEach(key => {
            // Clean up both old and new notification flag formats
            if ((key.startsWith('lastNotification_') || 
                 key.startsWith('lastPaymentNotification_') || 
                 key.startsWith('lastWorkNotification_')) && 
                key.includes(yesterdayStr)) {
                localStorage.removeItem(key);
            }
        });
    }
    
    // Enhanced payment reminder with better messaging
    async checkPaymentReminder() {
        try {
            if (this.db) {
                const stats = await this.db.getEarningsStats();
                const unpaidWork = stats.unpaidWork || 0;
                
                const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                if (unpaidWork >= paymentThreshold) {
                    const paydayAmount = Math.floor(unpaidWork / paymentThreshold) * 100;
                    const extraDays = unpaidWork % paymentThreshold;
                    
                    this.showNotification('Daily Payment Reminder - R-Service Tracker', {
                        body: `Good morning! You have ${unpaidWork} unpaid work days (₹${unpaidWork * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25)}). ${paydayAmount > 0 ? `You can collect ₹${paydayAmount} right now!` : ''} ${extraDays > 0 ? `Plus ${extraDays} extra days pending.` : ''}`,
                        tag: 'payment-reminder-7am',
                        requireInteraction: true,
                        icon: '/assets/icon-192.png',
                        vibrate: [200, 100, 200, 100, 200, 100, 200],
                        actions: [
                            { action: 'open-app', title: 'Collect Payment' },
                            { action: 'snooze', title: 'Remind Later' }
                        ],
                        onClick: () => {
                            window.focus();
                        }
                    });
                    
                    // Enhanced in-app notification
                    this.showToast(`Morning reminder: ${unpaidWork} work days (₹${unpaidWork * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25)}) are ready for payment collection!`, 'warning', 8000);
                    
                    // Play attention sound
                    this.playSystematicSound('payment', 'medium');
                }
            }
        } catch (error) {
            console.error('Error checking payment reminder:', error);
        }
    }
    
    // Enhanced work reminder with better messaging
    async checkWorkReminder(today) {
        try {
            if (this.db) {
                const workRecord = await this.db.getWorkRecord(today);
                
                if (!workRecord || workRecord.status !== 'completed') {
                    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const currentStreak = (await this.db.getEarningsStats()).currentStreak || 0;
                    
                    this.showNotification('Daily Work Reminder - R-Service Tracker', {
                        body: `Good evening! Don't forget to mark your work as completed for ${dayName}! (₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} pending) ${currentStreak > 0 ? `Your ${currentStreak}-day streak is waiting!` : 'Start your work streak today!'}`,
                        tag: 'work-reminder-6pm',
                        requireInteraction: false,
                        icon: '/assets/icon-192.png',
                        vibrate: [200, 100, 200],
                        actions: [
                            { action: 'open-app', title: 'Mark Complete' },
                            { action: 'dismiss', title: 'Later' }
                        ],
                        onClick: () => {
                            window.focus();
                        }
                    });
                    
                    // Enhanced in-app notification
                    this.showToast(`Evening reminder: Mark today's work as completed to earn ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} ${currentStreak > 0 ? `and maintain your ${currentStreak}-day streak!` : 'and start building your streak!'}`, 'info', 8000);
                    
                    // Play gentle reminder sound
                    this.playSystematicSound('success', 'medium');
                }
            }
        } catch (error) {
            console.error('Error checking work reminder:', error);
        }
    }
    
    // Set database reference for reminder checks

    // ===== SYSTEMATIC AUDIO IMPROVEMENTS =====
    
    // Centralized audio settings for systematic approach
    getAudioSettings() {
        return {
            // Base frequencies for systematic sound design
            baseFrequencies: {
                success: 523.25,   // C5 - Success actions
                payment: 659.25,   // E5 - Payment actions
                warning: 349.23,   // F4 - Warning/reminder
                error: 293.66,     // D4 - Error states
                info: 392.00,      // G4 - Information
                system: 440.00     // A4 - System events
            },
            
            // Harmonic ratios for pleasing sound combinations
            harmonics: {
                major: [1, 1.25, 1.5],      // Major triad
                minor: [1, 1.2, 1.5],       // Minor triad
                seventh: [1, 1.25, 1.5, 1.75], // Major 7th
                notification: [1, 1.33, 2]   // Perfect fifth + octave
            },
            
            // Standard durations for consistency
            durations: {
                quick: 0.1,
                short: 0.2,
                medium: 0.4,
                long: 0.8,
                extended: 1.2
            },
            
            // Volume levels for different contexts
            volumes: {
                subtle: 0.1,
                low: 0.2,
                medium: 0.4,
                high: 0.6,
                attention: 0.8
            }
        };
    }
    
    // Enhanced systematic sound generator
    playSystematicSound(type, intensity = 'medium') {
        if (!this.audioContext) {
            this.createAudioContext();
            if (!this.audioContext) return;
        }
        
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        try {
            switch (type) {
                case 'success':
                    this.playHarmonicChord(settings.baseFrequencies.success, settings.harmonics.major, settings.durations.medium, settings.volumes[intensity]);
                    break;
                case 'payment':
                    this.playPaymentSequence(intensity);
                    break;
                case 'warning':
                    this.playWarningTone(intensity);
                    break;
                case 'error':
                    this.playErrorSequence(intensity);
                    break;
                case 'info':
                    this.playInfoChime(intensity);
                    break;
                case 'system':
                    this.playSystemBeep(intensity);
                    break;
                default:
                    this.playSystemBeep('low');
            }
        } catch (error) {
            console.warn('Error playing systematic sound:', error);
        }
    }
    
    // Play harmonic chord for systematic musical approach
    playHarmonicChord(baseFreq, harmonicRatios, duration, volume) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(volume, now);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        harmonicRatios.forEach((ratio, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            osc.frequency.setValueAtTime(baseFreq * ratio, now);
            osc.type = 'sine';
            
            // Slight detuning for warmth
            if (index > 0) {
                osc.frequency.setValueAtTime(baseFreq * ratio * (1 + Math.random() * 0.002 - 0.001), now);
            }
            
            gain.gain.setValueAtTime(1 / harmonicRatios.length, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.start(now);
            osc.stop(now + duration);
        });
    }
    
    // Create audio context if needed
    createAudioContext() {
        try {
            if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }
        } catch (error) {
            console.warn('Could not create audio context:', error);
        }
    }
    setDatabase(db) {
        this.db = db;
    }
}

// Export the notification manager
window.NotificationManager = NotificationManager;
console.log('[DEBUG] NotificationManager exported to window:', window.NotificationManager);

// Add CSS animations for toast notifications
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

@keyframes bounceIn {
    0% {
        transform: scale(0.3);
        opacity: 0;
    }
    50% {
        transform: scale(1.05);
    }
    70% {
        transform: scale(0.9);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.toast {
    animation: slideInRight 0.3s ease-out;
}

.modal-content {
    animation: bounceIn 0.6s ease-out;
}
`;
document.head.appendChild(style);
