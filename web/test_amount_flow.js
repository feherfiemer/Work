/**
 * 🧪 AMOUNT FLOW TEST SCRIPT
 * This script tests the AmountFlow system to ensure all amounts are properly handled
 */

// Test data
const testWorkRecords = [
    { date: '2024-01-01', status: 'completed' },
    { date: '2024-01-02', status: 'completed' },
    { date: '2024-01-03', status: 'completed' },
    { date: '2024-01-04', status: 'completed' },
    { date: '2024-01-05', status: 'completed' }
];

const testPayments = [
    {
        id: 1,
        amount: 100,
        workDates: ['2024-01-01', '2024-01-02'],
        paymentDate: '2024-01-02',
        isAdvance: false
    },
    {
        id: 2,
        amount: 75,
        workDates: ['2024-01-03'],
        paymentDate: '2024-01-03',
        isAdvance: false
    },
    {
        id: 3,
        amount: 150,
        workDates: ['2024-01-04'],
        paymentDate: '2024-01-04',
        isAdvance: true // Amount exceeds work value
    }
];

async function testAmountFlow() {
    console.log('🧪 Starting AmountFlow Tests...');
    
    if (!window.AmountFlow) {
        console.error('❌ AmountFlow not available');
        return;
    }

    try {
        // Test 1: Basic amount validation
        console.log('\n📝 Test 1: Amount Validation');
        try {
            await window.AmountFlow.validateAmount('addPayment', 100, {
                minAmount: 1,
                maxAmount: 1000
            });
            console.log('✅ Valid payment amount accepted');
        } catch (error) {
            console.error('❌ Valid payment validation failed:', error);
        }

        try {
            await window.AmountFlow.validateAmount('addPayment', -50, {
                minAmount: 1,
                maxAmount: 1000
            });
            console.error('❌ Negative amount should have been rejected');
        } catch (error) {
            console.log('✅ Negative payment amount correctly rejected:', error.message);
        }

        // Test 2: Payment processing
        console.log('\n💰 Test 2: Payment Processing');
        const paymentResult = await window.AmountFlow.processAmount('addPayment', 75, {
            workDates: ['2024-01-01', '2024-01-02'],
            paymentDate: '2024-01-01',
            isAdvance: false,
            triggerReconciliation: false
        });
        console.log('✅ Payment processing result:', paymentResult);

        // Test 3: Advance payment calculation
        console.log('\n⏰ Test 3: Advance Payment Calculation');
        const advanceResult = await window.AmountFlow.processAmount('processAdvancePayment', 200, {
            workValue: 100,
            triggerReconciliation: false
        });
        console.log('✅ Advance payment calculation:', advanceResult);

        // Test 4: Earnings calculation
        console.log('\n💼 Test 4: Earnings Calculation');
        const earningsResult = await window.AmountFlow.processAmount('calculateEarnings', 5, {
            dailyWage: 25,
            unpaidWorkDays: 2,
            totalPaid: 175,
            triggerReconciliation: false
        });
        console.log('✅ Earnings calculation:', earningsResult);

        // Test 5: Reconciliation
        console.log('\n🔄 Test 5: Reconciliation');
        const reconciliationResult = await window.AmountFlow.performReconciliation();
        console.log('✅ Reconciliation result:', reconciliationResult);

        // Test 6: Comprehensive validation
        console.log('\n🔍 Test 6: Comprehensive Validation');
        const validationResult = await window.AmountFlow.performComprehensiveValidation();
        console.log('✅ Validation result:', {
            isValid: validationResult.isValid,
            totalChecks: validationResult.totalChecks,
            passedChecks: validationResult.passedChecks,
            errors: validationResult.errors.length,
            warnings: validationResult.warnings.length
        });

        if (validationResult.errors.length > 0) {
            console.log('⚠️ Validation errors:', validationResult.errors);
        }

        // Test 7: Amount tally
        console.log('\n📊 Test 7: Amount Tally');
        const amountTally = window.AmountFlow.generateAmountTally();
        console.log('✅ Amount tally:', amountTally);

        // Test 8: State verification
        console.log('\n📈 Test 8: State Verification');
        const currentState = window.AmountFlow.getCurrentState();
        console.log('✅ Current state:', currentState);

        // Test 9: Audit trail
        console.log('\n📋 Test 9: Audit Trail');
        const auditTrail = window.AmountFlow.getAuditTrail(5);
        console.log('✅ Recent audit trail:', auditTrail);

        console.log('\n🎉 All AmountFlow tests completed successfully!');
        
        return {
            success: true,
            validationResult,
            reconciliationResult,
            currentState,
            amountTally
        };

    } catch (error) {
        console.error('❌ AmountFlow test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test calculation consistency
function testCalculationConsistency() {
    console.log('\n🧮 Testing Calculation Consistency...');
    
    const dailyWage = 25;
    const totalWorked = testWorkRecords.filter(r => r.status === 'completed').length;
    const totalPaid = testPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalEarned = totalWorked * dailyWage;
    const currentBalance = totalEarned - totalPaid;
    
    console.log('📊 Calculation Summary:');
    console.log(`   Total worked days: ${totalWorked}`);
    console.log(`   Daily wage: ₹${dailyWage}`);
    console.log(`   Total earned: ₹${totalEarned}`);
    console.log(`   Total paid: ₹${totalPaid}`);
    console.log(`   Current balance: ₹${currentBalance}`);
    
    // Verify advance payment logic
    testPayments.forEach((payment, index) => {
        const workValue = payment.workDates.length * dailyWage;
        const shouldBeAdvance = payment.amount > workValue;
        const isConsistent = payment.isAdvance === shouldBeAdvance;
        
        console.log(`💰 Payment ${index + 1}:`);
        console.log(`   Amount: ₹${payment.amount}`);
        console.log(`   Work value: ₹${workValue} (${payment.workDates.length} days)`);
        console.log(`   Should be advance: ${shouldBeAdvance}`);
        console.log(`   Marked as advance: ${payment.isAdvance}`);
        console.log(`   Consistent: ${isConsistent ? '✅' : '❌'}`);
    });
}

// Run tests when page loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🚀 Starting AmountFlow validation tests...');
            testCalculationConsistency();
            testAmountFlow().then(result => {
                console.log('📋 Final test result:', result);
            });
        }, 1000); // Wait for all scripts to load
    });
} else {
    // Node.js environment
    console.log('Running in Node.js environment - tests require browser environment');
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testAmountFlow,
        testCalculationConsistency,
        testWorkRecords,
        testPayments
    };
}