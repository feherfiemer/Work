class Utils {
    constructor() {
        this.dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
    }

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

    formatCurrencyForPDF(amount) {
        if (amount === 0) return '0 rupees';
        
        const formattedAmount = amount.toLocaleString('en-IN');
        
        return formattedAmount + ' rupees';
    }

    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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

    getCurrentMonth() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
            start: this.formatLocalDate(startOfMonth),
            end: this.formatLocalDate(endOfMonth)
        };
    }

    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isToday(dateString) {
        return dateString === this.getTodayString();
    }

    isThisWeek(dateString) {
        const week = this.getCurrentWeek();
        return dateString >= week.start && dateString <= week.end;
    }

    isThisMonth(dateString) {
        const month = this.getCurrentMonth();
        return dateString >= month.start && dateString <= month.end;
    }

    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

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

    async exportToPDF(data, filename = 'R-Service-Tracker-Premium-Report.pdf') {
        try {
            console.log('PDF Export: Initializing premium comprehensive report generation');
            
            let jsPDF;
            if (typeof window.jsPDF !== 'undefined') {
                jsPDF = window.jsPDF.jsPDF || window.jsPDF;
            } else if (typeof window.jspdf !== 'undefined') {
                jsPDF = window.jspdf.jsPDF;
            } else {
                console.error('jsPDF library not found. Please ensure jsPDF is loaded.');
                throw new Error('jsPDF library not loaded');
            }

            const doc = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });
            
            // Premium document properties
            doc.setProperties({
                title: 'R-Service Tracker Premium Report',
                subject: 'Comprehensive Work Management & Financial Analysis Report',
                author: 'R-Service Tracker',
                creator: 'R-Service Tracker Premium v2.0.0',
                producer: 'R-Service Premium Report Generator',
                keywords: 'work tracking, financial report, analytics, payment history, premium report'
            });
            
            const colors = this.getPDFColorsFromTheme();
            const reportData = this.generatePremiumReportData(data);
            
            // Page 1: Cover Page
            this.addPremiumCoverPage(doc, colors, reportData, data);
            
            // Page 2: Executive Summary
            doc.addPage();
            let yPos = this.addPremiumExecutiveSummary(doc, colors, data.summary, reportData, 20);
            
            // Page 3: Financial Analytics & Charts
            doc.addPage();
            yPos = this.addPremiumFinancialAnalytics(doc, colors, data, reportData, 20);
            
            // Page 4+: Detailed Work Records
            if (data.workRecords && data.workRecords.length > 0) {
                doc.addPage();
                yPos = this.addPremiumWorkRecords(doc, colors, data.workRecords, data.payments, reportData, 20);
            }
            
            // Payment History Section
            if (data.payments && data.payments.length > 0) {
                if (yPos > 200) {
                    doc.addPage();
                    yPos = 20;
                }
                yPos = this.addPremiumPaymentHistory(doc, colors, data.payments, reportData, yPos);
            }
            
            // Performance Insights & Recommendations
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }
            yPos = this.addPremiumPerformanceInsights(doc, colors, data, reportData, yPos);
            
            // Monthly Breakdown
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }
            yPos = this.addPremiumMonthlyBreakdown(doc, colors, data, reportData, yPos);
            
            // Footer on all pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                this.addPremiumFooter(doc, colors, reportData, i, pageCount);
            }
            
            console.log('PDF Export: Premium comprehensive report generated successfully');
            doc.save(filename);
            return true;
        } catch (error) {
            console.error('Error generating premium PDF:', error);
            throw error;
        }
    }

    // Generate premium report metadata
    generatePremiumReportData(data) {
        const now = new Date();
        const timestamp = now.getTime();
        
        return {
            reportId: `RST-${timestamp.toString().slice(-8)}`,
            generatedTime: now,
            reportVersion: '2.0.0',
            dataHash: this.generateDataHash(data),
            totalPages: 0, // Will be updated later
            reportType: 'Comprehensive Analysis',
            confidentialityLevel: 'Internal Use Only'
        };
    }

    // Generate data integrity hash for security
    generateDataHash(data) {
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).toUpperCase().slice(0, 8);
    }

    // Enhanced text formatting without symbols for advanced reports
    formatCurrencyAdvanced(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        const formatted = Math.abs(amount).toFixed(2);
        return `${formatted} Rupees`;
    }

    // Clean text formatting without symbols
    formatCurrencyClean(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        return `${Math.abs(amount).toFixed(0)} Rupees`;
    }

    formatDateTimeClean(date) {
        if (!date) date = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        };
        return date.toLocaleDateString('en-IN', options);
    }

    calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    // Premium Cover Page
    addPremiumCoverPage(doc, colors, reportData, data) {
        // Premium gradient background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Elegant overlay pattern
        doc.setFillColor(255, 255, 255, 0.1);
        for (let i = 0; i < 20; i++) {
            doc.circle(20 + (i * 10), 50 + (i * 5), 2, 'F');
        }
        
        // Main title with premium typography
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(48);
        doc.setTextColor(255, 255, 255);
        doc.text('R-SERVICE', 105, 80, { align: 'center' });
        
        doc.setFontSize(36);
        doc.text('TRACKER', 105, 100, { align: 'center' });
        
        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(18);
        doc.setTextColor(240, 240, 240);
        doc.text('PREMIUM COMPREHENSIVE REPORT', 105, 120, { align: 'center' });
        
        // Report metadata box
        doc.setFillColor(255, 255, 255, 0.95);
        doc.rect(30, 140, 150, 80, 'F');
        doc.setDrawColor(...colors.accent || colors.primary);
        doc.setLineWidth(1);
        doc.rect(30, 140, 150, 80, 'S');
        
        // Metadata content
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.text('REPORT DETAILS', 105, 155, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        const details = [
            `Report ID: ${reportData.reportId}`,
            `Generated: ${this.formatDateTimeClean(reportData.generatedTime)}`,
            `Report Type: ${reportData.reportType}`,
            `Version: ${reportData.reportVersion}`,
            `Total Work Days: ${data.summary?.totalWorked || 0}`,
            `Total Earnings: ₹${data.summary?.totalEarned || 0}`,
            `Data Hash: ${reportData.dataHash}`
        ];
        
        details.forEach((detail, index) => {
            doc.text(detail, 105, 170 + (index * 7), { align: 'center' });
        });
        
        // Confidentiality notice
        doc.setFillColor(220, 53, 69);
        doc.rect(30, 240, 150, 25, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('CONFIDENTIAL DOCUMENT', 105, 250, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('This report contains sensitive financial and work data', 105, 260, { align: 'center' });
    }

    // Premium Executive Summary
    addPremiumExecutiveSummary(doc, colors, summary, reportData, yPos) {
        // Section header
        this.addPremiumSectionHeader(doc, colors, 'EXECUTIVE SUMMARY', yPos);
        yPos += 25;
        
        // Key metrics cards
        const metrics = [
            { 
                title: 'Work Performance', 
                value: `${summary.totalWorked} Days`, 
                subtitle: 'Total Work Completed',
                icon: '📊'
            },
            { 
                title: 'Financial Status', 
                value: `₹${Math.abs(summary.totalEarned)}`, 
                subtitle: 'Total Earnings',
                icon: '💰'
            },
            { 
                title: 'Payment Status', 
                value: `₹${Math.abs(summary.totalPaid)}`, 
                subtitle: 'Amount Received',
                icon: '💳'
            },
            { 
                title: 'Balance', 
                value: `₹${Math.abs(summary.currentBalance)}`, 
                subtitle: summary.currentBalance >= 0 ? 'Outstanding' : 'Advanced',
                icon: summary.currentBalance >= 0 ? '📈' : '📉'
            }
        ];
        
        metrics.forEach((metric, index) => {
            const x = 30 + (index % 2) * 75;
            const y = yPos + Math.floor(index / 2) * 45;
            this.drawPremiumMetricCard(doc, colors, metric, x, y, 70, 40);
        });
        
        yPos += 100;
        
        // Performance indicators
        this.addPerformanceIndicators(doc, colors, summary, yPos);
        yPos += 50;
        
        // Status summary
        this.addStatusSummary(doc, colors, summary, yPos);
        
        return yPos + 40;
    }

    // Premium Financial Analytics
    addPremiumFinancialAnalytics(doc, colors, data, reportData, yPos) {
        this.addPremiumSectionHeader(doc, colors, 'FINANCIAL ANALYTICS & INSIGHTS', yPos);
        yPos += 25;
        
        const summary = data.summary;
        
        // Financial ratios and metrics
        const avgDaily = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        const workConsistency = this.calculateWorkConsistency(data.workRecords);
        
        // Analytics grid
        const analytics = [
            { label: 'Average Daily Earnings', value: `₹${avgDaily.toFixed(2)}`, trend: 'neutral' },
            { label: 'Payment Collection Rate', value: `${paymentEfficiency.toFixed(1)}%`, trend: paymentEfficiency > 80 ? 'positive' : 'negative' },
            { label: 'Work Consistency Score', value: `${workConsistency.toFixed(1)}%`, trend: workConsistency > 70 ? 'positive' : 'neutral' },
            { label: 'Current Streak', value: `${summary.currentStreak || 0} days`, trend: 'positive' }
        ];
        
        analytics.forEach((item, index) => {
            const x = 30 + (index % 2) * 75;
            const y = yPos + Math.floor(index / 2) * 25;
            
            // Trend indicator
            const trendColor = item.trend === 'positive' ? colors.success : 
                              item.trend === 'negative' ? colors.danger : colors.muted;
            
            doc.setFillColor(...trendColor);
            doc.circle(x - 3, y - 2, 2, 'F');
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(item.label, x + 3, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(item.value, x + 3, y + 8);
        });
        
        yPos += 60;
        
        // Financial timeline chart (simplified representation)
        this.addFinancialTimeline(doc, colors, data, yPos);
        
        return yPos + 80;
    }

    // Premium Work Records Section
    addPremiumWorkRecords(doc, colors, workRecords, payments, reportData, yPos) {
        this.addPremiumSectionHeader(doc, colors, 'DETAILED WORK RECORDS', yPos);
        yPos += 25;
        
        // Table header
        doc.setFillColor(...colors.primary);
        doc.rect(20, yPos, 170, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('DATE', 25, yPos + 7);
        doc.text('DAY', 50, yPos + 7);
        doc.text('STATUS', 75, yPos + 7);
        doc.text('WAGE', 100, yPos + 7);
        doc.text('PAID', 120, yPos + 7);
        doc.text('PAYMENT DATE', 140, yPos + 7);
        doc.text('NOTES', 170, yPos + 7);
        
        yPos += 15;
        
        // Sort records by date (newest first)
        const sortedRecords = workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedRecords.forEach((record, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                // Repeat header on new page
                doc.setFillColor(...colors.primary);
                doc.rect(20, yPos, 170, 12, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text('DATE', 25, yPos + 7);
                doc.text('DAY', 50, yPos + 7);
                doc.text('STATUS', 75, yPos + 7);
                doc.text('WAGE', 100, yPos + 7);
                doc.text('PAID', 120, yPos + 7);
                doc.text('PAYMENT DATE', 140, yPos + 7);
                doc.text('NOTES', 170, yPos + 7);
                yPos += 15;
            }
            
            // Alternating row colors
            if (index % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }
            
            // Find payment info for this record
            const payment = payments.find(p => p.workDates && p.workDates.includes(record.date));
            const isPaid = !!payment;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            
            // Date
            const date = new Date(record.date);
            doc.text(date.toLocaleDateString('en-IN'), 25, yPos + 5);
            
            // Day
            doc.text(date.toLocaleDateString('en-US', { weekday: 'short' }), 50, yPos + 5);
            
            // Status with color coding
            const statusColor = record.status === 'completed' ? colors.success : colors.danger;
            doc.setTextColor(...statusColor);
            doc.text(record.status.toUpperCase(), 75, yPos + 5);
            
            // Wage
            doc.setTextColor(...colors.secondary);
            doc.text(`₹${record.wage}`, 100, yPos + 5);
            
            // Paid status
            const paidStatusColor = isPaid ? colors.success : colors.danger;
            doc.setTextColor(...paidStatusColor);
            doc.text(isPaid ? 'YES' : 'NO', 120, yPos + 5);
            
            // Payment date
            doc.setTextColor(...colors.secondary);
            if (payment) {
                const payDate = new Date(payment.paymentDate);
                doc.text(payDate.toLocaleDateString('en-IN'), 140, yPos + 5);
            } else {
                doc.text('-', 140, yPos + 5);
            }
            
            // Notes (status indicators)
            doc.setTextColor(...colors.muted);
            const notes = [];
            if (record.status === 'completed' && !isPaid) notes.push('Unpaid');
            if (payment && payment.isAdvance) notes.push('Advance');
            doc.text(notes.join(', ') || '-', 170, yPos + 5);
            
            yPos += 10;
        });
        
        return yPos + 10;
    }

    // Premium Payment History
    addPremiumPaymentHistory(doc, colors, payments, reportData, yPos) {
        this.addPremiumSectionHeader(doc, colors, 'PAYMENT TRANSACTION HISTORY', yPos);
        yPos += 25;
        
        // Table header
        doc.setFillColor(...colors.success);
        doc.rect(20, yPos, 170, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('DATE', 25, yPos + 7);
        doc.text('AMOUNT', 55, yPos + 7);
        doc.text('TYPE', 85, yPos + 7);
        doc.text('WORK DAYS', 110, yPos + 7);
        doc.text('DAYS COVERED', 145, yPos + 7);
        doc.text('STATUS', 175, yPos + 7);
        
        yPos += 15;
        
        // Sort payments by date (newest first)
        const sortedPayments = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        
        sortedPayments.forEach((payment, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                // Repeat header
                doc.setFillColor(...colors.success);
                doc.rect(20, yPos, 170, 12, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text('DATE', 25, yPos + 7);
                doc.text('AMOUNT', 55, yPos + 7);
                doc.text('TYPE', 85, yPos + 7);
                doc.text('WORK DAYS', 110, yPos + 7);
                doc.text('DAYS COVERED', 145, yPos + 7);
                doc.text('STATUS', 175, yPos + 7);
                yPos += 15;
            }
            
            // Alternating row colors
            if (index % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            
            // Payment date
            const payDate = new Date(payment.paymentDate);
            doc.text(payDate.toLocaleDateString('en-IN'), 25, yPos + 5);
            
            // Amount
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(`₹${payment.amount}`, 55, yPos + 5);
            
            // Type
            doc.setFont('helvetica', 'normal');
            const typeColor = payment.isAdvance ? colors.warning : colors.success;
            doc.setTextColor(...typeColor);
            doc.text(payment.isAdvance ? 'ADVANCE' : 'REGULAR', 85, yPos + 5);
            
            // Work days covered
            doc.setTextColor(...colors.secondary);
            const workDaysCount = payment.workDates ? payment.workDates.length : 0;
            doc.text(workDaysCount.toString(), 110, yPos + 5);
            
            // Days covered calculation
            const daysCovered = Math.ceil(payment.amount / (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25));
            doc.text(daysCovered.toString(), 145, yPos + 5);
            
            // Status
            doc.setTextColor(...colors.success);
            doc.text('COMPLETED', 175, yPos + 5);
            
            yPos += 10;
        });
        
        // Payment summary
        yPos += 10;
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        const advancePayments = payments.filter(p => p.isAdvance);
        const regularPayments = payments.filter(p => !p.isAdvance);
        
        doc.setFillColor(...colors.light);
        doc.rect(20, yPos, 170, 30, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colors.primary);
        doc.text('PAYMENT SUMMARY', 25, yPos + 10);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text(`Total Payments: ₹${totalPayments}`, 25, yPos + 20);
        doc.text(`Regular Payments: ${regularPayments.length}`, 80, yPos + 20);
        doc.text(`Advance Payments: ${advancePayments.length}`, 140, yPos + 20);
        
        return yPos + 35;
    }

    // Premium Performance Insights
    addPremiumPerformanceInsights(doc, colors, data, reportData, yPos) {
        this.addPremiumSectionHeader(doc, colors, 'PERFORMANCE INSIGHTS & RECOMMENDATIONS', yPos);
        yPos += 25;
        
        const summary = data.summary;
        const insights = this.generatePerformanceInsights(data);
        
        insights.forEach((insight, index) => {
            // Insight box
            const boxColor = insight.type === 'positive' ? colors.success :
                            insight.type === 'warning' ? colors.warning : colors.primary;
            
            doc.setFillColor(...boxColor, 0.1);
            doc.rect(20, yPos, 170, 20, 'F');
            doc.setDrawColor(...boxColor);
            doc.setLineWidth(0.5);
            doc.rect(20, yPos, 170, 20, 'S');
            
            // Icon
            doc.setFillColor(...boxColor);
            doc.circle(30, yPos + 10, 3, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(insight.icon, 30, yPos + 11, { align: 'center' });
            
            // Title and description
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(insight.title, 40, yPos + 8);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.muted);
            doc.text(insight.description, 40, yPos + 15);
            
            yPos += 25;
        });
        
        return yPos + 10;
    }

    // Premium Monthly Breakdown
    addPremiumMonthlyBreakdown(doc, colors, data, reportData, yPos) {
        this.addPremiumSectionHeader(doc, colors, 'MONTHLY PERFORMANCE BREAKDOWN', yPos);
        yPos += 25;
        
        // Calculate monthly data
        const monthlyData = this.calculateMonthlyBreakdown(data.workRecords, data.payments);
        
        // Table header
        doc.setFillColor(...colors.primary);
        doc.rect(20, yPos, 170, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('MONTH', 25, yPos + 7);
        doc.text('WORK DAYS', 60, yPos + 7);
        doc.text('EARNINGS', 90, yPos + 7);
        doc.text('PAYMENTS', 120, yPos + 7);
        doc.text('BALANCE', 150, yPos + 7);
        doc.text('EFFICIENCY', 175, yPos + 7);
        
        yPos += 15;
        
        Object.entries(monthlyData).forEach(([month, data], index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                // Repeat header
                doc.setFillColor(...colors.primary);
                doc.rect(20, yPos, 170, 12, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text('MONTH', 25, yPos + 7);
                doc.text('WORK DAYS', 60, yPos + 7);
                doc.text('EARNINGS', 90, yPos + 7);
                doc.text('PAYMENTS', 120, yPos + 7);
                doc.text('BALANCE', 150, yPos + 7);
                doc.text('EFFICIENCY', 175, yPos + 7);
                yPos += 15;
            }
            
            // Alternating row colors
            if (index % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            
            doc.text(month, 25, yPos + 5);
            doc.text(data.workDays.toString(), 60, yPos + 5);
            doc.text(`₹${data.earnings}`, 90, yPos + 5);
            doc.text(`₹${data.payments}`, 120, yPos + 5);
            
            // Balance with color coding
            const balanceColor = data.balance >= 0 ? colors.success : colors.danger;
            doc.setTextColor(...balanceColor);
            doc.text(`₹${Math.abs(data.balance)}`, 150, yPos + 5);
            
            // Efficiency
            doc.setTextColor(...colors.secondary);
            doc.text(`${data.efficiency.toFixed(1)}%`, 175, yPos + 5);
            
            yPos += 10;
        });
        
        return yPos + 10;
    }

    // Helper functions for premium PDF
    addPremiumSectionHeader(doc, colors, title, yPos) {
        // Gradient header background
        doc.setFillColor(...colors.primary);
        doc.rect(15, yPos - 5, 180, 18, 'F');
        
        // Accent line
        doc.setFillColor(...colors.accent || [255, 255, 255]);
        doc.rect(15, yPos + 13, 180, 2, 'F');
        
        // Title text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 20, yPos + 7);
    }

    drawPremiumMetricCard(doc, colors, metric, x, y, width, height) {
        // Card background
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, width, height, 'F');
        
        // Card border
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.rect(x, y, width, height, 'S');
        
        // Accent bar
        doc.setFillColor(...colors.primary);
        doc.rect(x, y, width, 3, 'F');
        
        // Icon
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.text(metric.icon, x + 5, y + 15);
        
        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text(metric.title, x + 5, y + 25);
        
        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text(metric.value, x + 5, y + 32);
        
        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);
        doc.text(metric.subtitle, x + 5, y + 38);
    }

    addPerformanceIndicators(doc, colors, summary, yPos) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('PERFORMANCE INDICATORS', 30, yPos);
        
        yPos += 15;
        
        // Performance bars
        const indicators = [
            { label: 'Work Consistency', value: 85, color: colors.success },
            { label: 'Payment Efficiency', value: summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0, color: colors.primary },
            { label: 'Financial Health', value: summary.currentBalance >= 0 ? 70 : 90, color: summary.currentBalance >= 0 ? colors.warning : colors.success }
        ];
        
        indicators.forEach((indicator, index) => {
            const y = yPos + (index * 12);
            
            // Label
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.secondary);
            doc.text(indicator.label, 30, y);
            
            // Progress bar background
            doc.setFillColor(240, 240, 240);
            doc.rect(100, y - 4, 80, 6, 'F');
            
            // Progress bar fill
            const fillWidth = (indicator.value / 100) * 80;
            doc.setFillColor(...indicator.color);
            doc.rect(100, y - 4, fillWidth, 6, 'F');
            
            // Percentage
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...colors.primary);
            doc.text(`${indicator.value.toFixed(1)}%`, 185, y);
        });
    }

    addStatusSummary(doc, colors, summary, yPos) {
        let statusText = '';
        let statusColor = colors.success;
        
        if (summary.currentBalance > 0) {
            statusText = `Outstanding Payment: ₹${summary.currentBalance} - Payment collection recommended`;
            statusColor = colors.danger;
        } else if (summary.currentBalance < 0) {
            statusText = `Advance Payment: ₹${Math.abs(summary.currentBalance)} - Work completion required`;
            statusColor = colors.warning;
        } else {
            statusText = 'All payments up to date - Excellent financial standing';
            statusColor = colors.success;
        }
        
        doc.setFillColor(...statusColor);
        doc.rect(20, yPos, 170, 15, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, 105, yPos + 9, { align: 'center' });
    }

    addFinancialTimeline(doc, colors, data, yPos) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('FINANCIAL TIMELINE', 30, yPos);
        
        yPos += 15;
        
        // Simple timeline representation
        const recentRecords = data.workRecords
            .filter(r => r.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        recentRecords.forEach((record, index) => {
            const x = 30 + (index * 15);
            const y = yPos + 10;
            
            // Timeline dot
            doc.setFillColor(...colors.primary);
            doc.circle(x, y, 2, 'F');
            
            // Date label
            const date = new Date(record.date);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(...colors.muted);
            doc.text(date.getDate().toString(), x, y + 8, { align: 'center' });
        });
        
        // Timeline line
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(1);
        doc.line(30, yPos + 10, 30 + (recentRecords.length * 15), yPos + 10);
    }

    addPremiumFooter(doc, colors, reportData, pageNum, totalPages) {
        const y = 280;
        
        // Footer background
        doc.setFillColor(...colors.light);
        doc.rect(0, y, 210, 17, 'F');
        
        // Footer content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        
        // Left side - Company info
        doc.text('R-Service Tracker Premium Report', 20, y + 8);
        doc.text(`Generated: ${reportData.generatedTime.toLocaleDateString('en-IN')}`, 20, y + 12);
        
        // Center - Confidentiality
        doc.text(reportData.confidentialityLevel, 105, y + 10, { align: 'center' });
        
        // Right side - Page info
        doc.text(`Page ${pageNum} of ${totalPages}`, 190, y + 8, { align: 'right' });
        doc.text(`Report ID: ${reportData.reportId}`, 190, y + 12, { align: 'right' });
    }

    // Helper calculation functions
    calculateWorkConsistency(workRecords) {
        if (!workRecords || workRecords.length === 0) return 0;
        
        const completedRecords = workRecords.filter(r => r.status === 'completed');
        return (completedRecords.length / workRecords.length) * 100;
    }

    generatePerformanceInsights(data) {
        const insights = [];
        const summary = data.summary;
        
        // Work performance insights
        if (summary.totalWorked >= 20) {
            insights.push({
                type: 'positive',
                icon: '⭐',
                title: 'Excellent Work Performance',
                description: `You have completed ${summary.totalWorked} work days, showing strong commitment.`
            });
        } else if (summary.totalWorked >= 10) {
            insights.push({
                type: 'neutral',
                icon: '📊',
                title: 'Good Work Performance',
                description: `${summary.totalWorked} work days completed. Consider increasing consistency.`
            });
        } else {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Work Performance Needs Attention',
                description: `Only ${summary.totalWorked} work days completed. Focus on regular work schedule.`
            });
        }
        
        // Payment insights
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        if (paymentEfficiency >= 90) {
            insights.push({
                type: 'positive',
                icon: '💰',
                title: 'Excellent Payment Collection',
                description: `${paymentEfficiency.toFixed(1)}% of earnings collected. Outstanding financial management.`
            });
        } else if (paymentEfficiency >= 70) {
            insights.push({
                type: 'neutral',
                icon: '💳',
                title: 'Good Payment Collection',
                description: `${paymentEfficiency.toFixed(1)}% collection rate. Consider following up on outstanding payments.`
            });
        } else {
            insights.push({
                type: 'warning',
                icon: '📈',
                title: 'Payment Collection Needs Improvement',
                description: `Only ${paymentEfficiency.toFixed(1)}% collected. Focus on regular payment collection.`
            });
        }
        
        // Balance insights
        if (summary.currentBalance > 100) {
            insights.push({
                type: 'warning',
                icon: '🔔',
                title: 'Outstanding Payment Alert',
                description: `₹${summary.currentBalance} pending collection. Schedule payment collection soon.`
            });
        } else if (summary.currentBalance < -50) {
            insights.push({
                type: 'neutral',
                icon: '📋',
                title: 'Advance Payment Status',
                description: `₹${Math.abs(summary.currentBalance)} advance received. Complete remaining work commitments.`
            });
        }
        
        return insights;
    }

    calculateMonthlyBreakdown(workRecords, payments) {
        const monthlyData = {};
        
        // Process work records
        workRecords.forEach(record => {
            if (record.status === 'completed') {
                const key = `${record.year}-${record.month.toString().padStart(2, '0')}`;
                const monthName = new Date(record.year, record.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                if (!monthlyData[monthName]) {
                    monthlyData[monthName] = {
                        workDays: 0,
                        earnings: 0,
                        payments: 0,
                        balance: 0,
                        efficiency: 0
                    };
                }
                
                monthlyData[monthName].workDays++;
                monthlyData[monthName].earnings += record.wage;
            }
        });
        
        // Process payments
        payments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate);
            const monthName = paymentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            if (monthlyData[monthName]) {
                monthlyData[monthName].payments += payment.amount;
            }
        });
        
        // Calculate balances and efficiency
        Object.keys(monthlyData).forEach(month => {
            const data = monthlyData[month];
            data.balance = data.earnings - data.payments;
            data.efficiency = data.earnings > 0 ? (data.payments / data.earnings * 100) : 0;
        });
        
        return monthlyData;
    }

    getPDFColorsFromTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'blue-light';
        
        const themeColors = {
            'blue-light': {
                primary: [33, 150, 243],      // Blue
                secondary: [33, 37, 41],      // Dark gray
                accent: [227, 242, 253],      // Light blue accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'blue-dark': {
                primary: [33, 150, 243],      // Blue
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [227, 242, 253],      // Light blue accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            },
            'orange-light': {
                primary: [255, 107, 53],      // Orange
                secondary: [33, 37, 41],      // Dark gray
                accent: [255, 224, 178],      // Light orange accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'orange-dark': {
                primary: [255, 107, 53],      // Orange
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [255, 224, 178],      // Light orange accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            },
            'green-light': {
                primary: [76, 175, 80],       // Green
                secondary: [33, 37, 41],      // Dark gray
                accent: [232, 245, 232],      // Light green accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'green-dark': {
                primary: [76, 175, 80],       // Green
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [232, 245, 232],      // Light green accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            },
            'red-light': {
                primary: [244, 67, 54],       // Red
                secondary: [33, 37, 41],      // Dark gray
                accent: [255, 235, 238],      // Light red accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'red-dark': {
                primary: [244, 67, 54],       // Red
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [255, 235, 238],      // Light red accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            },
            'monochrome-light': {
                primary: [33, 37, 41],        // Dark gray
                secondary: [33, 37, 41],      // Dark gray
                accent: [173, 181, 189],      // Medium gray accent
                success: [40, 167, 69],       // Green (keep for status)
                warning: [255, 193, 7],       // Yellow (keep for status)
                danger: [220, 53, 69],        // Red (keep for status)
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'monochrome-dark': {
                primary: [248, 249, 250],     // Light gray for dark theme
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [173, 181, 189],      // Medium gray accent
                success: [40, 167, 69],       // Green (keep for status)
                warning: [255, 193, 7],       // Yellow (keep for status)
                danger: [220, 53, 69],        // Red (keep for status)
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            }
        };
        
        return themeColors[currentTheme] || themeColors['blue-light'];
    }
}

window.Utils = Utils;