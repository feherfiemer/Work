// Main Application for R-Service Tracker
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

    // Initialize the application
    async init() {
        try {
            console.log('Initializing R-Service Tracker...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize utilities
            this.utils = new Utils();
            
            // Initialize database
            this.db = new DatabaseManager();
            await this.db.init();
            
            // Initialize notification manager
            this.notifications = new NotificationManager();
            this.notifications.setDatabase(this.db);
            
            // Initialize charts manager
            this.charts = new ChartsManager(this.db);
            
            // Initialize calendar manager
            this.calendar = new CalendarManager(this.db);
            
            // Load saved theme
            this.loadTheme();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Request notification permission on every visit
            await this.requestNotificationPermission();
            
            // Setup PWA install prompt
            this.setupPWAInstall();
            
            // Schedule daily reminders
            this.notifications.scheduleReminders();
            
            // Hide loading screen and show main app
            this.hideLoadingScreen();
            
            // Initialize views
            await this.initializeViews();
            
            // Update current year in footer
            this.updateCurrentYear();
            
            this.isInitialized = true;
            console.log('R-Service Tracker initialized successfully');
            
            // Verify configuration is working
            this.verifyConfiguration();
            
            // Make system testing available globally
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
                    // Test database
                                    console.log('[DATABASE] Testing database...');
                const stats = await this.db.getEarningsStats();
                console.log('[DATABASE] Database working - Current stats:', stats);
                
                // Test notifications
                console.log('[NOTIFICATIONS] Testing notifications...');
                this.notifications.testAllNotifications();
                
                // Test charts
                console.log('[CHARTS] Testing charts...');
                if (this.charts) {
                    await this.charts.updateCharts();
                    console.log('[CHARTS] Charts system working');
                }
                
                // Test calendar
                console.log('[CALENDAR] Testing calendar...');
                if (this.calendar) {
                    this.calendar.render();
                    console.log('[CALENDAR] Calendar system working');
                }
                
                // Test utilities
                console.log('[UTILITIES] Testing utilities...');
                const testDate = this.utils.formatDate(new Date());
                console.log('[UTILITIES] Utilities working - Test date:', testDate);
                
                // Test PWA
                console.log('[PWA] Testing PWA features...');
                if ('serviceWorker' in navigator) {
                    console.log('[PWA] Service Worker supported');
                }
                
                console.log('[SYSTEM] All systems test completed successfully!');
                    this.notifications.showToast('All systems tested successfully!', 'success', 5000);
                    
                } catch (error) {
                    console.error('[SYSTEM] System test failed:', error);
                    this.notifications.showToast('System test failed: ' + error.message, 'error', 5000);
                }
            };
            
            // Check for advance payment notification after initialization
            setTimeout(() => {
                this.checkAdvancePaymentNotification();
            }, 2000);
            
        } catch (error) {
            console.error('Error initializing application:', error);
            
            // Try to initialize with basic functionality
            try {
                // Ensure minimal config is available
                if (!window.R_SERVICE_CONFIG) {
                    window.R_SERVICE_CONFIG = {
                        DAILY_WAGE: 25,
                        PAYMENT_THRESHOLD: 4,
                        INCREMENT_VALUE: 25,
                        PAYMENT_DAY_DURATION: 4,
                        MAX_PAYMENT_AMOUNT: 1000
                    };
                    console.log('Fallback configuration set');
                }
                
                // Initialize basic notifications if not already done
                if (!this.notifications) {
                    this.notifications = new NotificationManager();
                    console.log('Fallback notifications initialized');
                }
                
                // Hide loading screen and show basic UI
                this.hideLoadingScreen();
                this.showError('Application initialized with limited functionality. Some features may not work properly.');
                
            } catch (criticalError) {
                console.error('Critical initialization error:', criticalError);
                this.hideLoadingScreen();
                this.showError('Critical error: Please refresh the page');
            }
        }
    }

    // Show loading screen
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

    // Hide loading screen
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
                        
                        // Add staggered animations to dashboard cards
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
                        
                        // Add floating animation to logo
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

    // Load theme
    loadTheme() {
        // Load saved color and mode, or use defaults
        this.currentColor = localStorage.getItem('selected-color') || 'blue';
        this.currentMode = localStorage.getItem('selected-mode') || 'light';
        
        // Update UI to reflect current selections
        this.updateColorSelection(this.currentColor);
        this.updateModeSelection(this.currentMode);
        
        // Apply the theme
        this.applyTheme();
    }

    // Update color selection
    updateColorSelection(color) {
        this.currentColor = color;
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === color) {
                btn.classList.add('active');
            }
        });
        // Save to localStorage
        localStorage.setItem('selected-color', color);
    }

    // Update mode selection
    updateModeSelection(mode) {
        this.currentMode = mode;
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        // Save to localStorage
        localStorage.setItem('selected-mode', mode);
    }

    // Apply current theme
    applyTheme() {
        const theme = `${this.currentColor}-${this.currentMode}`;
        this.utils.setTheme(theme);
        if (this.charts) {
            this.charts.updateCharts(); // Update charts with new theme colors
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Done button
        const doneBtn = document.getElementById('doneBtn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => this.handleDoneClick());
        }

        // Paid button
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.addEventListener('click', () => this.handlePaidClick());
        }

        // Menu toggle
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

        // Color buttons
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.updateColorSelection(color);
                this.applyTheme();
            });
        });

        // Mode buttons
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.updateModeSelection(mode);
                this.applyTheme();
            });
        });

        // Menu options
        this.setupMenuOptions();
        
        // Quick actions
        this.setupQuickActions();
        
        // View navigation
        this.setupViewNavigation();
        
        // Modal handlers
        this.setupModalHandlers();

        // Click outside menu to close
        document.addEventListener('click', (e) => {
            if (sideMenu && !sideMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                sideMenu.classList.remove('open');
            }
        });
    }

    // Close menu helper method
    closeMenu() {
        const sideMenu = document.getElementById('sideMenu');
        if (sideMenu) {
            sideMenu.classList.remove('open');
        }
    }

    // Setup menu options
    setupMenuOptions() {
        // Clear data
        const clearDataBtn = document.getElementById('clearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.handleClearData());
        }

        // Export PDF
        const exportPDFBtn = document.getElementById('exportPDF');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => {
                this.closeMenu();
                this.handleExportPDF();
            });
        }

        // About
        const aboutBtn = document.getElementById('aboutApp');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => this.showAboutModal());
        }

        // View history
        const viewHistoryBtn = document.getElementById('viewHistory');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showBalanceSheet();
            });
        }

        // View analytics
        const viewAnalyticsBtn = document.getElementById('viewAnalytics');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showAnalytics();
            });
        }

        // Settings handlers
        this.setupSettingsHandlers();
    }

    // Setup settings event handlers
    setupSettingsHandlers() {
        try {
            // Check if settings elements exist
            const settingsSection = document.querySelector('.menu-section .settings-group');
            if (!settingsSection) {
                console.warn('Settings section not found, skipping settings handlers');
                return;
            }

            // Load current settings and store original values
            this.loadSettings();
            this.storeOriginalSettings();

            // Save settings
            const saveSettingsBtn = document.getElementById('saveSettings');
            if (saveSettingsBtn) {
                // Initially disable the save button
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

            // Reset settings
            const resetSettingsBtn = document.getElementById('resetSettings');
            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', () => this.resetSettings());
            }

            // Real-time validation and change detection for all inputs
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

            // Setup notification settings handlers
            this.setupNotificationHandlers();
            
            console.log('Settings handlers setup completed');
        } catch (error) {
            console.error('Error setting up settings handlers:', error);
        }
    }

    // Setup notification settings handlers
    setupNotificationHandlers() {
        try {
            // Load notification settings
            this.loadNotificationSettings();

            // Enable/Disable notifications toggle
            const enableNotificationsToggle = document.getElementById('enableNotifications');
            if (enableNotificationsToggle) {
                enableNotificationsToggle.addEventListener('change', () => {
                    this.toggleNotificationSettings(enableNotificationsToggle.checked);
                    this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
                    this.checkForNotificationChanges();
                });
                
                // Set initial icon state
                this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
            }

            // Payment reminder time
            const paymentReminderTime = document.getElementById('paymentReminderTime');
            if (paymentReminderTime) {
                paymentReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            // Work reminder time
            const workReminderTime = document.getElementById('workReminderTime');
            if (workReminderTime) {
                workReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            // Save notification settings
            const saveNotificationBtn = document.getElementById('saveNotificationSettings');
            if (saveNotificationBtn) {
                saveNotificationBtn.addEventListener('click', () => {
                    this.saveNotificationSettings();
                });
            }

            // Test notifications
            const testNotificationsBtn = document.getElementById('testNotifications');
            if (testNotificationsBtn) {
                testNotificationsBtn.addEventListener('click', () => {
                    this.testNotifications();
                });
            }

            // Initial toggle state
            this.toggleNotificationSettings(enableNotificationsToggle?.checked ?? true);

            console.log('Notification handlers setup completed');
        } catch (error) {
            console.error('Error setting up notification handlers:', error);
        }
    }

    // Toggle notification settings visibility
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

    // Update notification toggle icon based on state
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

    // Load notification settings
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

            // Store original notification settings
            this.originalNotificationSettings = {
                NOTIFICATIONS_ENABLED: config.NOTIFICATIONS_ENABLED !== false,
                PAYMENT_REMINDER_TIME: config.PAYMENT_REMINDER_TIME || '10:00',
                WORK_REMINDER_TIME: config.WORK_REMINDER_TIME || '18:00'
            };

            // Initialize notification save button state
            this.disableNotificationSaveButton();

            console.log('Notification settings loaded:', this.originalNotificationSettings);
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    // Check for notification settings changes
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

        // Enable/disable save button based on changes
        if (hasChanges) {
            this.enableNotificationSaveButton();
        } else {
            this.disableNotificationSaveButton();
        }
    }

    // Enable notification save button
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

    // Disable notification save button
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

    // Save notification settings
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
                // Fallback: save directly to global config and localStorage
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
                    
                    // Reschedule reminders with new settings
                    this.notifications.scheduleReminders();
                }
                
                // Update original settings and disable save button
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

    // Test notifications
    testNotifications() {
        if (this.notifications) {
            this.notifications.testAllNotifications();
            this.notifications.showToast('Test notifications sent! Check if you received them.', 'info', 5000);
        } else {
            console.error('Notifications not available');
        }
    }

    // Store original settings values for change detection
    storeOriginalSettings() {
        const config = this.getCurrentConfig();
        this.originalSettings = {
            INCREMENT_VALUE: config.INCREMENT_VALUE || 25,
            PAYMENT_DAY_DURATION: config.PAYMENT_DAY_DURATION || 4,
            MAX_PAYMENT_AMOUNT: config.MAX_PAYMENT_AMOUNT || 1000
        };
        console.log('Original settings stored:', this.originalSettings);
    }

    // Check if settings have changed from original values
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

        // Enable save button only if there are changes AND settings are valid
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            if (hasChanges && isValid) {
                this.enableSaveButton();
            } else {
                this.disableSaveButton();
            }
        }
    }

    // Enable save button
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

    // Disable save button
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

    // Get current configuration
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
                MAX_PAYMENT_AMOUNT: 1000
            };
        }
        return config;
    }

    // Load settings into UI
    loadSettings() {
        try {
            // Ensure config is available with fallbacks
            let config = {};
            if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
                config = window.ConfigManager.getConfig();
            } else if (window.R_SERVICE_CONFIG) {
                config = window.R_SERVICE_CONFIG;
            } else {
                // Ultimate fallback
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
            
            console.log('Settings loaded successfully:', config);
        } catch (error) {
            console.error('Error loading settings:', error);
            // Set default values on error
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = 25;
            if (durationInput) durationInput.value = 4;
            if (maxPaymentInput) maxPaymentInput.value = 1000;
        }
    }

    // Simplified validation system with minimal feedback
    validateSettings() {
        const incrementInput = document.getElementById('incrementValue');
        const durationInput = document.getElementById('paymentDuration');
        const maxPaymentInput = document.getElementById('maxPaymentAmount');
        const saveBtn = document.getElementById('saveSettings');

        let isValid = true;

        // Reset all styles first
        [incrementInput, durationInput, maxPaymentInput].forEach(input => {
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }
        });

        // Clear existing error messages
        document.querySelectorAll('.validation-error').forEach(el => el.remove());

        // Validate increment value
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

        // Validate payment duration
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

        // Validate max payment
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

        // Simple save button state
        if (saveBtn) {
            saveBtn.disabled = !isValid;
            saveBtn.style.opacity = isValid ? '1' : '0.5';
        }

        return isValid;
    }

    // Show contextual validation error with reduced vibration
    showValidationError(input, message) {
        input.classList.add('error');
        
        // Add shake animation
        input.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        
        // Reduced vibration for mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate([50]); // Single gentle vibration
        }
        
        // Create contextual error message based on field
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
        
        // Add enhanced error message
        const errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        errorEl.textContent = contextualMessage;
        input.parentElement.appendChild(errorEl);
    }

    // Enhanced save settings with better feedback and system updates
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

            // Also update the legacy DAILY_WAGE and PAYMENT_THRESHOLD for compatibility
            newConfig.DAILY_WAGE = newConfig.INCREMENT_VALUE;
            newConfig.PAYMENT_THRESHOLD = newConfig.PAYMENT_DAY_DURATION;

            let saved = false;
            if (window.ConfigManager && typeof window.ConfigManager.saveUserConfig === 'function') {
                saved = window.ConfigManager.saveUserConfig(newConfig);
            } else {
                // Fallback: save directly to global config and localStorage
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
                
                // Immediately update original settings and disable save button
                this.storeOriginalSettings();
                this.disableSaveButton();
                
                // Show loading toast for regeneration and reset
                const loadingToast = this.notifications ? this.notifications.showLoadingToast('Updating payment options and resetting saved amounts...') : null;
                
                // Reset all saved amount details when settings are saved
                setTimeout(async () => {
                    try {
                        // Clear all saved payments and work records to reset the system
                        if (this.db) {
                            console.log('Resetting all saved amount details...');
                            
                            // Clear work records and payments (but keep settings)
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
                        
                        // Regenerate payment buttons with new settings
                        this.generatePaymentButtons();
                        
                        // Update dashboard with new configuration and reset data
                        if (typeof this.updateDashboard === 'function') {
                            this.updateDashboard();
                        }
                        
                        // Update payment period display if it exists
                        this.updatePaymentPeriodDisplay(newConfig.PAYMENT_DAY_DURATION);
                        
                        // Complete loading toast
                        if (loadingToast && this.notifications) {
                            this.notifications.updateLoadingToast(loadingToast, 'System reset and updated!', 'success');
                        }
                        
                        // Show completion feedback
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

    // Update current year in footer
    updateCurrentYear() {
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }
    }

    // Update payment period display throughout the app
    updatePaymentPeriodDisplay(days) {
        // Update dashboard progress display
        const progressToPaydayEl = document.querySelector('.progress-to-payday, .payday-progress');
        if (progressToPaydayEl) {
            const currentProgress = parseInt(progressToPaydayEl.textContent.split('/')[0]) || 0;
            progressToPaydayEl.textContent = `${currentProgress}/${days}`;
        }

        // Update any text mentioning "4 days"
        document.querySelectorAll('[data-payment-period]').forEach(el => {
            el.textContent = el.textContent.replace(/\d+ days?/, `${days} day${days > 1 ? 's' : ''}`);
        });

        console.log(`Payment period display updated to ${days} days`);
    }

    // Get preview of generated amounts for user feedback
    getGeneratedAmountPreview() {
        const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        const amounts = window.ConfigManager ? window.ConfigManager.generatePaymentAmounts() : [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4];
        const preview = amounts.slice(0, 5).map(amt => `₹${amt}`).join(', ');
        return amounts.length > 5 ? `${preview}...` : preview;
    }

    // Enhanced reset settings with better UX
    resetSettings() {
        this.notifications.showConfirmation(
            'Are you sure you want to reset all settings to default values?\n\nThis will:\n• Set daily wage to ₹25\n• Set payment period to 4 days\n• Set maximum amount to ₹1000\n• Regenerate payment options',
            () => {
                try {
                    if (window.ConfigManager) {
                        window.ConfigManager.resetToDefaults();
                        this.loadSettings();
                        
                        // Show loading for regeneration
                        const loadingToast = this.notifications.showLoadingToast('Resetting to defaults...');
                        
                        setTimeout(() => {
                            this.generatePaymentButtons();
                            this.updateDashboard();
                            this.updatePaymentPeriodDisplay(4);
                            
                            // Clear validation messages
                            document.querySelectorAll('.validation-error, .validation-warning, .validation-success, .validation-summary').forEach(el => el.remove());
                            
                            // Reset input styles
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

    // Setup quick actions
    setupQuickActions() {
        // Balance sheet
        const balanceSheetBtn = document.getElementById('viewBalanceSheet');
        if (balanceSheetBtn) {
            balanceSheetBtn.addEventListener('click', () => this.showBalanceSheet());
        }

        // Calendar
        const calendarBtn = document.getElementById('viewCalendar');
        if (calendarBtn) {
            calendarBtn.addEventListener('click', () => this.showCalendar());
        }

        // Charts
        const chartsBtn = document.getElementById('viewCharts');
        if (chartsBtn) {
            chartsBtn.addEventListener('click', () => this.showAnalytics());
        }

        // Daily streak (just shows info)
        const streakBtn = document.getElementById('dailyStreak');
        if (streakBtn) {
            streakBtn.addEventListener('click', () => this.showStreakInfo());
        }
    }

    // Setup view navigation
    setupViewNavigation() {
        // Close buttons for views
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

    // Setup modal handlers
    setupModalHandlers() {
        // About modal
        const aboutModal = document.getElementById('aboutModal');
        const closeModalBtns = document.querySelectorAll('.close-modal');
        
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (aboutModal) aboutModal.classList.remove('show');
            });
        });

        // Click outside modal to close
        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.remove('show');
                }
            });
        }
    }

    // Close current view and show dashboard
    closeCurrentView(view) {
        try {
            // Hide all views first
            const allViews = ['balanceSheetView', 'analyticsView', 'calendarView'];
            allViews.forEach(viewId => {
                const viewElement = document.getElementById(viewId);
                if (viewElement) {
                    viewElement.style.display = 'none';
                    viewElement.style.opacity = '1';
                    viewElement.style.transform = 'translateY(0)';
                }
            });

            // Show dashboard with proper reset
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
                
                // Remove any existing animation classes
                dashboard.classList.remove('animate-fade-scale', 'animate-slide-up', 'animate-bounce-in');
                
                // Add fresh animation
                setTimeout(() => {
                    dashboard.classList.add('animate-fade-scale');
                }, 50);
            }
        } catch (error) {
            console.error('Error closing view:', error);
            // Fallback - just show dashboard
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
            }
        }
    }

    // Load initial data and update UI
    async loadInitialData() {
        try {
            // Get current stats
            this.currentStats = await this.db.getEarningsStats();
            
            // Update dashboard
            this.updateDashboard();
            
            // Check for pending payments
            await this.checkPendingPayments();
            
            // Update today's status
            this.updateTodayStatus();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Debounced update dashboard for better performance
    updateDashboard() {
        // Cancel previous update if still pending
        if (this.updateDashboardTimeout) {
            clearTimeout(this.updateDashboardTimeout);
        }
        
        this.updateDashboardTimeout = setTimeout(() => {
            this._performDashboardUpdate();
        }, 50);
    }

    // Actual dashboard update implementation
    _performDashboardUpdate() {
        // Add shimmer loading effect before updating
        const dashboardCards = document.querySelectorAll('.card');
        dashboardCards.forEach(card => {
            card.style.animation = 'fadeInUp 0.5s ease-out';
        });

        // Update current date
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = this.utils.formatDate(new Date());
        }

        // Update earnings info
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
        
        // Update progress bar - handle advance payments
        this.updateProgressBar(progressTextEl, progressFillEl);
        
        if (streakCountEl) {
            const currentStreak = this.currentStats?.currentStreak || 0;
            this.utils.animateValue(streakCountEl, 0, currentStreak, 1200);
        }
    }

    // Update progress bar based on advance payment status
    async updateProgressBar(progressTextEl, progressFillEl) {
        try {
            const progressLabelEl = document.getElementById('progressLabel');
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            console.log('Progress bar update - advance status:', advanceStatus);
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                // Show advance payment progress
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                
                // Ensure we have valid numbers
                const safeWorkCompleted = workCompleted || 0;
                const safeWorkRequired = workRequired || 1; // Avoid division by zero
                
                // Calculate progress percentage
                const progressPercent = Math.min((safeWorkCompleted / safeWorkRequired) * 100, 100);
                console.log('Advance progress:', { workCompleted: safeWorkCompleted, workRequired: safeWorkRequired, progressPercent });
                
                if (progressLabelEl) {
                    progressLabelEl.textContent = `Advance Payment Progress (₹${advanceStatus.totalAdvanceAmount} paid)`;
                }
                if (progressTextEl) {
                    // Always show in days for advance payment progress to match user expectations
                    // Example: user worked 2 days, advance payment of ₹200 (8 days), show "2/8 days"
                    progressTextEl.textContent = `${safeWorkCompleted}/${safeWorkRequired} days`;
                }
                
                if (progressFillEl) {
                    // Ensure progress bar shows completion properly
                    let finalPercent;
                    if (safeWorkCompleted === 0) {
                        finalPercent = 0; // Empty if no work done
                    } else if (safeWorkCompleted >= safeWorkRequired) {
                        finalPercent = 100; // Full if work is complete or more
                    } else {
                        // Show proportional progress, ensure it shows when work is done
                        finalPercent = Math.max(progressPercent, 10); // Minimum 10% visibility when work is started
                    }
                    
                    progressFillEl.style.width = `${finalPercent}%`;
                    // Change color to green if work is completed, orange otherwise
                    progressFillEl.style.backgroundColor = safeWorkCompleted >= safeWorkRequired ? 'var(--success)' : 'var(--warning)';
                }
            } else if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance === 0) {
                // Advance fully paid back
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
                // Show normal payday progress
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
            // Fallback to normal progress
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

    // Update today's status
    async updateTodayStatus() {
        const today = this.utils.getTodayString();
        const todayRecord = await this.db.getWorkRecord(today);
        
        const workStatusEl = document.getElementById('workStatus');
        const doneBtnEl = document.getElementById('doneBtn');
        
        if (todayRecord && todayRecord.status === 'completed') {
            // Work is done today
            if (workStatusEl) {
                workStatusEl.className = 'status-badge completed';
                workStatusEl.innerHTML = '<i class="fas fa-check"></i> Work Completed';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = true;
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Already Done';
            }
        } else {
            // Work not done yet
            if (workStatusEl) {
                workStatusEl.className = 'status-badge pending';
                workStatusEl.innerHTML = '<i class="fas fa-clock"></i> Not Started';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = false;
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Mark as Done';
            }
        }
        
        // Update paid button visibility
        await this.updatePaidButtonVisibility();
    }

    // Check for pending payments and show paid button if needed
    async checkPendingPayments() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        
        // Find unpaid completed work
        const unpaidRecords = workRecords.filter(record => 
            record.status === 'completed' && !this.isRecordPaid(record, payments)
        );
        
        const previousUnpaidCount = this.pendingUnpaidDates.length;
        this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
        
        // Check if we have any unpaid days
        if (this.pendingUnpaidDates.length > 0) {
            this.showPaidButton();
            
            // Show payday notification and sound only when we reach multiples of 4 days
            if (this.pendingUnpaidDates.length % 4 === 0 && previousUnpaidCount % 4 !== 0) {
                console.log('Payday reached! Showing notification and playing sound');
                this.notifications.showPaydayNotification();
                this.notifications.playSound('paid');
            }
        } else {
            this.hidePaidButton();
        }
    }

    // Update paid button visibility
    async updatePaidButtonVisibility() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            // Check if there are unpaid work days that can be paid
            await this.updatePendingUnpaidDates();
            
            // Check advance payment status
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            // Show paid button if:
            // 1. There are enough unpaid work days for regular payment (based on settings), OR
            // 2. There are any unpaid work days and there's an outstanding advance to pay back
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

    // Show paid button
    showPaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'inline-flex';
            paidBtn.style.animation = 'payoutButtonAppear 0.8s ease-in-out';
            
            // Add pulsing effect to indicate importance
            paidBtn.classList.add('payday-ready');
        }
    }

    // Hide paid button
    hidePaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'none';
            paidBtn.classList.remove('payday-ready');
        }
    }

    // Handle done button click
    async handleDoneClick() {
        try {
            const today = this.utils.getTodayString();
            console.log('Marking work as done for date:', today);
            
            // Check if already done today
            const existingRecord = await this.db.getWorkRecord(today);
            if (existingRecord && existingRecord.status === 'completed') {
                this.notifications.showToast('Work already marked as done for today!', 'warning');
                return;
            }
            
            // Add work record
            const result = await this.db.addWorkRecord(today, window.R_SERVICE_CONFIG?.DAILY_WAGE || 25, 'completed');
            console.log('Work record added successfully:', result);
            
            // Add visual feedback to done button
            const doneBtn = document.getElementById('doneBtn');
            if (doneBtn) {
                doneBtn.style.animation = 'bounceIn 0.6s ease-out';
                setTimeout(() => doneBtn.style.animation = '', 600);
            }
            
            // Play sound
            this.notifications.playSound('done');
            
            // Show success notification
            this.notifications.showWorkCompletedNotification();
            this.notifications.showToast(`Great job! You earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} today`, 'success');
            
            // Update stats and UI
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            this.updateTodayStatus();
            
            // Check for milestones
            this.notifications.checkMilestones(this.currentStats);
            
            // Update charts and calendar
            await this.charts.updateCharts();
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
            
            // Check if payment is due
            await this.checkPendingPayments();
            
        } catch (error) {
            console.error('Error marking work as done:', error);
            this.notifications.showToast('Error marking work as done. Please try again.', 'error');
        }
    }

    // Handle paid button click
    async handlePaidClick() {
        try {
            if (this.pendingUnpaidDates.length === 0) {
                this.notifications.showToast('No unpaid work to record payment for', 'warning');
                return;
            }
            
            // Show payment selection modal
            this.showPaymentModal();
            
        } catch (error) {
            console.error('Error opening payment modal:', error);
            this.notifications.showToast('Error opening payment selection', 'error');
        }
    }

    // Update pending unpaid dates
    async updatePendingUnpaidDates() {
        try {
            // Refresh data from database
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            // Get unpaid work records
            const unpaidRecords = workRecords.filter(record => 
                record.status === 'completed' && !this.isRecordPaid(record, payments)
            );
            
            this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
            console.log('Updated pending dates:', this.pendingUnpaidDates);
        } catch (error) {
            console.error('Error updating pending dates:', error);
        }
    }

    // Show payment selection modal
    async showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const unpaidDaysEl = document.getElementById('unpaidDaysCount');
        const pendingAmountEl = document.getElementById('pendingAmount');
        
        if (modal && unpaidDaysEl && pendingAmountEl) {
            // Refresh pending dates before showing modal
            await this.updatePendingUnpaidDates();
            
            const pendingAmount = this.pendingUnpaidDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
            unpaidDaysEl.textContent = this.pendingUnpaidDates.length;
            pendingAmountEl.textContent = pendingAmount;
            
            console.log('Payment modal - Unpaid days:', this.pendingUnpaidDates.length, 'Pending amount:', pendingAmount);
            
            modal.classList.add('show');
            this.setupPaymentModalHandlers();
        }
    }

    // Generate payment buttons dynamically based on increment value
    generatePaymentButtons() {
        const container = document.getElementById('paymentButtons');
        if (!container) {
            console.warn('Payment buttons container not found');
            return;
        }

        try {
            // Clear existing buttons
            container.innerHTML = '';

            // Get payment amounts from config with fallbacks
            let amounts = [];
            if (window.ConfigManager && typeof window.ConfigManager.generatePaymentAmounts === 'function') {
                amounts = window.ConfigManager.generatePaymentAmounts();
            } else {
                // Fallback amounts based on daily wage
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 1000];
                console.warn('Using fallback payment amounts based on daily wage:', dailyWage);
            }
            
            // Ensure we have valid amounts
            if (!Array.isArray(amounts) || amounts.length === 0) {
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 1000];
            }
            
            // Create buttons for each amount
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
            // Create fallback buttons based on daily wage
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

    // Setup payment modal event handlers
    setupPaymentModalHandlers() {
        const modal = document.getElementById('paymentModal');
        const closeBtn = document.getElementById('closePaymentModal');
        
        // Generate payment buttons first
        this.generatePaymentButtons();

        // Close modal handlers
        const closeModal = () => {
            this.notifications.playCloseSound();
            modal.classList.remove('show');
            // Clear selections
            document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
            this.selectedPaymentAmount = null;
            // Hide payment summary
            const summaryEl = document.getElementById('paymentSummary');
            if (summaryEl) summaryEl.style.display = 'none';
        };

        // Remove existing listeners to prevent duplicates
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', closeModal);
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Enhanced payment button handlers using event delegation
        const container = document.getElementById('paymentButtons');
        if (container) {
            // Remove existing listeners to prevent duplicates
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            newContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('payment-btn')) {
                    e.preventDefault();
                    
                    // Remove previous selections
                    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
                    
                    // Select current button
                    e.target.classList.add('selected');
                    
                    const amount = parseInt(e.target.dataset.amount);
                    this.selectedPaymentAmount = amount;
                    
                    // Add visual feedback
                    e.target.style.animation = 'bounceIn 0.6s ease-out';
                    setTimeout(() => e.target.style.animation = '', 600);
                    
                    // Update payment summary
                    this.updatePaymentSummary(amount);
                    
                    // Don't auto-process, wait for confirmation button
                }
            });
        }

        // Setup confirmation buttons
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const cancelBtn = document.getElementById('cancelPaymentBtn');
        
        if (confirmBtn) {
            // Remove existing listeners to prevent duplicates
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
            // Remove existing listeners to prevent duplicates
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.addEventListener('click', () => {
                // Clear selection and hide summary
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
                const summaryEl = document.getElementById('paymentSummary');
                if (summaryEl) summaryEl.style.display = 'none';
            });
        }
    }

    // Update payment summary display
    updatePaymentSummary(amount) {
        const summaryEl = document.getElementById('paymentSummary');
        const selectedAmountEl = document.getElementById('selectedAmountDisplay');
        const paymentTypeEl = document.getElementById('paymentTypeDisplay');
        const workDaysCoveredEl = document.getElementById('workDaysCoveredDisplay');
        
        if (summaryEl && selectedAmountEl && paymentTypeEl && workDaysCoveredEl) {
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const totalWorkCompletedValue = this.pendingUnpaidDates.length * dailyWage;
            
            // Advance payment only if amount exceeds TOTAL work completed (not just payment threshold)
            const isAdvance = amount > totalWorkCompletedValue;
            const workDaysCovered = Math.min(Math.floor(amount / dailyWage), this.pendingUnpaidDates.length);
            
            selectedAmountEl.textContent = `₹${amount}`;
            
            // Improved payment type logic
            if (isAdvance) {
                paymentTypeEl.textContent = 'Advance Payment';
                paymentTypeEl.style.color = 'var(--warning)';
            } else {
                paymentTypeEl.textContent = 'Regular Payment';
                paymentTypeEl.style.color = 'var(--success)';
            }
            
            workDaysCoveredEl.textContent = `${workDaysCovered} days`;
            
            // Show summary
            summaryEl.style.display = 'block';
        }
    }

    // Show payment confirmation
    showPaymentConfirmation(amount, closeModalCallback) {
        const message = `Process payment of ₹${amount}?`;
        this.notifications.showConfirmation(
            message,
            () => this.processPayment(amount, closeModalCallback),
            () => {
                // Reset selection on cancel
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
            }
        );
    }

    // Process the selected payment
    async processPayment(amount, closeModalCallback) {
        try {
            console.log('Processing payment:', { amount, pendingDates: this.pendingUnpaidDates });
            
            // Validate input
            if (!amount || amount <= 0) {
                throw new Error('Invalid payment amount');
            }
            
            if (!this.db) {
                throw new Error('Database not available');
            }
            
            // Use unified amount calculation system
            const DAILY_WAGE = 25; // Should match database constant
            const totalWorkCompletedValue = this.pendingUnpaidDates.length * DAILY_WAGE;
            
            // Fixed logic: Advance payment only if amount exceeds TOTAL work completed
            const isAdvancePayment = amount > totalWorkCompletedValue;
            
            // Determine which work dates to mark as paid
            let workDatesToPay = [];
            if (totalWorkCompletedValue > 0) {
                // Calculate how many days this payment covers
                const daysCovered = Math.min(Math.floor(amount / DAILY_WAGE), this.pendingUnpaidDates.length);
                workDatesToPay = this.pendingUnpaidDates.slice(0, daysCovered);
                console.log('Work dates to pay:', workDatesToPay);
            }
            
            // Add payment record with better date handling
            const paymentDate = this.utils.getTodayString();
            console.log('Adding payment to database:', { amount, workDatesToPay, paymentDate, isAdvancePayment });
            
            await this.db.addPayment(amount, workDatesToPay, paymentDate, isAdvancePayment);
            console.log('Payment added successfully to database');
            
            // Close modal
            closeModalCallback();
            
            // Add visual feedback to paid button
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.style.animation = 'bounceIn 0.6s ease-out';
                paidBtn.classList.remove('payday-ready');
                setTimeout(() => paidBtn.style.animation = '', 600);
            }
            
            // Play sound
            this.notifications.playSound('paid');
            
            // Show success notification with improved messaging
            const paymentType = isAdvancePayment ? 'advance payment' : 'regular payment';
            this.notifications.showPaymentNotification(amount);
            this.notifications.showToast(`${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} of ₹${amount} recorded successfully!`, 'success');
            
            // Show completion notification if all pending work is paid
            if (workDatesToPay.length === this.pendingUnpaidDates.length && this.pendingUnpaidDates.length > 0) {
                setTimeout(() => {
                    this.notifications.showToast(`All ${workDatesToPay.length} pending work days have been paid!`, 'info');
                }, 1000);
            }
            
            // Update stats and UI
            console.log('Updating stats and UI...');
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            
            // Update pending dates (remove paid dates)
            this.pendingUnpaidDates = this.pendingUnpaidDates.slice(workDatesToPay.length);
            await this.updatePaidButtonVisibility();
            
            // Update charts and calendar with error handling
            try {
                await this.charts.updateCharts();
                console.log('Charts updated successfully');
            } catch (chartError) {
                console.error('Error updating charts:', chartError);
                // Don't fail the entire operation for chart errors
            }
            
            try {
                if (this.calendar) {
                    await this.calendar.updateCalendar();
                    console.log('Calendar updated successfully');
                }
            } catch (calendarError) {
                console.error('Error updating calendar:', calendarError);
                // Don't fail the entire operation for calendar errors
            }
            
        } catch (error) {
            console.error('Error recording payment:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Error recording payment. Please try again.';
            if (error.message.includes('Database not available')) {
                errorMessage = 'Database connection error. Please refresh the page and try again.';
            } else if (error.message.includes('Invalid payment amount')) {
                errorMessage = 'Please enter a valid payment amount.';
            }
            
            this.notifications.showToast(errorMessage, 'error');
            
            // Close modal on error to prevent user confusion
            try {
                closeModalCallback();
            } catch (closeError) {
                console.error('Error closing modal:', closeError);
            }
        }
    }

    // Helper method to check if record is paid
    isRecordPaid(record, payments) {
        return payments.some(payment => 
            payment.workDates.includes(record.date)
        );
    }

    // Check and show advance payment notification
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

    // Request notification permission
    async requestNotificationPermission() {
        try {
            // Use the new enhanced permission checker
            await this.notifications.checkAndRequestPermission();
            return this.notifications.permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    // Initialize views
    async initializeViews() {
        try {
            // Initialize charts
            await this.charts.initializeCharts();
            
            // Initialize calendar
            await this.calendar.init();
            
            // Setup balance sheet filters
            this.setupBalanceSheetFilters();
            
        } catch (error) {
            console.error('Error initializing views:', error);
        }
    }

    // Show balance sheet
    async showBalanceSheet() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('balanceSheetView').style.display = 'block';
            
            await this.renderBalanceSheet();
        } catch (error) {
            console.error('Error showing balance sheet:', error);
        }
    }

    // Render balance sheet
    async renderBalanceSheet() {
        try {
            console.log('Rendering balance sheet...');
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            console.log('Work records found:', workRecords.length);
            console.log('Payments found:', payments.length);
            
            // Sort records by date (newest first)
            const sortedRecords = workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Create table
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
                console.log('Balance sheet table updated');
            } else {
                console.error('Table container not found');
            }
            
            // Update filters
            this.updateBalanceSheetFilters(sortedRecords);
            
        } catch (error) {
            console.error('Error rendering balance sheet:', error);
            this.notifications.showToast('Error loading work history', 'error');
        }
    }

    // Create balance sheet table
    createBalanceSheetTable(records, payments) {
        // Create work records table
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
        
        // Add payments section
        if (payments.length > 0) {
            // Sort payments by date (newest first)
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

    // Get payment information for a specific work record
    getPaymentInfoForRecord(record, payments) {
        const payment = payments.find(payment => 
            payment.workDates.includes(record.date)
        );
        return payment ? {
            paymentDate: payment.paymentDate,
            amount: Math.floor(payment.amount / payment.workDates.length) // Calculate per-day amount
        } : null;
    }

    // Update balance sheet filters
    updateBalanceSheetFilters(records) {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter && yearFilter) {
            // Get unique months and years
            const months = new Set();
            const years = new Set();
            
            records.forEach(record => {
                months.add(record.month);
                years.add(record.year);
            });
            
            // Populate month filter
            monthFilter.innerHTML = '<option value="all">All Months</option>';
            Array.from(months).sort((a, b) => a - b).forEach(month => {
                const monthName = new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                monthFilter.innerHTML += `<option value="${month}">${monthName}</option>`;
            });
            
            // Populate year filter
            yearFilter.innerHTML = '<option value="all">All Years</option>';
            Array.from(years).sort((a, b) => b - a).forEach(year => {
                yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
            });
        }
    }

    // Setup balance sheet filters
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

    // Filter balance sheet
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
            
            // Filter records based on selected month and year
            let filteredRecords = workRecords;
            
            if (selectedMonth !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.month === parseInt(selectedMonth));
            }
            
            if (selectedYear !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.year === parseInt(selectedYear));
            }
            
            console.log('Filtered records:', filteredRecords.length, 'out of', workRecords.length);
            
            // Sort records by date (newest first)
            const sortedRecords = filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Create filtered table
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
                console.log('Balance sheet table updated with filters');
            }
            
        } catch (error) {
            console.error('Error filtering balance sheet:', error);
            this.notifications.showToast('Error filtering data', 'error');
        }
    }

    // Show analytics
    async showAnalytics() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('analyticsView').style.display = 'block';
            
            // Update charts
            await this.charts.updateCharts();
        } catch (error) {
            console.error('Error showing analytics:', error);
        }
    }

    // Show calendar
    async showCalendar() {
        try {
            const dashboard = document.getElementById('dashboard');
            const calendarView = document.getElementById('calendarView');
            
            // Hide dashboard with fade out
            if (dashboard) {
                dashboard.style.opacity = '0';
                dashboard.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    dashboard.style.display = 'none';
                }, 200);
            }
            
            // Show calendar with animations
            if (calendarView) {
                setTimeout(() => {
                    calendarView.style.display = 'block';
                    calendarView.classList.add('animate-slide-up');
                    
                    // Add animation to calendar grid after a delay
                    setTimeout(() => {
                        const calendarGrid = document.getElementById('calendarGrid');
                        if (calendarGrid) {
                            calendarGrid.classList.add('animate-fade-scale');
                        }
                    }, 300);
                }, 200);
            }
            
            // Update calendar
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
        } catch (error) {
            console.error('Error showing calendar:', error);
        }
    }

    // Show streak info
    showStreakInfo() {
        const message = this.currentStats.currentStreak > 0 
            ? `Amazing! You have a ${this.currentStats.currentStreak} day work streak! Keep it up!`
            : 'Start your work streak by completing tasks consistently!';
            
        this.notifications.showToast(message, 'info');
    }

    // Handle clear data
    handleClearData() {
        console.log('Clear data button clicked');
        this.notifications.showConfirmation(
            'Are you sure you want to clear all data? This action cannot be undone.',
            async () => {
                try {
                    console.log('User confirmed data clearing');
                    await this.db.clearAllData();
                    
                    this.notifications.showToast('All data cleared successfully', 'success');
                    
                    // Reset UI
                    this.currentStats = await this.db.getEarningsStats();
                    this.updateDashboard();
                    await this.updateTodayStatus();
                    this.hidePaidButton();
                    
                    // Update views
                    await this.charts.updateCharts();
                    if (this.calendar) {
                        await this.calendar.updateCalendar();
                    }
                    
                    console.log('Data cleared and UI updated');
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.notifications.showToast('Error clearing data: ' + error.message, 'error');
                }
            }
        );
    }

    // Handle export PDF
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
                console.log('PDF export completed successfully');
            } else {
                this.notifications.updateLoadingToast(loadingToast, 'Error exporting PDF', 'error');
                console.log('PDF export failed');
            }
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.notifications.showToast('Error exporting PDF: ' + error.message, 'error');
        }
    }

    // Generate export data
    async generateExportData() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        const stats = await this.db.getEarningsStats();
        
        // Add payment status to work records
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

    // Show about modal
    showAboutModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.classList.add('show');
        }
    }

    // Show error message
    showError(message) {
        if (this.notifications) {
            this.notifications.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    // Handle app updates (if service worker was implemented)
    handleAppUpdate() {
        // This would be used with service workers for PWA functionality
        console.log('App update available');
    }

    // Setup PWA install prompt and service worker
    setupPWAInstall() {
        // Register service worker for better notification support
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                    
                    // Update service worker if needed
                    registration.addEventListener('updatefound', () => {
                        console.log('Service Worker update found');
                    });
                    
                    // Set registration for notifications
                    this.serviceWorkerRegistration = registration;
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        } else {
            console.log('Service Worker not supported');
        }

        // PWA install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button or prompt
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
        
        // Check if already installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
        });
    }

    // Verify configuration is working
    verifyConfiguration() {
        console.log('Verifying configuration...');
        const config = window.R_SERVICE_CONFIG || {};
        console.log('Current Config:', config);

        if (config.DAILY_WAGE !== undefined && config.PAYMENT_THRESHOLD !== undefined && config.INCREMENT_VALUE !== undefined) {
            console.log('[CONFIG] Configuration values are present and valid.');
            console.log('DAILY_WAGE:', config.DAILY_WAGE);
            console.log('PAYMENT_THRESHOLD:', config.PAYMENT_THRESHOLD);
            console.log('INCREMENT_VALUE:', config.INCREMENT_VALUE);
            
            // Also verify ConfigManager if available
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
            // Fallback to defaults if config is missing or invalid
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

// Performance monitoring
const performanceMonitor = {
    startTime: performance.now(),
    markTime: (label) => {
        if (performance.mark) {
            performance.mark(label);
            console.log(`Performance: ${label} at ${(performance.now() - performanceMonitor.startTime).toFixed(2)}ms`);
        }
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.markTime('DOM-loaded');
    
    // Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        });
    } else {
        // Fallback for older browsers
        setTimeout(() => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        }, 0);
    }
});

// Handle beforeunload for data safety
window.addEventListener('beforeunload', (e) => {
    // Could save any pending data here if needed
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('App is online');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
});