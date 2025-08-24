// Utility Functions for R-Service Tracker
class Utils {
    constructor() {
        this.dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
    }

    // Date formatting utilities
    formatDate(date, options = this.dateOptions) {
        return new Date(date).toLocaleDateString('en-US', options);
    }

    formatDateShort(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(amount) {
        return `₹${amount.toLocaleString('en-IN')}`;
    }

    // Format currency for PDF (use numeric format instead of words)
    formatCurrencyForPDF(amount) {
        if (amount === 0) return '0 rupees';
        
        // Format the number with proper thousands separators
        const formattedAmount = amount.toLocaleString('en-IN');
        
        // Use lowercase 'rupees' for all amounts
        return formattedAmount + ' rupees';
    }

    // Get today's date in YYYY-MM-DD format
    getTodayString() {
        // Use local date to avoid timezone issues
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Get date range for current week
    getCurrentWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
            start: this.formatLocalDate(startOfWeek),
            end: this.formatLocalDate(endOfWeek)
        };
    }

    // Get date range for current month
    getCurrentMonth() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
            start: this.formatLocalDate(startOfMonth),
            end: this.formatLocalDate(endOfMonth)
        };
    }

    // Helper method to format date consistently
    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Check if date is today
    isToday(dateString) {
        return dateString === this.getTodayString();
    }

    // Check if date is in current week
    isThisWeek(dateString) {
        const week = this.getCurrentWeek();
        return dateString >= week.start && dateString <= week.end;
    }

    // Check if date is in current month
    isThisMonth(dateString) {
        const month = this.getCurrentMonth();
        return dateString >= month.start && dateString <= month.end;
    }

    // Get days between two dates
    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Generate date range
    getDateRange(startDate, endDate) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        while (start <= end) {
            dates.push(start.toISOString().split('T')[0]);
            start.setDate(start.getDate() + 1);
        }
        
        return dates;
    }

    // PDF Export functionality
    async exportToPDF(data, filename = 'R-Service-Tracker-Report.pdf') {
        try {
            console.log('PDF Export: Starting with data:', data);
            
            // Check if jsPDF is available (handle different loading patterns)
            let jsPDF;
            if (typeof window.jsPDF !== 'undefined') {
                // UMD build
                jsPDF = window.jsPDF.jsPDF || window.jsPDF;
            } else if (typeof window.jspdf !== 'undefined') {
                // Alternative loading pattern
                jsPDF = window.jspdf.jsPDF;
            } else {
                console.error('jsPDF library not found. Checked window.jsPDF and window.jspdf');
                throw new Error('jsPDF library not loaded');
            }

            console.log('PDF Export: jsPDF is available');
            const doc = new jsPDF();
            console.log('PDF Export: jsPDF document created');
            
            // Set font
            doc.setFont('helvetica');
            
            // Header with logo-like design
            doc.setFontSize(24);
            doc.setTextColor(255, 107, 53); // Orange color
            doc.text('R-Service Tracker', 20, 25);
            
            doc.setFontSize(16);
            doc.setTextColor(33, 33, 33);
            doc.text('Professional Work & Payment Report', 20, 35);
            
            // Add a line under header
            doc.setDrawColor(255, 107, 53);
            doc.setLineWidth(0.5);
            doc.line(20, 40, 190, 40);
            
            // Report metadata
            doc.setFontSize(10);
            doc.setTextColor(117, 117, 117);
            doc.text(`Report Generated: ${this.formatDateTime(new Date())}`, 20, 48);
            doc.text(`Report Period: ${data.summary ? this.getReportPeriod(data) : 'All Time'}`, 20, 53);
            
            let yPos = 65;
            
            // Summary section with enhanced design
            if (data.summary) {
                // Section header with background
                doc.setFillColor(248, 249, 250);
                doc.rect(15, yPos - 5, 180, 22, 'F');
                
                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.setFont('helvetica', 'bold');
                doc.text('📊 Financial Summary', 20, yPos + 5);
                yPos += 20;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                
                // Create two columns for better organization
                const leftColumn = [
                    `Days Worked: ${data.summary.totalWorked} days`,
                    `Total Earnings: ${this.formatCurrencyForPDF(data.summary.totalEarned)}`,
                    `Current Streak: ${data.summary.currentStreak} days`
                ];
                
                const rightColumn = [
                    `Amount Paid: ${this.formatCurrencyForPDF(data.summary.totalPaid)}`,
                    `Outstanding Balance: ${this.formatCurrencyForPDF(data.summary.currentBalance)}`,
                    `Daily Rate: ${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} rupees`
                ];
                
                // Left column
                leftColumn.forEach((item, index) => {
                    doc.text(item, 25, yPos + (index * 8));
                });
                
                // Right column
                rightColumn.forEach((item, index) => {
                    doc.text(item, 110, yPos + (index * 8));
                });
                
                yPos += 30;
                
                // Add performance indicators if available
                if (data.summary.currentBalance > 0) {
                    doc.setTextColor(220, 53, 69); // Red for outstanding balance
                    doc.setFont('helvetica', 'bold');
                    doc.text(`⚠️ Outstanding: ${this.formatCurrencyForPDF(data.summary.currentBalance)}`, 25, yPos);
                    yPos += 10;
                } else if (data.summary.currentBalance < 0) {
                    doc.setTextColor(40, 167, 69); // Green for advance
                    doc.setFont('helvetica', 'bold');
                    doc.text(`✅ Advance Paid: ${this.formatCurrencyForPDF(Math.abs(data.summary.currentBalance))}`, 25, yPos);
                    yPos += 10;
                }
                
                doc.setTextColor(33, 33, 33);
                doc.setFont('helvetica', 'normal');
                yPos += 5;
            }
            
            // Work records section with enhanced design
            if (data.workRecords && data.workRecords.length > 0) {
                // Section header with background
                doc.setFillColor(248, 249, 250);
                doc.rect(15, yPos - 5, 180, 15, 'F');
                
                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.setFont('helvetica', 'bold');
                doc.text('📅 Work Records Detail', 20, yPos + 5);
                yPos += 20;
                
                // Enhanced table headers with background
                doc.setFillColor(240, 240, 240);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(33, 33, 33);
                doc.text('Date', 20, yPos + 5);
                doc.text('Day', 55, yPos + 5);
                doc.text('Status', 85, yPos + 5);
                doc.text('Earnings', 120, yPos + 5);
                doc.text('Payment Status', 155, yPos + 5);
                yPos += 15;
                
                // Enhanced work records with alternating colors
                doc.setFont('helvetica', 'normal');
                data.workRecords.forEach((record, index) => {
                    if (yPos > 270) { // New page if needed
                        doc.addPage();
                        yPos = 20;
                        
                        // Repeat headers on new page
                        doc.setFillColor(240, 240, 240);
                        doc.rect(15, yPos - 3, 180, 12, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.text('Date', 20, yPos + 5);
                        doc.text('Day', 55, yPos + 5);
                        doc.text('Status', 85, yPos + 5);
                        doc.text('Earnings', 120, yPos + 5);
                        doc.text('Payment Status', 155, yPos + 5);
                        yPos += 15;
                        doc.setFont('helvetica', 'normal');
                    }
                    
                    // Alternating row colors
                    if (index % 2 === 0) {
                        doc.setFillColor(252, 252, 252);
                        doc.rect(15, yPos - 2, 180, 8, 'F');
                    }
                    
                    const date = new Date(record.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    // Set colors based on status
                    if (record.status === 'completed') {
                        doc.setTextColor(40, 167, 69); // Green for completed
                    } else {
                        doc.setTextColor(220, 53, 69); // Red for not completed
                    }
                    
                    doc.text(this.formatDateShort(record.date), 20, yPos + 3);
                    doc.text(dayName, 55, yPos + 3);
                    doc.text(record.status === 'completed' ? '✅ Completed' : '❌ Not Done', 85, yPos + 3);
                    
                    // Reset color for earnings
                    doc.setTextColor(33, 33, 33);
                    doc.text(record.status === 'completed' ? this.formatCurrencyForPDF(record.wage) : '0 rupees', 120, yPos + 3);
                    
                    // Payment status with color
                    if (record.paid) {
                        doc.setTextColor(40, 167, 69);
                        doc.text('✅ Paid', 155, yPos + 3);
                    } else {
                        doc.setTextColor(255, 193, 7);
                        doc.text('⏳ Pending', 155, yPos + 3);
                    }
                    
                    doc.setTextColor(33, 33, 33);
                    yPos += 10;
                });
                
                yPos += 10;
            }
            
            // Payments section with enhanced design
            if (data.payments && data.payments.length > 0) {
                if (yPos > 200) {
                    doc.addPage();
                    yPos = 20;
                }
                
                // Section header with background
                doc.setFillColor(248, 249, 250);
                doc.rect(15, yPos - 5, 180, 15, 'F');
                
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(33, 33, 33);
                doc.text('💰 Payment History', 20, yPos + 5);
                yPos += 20;
                
                // Enhanced payment table headers with background
                doc.setFillColor(240, 240, 240);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Payment Date', 20, yPos + 5);
                doc.text('Amount', 70, yPos + 5);
                doc.text('Work Days', 115, yPos + 5);
                doc.text('Type', 155, yPos + 5);
                yPos += 15;
                
                // Payment records with enhanced styling
                doc.setFont('helvetica', 'normal');
                data.payments.forEach((payment, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                        
                        // Repeat headers on new page
                        doc.setFillColor(240, 240, 240);
                        doc.rect(15, yPos - 3, 180, 12, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.text('Payment Date', 20, yPos + 5);
                        doc.text('Amount', 70, yPos + 5);
                        doc.text('Work Days', 115, yPos + 5);
                        doc.text('Type', 155, yPos + 5);
                        yPos += 15;
                        doc.setFont('helvetica', 'normal');
                    }
                    
                    // Alternating row colors
                    if (index % 2 === 0) {
                        doc.setFillColor(252, 252, 252);
                        doc.rect(15, yPos - 2, 180, 8, 'F');
                    }
                    
                    doc.setTextColor(33, 33, 33);
                    doc.text(this.formatDateShort(payment.paymentDate), 20, yPos + 3);
                    
                    // Color code amount based on type
                    if (payment.isAdvance) {
                        doc.setTextColor(255, 193, 7); // Orange for advance
                    } else {
                        doc.setTextColor(40, 167, 69); // Green for regular
                    }
                    doc.text(this.formatCurrencyForPDF(payment.amount), 70, yPos + 3);
                    
                    doc.setTextColor(33, 33, 33);
                    doc.text(`${payment.workDates.length} days`, 115, yPos + 3);
                    
                    // Payment type with appropriate color
                    if (payment.isAdvance) {
                        doc.setTextColor(255, 193, 7);
                        doc.text('🔄 Advance', 155, yPos + 3);
                    } else {
                        doc.setTextColor(40, 167, 69);
                        doc.text('✅ Regular', 155, yPos + 3);
                    }
                    
                    doc.setTextColor(33, 33, 33);
                    yPos += 10;
                });
                
                yPos += 10;
            }
            
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(117, 117, 117);
                doc.text(`Page ${i} of ${pageCount}`, 20, 290);
                doc.text('Generated by R-Service Tracker v1.0.0', 140, 290);
            }
            
            // Save the PDF
            console.log('PDF Export: Saving PDF with filename:', filename);
            doc.save(filename);
            console.log('PDF Export: PDF saved successfully');
            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw error; // Re-throw to allow proper error handling
        }
    }

    // Helper function to get report period
    getReportPeriod(data) {
        if (!data.workRecords || data.workRecords.length === 0) {
            return 'No records available';
        }
        
        const dates = data.workRecords.map(record => new Date(record.date));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        
        return `${this.formatDateShort(startDate.toISOString().split('T')[0])} to ${this.formatDateShort(endDate.toISOString().split('T')[0])}`;
    }

    // Data validation utilities
    validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    validateWage(wage) {
        return typeof wage === 'number' && wage > 0;
    }

    // Local storage utilities
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Theme utilities
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.saveToLocalStorage('r-service-theme', theme);
    }

    getTheme() {
        return this.loadFromLocalStorage('r-service-theme') || 'orange-light';
    }

    // Animation utilities
    animateValue(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    animateCurrency(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = this.formatCurrency(current);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    // Animate number without currency symbol (for elements that already have ₹ in HTML)
    animateNumber(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current.toLocaleString('en-IN');
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    // Debounce utility
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Throttle utility
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function (...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // URL utilities
    generateShareableLink(data) {
        const params = new URLSearchParams({
            totalEarned: data.totalEarned || 0,
            totalWorked: data.totalWorked || 0,
            currentStreak: data.currentStreak || 0
        });
        
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

    // File utilities
    downloadJSON(data, filename = 'r-service-backup.json') {
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = filename;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }

    // Performance utilities
    measurePerformance(label, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // Error handling utilities
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Log to analytics if available
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: `${context}: ${error.message}`,
                fatal: false
            });
        }
        
        return {
            success: false,
            error: error.message,
            context: context,
            timestamp: new Date().toISOString()
        };
    }

    // Network utilities
    isOnline() {
        return navigator.onLine;
    }

    // Device utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Random utilities
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Array utilities
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Statistics utilities
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }

    calculatePercentage(part, total) {
        if (total === 0) return 0;
        return (part / total) * 100;
    }

    calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }
}

// Export the utils class
window.Utils = Utils;