// R-Service Tracker - Premium JavaScript Application
// Version 1.0.0

class RServiceTracker {
    constructor() {
        this.dbName = 'RServiceTracker';
        this.dbVersion = 1;
        this.db = null;
        this.currentTheme = localStorage.getItem('theme') || 'orange-light';
        this.currentView = 'chart';
        this.currentMonth = new Date();
        this.chart = null;
        
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.initEventListeners();
        this.applyTheme();
        this.updateDisplay();
        this.checkPaymentEligibility();
        this.initChart();
        this.renderCalendar();
        this.updateBalanceSheet();
        this.setCurrentDate();
    }

    // Database Operations
    async initDatabase() {
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
                    const workStore = db.createObjectStore('workRecords', { 
                        keyPath: 'date' 
                    });
                    workStore.createIndex('month', 'month', { unique: false });
                    workStore.createIndex('year', 'year', { unique: false });
                }
                
                // Payment records store
                if (!db.objectStoreNames.contains('paymentRecords')) {
                    const paymentStore = db.createObjectStore('paymentRecords', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    paymentStore.createIndex('date', 'date', { unique: false });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveWorkRecord(date, amount = 25) {
        const transaction = this.db.transaction(['workRecords'], 'readwrite');
        const store = transaction.objectStore('workRecords');
        
        const record = {
            date: date,
            amount: amount,
            timestamp: new Date().toISOString(),
            month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            year: date.getFullYear()
        };
        
        await store.put(record);
        return record;
    }

    async getWorkRecords(startDate = null, endDate = null) {
        const transaction = this.db.transaction(['workRecords'], 'readonly');
        const store = transaction.objectStore('workRecords');
        
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                let records = request.result;
                
                if (startDate || endDate) {
                    records = records.filter(record => {
                        const recordDate = new Date(record.date);
                        return (!startDate || recordDate >= startDate) && 
                               (!endDate || recordDate <= endDate);
                    });
                }
                
                resolve(records.sort((a, b) => new Date(a.date) - new Date(b.date)));
            };
        });
    }

    async savePaymentRecord(amount, workDays) {
        const transaction = this.db.transaction(['paymentRecords'], 'readwrite');
        const store = transaction.objectStore('paymentRecords');
        
        const record = {
            date: new Date().toISOString(),
            amount: amount,
            workDays: workDays,
            timestamp: new Date().toISOString()
        };
        
        await store.add(record);
        return record;
    }

    async getPaymentRecords() {
        const transaction = this.db.transaction(['paymentRecords'], 'readonly');
        const store = transaction.objectStore('paymentRecords');
        
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                resolve(request.result.sort((a, b) => new Date(a.date) - new Date(b.date)));
            };
        });
    }

    async clearAllData() {
        const transaction = this.db.transaction(['workRecords', 'paymentRecords'], 'readwrite');
        await transaction.objectStore('workRecords').clear();
        await transaction.objectStore('paymentRecords').clear();
        this.updateDisplay();
        this.updateBalanceSheet();
        this.initChart();
        this.renderCalendar();
    }

    // Event Listeners
    initEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('active');
        });

        document.getElementById('closeMenu').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('active');
        });

        // Click outside menu to close
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('sideMenu');
            const toggle = document.getElementById('menuToggle');
            
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                menu.classList.remove('active');
            }
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            const themeOptions = document.querySelector('.theme-options');
            const menuItem = document.getElementById('themeToggle');
            
            if (menuItem.classList.contains('active')) {
                menuItem.classList.remove('active');
            } else {
                menuItem.classList.add('active');
            }
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTheme(btn.dataset.theme);
                document.getElementById('sideMenu').classList.remove('active');
                document.getElementById('themeToggle').classList.remove('active');
            });
        });

        // Menu items
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.showView('balance');
            document.getElementById('sideMenu').classList.remove('active');
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                this.clearAllData();
                this.showNotification('All data cleared successfully!', 'success');
            }
            document.getElementById('sideMenu').classList.remove('active');
        });

        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.showAboutModal();
            document.getElementById('sideMenu').classList.remove('active');
        });

        // Work button
        document.getElementById('workBtn').addEventListener('click', () => {
            this.recordWork();
        });

        // Collect payment button
        document.getElementById('collectBtn').addEventListener('click', () => {
            this.collectPayment();
        });

        // View toggles
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showView(btn.dataset.view);
            });
        });

        // Chart controls
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateChart(btn.dataset.period);
            });
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });

        // Export buttons
        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        document.getElementById('exportEmail').addEventListener('click', () => {
            this.exportToEmail();
        });

        // Modal close
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('aboutModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
    }

    // Theme Management
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        
        // Update theme button states
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });
    }

    // Work Management
    async recordWork() {
        const today = new Date();
        const todayStr = today.toDateString();
        
        // Check if already worked today
        const existingRecords = await this.getWorkRecords();
        const todayRecord = existingRecords.find(record => 
            new Date(record.date).toDateString() === todayStr
        );
        
        if (todayRecord) {
            this.showNotification('You have already recorded work for today!', 'warning');
            return;
        }
        
        // Save work record
        await this.saveWorkRecord(today, 25);
        
        // Update display
        this.updateDisplay();
        this.checkPaymentEligibility();
        this.updateBalanceSheet();
        this.initChart();
        this.renderCalendar();
        
        this.showNotification('Work recorded successfully! ₹25 added to pending amount.', 'success');
    }

    async checkPaymentEligibility() {
        const records = await this.getWorkRecords();
        const consecutiveDays = this.getConsecutiveWorkDays(records);
        
        if (consecutiveDays >= 4) {
            const pendingAmount = await this.calculatePendingAmount();
            if (pendingAmount >= 100) {
                document.getElementById('paymentNotification').style.display = 'block';
            }
        } else {
            document.getElementById('paymentNotification').style.display = 'none';
        }
    }

    getConsecutiveWorkDays(records) {
        if (records.length === 0) return 0;
        
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        let consecutive = 0;
        let currentDate = new Date();
        
        for (let i = 0; i < sortedRecords.length; i++) {
            const recordDate = new Date(sortedRecords[i].date);
            const expectedDate = new Date(currentDate);
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (recordDate.toDateString() === expectedDate.toDateString()) {
                consecutive++;
            } else {
                break;
            }
        }
        
        return consecutive;
    }

    async collectPayment() {
        const records = await this.getWorkRecords();
        const consecutiveDays = this.getConsecutiveWorkDays(records);
        
        if (consecutiveDays >= 4) {
            const paymentAmount = Math.floor(consecutiveDays / 4) * 100;
            await this.savePaymentRecord(paymentAmount, consecutiveDays);
            
            document.getElementById('paymentNotification').style.display = 'none';
            this.updateDisplay();
            this.updateBalanceSheet();
            
            this.showNotification(`Payment of ₹${paymentAmount} collected successfully!`, 'success');
        }
    }

    // Display Updates
    async updateDisplay() {
        const records = await this.getWorkRecords();
        const payments = await this.getPaymentRecords();
        
        const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const pendingAmount = await this.calculatePendingAmount();
        const workStreak = this.getConsecutiveWorkDays(records);
        
        document.getElementById('totalEarnings').textContent = `₹${totalEarnings}`;
        document.getElementById('pendingAmount').textContent = `₹${pendingAmount}`;
        document.getElementById('workStreak').textContent = workStreak;
        
        // Update work button state
        const today = new Date();
        const todayStr = today.toDateString();
        const todayRecord = records.find(record => 
            new Date(record.date).toDateString() === todayStr
        );
        
        const workBtn = document.getElementById('workBtn');
        const workStatus = document.getElementById('workStatus');
        
        if (todayRecord) {
            workBtn.disabled = true;
            workBtn.innerHTML = '<i class="fas fa-check"></i><span>Work Completed</span>';
            workStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Work completed for today</span>';
        } else {
            workBtn.disabled = false;
            workBtn.innerHTML = '<i class="fas fa-play"></i><span>Mark Work Done</span>';
            workStatus.innerHTML = '<i class="fas fa-clock"></i><span>Ready to start work</span>';
        }
    }

    async calculatePendingAmount() {
        const records = await this.getWorkRecords();
        const payments = await this.getPaymentRecords();
        
        const totalWorked = records.reduce((sum, record) => sum + record.amount, 0);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        return totalWorked - totalPaid;
    }

    setCurrentDate() {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', options);
    }

    // View Management
    showView(viewName) {
        this.currentView = viewName;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        // Show/hide view content
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelector(`.${viewName}-view`).classList.add('active');
        
        // Initialize view-specific content
        if (viewName === 'chart') {
            setTimeout(() => this.initChart(), 100);
        } else if (viewName === 'calendar') {
            this.renderCalendar();
        } else if (viewName === 'balance') {
            this.updateBalanceSheet();
        }
    }

    // Chart Management
    async initChart() {
        const ctx = document.getElementById('earningsChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const records = await this.getWorkRecords();
        const chartData = await this.getChartData('month', records);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Daily Earnings (₹)',
                    data: chartData.earnings,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--shadow-light').trim(),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
                        },
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            },
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    async updateChart(period) {
        if (!this.chart) return;
        
        const records = await this.getWorkRecords();
        const chartData = await this.getChartData(period, records);
        
        this.chart.data.labels = chartData.labels;
        this.chart.data.datasets[0].data = chartData.earnings;
        this.chart.update();
    }

    async getChartData(period, records) {
        const now = new Date();
        let labels = [];
        let earnings = [];
        
        if (period === 'week') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
                
                const dayRecord = records.find(record => 
                    new Date(record.date).toDateString() === date.toDateString()
                );
                earnings.push(dayRecord ? dayRecord.amount : 0);
            }
        } else if (period === 'month') {
            // Last 30 days
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                labels.push(date.getDate().toString());
                
                const dayRecord = records.find(record => 
                    new Date(record.date).toDateString() === date.toDateString()
                );
                earnings.push(dayRecord ? dayRecord.amount : 0);
            }
        } else if (period === 'year') {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
                
                const monthRecords = records.filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate.getMonth() === date.getMonth() && 
                           recordDate.getFullYear() === date.getFullYear();
                });
                
                const monthTotal = monthRecords.reduce((sum, record) => sum + record.amount, 0);
                earnings.push(monthTotal);
            }
        }
        
        return { labels, earnings };
    }

    // Calendar Management
    async renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const records = await this.getWorkRecords();
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            header.style.fontWeight = '600';
            header.style.textAlign = 'center';
            header.style.padding = '10px';
            header.style.color = 'var(--text-secondary)';
            calendarGrid.appendChild(header);
        });
        
        // Add calendar days
        const current = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = current.getDate();
            
            // Check if day is in current month
            if (current.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            // Check if day is today
            if (current.toDateString() === new Date().toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Check if work was done on this day
            const dayRecord = records.find(record => 
                new Date(record.date).toDateString() === current.toDateString()
            );
            if (dayRecord) {
                dayElement.classList.add('worked');
                dayElement.title = `Work completed: ₹${dayRecord.amount}`;
            }
            
            calendarGrid.appendChild(dayElement);
            current.setDate(current.getDate() + 1);
        }
    }

    // Balance Sheet Management
    async updateBalanceSheet() {
        const records = await this.getWorkRecords();
        const payments = await this.getPaymentRecords();
        const balanceContent = document.getElementById('balanceContent');
        
        // Group records by month
        const monthlyData = {};
        records.forEach(record => {
            const monthKey = record.month;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    workDays: 0,
                    totalEarned: 0,
                    records: []
                };
            }
            monthlyData[monthKey].workDays++;
            monthlyData[monthKey].totalEarned += record.amount;
            monthlyData[monthKey].records.push(record);
        });
        
        let html = '<div class="balance-sheet">';
        
        // Summary section
        const totalWorked = records.reduce((sum, record) => sum + record.amount, 0);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const pendingAmount = totalWorked - totalPaid;
        
        html += `
            <div class="summary-section">
                <h4>Summary</h4>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <span class="label">Total Days Worked:</span>
                        <span class="value">${records.length}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="label">Total Earned:</span>
                        <span class="value">₹${totalWorked}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="label">Total Paid:</span>
                        <span class="value">₹${totalPaid}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="label">Pending Amount:</span>
                        <span class="value">₹${pendingAmount}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Monthly breakdown
        const sortedMonths = Object.keys(monthlyData).sort().reverse();
        
        if (sortedMonths.length > 0) {
            html += '<div class="monthly-breakdown">';
            html += '<h4>Monthly Breakdown</h4>';
            
            sortedMonths.forEach(monthKey => {
                const monthData = monthlyData[monthKey];
                const monthName = new Date(monthKey + '-01').toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                
                html += `
                    <div class="month-section">
                        <div class="month-header">
                            <h5>${monthName}</h5>
                            <div class="month-stats">
                                <span>${monthData.workDays} days</span>
                                <span>₹${monthData.totalEarned}</span>
                            </div>
                        </div>
                        <div class="month-details">
                `;
                
                monthData.records
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .forEach(record => {
                        const date = new Date(record.date);
                        html += `
                            <div class="work-record">
                                <span class="record-date">${date.toLocaleDateString('en-US', { 
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                })}</span>
                                <span class="record-amount">₹${record.amount}</span>
                            </div>
                        `;
                    });
                
                html += '</div></div>';
            });
            
            html += '</div>';
        }
        
        // Payment history
        if (payments.length > 0) {
            html += '<div class="payment-history">';
            html += '<h4>Payment History</h4>';
            
            payments
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(payment => {
                    const date = new Date(payment.date);
                    html += `
                        <div class="payment-record">
                            <span class="payment-date">${date.toLocaleDateString('en-US', { 
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}</span>
                            <span class="payment-amount">₹${payment.amount}</span>
                            <span class="payment-days">${payment.workDays} days</span>
                        </div>
                    `;
                });
            
            html += '</div>';
        }
        
        html += '</div>';
        
        // Add CSS for balance sheet
        const style = `
            <style>
                .balance-sheet {
                    font-family: 'Inter', sans-serif;
                }
                .summary-section, .monthly-breakdown, .payment-history {
                    margin-bottom: 30px;
                }
                .summary-section h4, .monthly-breakdown h4, .payment-history h4 {
                    margin-bottom: 15px;
                    color: var(--primary-color);
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                .summary-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                .summary-stat {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 15px;
                    background: var(--surface-color);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                .summary-stat .label {
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .summary-stat .value {
                    font-weight: 600;
                    color: var(--primary-color);
                }
                .month-section {
                    margin-bottom: 20px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .month-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    background: var(--surface-color);
                    border-bottom: 1px solid var(--border-color);
                }
                .month-header h5 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                .month-stats {
                    display: flex;
                    gap: 15px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .month-details {
                    padding: 10px;
                }
                .work-record, .payment-record {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 15px;
                    margin-bottom: 5px;
                    background: var(--surface-color);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .record-date, .payment-date {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .record-amount, .payment-amount {
                    font-weight: 600;
                    color: var(--success-color);
                }
                .payment-days {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                @media (max-width: 768px) {
                    .summary-stats {
                        grid-template-columns: 1fr;
                    }
                    .month-header {
                        flex-direction: column;
                        gap: 10px;
                        align-items: stretch;
                    }
                    .work-record, .payment-record {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 5px;
                    }
                }
            </style>
        `;
        
        balanceContent.innerHTML = style + html;
    }

    // Export Functions
    async exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add title
            pdf.setFontSize(20);
            pdf.text('R-Service Tracker Report', 20, 30);
            
            // Add generation date
            pdf.setFontSize(12);
            pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
            
            // Get data
            const records = await this.getWorkRecords();
            const payments = await this.getPaymentRecords();
            
            // Summary
            const totalWorked = records.reduce((sum, record) => sum + record.amount, 0);
            const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const pendingAmount = totalWorked - totalPaid;
            
            pdf.setFontSize(14);
            pdf.text('Summary:', 20, 65);
            pdf.setFontSize(12);
            pdf.text(`Total Days Worked: ${records.length}`, 30, 80);
            pdf.text(`Total Earned: ₹${totalWorked}`, 30, 95);
            pdf.text(`Total Paid: ₹${totalPaid}`, 30, 110);
            pdf.text(`Pending Amount: ₹${pendingAmount}`, 30, 125);
            
            // Work Records
            if (records.length > 0) {
                pdf.setFontSize(14);
                pdf.text('Work Records:', 20, 150);
                
                let yPos = 165;
                pdf.setFontSize(10);
                
                records.slice(-20).forEach(record => { // Last 20 records
                    const date = new Date(record.date).toLocaleDateString();
                    pdf.text(`${date} - ₹${record.amount}`, 30, yPos);
                    yPos += 15;
                    
                    if (yPos > 270) {
                        pdf.addPage();
                        yPos = 30;
                    }
                });
            }
            
            // Save PDF
            pdf.save('r-service-tracker-report.pdf');
            this.showNotification('PDF exported successfully!', 'success');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.showNotification('Failed to export PDF. Please try again.', 'error');
        }
    }

    async exportToEmail() {
        try {
            const records = await this.getWorkRecords();
            const payments = await this.getPaymentRecords();
            
            const totalWorked = records.reduce((sum, record) => sum + record.amount, 0);
            const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const pendingAmount = totalWorked - totalPaid;
            
            const emailBody = `
R-Service Tracker Report
Generated on: ${new Date().toLocaleDateString()}

SUMMARY:
- Total Days Worked: ${records.length}
- Total Earned: ₹${totalWorked}
- Total Paid: ₹${totalPaid}
- Pending Amount: ₹${pendingAmount}

RECENT WORK RECORDS:
${records.slice(-10).map(record => 
    `${new Date(record.date).toLocaleDateString()} - ₹${record.amount}`
).join('\n')}

PAYMENT HISTORY:
${payments.map(payment => 
    `${new Date(payment.date).toLocaleDateString()} - ₹${payment.amount} (${payment.workDays} days)`
).join('\n')}

Generated by R-Service Tracker v1.0.0
            `.trim();
            
            const mailtoLink = `mailto:?subject=R-Service Tracker Report&body=${encodeURIComponent(emailBody)}`;
            window.location.href = mailtoLink;
            
            this.showNotification('Email client opened with report data!', 'success');
            
        } catch (error) {
            console.error('Email export error:', error);
            this.showNotification('Failed to prepare email. Please try again.', 'error');
        }
    }

    // Modal Management
    showAboutModal() {
        document.getElementById('aboutModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('aboutModal').classList.remove('active');
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
            min-width: 300px;
            max-width: 400px;
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 18px;
            box-shadow: 0 8px 30px var(--shadow-heavy);
            animation: slideInRight 0.3s ease;
        `;
        
        const content = notification.querySelector('.notification-content');
        content.style.cssText = `
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
        `;
        
        const messageEl = notification.querySelector('.notification-message');
        messageEl.style.cssText = `
            flex: 1;
            color: var(--text-primary);
            font-weight: 500;
            line-height: 1.4;
        `;
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Add type-specific styling
        if (type === 'success') {
            notification.style.borderLeftColor = 'var(--success-color)';
            notification.style.borderLeftWidth = '4px';
        } else if (type === 'warning') {
            notification.style.borderLeftColor = 'var(--warning-color)';
            notification.style.borderLeftWidth = '4px';
        } else if (type === 'error') {
            notification.style.borderLeftColor = 'var(--error-color)';
            notification.style.borderLeftWidth = '4px';
        }
        
        // Add animation styles
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
        `;
        document.head.appendChild(style);
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Close button functionality
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RServiceTracker();
});

// Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed');
            });
    });
}