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

    // Format currency for PDF (convert numbers to words)
    formatCurrencyForPDF(amount) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const thousands = ['', 'Thousand', 'Million', 'Billion'];

        if (amount === 0) return 'Zero rupees';

        function convertChunk(n) {
            let str = '';
            if (n >= 100) {
                str += ones[Math.floor(n / 100)] + ' Hundred ';
                n %= 100;
            }
            if (n >= 20) {
                str += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            } else if (n >= 10) {
                str += teens[n - 10] + ' ';
                return str;
            }
            if (n > 0) {
                str += ones[n] + ' ';
            }
            return str;
        }

        let result = '';
        let chunkCount = 0;
        const originalAmount = amount;

        while (amount > 0) {
            const chunk = amount % 1000;
            if (chunk !== 0) {
                result = convertChunk(chunk) + thousands[chunkCount] + ' ' + result;
            }
            amount = Math.floor(amount / 1000);
            chunkCount++;
        }

        // Use lowercase 'rupees' for amounts less than 100, uppercase 'Rupees' for 100 and above
        const rupeesText = originalAmount >= 100 ? 'Rupees' : 'rupees';
        return result.trim() + ' ' + rupeesText;
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
            
            // Header
            doc.setFontSize(20);
            doc.setTextColor(255, 107, 53); // Orange color
            doc.text('R-Service Tracker', 20, 20);
            
            doc.setFontSize(14);
            doc.setTextColor(33, 33, 33);
            doc.text('Work & Payment Report', 20, 30);
            
            // Report date
            doc.setFontSize(10);
            doc.setTextColor(117, 117, 117);
            doc.text(`Generated on: ${this.formatDateTime(new Date())}`, 20, 40);
            
            let yPos = 55;
            
            // Summary section
            if (data.summary) {
                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.text('Summary', 20, yPos);
                yPos += 10;
                
                doc.setFontSize(12);
                const summaryItems = [
                    `Total Days Worked: ${data.summary.totalWorked}`,
                    `Total Earnings: ${this.formatCurrencyForPDF(data.summary.totalEarned)}`,
                    `Amount Paid: ${this.formatCurrencyForPDF(data.summary.totalPaid)}`,
                    `Current Balance: ${this.formatCurrencyForPDF(data.summary.currentBalance)}`,
                    `Current Streak: ${data.summary.currentStreak} days`
                ];
                
                summaryItems.forEach(item => {
                    doc.text(item, 20, yPos);
                    yPos += 8;
                });
                
                yPos += 10;
            }
            
            // Work records section
            if (data.workRecords && data.workRecords.length > 0) {
                doc.setFontSize(16);
                doc.setTextColor(33, 33, 33);
                doc.text('Work Records', 20, yPos);
                yPos += 15;
                
                // Table headers
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Date', 20, yPos);
                doc.text('Day', 60, yPos);
                doc.text('Status', 100, yPos);
                doc.text('Wage', 140, yPos);
                doc.text('Payment', 170, yPos);
                yPos += 5;
                
                // Line under headers
                doc.line(20, yPos, 190, yPos);
                yPos += 8;
                
                // Work records
                doc.setFont('helvetica', 'normal');
                data.workRecords.forEach(record => {
                    if (yPos > 270) { // New page if needed
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    const date = new Date(record.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    doc.text(this.formatDateShort(record.date), 20, yPos);
                    doc.text(dayName, 60, yPos);
                    doc.text(record.status === 'completed' ? 'Done' : 'Not Done', 100, yPos);
                    doc.text(record.status === 'completed' ? this.formatCurrencyForPDF(record.wage) : '-', 140, yPos);
                    doc.text(record.paid ? 'Paid' : 'Pending', 170, yPos);
                    
                    yPos += 8;
                });
                
                yPos += 10;
            }
            
            // Payments section
            if (data.payments && data.payments.length > 0) {
                if (yPos > 200) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(33, 33, 33);
                doc.text('Payment History', 20, yPos);
                yPos += 15;
                
                // Payment table headers
                doc.setFontSize(10);
                doc.text('Date', 20, yPos);
                doc.text('Amount', 60, yPos);
                doc.text('Work Dates', 100, yPos);
                yPos += 5;
                
                doc.line(20, yPos, 190, yPos);
                yPos += 8;
                
                // Payment records
                doc.setFont('helvetica', 'normal');
                data.payments.forEach(payment => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.text(this.formatDateShort(payment.paymentDate), 20, yPos);
                    doc.text(this.formatCurrencyForPDF(payment.amount), 60, yPos);
                    doc.text(`${payment.workDates.length} days`, 100, yPos);
                    
                    yPos += 8;
                });
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