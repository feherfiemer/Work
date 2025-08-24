// Calendar Manager for R-Service Tracker
class CalendarManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.currentDate = new Date();
        this.workRecords = [];
        this.payments = [];
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    // Initialize calendar
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.render();
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    }

    // Load data from database
    async loadData() {
        try {
            this.workRecords = await this.db.getAllWorkRecords();
            this.payments = await this.db.getAllPayments();
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousMonth();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextMonth();
            });
        }

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('calendarView').style.display !== 'none') {
                if (e.key === 'ArrowLeft') {
                    this.previousMonth();
                } else if (e.key === 'ArrowRight') {
                    this.nextMonth();
                }
            }
        });
    }

    // Navigate to previous month
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    // Go to today
    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    // Go to specific month/year
    goToMonth(year, month) {
        this.currentDate = new Date(year, month - 1, 1);
        this.render();
    }

    // Render calendar
    render() {
        this.updateTitle();
        this.renderGrid();
    }

    // Update calendar title
    updateTitle() {
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            const monthName = this.monthNames[this.currentDate.getMonth()];
            const year = this.currentDate.getFullYear();
            titleElement.textContent = `${monthName} ${year}`;
        }
    }

    // Render calendar grid (optimized for performance)
    renderGrid() {
        const gridElement = document.getElementById('calendarGrid');
        if (!gridElement) return;

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear existing content
        gridElement.innerHTML = '';

        // Add day headers
        this.dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header-cell';
            dayHeader.textContent = dayName;
            dayHeader.style.cssText = `
                padding: 0.75rem;
                background: var(--surface);
                font-weight: 600;
                text-align: center;
                color: var(--text-primary);
                border-bottom: 1px solid var(--primary);
                border-radius: 6px 6px 0 0;
                font-size: 0.8rem;
            `;
            fragment.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        // Add empty cells for days before month starts
        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            fragment.appendChild(emptyCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dateString = this.formatDate(cellDate);
            
            const cell = this.createDayCell(day, cellDate, dateString);
            fragment.appendChild(cell);
        }

        // Add empty cells to complete the grid (6 rows × 7 days = 42 cells)
        const totalCells = 42;
        const currentCells = startDay + daysInMonth;
        const remainingCells = totalCells - currentCells;
        
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            fragment.appendChild(emptyCell);
        }
        
        // Append all cells at once for better performance
        gridElement.appendChild(fragment);
    }

    // Create day cell
    createDayCell(day, cellDate, dateString) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        // Check if this is today
        const today = new Date();
        const isToday = this.isSameDate(cellDate, today);
        
        // Get work record for this date
        const workRecord = this.workRecords.find(record => record.date === dateString);
        const isWorked = workRecord && workRecord.status === 'completed';
        
        // Check if this date is part of a payment
        const isPaid = this.isDatePaid(dateString);
        
        // Set cell classes
        if (isToday) {
            cell.classList.add('today');
        }
        if (isWorked) {
            cell.classList.add('worked');
            if (isPaid) {
                cell.classList.add('paid');
            }
        }

        // Create cell content
        const cellContent = this.createCellContent(day, workRecord, isPaid, isToday);
        cell.appendChild(cellContent);

        // Add click handler
        cell.addEventListener('click', () => {
            this.showDayDetails(cellDate, workRecord, isPaid);
        });

        // Add hover effect (using CSS instead of JS for better performance)
        cell.addEventListener('mouseenter', () => {
            cell.classList.add('calendar-cell-hover');
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('calendar-cell-hover');
        });

        return cell;
    }

    // Create cell content
    createCellContent(day, workRecord, isPaid, isToday) {
        const content = document.createElement('div');
        content.className = 'calendar-cell-content';
        content.style.cssText = `
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 0.5rem;
        `;

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayNumber.style.cssText = `
            font-weight: ${isToday ? 'bold' : '500'};
            font-size: 1rem;
            color: ${isToday ? 'white' : 'var(--text-primary)'};
        `;

        // Status indicators
        const indicators = document.createElement('div');
        indicators.className = 'day-indicators';
        indicators.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 0.25rem;
            margin-top: 0.25rem;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
        `;

        if (workRecord && workRecord.status === 'completed') {
            const workIndicator = document.createElement('span');
            workIndicator.className = 'work-indicator';
            workIndicator.innerHTML = '<i class="fas fa-check"></i>';
            workIndicator.style.cssText = `
                background: var(--success);
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
            `;
            indicators.appendChild(workIndicator);

            if (isPaid) {
                const payment = this.getPaymentForDate(workRecord.date);
                // Calculate the actual payment amount for this specific date
                const paymentAmount = payment ? Math.floor(payment.amount / payment.workDates.length) : 25;
                
                const paidIndicator = document.createElement('span');
                paidIndicator.className = 'paid-indicator';
                paidIndicator.innerHTML = '<i class="fas fa-money-bill-wave"></i>';
                paidIndicator.style.cssText = `
                    background: var(--info);
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                `;
                indicators.appendChild(paidIndicator);
            }
        }

        content.appendChild(dayNumber);
        content.appendChild(indicators);

        return content;
    }

    // Show day details in modal or tooltip
    showDayDetails(date, workRecord, isPaid) {
        const dateString = this.formatDate(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        let content = `
            <div class="day-details">
                <h3>${dayName}</h3>
                <p class="date">${formattedDate}</p>
        `;

        // Check if this is a past date (not future)
        const today = new Date();
        const isPastDate = date < today || this.isSameDate(date, today);

        if (workRecord && workRecord.status === 'completed') {
            content += `
                <div class="work-status success">
                    <i class="fas fa-check-circle"></i>
                    <span>Work Completed</span>
                </div>
                <div class="earnings">
                    <span class="label">Earned:</span>
                    <span class="amount">₹${workRecord.wage}</span>
                </div>
            `;

            if (isPaid) {
                const payment = this.getPaymentForDate(dateString);
                const paidAmount = payment ? Math.floor(payment.amount / payment.workDates.length) : 25;
                content += `
                    <div class="payment-status success">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Payment Received</span>
                    </div>
                    <div class="payment-details">
                        <span class="label">Amount Paid:</span>
                        <span class="amount">₹${paidAmount}</span>
                    </div>
                `;
                if (payment) {
                    content += `
                        <div class="payment-details">
                            <span class="label">Payment Date:</span>
                            <span class="date">${new Date(payment.paymentDate).toLocaleDateString()}</span>
                        </div>
                    `;
                }
            } else {
                content += `
                    <div class="payment-status pending">
                        <i class="fas fa-clock"></i>
                        <span>Payment Pending</span>
                    </div>
                `;
                
                // Only show force paid button for past completed work dates
                if (isPastDate) {
                    content += `
                        <button class="force-paid-btn" data-date="${dateString}" style="
                            margin-top: 1rem;
                            width: 100%;
                            padding: 0.75rem;
                            background: linear-gradient(135deg, var(--success), #45a049);
                            color: white;
                            border: none;
                            border-radius: var(--border-radius);
                            cursor: pointer;
                            font-family: var(--font-family);
                            font-weight: 600;
                            font-size: 0.9rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                            box-shadow: var(--shadow-light);
                            transition: all var(--transition-fast);
                        ">
                            <i class="fas fa-hand-holding-usd"></i>
                            Force Mark as Paid
                        </button>
                    `;
                }
            }
        } else {
            content += `
                <div class="work-status not-worked">
                    <i class="fas fa-times-circle"></i>
                    <span>No Work Recorded</span>
                </div>
            `;
        }

        content += `</div>`;

        // Show in toast or create a simple modal
        this.showDayModal(content, dateString);
    }

    // Show day modal
    showDayModal(content, dateString) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'day-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            animation: fadeIn 0.3s ease-in-out;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'day-modal-content';
        modalContent.style.cssText = `
            background: var(--surface);
            border-radius: var(--border-radius);
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: var(--shadow-heavy);
            animation: slideInUp 0.3s ease-in-out;
        `;

        modalContent.innerHTML = content + `
            <button class="close-day-modal" style="
                margin-top: 1.5rem;
                width: 100%;
                padding: 0.75rem;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: var(--border-radius);
                cursor: pointer;
                font-family: var(--font-family);
                font-weight: 500;
            ">Close</button>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };

        // Close handlers
        const closeBtn = modalContent.querySelector('.close-day-modal');
        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Force paid button handler
        const forcePaidBtn = modalContent.querySelector('.force-paid-btn');
        if (forcePaidBtn) {
            forcePaidBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    const targetDate = forcePaidBtn.dataset.date || dateString;
                    console.log('Force paid button clicked for date:', targetDate);
                    
                    if (!targetDate) {
                        console.error('No target date found');
                        if (window.app && window.app.notifications) {
                            window.app.notifications.showToast('Error: No date selected', 'error');
                        }
                        return;
                    }
                    
                    // Disable button to prevent double clicks
                    forcePaidBtn.disabled = true;
                    forcePaidBtn.style.background = 'linear-gradient(135deg, #ccc, #999)';
                    forcePaidBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    forcePaidBtn.style.transform = 'scale(0.95)';
                    
                    // Close modal first, then process payment
                    closeModal();
                    
                    // Add small delay to ensure modal is fully closed
                    setTimeout(async () => {
                        try {
                            await this.handleForcePaid(targetDate);
                        } catch (paymentError) {
                            console.error('Error processing force payment:', paymentError);
                            if (window.app && window.app.notifications) {
                                window.app.notifications.showToast('Error processing force payment. Please try again.', 'error');
                            }
                        }
                    }, 200);
                    
                } catch (error) {
                    console.error('Error in force paid button handler:', error);
                    if (window.app && window.app.notifications) {
                        window.app.notifications.showToast('Error processing force payment', 'error');
                    }
                    // Re-enable button on error
                    if (forcePaidBtn) {
                        forcePaidBtn.disabled = false;
                        forcePaidBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Force Mark as Paid';
                    }
                }
            });
        }

        // No mark done functionality needed

        // ESC key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // Helper methods
    formatDate(date) {
        // Use local date to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isDatePaid(dateString) {
        return this.payments.some(payment => 
            payment.workDates.includes(dateString)
        );
    }

    getPaymentForDate(dateString) {
        return this.payments.find(payment => 
            payment.workDates.includes(dateString)
        );
    }

    // Get calendar statistics
    getCalendarStats() {
        const currentMonth = this.currentDate.getMonth() + 1;
        const currentYear = this.currentDate.getFullYear();
        
        const monthRecords = this.workRecords.filter(record => 
            record.month === currentMonth && record.year === currentYear
        );
        
        const workedDays = monthRecords.filter(record => 
            record.status === 'completed'
        ).length;
        
        const totalEarnings = workedDays * 25;
        
        const paidDays = monthRecords.filter(record => 
            record.status === 'completed' && this.isDatePaid(record.date)
        ).length;
        
        const paidAmount = paidDays * 25;
        const pendingAmount = totalEarnings - paidAmount;
        
        return {
            month: this.monthNames[this.currentDate.getMonth()],
            year: currentYear,
            workedDays,
            totalEarnings,
            paidAmount,
            pendingAmount,
            paidDays,
            pendingDays: workedDays - paidDays
        };
    }

    // Update calendar with new data
    async updateCalendar() {
        await this.loadData();
        this.render();
    }

    // Export calendar view
    exportCalendarView() {
        const stats = this.getCalendarStats();
        const monthName = this.monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        
        const exportData = {
            period: `${monthName} ${year}`,
            statistics: stats,
            workDays: this.workRecords
                .filter(record => 
                    record.month === this.currentDate.getMonth() + 1 && 
                    record.year === year &&
                    record.status === 'completed'
                )
                .map(record => ({
                    date: record.date,
                    day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
                    wage: record.wage,
                    paid: this.isDatePaid(record.date)
                }))
        };
        
        return exportData;
    }

    // Handle force paid action
    async handleForcePaid(dateString) {
        try {
            console.log('Processing force paid for date:', dateString);
            
            if (!dateString) {
                throw new Error('No date provided for force payment');
            }

            if (!this.db) {
                throw new Error('Database not available');
            }
            
            // Check if work record exists and is completed
            const workRecord = await this.db.getWorkRecord(dateString);
            if (!workRecord || workRecord.status !== 'completed') {
                if (window.app && window.app.notifications) {
                    window.app.notifications.showToast('Can only force payment for completed work days!', 'warning');
                }
                return;
            }

            // Check if already paid
            const payments = await this.db.getAllPayments();
            const isAlreadyPaid = payments.some(payment => 
                payment.workDates && payment.workDates.includes(dateString)
            );
            
            if (isAlreadyPaid) {
                if (window.app && window.app.notifications) {
                    window.app.notifications.showToast('This work day is already paid!', 'warning');
                }
                return;
            }

            // Create a force payment for this specific date
            const paymentAmount = 25; // Standard daily wage
            const today = new Date();
            const paymentDate = today.getFullYear() + '-' + 
                              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(today.getDate()).padStart(2, '0');
            
            console.log('Adding payment:', { amount: paymentAmount, workDates: [dateString], paymentDate });
            await this.db.addPayment(paymentAmount, [dateString], paymentDate, false);
            console.log('Force payment added successfully');

            // Show success notification first
            if (window.app && window.app.notifications) {
                window.app.notifications.showToast(`Force payment of ₹${paymentAmount} recorded for ${new Date(dateString).toLocaleDateString()}`, 'success');
                try {
                    window.app.notifications.playSound('paid');
                } catch (soundError) {
                    console.log('Sound playback failed (non-critical):', soundError);
                }
            }

            // Update calendar and notify main app with better error handling
            try {
                // Force reload data from database
                await this.loadData();
                
                // Clear and re-render the calendar
                const gridElement = document.getElementById('calendarGrid');
                if (gridElement) {
                    gridElement.innerHTML = '';
                }
                this.render();
                
                console.log('Calendar refreshed after force payment');

                // Trigger update in main app if available
                if (window.app && typeof window.app.updateDashboard === 'function') {
                    try {
                        window.app.currentStats = await this.db.getEarningsStats();
                        window.app.updateDashboard();
                        await window.app.updatePendingUnpaidDates();
                        await window.app.updatePaidButtonVisibility();
                        
                        // Update charts if available
                        if (window.app.charts && typeof window.app.charts.updateCharts === 'function') {
                            await window.app.charts.updateCharts();
                        }
                    } catch (appUpdateError) {
                        console.error('Error updating app components:', appUpdateError);
                        // Don't throw - the payment was successful
                    }
                }
            } catch (renderError) {
                console.error('Error updating calendar after force payment:', renderError);
                // Don't throw - the payment was successful, just refresh manually
                setTimeout(async () => {
                    try {
                        await this.loadData();
                        const gridElement = document.getElementById('calendarGrid');
                        if (gridElement) {
                            gridElement.innerHTML = '';
                        }
                        this.render();
                        console.log('Calendar force refreshed after error');
                    } catch (retryError) {
                        console.error('Retry render failed:', retryError);
                    }
                }, 500);
            }

        } catch (error) {
            console.error('Error processing force payment:', error);
            if (window.app && window.app.notifications) {
                window.app.notifications.showToast('Error processing force payment. Please try again.', 'error');
            }
            throw error; // Re-throw to be handled by the caller
        }
    }



    // Highlight specific dates
    highlightDates(dates, className = 'highlighted') {
        dates.forEach(dateString => {
            const date = new Date(dateString);
            if (date.getMonth() === this.currentDate.getMonth() && 
                date.getFullYear() === this.currentDate.getFullYear()) {
                // Find and highlight the cell
                // This would require additional tracking of cell elements
            }
        });
    }
}

