class RServiceTracker {
    constructor() {
        this.db = null;
        this.notifications = null;
        this.charts = null;
        this.calendar = null;
        this.utils = null;
        
        this.currentStats = {};
        this.isInitialized = false;
        this.pendingUnpaidDates = [];
        this.selectedPaymentAmount = null;
        this.currentColor = 'blue';
        this.currentMode = 'light';
        this.updateDashboardTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing R-Service Tracker...');
            
            this.showLoadingScreen();
            
            this.utils = new Utils();
            
            this.db = new DatabaseManager();
            await this.db.init();
            
            if (typeof NotificationManager !== 'undefined') {
                    this.notifications = new NotificationManager();
                } else {
                    console.error('NotificationManager not available, retrying...');
                    setTimeout(() => {
                        if (typeof NotificationManager !== 'undefined') {
                            this.notifications = new NotificationManager();
                        }
                    }, 100);
                }
            this.notifications.setDatabase(this.db);
            
            this.charts = new ChartsManager(this.db);
            
            this.calendar = new CalendarManager(this.db);
            
            this.loadTheme();
            
            this.setupEventListeners();
            
            await this.loadInitialData();
            
            
            this.setupPWAInstall();
            
            
            this.hideLoadingScreen();
            
            await this.initializeViews();
            
            this.updateCurrentYear();
            
            this.isInitialized = true;
            
            this.verifyConfiguration();
            
            window.testNotifications = () => {
                if (this.notifications) {
                    this.notifications.testAllNotifications();
                } else {
                    console.error('Notifications not initialized');
                }
            };
            
            window.testAllSystems = async () => {
                console.log('[SYSTEM] Testing all R-Service Tracker systems...');
                
                try {
                                    console.log('[DATABASE] Testing database...');
                const stats = await this.db.getEarningsStats();
                console.log('[DATABASE] Database working - Current stats:', stats);
                
                console.log('[NOTIFICATIONS] Testing notifications...');
                this.notifications.testAllNotifications();
                
                console.log('[CHARTS] Testing charts...');
                if (this.charts) {
                    await this.charts.updateCharts();
                    console.log('[CHARTS] Charts system working');
                }
                
                console.log('[CALENDAR] Testing calendar...');
                if (this.calendar) {
                    this.calendar.render();
                    console.log('[CALENDAR] Calendar system working');
                }
                
                console.log('[UTILITIES] Testing utilities...');
                const testDate = this.utils.formatDate(new Date());
                console.log('[UTILITIES] Utilities working - Test date:', testDate);
                
                console.log('[PWA] Testing PWA features...');
                if ('serviceWorker' in navigator) {
                    console.log('[PWA] Service Worker supported');
                }
                
                    this.notifications.showToast('All systems tested successfully!', 'success', 5000);
                    
                } catch (error) {
                    console.error('[SYSTEM] System test failed:', error);
                    this.notifications.showToast('System test failed: ' + error.message, 'error', 5000);
                }
            };
            
            setTimeout(() => {
                this.checkAdvancePaymentNotification();
            }, 2000);
            
        } catch (error) {
            console.error('Error initializing application:', error);
            
            try {
                if (!window.R_SERVICE_CONFIG) {
                    window.R_SERVICE_CONFIG = {
                        DAILY_WAGE: 25,
                        PAYMENT_THRESHOLD: 4,
                        INCREMENT_VALUE: 25,
                        PAYMENT_DAY_DURATION: 4,
                        MAX_PAYMENT_AMOUNT: 500
                    };
                    console.log('Fallback configuration set');
                }
                
                if (!this.notifications) {
                    if (typeof NotificationManager !== 'undefined') {
                    this.notifications = new NotificationManager();
                } else {
                    console.error('NotificationManager not available, retrying...');
                    setTimeout(() => {
                        if (typeof NotificationManager !== 'undefined') {
                            this.notifications = new NotificationManager();
                        }
                    }, 100);
                }
                }
                
                this.hideLoadingScreen();
                this.showError('Application initialized with limited functionality. Some features may not work properly.');
                
            } catch (criticalError) {
                console.error('Critical initialization error:', criticalError);
                this.hideLoadingScreen();
                this.showError('Critical error: Please refresh the page');
            }
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        } else {
            console.warn('Loading screen element not found');
        }
        
