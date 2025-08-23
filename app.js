// R-Service Tracker Application
class RServiceTracker {
    constructor() {
        this.dbName = 'RServiceDB';
        this.dbVersion = 1;
        this.db = null;
        this.dailyWage = 25;
        this.paymentThreshold = 4; // 4 consecutive days = 100 rupees
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        
        this.init();
    }

    async init() {
        await this.initDB();
        await this.loadData();
        this.setupEventListeners();
        this.checkWorkStatus();
        this.updateCalendar();
        this.loadTheme();
    }

    // IndexedDB Setup
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Work records store
                if (!db.objectStoreNames.contains('workRecords')) {
                    const workStore = db.createObjectStore('workRecords', { keyPath: 'id', autoIncrement: true });
                    workStore.createIndex('date', 'date', { unique: false });
                    workStore.createIndex('year', 'year', { unique: false });
                    workStore.createIndex('month', 'month', { unique: false });
                    workStore.createIndex('week', 'week', { unique: false });
                }
                
                // Payment records store
                if (!db.objectStoreNames.contains('payments')) {
                    const paymentStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    paymentStore.createIndex('date', 'date', { unique: false });
                    paymentStore.createIndex('amount', 'amount', { unique: false });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Data Operations
    async addWorkRecord(date) {
        const transaction = this.db.transaction(['workRecords'], 'readwrite');
        const store = transaction.objectStore('workRecords');
        
        const record = {
            date: date.toISOString().split('T')[0],
            timestamp: date.getTime(),
            wage: this.dailyWage,
            year: date.getFullYear(),
            month: date.getMonth(),
            week: this.getWeekNumber(date),
            paid: false
        };
        
        await store.add(record);
        return record;
    }

    async getWorkRecords() {
        const transaction = this.db.transaction(['workRecords'], 'readonly');
        const store = transaction.objectStore('workRecords');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addPayment(amount, workRecords) {
        const transaction = this.db.transaction(['payments', 'workRecords'], 'readwrite');
        const paymentStore = transaction.objectStore('payments');
        const workStore = transaction.objectStore('workRecords');
        
        const payment = {
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            timestamp: Date.now(),
            workRecordIds: workRecords.map(r => r.id)
        };
        
        await paymentStore.add(payment);
        
        // Mark work records as paid
        for (const record of workRecords) {
            record.paid = true;
            await workStore.put(record);
        }
        
        return payment;
    }

    async getPayments() {
        const transaction = this.db.transaction(['payments'], 'readonly');
        const store = transaction.objectStore('payments');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Core Functionality
    async recordWork() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if already worked today
        const records = await this.getWorkRecords();
        const todayRecord = records.find(r => r.date === todayStr);
        
        if (todayRecord) {
            this.showNotification('You have already recorded work for today!', 'warning');
            return;
        }
        
        // Add work record
        await this.addWorkRecord(today);
        
        // Check for payment eligibility
        await this.checkPaymentEligibility();
        
        // Update UI
        await this.loadData();
        this.checkWorkStatus();
        this.updateCalendar();
        
        this.showNotification('Work recorded successfully! ₹25 added to pending amount.', 'success');
    }

    async checkPaymentEligibility() {
        const records = await this.getWorkRecords();
        const unpaidRecords = records.filter(r => !r.paid).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Check for consecutive days
        let consecutiveGroups = [];
        let currentGroup = [];
        
        for (let i = 0; i < unpaidRecords.length; i++) {
            const currentDate = new Date(unpaidRecords[i].date);
            
            if (currentGroup.length === 0) {
                currentGroup = [unpaidRecords[i]];
            } else {
                const lastDate = new Date(currentGroup[currentGroup.length - 1].date);
                const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    currentGroup.push(unpaidRecords[i]);
                } else {
                    if (currentGroup.length >= this.paymentThreshold) {
                        consecutiveGroups.push([...currentGroup]);
                    }
                    currentGroup = [unpaidRecords[i]];
                }
            }
        }
        
        // Check final group
        if (currentGroup.length >= this.paymentThreshold) {
            consecutiveGroups.push(currentGroup);
        }
        
        // Process payments for eligible groups
        for (const group of consecutiveGroups) {
            const paymentAmount = group.length * this.dailyWage;
            await this.addPayment(paymentAmount, group);
            
            this.showNotification(
                `🎉 Payment Day! You've earned ₹${paymentAmount} for ${group.length} consecutive days of work!`,
                'success',
                5000
            );
        }
    }

    async loadData() {
        const records = await this.getWorkRecords();
        const payments = await this.getPayments();
        
        // Calculate statistics
        const totalDays = records.length;
        const unpaidRecords = records.filter(r => !r.paid);
        const pendingAmount = unpaidRecords.length * this.dailyWage;
        const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate current streak
        const currentStreak = this.calculateCurrentStreak(records);
        
        // Update UI
        document.getElementById('total-days').textContent = totalDays;
        document.getElementById('total-pending').textContent = `₹${pendingAmount}`;
        document.getElementById('total-received').textContent = `₹${totalReceived}`;
        document.getElementById('current-streak').textContent = currentStreak;
        
        // Update strike counter
        this.updateStrikeCounter(unpaidRecords);
        
        // Update charts
        this.updateCharts(records, payments);
        
        // Update history
        this.updateHistory(records, payments);
    }

    calculateCurrentStreak(records) {
        if (records.length === 0) return 0;
        
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        let streak = 0;
        let currentDate = new Date();
        
        for (const record of sortedRecords) {
            const recordDate = new Date(record.date);
            const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === streak) {
                streak++;
                currentDate = recordDate;
            } else {
                break;
            }
        }
        
        return streak;
    }

