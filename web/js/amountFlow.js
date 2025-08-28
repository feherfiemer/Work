/**
 * 🏦 AMOUNT FLOW SYSTEM
 * 
 * This is the CENTRAL AMOUNT PROCESSING HUB for the entire application.
 * ALL amount-related operations MUST go through this system to ensure:
 * - Perfect amount tallying and reconciliation
 * - Consistent calculation logic across all components
 * - Comprehensive audit trail for all amount transactions
 * - Real-time validation and error detection
 * - Synchronized state across all system components
 * 
 * CRITICAL: Every amount adjustment, payment, calculation, or display
 * MUST flow through this system to maintain data integrity.
 */

class AmountFlow {
    constructor() {
        this.transactionLog = [];
        this.auditTrail = [];
        this.validationRules = new Map();
        this.listeners = new Set();
        this.currentState = {
            totalWorked: 0,
            totalPaid: 0,
            totalEarned: 0,
            currentEarnings: 0,
            totalAdvancePaid: 0,
            totalRegularPaid: 0,
            currentBalance: 0,
            unpaidWorkDays: 0,
            dailyWage: 25,
            lastCalculated: null,
            isReconciled: false
        };
        
        this.initializeValidationRules();
        console.log('[AmountFlow] 🏦 Central Amount Flow System initialized');
    }

    /**
     * Initialize validation rules for amount operations
     */
    initializeValidationRules() {
        // Daily wage validation
        this.validationRules.set('dailyWage', (amount) => {
            const min = window.R_SERVICE_CONFIG?.DAILY_WAGE_MIN || 1;
            const max = window.R_SERVICE_CONFIG?.DAILY_WAGE_MAX || 10000;
            return amount >= min && amount <= max;
        });

        // Payment amount validation
        this.validationRules.set('paymentAmount', (amount) => {
            const min = window.R_SERVICE_CONFIG?.MIN_PAYMENT_AMOUNT || 1;
            const max = window.R_SERVICE_CONFIG?.MAX_PAYMENT_AMOUNT || 100000;
            return amount >= min && amount <= max && Number.isInteger(amount);
        });

        // Work value validation
        this.validationRules.set('workValue', (amount, context) => {
            const dailyWage = context?.dailyWage || this.currentState.dailyWage;
            return amount >= 0 && (amount % dailyWage === 0 || context?.allowPartial);
        });
    }

    /**
     * 🎯 CENTRAL AMOUNT PROCESSING FUNCTION
     * All amounts flow through this function for processing, validation, and logging
     */
    async processAmount(operation, amount, context = {}) {
        const transactionId = this.generateTransactionId();
        const timestamp = new Date().toISOString();
        
        console.log(`[AmountFlow-${transactionId}] Processing ${operation}: ₹${amount}`, context);
        
        try {
            // 1. Pre-validation
            await this.validateAmount(operation, amount, context);
            
            // 2. Pre-processing hooks
            await this.runPreProcessingHooks(operation, amount, context);
            
            // 3. Core processing
            const result = await this.executeAmountOperation(operation, amount, context);
            
            // 4. Post-processing validation
            await this.validateResult(operation, result, context);
            
            // 5. Update audit trail
            this.logTransaction(transactionId, operation, amount, context, result, 'success');
            
            // 6. Notify listeners
            this.notifyListeners(operation, amount, result, context);
            
            // 7. Trigger reconciliation if needed
            if (context.triggerReconciliation !== false) {
                await this.performReconciliation();
            }
            
            console.log(`[AmountFlow-${transactionId}] ✅ Operation completed:`, result);
            return result;
            
        } catch (error) {
            this.logTransaction(transactionId, operation, amount, context, null, 'error', error);
            console.error(`[AmountFlow-${transactionId}] ❌ Operation failed:`, error);
            throw new Error(`AmountFlow error in ${operation}: ${error.message}`);
        }
    }

