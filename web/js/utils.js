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

    // Enhanced Professional PDF Export functionality
    async exportToPDF(data, filename = 'R-Service-Tracker-Professional-Report.pdf') {
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
            
            // Premium color scheme
            const colors = {
                primary: [255, 107, 53],     // Orange
                secondary: [33, 37, 41],     // Dark gray
                success: [40, 167, 69],      // Green
                warning: [255, 193, 7],      // Yellow
                danger: [220, 53, 69],       // Red
                light: [248, 249, 250],      // Light gray
                muted: [117, 117, 117]       // Muted gray
            };
            
            // Professional header design
            this.addProfessionalHeader(doc, colors);
            
            let yPos = 70;
            
            // Company/Service information section
            yPos = this.addCompanyInfo(doc, colors, yPos);
            
            // Executive Summary with KPIs
            if (data.summary) {
                yPos = this.addExecutiveSummary(doc, colors, data.summary, yPos);
            }
            
            // Financial Analytics Section
            if (data.summary) {
                yPos = this.addFinancialAnalytics(doc, colors, data.summary, yPos);
            }
            
            // Detailed Work Records
            if (data.workRecords && data.workRecords.length > 0) {
                yPos = this.addDetailedWorkRecords(doc, colors, data.workRecords, yPos);
            }
            
            // Payment History with Analysis
            if (data.payments && data.payments.length > 0) {
                yPos = this.addPaymentHistory(doc, colors, data.payments, yPos);
            }
            
            // Performance Metrics
            if (data.summary) {
                yPos = this.addPerformanceMetrics(doc, colors, data.summary, yPos);
            }
            
            // Professional footer with page numbers and metadata
            this.addProfessionalFooter(doc, colors, data);
            
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

    // Professional header with branding
    addProfessionalHeader(doc, colors) {
        // Premium gradient background effect (simulated with rectangles)
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 45, 'F');
        
        // Company logo area (icon representation)
        doc.setFontSize(32);
        doc.setTextColor(255, 255, 255);
        doc.text('R', 15, 25);
        
        // Company name and tagline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('R-Service Tracker', 25, 25);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('Professional Work & Payment Management System', 25, 33);
        
        // Report title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('COMPREHENSIVE WORK REPORT', 25, 42);
        
        // Decorative line
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);
        doc.line(15, 47, 195, 47);
        
        // Report metadata in header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        const now = new Date();
        doc.text(`Generated: ${this.formatDateTime(now)}`, 145, 55);
        doc.text(`Report ID: RST-${now.getTime().toString().slice(-8)}`, 145, 60);
    }

    // Company information section
    addCompanyInfo(doc, colors, yPos) {
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 5, 180, 25, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colors.secondary);
        doc.text('🏢 SERVICE PROVIDER INFORMATION', 20, yPos + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Service: R-Service Professional Work Tracking', 25, yPos + 13);
        doc.text('System Version: 1.0.0 Professional', 25, yPos + 18);
        doc.text(`Daily Rate: ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} per day`, 110, yPos + 13);
        doc.text('Currency: Indian Rupees (₹)', 110, yPos + 18);
        
        return yPos + 35;
    }

    // Executive summary with key metrics
    addExecutiveSummary(doc, colors, summary, yPos) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section header
        doc.setFillColor(...colors.primary);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('📊 EXECUTIVE SUMMARY', 20, yPos + 5);
        yPos += 20;
        
        // Key metrics in cards
        const metrics = [
            { label: 'Total Days Worked', value: `${summary.totalWorked} days`, icon: '📅' },
            { label: 'Total Earnings', value: this.formatCurrencyForPDF(summary.totalEarned), icon: '💰' },
            { label: 'Amount Received', value: this.formatCurrencyForPDF(summary.totalPaid), icon: '✅' },
            { label: 'Outstanding Balance', value: this.formatCurrencyForPDF(summary.currentBalance), icon: '⚖️' }
        ];
        
        metrics.forEach((metric, index) => {
            const x = 20 + (index % 2) * 90;
            const y = yPos + Math.floor(index / 2) * 25;
            
            // Metric card background
            doc.setFillColor(252, 252, 252);
            doc.rect(x - 2, y - 3, 85, 20, 'F');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...colors.secondary);
            doc.text(`${metric.icon} ${metric.label}`, x, y + 5);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, x, y + 13);
        });
        
        return yPos + 60;
    }

    // Financial analytics section
    addFinancialAnalytics(doc, colors, summary, yPos) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section header
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colors.secondary);
        doc.text('📈 FINANCIAL ANALYTICS', 20, yPos + 5);
        yPos += 25;
        
        // Calculate additional metrics
        const avgEarningsPerDay = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        const workStreak = summary.currentStreak || 0;
        
        // Analytics grid
        const analytics = [
            { label: 'Average Daily Earnings', value: this.formatCurrencyForPDF(avgEarningsPerDay) },
            { label: 'Payment Efficiency', value: `${paymentEfficiency.toFixed(1)}%` },
            { label: 'Current Work Streak', value: `${workStreak} days` },
            { label: 'Work Frequency', value: summary.totalWorked > 0 ? 'Active' : 'Inactive' }
        ];
        
        analytics.forEach((item, index) => {
            const x = 25 + (index % 2) * 90;
            const y = yPos + Math.floor(index / 2) * 12;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${item.label}:`, x, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(item.value, x + 65, y);
        });
        
        // Financial status indicator
        yPos += 35;
        let statusText = '';
        let statusColor = colors.success;
        
        if (summary.currentBalance > 0) {
            statusText = `⚠️ Outstanding Payment Due: ${this.formatCurrencyForPDF(summary.currentBalance)}`;
            statusColor = colors.danger;
        } else if (summary.currentBalance < 0) {
            statusText = `✅ Advance Payment Made: ${this.formatCurrencyForPDF(Math.abs(summary.currentBalance))}`;
            statusColor = colors.warning;
        } else {
            statusText = '✅ All payments up to date';
            statusColor = colors.success;
        }
        
        doc.setFillColor(...statusColor);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, 20, yPos + 4);
        
        return yPos + 20;
    }

    // Detailed work records with enhanced formatting
    addDetailedWorkRecords(doc, colors, workRecords, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section header
        doc.setFillColor(...colors.secondary);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('📋 DETAILED WORK RECORDS', 20, yPos + 5);
        yPos += 25;
        
        // Enhanced table headers
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('DATE', 20, yPos + 5);
        doc.text('DAY', 50, yPos + 5);
        doc.text('STATUS', 75, yPos + 5);
        doc.text('EARNINGS', 110, yPos + 5);
        doc.text('PAYMENT STATUS', 145, yPos + 5);
        doc.text('NOTES', 175, yPos + 5);
        yPos += 15;
        
        // Work records with enhanced styling
        doc.setFont('helvetica', 'normal');
        workRecords.forEach((record, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                // Repeat headers on new page
                doc.setFillColor(...colors.light);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...colors.secondary);
                doc.text('DATE', 20, yPos + 5);
                doc.text('DAY', 50, yPos + 5);
                doc.text('STATUS', 75, yPos + 5);
                doc.text('EARNINGS', 110, yPos + 5);
                doc.text('PAYMENT STATUS', 145, yPos + 5);
                doc.text('NOTES', 175, yPos + 5);
                yPos += 15;
                doc.setFont('helvetica', 'normal');
            }
            
            // Alternating row colors with better contrast
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, yPos - 2, 180, 10, 'F');
            }
            
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(this.formatDateShort(record.date), 20, yPos + 3);
            doc.text(dayName, 50, yPos + 3);
            
            // Status with appropriate styling
            if (record.status === 'completed') {
                doc.setTextColor(...colors.success);
                doc.text('✓ DONE', 75, yPos + 3);
            } else {
                doc.setTextColor(...colors.danger);
                doc.text('✗ MISS', 75, yPos + 3);
            }
            
            // Earnings
            doc.setTextColor(...colors.secondary);
            doc.text(record.status === 'completed' ? this.formatCurrencyForPDF(record.wage) : '₹0', 110, yPos + 3);
            
            // Payment status
            if (record.paid) {
                doc.setTextColor(...colors.success);
                doc.text('PAID', 145, yPos + 3);
            } else {
                doc.setTextColor(...colors.warning);
                doc.text('PENDING', 145, yPos + 3);
            }
            
            // Notes
            doc.setTextColor(...colors.muted);
            doc.text(record.status === 'completed' ? 'OK' : 'X', 175, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    // Payment history with analysis
    addPaymentHistory(doc, colors, payments, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section header
        doc.setFillColor(...colors.success);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('💳 PAYMENT TRANSACTION HISTORY', 20, yPos + 5);
        yPos += 25;
        
        // Payment summary
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const advancePayments = payments.filter(p => p.isAdvance);
        const regularPayments = payments.filter(p => !p.isAdvance);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.secondary);
        doc.text(`Total Transactions: ${payments.length} | Regular: ${regularPayments.length} | Advance: ${advancePayments.length}`, 20, yPos);
        yPos += 15;
        
        // Enhanced payment table
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('PAYMENT DATE', 20, yPos + 5);
        doc.text('AMOUNT', 65, yPos + 5);
        doc.text('WORK DAYS', 95, yPos + 5);
        doc.text('TYPE', 125, yPos + 5);
        doc.text('TRANSACTION ID', 155, yPos + 5);
        yPos += 15;
        
        // Payment records
        doc.setFont('helvetica', 'normal');
        payments.forEach((payment, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                // Repeat headers
                doc.setFillColor(...colors.light);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...colors.secondary);
                doc.text('PAYMENT DATE', 20, yPos + 5);
                doc.text('AMOUNT', 65, yPos + 5);
                doc.text('WORK DAYS', 95, yPos + 5);
                doc.text('TYPE', 125, yPos + 5);
                doc.text('TRANSACTION ID', 155, yPos + 5);
                yPos += 15;
                doc.setFont('helvetica', 'normal');
            }
            
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, yPos - 2, 180, 10, 'F');
            }
            
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(this.formatDateShort(payment.paymentDate), 20, yPos + 3);
            
            // Amount with color coding
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
            } else {
                doc.setTextColor(...colors.success);
            }
            doc.text(this.formatCurrencyForPDF(payment.amount), 65, yPos + 3);
            
            doc.setTextColor(...colors.secondary);
            doc.text(`${payment.workDates.length}`, 95, yPos + 3);
            
            // Type with styling
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
                doc.text('ADVANCE', 125, yPos + 3);
            } else {
                doc.setTextColor(...colors.success);
                doc.text('REGULAR', 125, yPos + 3);
            }
            
            // Transaction ID
            doc.setTextColor(...colors.muted);
            doc.text(`TXN-${(payment.id || index).toString().padStart(3, '0')}`, 155, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    // Performance metrics and insights
    addPerformanceMetrics(doc, colors, summary, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Section header
        doc.setFillColor(...colors.warning);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('⚡ PERFORMANCE INSIGHTS & RECOMMENDATIONS', 20, yPos + 5);
        yPos += 25;
        
        // Performance indicators
        const workDays = summary.totalWorked || 0;
        const earnings = summary.totalEarned || 0;
        const streak = summary.currentStreak || 0;
        
        // Insights based on data
        const insights = [];
        
        if (workDays >= 30) {
            insights.push('🌟 Excellent work consistency - Over 30 days completed');
        } else if (workDays >= 15) {
            insights.push('👍 Good work progress - Over 15 days completed');
        } else if (workDays >= 7) {
            insights.push('📈 Building momentum - Weekly target achieved');
        } else {
            insights.push('🎯 Getting started - Continue building your work record');
        }
        
        if (streak >= 7) {
            insights.push('🔥 Outstanding streak - 7+ consecutive days');
        } else if (streak >= 3) {
            insights.push('💪 Good momentum - 3+ consecutive days');
        }
        
        if (summary.currentBalance <= 0) {
            insights.push('✅ Payment status healthy - No outstanding dues');
        } else {
            insights.push('⚠️ Payment attention needed - Outstanding balance exists');
        }
        
        // Display insights
        insights.forEach((insight, index) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${index + 1}. ${insight}`, 25, yPos + (index * 8));
        });
        
        yPos += insights.length * 8 + 15;
        
        // Recommendations
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('💡 RECOMMENDATIONS:', 20, yPos);
        yPos += 12;
        
        const recommendations = [
            'Maintain consistent daily work schedule for optimal earnings',
            'Review payment cycles to ensure timely settlement',
            'Track performance metrics regularly for improvement',
            'Consider setting milestone goals for motivation'
        ];
        
        recommendations.forEach((rec, index) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.secondary);
            doc.text(`• ${rec}`, 25, yPos + (index * 6));
        });
        
        return yPos + 30;
    }

    // Professional footer with enhanced metadata
    addProfessionalFooter(doc, colors, data) {
        const pageCount = doc.internal.getNumberOfPages();
        const now = new Date();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer background
            doc.setFillColor(...colors.light);
            doc.rect(0, 285, 210, 12, 'F');
            
            // Page numbers
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(`Page ${i} of ${pageCount}`, 20, 292);
            
            // System info
            doc.setFont('helvetica', 'normal');
            doc.text('R-Service Tracker Professional v1.0.0', 80, 292);
            
            // Generation timestamp
            doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 155, 292);
            
            // Confidentiality notice on last page
            if (i === pageCount) {
                doc.setFontSize(7);
                doc.setTextColor(...colors.muted);
                doc.text('This report contains confidential work and payment information. Handle with care.', 20, 280);
            }
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