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
            
            this.isInitialized = true;
            console.log('R-Service Tracker initialized successfully');
            
            // Check for advance payment notification after initialization
            setTimeout(() => {
                this.checkAdvancePaymentNotification();
            }, 2000);
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // Show loading screen
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (mainContainer) mainContainer.style.display = 'none';
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
            this.utils.animateNumber(currentEarningsEl, 0, this.currentStats.currentBalance, 1500);
        }
        
        if (daysWorkedEl) {
            this.utils.animateValue(daysWorkedEl, 0, this.currentStats.totalWorked, 1000);
        }
        
        if (totalEarnedEl) {
            this.utils.animateNumber(totalEarnedEl, 0, this.currentStats.totalEarned, 2000);
        }
        
        if (progressTextEl) {
            progressTextEl.textContent = `${this.currentStats.progressToPayday}/4 days`;
        }
        
        if (progressFillEl) {
            const progressPercent = (this.currentStats.progressToPayday / 4) * 100;
            progressFillEl.style.width = `${progressPercent}%`;
        }
        
        // Update progress bar - handle advance payments
        this.updateProgressBar(progressTextEl, progressFillEl);
        
        if (streakCountEl) {
            this.utils.animateValue(streakCountEl, 0, this.currentStats.currentStreak, 1200);
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
                    progressTextEl.textContent = `${this.currentStats.progressToPayday}/4 days`;
                }
                
                if (progressFillEl) {
                    const progressPercent = (this.currentStats.progressToPayday / 4) * 100;
                    progressFillEl.style.width = `${progressPercent}%`;
                    progressFillEl.style.backgroundColor = 'var(--primary)'; // Normal color
                }
            }
        } catch (error) {
            console.error('Error updating progress bar:', error);
            // Fallback to normal progress
            if (progressTextEl) {
                progressTextEl.textContent = `${this.currentStats.progressToPayday}/4 days`;
            }
            
            if (progressFillEl) {
                const progressPercent = (this.currentStats.progressToPayday / 4) * 100;
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
            // 1. There are 4+ unpaid work days for regular payment, OR
            // 2. There are any unpaid work days and there's an outstanding advance to pay back
            const shouldShowPaidBtn = this.pendingUnpaidDates.length >= 4 || 
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
            
            const pendingAmount = this.pendingUnpaidDates.length * 25;
            unpaidDaysEl.textContent = this.pendingUnpaidDates.length;
            pendingAmountEl.textContent = pendingAmount;
            
            console.log('Payment modal - Unpaid days:', this.pendingUnpaidDates.length, 'Pending amount:', pendingAmount);
            
            modal.classList.add('show');
            this.setupPaymentModalHandlers();
        }
    }

    // Setup payment modal event handlers
    setupPaymentModalHandlers() {
        const modal = document.getElementById('paymentModal');
        const closeBtn = document.getElementById('closePaymentModal');
        const paymentButtons = document.querySelectorAll('.payment-btn');

        // Close modal handlers
        const closeModal = () => {
            this.notifications.playCloseSound();
            modal.classList.remove('show');
            // Clear selections
            paymentButtons.forEach(btn => btn.classList.remove('selected'));
            this.selectedPaymentAmount = null;
            // Hide payment summary
            const summaryEl = document.getElementById('paymentSummary');
            if (summaryEl) summaryEl.style.display = 'none';
        };

        // Remove existing listeners to prevent duplicates
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Enhanced payment button handlers
        paymentButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove previous selections
                document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
                
                // Select current button
                newBtn.classList.add('selected');
                
                const amount = parseInt(newBtn.dataset.amount);
                this.selectedPaymentAmount = amount;
                
                // Add visual feedback
                newBtn.style.animation = 'bounceIn 0.6s ease-out';
                setTimeout(() => newBtn.style.animation = '', 600);
                
                // Update payment summary
                this.updatePaymentSummary(amount);
                
                // Don't auto-process, wait for confirmation button
            });
        });

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
            const pendingAmount = this.pendingUnpaidDates.length * 25;
            const isAdvance = amount > pendingAmount;
            const workDaysCovered = Math.min(Math.floor(amount / 25), this.pendingUnpaidDates.length);
            
            selectedAmountEl.textContent = `₹${amount}`;
            paymentTypeEl.textContent = isAdvance ? 'Advance Payment' : 'Regular Payment';
            paymentTypeEl.style.color = isAdvance ? 'var(--warning)' : 'var(--success)';
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
            const pendingAmount = this.pendingUnpaidDates.length * DAILY_WAGE;
            const isAdvancePayment = amount > pendingAmount;
            
            // Determine which work dates to mark as paid
            let workDatesToPay = [];
            if (pendingAmount > 0) {
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
            
            // Show success notification
            const paymentType = isAdvancePayment ? 'advance payment' : 'payment';
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
            // Always check and request permission if not granted
            if (this.notifications.permission !== 'granted') {
                const permission = await this.notifications.requestPermission();
                console.log('Notification permission status:', permission);
                return permission;
            }
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

    // Setup PWA install prompt and recommendations
    setupPWAInstall() {
        let deferredPrompt;
        
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt triggered');
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install recommendation after a delay
            setTimeout(() => {
                this.showPWARecommendation(deferredPrompt);
            }, 10000); // Show after 10 seconds
        });
        
        // Listen for app installation
        window.addEventListener('appinstalled', (e) => {
            console.log('[PWA] App was installed');
            this.notifications.showToast('R-Service Tracker installed successfully!', 'success');
            deferredPrompt = null;
        });
        
        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            console.log('[PWA] Running as installed app');
            // Hide install prompts since already installed
        }
    }
    
    // Show PWA install recommendation
    showPWARecommendation(deferredPrompt) {
        if (!deferredPrompt) return;
        
        // Check if user has previously dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) return;
        
        // Create install prompt
        const installMessage = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-mobile-alt" style="font-size: 1.5rem; color: var(--primary);"></i>
                <div>
                    <strong>Install R-Service Tracker</strong><br>
                    <small>Get quick access and offline support!</small>
                </div>
                <button id="pwa-install-btn" style="margin-left: auto; padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Install
                </button>
                <button id="pwa-dismiss-btn" style="padding: 0.5rem; background: none; border: none; color: var(--text-secondary); cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        this.notifications.showToast(installMessage, 'info', 0); // Show indefinitely
        
        // Handle install button click
        setTimeout(() => {
            const installBtn = document.getElementById('pwa-install-btn');
            const dismissBtn = document.getElementById('pwa-dismiss-btn');
            
            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log(`[PWA] User response: ${outcome}`);
                        deferredPrompt = null;
                        
                        // Remove the toast
                        const toasts = document.querySelectorAll('.toast');
                        toasts.forEach(toast => toast.remove());
                    }
                });
            }
            
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    localStorage.setItem('pwa-install-dismissed', 'true');
                    const toasts = document.querySelectorAll('.toast');
                    toasts.forEach(toast => toast.remove());
                });
            }
        }, 100);
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