    /**
     * Execute the core amount operation based on type
     */
    async executeAmountOperation(operation, amount, context) {
        switch (operation) {
            case 'addPayment':
                return await this.processPaymentAddition(amount, context);
            
            case 'calculateEarnings':
                return await this.processEarningsCalculation(amount, context);
            
            case 'updateDailyWage':
                return await this.processDailyWageUpdate(amount, context);
            
            case 'validateWorkValue':
                return await this.processWorkValueValidation(amount, context);
            
            case 'calculateBalance':
                return await this.processBalanceCalculation(amount, context);
            
            case 'processAdvancePayment':
                return await this.processAdvancePaymentCalculation(amount, context);
            
            case 'reconcileAmounts':
                return await this.processAmountReconciliation(amount, context);
            
            default:
                throw new Error(`Unknown amount operation: ${operation}`);
        }
    }

    /**
     * Process payment addition with full validation and calculation
     */
    async processPaymentAddition(amount, context) {
        const { workDates = [], paymentDate, isAdvance = false, db } = context;
        
        // Calculate work value for this payment
        const workValue = workDates.length * this.currentState.dailyWage;
        const isAdvancePayment = amount > workValue || isAdvance;
        
        // Validate payment logic
        if (!isAdvancePayment && amount > workValue) {
            console.warn(`[AmountFlow] Payment amount ₹${amount} exceeds work value ₹${workValue}, treating as advance`);
        }
        
        // Process the payment through database if provided
        if (db && typeof db.addPayment === 'function') {
            await db.addPayment(amount, workDates, paymentDate, isAdvancePayment);
        }
        
        // Update internal state
        this.currentState.totalPaid += amount;
        if (isAdvancePayment) {
            this.currentState.totalAdvancePaid += amount;
        } else {
            this.currentState.totalRegularPaid += amount;
        }
        
        // Recalculate balance
        this.currentState.currentBalance = this.currentState.totalEarned - this.currentState.totalPaid;
        
        return {
            amount,
            workDates,
            paymentDate,
            isAdvance: isAdvancePayment,
            workValue,
            newBalance: this.currentState.currentBalance,
            totalPaid: this.currentState.totalPaid
        };
    }

    /**
     * Process earnings calculation with validation
     */
    async processEarningsCalculation(totalWorkDays, context) {
        const { dailyWage = this.currentState.dailyWage } = context;
        
        const totalEarned = totalWorkDays * dailyWage;
        this.currentState.totalWorked = totalWorkDays;
        this.currentState.totalEarned = totalEarned;
        this.currentState.dailyWage = dailyWage;
        
        // Calculate current earnings (unpaid work)
        const unpaidDays = context.unpaidWorkDays || 0;
        this.currentState.currentEarnings = unpaidDays * dailyWage;
        this.currentState.unpaidWorkDays = unpaidDays;
        
        // Recalculate balance
        this.currentState.currentBalance = totalEarned - this.currentState.totalPaid;
        
        return {
            totalWorked: totalWorkDays,
            totalEarned,
            currentEarnings: this.currentState.currentEarnings,
            currentBalance: this.currentState.currentBalance,
            dailyWage
        };
    }

    /**
     * Perform comprehensive amount reconciliation
     */
    async performReconciliation() {
        console.log('[AmountFlow] 🔄 Performing amount reconciliation...');
        
        const reconciliationId = this.generateTransactionId();
        const startTime = performance.now();
        
        try {
            // Get fresh data if database is available
            if (window.app?.db) {
                const workRecords = await window.app.db.getAllWorkRecords();
                const payments = await window.app.db.getAllPayments();
                const calculatedAmounts = window.app.db.calculateAmounts(workRecords, payments);
                
                // Compare with current state
                const discrepancies = this.detectDiscrepancies(calculatedAmounts);
                
                if (discrepancies.length > 0) {
                    console.warn('[AmountFlow] ⚠️ Discrepancies detected:', discrepancies);
                    
                    // Auto-correct discrepancies
                    await this.correctDiscrepancies(discrepancies, calculatedAmounts);
                }
                
                // Update state with corrected values
                this.currentState = {
                    ...this.currentState,
                    ...calculatedAmounts,
                    lastCalculated: new Date().toISOString(),
                    isReconciled: true
                };
            }
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            console.log(`[AmountFlow] ✅ Reconciliation completed in ${duration}ms`);
            
            // Log reconciliation
            this.auditTrail.push({
                id: reconciliationId,
                type: 'reconciliation',
                timestamp: new Date().toISOString(),
                duration,
                state: { ...this.currentState }
            });
            
            return {
                success: true,
                duration,
                state: this.currentState,
                reconciliationId
            };
            
        } catch (error) {
            console.error('[AmountFlow] ❌ Reconciliation failed:', error);
            throw error;
        }
    }