        if (mainContainer) {
            mainContainer.style.display = 'none';
        } else {
            console.warn('Main container element not found');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (mainContainer) {
                        mainContainer.style.display = 'block';
                        mainContainer.classList.add('animate-fade-scale');
                        
                        const cards = document.querySelectorAll('.card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                if (index === 0) {
                                    card.classList.add('animate-slide-left');
                                } else if (index === 1) {
                                    card.classList.add('animate-rotate-in');
                                } else {
                                    card.classList.add('animate-slide-right');
                                }
                            }, index * 150);
                        });
                        
                        setTimeout(() => {
                            const logo = document.querySelector('.logo i');
                            if (logo) {
                                logo.classList.add('animate-float');
                            }
                        }, 1000);
                    }
                }, 500);
            } else if (mainContainer) {
                mainContainer.style.display = 'block';
                mainContainer.classList.add('animate-fade-scale');
            }
        }, 2000); // Show loading for 2 seconds
    }

    loadTheme() {
        this.currentColor = localStorage.getItem('selected-color') || 'blue';
        this.currentMode = localStorage.getItem('selected-mode') || 'light';
        
        this.updateColorSelection(this.currentColor);
        this.updateModeSelection(this.currentMode);
        
        this.applyTheme();
    }

    updateColorSelection(color) {
        this.currentColor = color;
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === color) {
                btn.classList.add('active');
            }
        });
        localStorage.setItem('selected-color', color);
    }

    updateModeSelection(mode) {
        this.currentMode = mode;
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        localStorage.setItem('selected-mode', mode);
    }

    applyTheme() {
        const theme = `${this.currentColor}-${this.currentMode}`;
        this.utils.setTheme(theme);
        if (this.charts) {
            this.charts.updateCharts(); // Update charts with new theme colors
        }
    }

    setupEventListeners() {
        const doneBtn = document.getElementById('doneBtn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => this.handleDoneClick());
        }

        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.addEventListener('click', () => this.handlePaidClick());
        }

        const menuToggle = document.getElementById('menuToggle');
        const sideMenu = document.getElementById('sideMenu');
        const closeMenu = document.getElementById('closeMenu');
        
        if (menuToggle && sideMenu) {
            menuToggle.addEventListener('click', () => {
                sideMenu.classList.add('open');
            });
        }
        
        if (closeMenu && sideMenu) {
            closeMenu.addEventListener('click', () => {
                sideMenu.classList.remove('open');
            });
        }

        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.updateColorSelection(color);
                this.applyTheme();
            });
        });

        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.updateModeSelection(mode);
                this.applyTheme();
            });
        });

        this.setupMenuOptions();
        
        this.setupQuickActions();
        
        this.setupViewNavigation();
        
        this.setupModalHandlers();

        document.addEventListener('click', (e) => {
            if (sideMenu && !sideMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                sideMenu.classList.remove('open');
            }
        });
    }

    closeMenu() {
        const sideMenu = document.getElementById('sideMenu');
        if (sideMenu) {
            sideMenu.classList.remove('open');
        }
    }

    setupMenuOptions() {
        const clearDataBtn = document.getElementById('clearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.handleClearData());
        }

        const exportPDFBtn = document.getElementById('exportPDF');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => {
                this.closeMenu();
                this.handleExportPDF();
            });
        }

        const aboutBtn = document.getElementById('aboutApp');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => this.showAboutModal());
        }

        const viewHistoryBtn = document.getElementById('viewHistory');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showBalanceSheet();
            });
        }

        const viewAnalyticsBtn = document.getElementById('viewAnalytics');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showAnalytics();
            });
        }

        this.setupSettingsHandlers();
    }

    setupSettingsHandlers() {
        try {
            const settingsSection = document.querySelector('.menu-section .settings-group');
            if (!settingsSection) {
                console.warn('Settings section not found, skipping settings handlers');
                return;
            }

            this.loadSettings();
            this.storeOriginalSettings();

            const saveSettingsBtn = document.getElementById('saveSettings');
            if (saveSettingsBtn) {
                this.disableSaveButton();
                
                saveSettingsBtn.addEventListener('click', (e) => {
                    if (saveSettingsBtn.disabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    this.saveSettings();
                });
            }

            const resetSettingsBtn = document.getElementById('resetSettings');
            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', () => this.resetSettings());
            }

            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            [incrementInput, durationInput, maxPaymentInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        this.validateSettings();
                        this.checkForChanges();
                    });
                }
            });

            this.setupNotificationHandlers();
            
            console.log('Settings handlers setup completed');
        } catch (error) {
            console.error('Error setting up settings handlers:', error);
        }
    }

    setupNotificationHandlers() {
        try {
            this.loadNotificationSettings();

            const enableNotificationsToggle = document.getElementById('enableNotifications');
            if (enableNotificationsToggle) {
                enableNotificationsToggle.addEventListener('change', () => {
                    this.toggleNotificationSettings(enableNotificationsToggle.checked);
                    this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
                    this.checkForNotificationChanges();
                });
                
                this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
            }

            const paymentReminderTime = document.getElementById('paymentReminderTime');
            if (paymentReminderTime) {
                paymentReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            const workReminderTime = document.getElementById('workReminderTime');
            if (workReminderTime) {
                workReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            const saveNotificationBtn = document.getElementById('saveNotificationSettings');
            if (saveNotificationBtn) {
                saveNotificationBtn.addEventListener('click', () => {
                    this.saveNotificationSettings();
                });
            }

            const testNotificationsBtn = document.getElementById('testNotifications');
            if (testNotificationsBtn) {
                testNotificationsBtn.addEventListener('click', () => {
                    this.testNotifications();
                });
            }

            this.toggleNotificationSettings(enableNotificationsToggle?.checked ?? true);

            console.log('Notification handlers setup completed');
        } catch (error) {
            console.error('Error setting up notification handlers:', error);
        }
    }

    toggleNotificationSettings(enabled) {
        const notificationSettings = document.getElementById('notificationSettings');
        const workReminderSettings = document.getElementById('workReminderSettings');
        
        if (notificationSettings) {
            if (enabled) {
                notificationSettings.classList.remove('disabled');
            } else {
                notificationSettings.classList.add('disabled');
            }
        }
        
        if (workReminderSettings) {
            if (enabled) {
                workReminderSettings.classList.remove('disabled');
            } else {
                workReminderSettings.classList.add('disabled');
            }
        }
    }

    updateNotificationToggleIcon(enabled) {
        const icon = document.getElementById('notificationToggleIcon');
        if (icon) {
            if (enabled) {
                icon.className = 'fas fa-bell';
            } else {
                icon.className = 'fas fa-bell-slash';
            }
        }
    }

    loadNotificationSettings() {
        try {
            const config = this.getCurrentConfig();
            
            const enableNotifications = document.getElementById('enableNotifications');
            const paymentReminderTime = document.getElementById('paymentReminderTime');
            const workReminderTime = document.getElementById('workReminderTime');

            if (enableNotifications) {
                enableNotifications.checked = config.NOTIFICATIONS_ENABLED !== false;
                this.updateNotificationToggleIcon(enableNotifications.checked);
            }
            
            if (paymentReminderTime) {
                paymentReminderTime.value = config.PAYMENT_REMINDER_TIME || '10:00';
            }
            
            if (workReminderTime) {
                workReminderTime.value = config.WORK_REMINDER_TIME || '18:00';
            }

            this.originalNotificationSettings = {
                NOTIFICATIONS_ENABLED: config.NOTIFICATIONS_ENABLED !== false,
                PAYMENT_REMINDER_TIME: config.PAYMENT_REMINDER_TIME || '10:00',
                WORK_REMINDER_TIME: config.WORK_REMINDER_TIME || '18:00'
            };

            this.disableNotificationSaveButton();

            console.log('Notification settings loaded:', this.originalNotificationSettings);
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    checkForNotificationChanges() {
        if (!this.originalNotificationSettings) return;

        const enableNotifications = document.getElementById('enableNotifications');
        const paymentReminderTime = document.getElementById('paymentReminderTime');
        const workReminderTime = document.getElementById('workReminderTime');

        const currentEnabled = enableNotifications?.checked ?? true;
        const currentPaymentTime = paymentReminderTime?.value || '10:00';
        const currentWorkTime = workReminderTime?.value || '18:00';

        const hasChanges = (
            currentEnabled !== this.originalNotificationSettings.NOTIFICATIONS_ENABLED ||
            currentPaymentTime !== this.originalNotificationSettings.PAYMENT_REMINDER_TIME ||
            currentWorkTime !== this.originalNotificationSettings.WORK_REMINDER_TIME
        );

        if (hasChanges) {
            this.enableNotificationSaveButton();
        } else {
            this.disableNotificationSaveButton();
        }
    }

    enableNotificationSaveButton() {
        const saveBtn = document.getElementById('saveNotificationSettings');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.classList.remove('disabled');
            saveBtn.classList.add('changes-pending');
            saveBtn.classList.add('changes-pending');
        }
    }

    disableNotificationSaveButton() {
        const saveBtn = document.getElementById('saveNotificationSettings');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.classList.add('disabled');
        }
    }

    saveNotificationSettings() {
        try {
            const enableNotifications = document.getElementById('enableNotifications');
            const paymentReminderTime = document.getElementById('paymentReminderTime');
            const workReminderTime = document.getElementById('workReminderTime');

            const newNotificationConfig = {
                NOTIFICATIONS_ENABLED: enableNotifications?.checked ?? true,
                PAYMENT_REMINDER_TIME: paymentReminderTime?.value || '10:00',
                WORK_REMINDER_TIME: workReminderTime?.value || '18:00'
            };

            let saved = false;
            if (window.ConfigManager && typeof window.ConfigManager.saveUserConfig === 'function') {
                saved = window.ConfigManager.saveUserConfig(newNotificationConfig);
            } else {
                try {
                    const currentConfig = JSON.parse(localStorage.getItem('r-service-user-config') || '{}');
                    const updatedConfig = { ...currentConfig, ...newNotificationConfig };
                    localStorage.setItem('r-service-user-config', JSON.stringify(updatedConfig));
                    window.R_SERVICE_CONFIG = { ...window.R_SERVICE_CONFIG, ...newNotificationConfig };
                    saved = true;
                } catch (e) {
                    console.error('Fallback notification save failed:', e);
                }
            }

            if (saved) {
                if (this.notifications) {
                    this.notifications.showToast('Notification settings saved successfully!', 'success');
                    
                    this.notifications.scheduleReminders();
                }
                
                this.originalNotificationSettings = { ...newNotificationConfig };
                this.disableNotificationSaveButton();
                
                console.log('Notification settings saved:', newNotificationConfig);
            } else {
                if (this.notifications) {
                    this.notifications.showToast('Error saving notification settings', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
            if (this.notifications) {
                this.notifications.showToast('Error saving notification settings: ' + error.message, 'error');
            }
        }
    }

    testNotifications() {
        if (this.notifications) {
            this.notifications.testAllNotifications();
            this.notifications.showToast('Test notifications sent! Check if you received them.', 'info', 5000);
        } else {
            console.error('Notifications not available');
        }
    }

    storeOriginalSettings() {
        const config = this.getCurrentConfig();
        this.originalSettings = {
            INCREMENT_VALUE: config.INCREMENT_VALUE || 25,
            PAYMENT_DAY_DURATION: config.PAYMENT_DAY_DURATION || 4,
            MAX_PAYMENT_AMOUNT: config.MAX_PAYMENT_AMOUNT || 500
        };
        console.log('Original settings stored:', this.originalSettings);
    }

    checkForChanges() {
        if (!this.originalSettings) return;

        const incrementInput = document.getElementById('incrementValue');
        const durationInput = document.getElementById('paymentDuration');
        const maxPaymentInput = document.getElementById('maxPaymentAmount');

        const currentIncrement = parseInt(incrementInput?.value) || this.originalSettings.INCREMENT_VALUE;
        const currentDuration = parseInt(durationInput?.value) || this.originalSettings.PAYMENT_DAY_DURATION;
        const currentMaxPayment = parseInt(maxPaymentInput?.value) || this.originalSettings.MAX_PAYMENT_AMOUNT;

        const hasChanges = (
            currentIncrement !== this.originalSettings.INCREMENT_VALUE ||
            currentDuration !== this.originalSettings.PAYMENT_DAY_DURATION ||
            currentMaxPayment !== this.originalSettings.MAX_PAYMENT_AMOUNT
        );

        const isValid = this.validateSettings();

        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            if (hasChanges && isValid) {
                this.enableSaveButton();
            } else {
                this.disableSaveButton();
            }
        }
    }

    enableSaveButton() {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.classList.remove('disabled');
            saveBtn.classList.add('changes-pending');
            saveBtn.classList.add('changes-pending');
        }
    }

    disableSaveButton() {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.classList.add('disabled');
        }
    }

    getCurrentConfig() {
        let config = {};
        if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
            config = window.ConfigManager.getConfig();
        } else if (window.R_SERVICE_CONFIG) {
            config = window.R_SERVICE_CONFIG;
        } else {
            config = {
                INCREMENT_VALUE: 25,
                PAYMENT_DAY_DURATION: 4,
                MAX_PAYMENT_AMOUNT: 500
            };
        }
        return config;
    }

    loadSettings() {
        try {
            let config = {};
            if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
                config = window.ConfigManager.getConfig();
            } else if (window.R_SERVICE_CONFIG) {
                config = window.R_SERVICE_CONFIG;
            } else {
                config = {
                    INCREMENT_VALUE: 25,
                    PAYMENT_DAY_DURATION: 4,
                    MAX_PAYMENT_AMOUNT: 1000
                };
                console.warn('Using fallback configuration');
            }
            
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = config.INCREMENT_VALUE || 25;
            if (durationInput) durationInput.value = config.PAYMENT_DAY_DURATION || 4;
            if (maxPaymentInput) maxPaymentInput.value = config.MAX_PAYMENT_AMOUNT || 1000;
            
        } catch (error) {
            console.error('Error loading settings:', error);
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = 25;
            if (durationInput) durationInput.value = 4;
            if (maxPaymentInput) maxPaymentInput.value = 1000;
        }
    }

    validateSettings() {
        const incrementInput = document.getElementById('incrementValue');
        const durationInput = document.getElementById('paymentDuration');
        const maxPaymentInput = document.getElementById('maxPaymentAmount');
        const saveBtn = document.getElementById('saveSettings');

        let isValid = true;

        [incrementInput, durationInput, maxPaymentInput].forEach(input => {
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }
        });

        document.querySelectorAll('.validation-error').forEach(el => el.remove());

        if (incrementInput) {
            const increment = parseInt(incrementInput.value);
            
            if (isNaN(increment) || increment < 1) {
                this.showValidationError(incrementInput, 'Must be at least 1');
                isValid = false;
            } else if (increment > 100) {
                this.showValidationError(incrementInput, 'Cannot exceed 100');
                isValid = false;
            }
        }

        if (durationInput) {
            const duration = parseInt(durationInput.value);
            
            if (isNaN(duration) || duration < 1) {
                this.showValidationError(durationInput, 'Must be at least 1 day');
                isValid = false;
            } else if (duration > 30) {
                this.showValidationError(durationInput, 'Cannot exceed 30 days');
                isValid = false;
            }
        }

        if (maxPaymentInput) {
            const maxPayment = parseInt(maxPaymentInput.value);
            
            if (isNaN(maxPayment) || maxPayment < 100) {
                this.showValidationError(maxPaymentInput, 'Must be at least ₹100');
                isValid = false;
            } else if (maxPayment > 50000) {
                this.showValidationError(maxPaymentInput, 'Cannot exceed ₹50,000');
                isValid = false;
            }
        }

        if (saveBtn) {
            saveBtn.disabled = !isValid;
            saveBtn.style.opacity = isValid ? '1' : '0.5';
        }

        return isValid;
    }

    showValidationError(input, message) {
        input.classList.add('error');
        
        input.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        
        if ('vibrate' in navigator) {
            navigator.vibrate([50]); // Single gentle vibration
        }
        
        let contextualMessage = message;
        const fieldId = input.id;
        const currentValue = input.value;
        
        if (fieldId === 'incrementValue') {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 100;
            if (currentValue < min) {
                contextualMessage = `Daily wage must be at least ₹${min}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (currentValue > max) {
                contextualMessage = `Daily wage cannot exceed ₹${max}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (!currentValue) {
                contextualMessage = `Please enter your daily wage amount (₹${min}-₹${max}).`;
            }
        } else if (fieldId === 'paymentDuration') {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 30;
            if (currentValue < min) {
                contextualMessage = `Payment period must be at least ${min} day. Enter a value between ${min} and ${max} days.`;
            } else if (currentValue > max) {
                contextualMessage = `Payment period cannot exceed ${max} days. Enter a value between ${min} and ${max} days.`;
            } else if (!currentValue) {
                contextualMessage = `Please enter how often you want to collect payments (${min}-${max} days).`;
            }
        } else if (fieldId === 'maxPaymentAmount') {
            const min = parseInt(input.min) || 100;
            const max = parseInt(input.max) || 10000;
            if (currentValue < min) {
                contextualMessage = `Maximum amount must be at least ₹${min}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (currentValue > max) {
                contextualMessage = `Maximum amount cannot exceed ₹${max}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (!currentValue) {
                contextualMessage = `Please set your maximum payment limit (₹${min}-₹${max}).`;
            }
        } else if (fieldId === 'customAmount') {
            if (currentValue <= 0) {
                contextualMessage = `Please enter a valid payment amount greater than ₹0.`;
            } else if (currentValue > 10000) {
                contextualMessage = `Payment amount cannot exceed ₹10,000. Please enter a smaller amount.`;
            }
        }
        
        const errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        errorEl.textContent = contextualMessage;
        input.parentElement.appendChild(errorEl);
    }

    saveSettings() {
        try {
            if (!this.validateSettings()) {
                if (this.notifications) {
                    this.notifications.showToast('Please fix the validation errors before saving', 'error');
                }
                return;
            }

            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (!incrementInput || !durationInput || !maxPaymentInput) {
                console.error('Settings input elements not found');
                if (this.notifications) {
                    this.notifications.showToast('Error: Settings form not available', 'error');
                }
                return;
            }

            const newConfig = {
                INCREMENT_VALUE: parseInt(incrementInput.value) || 25,
                PAYMENT_DAY_DURATION: parseInt(durationInput.value) || 4,
                MAX_PAYMENT_AMOUNT: parseInt(maxPaymentInput.value) || 1000
            };

            newConfig.DAILY_WAGE = newConfig.INCREMENT_VALUE;
            newConfig.PAYMENT_THRESHOLD = newConfig.PAYMENT_DAY_DURATION;

            let saved = false;
            if (window.ConfigManager && typeof window.ConfigManager.saveUserConfig === 'function') {
                saved = window.ConfigManager.saveUserConfig(newConfig);
            } else {
                try {
                    localStorage.setItem('r-service-user-config', JSON.stringify(newConfig));
                    window.R_SERVICE_CONFIG = { ...window.R_SERVICE_CONFIG, ...newConfig };
                    saved = true;
                } catch (e) {
                    console.error('Fallback save failed:', e);
                }
            }

            if (saved) {
                if (this.notifications) {
                    this.notifications.showToast('Settings saved successfully!', 'success');
                }
                
                this.storeOriginalSettings();
                this.disableSaveButton();
                
                const loadingToast = this.notifications ? this.notifications.showLoadingToast('Updating payment options and resetting saved amounts...') : null;
                
                setTimeout(async () => {
                    try {
                        if (this.db) {
                            console.log('Resetting all saved amount details...');
                            
                            await this.db.performTransaction(this.db.stores.workRecords, 'readwrite', (store) => {
                                return store.clear();
                            });
                            
                            await this.db.performTransaction(this.db.stores.payments, 'readwrite', (store) => {
                                return store.clear();
                            });
                            
                            console.log('All saved amount details have been reset');
                            
                            if (this.notifications) {
                                this.notifications.showToast('All saved amount details reset! Starting fresh with new settings.', 'info', 5000);
                            }
                        }
                        
                        this.generatePaymentButtons();
                        
                        if (typeof this.updateDashboard === 'function') {
                            this.updateDashboard();
                        }
                        
                        this.updatePaymentPeriodDisplay(newConfig.PAYMENT_DAY_DURATION);
                        
                        if (loadingToast && this.notifications) {
                            this.notifications.updateLoadingToast(loadingToast, 'System reset and updated!', 'success');
                        }
                        
                        if (this.notifications) {
                            this.notifications.showToast(`Configuration updated! Payment options: ${this.getGeneratedAmountPreview()}`, 'success', 6000);
                        }
                        
                    } catch (resetError) {
                        console.error('Error resetting saved amounts:', resetError);
                        if (this.notifications) {
                            this.notifications.showToast('Settings saved but failed to reset data. Please clear data manually if needed.', 'warning', 8000);
                        }
                    }
                    
                    this.closeMenu();
                }, 500);
                
            } else {
                if (this.notifications) {
                    this.notifications.showToast('Error saving settings', 'error');
                }
            }
        } catch (error) {
            console.error('Error in saveSettings:', error);
            if (this.notifications) {
                this.notifications.showToast('Error saving settings: ' + error.message, 'error');
            }
        }
    }

    updateCurrentYear() {
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }
    }

    updatePaymentPeriodDisplay(days) {
        const progressToPaydayEl = document.querySelector('.progress-to-payday, .payday-progress');
        if (progressToPaydayEl) {
            const currentProgress = parseInt(progressToPaydayEl.textContent.split('/')[0]) || 0;
            progressToPaydayEl.textContent = `${currentProgress}/${days}`;
        }

        document.querySelectorAll('[data-payment-period]').forEach(el => {
            el.textContent = el.textContent.replace(/\d+ days?/, `${days} day${days > 1 ? 's' : ''}`);
        });

    }

    getGeneratedAmountPreview() {
        const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        const amounts = window.ConfigManager ? window.ConfigManager.generatePaymentAmounts() : [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4];
        const preview = amounts.slice(0, 5).map(amt => `₹${amt}`).join(', ');
        return amounts.length > 5 ? `${preview}...` : preview;
    }

    resetSettings() {
        this.notifications.showConfirmation(
            'Are you sure you want to reset all settings to default values?\n\nThis will:\n• Set daily wage to ₹25\n• Set payment period to 4 days\n• Set maximum amount to ₹1000\n• Regenerate payment options',
            () => {
                try {
                    if (window.ConfigManager) {
                        window.ConfigManager.resetToDefaults();
                        this.loadSettings();
                        
                        const loadingToast = this.notifications.showLoadingToast('Resetting to defaults...');
                        
                        setTimeout(() => {
                            this.generatePaymentButtons();
                            this.updateDashboard();
                            this.updatePaymentPeriodDisplay(4);
                            
                            document.querySelectorAll('.validation-error, .validation-warning, .validation-success, .validation-summary').forEach(el => el.remove());
                            
                            document.querySelectorAll('.settings-input').forEach(input => {
                                input.classList.remove('error', 'warning', 'success');
                                input.style.borderColor = '';
                                input.style.boxShadow = '';
                            });
                            
                            if (loadingToast) {
                                this.notifications.updateLoadingToast(loadingToast, 'Settings reset to defaults!', 'success');
                            }
                            
                            this.notifications.showToast('All settings reset to default values', 'success', 5000);
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error resetting settings:', error);
                    this.notifications.showToast('Error resetting settings: ' + error.message, 'error');
                }
            }
        );
    }

    setupQuickActions() {
        const balanceSheetBtn = document.getElementById('viewBalanceSheet');
        if (balanceSheetBtn) {
            balanceSheetBtn.addEventListener('click', () => this.showBalanceSheet());
        }

        const calendarBtn = document.getElementById('viewCalendar');
        if (calendarBtn) {
            calendarBtn.addEventListener('click', () => this.showCalendar());
        }

        const chartsBtn = document.getElementById('viewCharts');
        if (chartsBtn) {
            chartsBtn.addEventListener('click', () => this.showAnalytics());
        }

        const streakBtn = document.getElementById('dailyStreak');
        if (streakBtn) {
            streakBtn.addEventListener('click', () => this.showStreakInfo());
        }
    }

    setupViewNavigation() {
        const closeButtons = {
            'closeBalanceSheet': 'balanceSheetView',
            'closeAnalytics': 'analyticsView',
            'closeCalendar': 'calendarView'
        };

        Object.entries(closeButtons).forEach(([buttonId, viewId]) => {
            const button = document.getElementById(buttonId);
            const view = document.getElementById(viewId);
            
            if (button && view) {
                button.addEventListener('click', () => {
                    this.closeCurrentView(view);
                });
            }
        });
    }

    setupModalHandlers() {
        const aboutModal = document.getElementById('aboutModal');
        const closeModalBtns = document.querySelectorAll('.close-modal');
        
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (aboutModal) aboutModal.classList.remove('show');
            });
        });

        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.remove('show');
                }
            });
        }
    }

    closeCurrentView(view) {
        try {
            const allViews = ['balanceSheetView', 'analyticsView', 'calendarView'];
            allViews.forEach(viewId => {
                const viewElement = document.getElementById(viewId);
                if (viewElement) {
                    viewElement.style.display = 'none';
                    viewElement.style.opacity = '1';
                    viewElement.style.transform = 'translateY(0)';
                }
            });

            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
                
                dashboard.classList.remove('animate-fade-scale', 'animate-slide-up', 'animate-bounce-in');
                
                setTimeout(() => {
                    dashboard.classList.add('animate-fade-scale');
                }, 50);
            }
        } catch (error) {
            console.error('Error closing view:', error);
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
            }
        }
    }

    async loadInitialData() {
        try {
            this.currentStats = await this.db.getEarningsStats();
            
            this.updateDashboard();
            
            await this.checkPendingPayments();
            
            this.updateTodayStatus();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    updateDashboard() {
        if (this.updateDashboardTimeout) {
            clearTimeout(this.updateDashboardTimeout);
        }
        
        this.updateDashboardTimeout = setTimeout(() => {
            this._performDashboardUpdate();
        }, 50);
    }

    _performDashboardUpdate() {
        const dashboardCards = document.querySelectorAll('.card');
        dashboardCards.forEach(card => {
            card.style.animation = 'fadeInUp 0.5s ease-out';
        });

        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = this.utils.formatDate(new Date());
        }

        const currentEarningsEl = document.getElementById('currentEarnings');
        const daysWorkedEl = document.getElementById('daysWorked');
        const totalEarnedEl = document.getElementById('totalEarned');
        const progressTextEl = document.getElementById('progressText');
        const progressFillEl = document.getElementById('progressFill');
        const streakCountEl = document.getElementById('streakCount');

        if (currentEarningsEl) {
            const currentBalance = this.currentStats?.currentBalance || 0;
            this.utils.animateNumber(currentEarningsEl, 0, currentBalance, 1500);
        }
        
        if (daysWorkedEl) {
            const totalWorked = this.currentStats?.totalWorked || 0;
            this.utils.animateValue(daysWorkedEl, 0, totalWorked, 1000);
        }
        
        if (totalEarnedEl) {
            const totalEarned = this.currentStats?.totalEarned || 0;
            this.utils.animateNumber(totalEarnedEl, 0, totalEarned, 2000);
        }
        
        if (progressTextEl) {
            const progress = this.currentStats?.progressToPayday || 0;
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
        }
        
        if (progressFillEl) {
            const progress = this.currentStats?.progressToPayday || 0;
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            const progressPercent = (progress / paymentThreshold) * 100;
            progressFillEl.style.width = `${progressPercent}%`;
        }
        
        this.updateProgressBar(progressTextEl, progressFillEl);
        
        if (streakCountEl) {
            const currentStreak = this.currentStats?.currentStreak || 0;
            this.utils.animateValue(streakCountEl, 0, currentStreak, 1200);
        }
    }

    async updateProgressBar(progressTextEl, progressFillEl) {
        try {
            const progressLabelEl = document.getElementById('progressLabel');
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            console.log('Progress bar update - advance status:', advanceStatus);
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                
                const safeWorkCompleted = workCompleted || 0;
                const safeWorkRequired = workRequired || 1; // Avoid division by zero
                
                const progressPercent = Math.min((safeWorkCompleted / safeWorkRequired) * 100, 100);
                console.log('Advance progress:', { workCompleted: safeWorkCompleted, workRequired: safeWorkRequired, progressPercent });
                
                if (progressLabelEl) {
                    progressLabelEl.textContent = `Advance Payment Progress (₹${advanceStatus.totalAdvanceAmount} paid)`;
                }
                if (progressTextEl) {
                    progressTextEl.textContent = `${safeWorkCompleted}/${safeWorkRequired} days`;
                }
                
                if (progressFillEl) {
                    let finalPercent;
                    if (safeWorkCompleted === 0) {
                        finalPercent = 0; // Empty if no work done
                    } else if (safeWorkCompleted >= safeWorkRequired) {
                        finalPercent = 100; // Full if work is complete or more
                    } else {
                        finalPercent = Math.max(progressPercent, 10); // Minimum 10% visibility when work is started
                    }
                    
                    progressFillEl.style.width = `${finalPercent}%`;
                    progressFillEl.style.backgroundColor = safeWorkCompleted >= safeWorkRequired ? 'var(--success)' : 'var(--warning)';
                }
            } else if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance === 0) {
                if (progressLabelEl) {
                    progressLabelEl.textContent = 'Advance Completed';
                }
                if (progressTextEl) {
                    progressTextEl.textContent = 'All advance work completed';
                }
                if (progressFillEl) {
                    progressFillEl.style.width = '100%';
                    progressFillEl.style.backgroundColor = 'var(--success)'; // Green when complete
                }
            } else {
                if (progressLabelEl) {
                    progressLabelEl.textContent = 'Progress to Payday';
                }
                if (progressTextEl) {
                    const progress = this.currentStats?.progressToPayday || 0;
                    const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                    progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
                }
                
                if (progressFillEl) {
                    const progress = this.currentStats?.progressToPayday || 0;
                    const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                    const progressPercent = (progress / paymentThreshold) * 100;
                    progressFillEl.style.width = `${progressPercent}%`;
                    progressFillEl.style.backgroundColor = 'var(--primary)'; // Normal color
                }
            }
        } catch (error) {
            console.error('Error updating progress bar:', error);
            if (progressTextEl) {
                const progress = this.currentStats?.progressToPayday || 0;
                const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
            }
            
            if (progressFillEl) {
                const progress = this.currentStats?.progressToPayday || 0;
                const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                const progressPercent = (progress / paymentThreshold) * 100;
                progressFillEl.style.width = `${progressPercent}%`;
                progressFillEl.style.backgroundColor = 'var(--primary)';
            }
        }
    }

    async updateTodayStatus() {
        const today = this.utils.getTodayString();
        const todayRecord = await this.db.getWorkRecord(today);
        
        const workStatusEl = document.getElementById('workStatus');
        const doneBtnEl = document.getElementById('doneBtn');
        
        if (todayRecord && todayRecord.status === 'completed') {
            if (workStatusEl) {
                workStatusEl.className = 'status-badge completed';
                workStatusEl.innerHTML = '<i class="fas fa-check"></i> Work Completed';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = true;
                
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Already Done';
            }
        } else {
            if (workStatusEl) {
                workStatusEl.className = 'status-badge pending';
                workStatusEl.innerHTML = '<i class="fas fa-clock"></i> Not Started';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = false;
                
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Mark as Done';
            }
        }
        
        await this.updatePaidButtonVisibility();
    }

    async checkPendingPayments() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        
        const unpaidRecords = workRecords.filter(record => 
            record.status === 'completed' && !this.isRecordPaid(record, payments)
        );
        
        const previousUnpaidCount = this.pendingUnpaidDates.length;
        this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
        
        if (this.pendingUnpaidDates.length > 0) {
            this.showPaidButton();
            
            if (this.pendingUnpaidDates.length % 4 === 0 && previousUnpaidCount % 4 !== 0) {
                console.log('Payday reached! Showing notification and playing sound');
                this.notifications.showPaydayNotification();
                this.notifications.playSound('paid');
            }
        } else {
            this.hidePaidButton();
        }
    }

    async updatePaidButtonVisibility() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            await this.updatePendingUnpaidDates();
            
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            const shouldShowPaidBtn = this.pendingUnpaidDates.length >= paymentThreshold || 
                                    (this.pendingUnpaidDates.length > 0 && advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0);
            
            if (shouldShowPaidBtn) {
                paidBtn.style.display = 'inline-flex';
            } else {
                paidBtn.style.display = 'none';
            }
        }
    }

    showPaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'inline-flex';
            paidBtn.style.animation = 'payoutButtonAppear 0.8s ease-in-out';
            
            paidBtn.classList.add('payday-ready');
        }
    }

    hidePaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'none';
            paidBtn.classList.remove('payday-ready');
        }
    }

    async handleDoneClick() {
        try {
            const today = this.utils.getTodayString();
            const doneBtn = document.getElementById('doneBtn');
            if (doneBtn) {
                doneBtn.disabled = true;
                doneBtn.innerHTML = '<i class="fas fa-check"></i> Already Done';
                
            }
            console.log('Marking work as done for date:', today);
            
            const existingRecord = await this.db.getWorkRecord(today);
            if (existingRecord && existingRecord.status === 'completed') {
                this.notifications.showToast('Work already marked as done for today!', 'warning');
                return;
            }
            
            const result = await this.db.addWorkRecord(today, window.R_SERVICE_CONFIG?.DAILY_WAGE || 25, 'completed');
            
            
            this.notifications.playSound('done');
            
            this.notifications.showWorkCompletedNotification();
            this.notifications.showToast(`Great job! You earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} today`, 'success');
            
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            this.updateTodayStatus();
            
            this.notifications.checkMilestones(this.currentStats);
            
            await this.charts.updateCharts();
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
            
            await this.checkPendingPayments();
            
        } catch (error) {
            console.error('Error marking work as done:', error);
            this.notifications.showToast('Error marking work as done. Please try again.', 'error');
        }
    }

    async handlePaidClick() {
        try {
            if (this.pendingUnpaidDates.length === 0) {
                this.notifications.showToast('No unpaid work to record payment for', 'warning');
                return;
            }
            
            this.showPaymentModal();
            
        } catch (error) {
            console.error('Error opening payment modal:', error);
            this.notifications.showToast('Error opening payment selection', 'error');
        }
    }

    async updatePendingUnpaidDates() {
        try {
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            const unpaidRecords = workRecords.filter(record => 
                record.status === 'completed' && !this.isRecordPaid(record, payments)
            );
            
            this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
            console.log('Updated pending dates:', this.pendingUnpaidDates);
        } catch (error) {
            console.error('Error updating pending dates:', error);
        }
    }

    async showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const unpaidDaysEl = document.getElementById('unpaidDaysCount');
        const pendingAmountEl = document.getElementById('pendingAmount');
        
        if (modal && unpaidDaysEl && pendingAmountEl) {
            await this.updatePendingUnpaidDates();
            
            const pendingAmount = this.pendingUnpaidDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
            unpaidDaysEl.textContent = this.pendingUnpaidDates.length;
            pendingAmountEl.textContent = pendingAmount;
            
            console.log('Payment modal - Unpaid days:', this.pendingUnpaidDates.length, 'Pending amount:', pendingAmount);
            
            modal.classList.add('show');
            this.setupPaymentModalHandlers();
        }
    }

    generatePaymentButtons() {
        const container = document.getElementById('paymentButtons');
        if (!container) {
            console.warn('Payment buttons container not found');
            return;
        }

        try {
            container.innerHTML = '';

            let amounts = [];
            if (window.ConfigManager && typeof window.ConfigManager.generatePaymentAmounts === 'function') {
                amounts = window.ConfigManager.generatePaymentAmounts();
            } else {
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 1000];
                console.warn('Using fallback payment amounts based on daily wage:', dailyWage);
            }
            
            if (!Array.isArray(amounts) || amounts.length === 0) {
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 1000];
            }
            
            amounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                button.textContent = `₹${amount}`;
                container.appendChild(button);
            });

            console.log(`Generated ${amounts.length} payment buttons with amounts:`, amounts);
        } catch (error) {
            console.error('Error generating payment buttons:', error);
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const fallbackAmounts = [dailyWage, dailyWage*2, dailyWage*4, dailyWage*8, dailyWage*20, 1000];
            fallbackAmounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                button.textContent = `₹${amount}`;
                container.appendChild(button);
            });
        }
    }

    setupPaymentModalHandlers() {
        const modal = document.getElementById('paymentModal');
        const closeBtn = document.getElementById('closePaymentModal');
        
        this.generatePaymentButtons();

        const closeModal = () => {
            this.notifications.playCloseSound();
            modal.classList.remove('show');
            document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
            this.selectedPaymentAmount = null;
            const summaryEl = document.getElementById('paymentSummary');
            if (summaryEl) summaryEl.style.display = 'none';
        };

        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', closeModal);
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        const container = document.getElementById('paymentButtons');
        if (container) {
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            newContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('payment-btn')) {
                    e.preventDefault();
                    
                    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
                    
                    e.target.classList.add('selected');
                    
                    const amount = parseInt(e.target.dataset.amount);
                    this.selectedPaymentAmount = amount;
                    
                    e.target.style.animation = 'bounceIn 0.6s ease-out';
                    setTimeout(() => e.target.style.animation = '', 600);
                    
                    this.updatePaymentSummary(amount);
                    
                }
            });
        }

        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const cancelBtn = document.getElementById('cancelPaymentBtn');
        
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', () => {
                if (this.selectedPaymentAmount && this.selectedPaymentAmount > 0) {
                    this.processPayment(this.selectedPaymentAmount, closeModal);
                } else {
                    this.notifications.showToast('Please select a payment amount first', 'warning');
                }
            });
        }
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.addEventListener('click', () => {
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
                const summaryEl = document.getElementById('paymentSummary');
                if (summaryEl) summaryEl.style.display = 'none';
            });
        }
    }

    updatePaymentSummary(amount) {
        const summaryEl = document.getElementById('paymentSummary');
        const selectedAmountEl = document.getElementById('selectedAmountDisplay');
        const paymentTypeEl = document.getElementById('paymentTypeDisplay');
        const workDaysCoveredEl = document.getElementById('workDaysCoveredDisplay');
        
        if (summaryEl && selectedAmountEl && paymentTypeEl && workDaysCoveredEl) {
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const totalWorkCompletedValue = this.pendingUnpaidDates.length * dailyWage;
            
            const isAdvance = amount > totalWorkCompletedValue;
            const workDaysCovered = Math.min(Math.floor(amount / dailyWage), this.pendingUnpaidDates.length);
            
            selectedAmountEl.textContent = `₹${amount}`;
            
            if (isAdvance) {
                paymentTypeEl.textContent = 'Advance Payment';
                paymentTypeEl.style.color = 'var(--warning)';
            } else {
                paymentTypeEl.textContent = 'Regular Payment';
                paymentTypeEl.style.color = 'var(--success)';
            }
            
            workDaysCoveredEl.textContent = `${workDaysCovered} days`;
            
            summaryEl.style.display = 'block';
        }
    }

    showPaymentConfirmation(amount, closeModalCallback) {
        const message = `Process payment of ₹${amount}?`;
        this.notifications.showConfirmation(
            message,
            () => this.processPayment(amount, closeModalCallback),
            () => {
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
            }
        );
    }

    async processPayment(amount, closeModalCallback) {
        try {
            console.log('Processing payment:', { amount, pendingDates: this.pendingUnpaidDates });
            
            if (!amount || amount <= 0) {
                throw new Error('Invalid payment amount');
            }
            
            if (!this.db) {
                throw new Error('Database not available');
            }
            
            const DAILY_WAGE = 25; // Should match database constant
            const totalWorkCompletedValue = this.pendingUnpaidDates.length * DAILY_WAGE;
            
            const isAdvancePayment = amount > totalWorkCompletedValue;
            
            let workDatesToPay = [];
            if (totalWorkCompletedValue > 0) {
                const daysCovered = Math.min(Math.floor(amount / DAILY_WAGE), this.pendingUnpaidDates.length);
                workDatesToPay = this.pendingUnpaidDates.slice(0, daysCovered);
                console.log('Work dates to pay:', workDatesToPay);
            }
            
            const paymentDate = this.utils.getTodayString();
            console.log('Adding payment to database:', { amount, workDatesToPay, paymentDate, isAdvancePayment });
            
            await this.db.addPayment(amount, workDatesToPay, paymentDate, isAdvancePayment);
            
            closeModalCallback();
            
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.style.animation = 'bounceIn 0.6s ease-out';
                paidBtn.classList.remove('payday-ready');
                setTimeout(() => paidBtn.style.animation = '', 600);
            }
            
            this.notifications.playSound('paid');
            
            const paymentType = isAdvancePayment ? 'advance payment' : 'regular payment';
            this.notifications.showPaymentNotification(amount);
            this.notifications.showToast(`${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} of ₹${amount} recorded successfully!`, 'success');
            
            if (workDatesToPay.length === this.pendingUnpaidDates.length && this.pendingUnpaidDates.length > 0) {
                setTimeout(() => {
                    this.notifications.showToast(`All ${workDatesToPay.length} pending work days have been paid!`, 'info');
                }, 1000);
            }
            
            console.log('Updating stats and UI...');
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            
            this.pendingUnpaidDates = this.pendingUnpaidDates.slice(workDatesToPay.length);
            await this.updatePaidButtonVisibility();
            
            try {
                await this.charts.updateCharts();
            } catch (chartError) {
                console.error('Error updating charts:', chartError);
            }
            
            try {
                if (this.calendar) {
                    await this.calendar.updateCalendar();
                }
            } catch (calendarError) {
                console.error('Error updating calendar:', calendarError);
            }
            
        } catch (error) {
            console.error('Error recording payment:', error);
            
            let errorMessage = 'Error recording payment. Please try again.';
            if (error.message.includes('Database not available')) {
                errorMessage = 'Database connection error. Please refresh the page and try again.';
            } else if (error.message.includes('Invalid payment amount')) {
                errorMessage = 'Please enter a valid payment amount.';
            }
            
            this.notifications.showToast(errorMessage, 'error');
            
            try {
                closeModalCallback();
            } catch (closeError) {
                console.error('Error closing modal:', closeError);
            }
        }
    }

    isRecordPaid(record, payments) {
        return payments.some(payment => 
            payment.workDates.includes(record.date)
        );
    }

    async checkAdvancePaymentNotification() {
        try {
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                const remainingWork = advanceStatus.workRemainingForAdvance;
                const advanceAmount = advanceStatus.totalAdvanceAmount;
                
                this.notifications.showToast(
                    `You have ${remainingWork} work day${remainingWork > 1 ? 's' : ''} remaining to complete your advance payment of ₹${advanceAmount}!`, 
                    'info', 
                    8000
                );
            }
        } catch (error) {
            console.error('Error checking advance payment notification:', error);
        }
    }


    async initializeViews() {
        try {
            await this.charts.initializeCharts();
            
            await this.calendar.init();
            
            this.setupBalanceSheetFilters();
            
        } catch (error) {
            console.error('Error initializing views:', error);
        }
    }

    async showBalanceSheet() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('balanceSheetView').style.display = 'block';
            
            await this.renderBalanceSheet();
        } catch (error) {
            console.error('Error showing balance sheet:', error);
        }
    }

    async renderBalanceSheet() {
        try {
            console.log('Rendering balance sheet...');
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            console.log('Work records found:', workRecords.length);
            console.log('Payments found:', payments.length);
            
            const sortedRecords = workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
            } else {
                console.error('Table container not found');
            }
            
            this.updateBalanceSheetFilters(sortedRecords);
            
        } catch (error) {
            console.error('Error rendering balance sheet:', error);
            this.notifications.showToast('Error loading work history', 'error');
        }
    }

    createBalanceSheetTable(records, payments) {
        let html = `
            <div class="balance-sheet-section">
                <h3><i class="fas fa-calendar-check"></i> Work Records</h3>
                <table class="sheet-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Status</th>
                            <th>Wage</th>
                            <th>Payment Status</th>
                            <th>Payment Details</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        records.forEach(record => {
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const isPaid = this.isRecordPaid(record, payments);
            const paymentInfo = this.getPaymentInfoForRecord(record, payments);
            
            html += `
                <tr>
                    <td>${this.utils.formatDateShort(record.date)}</td>
                    <td>${dayName}</td>
                    <td>
                        <span class="status-badge ${record.status}">
                            ${record.status === 'completed' ? 'Completed' : 'Not Done'}
                        </span>
                    </td>
                    <td>${record.status === 'completed' ? this.utils.formatCurrency(record.wage) : '-'}</td>
                    <td>
                        <span class="payment-status ${isPaid ? 'paid' : 'pending'}">
                            ${isPaid ? 'Paid' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        ${paymentInfo ? `
                            <small class="payment-details">
                                Paid on ${this.utils.formatDateShort(paymentInfo.paymentDate)}<br>
                                Amount: ${this.utils.formatCurrency(paymentInfo.amount)}
                            </small>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        if (payments.length > 0) {
            const sortedPayments = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
            
            html += `
                <div class="balance-sheet-section">
                    <h3><i class="fas fa-money-bill-wave"></i> Payment History</h3>
                    <table class="sheet-table">
                        <thead>
                            <tr>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Work Days Covered</th>
                                <th>Type</th>
                                <th>Work Period</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            sortedPayments.forEach(payment => {
                const workDaysCovered = payment.workDates.length;
                const paymentType = payment.isAdvance ? 'Advance' : 'Regular';
                const workPeriod = payment.workDates.length > 0 ? 
                    `${this.utils.formatDateShort(payment.workDates[0])} - ${this.utils.formatDateShort(payment.workDates[payment.workDates.length - 1])}` :
                    'No work days covered';
                
                html += `
                    <tr>
                        <td>${this.utils.formatDateShort(payment.paymentDate)}</td>
                        <td><strong>${this.utils.formatCurrency(payment.amount)}</strong></td>
                        <td>${workDaysCovered} days</td>
                        <td>
                            <span class="payment-type ${payment.isAdvance ? 'advance' : 'regular'}">
                                ${paymentType}
                            </span>
                        </td>
                        <td>${workPeriod}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return html;
    }

    getPaymentInfoForRecord(record, payments) {
        const payment = payments.find(payment => 
            payment.workDates.includes(record.date)
        );
        return payment ? {
            paymentDate: payment.paymentDate,
            amount: Math.floor(payment.amount / payment.workDates.length) // Calculate per-day amount
        } : null;
    }

    updateBalanceSheetFilters(records) {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter && yearFilter) {
            const months = new Set();
            const years = new Set();
            
            records.forEach(record => {
                months.add(record.month);
                years.add(record.year);
            });
            
            monthFilter.innerHTML = '<option value="all">All Months</option>';
            Array.from(months).sort((a, b) => a - b).forEach(month => {
                const monthName = new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                monthFilter.innerHTML += `<option value="${month}">${monthName}</option>`;
            });
            
            yearFilter.innerHTML = '<option value="all">All Years</option>';
            Array.from(years).sort((a, b) => b - a).forEach(year => {
                yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
            });
        }
    }

    setupBalanceSheetFilters() {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter) {
            monthFilter.addEventListener('change', () => this.filterBalanceSheet());
        }
        
        if (yearFilter) {
            yearFilter.addEventListener('change', () => this.filterBalanceSheet());
        }
    }

    async filterBalanceSheet() {
        try {
            const monthFilter = document.getElementById('monthFilter');
            const yearFilter = document.getElementById('yearFilter');
            
            if (!monthFilter || !yearFilter) return;
            
            const selectedMonth = monthFilter.value;
            const selectedYear = yearFilter.value;
            
            console.log('Filtering by month:', selectedMonth, 'year:', selectedYear);
            
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            let filteredRecords = workRecords;
            
            if (selectedMonth !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.month === parseInt(selectedMonth));
            }
            
            if (selectedYear !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.year === parseInt(selectedYear));
            }
            
            console.log('Filtered records:', filteredRecords.length, 'out of', workRecords.length);
            
            const sortedRecords = filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
            }
            
        } catch (error) {
            console.error('Error filtering balance sheet:', error);
            this.notifications.showToast('Error filtering data', 'error');
        }
    }

    async showAnalytics() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('analyticsView').style.display = 'block';
            
            await this.charts.updateCharts();
        } catch (error) {
            console.error('Error showing analytics:', error);
        }
    }

    async showCalendar() {
        try {
            const dashboard = document.getElementById('dashboard');
            const calendarView = document.getElementById('calendarView');
            
            if (dashboard) {
                dashboard.style.opacity = '0';
                dashboard.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    dashboard.style.display = 'none';
                }, 200);
            }
            
            if (calendarView) {
                setTimeout(() => {
                    calendarView.style.display = 'block';
                    calendarView.classList.add('animate-slide-up');
                    
                    setTimeout(() => {
                        const calendarGrid = document.getElementById('calendarGrid');
                        if (calendarGrid) {
                            calendarGrid.classList.add('animate-fade-scale');
                        }
                    }, 300);
                }, 200);
            }
            
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
        } catch (error) {
            console.error('Error showing calendar:', error);
        }
    }

    showStreakInfo() {
        const message = this.currentStats.currentStreak > 0 
            ? `Amazing! You have a ${this.currentStats.currentStreak} day work streak! Keep it up!`
            : 'Start your work streak by completing tasks consistently!';
            
        this.notifications.showToast(message, 'info');
    }

    handleClearData() {
        console.log('Clear data button clicked');
        this.notifications.showConfirmation(
            'Are you sure you want to clear all data? This action cannot be undone.',
            async () => {
                try {
                    console.log('User confirmed data clearing');
                    await this.db.clearAllData();
                    
                    this.notifications.showToast('All data cleared successfully', 'success');
                    
                    this.currentStats = await this.db.getEarningsStats();
                    this.updateDashboard();
                    await this.updateTodayStatus();
                    this.hidePaidButton();
                    
                    await this.charts.updateCharts();
                    if (this.calendar) {
                        await this.calendar.updateCalendar();
                    }
                    
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.notifications.showToast('Error clearing data: ' + error.message, 'error');
                }
            }
        );
    }

    async handleExportPDF() {
        try {
            console.log('Starting PDF export...');
            const loadingToast = this.notifications.showLoadingToast('Generating PDF...');
            
            console.log('Generating export data...');
            const data = await this.generateExportData();
            console.log('Export data generated:', data);
            
            console.log('Calling exportToPDF...');
            const success = await this.utils.exportToPDF(data);
            
            if (success) {
                this.notifications.updateLoadingToast(loadingToast, 'PDF exported successfully!', 'success');
            } else {
                this.notifications.updateLoadingToast(loadingToast, 'Error exporting PDF', 'error');
                console.log('PDF export failed');
            }
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.notifications.showToast('Error exporting PDF: ' + error.message, 'error');
        }
    }

    async generateExportData() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        const stats = await this.db.getEarningsStats();
        
        const enhancedRecords = workRecords.map(record => ({
            ...record,
            paid: this.isRecordPaid(record, payments)
        }));
        
        return {
            summary: stats,
            workRecords: enhancedRecords,
            payments: payments
        };
    }

    showAboutModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.classList.add('show');
        }
    }

    showError(message) {
        if (this.notifications) {
            this.notifications.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    handleAppUpdate() {
        console.log('App update available');
    }

    setupPWAInstall() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    
                    registration.addEventListener('updatefound', () => {
                        console.log('Service Worker update found');
                    });
                    
                    this.serviceWorkerRegistration = registration;
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        } else {
            console.log('Service Worker not supported');
        }

        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', () => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    });
                });
            }
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
        });
    }

    verifyConfiguration() {
        console.log('Verifying configuration...');
        const config = window.R_SERVICE_CONFIG || {};
        console.log('Current Config:', config);

        if (config.DAILY_WAGE !== undefined && config.PAYMENT_THRESHOLD !== undefined && config.INCREMENT_VALUE !== undefined) {
            console.log('[CONFIG] Configuration values are present and valid.');
            console.log('DAILY_WAGE:', config.DAILY_WAGE);
            console.log('PAYMENT_THRESHOLD:', config.PAYMENT_THRESHOLD);
            console.log('INCREMENT_VALUE:', config.INCREMENT_VALUE);
            
            if (window.ConfigManager) {
                console.log('[CONFIG] ConfigManager is available');
                try {
                    const amounts = window.ConfigManager.generatePaymentAmounts();
                    console.log('[CONFIG] Payment amounts generated:', amounts);
                } catch (e) {
                    console.error('[CONFIG] Error generating payment amounts:', e);
                }
            } else {
                console.warn('[CONFIG] ConfigManager not available');
            }
        } else {
            console.warn('[CONFIG] Configuration values are missing or invalid. Falling back to defaults.');
            console.log('Current Config:', config);
            window.R_SERVICE_CONFIG = {
                DAILY_WAGE: 25,
                PAYMENT_THRESHOLD: 4,
                INCREMENT_VALUE: 25,
                PAYMENT_DAY_DURATION: 4,
                MAX_PAYMENT_AMOUNT: 1000
            };
            console.log('Fallback to default config:', window.R_SERVICE_CONFIG);
        }
    }
}

const performanceMonitor = {
    startTime: performance.now(),
    markTime: (label) => {
        if (performance.mark) {
            performance.mark(label);
            console.log(`Performance: ${label} at ${(performance.now() - performanceMonitor.startTime).toFixed(2)}ms`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.markTime('DOM-loaded');
    
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        });
    } else {
        setTimeout(() => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        }, 0);
    }
});

window.addEventListener('beforeunload', (e) => {
});

window.addEventListener('online', () => {
    console.log('App is online');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
});