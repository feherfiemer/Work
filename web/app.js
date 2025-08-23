// R-Service Tracker - Main Application Logic
class RServiceTracker {
    constructor() {
        this.db = null;
        this.dailyWage = 25;
        this.paymentThreshold = 100;
        this.init();
    }

    async init() {
        await this.initDatabase();
        await this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.setupTheme();
        this.checkNotifications();
    }

    // Database Operations
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('RServiceTracker', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Work records store
                if (!db.objectStoreNames.contains('workRecords')) {
                    const workStore = db.createObjectStore('workRecords', { keyPath: 'date' });
                    workStore.createIndex('date', 'date', { unique: true });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveWorkRecord(date, amount = this.dailyWage) {
        const transaction = this.db.transaction(['workRecords'], 'readwrite');
        const store = transaction.objectStore('workRecords');
        
        const record = {
            date: date,
            amount: amount,
            timestamp: new Date().toISOString()
        };
        
        return store.put(record);
    }

    async getAllWorkRecords() {
        const transaction = this.db.transaction(['workRecords'], 'readonly');
        const store = transaction.objectStore('workRecords');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        const transaction = this.db.transaction(['workRecords'], 'readwrite');
        const store = transaction.objectStore('workRecords');
        return store.clear();
    }

    async saveSetting(key, value) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return store.put({ key, value });
    }

    async getSetting(key, defaultValue = null) {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve) => {
            const request = store.get(key);
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : defaultValue);
            };
            request.onerror = () => resolve(defaultValue);
        });
    }

    // Data Processing
    async loadData() {
        this.workRecords = await this.getAllWorkRecords();
        this.workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getTotalEarnings() {
        return this.workRecords.reduce((total, record) => total + record.amount, 0);
    }

    getThisWeekEarnings() {
        const startOfWeek = this.getStartOfWeek(new Date());
        return this.workRecords
            .filter(record => new Date(record.date) >= startOfWeek)
            .reduce((total, record) => total + record.amount, 0);
    }

    getThisMonthEarnings() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.workRecords
            .filter(record => new Date(record.date) >= startOfMonth)
            .reduce((total, record) => total + record.amount, 0);
    }

    getCurrentStreak() {
        if (this.workRecords.length === 0) return 0;
        
        let streak = 0;
        const today = new Date();
        let checkDate = new Date(today);
        
        // Check if today is worked
        const todayStr = this.formatDate(today);
        if (!this.workRecords.some(record => record.date === todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        while (true) {
            const dateStr = this.formatDate(checkDate);
            if (this.workRecords.some(record => record.date === dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // UI Updates
    updateUI() {
        this.updateTodayDate();
        this.updateBalance();
        this.updateStats();
        this.updateDoneButton();
    }

    updateTodayDate() {
        const today = new Date();
        const todayElement = document.getElementById('todayDate');
        if (todayElement) {
            todayElement.textContent = this.formatDisplayDate(this.formatDate(today));
        }
    }

    updateBalance() {
        const total = this.getTotalEarnings();
        const daysWorked = this.workRecords.length;
        const nextPayment = this.paymentThreshold - (total % this.paymentThreshold);
        
        document.getElementById('currentBalance').textContent = `₹${total}`;
        document.getElementById('daysWorked').textContent = daysWorked;
        document.getElementById('nextPayment').textContent = 
            nextPayment === this.paymentThreshold ? '₹0 until next payment' : `₹${nextPayment} until next payment`;
    }

    updateStats() {
        document.getElementById('thisMonthEarnings').textContent = `₹${this.getThisMonthEarnings()}`;
        document.getElementById('thisWeekEarnings').textContent = `₹${this.getThisWeekEarnings()}`;
        document.getElementById('currentStreak').textContent = this.getCurrentStreak();
    }

    updateDoneButton() {
        const today = this.formatDate(new Date());
        const todayWorked = this.workRecords.some(record => record.date === today);
        const button = document.getElementById('doneButton');
        
        if (todayWorked) {
            button.disabled = true;
            button.innerHTML = '<mdui-icon slot="icon" name="check_circle"></mdui-icon>Completed Today';
            button.classList.add('success-state');
        } else {
            button.disabled = false;
            button.innerHTML = '<mdui-icon slot="icon" name="check_circle"></mdui-icon>Mark Complete';
            button.classList.remove('success-state');
        }
    }

    // Event Handlers
    setupEventListeners() {
        // Prevent multiple event listeners
        if (this.listenersSetup) return;
        this.listenersSetup = true;
    }

    async markDayComplete() {
        const today = this.formatDate(new Date());
        const todayWorked = this.workRecords.some(record => record.date === today);
        
        if (todayWorked) {
            this.showNotification('You have already completed work for today!', 'warning');
            return;
        }

        try {
            // Add loading state
            const button = document.getElementById('doneButton');
            button.classList.add('loading');
            
            await this.saveWorkRecord(today);
            await this.loadData();
            this.updateUI();
            
            button.classList.remove('loading');
            this.showNotification('Great job! Today\'s work has been recorded.', 'success');
            
            // Check if payment threshold reached
            this.checkPaymentNotification();
            
        } catch (error) {
            console.error('Error saving work record:', error);
            this.showNotification('Error saving work record. Please try again.', 'error');
        }
    }

    checkPaymentNotification() {
        const total = this.getTotalEarnings();
        const paymentsEarned = Math.floor(total / this.paymentThreshold);
        
        if (total > 0 && total % this.paymentThreshold === 0) {
            this.showNotification(
                `🎉 Congratulations! You've earned ₹${this.paymentThreshold}! Time to collect your payment!`,
                'success',
                5000
            );
        }
    }

    // Menu Functions
    openMenu() {
        const menu = document.getElementById('navigationMenu');
        menu.open = true;
    }

    closeMenu() {
        const menu = document.getElementById('navigationMenu');
        menu.open = false;
    }

    // Theme Management
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('mdui-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        this.closeMenu();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('mdui-theme', theme);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.setAttribute('name', theme === 'light' ? 'dark_mode' : 'light_mode');
        }
    }

    // History Display
    showHistory() {
        this.closeMenu();
        const dialog = document.getElementById('historyDialog');
        const content = document.getElementById('historyContent');
        
        content.innerHTML = this.generateHistoryHTML();
        dialog.open = true;
    }

    generateHistoryHTML() {
        if (this.workRecords.length === 0) {
            return '<p style="text-align: center; color: var(--on-surface-variant); padding: 2rem;">No work records found. Start by marking a day complete!</p>';
        }

        const groupedRecords = this.groupRecordsByPeriod();
        let html = '';

        // Generate month sections
        Object.keys(groupedRecords.months).forEach(monthKey => {
            const monthData = groupedRecords.months[monthKey];
            const monthTotal = monthData.records.reduce((sum, record) => sum + record.amount, 0);
            
            html += `
                <div class="period-section">
                    <div class="period-header">
                        <span>${monthData.name}</span>
                        <span class="period-total">₹${monthTotal}</span>
                    </div>
                    ${monthData.records.map(record => `
                        <div class="history-item">
                            <div class="history-date">${this.formatDisplayDate(record.date)}</div>
                            <div class="history-amount">₹${record.amount}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        return html;
    }

    groupRecordsByPeriod() {
        const months = {};
        const weeks = {};
        
        this.workRecords.forEach(record => {
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    name: monthName,
                    records: []
                };
            }
            months[monthKey].records.push(record);
        });

        return { months, weeks };
    }

    // Analytics
    showAnalytics() {
        this.closeMenu();
        const dialog = document.getElementById('analyticsDialog');
        dialog.open = true;
        
        // Wait for dialog to open then render chart
        setTimeout(() => {
            this.renderEarningsChart();
            this.updateAnalyticsStats();
        }, 100);
    }

    renderEarningsChart() {
        const canvas = document.getElementById('earningsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Prepare data for last 30 days
        const last30Days = [];
        const earningsData = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDate(date);
            
            last30Days.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
            
            const record = this.workRecords.find(r => r.date === dateStr);
            earningsData.push(record ? record.amount : 0);
        }

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days,
                datasets: [{
                    label: 'Daily Earnings (₹)',
                    data: earningsData,
                    borderColor: '#6750A4',
                    backgroundColor: 'rgba(103, 80, 164, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateAnalyticsStats() {
        const statsContainer = document.getElementById('analyticsStats');
        const totalEarnings = this.getTotalEarnings();
        const avgDaily = this.workRecords.length > 0 ? (totalEarnings / this.workRecords.length).toFixed(2) : 0;
        const totalDays = this.workRecords.length;
        const currentStreak = this.getCurrentStreak();

        statsContainer.innerHTML = `
            <div class="analytics-stat-item">
                <div class="analytics-stat-value">₹${totalEarnings}</div>
                <div class="analytics-stat-label">Total Earned</div>
            </div>
            <div class="analytics-stat-item">
                <div class="analytics-stat-value">₹${avgDaily}</div>
                <div class="analytics-stat-label">Avg per Day</div>
            </div>
            <div class="analytics-stat-item">
                <div class="analytics-stat-value">${totalDays}</div>
                <div class="analytics-stat-label">Total Days</div>
            </div>
            <div class="analytics-stat-item">
                <div class="analytics-stat-value">${currentStreak}</div>
                <div class="analytics-stat-label">Current Streak</div>
            </div>
        `;
    }

    // Export Functions
    exportPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(20);
            doc.text('R-Service Tracker - Balance Sheet', 20, 30);
            
            // Summary
            doc.setFontSize(12);
            const totalEarnings = this.getTotalEarnings();
            const totalDays = this.workRecords.length;
            
            doc.text(`Total Earnings: ₹${totalEarnings}`, 20, 50);
            doc.text(`Total Days Worked: ${totalDays}`, 20, 60);
            doc.text(`Average per Day: ₹${totalDays > 0 ? (totalEarnings / totalDays).toFixed(2) : 0}`, 20, 70);
            doc.text(`Current Streak: ${this.getCurrentStreak()} days`, 20, 80);
            
            // Records table
            doc.text('Work Records:', 20, 100);
            
            let yPosition = 110;
            doc.setFontSize(10);
            
            this.workRecords.forEach((record, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 30;
                }
                
                const date = this.formatDisplayDate(record.date);
                doc.text(`${date}`, 20, yPosition);
                doc.text(`₹${record.amount}`, 150, yPosition);
                yPosition += 10;
            });
            
            // Save the PDF
            doc.save('r-service-tracker-balance-sheet.pdf');
            this.showNotification('PDF exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showNotification('Error exporting PDF. Please try again.', 'error');
        }
    }

    exportData() {
        this.closeMenu();
        const options = [
            { text: 'Export as PDF', action: () => this.exportPDF() },
            { text: 'Export via Email', action: () => this.exportEmail() }
        ];
        
        // Create a simple selection dialog
        this.showExportDialog(options);
    }

    showExportDialog(options) {
        const dialog = document.createElement('mdui-dialog');
        dialog.innerHTML = `
            <mdui-dialog-header>
                <mdui-dialog-title>Export Options</mdui-dialog-title>
            </mdui-dialog-header>
            <mdui-dialog-body>
                <mdui-list>
                    ${options.map((option, index) => `
                        <mdui-list-item onclick="window.tracker.handleExportOption(${index})">
                            <mdui-icon slot="icon" name="${index === 0 ? 'picture_as_pdf' : 'email'}"></mdui-icon>
                            <div slot="headline">${option.text}</div>
                        </mdui-list-item>
                    `).join('')}
                </mdui-list>
            </mdui-dialog-body>
            <mdui-dialog-actions>
                <mdui-button variant="text" onclick="this.closest('mdui-dialog').open = false">Cancel</mdui-button>
            </mdui-dialog-actions>
        `;
        
        document.body.appendChild(dialog);
        dialog.open = true;
        
        // Store options for callback
        this.exportOptions = options;
        
        // Clean up after dialog closes
        dialog.addEventListener('close', () => {
            document.body.removeChild(dialog);
            delete this.exportOptions;
        });
    }

    handleExportOption(index) {
        if (this.exportOptions && this.exportOptions[index]) {
            this.exportOptions[index].action();
        }
        // Close the dialog
        const dialog = document.querySelector('mdui-dialog[open]');
        if (dialog) dialog.open = false;
    }

    exportEmail() {
        const totalEarnings = this.getTotalEarnings();
        const totalDays = this.workRecords.length;
        const subject = 'R-Service Tracker - Balance Sheet';
        
        let body = `R-Service Tracker Balance Sheet\n\n`;
        body += `Total Earnings: ₹${totalEarnings}\n`;
        body += `Total Days Worked: ${totalDays}\n`;
        body += `Average per Day: ₹${totalDays > 0 ? (totalEarnings / totalDays).toFixed(2) : 0}\n`;
        body += `Current Streak: ${this.getCurrentStreak()} days\n\n`;
        body += `Work Records:\n`;
        body += `${'='.repeat(50)}\n`;
        
        this.workRecords.forEach(record => {
            body += `${this.formatDisplayDate(record.date)}: ₹${record.amount}\n`;
        });
        
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);
    }

    // Clear Data
    async clearData() {
        this.closeMenu();
        
        const confirmed = confirm('Are you sure you want to clear all data? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await this.clearAllData();
            await this.loadData();
            this.updateUI();
            this.showNotification('All data has been cleared.', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Error clearing data. Please try again.', 'error');
        }
    }

    // About Dialog
    showAbout() {
        this.closeMenu();
        const dialog = document.getElementById('aboutDialog');
        dialog.open = true;
    }

    // Utility Functions
    closeDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) dialog.open = false;
    }

    showNotification(message, type = 'info', duration = 3000) {
        const snackbar = document.getElementById('notificationSnackbar');
        const textElement = document.getElementById('notificationText');
        
        if (textElement) textElement.textContent = message;
        
        // Set color based on type
        if (type === 'success') {
            snackbar.style.setProperty('--mdui-comp-snackbar-container-color', '#4CAF50');
        } else if (type === 'error') {
            snackbar.style.setProperty('--mdui-comp-snackbar-container-color', '#F44336');
        } else if (type === 'warning') {
            snackbar.style.setProperty('--mdui-comp-snackbar-container-color', '#FF9800');
        } else {
            snackbar.style.setProperty('--mdui-comp-snackbar-container-color', '#6750A4');
        }
        
        snackbar.open = true;
        
        setTimeout(() => {
            snackbar.open = false;
        }, duration);
    }

    checkNotifications() {
        // Check if it's a payment day
        const total = this.getTotalEarnings();
        if (total > 0 && total % this.paymentThreshold === 0) {
            setTimeout(() => {
                this.showNotification('🎉 Payment day! You can collect your earnings!', 'success', 5000);
            }, 2000);
        }
    }
}

// Global Functions (for HTML onclick handlers)
window.markDayComplete = () => window.tracker.markDayComplete();
window.openMenu = () => window.tracker.openMenu();
window.closeMenu = () => window.tracker.closeMenu();
window.toggleTheme = () => window.tracker.toggleTheme();
window.showHistory = () => window.tracker.showHistory();
window.showAnalytics = () => window.tracker.showAnalytics();
window.exportPDF = () => window.tracker.exportPDF();
window.exportData = () => window.tracker.exportData();
window.clearData = () => window.tracker.clearData();
window.showAbout = () => window.tracker.showAbout();
window.closeDialog = (dialogId) => window.tracker.closeDialog(dialogId);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new RServiceTracker();
});

// Service Worker Registration (for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}