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
            
            // Show occasional PWA recommendations based on usage
            setTimeout(() => {
                this.showOccasionalPWARecommendation();
            }, 5000);
            
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
                    if (mainContainer) mainContainer.style.display = 'block';
                }, 500);
            } else if (mainContainer) {
                mainContainer.style.display = 'block';
            }
        }, 2000); // Show loading for 2 seconds
    }

    // Load theme
    loadTheme() {
        const savedTheme = this.utils.getTheme();
        this.utils.setTheme(savedTheme);
        this.updateThemeButtons(savedTheme);
    }

    // Update theme buttons
    updateThemeButtons(activeTheme) {
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            }
        });
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

        // Theme buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.utils.setTheme(theme);
                this.updateThemeButtons(theme);
                this.charts.updateCharts(); // Update charts with new theme colors
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
                    view.style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
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

    // Update dashboard with current stats
    updateDashboard() {
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
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                // Show advance payment progress
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                const progressPercent = Math.min((workCompleted / workRequired) * 100, 100);
                
                if (progressLabelEl) {
                    progressLabelEl.textContent = 'Progress to Workday';
                }
                if (progressTextEl) {
                    progressTextEl.textContent = `${workCompleted}/${workRequired} work days (Advance)`;
                }
                
                if (progressFillEl) {
                    progressFillEl.style.width = `${progressPercent}%`;
                    progressFillEl.style.backgroundColor = 'var(--warning)'; // Different color for advance
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
        this.updatePaidButtonVisibility();
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
    updatePaidButtonVisibility() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            if (this.pendingUnpaidDates.length >= 4) {
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
            const result = await this.db.addWorkRecord(today, 25, 'completed');
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
            this.notifications.showToast('Great job! You earned ₹25 today', 'success');
            
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
    async updatePendingDates() {
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
            await this.updatePendingDates();
            
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
        };

        // Remove existing listeners to prevent duplicates
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Payment button handlers - remove duplicates first
        paymentButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                const amount = parseInt(newBtn.dataset.amount);
                this.processPayment(amount, closeModal);
            });
        });
    }

    // Process the selected payment
    async processPayment(amount, closeModalCallback) {
        try {
            const pendingAmount = this.pendingUnpaidDates.length * 25;
            const isAdvancePayment = amount > pendingAmount;
            
            // Determine which work dates to mark as paid
            let workDatesToPay = [];
            if (pendingAmount > 0) {
                // Calculate how many days this payment covers
                const daysCovered = Math.min(Math.floor(amount / 25), this.pendingUnpaidDates.length);
                workDatesToPay = this.pendingUnpaidDates.slice(0, daysCovered);
            }
            
            // Add payment record
            await this.db.addPayment(amount, workDatesToPay, new Date().toISOString().split('T')[0], isAdvancePayment);
            
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
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            
            // Update pending dates (remove paid dates)
            this.pendingUnpaidDates = this.pendingUnpaidDates.slice(workDatesToPay.length);
            this.updatePaidButtonVisibility();
            
            // Update charts and calendar
            await this.charts.updateCharts();
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
            
        } catch (error) {
            console.error('Error recording payment:', error);
            this.notifications.showToast('Error recording payment. Please try again.', 'error');
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
        let html = `
            <table class="sheet-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Wage</th>
                        <th>Payment Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        records.forEach(record => {
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const isPaid = this.isRecordPaid(record, payments);
            
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
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
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
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('calendarView').style.display = 'block';
            
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
                    this.updateTodayStatus();
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
    
    // Show PWA install recommendation (enhanced)
    showPWARecommendation(deferredPrompt) {
        if (!deferredPrompt) return;
        
        // Check if user has previously dismissed permanently
        const permanentDismiss = localStorage.getItem('pwa-install-permanent-dismiss');
        const lastDismiss = localStorage.getItem('pwa-install-last-dismiss');
        const now = Date.now();
        
        // If permanently dismissed, don't show
        if (permanentDismiss) return;
        
        // If recently dismissed (within 7 days), don't show
        if (lastDismiss && (now - parseInt(lastDismiss)) < 7 * 24 * 60 * 60 * 1000) {
            return;
        }
        
        // Show recommendation based on usage patterns
        const installMessage = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: var(--border-radius); color: white;">
                <div style="font-size: 2rem;">📱</div>
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 0.25rem;">Install R-Service Tracker</strong>
                    <small style="opacity: 0.9;">Get faster access, offline support, and a native app experience!</small>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="pwa-install-btn" style="padding: 0.5rem 1rem; background: white; color: var(--primary); border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
                        Install Now
                    </button>
                    <button id="pwa-dismiss-btn" style="padding: 0.5rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                    <button id="pwa-never-btn" style="padding: 0.5rem; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                        Never
                    </button>
                </div>
            </div>
        `;
        
        const toast = this.notifications.showToast(installMessage, 'info', 0); // Show indefinitely
        
        // Handle install button click
        setTimeout(() => {
            const installBtn = document.getElementById('pwa-install-btn');
            const dismissBtn = document.getElementById('pwa-dismiss-btn');
            const neverBtn = document.getElementById('pwa-never-btn');
            
            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    try {
                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            const { outcome } = await deferredPrompt.userChoice;
                            console.log(`[PWA] User response: ${outcome}`);
                            
                            if (outcome === 'accepted') {
                                this.notifications.showToast('🎉 Installing R-Service Tracker...', 'success', 3000);
                            } else {
                                localStorage.setItem('pwa-install-last-dismiss', now.toString());
                            }
                            
                            deferredPrompt = null;
                            this.removePWAToast();
                        }
                    } catch (error) {
                        console.error('Error prompting PWA install:', error);
                        this.notifications.showToast('Install available through browser menu', 'info');
                        this.removePWAToast();
                    }
                });
            }
            
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    localStorage.setItem('pwa-install-last-dismiss', now.toString());
                    this.removePWAToast();
                });
            }
            
            if (neverBtn) {
                neverBtn.addEventListener('click', () => {
                    localStorage.setItem('pwa-install-permanent-dismiss', 'true');
                    this.removePWAToast();
                    this.notifications.showToast('PWA suggestions disabled. You can still install via browser menu.', 'info', 3000);
                });
            }
        }, 100);
    }
    
    // Remove PWA toast
    removePWAToast() {
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            if (toast.innerHTML.includes('Install R-Service Tracker')) {
                toast.remove();
            }
        });
    }
    
    // Show occasional PWA recommendations based on usage
    showOccasionalPWARecommendation() {
        // Only show if not installed and not permanently dismissed
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone ||
            localStorage.getItem('pwa-install-permanent-dismiss')) {
            return;
        }
        
        // Track app usage
        let usageCount = parseInt(localStorage.getItem('app-usage-count') || '0');
        usageCount++;
        localStorage.setItem('app-usage-count', usageCount.toString());
        
        // Show recommendation after certain usage milestones
        if (usageCount === 5) {
            setTimeout(() => {
                this.notifications.showToast(
                    `💡 You're using R-Service Tracker regularly! Consider installing it for faster access and offline support.`, 
                    'info', 
                    6000
                );
            }, 3000);
        } else if (usageCount === 15) {
            setTimeout(() => {
                this.notifications.showToast(
                    `🚀 Ready to take R-Service Tracker to the next level? Install it as an app for the best experience!`, 
                    'info', 
                    8000
                );
            }, 2000);
        } else if (usageCount % 25 === 0) {
            // Show occasionally after heavy usage
            setTimeout(() => {
                this.notifications.showToast(
                    `📲 Pro tip: Install R-Service Tracker as an app for instant access and better performance!`, 
                    'info', 
                    5000
                );
            }, 5000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RServiceTracker();
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