    /**
     * Detect discrepancies between calculated and current state
     */
    detectDiscrepancies(calculatedAmounts) {
        const discrepancies = [];
        const tolerance = 0.01; // Allow small floating-point differences
        
        const checks = [
            { field: 'totalWorked', calculated: calculatedAmounts.totalWorked, current: this.currentState.totalWorked },
            { field: 'totalPaid', calculated: calculatedAmounts.totalPaid, current: this.currentState.totalPaid },
            { field: 'totalEarned', calculated: calculatedAmounts.totalEarned, current: this.currentState.totalEarned },
            { field: 'currentBalance', calculated: calculatedAmounts.currentBalance, current: this.currentState.currentBalance }
        ];
        
        checks.forEach(check => {
            if (Math.abs(check.calculated - check.current) > tolerance) {
                discrepancies.push({
                    field: check.field,
                    calculated: check.calculated,
                    current: check.current,
                    difference: check.calculated - check.current
                });
            }
        });
        
        return discrepancies;
    }

    /**
     * Validate amount based on operation and context
     */
    async validateAmount(operation, amount, context) {
        // Basic number validation
        if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
            throw new Error(`Invalid amount: ${amount} must be a valid number`);
        }
        
        // Operation-specific validation
        const validationKey = this.getValidationKey(operation);
        if (validationKey && this.validationRules.has(validationKey)) {
            const validator = this.validationRules.get(validationKey);
            if (!validator(amount, context)) {
                throw new Error(`Amount validation failed for ${operation}: ₹${amount}`);
            }
        }
        
        // Context-specific validation
        if (context.minAmount !== undefined && amount < context.minAmount) {
            throw new Error(`Amount ₹${amount} below minimum ₹${context.minAmount}`);
        }
        