// Export the calendar manager
window.CalendarManager = CalendarManager;

// Add required CSS for calendar modal
const calendarStyle = document.createElement('style');
calendarStyle.textContent = `
    .calendar-header-cell {
        padding: 0.75rem;
        background: var(--surface);
        font-weight: 600;
        text-align: center;
        color: var(--text-primary);
        border-bottom: 1px solid var(--primary);
        border-radius: 6px 6px 0 0;
        font-size: 0.8rem;
    }
    
    .day-details {
        text-align: center;
        padding: 1rem;
    }
    
    .day-details h3 {
        color: var(--primary);
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
        font-weight: 700;
    }
    
    .day-details .date {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
    }
    
    .work-status, .payment-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: var(--border-radius);
        margin: 0.5rem 0;
        font-weight: 500;
    }
    
    .work-status.success, .payment-status.success {
        background: rgba(76, 175, 80, 0.1);
        color: var(--success);
    }
    
    .work-status.not-worked {
        background: rgba(158, 158, 158, 0.1);
        color: var(--text-muted);
    }
    
    .payment-status.pending {
        background: rgba(255, 152, 0, 0.1);
        color: var(--warning);
    }
    
    .earnings, .payment-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
    }
    
    .earnings:last-child, .payment-details:last-child {
        border-bottom: none;
    }
    
    .earnings .amount {
        font-weight: 600;
        color: var(--primary);
    }
    
    .close-day-modal:hover {
        background: var(--primary-dark) !important;
        transform: translateY(-2px);
    }
`;
document.head.appendChild(calendarStyle);