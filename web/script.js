// Job Tracker - Premium JavaScript Application
// Version 1.0.0

class JobTracker {
    constructor() {
        this.dbName = 'JobTracker';
        this.dbVersion = 1;
        this.db = null;
        this.currentTheme = localStorage.getItem('theme') || 'orange-light';
        this.currentView = 'chart';
        this.currentMonth = new Date();
        this.chart = null;
        this.notificationPermission = localStorage.getItem('notificationPermission') || 'default';
        
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
        this.checkNotificationPermission();
        this.setupRippleEffect();
        this.sendDailyReminder();
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

    // Notification System
    checkNotificationPermission() {
        if (this.notificationPermission === 'default' && 'Notification' in window) {
            setTimeout(() => {
                this.showNotificationBanner();
            }, 3000); // Show after 3 seconds
        }
    }

    showNotificationBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner) {
            banner.style.display = 'block';
            
            // Auto hide after 10 seconds
            setTimeout(() => {
                this.hideNotificationBanner();
            }, 10000);
        }
    }

    hideNotificationBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner) {
            banner.style.animation = 'bannerSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 400);
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            localStorage.setItem('notificationPermission', permission);
            
            if (permission === 'granted') {
                this.showNotification('Notifications enabled! You\'ll receive daily reminders.', 'success');
                this.showBrowserNotification('Job Tracker', {
                    body: 'Notifications are now enabled! We\'ll remind you to track your daily progress.',
                    icon: this.getNotificationIcon()
                });
            } else if (permission === 'denied') {
                this.showNotification('Notifications disabled. You can enable them later in browser settings.', 'warning');
            }
            
            this.hideNotificationBanner();
        }
    }

    showBrowserNotification(title, options = {}) {
        if (this.notificationPermission === 'granted' && 'Notification' in window) {
            const defaultOptions = {
                icon: this.getNotificationIcon(),
                badge: this.getNotificationIcon(),
                vibrate: [200, 100, 200],
                tag: 'job-tracker',
                renotify: true,
                requireInteraction: false,
                actions: [
                    {
                        action: 'mark-job',
                        title: 'Mark Job Done'
                    },
                    {
                        action: 'view-app',
                        title: 'View App'
                    }
                ]
            };
            
            const notification = new Notification(title, { ...defaultOptions, ...options });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // Auto close after 8 seconds
            setTimeout(() => {
                notification.close();
            }, 8000);
            
            return notification;
        }
    }

    getNotificationIcon() {
        return "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%23ff6b35' rx='48'/><path d='M48 96l30 30 60-60' stroke='white' stroke-width='12' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>";
    }

    sendDailyReminder() {
        // Check if we should send a daily reminder
        const lastReminder = localStorage.getItem('lastReminder');
        const today = new Date().toDateString();
        
        if (lastReminder !== today && this.notificationPermission === 'granted') {
            // Check if user hasn't worked today
            this.getWorkRecords().then(records => {
                const todayRecord = records.find(record => 
                    new Date(record.date).toDateString() === today
                );
                
                if (!todayRecord) {
                    // Send reminder at 6 PM if not worked yet
                    const now = new Date();
                    const reminderTime = new Date();
                    reminderTime.setHours(18, 0, 0, 0);
                    
                    if (now >= reminderTime) {
                        this.showBrowserNotification('Daily Job Reminder', {
                            body: "Don't forget to mark your job completion for today!",
                            tag: 'daily-reminder'
                        });
                        localStorage.setItem('lastReminder', today);
                    }
                }
            });
        }
    }

    // Ripple Effect for Buttons
    setupRippleEffect() {
        const buttons = document.querySelectorAll('.work-btn, .collect-btn, .export-btn, .toggle-btn, .chart-btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRipple(e, button);
            });
        });
    }

    createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.className = 'btn-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Event Listeners
    initEventListeners() {
        // Menu toggle with blur overlay
        document.getElementById('menuToggle').addEventListener('click', () => {
            const menu = document.getElementById('sideMenu');
            const overlay = document.getElementById('blurOverlay');
            
            menu.classList.add('active');
            overlay.classList.add('active');
        });

        document.getElementById('closeMenu').addEventListener('click', () => {
            this.closeSideMenu();
        });

        // Click outside menu to close
        document.getElementById('blurOverlay').addEventListener('click', () => {
            this.closeSideMenu();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            const menuItem = document.getElementById('themeToggle');
            menuItem.classList.toggle('active');
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTheme(btn.dataset.theme);
                this.closeSideMenu();
                document.getElementById('themeToggle').classList.remove('active');
            });
        });

        // Menu items
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.showView('balance');
            this.closeSideMenu();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                this.clearAllData();
                this.showNotification('All data cleared successfully!', 'success');
            }
            this.closeSideMenu();
        });

        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.showAboutModal();
            this.closeSideMenu();
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

        // Notification banner buttons
        document.getElementById('allowNotifications').addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        document.getElementById('denyNotifications').addEventListener('click', () => {
            this.notificationPermission = 'denied';
            localStorage.setItem('notificationPermission', 'denied');
            this.hideNotificationBanner();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        document.getElementById('workBtn').click();
                        break;
                    case 'e':
                        e.preventDefault();
                        document.getElementById('exportPDF').click();
                        break;
                    case 'm':
                        e.preventDefault();
                        document.getElementById('menuToggle').click();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.closeSideMenu();
                this.closeModal();
            }
        });
    }

    closeSideMenu() {
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('blurOverlay');
        
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.getElementById('themeToggle').classList.remove('active');
    }

    // Theme Management
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        
        // Update chart colors if chart exists
        if (this.chart) {
            setTimeout(() => this.initChart(), 300);
        }
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
            this.showNotification('You have already recorded your job for today!', 'warning');
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
        
        // Show success notification
        this.showNotification('Job completed successfully! ₹25 added to pending amount.', 'success');
        
        // Show browser notification
        if (this.notificationPermission === 'granted') {
            this.showBrowserNotification('Job Completed!', {
                body: '₹25 has been added to your pending amount. Great work today!',
                tag: 'job-completed'
            });
        }
        
        // Check for celebration animation
        this.celebrateJobCompletion();
    }

    celebrateJobCompletion() {
        // Add a subtle celebration effect
        const workCard = document.querySelector('.work-card');
        workCard.style.animation = 'none';
        workCard.offsetHeight; // Trigger reflow
        workCard.style.animation = 'celebrateJob 0.6s ease';
        
        // Add CSS for celebration animation
        if (!document.getElementById('celebrationStyle')) {
            const style = document.createElement('style');
            style.id = 'celebrationStyle';
            style.textContent = `
                @keyframes celebrateJob {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async checkPaymentEligibility() {
        const records = await this.getWorkRecords();
        const consecutiveDays = this.getConsecutiveWorkDays(records);
        const pendingAmount = await this.calculatePendingAmount();
        
        const paymentNotification = document.getElementById('paymentNotification');
        const collectBtn = document.getElementById('collectBtn');
        
        if (consecutiveDays >= 4 && pendingAmount >= 100) {
            paymentNotification.style.display = 'block';
            collectBtn.classList.remove('hidden');
            
            // Show browser notification for payment eligibility
            if (this.notificationPermission === 'granted') {
                this.showBrowserNotification('Payment Ready!', {
                    body: `You can collect ₹100 today! You've completed ${consecutiveDays} consecutive days.`,
                    tag: 'payment-ready',
                    requireInteraction: true
                });
            }
        } else {
            paymentNotification.style.display = 'none';
            collectBtn.classList.add('hidden');
        }
    }

    getConsecutiveWorkDays(records) {
        if (records.length === 0) return 0;
        
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        let consecutive = 0;
        let currentDate = new Date();
        
        // Check if worked today first
        const today = new Date().toDateString();
        const workedToday = sortedRecords.some(record => 
            new Date(record.date).toDateString() === today
        );
        
        if (!workedToday) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
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
        const pendingAmount = await this.calculatePendingAmount();
        
        if (consecutiveDays >= 4 && pendingAmount >= 100) {
            const paymentAmount = Math.floor(pendingAmount / 100) * 100;
            await this.savePaymentRecord(paymentAmount, consecutiveDays);
            
            document.getElementById('paymentNotification').style.display = 'none';
            document.getElementById('collectBtn').classList.add('hidden');
            
            this.updateDisplay();
            this.updateBalanceSheet();
            
            this.showNotification(`Payment of ₹${paymentAmount} collected successfully!`, 'success');
            
            // Show browser notification
            if (this.notificationPermission === 'granted') {
                this.showBrowserNotification('Payment Collected!', {
                    body: `₹${paymentAmount} has been successfully collected. Keep up the great work!`,
                    tag: 'payment-collected'
                });
            }
            
            // Celebration effect
            this.celebratePayment();
        }
    }

    celebratePayment() {
        // Create confetti effect
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#ff6b35', '#ffa726', '#4caf50', '#2196f3'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 3000;
                animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }
        
        // Add confetti animation if not exists
        if (!document.getElementById('confettiStyle')) {
            const style = document.createElement('style');
            style.id = 'confettiStyle';
            style.textContent = `
                @keyframes confettiFall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Display Updates
    async updateDisplay() {
        const records = await this.getWorkRecords();
        const payments = await this.getPaymentRecords();
        
        const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const pendingAmount = await this.calculatePendingAmount();
        const workStreak = this.getConsecutiveWorkDays(records);
        
        // Animate number changes
        this.animateValue('totalEarnings', totalEarnings, '₹');
        this.animateValue('pendingAmount', pendingAmount, '₹');
        this.animateValue('workStreak', workStreak);
        
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
            workBtn.innerHTML = '<i class="fas fa-check-circle"></i><span>Job Completed</span>';
            workBtn.style.background = 'var(--success-color)';
            workStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Job completed for today</span>';
        } else {
            workBtn.disabled = false;
            workBtn.innerHTML = '<i class="fas fa-check-circle"></i><span>Mark Job Done</span>';
            workBtn.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
            workStatus.innerHTML = '<i class="fas fa-play-circle"></i><span>Ready to start your job</span>';
        }
    }

    animateValue(elementId, targetValue, prefix = '') {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
        const increment = (targetValue - currentValue) / 20;
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                current = targetValue;
                clearInterval(timer);
            }
            element.textContent = prefix + Math.round(current);
        }, 50);
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
        
        // Get current theme colors
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Daily Earnings (₹)',
                    data: chartData.earnings,
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}20`,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: primaryColor,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: secondaryColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
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
                                size: 14,
                                weight: '600'
                            },
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
                        }
                    },
                    tooltip: {
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface-color').trim(),
                        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            },
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '500'
                            },
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
                        }
                    },
                    x: {
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '500'
                            },
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutCubic'
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
        this.chart.update('active');
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
                dayElement.title = `Job completed: ₹${dayRecord.amount}`;
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
                    padding: 15px 20px;
                    background: var(--glass-bg);
                    backdrop-filter: blur(8px);
                    border-radius: 15px;
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                }
                .summary-stat:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px var(--shadow-light);
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
                    border: 1px solid var(--glass-border);
                    border-radius: 15px;
                    overflow: hidden;
                    background: var(--glass-bg);
                    backdrop-filter: blur(8px);
                }
                .month-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    background: var(--primary-color);
                    color: white;
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
                    opacity: 0.9;
                }
                .month-details {
                    padding: 15px;
                }
                .work-record, .payment-record {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 15px;
                    margin-bottom: 8px;
                    background: var(--surface-color);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    transition: all 0.3s ease;
                }
                .work-record:hover, .payment-record:hover {
                    transform: translateX(5px);
                    box-shadow: 0 4px 15px var(--shadow-light);
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
                        text-align: center;
                    }
                    .work-record, .payment-record {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 5px;
                        text-align: center;
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
            pdf.text('Job Tracker Report', 20, 30);
            
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
                pdf.text('Recent Job Records:', 20, 150);
                
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
            pdf.save('job-tracker-report.pdf');
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
Job Tracker Report
Generated on: ${new Date().toLocaleDateString()}

SUMMARY:
- Total Days Worked: ${records.length}
- Total Earned: ₹${totalWorked}
- Total Paid: ₹${totalPaid}
- Pending Amount: ₹${pendingAmount}

RECENT JOB RECORDS:
${records.slice(-10).map(record => 
    `${new Date(record.date).toLocaleDateString()} - ₹${record.amount}`
).join('\n')}

PAYMENT HISTORY:
${payments.map(payment => 
    `${new Date(payment.date).toLocaleDateString()} - ₹${payment.amount} (${payment.workDays} days)`
).join('\n')}

Generated by Job Tracker v1.0.0
            `.trim();
            
            const mailtoLink = `mailto:?subject=Job Tracker Report&body=${encodeURIComponent(emailBody)}`;
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

    // Enhanced Notification System
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${this.getNotificationIcon(type)}"></i>
                </div>
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
            min-width: 350px;
            max-width: 450px;
            background: var(--glass-bg);
            backdrop-filter: blur(var(--blur-amount));
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            box-shadow: 0 10px 40px var(--shadow-heavy);
            animation: notificationSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        const content = notification.querySelector('.notification-content');
        content.style.cssText = `
            padding: 20px 25px;
            display: flex;
            align-items: flex-start;
            gap: 15px;
        `;
        
        const icon = notification.querySelector('.notification-icon');
        icon.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: white;
            flex-shrink: 0;
            background: ${this.getNotificationColor(type)};
        `;
        
        const messageEl = notification.querySelector('.notification-message');
        messageEl.style.cssText = `
            flex: 1;
            color: var(--text-primary);
            font-weight: 500;
            line-height: 1.5;
            font-size: 1rem;
        `;
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
            flex-shrink: 0;
        `;
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'var(--surface-variant)';
            closeBtn.style.color = 'var(--text-primary)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = 'var(--text-secondary)';
        });
        
        // Add animation styles
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes notificationSlideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes notificationSlideOut {
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
        }
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Close button functionality
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'notificationSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after 6 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notificationSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 6000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'error': return 'fa-times-circle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-bell';
        }
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return 'var(--success-color)';
            case 'warning': return 'var(--warning-color)';
            case 'error': return 'var(--error-color)';
            case 'info': return 'var(--info-color)';
            default: return 'var(--primary-color)';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobTracker();
});

// Service Worker for PWA functionality
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