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
            console.log('PDF Export: Starting premium PDF generation with data:', data);
            
            let jsPDF;
            if (typeof window.jsPDF !== 'undefined') {
                jsPDF = window.jsPDF.jsPDF || window.jsPDF;
            } else if (typeof window.jspdf !== 'undefined') {
                jsPDF = window.jspdf.jsPDF;
            } else {
                console.error('jsPDF library not found. Please ensure jsPDF is loaded.');
                throw new Error('jsPDF library not loaded');
            }

            console.log('PDF Export: Initializing premium PDF document');
            const doc = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });
            
            // Set premium document properties with clean text only
            doc.setProperties({
                title: 'R-Service Tracker Premium Report',
                subject: 'Professional Work Management and Payment Report',
                author: 'R-Service Tracker System',
                creator: 'R-Service Tracker Premium v1.0.0',
                producer: 'R-Service Premium PDF Generator',
                keywords: 'work management, payment tracking, professional report'
            });
            
            const colors = this.getPremiumPDFColors();
            const reportData = this.generateRealReportData(data);
            console.log('PDF Export: Using premium theme colors and real data');
            
            this.addPremiumHeader(doc, colors, reportData);
            
            let yPos = 85;
            
            yPos = this.addPremiumCompanySection(doc, colors, yPos);
            
            if (data.summary) {
                yPos = this.addPremiumExecutiveSummary(doc, colors, data.summary, reportData, yPos);
            }
            
            if (data.summary) {
                yPos = this.addPremiumFinancialAnalytics(doc, colors, data.summary, reportData, yPos);
            }
            
            if (data.workRecords && data.workRecords.length > 0) {
                yPos = this.addPremiumWorkRecords(doc, colors, data.workRecords, reportData, yPos);
            }
            
            if (data.payments && data.payments.length > 0) {
                yPos = this.addPremiumPaymentHistory(doc, colors, data.payments, reportData, yPos);
            }
            
            if (data.summary) {
                yPos = this.addPremiumPerformanceMetrics(doc, colors, data.summary, reportData, yPos);
            }
            
            this.addPremiumFooter(doc, colors, reportData);
            
            console.log('PDF Export: Saving premium PDF with filename:', filename);
            doc.save(filename);
            console.log('PDF Export: Premium PDF generated successfully');
            return true;
        } catch (error) {
            console.error('Error generating premium PDF:', error);
            throw error;
        }
    }

    // Generate real report data with proper IDs and formatting
    generateRealReportData(data) {
        const now = new Date();
        const timestamp = now.getTime();
        
        return {
            reportId: `RST${timestamp.toString().slice(-8)}`,
            transactionId: `TXN${(timestamp + 12345).toString().slice(-8)}`,
            batchId: `BCH${(timestamp + 67890).toString().slice(-8)}`,
            sessionId: `SES${(timestamp + 11111).toString().slice(-8)}`,
            generatedTime: now,
            reportVersion: '1.0.0',
            systemVersion: 'Premium v1.0.0'
        };
    }

    // Premium color scheme without theme dependencies
    getPremiumPDFColors() {
        return {
            primary: [33, 150, 243],      // Professional blue
            secondary: [66, 66, 66],       // Dark gray
            accent: [76, 175, 80],         // Success green
            light: [248, 249, 250],        // Light background
            success: [76, 175, 80],        // Green
            warning: [255, 152, 0],        // Orange
            danger: [244, 67, 54],         // Red
            text: [33, 33, 33],            // Primary text
            muted: [117, 117, 117]         // Muted text
        };
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

    addPremiumHeader(doc, colors, reportData) {
        // Premium header background with clean design
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 45, 'F');
        
        // Accent bar
        doc.setFillColor(...colors.accent);
        doc.rect(0, 45, 210, 3, 'F');
        
        // Company branding section - clean text only
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.setTextColor(255, 255, 255);
        doc.text('R-Service Tracker', 25, 25);
        
        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text('Professional Work and Payment Management Report', 25, 38);
        
        // Metadata section
        doc.setFillColor(252, 252, 252);
        doc.rect(0, 50, 210, 20, 'F');
        
        // Clean metadata without symbols
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        
        doc.text(`Generated: ${this.formatDateTimeClean(reportData.generatedTime)}`, 25, 58);
        doc.text(`Report ID: ${reportData.reportId}`, 25, 64);
        
        doc.text('Timezone: Asia Kolkata IST', 120, 58);
        doc.text('Format: Premium PDF Report', 120, 64);
        
        // Clean separator line
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(1);
        doc.line(25, 75, 185, 75);
    }

    addPremiumCompanySection(doc, colors, yPos) {
        // Company information section with clean design
        doc.setFillColor(...colors.light);
        doc.rect(25, yPos, 160, 35, 'F');
        
        // Section border
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.rect(25, yPos, 160, 35, 'S');
        
        // Section header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...colors.primary);
        doc.text('SERVICE PROVIDER INFORMATION', 30, yPos + 10);
        
        // Information content - clean text only
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        
        doc.text('Service Provider: R-Service Work Tracking', 30, yPos + 20);
        doc.text('Report Type: Premium Work Management Summary', 30, yPos + 26);
        doc.text(`Daily Rate: ${this.formatCurrencyClean(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25)} per day`, 30, yPos + 32);
        
        return yPos + 45;
    }

    addPremiumExecutiveSummary(doc, colors, summary, reportData, yPos) {
        if (yPos > 230) {
            doc.addPage();
            yPos = 25;
        }
        
        // Section header
        doc.setFillColor(...colors.primary);
        doc.rect(25, yPos, 160, 20, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('EXECUTIVE SUMMARY', 30, yPos + 13);
        yPos += 30;
        
        // Summary metrics in clean format
        const metrics = [
            { label: 'Total Days Worked', value: `${summary.totalWorked} days` },
            { label: 'Total Earnings', value: this.formatCurrencyClean(summary.totalEarned) },
            { label: 'Amount Received', value: this.formatCurrencyClean(summary.totalPaid) },
            { label: 'Outstanding Balance', value: this.formatCurrencyClean(summary.currentBalance) }
        ];
        
        metrics.forEach((metric, index) => {
            const x = 30 + (index % 2) * 80;
            const y = yPos + Math.floor(index / 2) * 25;
            
            // Metric card
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, 75, 20, 'F');
            doc.setDrawColor(...colors.accent);
            doc.setLineWidth(0.3);
            doc.rect(x, y, 75, 20, 'S');
            
            // Metric content
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.muted);
            doc.text(metric.label, x + 3, y + 8);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, x + 3, y + 15);
        });
        
        return yPos + 55;
    }

    addPremiumFinancialAnalytics(doc, colors, summary, reportData, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 25;
        }
        
        // Section header
        doc.setFillColor(...colors.accent);
        doc.rect(25, yPos, 160, 18, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('FINANCIAL ANALYTICS', 30, yPos + 12);
        yPos += 28;
        
        // Analytics data
        const avgEarningsPerDay = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        
        const analytics = [
            { label: 'Average Daily Earnings', value: this.formatCurrencyClean(avgEarningsPerDay) },
            { label: 'Payment Efficiency Rate', value: `${paymentEfficiency.toFixed(1)} percent` },
            { label: 'Work Consistency', value: summary.totalWorked > 0 ? 'Active Status' : 'Inactive Status' },
            { label: 'Transaction ID', value: reportData.transactionId }
        ];
        
        analytics.forEach((item, index) => {
            const y = yPos + index * 12;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...colors.text);
            doc.text(`${item.label}: `, 30, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(item.value, 100, y);
        });
        
        return yPos + 55;
    }

    addPremiumFooter(doc, colors, reportData) {
        const footerY = 275;
        
        // Footer background
        doc.setFillColor(...colors.light);
        doc.rect(0, footerY, 210, 22, 'F');
        
        // Top border
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(1);
        doc.line(0, footerY, 210, footerY);
        
        // Company information
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('R-Service Tracker', 25, footerY + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        doc.text('Professional Work Management System', 25, footerY + 14);
        doc.text('Generated automatically - All data remains private on your device', 25, footerY + 19);
        
        // Right side information - clean text only
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colors.primary);
        doc.text('Privacy Protected', 140, footerY + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.muted);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, 140, footerY + 14);
        doc.text(`Session: ${reportData.sessionId}`, 140, footerY + 19);
    }

    addPremiumWorkRecords(doc, colors, workRecords, reportData, yPos) {
        if (yPos > 180) {
            doc.addPage();
            yPos = 25;
        }
        
        // Section header
        doc.setFillColor(...colors.warning);
        doc.rect(25, yPos, 160, 18, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('DETAILED WORK RECORDS', 30, yPos + 12);
        yPos += 28;
        
        // Table header
        doc.setFillColor(...colors.light);
        doc.rect(25, yPos, 160, 15, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.3);
        doc.rect(25, yPos, 160, 15, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        doc.text('Date', 30, yPos + 10);
        doc.text('Status', 80, yPos + 10);
        doc.text('Earnings', 130, yPos + 10);
        doc.text('Batch ID', 160, yPos + 10);
        yPos += 15;
        
        // Work records data (limit to recent 10 for space)
        const recentRecords = workRecords.slice(-10);
        recentRecords.forEach((record, index) => {
            const recordY = yPos + index * 12;
            
            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(25, recordY, 160, 12, 'F');
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.text);
            
            const date = new Date(record.date);
            doc.text(date.toLocaleDateString('en-IN'), 30, recordY + 8);
            doc.text(record.status === 'completed' ? 'Completed' : 'Pending', 80, recordY + 8);
            doc.text(record.status === 'completed' ? this.formatCurrencyClean(record.wage || 25) : '0 Rupees', 130, recordY + 8);
            doc.text(`BCH${(index + 1000).toString().slice(-4)}`, 160, recordY + 8);
        });
        
        return yPos + (recentRecords.length * 12) + 15;
    }

    addPremiumPaymentHistory(doc, colors, payments, reportData, yPos) {
        if (yPos > 150) {
            doc.addPage();
            yPos = 25;
        }
        
        // Section header
        doc.setFillColor(...colors.success);
        doc.rect(25, yPos, 160, 18, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('PAYMENT TRANSACTION HISTORY', 30, yPos + 12);
        yPos += 28;
        
        // Table header
        doc.setFillColor(...colors.light);
        doc.rect(25, yPos, 160, 15, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.3);
        doc.rect(25, yPos, 160, 15, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        doc.text('Date', 30, yPos + 10);
        doc.text('Amount', 70, yPos + 10);
        doc.text('Type', 110, yPos + 10);
        doc.text('Transaction ID', 140, yPos + 10);
        yPos += 15;
        
        // Payment records data
        const recentPayments = payments.slice(-8);
        recentPayments.forEach((payment, index) => {
            const paymentY = yPos + index * 12;
            
            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(25, paymentY, 160, 12, 'F');
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.text);
            
            const date = new Date(payment.date);
            doc.text(date.toLocaleDateString('en-IN'), 30, paymentY + 8);
            doc.text(this.formatCurrencyClean(payment.amount), 70, paymentY + 8);
            doc.text(payment.type || 'Regular', 110, paymentY + 8);
            doc.text(`TXN${(Date.now() + index * 1000).toString().slice(-6)}`, 140, paymentY + 8);
        });
        
        return yPos + (recentPayments.length * 12) + 15;
    }

    addPremiumPerformanceMetrics(doc, colors, summary, reportData, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 25;
        }
        
        // Section header
        doc.setFillColor(...colors.danger);
        doc.rect(25, yPos, 160, 18, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('PERFORMANCE METRICS', 30, yPos + 12);
        yPos += 28;
        
        // Performance data
        const workEfficiency = summary.totalWorked > 0 ? ((summary.totalWorked / 30) * 100) : 0;
        const avgDailyRate = summary.totalWorked > 0 ? (summary.totalEarned / summary.totalWorked) : 0;
        
        const metrics = [
            { label: 'Work Efficiency Rate', value: `${workEfficiency.toFixed(1)} percent` },
            { label: 'Average Daily Rate', value: this.formatCurrencyClean(avgDailyRate) },
            { label: 'Payment Status', value: summary.currentBalance >= 0 ? 'Up to Date' : 'Advance Paid' },
            { label: 'Report Batch ID', value: reportData.batchId },
            { label: 'System Version', value: reportData.systemVersion },
            { label: 'Report Version', value: reportData.reportVersion }
        ];
        
        metrics.forEach((metric, index) => {
            const y = yPos + index * 12;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...colors.text);
            doc.text(`${metric.label}: `, 30, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, 110, y);
        });
        
        return yPos + 80;
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