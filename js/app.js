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
            
            // Request notification permission on first visit
            await this.requestNotificationPermission();
            
            // Hide loading screen and show main app
            this.hideLoadingScreen();
            
            // Initialize views
            await this.initializeViews();
            
            this.isInitialized = true;
            console.log('R-Service Tracker initialized successfully');
            
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
            exportPDFBtn.addEventListener('click', () => this.handleExportPDF());
        }

        // About
        const aboutBtn = document.getElementById('aboutApp');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => this.showAboutModal());
        }

        // View history
        const viewHistoryBtn = document.getElementById('viewHistory');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => this.showBalanceSheet());
        }

        // View analytics
        const viewAnalyticsBtn = document.getElementById('viewAnalytics');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => this.showAnalytics());
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
            this.utils.animateCurrency(currentEarningsEl, 0, this.currentStats.currentBalance, 1500);
        }
        
        if (daysWorkedEl) {
            this.utils.animateValue(daysWorkedEl, 0, this.currentStats.totalWorked, 1000);
        }
        
        if (totalEarnedEl) {
            this.utils.animateCurrency(totalEarnedEl, 0, this.currentStats.totalEarned, 2000);
        }
        
        if (progressTextEl) {
            progressTextEl.textContent = `${this.currentStats.progressToPayday}/4 days`;
        }
        
        if (progressFillEl) {
            const progressPercent = (this.currentStats.progressToPayday / 4) * 100;
            progressFillEl.style.width = `${progressPercent}%`;
        }
        
        if (streakCountEl) {
            this.utils.animateValue(streakCountEl, 0, this.currentStats.currentStreak, 1200);
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
        
        this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
        
        // Check if we have 4 or more unpaid days
        if (this.pendingUnpaidDates.length >= 4) {
            this.showPaidButton();
            
            // Show payday notification
            this.notifications.showPaydayNotification();
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
            paidBtn.style.animation = 'fadeInUp 0.5s ease-in-out';
        }
    }

    // Hide paid button
    hidePaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'none';
        }
    }

    // Handle done button click
    async handleDoneClick() {
        try {
            const today = this.utils.getTodayString();
            
            // Check if already done today
            const existingRecord = await this.db.getWorkRecord(today);
            if (existingRecord && existingRecord.status === 'completed') {
                this.notifications.showToast('Work already marked as done for today!', 'warning');
                return;
            }
            
            // Add work record
            await this.db.addWorkRecord(today, 25, 'completed');
            
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
            if (this.pendingUnpaidDates.length < 4) {
                this.notifications.showToast('Need at least 4 days of unpaid work to record payment', 'warning');
                return;
            }
            
            // Take first 4 unpaid dates
            const paymentDates = this.pendingUnpaidDates.slice(0, 4);
            const paymentAmount = 100; // 4 days × ₹25
            
            // Add payment record
            await this.db.addPayment(paymentAmount, paymentDates);
            
            // Play sound
            this.notifications.playSound('paid');
            
            // Show success notification
            this.notifications.showPaymentNotification(paymentAmount);
            this.notifications.showToast(`Payment of ₹${paymentAmount} recorded successfully!`, 'success');
            
            // Update stats and UI
            this.currentStats = await this.db.getEarningsStats();
            this.updateDashboard();
            
            // Update pending dates
            this.pendingUnpaidDates = this.pendingUnpaidDates.slice(4);
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

    // Request notification permission
    async requestNotificationPermission() {
        try {
            const hasShownBefore = this.utils.loadFromLocalStorage('notification-permission-requested');
            if (!hasShownBefore) {
                await this.notifications.requestPermission();
                this.utils.saveToLocalStorage('notification-permission-requested', true);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
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
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            // Sort records by date (newest first)
            const sortedRecords = workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Create table
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
            }
            
            // Update filters
            this.updateBalanceSheetFilters(sortedRecords);
            
        } catch (error) {
            console.error('Error rendering balance sheet:', error);
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
        // Implementation for filtering would go here
        // For now, just re-render the full table
        await this.renderBalanceSheet();
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
        this.notifications.showConfirmation(
            'Are you sure you want to clear all data? This action cannot be undone.',
            async () => {
                try {
                    const success = await this.db.clearAllData();
                    if (success) {
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
                        
                    } else {
                        this.notifications.showToast('Error clearing data', 'error');
                    }
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.notifications.showToast('Error clearing data', 'error');
                }
            }
        );
    }

    // Handle export PDF
    async handleExportPDF() {
        try {
            const loadingToast = this.notifications.showLoadingToast('Generating PDF...');
            
            const data = await this.generateExportData();
            const success = await this.utils.exportToPDF(data);
            
            if (success) {
                this.notifications.updateLoadingToast(loadingToast, 'PDF exported successfully!', 'success');
            } else {
                this.notifications.updateLoadingToast(loadingToast, 'Error exporting PDF', 'error');
            }
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.notifications.showToast('Error exporting PDF', 'error');
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