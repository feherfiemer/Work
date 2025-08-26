console.log('[DEBUG] notifications.js loading...');
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.toastContainer = null;
        this.init();
    }

    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            console.warn('Toast container not found, creating one');
            this.createToastContainer();
        }
        this.checkPermission();
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

    checkPermission() {
        this.permission = 'disabled';
    }

    async requestPermission() {
        let results = {
            notifications: 'disabled', // Push notifications disabled
            audio: 'granted'
        };
        
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 8000,
                        channelCount: 1
                    } 
                });
                
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
        }
        
        try {
            if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
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

    showNotification(title, options = {}) {
        console.log('Showing toast notification:', title);
        
        this.showToast(title + (options.body ? ': ' + options.body : ''), options.toastType || 'info', options.toastDuration || 5000);
        
        
        return null;
    }



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

    async checkAndRequestPermission() {
        if ('Notification' in window) {
            const permission = Notification.permission;
            console.log('Current notification permission:', permission);
            
            if (permission === 'default') {
                this.showToast('Enable notifications to get daily work reminders and payment alerts!', 'info', 6000);
                
                setTimeout(async () => {
                    try {
                        console.log('Requesting notification permission from browser...');
                        
                        const result = await Notification.requestPermission();
                        console.log('Permission request result:', result);
                        
                        this.permission = result;
                        
                        if (result === 'granted') {
                            this.showToast('Notifications enabled successfully!', 'success', 4000);
                            
                            const hasShownWelcome = localStorage.getItem('welcomeNotificationShown');
                            if (!hasShownWelcome) {
                                setTimeout(() => {
                                    this.showWelcomeNotification();
                                    localStorage.setItem('welcomeNotificationShown', 'true');
                                }, 2000); // Wait 2 seconds after permission granted
                            } else {
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
                const helpMessage = 'Notifications are blocked. To enable:\n' +
                                  '1. Click the 🔒 icon in your address bar\n' +
                                  '2. Set Notifications to "Allow"\n' +
                                  '3. Refresh the page';
                this.showToast(helpMessage.replace(/\n/g, ' '), 'warning', 10000);
                
                setTimeout(() => {
                    this.showToast('Click here for help enabling notifications', 'info', 8000);
                }, 2000);
                
            } else if (permission === 'granted') {
                console.log('Notifications already granted');
                this.permission = permission;
                
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

    showWorkCompletedNotification() {
        const title = 'Work Marked Complete';
        const options = {
            body: `Great job! You've earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || window.R_SERVICE_CONFIG?.INCREMENT_VALUE || 25} today.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'work-completed'
        };

        this.showNotification(title, options);
    }

    showPaymentNotification(amount) {
        const title = 'Payment Recorded';
        const options = {
            body: `Payment of ₹${amount} has been recorded successfully.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'payment-recorded'
        };

        this.showNotification(title, options);
    }

    showStreakNotification(streak) {
        const title = 'Streak Achievement!';
        const options = {
            body: `Amazing! You've worked ${streak} days in a row. Keep it up!`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'streak-achievement'
        };

        this.showNotification(title, options);
    }

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

    showToast(message, type = 'info', duration = 5000) {
        if (!this.toastContainer) {
            console.warn('Toast container not found');
            return;
        }

        const toast = this.createToastElement(message, type);
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });

        return toast;
    }

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

    clearAllToasts() {
        if (this.toastContainer) {
            const toasts = this.toastContainer.querySelectorAll('.toast');
            toasts.forEach(toast => this.removeToast(toast));
        }
    }

    showLoadingToast(message) {
        const toast = this.createLoadingToast(message);
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        return toast;
    }

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

            setTimeout(() => {
                this.removeToast(toast);
            }, 3000);
        }
    }

    showConfirmation(message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        if (modal && messageEl && yesBtn && noBtn) {
            messageEl.textContent = message;
            modal.classList.add('show');

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

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleNo();
                }
            });
        }
    }

    playSound(soundType) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
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
    
    playSoundType(soundType) {
        if (soundType === 'done') {
            // Premium work completion sound sequence
            this.playSuccessSound(); 
            setTimeout(() => this.playSystematicSound('success', 'high'), 300);
            setTimeout(() => this.playSystematicSound('success', 'low'), 600);
        } else if (soundType === 'paid') {
            // Ultra-premium payment sound sequence
            this.playPaymentSound();
            setTimeout(() => this.playSystematicSound('payment', 'high'), 800);
            setTimeout(() => this.playSystematicSound('payment', 'medium'), 1200);
        }
    }

    playSuccessSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.6, now);

            this.createPremiumCoinSound(ctx, masterGain, now);
            
            this.createSparkleEffect(ctx, masterGain, now + 0.15);
            
            this.createCompletionChord(ctx, masterGain, now + 0.3);
            
            this.createReverbTail(ctx, masterGain, now + 0.5);

            console.log('Premium achievement sound sequence played');
        } catch (error) {
            console.warn('Error playing premium success sound:', error);
        }
    }

    createPremiumCoinSound(ctx, masterGain, startTime) {
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

    playPaymentSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.createPremiumTransactionSound();
        } catch (error) {
            console.warn('Web Audio API not available, trying fallback sound');
            this.playSimpleTransactionSound();
        }
    }

    createPremiumTransactionSound() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
        
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
            
            this.createCardTapSound(ctx, masterGain, now);
            
            this.createProcessingSequence(ctx, masterGain, now + 0.15);
            
            this.createLuxurySuccessSound(ctx, masterGain, now + 0.45);
            
            this.createDigitalConfirmation(ctx, masterGain, now + 0.8);
            
            this.createPremiumFinish(ctx, masterGain, now + 1.1);

            console.log('Ultra-premium transaction sound sequence played');
        } catch (error) {
            console.warn('Error playing premium payment sound:', error);
        }
    }

    createCardTapSound(ctx, masterGain, startTime) {
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

    createProcessingSequence(ctx, masterGain, startTime) {
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

    createLuxurySuccessSound(ctx, masterGain, startTime) {
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

    createDigitalConfirmation(ctx, masterGain, startTime) {
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

    createPremiumFinish(ctx, masterGain, startTime) {
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

    playSimpleTransactionSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
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

    showDailyReminder() {
        const title = 'Daily Reminder';
        const options = {
            body: 'Don\'t forget to mark your work as done today!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'daily-reminder'
        };

        this.showNotification(title, options);
    }

    checkMilestones(stats) {
        if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
            this.showStreakNotification(stats.currentStreak);
        }

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

    testAllNotifications() {
        console.log('Testing all notification types...');
        
        this.showToast('Test Info Toast', 'info', 3000);
        setTimeout(() => this.showToast('Test Success Toast', 'success', 3000), 1000);
        setTimeout(() => this.showToast('Test Warning Toast', 'warning', 3000), 2000);
        setTimeout(() => this.showToast('Test Error Toast', 'error', 3000), 3000);
        
        setTimeout(() => {
            this.showNotification('Test Browser Notification', {
                body: 'This is a test browser notification',
                toastType: 'info',
                tag: 'test-notification'
            });
        }, 4000);
        
        setTimeout(() => this.showPaydayNotification(), 5000);
        setTimeout(() => this.showWorkCompletedNotification(), 6000);
        setTimeout(() => this.showStreakNotification(5), 7000);
        setTimeout(() => this.showAdvancePaymentNotification(), 8000);
        
        this.showToast('All notification tests scheduled! Check your browser and app.', 'success', 5000);
    }

    

    
    getAudioSettings() {
        return {
            baseFrequencies: {
                success: 523.25,   // C5 - Success actions
                payment: 659.25,   // E5 - Payment actions
                warning: 349.23,   // F4 - Warning/reminder
                error: 293.66,     // D4 - Error states
                info: 392.00,      // G4 - Information
                system: 440.00     // A4 - System events
            },
            
            harmonics: {
                major: [1, 1.25, 1.5],      // Major triad
                minor: [1, 1.2, 1.5],       // Minor triad
                seventh: [1, 1.25, 1.5, 1.75], // Major 7th
                notification: [1, 1.33, 2]   // Perfect fifth + octave
            },
            
            durations: {
                quick: 0.1,
                short: 0.2,
                medium: 0.4,
                long: 0.8,
                extended: 1.2
            },
            
            volumes: {
                subtle: 0.1,
                low: 0.2,
                medium: 0.4,
                high: 0.6,
                attention: 0.8
            }
        };
    }
    
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
            
            if (index > 0) {
                osc.frequency.setValueAtTime(baseFreq * ratio * (1 + Math.random() * 0.002 - 0.001), now);
            }
            
            gain.gain.setValueAtTime(1 / harmonicRatios.length, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.start(now);
            osc.stop(now + duration);
        });
    }
    
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

window.NotificationManager = NotificationManager;
console.log('[DEBUG] NotificationManager exported to window:', window.NotificationManager);

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