    updateStrikeCounter(unpaidRecords) {
        const dots = document.querySelectorAll('.strike-dot');
        const unpaidCount = unpaidRecords.length % this.paymentThreshold;
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < unpaidCount);
        });
    }

    checkWorkStatus() {
        const today = new Date().toISOString().split('T')[0];
        const button = document.getElementById('work-button');
        const status = document.getElementById('work-status');
        
        this.getWorkRecords().then(records => {
            const todayRecord = records.find(r => r.date === today);
            
            if (todayRecord) {
                button.classList.add('disabled');
                button.innerHTML = '<mdui-icon name="check_circle"></mdui-icon>Work Completed Today';
                status.textContent = '✅ You have already recorded work for today. See you tomorrow!';
                status.style.color = 'var(--success-color)';
            } else {
                button.classList.remove('disabled');
                button.innerHTML = '<mdui-icon name="local_taxi"></mdui-icon>Mark Work Done';
                status.textContent = '🚗 Ready to record today\'s work? Click the button above!';
                status.style.color = 'var(--mdui-color-on-surface)';
            }
        });
    }

    // Calendar Functions
    updateCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('calendar-month').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;
        
        this.renderCalendarGrid();
    }

    async renderCalendarGrid() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.textContent = day;
            header.style.fontWeight = '600';
            header.style.textAlign = 'center';
            header.style.padding = '8px';
            header.style.fontSize = '0.8rem';
            header.style.color = 'var(--mdui-color-on-surface-variant)';
            grid.appendChild(header);
        });
        
        // Get work records for current month
        const records = await this.getWorkRecords();
        const monthRecords = records.filter(r => {
            const date = new Date(r.date);
            return date.getMonth() === this.currentMonth && date.getFullYear() === this.currentYear;
        });
        
        // Calculate calendar days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Generate calendar days
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDate.getDate();
            
            // Check if this day has work recorded
            const hasWork = monthRecords.some(r => {
                const recordDate = new Date(r.date);
                return recordDate.getDate() === currentDate.getDate();
            });
            
            if (hasWork) {
                dayElement.classList.add('worked');
            }
            
            // Check if today
            const today = new Date();
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Dim days outside current month
            if (currentDate.getMonth() !== this.currentMonth) {
                dayElement.style.opacity = '0.3';
            }
            
            grid.appendChild(dayElement);
        }
    }

    changeMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.updateCalendar();
    }

    // Charts and Analytics
    async updateCharts(records, payments) {
        await this.updateEarningsChart(records);
        await this.updateWeeklyChart(records);
        await this.updateMonthlyChart(records);
    }

    async updateEarningsChart(records) {
        const ctx = document.getElementById('earningsChart');
        if (!ctx) return;
        
        // Prepare data for last 30 days
        const last30Days = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last30Days.push({
                date: date.toISOString().split('T')[0],
                earnings: 0
            });
        }
        
        // Map earnings
        records.forEach(record => {
            const dayData = last30Days.find(d => d.date === record.date);
            if (dayData) {
                dayData.earnings = record.wage;
            }
        });
        
        if (this.earningsChart) {
            this.earningsChart.destroy();
        }
        
        this.earningsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(d => new Date(d.date).getDate()),
                datasets: [{
                    label: 'Daily Earnings (₹)',
                    data: last30Days.map(d => d.earnings),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Last 30 Days Earnings'
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

    async updateWeeklyChart(records) {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;
        
        // Group by week
        const weeklyData = {};
        records.forEach(record => {
            const week = record.week;
            const year = record.year;
            const key = `${year}-W${week}`;
            
            if (!weeklyData[key]) {
                weeklyData[key] = { count: 0, earnings: 0 };
            }
            weeklyData[key].count++;
            weeklyData[key].earnings += record.wage;
        });
        
        const sortedWeeks = Object.keys(weeklyData).sort().slice(-12); // Last 12 weeks
        
        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }
        
        this.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedWeeks,
                datasets: [{
                    label: 'Weekly Earnings (₹)',
                    data: sortedWeeks.map(week => weeklyData[week].earnings),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Earnings Trend'
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

    async updateMonthlyChart(records) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        // Group by month
        const monthlyData = {};
        records.forEach(record => {
            const month = record.month;
            const year = record.year;
            const key = `${year}-${month + 1}`;
            
            if (!monthlyData[key]) {
                monthlyData[key] = { count: 0, earnings: 0 };
            }
            monthlyData[key].count++;
            monthlyData[key].earnings += record.wage;
        });
        
        const sortedMonths = Object.keys(monthlyData).sort().slice(-12); // Last 12 months
        
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }
        
        this.monthlyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedMonths,
                datasets: [{
                    label: 'Monthly Earnings (₹)',
                    data: sortedMonths.map(month => monthlyData[month].earnings),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 205, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Distribution'
                    }
                }
            }
        });
    }

    // History Management
    async updateHistory(records, payments) {
        const historyContent = document.getElementById('history-content');
        if (!historyContent) return;
        
        historyContent.innerHTML = '';
        
        // Group by months
        const monthlyGroups = {};
        records.forEach(record => {
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            
            if (!monthlyGroups[monthKey]) {
                monthlyGroups[monthKey] = {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    records: [],
                    totalEarnings: 0
                };
            }
            
            monthlyGroups[monthKey].records.push(record);
            monthlyGroups[monthKey].totalEarnings += record.wage;
        });
        
        // Sort months in descending order
        const sortedMonths = Object.keys(monthlyGroups).sort().reverse();
        
        sortedMonths.forEach(monthKey => {
            const monthData = monthlyGroups[monthKey];
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            
            const monthSection = document.createElement('div');
            monthSection.className = 'month-section';
            
            const header = document.createElement('div');
            header.className = 'section-header';
            header.innerHTML = `
                <span>${monthNames[monthData.month]} ${monthData.year}</span>
                <span>₹${monthData.totalEarnings} (${monthData.records.length} days)</span>
            `;
            
            monthSection.appendChild(header);
            
            // Group records by weeks within the month
            const weeklyGroups = {};
            monthData.records.forEach(record => {
                const week = record.week;
                if (!weeklyGroups[week]) {
                    weeklyGroups[week] = [];
                }
                weeklyGroups[week].push(record);
            });
            
            Object.keys(weeklyGroups).sort().forEach(week => {
                const weekRecords = weeklyGroups[week];
                const weekSection = document.createElement('div');
                weekSection.className = 'week-section';
                
                const weekHeader = document.createElement('div');
                weekHeader.className = 'section-header';
                weekHeader.style.background = 'var(--mdui-color-secondary-container)';
                weekHeader.style.color = 'var(--mdui-color-on-secondary-container)';
                weekHeader.innerHTML = `
                    <span>Week ${week}</span>
                    <span>₹${weekRecords.length * this.dailyWage} (${weekRecords.length} days)</span>
                `;
                
                weekSection.appendChild(weekHeader);
                
                weekRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    const date = new Date(record.date);
                    const dateStr = date.toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    historyItem.innerHTML = `
                        <div>
                            <div style="font-weight: 500;">${dateStr}</div>
                            <div style="font-size: 0.9rem; color: var(--mdui-color-on-surface-variant);">
                                ${record.paid ? '✅ Paid' : '⏳ Pending'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: var(--success-color);">₹${record.wage}</div>
                        </div>
                    `;
                    
                    weekSection.appendChild(historyItem);
                });
                
                monthSection.appendChild(weekSection);
            });
            
            historyContent.appendChild(monthSection);
        });
        
        if (sortedMonths.length === 0) {
            historyContent.innerHTML = '<p style="text-align: center; padding: 40px;">No work history found. Start by recording your first work day!</p>';
        }
    }

    // Export Functions
    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('R-Service Tracker Report', 20, 30);
        
        // Date range
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 45);
        
        // Statistics
        const records = await this.getWorkRecords();
        const payments = await this.getPayments();
        
        const totalDays = records.length;
        const unpaidRecords = records.filter(r => !r.paid);
        const pendingAmount = unpaidRecords.length * this.dailyWage;
        const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
        
        doc.setFontSize(14);
        doc.text('Summary:', 20, 65);
        doc.setFontSize(12);
        doc.text(`Total Days Worked: ${totalDays}`, 30, 80);
        doc.text(`Pending Amount: ₹${pendingAmount}`, 30, 95);
        doc.text(`Total Received: ₹${totalReceived}`, 30, 110);
        doc.text(`Current Streak: ${this.calculateCurrentStreak(records)} days`, 30, 125);
        
        // Work History
        doc.setFontSize(14);
        doc.text('Recent Work History:', 20, 150);
        
        let yPosition = 165;
        const recentRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        
        doc.setFontSize(10);
        recentRecords.forEach(record => {
            const date = new Date(record.date).toLocaleDateString('en-IN');
            const status = record.paid ? 'Paid' : 'Pending';
            doc.text(`${date} - ₹${record.wage} (${status})`, 30, yPosition);
            yPosition += 15;
            
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 30;
            }
        });
        
        // Save PDF
        doc.save('r-service-tracker-report.pdf');
        this.showNotification('PDF report exported successfully!', 'success');
    }

    async exportToEmail() {
        // This would require EmailJS configuration
        this.showNotification('Email export feature coming soon!', 'info');
    }

    // Utility Functions
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('mdui-snackbar');
        notification.textContent = message;
        notification.className = 'notification';
        
        // Set color based on type
        switch(type) {
            case 'success':
                notification.style.background = 'var(--success-color)';
                break;
            case 'warning':
                notification.style.background = 'var(--warning-color)';
                break;
            case 'error':
                notification.style.background = 'var(--error-color)';
                break;
            default:
                notification.style.background = 'var(--primary-color)';
        }
        
        document.body.appendChild(notification);
        notification.open = true;
        
        setTimeout(() => {
            notification.open = false;
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }

    setupEventListeners() {
        // Theme toggle
        window.toggleTheme = () => this.toggleTheme();
        
        // Navigation
        window.toggleDrawer = () => {
            const drawer = document.getElementById('drawer');
            drawer.open = !drawer.open;
        };
        
        window.showSection = (sectionName) => this.showSection(sectionName);
        
        // Actions
        window.recordWork = () => this.recordWork();
        window.exportToPDF = () => this.exportToPDF();
        window.exportToEmail = () => this.exportToEmail();
        window.clearHistory = () => this.clearHistory();
        window.showAbout = () => this.showAbout();
        
        // Calendar
        window.changeMonth = (direction) => this.changeMonth(direction);
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = ['dashboard-section', 'analytics-section', 'calendar-section', 'history-section'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) element.style.display = 'none';
        });
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Refresh charts if analytics section
            if (sectionName === 'analytics') {
                setTimeout(() => this.loadData(), 100);
            }
        }
        
        // Close drawer
        document.getElementById('drawer').open = false;
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    async clearHistory() {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            const transaction = this.db.transaction(['workRecords', 'payments'], 'readwrite');
            await transaction.objectStore('workRecords').clear();
            await transaction.objectStore('payments').clear();
            
            await this.loadData();
            this.checkWorkStatus();
            this.updateCalendar();
            
            this.showNotification('History cleared successfully!', 'success');
        }
    }

    showAbout() {
        const aboutDialog = document.createElement('mdui-dialog');
        aboutDialog.innerHTML = `
            <mdui-dialog-headline>About R-Service Tracker</mdui-dialog-headline>
            <mdui-dialog-description>
                <div style="padding: 16px 0;">
                    <h4>R-Service Tracker v1.0.0</h4>
                    <p>A premium, modern web application for tracking daily driving service work and earnings.</p>
                    
                    <h4>Features:</h4>
                    <ul>
                        <li>Daily work recording with one-click</li>
                        <li>Automatic payment calculation (₹25/day, ₹100 after 4 consecutive days)</li>
                        <li>Advanced analytics and charts</li>
                        <li>Calendar view with work history</li>
                        <li>PDF export functionality</li>
                        <li>Dark/Light theme toggle</li>
                        <li>Responsive Material Design UI</li>
                        <li>Offline-capable with IndexedDB storage</li>
                    </ul>
                    
                    <h4>Technology Stack:</h4>
                    <ul>
                        <li>MDUI Framework</li>
                        <li>Chart.js for Analytics</li>
                        <li>IndexedDB for Local Storage</li>
                        <li>Progressive Web App (PWA) Ready</li>
                    </ul>
                    
                    <p style="margin-top: 20px; font-size: 0.9rem; color: var(--mdui-color-on-surface-variant);">
                        Built with ❤️ for service drivers
                    </p>
                </div>
            </mdui-dialog-description>
            <mdui-dialog-action slot="action">
                <mdui-button onclick="this.closest('mdui-dialog').open = false">Close</mdui-button>
            </mdui-dialog-action>
        `;
        
        document.body.appendChild(aboutDialog);
        aboutDialog.open = true;
        
        // Remove dialog after closing
        aboutDialog.addEventListener('closed', () => {
            document.body.removeChild(aboutDialog);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new RServiceTracker();
    
    // Register Service Worker for PWA functionality
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
});