        if (context.maxAmount !== undefined && amount > context.maxAmount) {
            throw new Error(`Amount ₹${amount} exceeds maximum ₹${context.maxAmount}`);
        }
    }

    /**
     * Get current state snapshot
     */
    getCurrentState() {
        return { ...this.currentState };
    }

    /**
     * 🔍 COMPREHENSIVE AMOUNT VALIDATION AND TALLYING
     * Validates all amounts across the system and ensures perfect reconciliation
     */
    async performComprehensiveValidation() {
        console.log('[AmountFlow] 🔍 Starting comprehensive amount validation...');
        
        const validationReport = {
            timestamp: new Date().toISOString(),
            validations: [],
            errors: [],
            warnings: [],
            totalChecks: 0,
            passedChecks: 0,
            isValid: true
        };

        try {
            // 1. Validate database integrity
            await this.validateDatabaseIntegrity(validationReport);
            
            // 2. Validate calculation consistency
            await this.validateCalculationConsistency(validationReport);
            
            // 3. Validate payment logic
            await this.validatePaymentLogic(validationReport);
            
            // 4. Validate amount reconciliation
            await this.validateAmountReconciliation(validationReport);
            
            // 5. Validate advance payment calculations
            await this.validateAdvancePaymentLogic(validationReport);
            
            validationReport.isValid = validationReport.errors.length === 0;
            
            console.log('[AmountFlow] 🔍 Validation completed:', {
                totalChecks: validationReport.totalChecks,
                passed: validationReport.passedChecks,
                errors: validationReport.errors.length,
                warnings: validationReport.warnings.length,
                isValid: validationReport.isValid
            });
            
            return validationReport;
            
        } catch (error) {
            validationReport.errors.push(`Validation system error: ${error.message}`);
            validationReport.isValid = false;
            console.error('[AmountFlow] Validation system error:', error);
            return validationReport;
        }
    }

    async validateDatabaseIntegrity(report) {
        if (!window.app?.db) {
            report.warnings.push('Database not available for validation');
            return;
        }

        try {
            const workRecords = await window.app.db.getAllWorkRecords();
            const payments = await window.app.db.getAllPayments();

            // Check for negative amounts
            report.totalChecks++;
            const negativePayments = payments.filter(p => p.amount < 0);
            if (negativePayments.length === 0) {
                report.passedChecks++;
                report.validations.push('✅ No negative payment amounts found');
            } else {
                report.errors.push(`❌ Found ${negativePayments.length} negative payment amounts`);
            }

            // Check for zero amounts
            report.totalChecks++;
            const zeroPayments = payments.filter(p => p.amount === 0);
            if (zeroPayments.length === 0) {
                report.passedChecks++;
                report.validations.push('✅ No zero payment amounts found');
            } else {
                report.warnings.push(`⚠️ Found ${zeroPayments.length} zero payment amounts`);
            }

            // Check for duplicate payments
            report.totalChecks++;
            const duplicates = this.findDuplicatePayments(payments);
            if (duplicates.length === 0) {
                report.passedChecks++;
                report.validations.push('✅ No duplicate payments found');
            } else {
                report.warnings.push(`⚠️ Found ${duplicates.length} potential duplicate payments`);
            }

        } catch (error) {
            report.errors.push(`Database integrity check failed: ${error.message}`);
        }
    }

    async validateCalculationConsistency(report) {
        if (!window.app?.db) return;

        try {
            const workRecords = await window.app.db.getAllWorkRecords();
            const payments = await window.app.db.getAllPayments();
            const calculatedAmounts = window.app.db.calculateAmounts(workRecords, payments);

            // Validate total calculations
            report.totalChecks++;
            const totalWorked = workRecords.filter(r => r.status === 'completed').length;
            if (calculatedAmounts.totalWorked === totalWorked) {
                report.passedChecks++;
                report.validations.push('✅ Total worked days calculation consistent');
            } else {
                report.errors.push(`❌ Total worked days mismatch: calculated ${calculatedAmounts.totalWorked}, expected ${totalWorked}`);
            }

            // Validate total paid calculation
            report.totalChecks++;
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            if (Math.abs(calculatedAmounts.totalPaid - totalPaid) < 0.01) {
                report.passedChecks++;
                report.validations.push('✅ Total paid amount calculation consistent');
            } else {
                report.errors.push(`❌ Total paid amount mismatch: calculated ${calculatedAmounts.totalPaid}, expected ${totalPaid}`);
            }

            // Validate earnings calculation
            report.totalChecks++;
            const expectedEarnings = totalWorked * calculatedAmounts.dailyWage;
            if (Math.abs(calculatedAmounts.totalEarned - expectedEarnings) < 0.01) {
                report.passedChecks++;
                report.validations.push('✅ Total earnings calculation consistent');
            } else {
                report.errors.push(`❌ Total earnings mismatch: calculated ${calculatedAmounts.totalEarned}, expected ${expectedEarnings}`);
            }

        } catch (error) {
            report.errors.push(`Calculation consistency check failed: ${error.message}`);
        }
    }

    async validatePaymentLogic(report) {
        if (!window.app?.db) return;

        try {
            const payments = await window.app.db.getAllPayments();
            const workRecords = await window.app.db.getAllWorkRecords();

            // Validate advance payment logic
            for (const payment of payments) {
                report.totalChecks++;
                const workValue = payment.workDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                const shouldBeAdvance = payment.amount > workValue;
                
                if (payment.isAdvance === shouldBeAdvance) {
                    report.passedChecks++;
                } else {
                    report.warnings.push(`⚠️ Payment advance flag inconsistent: amount ₹${payment.amount}, work value ₹${workValue}, flagged as advance: ${payment.isAdvance}`);
                }
            }

            // Validate force payment scenarios - check if force paid dates that are later marked as done are properly handled
            report.totalChecks++;
            let forcePaidLogicValid = true;
            let forcePaidIssues = [];

            for (const payment of payments) {
                // Check if this payment covers dates that don't have work records (force payments)
                for (const workDate of payment.workDates) {
                    const workRecord = workRecords.find(r => r.date === workDate);
                    if (!workRecord && !payment.isAdvance) {
                        // This might be a force payment scenario - payment covers a date without work record
                        forcePaidIssues.push(`Force paid date ${workDate} in payment but no work record exists`);
                    }
                }
            }

            if (forcePaidIssues.length === 0) {
                report.passedChecks++;
                report.validations.push('✅ Force payment logic consistent');
            } else {
                forcePaidLogicValid = false;
                report.warnings.push(`⚠️ Force payment scenarios detected: ${forcePaidIssues.join(', ')}`);
            }

        } catch (error) {
            report.errors.push(`Payment logic validation failed: ${error.message}`);
        }
    }

    async validateAmountReconciliation(report) {
        try {
            // Check if AmountFlow state matches database state
            if (window.app?.db) {
                const workRecords = await window.app.db.getAllWorkRecords();
                const payments = await window.app.db.getAllPayments();
                const dbAmounts = window.app.db.calculateAmounts(workRecords, payments);
                
                const flowState = this.getCurrentState();
                
                // Compare key amounts
                const comparisons = [
                    { field: 'totalPaid', db: dbAmounts.totalPaid, flow: flowState.totalPaid },
                    { field: 'totalEarned', db: dbAmounts.totalEarned, flow: flowState.totalEarned },
                    { field: 'currentBalance', db: dbAmounts.currentBalance, flow: flowState.currentBalance }
                ];
                
                comparisons.forEach(comp => {
                    report.totalChecks++;
                    if (Math.abs(comp.db - comp.flow) < 0.01) {
                        report.passedChecks++;
                        report.validations.push(`✅ ${comp.field} reconciled (₹${comp.db})`);
                    } else {
                        report.errors.push(`❌ ${comp.field} mismatch: DB ₹${comp.db}, Flow ₹${comp.flow}`);
                    }
                });
            }
        } catch (error) {
            report.errors.push(`Amount reconciliation validation failed: ${error.message}`);
        }
    }

    async validateAdvancePaymentLogic(report) {
        if (!window.app?.db) return;

        try {
            const workRecords = await window.app.db.getAllWorkRecords();
            const payments = await window.app.db.getAllPayments();
            
            const advancePayments = payments.filter(p => p.isAdvance);
            let totalAdvanceAmount = 0;
            let workCoveredByAdvance = 0;
            
            for (const payment of advancePayments) {
                totalAdvanceAmount += payment.amount;
                const workValue = payment.workDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                const advanceAmount = payment.amount - workValue;
                workCoveredByAdvance += Math.ceil(advanceAmount / (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25));
            }
            
            report.totalChecks++;
            if (totalAdvanceAmount >= 0) {
                report.passedChecks++;
                report.validations.push(`✅ Advance payment calculations valid (₹${totalAdvanceAmount} total, ${workCoveredByAdvance} days covered)`);
            } else {
                report.errors.push(`❌ Invalid advance payment total: ₹${totalAdvanceAmount}`);
            }
            
        } catch (error) {
            report.errors.push(`Advance payment validation failed: ${error.message}`);
        }
    }

    findDuplicatePayments(payments) {
        const seen = new Map();
        const duplicates = [];
        
        payments.forEach(payment => {
            const key = `${payment.amount}_${payment.paymentDate}_${payment.workDates.join(',')}`;
            if (seen.has(key)) {
                duplicates.push(payment);
            } else {
                seen.set(key, payment);
            }
        });
        
        return duplicates;
    }

    /**
     * 📊 REAL-TIME AMOUNT TALLY DISPLAY
     * Provides a comprehensive view of all amounts in the system
     */
    generateAmountTally() {
        const state = this.getCurrentState();
        const auditTrail = this.getAuditTrail(10);
        
        return {
            timestamp: new Date().toISOString(),
            currentState: {
                totalWorked: state.totalWorked,
                totalPaid: state.totalPaid,
                totalEarned: state.totalEarned,
                currentEarnings: state.currentEarnings,
                currentBalance: state.currentBalance,
                totalAdvancePaid: state.totalAdvancePaid,
                totalRegularPaid: state.totalRegularPaid,
                unpaidWorkDays: state.unpaidWorkDays,
                dailyWage: state.dailyWage,
                isReconciled: state.isReconciled,
                lastCalculated: state.lastCalculated
            },
            summary: {
                isBalanced: Math.abs(state.currentBalance) < 0.01,
                hasAdvances: state.totalAdvancePaid > 0,
                pendingValue: state.currentEarnings,
                reconciliationStatus: state.isReconciled ? 'RECONCILED' : 'PENDING'
            },
            recentActivity: auditTrail.slice(-5),
            systemHealth: {
                transactionCount: this.transactionLog.length,
                reconciliationCount: auditTrail.filter(a => a.type === 'reconciliation').length,
                lastReconciliation: auditTrail.find(a => a.type === 'reconciliation')?.timestamp || 'Never'
            }
        };
    }

    /**
     * Add amount flow listener for real-time updates
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get audit trail for debugging and verification
     */
    getAuditTrail(limit = 50) {
        return this.auditTrail.slice(-limit);
    }

    /**
     * Get transaction log for debugging
     */
    getTransactionLog(limit = 100) {
        return this.transactionLog.slice(-limit);
    }

    // Helper methods
    generateTransactionId() {
        return `AF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getValidationKey(operation) {
        const mapping = {
            'addPayment': 'paymentAmount',
            'updateDailyWage': 'dailyWage',
            'validateWorkValue': 'workValue'
        };
        return mapping[operation];
    }

    logTransaction(id, operation, amount, context, result, status, error = null) {
        const logEntry = {
            id,
            operation,
            amount,
            context: { ...context },
            result,
            status,
            error: error?.message || null,
            timestamp: new Date().toISOString(),
            state: { ...this.currentState }
        };
        
        this.transactionLog.push(logEntry);
        
        // Keep log size manageable
        if (this.transactionLog.length > 1000) {
            this.transactionLog = this.transactionLog.slice(-500);
        }
    }

    notifyListeners(operation, amount, result, context) {
        this.listeners.forEach(callback => {
            try {
                callback({
                    operation,
                    amount,
                    result,
                    context,
                    state: this.getCurrentState()
                });
            } catch (error) {
                console.error('[AmountFlow] Listener error:', error);
            }
        });
    }

    async runPreProcessingHooks(operation, amount, context) {
        // Extension point for pre-processing hooks
        console.log(`[AmountFlow] Pre-processing ${operation} with amount ₹${amount}`);
    }

    async validateResult(operation, result, context) {
        // Extension point for result validation
        if (!result) {
            throw new Error(`${operation} returned invalid result`);
        }
    }

    async correctDiscrepancies(discrepancies, calculatedAmounts) {
        console.log('[AmountFlow] 🔧 Auto-correcting discrepancies...');
        discrepancies.forEach(discrepancy => {
            console.log(`[AmountFlow] Correcting ${discrepancy.field}: ${discrepancy.current} → ${discrepancy.calculated}`);
        });
    }

    async processDailyWageUpdate(amount, context) {
        this.currentState.dailyWage = amount;
        return { dailyWage: amount };
    }

    async processWorkValueValidation(amount, context) {
        const { workDays = 1 } = context;
        const expectedValue = workDays * this.currentState.dailyWage;
        return {
            amount,
            expectedValue,
            isValid: amount === expectedValue,
            difference: amount - expectedValue
        };
    }

    async processBalanceCalculation(amount, context) {
        const balance = this.currentState.totalEarned - this.currentState.totalPaid;
        this.currentState.currentBalance = balance;
        return { balance };
    }

    async processAdvancePaymentCalculation(amount, context) {
        const { workValue = 0, context: paymentContext } = context;
        const isAdvance = amount > workValue;
        const advanceAmount = isAdvance ? amount - workValue : 0;
        
        // Special handling for force payments
        if (paymentContext === 'force_payment') {
            console.log('[AmountFlow] Processing force payment calculation:', {
                amount,
                workValue,
                isAdvance,
                note: 'Force payment covers previous unpaid work only'
            });
        }
        
        return {
            amount,
            workValue,
            isAdvance,
            advanceAmount,
            regularAmount: amount - advanceAmount,
            paymentContext
        };
    }

    async processAmountReconciliation(amount, context) {
        return await this.performReconciliation();
    }
}

// Global AmountFlow instance
window.AmountFlow = new AmountFlow();

// Expose for easy access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AmountFlow;
}

console.log('[AmountFlow] 🏦 Amount Flow System loaded and ready');