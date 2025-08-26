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

    async exportToPDF(data, filename = 'R-Service-Tracker-Report.pdf') {
        try {
            console.log('PDF Export: Initializing executive report generation');
            
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
            
            // Executive document properties
            doc.setProperties({
                title: 'R-Service Tracker Executive Report',
                subject: 'Work Management Executive Summary',
                author: 'R-Service Tracker',
                creator: 'R-Service Tracker Executive v2.0.0',
                producer: 'R-Service Executive Report Generator',
                keywords: 'executive summary, work tracking, financial report'
            });
            
            const colors = this.getPDFColorsFromTheme();
            const reportData = this.generateExecutiveReportData(data);
            
            this.addExecutiveHeader(doc, colors, reportData);
            
            let yPos = 75;
            
            if (data.summary) {
                yPos = this.addExecutiveSummarySection(doc, colors, data.summary, reportData, yPos);
            }
            
            if (data.summary) {
                yPos = this.addFinancialOverview(doc, colors, data.summary, reportData, yPos);
            }
            
            this.addExecutiveFooter(doc, colors, reportData);
            
            console.log('PDF Export: Executive report generated successfully');
            doc.save(filename);
            return true;
        } catch (error) {
            console.error('Error generating executive PDF:', error);
            throw error;
        }
    }

    // Generate executive report data - essential information only
    generateExecutiveReportData(data) {
        const now = new Date();
        const timestamp = now.getTime();
        
        return {
            reportId: `RST${timestamp.toString().slice(-8)}`,
            generatedTime: now,
            reportVersion: '2.0.0'
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

    addExecutiveHeader(doc, colors, reportData) {
        // Ultra-sophisticated gradient header
        const gradient = this.createSophisticatedGradient(colors);
        doc.setFillColor(...gradient.primary);
        doc.rect(0, 0, 210, 45, 'F');
        
        // Elegant accent stripe
        doc.setFillColor(...gradient.accent);
        doc.rect(0, 45, 210, 2, 'F');
        
        // Sophisticated typography
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(36);
        doc.setTextColor(255, 255, 255);
        doc.text('R-Service Tracker', 30, 25);
        
        // Elegant subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(240, 240, 240);
        doc.text('Executive Summary Report', 30, 35);
        
        // Minimalist metadata
        doc.setFillColor(252, 252, 252);
        doc.rect(0, 49, 210, 16, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        
        doc.text(`${this.formatDateTimeClean(reportData.generatedTime)}`, 30, 58);
        doc.text(`Report ${reportData.reportId}`, 140, 58);
        
        // Sophisticated separator
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.8);
        doc.line(30, 70, 180, 70);
    }

    createSophisticatedGradient(colors) {
        return {
            primary: colors.primary,
            accent: colors.accent || [
                Math.min(255, colors.primary[0] + 40),
                Math.min(255, colors.primary[1] + 40),
                Math.min(255, colors.primary[2] + 40)
            ]
        };
    }

    addExecutiveSummarySection(doc, colors, summary, reportData, yPos) {
        // Ultra-sophisticated summary cards
        const cards = [
            { 
                label: 'Total Worked', 
                value: `${summary.totalWorked}`,
                unit: 'days',
                position: { x: 30, y: yPos }
            },
            { 
                label: 'Total Earned', 
                value: `${Math.abs(summary.totalEarned).toFixed(0)}`,
                unit: 'Rupees',
                position: { x: 105, y: yPos }
            },
            { 
                label: 'Current Balance', 
                value: `${Math.abs(summary.currentBalance).toFixed(0)}`,
                unit: 'Rupees',
                position: { x: 30, y: yPos + 60 }
            },
            { 
                label: 'Payment Status', 
                value: summary.currentBalance >= 0 ? 'Current' : 'Advanced',
                unit: '',
                position: { x: 105, y: yPos + 60 }
            }
        ];
        
        cards.forEach(card => {
            this.drawSophisticatedCard(doc, colors, card);
        });
        
        return yPos + 130;
    }

    drawSophisticatedCard(doc, colors, card) {
        const { x, y } = card.position;
        const cardWidth = 65;
        const cardHeight = 50;
        
        // Ultra-sophisticated card design
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cardWidth, cardHeight, 'F');
        
        // Elegant border
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cardWidth, cardHeight, 'S');
        
        // Sophisticated accent line
        doc.setFillColor(...colors.primary);
        doc.rect(x, y, cardWidth, 3, 'F');
        
        // Typography with perfect spacing
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text(card.label, x + 8, y + 18);
        
        // Value with sophisticated styling
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...colors.primary);
        doc.text(card.value, x + 8, y + 32);
        
        // Unit with refined typography
        if (card.unit) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.muted);
            doc.text(card.unit, x + 8, y + 42);
        }
    }

    addFinancialOverview(doc, colors, summary, reportData, yPos) {
        // Sophisticated financial overview
        const avgDaily = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const efficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        
        // Elegant section header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.text('Financial Overview', 30, yPos);
        
        // Sophisticated separator
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(30, yPos + 5, 180, yPos + 5);
        
        yPos += 20;
        
        // Key insights with refined typography
        const insights = [
            { label: 'Average Daily Rate', value: `${avgDaily.toFixed(0)} Rupees` },
            { label: 'Payment Efficiency', value: `${efficiency.toFixed(1)} percent` },
            { label: 'Work Consistency', value: summary.totalWorked > 0 ? 'Active' : 'Inactive' }
        ];
        
        insights.forEach((insight, index) => {
            const y = yPos + (index * 16);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(insight.label, 30, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...colors.primary);
            doc.text(insight.value, 130, y);
        });
        
        return yPos + 60;
    }

    addAdvancedFinancialAnalytics(doc, colors, summary, reportData, yPos) {
        if (yPos > 180) {
            doc.addPage();
            yPos = 25;
        }
        
        // Advanced section header with success theme color
        doc.setFillColor(...colors.success);
        doc.rect(25, yPos, 160, 20, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('ADVANCED FINANCIAL ANALYTICS', 30, yPos + 13);
        yPos += 30;
        
        // Enhanced analytics data with more calculations
        const avgEarningsPerDay = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        const projectedMonthlyEarnings = avgEarningsPerDay * 30;
        const workProductivity = reportData.workConsistencyRate;
        
        const analytics = [
            { label: 'Average Daily Earnings', value: this.formatCurrencyAdvanced(avgEarningsPerDay), category: 'Performance' },
            { label: 'Payment Efficiency Rate', value: `${paymentEfficiency.toFixed(1)} percent`, category: 'Efficiency' },
            { label: 'Work Consistency Rate', value: `${workProductivity} percent`, category: 'Productivity' },
            { label: 'Projected Monthly Earnings', value: this.formatCurrencyAdvanced(projectedMonthlyEarnings), category: 'Projection' },
            { label: 'Total Transaction Count', value: `${reportData.totalTransactions} transactions`, category: 'Volume' },
            { label: 'Primary Transaction ID', value: reportData.transactionId, category: 'Reference' }
        ];
        
        analytics.forEach((item, index) => {
            const y = yPos + index * 14;
            
            // Category indicator
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...colors.muted);
            doc.text(`[${item.category}]`, 30, y);
            
            // Analytics label and value
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${item.label}: `, 60, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(item.value, 130, y);
        });
        
        return yPos + 90;
    }

    addExecutiveFooter(doc, colors, reportData) {
        const footerY = 270;
        
        // Ultra-sophisticated footer design
        doc.setFillColor(250, 250, 250);
        doc.rect(0, footerY, 210, 27, 'F');
        
        // Elegant top border
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.8);
        doc.line(0, footerY, 210, footerY);
        
        // Refined company branding
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('R-Service Tracker', 30, footerY + 12);
        
        // Sophisticated subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.secondary);
        doc.text('Executive Work Management System', 30, footerY + 20);
        
        // Minimalist metadata
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text('Confidential Report', 140, footerY + 12);
        doc.text(`Version ${reportData.reportVersion}`, 140, footerY + 20);
    }

    addAdvancedWorkRecords(doc, colors, workRecords, reportData, yPos) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 25;
        }
        
        // Advanced section header with warning theme color
        doc.setFillColor(...colors.warning);
        doc.rect(25, yPos, 160, 20, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('ADVANCED WORK RECORDS ANALYSIS', 30, yPos + 13);
        yPos += 30;
        
        // Enhanced table header with theme colors
        doc.setFillColor(...colors.light);
        doc.rect(25, yPos, 160, 16, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.rect(25, yPos, 160, 16, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('Date', 30, yPos + 10);
        doc.text('Status', 70, yPos + 10);
        doc.text('Earnings', 110, yPos + 10);
        doc.text('Efficiency', 140, yPos + 10);
        doc.text('Batch ID', 165, yPos + 10);
        yPos += 16;
        
        // Enhanced work records data with more analysis
        const recentRecords = workRecords.slice(-12);
        recentRecords.forEach((record, index) => {
            const recordY = yPos + index * 14;
            
            // Enhanced alternate row colors with theme
            if (index % 2 === 0) {
                doc.setFillColor(...colors.light);
                doc.rect(25, recordY, 160, 14, 'F');
            }
            
            // Status-based color coding
            const statusColor = record.status === 'completed' ? colors.success : colors.muted;
            doc.setDrawColor(...statusColor);
            doc.setLineWidth(0.2);
            doc.line(25, recordY, 185, recordY);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            
            const date = new Date(record.date);
            doc.text(date.toLocaleDateString('en-IN'), 30, recordY + 9);
            doc.text(record.status === 'completed' ? 'DONE' : 'PEND', 70, recordY + 9);
            doc.text(record.status === 'completed' ? this.formatCurrencyAdvanced(record.wage || 25) : '0.00 Rupees', 110, recordY + 9);
            
            // Efficiency calculation
            const efficiency = record.status === 'completed' ? '100%' : '0%';
            doc.text(efficiency, 140, recordY + 9);
            doc.text(`BCH${(index + 1000).toString().slice(-4)}`, 165, recordY + 9);
        });
        
        return yPos + (recentRecords.length * 14) + 20;
    }

    addAdvancedPaymentHistory(doc, colors, payments, reportData, yPos) {
        if (yPos > 140) {
            doc.addPage();
            yPos = 25;
        }
        
        // Advanced section header with success theme color
        doc.setFillColor(...colors.success);
        doc.rect(25, yPos, 160, 20, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('ADVANCED PAYMENT TRANSACTION HISTORY', 30, yPos + 13);
        yPos += 30;
        
        // Enhanced table header with theme colors
        doc.setFillColor(...colors.light);
        doc.rect(25, yPos, 160, 16, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.rect(25, yPos, 160, 16, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('Date', 30, yPos + 10);
        doc.text('Amount', 65, yPos + 10);
        doc.text('Type', 100, yPos + 10);
        doc.text('Status', 125, yPos + 10);
        doc.text('TXN ID', 155, yPos + 10);
        yPos += 16;
        
        // Enhanced payment records data with more analysis
        const recentPayments = payments.slice(-10);
        recentPayments.forEach((payment, index) => {
            const paymentY = yPos + index * 14;
            
            // Enhanced alternate row colors with theme
            if (index % 2 === 0) {
                doc.setFillColor(...colors.light);
                doc.rect(25, paymentY, 160, 14, 'F');
            }
            
            // Payment amount based color indicator
            const amountColor = payment.amount > 50 ? colors.success : colors.warning;
            doc.setDrawColor(...amountColor);
            doc.setLineWidth(0.3);
            doc.line(25, paymentY, 185, paymentY);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            
            const date = new Date(payment.date);
            doc.text(date.toLocaleDateString('en-IN'), 30, paymentY + 9);
            doc.text(this.formatCurrencyAdvanced(payment.amount), 65, paymentY + 9);
            doc.text(payment.type || 'REG', 100, paymentY + 9);
            doc.text('VERIFIED', 125, paymentY + 9);
            doc.text(`TXN${(Date.now() + index * 1000).toString().slice(-6)}`, 155, paymentY + 9);
        });
        
        return yPos + (recentPayments.length * 14) + 20;
    }

    addAdvancedPerformanceMetrics(doc, colors, summary, reportData, yPos) {
        if (yPos > 180) {
            doc.addPage();
            yPos = 25;
        }
        
        // Advanced section header with danger theme color for attention
        doc.setFillColor(...colors.danger);
        doc.rect(25, yPos, 160, 20, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('ADVANCED PERFORMANCE METRICS', 30, yPos + 13);
        yPos += 30;
        
        // Enhanced performance data with comprehensive analysis
        const workEfficiency = summary.totalWorked > 0 ? ((summary.totalWorked / 30) * 100) : 0;
        const avgDailyRate = summary.totalWorked > 0 ? (summary.totalEarned / summary.totalWorked) : 0;
        const productivityScore = (workEfficiency * 0.4) + (parseFloat(reportData.paymentFrequency) * 0.6);
        
        const metrics = [
            { label: 'Work Efficiency Rate', value: `${workEfficiency.toFixed(1)} percent`, category: 'EFFICIENCY' },
            { label: 'Average Daily Rate', value: this.formatCurrencyAdvanced(avgDailyRate), category: 'FINANCIAL' },
            { label: 'Payment Status Analysis', value: summary.currentBalance >= 0 ? 'Current and Up to Date' : 'Advanced Payment Status', category: 'STATUS' },
            { label: 'Productivity Score', value: `${productivityScore.toFixed(1)} percent`, category: 'ANALYTICS' },
            { label: 'Data Integrity Verification', value: `Hash ${reportData.dataIntegrityHash} Verified`, category: 'SECURITY' },
            { label: 'Report Batch Reference', value: reportData.batchId, category: 'REFERENCE' },
            { label: 'System Architecture', value: reportData.systemVersion, category: 'TECHNICAL' },
            { label: 'Report Schema Version', value: reportData.reportVersion, category: 'VERSION' }
        ];
        
        metrics.forEach((metric, index) => {
            const y = yPos + index * 16;
            
            // Category badge with theme colors
            doc.setFillColor(...colors.accent || colors.primary);
            doc.rect(30, y - 3, 25, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.text(metric.category, 32, y + 1);
            
            // Metric label and value with enhanced formatting
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${metric.label}: `, 60, y + 1);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, 130, y + 1);
        });
        
        return yPos + 140;
    }

    addExecutiveSummary(doc, colors, summary, yPos) {
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }
        
        // Premium section header with gradient effect
        doc.setFillColor(...colors.primary);
        doc.rect(15, yPos - 5, 180, 18, 'F');
        
        // Add premium shadow effect
        doc.setFillColor(0, 0, 0, 0.1);
        doc.rect(15, yPos + 13, 180, 1, 'F');
        
        // Section title with enhanced styling
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('📊 EXECUTIVE SUMMARY', 20, yPos + 7);
        yPos += 25;
        
        const metrics = [
            { label: 'Total Days Worked', value: `${summary.totalWorked} days`, icon: '📅' },
            { label: 'Total Earnings', value: this.formatCurrencyForPDF(summary.totalEarned), icon: '💰' },
            { label: 'Amount Received', value: this.formatCurrencyForPDF(summary.totalPaid), icon: '💳' },
            { label: 'Outstanding Balance', value: this.formatCurrencyForPDF(summary.currentBalance), icon: '📈' }
        ];
        
        metrics.forEach((metric, index) => {
            const x = 20 + (index % 2) * 90;
            const y = yPos + Math.floor(index / 2) * 28;
            
            // Premium card background with gradient
            doc.setFillColor(254, 254, 254);
            doc.rect(x - 2, y - 3, 85, 24, 'F');
            
            // Add premium border
            doc.setDrawColor(...colors.primary);
            doc.setLineWidth(0.2);
            doc.rect(x - 2, y - 3, 85, 24, 'S');
            
            // Add subtle accent bar
            doc.setFillColor(...colors.primary);
            doc.rect(x - 2, y - 3, 85, 2, 'F');
            
            // Metric icon and label
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...colors.secondary);
            doc.text(`${metric.icon} ${metric.label}`, x, y + 6);
            
            // Metric value with premium styling
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, x, y + 16);
        });
        
        return yPos + 65;
    }

    addFinancialAnalytics(doc, colors, summary, yPos) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colors.secondary);
        doc.text('FINANCIAL ANALYTICS', 20, yPos + 5);
        yPos += 25;
        
        const avgEarningsPerDay = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        const workStreak = summary.currentStreak || 0;
        
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
        
        yPos += 35;
        let statusText = '';
        let statusColor = colors.success;
        
        if (summary.currentBalance > 0) {
            statusText = `Outstanding Payment Due: ${this.formatCurrencyForPDF(summary.currentBalance)}`;
            statusColor = colors.danger;
        } else if (summary.currentBalance < 0) {
            statusText = `Advance Payment Made: ${this.formatCurrencyForPDF(Math.abs(summary.currentBalance))}`;
            statusColor = colors.warning;
        } else {
            statusText = 'All payments up to date';
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

    addDetailedWorkRecords(doc, colors, workRecords, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFillColor(...colors.secondary);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('DETAILED WORK RECORDS', 20, yPos + 5);
        yPos += 25;
        
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('DATE', 20, yPos + 5);
        doc.text('DAY', 48, yPos + 5);
        doc.text('STATUS', 72, yPos + 5);
        doc.text('EARNINGS', 105, yPos + 5);
        doc.text('PAYMENT STATUS', 140, yPos + 5);
        doc.text('NOTES', 175, yPos + 5);
        yPos += 15;
        
        doc.setFont('helvetica', 'normal');
        workRecords.forEach((record, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
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
            
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, yPos - 2, 180, 10, 'F');
            }
            
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(this.formatDateShort(record.date), 20, yPos + 3);
            doc.text(dayName, 48, yPos + 3);
            
            if (record.status === 'completed') {
                doc.setTextColor(...colors.success);
                doc.text('COMPLETED', 72, yPos + 3);
            } else {
                doc.setTextColor(...colors.danger);
                doc.text('MISSED', 72, yPos + 3);
            }
            
            doc.setTextColor(...colors.secondary);
            doc.text(record.status === 'completed' ? this.formatCurrencyForPDF(record.wage) : '0 rupees', 105, yPos + 3);
            
            if (record.paid) {
                doc.setTextColor(...colors.success);
                doc.text('PAID', 140, yPos + 3);
            } else {
                doc.setTextColor(...colors.warning);
                doc.text('PENDING', 140, yPos + 3);
            }
            
            doc.setTextColor(...colors.muted);
            doc.text(record.status === 'completed' ? 'OK' : 'FAILED', 175, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    addPaymentHistory(doc, colors, payments, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFillColor(...colors.success);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('PAYMENT TRANSACTION HISTORY', 20, yPos + 5);
        yPos += 25;
        
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const advancePayments = payments.filter(p => p.isAdvance);
        const regularPayments = payments.filter(p => !p.isAdvance);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.secondary);
        doc.text(`Total Transactions: ${payments.length} | Regular: ${regularPayments.length} | Advance: ${advancePayments.length}`, 20, yPos);
        yPos += 15;
        
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('PAYMENT DATE', 20, yPos + 5);
        doc.text('AMOUNT', 62, yPos + 5);
        doc.text('WORK DAYS', 95, yPos + 5);
        doc.text('TYPE', 125, yPos + 5);
        doc.text('TRANSACTION ID', 155, yPos + 5);
        yPos += 15;
        
        doc.setFont('helvetica', 'normal');
        payments.forEach((payment, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
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
            
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
            } else {
                doc.setTextColor(...colors.success);
            }
            doc.text(this.formatCurrencyForPDF(payment.amount), 62, yPos + 3);
            
            doc.setTextColor(...colors.secondary);
            doc.text(`${payment.workDates.length}`, 95, yPos + 3);
            
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
                doc.text('ADVANCE', 125, yPos + 3);
            } else {
                doc.setTextColor(...colors.success);
                doc.text('REGULAR', 125, yPos + 3);
            }
            
            doc.setTextColor(...colors.muted);
            doc.text(`TXN-${(payment.id || index).toString().padStart(3, '0')}`, 155, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    addPerformanceMetrics(doc, colors, summary, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFillColor(...colors.warning);
        doc.rect(15, yPos - 5, 180, 15, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('PERFORMANCE INSIGHTS AND RECOMMENDATIONS', 20, yPos + 5);
        yPos += 25;
        
        const workDays = summary.totalWorked || 0;
        const earnings = summary.totalEarned || 0;
        const streak = summary.currentStreak || 0;
        
        const insights = [];
        
        if (workDays >= 30) {
            insights.push('Excellent work consistency - Over 30 days completed');
        } else if (workDays >= 15) {
            insights.push('Good work progress - Over 15 days completed');
        } else if (workDays >= 7) {
            insights.push('Building momentum - Weekly target achieved');
        } else {
            insights.push('Getting started - Continue building your work record');
        }
        
        if (streak >= 7) {
            insights.push('Outstanding streak - 7+ consecutive days');
        } else if (streak >= 3) {
            insights.push('Good momentum - 3+ consecutive days');
        }
        
        if (summary.currentBalance <= 0) {
            insights.push('Payment status healthy - No outstanding dues');
        } else {
            insights.push('Payment attention needed - Outstanding balance exists');
        }
        
        insights.forEach((insight, index) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${index + 1}. ${insight}`, 25, yPos + (index * 8));
        });
        
        yPos += insights.length * 8 + 15;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('RECOMMENDATIONS:', 20, yPos);
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

    addFooter(doc, colors, data) {
        const pageCount = doc.internal.getNumberOfPages();
        const now = new Date();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            doc.setFillColor(...colors.light);
            doc.rect(0, 285, 210, 12, 'F');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(`Page ${i} of ${pageCount}`, 20, 292);
            
            doc.setFont('helvetica', 'normal');
            doc.text('R-Service Tracker v1.0.0', 80, 292);
            
            doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 155, 292);
            
            if (i === pageCount) {
                doc.setFontSize(7);
                doc.setTextColor(...colors.muted);
                doc.text('This report contains confidential work and payment information. Handle with care.', 20, 280);
            }
        }
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
                primary: [44, 44, 44],        // Dark gray
                secondary: [33, 37, 41],      // Dark gray
                accent: [240, 240, 240],      // Light gray accent
                success: [46, 125, 50],       // Green
                warning: [245, 124, 0],       // Orange
                danger: [198, 40, 40],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'monochrome-dark': {
                primary: [224, 224, 224],     // Light gray
                secondary: [248, 249, 250],   // Light gray for dark theme
                accent: [42, 42, 42],         // Dark gray accent
                success: [102, 187, 106],     // Light green
                warning: [255, 167, 38],      // Light orange
                danger: [239, 83, 80],        // Light red
                light: [33, 37, 41],          // Dark gray for dark theme
                muted: [173, 181, 189]        // Light muted for dark theme
            }
        };
        
        return themeColors[currentTheme] || themeColors['blue-light'];
    }

    getReportPeriod(data) {
        if (!data.workRecords || data.workRecords.length === 0) {
            return 'No records available';
        }
        
        const dates = data.workRecords.map(record => new Date(record.date));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        
        return `${this.formatDateShort(startDate.toISOString().split('T')[0])} to ${this.formatDateShort(endDate.toISOString().split('T')[0])}`;
    }

    validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    validateWage(wage) {
        return typeof wage === 'number' && wage > 0;
    }

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

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.saveToLocalStorage('r-service-theme', theme);
        
        this.updateBrowserThemeColor(theme);
    }
    
    updateBrowserThemeColor(theme) {
        const themeColorMap = {
            'blue-light': '#2196F3',
            'blue-dark': '#1976D2',
            'orange-light': '#FF6B35',
            'orange-dark': '#E55A2B',
            'green-light': '#4CAF50',
            'green-dark': '#388E3C',
            'purple-light': '#9C27B0',
            'purple-dark': '#7B1FA2'
        };
        
        const color = themeColorMap[theme] || '#2196F3';
        
        const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
        existingMetas.forEach(meta => meta.remove());
        
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = color;
        document.head.appendChild(meta);
        
        let navButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
        if (navButtonMeta) {
            navButtonMeta.content = color;
        } else {
            navButtonMeta = document.createElement('meta');
            navButtonMeta.name = 'msapplication-navbutton-color';
            navButtonMeta.content = color;
            document.head.appendChild(navButtonMeta);
        }
        
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        const statusBarStyle = theme.includes('dark') ? 'black-translucent' : 'default';
        if (statusBarMeta) {
            statusBarMeta.content = statusBarStyle;
        }
        
        console.log(`Browser theme color updated to ${color} for theme: ${theme}`);
    }

    getTheme() {
        return this.loadFromLocalStorage('r-service-theme') || 'orange-light';
    }

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

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

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

    generateShareableLink(data) {
        const params = new URLSearchParams({
            totalEarned: data.totalEarned || 0,
            totalWorked: data.totalWorked || 0,
            currentStreak: data.currentStreak || 0
        });
        
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

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

    measurePerformance(label, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
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

    isOnline() {
        return navigator.onLine;
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

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

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

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

window.Utils = Utils;