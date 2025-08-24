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
        if (!this.toastContainer) {
            console.warn('Toast container not found, creating one...');
            this.createToastContainer();
        }
        this.checkPermission();
    }

    // Create toast container if missing (bug fix)
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        this.toastContainer = container;
        console.log('Toast container created successfully');
    }

    // Check current notification permission
    checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    // Request notification and sound permissions
    async requestPermission() {
        const results = {
            notification: this.permission,
            sound: 'granted' // Default to granted for sound
        };

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission();
                results.notification = this.permission;
                
                if (this.permission === 'granted') {
                    this.showToast('Notifications enabled! You\'ll be notified about paydays.', 'success');
                } else {
                    this.showToast('Notifications denied. Enable them in browser settings for payday alerts.', 'warning');
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                this.showToast('Error enabling notifications.', 'error');
                results.notification = 'denied';
            }
        } else if ('Notification' in window && Notification.permission === 'denied') {
            this.showToast('Notifications are blocked. Enable them in browser settings.', 'warning');
            results.notification = 'denied';
        }

        // Request sound/audio permission
        try {
            // Check if browser supports getUserMedia for audio permission
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Request microphone permission as a way to enable audio playback
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // Immediately stop the stream as we don't need it
                    stream.getTracks().forEach(track => track.stop());
                    results.sound = 'granted';
                    
                    // Test audio context for sound permission
                    if (window.AudioContext || window.webkitAudioContext) {
                        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                        const audioContext = new AudioContextClass();
                        if (audioContext.state === 'suspended') {
                            await audioContext.resume();
                        }
                        audioContext.close();
                    }
                    
                    this.showToast('Sound permissions enabled! Audio notifications will work.', 'success');
                } catch (audioError) {
                    console.log('Audio permission not granted or not needed:', audioError.message);
                    results.sound = 'denied';
                    
                    // Try alternative audio permission method
                    try {
                        if (window.AudioContext || window.webkitAudioContext) {
                            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                            const audioContext = new AudioContextClass();
                            
                            // Create a silent audio buffer to test audio permission
                            const buffer = audioContext.createBuffer(1, 1, 22050);
                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContext.destination);
                            source.start(0);
                            
                            if (audioContext.state === 'suspended') {
                                await audioContext.resume();
                            }
                            
                            audioContext.close();
                            results.sound = 'granted';
                            this.showToast('Sound permissions enabled via audio context!', 'success');
                        }
                    } catch (contextError) {
                        console.log('Audio context permission failed:', contextError.message);
                        this.showToast('Sound permission denied. Sounds may not work until you interact with the page.', 'warning');
                    }
                }
            } else {
                // Fallback: try to create audio context without getUserMedia
                if (window.AudioContext || window.webkitAudioContext) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioContextClass();
                    
                    if (audioContext.state === 'suspended') {
                        // Show user instruction for audio permission
                        this.showToast('Click anywhere to enable sounds!', 'info', 3000);
                        
                        // Add one-time click listener to resume audio context
                        const resumeAudio = async () => {
                            try {
                                await audioContext.resume();
                                results.sound = 'granted';
                                this.showToast('Sounds enabled!', 'success');
                                document.removeEventListener('click', resumeAudio);
                                audioContext.close();
                            } catch (error) {
                                console.error('Failed to resume audio context:', error);
                            }
                        };
                        document.addEventListener('click', resumeAudio, { once: true });
                    } else {
                        results.sound = 'granted';
                        audioContext.close();
                    }
                }
            }
        } catch (error) {
            console.error('Error requesting sound permission:', error);
            results.sound = 'denied';
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
                icon: '/assets/favicon.ico',
                badge: '/assets/favicon.ico',
                image: '/assets/favicon.ico', // Add image for better mobile support
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
            icon: './assets/favicon.ico',
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
                                        icon: './assets/favicon.ico'
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
                            icon: './assets/favicon.ico'
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
            body: `Great job! You've earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} today.`,
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

    // Play success sound (ultra-realistic task completion sound)
    playSuccessSound() {
        if (!this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // Create master gain node with better volume control
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.25, now); // Slightly lower for better UX
        
        // Create realistic task completion sound similar to iOS/Android notifications
        
        // Sound 1: Initial pleasant ding (like a notification bell)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(masterGain);
        
        osc1.type = 'sine'; // Pure sine wave for clean sound
        osc1.frequency.setValueAtTime(1046.5, now); // C6 note - pleasant and recognizable
        gain1.gain.setValueAtTime(0.8, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc1.start(now);
        osc1.stop(now + 0.4);

        // Sound 2: Harmonic confirmation (perfect fifth)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(masterGain);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1568.0, now + 0.12); // G6 - creates pleasant harmony
        gain2.gain.setValueAtTime(0.6, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);

        // Sound 3: Gentle reverb tail for richness
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc3.connect(filter);
        filter.connect(gain3);
        gain3.connect(masterGain);
        
        osc3.type = 'triangle'; // Softer waveform for reverb effect
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now + 0.2);
        osc3.frequency.setValueAtTime(523.25, now + 0.2); // C5 - octave lower for depth
        gain3.gain.setValueAtTime(0.3, now + 0.2);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc3.start(now + 0.2);
        osc3.stop(now + 0.8);

        console.log('Enhanced task completion sound played');
    }

    // Play payment sound (API-based transaction sound)
    playPaymentSound() {
        try {
            // Try to use Web Audio API for better sound quality
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create a sophisticated transaction success sound
            this.createTransactionSound();
        } catch (error) {
            console.warn('Web Audio API not available, trying fallback sound');
            // Fallback to playing a bank-style transaction sound using frequency patterns
            this.playFallbackTransactionSound();
        }
    }

    // Ultra-realistic banking transaction sound (like real POS terminals)
    createTransactionSound() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // Create master gain node with proper banking volume
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.3, now); // Professional volume level
        
        // Authentic banking transaction sequence
        
        // Sound 1: Initial card read beep (very characteristic POS sound)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(masterGain);
        
        osc1.type = 'square'; // Square wave for that classic digital beep
        osc1.frequency.setValueAtTime(880, now); // A5 note
        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc1.start(now);
        osc1.stop(now + 0.15);
        
        // Sound 2: Network processing chirp (API communication)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const filter2 = ctx.createBiquadFilter();
        
        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(masterGain);
        
        osc2.type = 'sawtooth'; // More digital sounding
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(1200, now + 0.4);
        osc2.frequency.setValueAtTime(660, now + 0.4); // E5
        gain2.gain.setValueAtTime(0.4, now + 0.4);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc2.start(now + 0.4);
        osc2.stop(now + 0.6);
        
        // Sound 3: Bank approval tone (distinctive upward sweep)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(masterGain);
        
        osc3.type = 'sine'; // Clean sine for approval
        osc3.frequency.setValueAtTime(784, now + 0.8); // G5
        osc3.frequency.exponentialRampToValueAtTime(1174.66, now + 1.1); // D6 - perfect fifth up
        gain3.gain.setValueAtTime(0.6, now + 0.8);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        osc3.start(now + 0.8);
        osc3.stop(now + 1.2);
        
        // Sound 4: Final confirmation (classic banking double-beep)
        const osc4a = ctx.createOscillator();
        const gain4a = ctx.createGain();
        osc4a.connect(gain4a);
        gain4a.connect(masterGain);
        
        osc4a.type = 'sine';
        osc4a.frequency.setValueAtTime(1046.5, now + 1.4); // C6
        gain4a.gain.setValueAtTime(0.7, now + 1.4);
        gain4a.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
        
        osc4a.start(now + 1.4);
        osc4a.stop(now + 1.55);
        
        const osc4b = ctx.createOscillator();
        const gain4b = ctx.createGain();
        osc4b.connect(gain4b);
        gain4b.connect(masterGain);
        
        osc4b.type = 'sine';
        osc4b.frequency.setValueAtTime(1046.5, now + 1.65); // Same note
        gain4b.gain.setValueAtTime(0.7, now + 1.65);
        gain4b.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        
        osc4b.start(now + 1.65);
        osc4b.stop(now + 1.8);
        
        // Sound 5: Realistic receipt printing mechanism
        const printDuration = 0.4;
        const printBuffer = ctx.createBuffer(1, ctx.sampleRate * printDuration, ctx.sampleRate);
        const printData = printBuffer.getChannelData(0);
        
        // Generate realistic printer noise with mechanical rhythm
        for (let i = 0; i < printData.length; i++) {
            const time = i / ctx.sampleRate;
            const mechanicalFreq = 40; // 40Hz mechanical printing rhythm
            const envelope = Math.exp(-time * 3); // Decay envelope
            const mechanical = Math.sin(time * mechanicalFreq * 2 * Math.PI) * 0.5;
            const noise = (Math.random() * 2 - 1) * 0.3;
            printData[i] = (mechanical + noise) * envelope * 0.15;
        }
        
        const printSource = ctx.createBufferSource();
        const printGain = ctx.createGain();
        const printFilter = ctx.createBiquadFilter();
        
        printSource.buffer = printBuffer;
        printSource.connect(printFilter);
        printFilter.connect(printGain);
        printGain.connect(masterGain);
        
        printFilter.type = 'bandpass';
        printFilter.frequency.setValueAtTime(1500, now + 2.0);
        printFilter.Q.setValueAtTime(2, now + 2.0);
        printGain.gain.setValueAtTime(0.8, now + 2.0);
        printGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
        
        printSource.start(now + 2.0);
        printSource.stop(now + 2.4);
        
        console.log('Ultra-realistic banking transaction sound sequence completed');
    }

    // Fallback transaction sound for older browsers (improved)
    playFallbackTransactionSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Enhanced banking-style beep sequence
            const frequencies = [1000, 800, 1200, 1400]; // More realistic sequence
            const timings = [0, 0.3, 0.6, 1.0]; // Better timing like real terminals
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(freq, now + timings[index]);
                gain.gain.setValueAtTime(0.3, now + timings[index]);
                gain.gain.exponentialRampToValueAtTime(0.01, now + timings[index] + 0.2);
                
                osc.start(now + timings[index]);
                osc.stop(now + timings[index] + 0.2);
            });
            
            console.log('Fallback transaction sound played');
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

    // Play subtle error sound for validation
    playErrorSound() {
        if (!this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // Create a gentle error sound (not harsh)
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.15, now); // Very subtle volume
        
        // Error tone (descending minor third)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(masterGain);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.2); // A4
        gain1.gain.setValueAtTime(0.6, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc1.start(now);
        osc1.stop(now + 0.3);
        
        // Subtle second tone for depth
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(masterGain);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(311.13, now + 0.1); // Eb4
        gain2.gain.setValueAtTime(0.3, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc2.start(now + 0.1);
        osc2.stop(now + 0.4);
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
        
        console.log('📅 Daily reminder system activated');
    }

    // Enhanced reminder checking with better time management
    async checkForReminders() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const today = now.toISOString().split('T')[0];
        const timeKey = `${hour}:${minute.toString().padStart(2, '0')}`;
        
        // Prevent duplicate notifications on the same day for the same time
        const lastNotificationKey = `lastNotification_${today}_${hour}`;
        const lastNotified = localStorage.getItem(lastNotificationKey);
        
        try {
            // 7:00 AM Payment Reminder (repeats daily until paid)
            if (timeKey === '7:00' && !lastNotified) {
                localStorage.setItem(lastNotificationKey, 'true');
                await this.checkPaymentReminder();
            }
            
            // 6:00 PM Work Reminder (only if work not done today)
            if (timeKey === '18:00' && !lastNotified) {
                localStorage.setItem(lastNotificationKey, 'true');
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
    
    // Clean up old notification flags
    cleanupOldNotificationFlags() {
        const keys = Object.keys(localStorage);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        keys.forEach(key => {
            if (key.startsWith('lastNotification_') && key.includes(yesterdayStr)) {
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
                    this.playPaymentSound();
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
                    this.playSuccessSound();
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