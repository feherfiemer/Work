class DatabaseManager {
    constructor() {
        this.dbName = 'RServiceTracker';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            workRecords: 'workRecords',
            payments: 'payments',
            settings: 'settings'
        };
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.stores.workRecords)) {
                    const workStore = db.createObjectStore(this.stores.workRecords, { 
                        keyPath: 'date' 
                    });
                    workStore.createIndex('month', 'month', { unique: false });
                    workStore.createIndex('year', 'year', { unique: false });
                    workStore.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.payments)) {
                    const paymentStore = db.createObjectStore(this.stores.payments, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    paymentStore.createIndex('date', 'date', { unique: false });
                    paymentStore.createIndex('amount', 'amount', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.stores.settings)) {
                    const settingsStore = db.createObjectStore(this.stores.settings, { 
                        keyPath: 'key' 
                    });
                }

                console.log('Database structure created/updated');
            };
        });
    }

    async performTransaction(storeName, mode, operation) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => {
                resolve(true); // Transaction completed successfully
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.onabort = () => {
                reject(new Error('Transaction aborted'));
            };

            try {
                const request = operation(store);
                
                if (request && typeof request.onerror === 'function') {
                    request.onerror = () => {
                        reject(request.error);
                    };
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async addWorkRecord(date, wage = null, status = 'completed') {
        const DAILY_WAGE = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        const record = {
            date: date,
            wage: wage || DAILY_WAGE,
            status: status,
            timestamp: new Date().toISOString(),
            month: new Date(date).getMonth() + 1,
            year: new Date(date).getFullYear()
        };

        return this.performTransaction(this.stores.workRecords, 'readwrite', (store) => {
            return store.put(record);
        });
    }

    async getWorkRecord(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.workRecords], 'readonly');
            const store = transaction.objectStore(this.stores.workRecords);
            const request = store.get(date);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAllWorkRecords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.workRecords], 'readonly');
            const store = transaction.objectStore(this.stores.workRecords);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getWorkRecordsByMonth(month, year) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.workRecords], 'readonly');
            const store = transaction.objectStore(this.stores.workRecords);
            const request = store.getAll();

            request.onsuccess = () => {
                const allRecords = request.result;
                const filteredRecords = allRecords.filter(record => {
                    const recordDate = new Date(record.date);
                    return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
                });
                resolve(filteredRecords);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getWorkRecordsByYear(year) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.workRecords], 'readonly');
            const store = transaction.objectStore(this.stores.workRecords);
            const request = store.getAll();

            request.onsuccess = () => {
                const allRecords = request.result;
                const filteredRecords = allRecords.filter(record => {
                    return new Date(record.date).getFullYear() === year;
                });
                resolve(filteredRecords);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteWorkRecord(date) {
        return this.performTransaction(this.stores.workRecords, 'readwrite', (store) => {
            return store.delete(date);
        });
    }

    async addPayment(amount, workDates, paymentDate = new Date().toISOString().split('T')[0], isAdvance = false) {
        const payment = {
            amount: amount,
            workDates: workDates || [], // Can be empty for advance payments
            paymentDate: paymentDate,
            timestamp: new Date().toISOString(),
            month: new Date(paymentDate).getMonth() + 1,
            year: new Date(paymentDate).getFullYear(),
            isAdvance: isAdvance,
            pendingDaysAtPayment: workDates ? workDates.length : 0
        };

        return this.performTransaction(this.stores.payments, 'readwrite', (store) => {
            return store.add(payment);
        });
    }

    async getAllPayments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.payments], 'readonly');
            const store = transaction.objectStore(this.stores.payments);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getPaymentsByMonth(month, year) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.payments], 'readonly');
            const store = transaction.objectStore(this.stores.payments);
            const request = store.getAll();

            request.onsuccess = () => {
                const allPayments = request.result;
                const filteredPayments = allPayments.filter(payment => {
                    return payment.month === month && payment.year === year;
                });
                resolve(filteredPayments);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async setSetting(key, value) {
        const setting = { key, value, timestamp: new Date().toISOString() };
        return this.performTransaction(this.stores.settings, 'readwrite', (store) => {
            return store.put(setting);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.settings], 'readonly');
            const store = transaction.objectStore(this.stores.settings);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.settings], 'readonly');
            const store = transaction.objectStore(this.stores.settings);
            const request = store.getAll();

            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    calculateAmounts(workRecords, payments) {
        const DAILY_WAGE = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        
        const totalWorked = workRecords.filter(record => record.status === 'completed').length;
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        const unpaidWork = workRecords.filter(record => 
            record.status === 'completed' && !this.isRecordPaid(record, payments)
        );
        const pendingWorkValue = unpaidWork.length * DAILY_WAGE;
        
        const totalEarned = totalPaid;
        
        const currentBalance = pendingWorkValue;
        
        return {
            totalWorked,
            totalPaid,
            totalEarned,
            currentBalance,
            pendingWorkValue,
            unpaidWorkDays: unpaidWork.length,
            dailyWage: DAILY_WAGE
        };
    }

    async getEarningsStats() {
        try {
            const workRecords = await this.getAllWorkRecords();
            const payments = await this.getAllPayments();
            
            const amounts = this.calculateAmounts(workRecords, payments);
            const { totalWorked, totalPaid, totalEarned, currentBalance } = amounts;
            
            const sortedRecords = workRecords
                .filter(record => record.status === 'completed')
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let currentStreak = 0;
            let expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - 1); // Start from yesterday
            
            for (const record of sortedRecords) {
                const recordDate = new Date(record.date);
                const expectedDateStr = expectedDate.toISOString().split('T')[0];
                const recordDateStr = recordDate.toISOString().split('T')[0];
                
                if (recordDateStr === expectedDateStr) {
                    currentStreak++;
                    expectedDate.setDate(expectedDate.getDate() - 1);
                } else {
                    break;
                }
            }
            
            const unpaidWork = workRecords.filter(record => 
                record.status === 'completed' && !this.isRecordPaid(record, payments)
            ).length;
            
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            const progressToPayday = unpaidWork >= paymentThreshold ? paymentThreshold : unpaidWork;
            
            return {
                totalWorked,
                totalEarned,
                totalPaid,
                currentBalance,
                currentStreak,
                progressToPayday,
                unpaidWork,
                canGetPaid: unpaidWork >= paymentThreshold
            };
        } catch (error) {
            console.error('Error getting earnings stats:', error);
            return {
                totalWorked: 0,
                totalEarned: 0,
                totalPaid: 0,
                currentBalance: 0,
                currentStreak: 0,
                progressToPayday: 0,
                unpaidWork: 0,
                canGetPaid: false
            };
        }
    }

    async getAdvancePaymentStatus() {
        try {
            const workRecords = await this.getAllWorkRecords();
            const payments = await this.getAllPayments();
            
            const advancePayments = payments.filter(payment => payment.isAdvance);
            
            if (advancePayments.length === 0) {
                return {
                    hasAdvancePayments: false,
                    totalAdvanceAmount: 0,
                    workRequiredForAdvance: 0,
                    workCompletedForAdvance: 0,
                    workRemainingForAdvance: 0
                };
            }
            
            const amounts = this.calculateAmounts(workRecords, payments);
            
            
            let totalAdvanceAmount = 0;
            let totalWorkCoveredByAdvance = 0;
            let totalWorkCompletedForAdvance = 0;
            
            for (const payment of advancePayments) {
                const daysCoveredByPayment = Math.ceil(payment.amount / amounts.dailyWage);
                
                const workDatesCoveredByPayment = payment.workDates || [];
                
                const completedWorkForThisPayment = workDatesCoveredByPayment.filter(workDate => {
                    const workRecord = workRecords.find(record => record.date === workDate);
                    return workRecord && workRecord.status === 'completed';
                }).length;
                
                const workDoneBeforePayment = workRecords.filter(record => {
                    return record.status === 'completed' && 
                           new Date(record.date) <= new Date(payment.date) &&
                           workDatesCoveredByPayment.includes(record.date);
                }).length;
                
                const workValueAtPayment = workDoneBeforePayment * amounts.dailyWage;
                const advanceForThisPayment = Math.max(0, payment.amount - workValueAtPayment);
                
                if (advanceForThisPayment > 0) {
                    totalAdvanceAmount += advanceForThisPayment;
                    totalWorkCoveredByAdvance += daysCoveredByPayment; // Total days paid for
                    totalWorkCompletedForAdvance += completedWorkForThisPayment; // Work actually completed (including work done after payment)
                }
            }
            
            const workRequiredForAdvance = totalWorkCoveredByAdvance; // Days paid for
            const workCompletedForAdvance = totalWorkCompletedForAdvance; // Days actually completed
            const workRemainingForAdvance = Math.max(0, workRequiredForAdvance - workCompletedForAdvance);
            
            
            return {
                hasAdvancePayments: true,
                totalAdvanceAmount,
                workRequiredForAdvance,
                workCompletedForAdvance,
                workRemainingForAdvance
            };
        } catch (error) {
            console.error('Error getting advance payment status:', error);
            return {
                hasAdvancePayments: false,
                totalAdvanceAmount: 0,
                workRequiredForAdvance: 0,
                workCompletedForAdvance: 0,
                workRemainingForAdvance: 0
            };
        }
    }

    isRecordPaid(record, payments) {
        return payments.some(payment => 
            payment.workDates.includes(record.date)
        );
    }

    async getMonthlyEarnings() {
        try {
            const workRecords = await this.getAllWorkRecords();
            const monthlyData = {};
            
            workRecords.forEach(record => {
                if (record.status === 'completed') {
                    const key = `${record.year}-${record.month.toString().padStart(2, '0')}`;
                    if (!monthlyData[key]) {
                        monthlyData[key] = 0;
                    }
                    monthlyData[key] += record.wage;
                }
            });
            
            return monthlyData;
        } catch (error) {
            console.error('Error getting monthly earnings:', error);
            return {};
        }
    }

    async clearAllData() {
        try {
            console.log('Starting to clear all data...');
            
            console.log('Clearing work records...');
            await this.performTransaction(this.stores.workRecords, 'readwrite', (store) => {
                return store.clear();
            });
            
            console.log('Clearing payments...');
            await this.performTransaction(this.stores.payments, 'readwrite', (store) => {
                return store.clear();
            });
            
            console.log('Clearing settings...');
            await this.performTransaction(this.stores.settings, 'readwrite', (store) => {
                return store.clear();
            });
            
            console.log('All data cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error; // Re-throw to allow proper error handling
        }
    }

    async exportData() {
        try {
            const workRecords = await this.getAllWorkRecords();
            const payments = await this.getAllPayments();
            const settings = await this.getAllSettings();
            
            return {
                workRecords,
                payments,
                settings,
                exportDate: new Date().toISOString(),
                version: this.dbVersion
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    async importData(data) {
        try {
            await this.clearAllData();
            
            if (data.workRecords) {
                for (const record of data.workRecords) {
                    await this.performTransaction(this.stores.workRecords, 'readwrite', (store) => {
                        return store.put(record);
                    });
                }
            }
            
            if (data.payments) {
                for (const payment of data.payments) {
                    await this.performTransaction(this.stores.payments, 'readwrite', (store) => {
                        return store.put(payment);
                    });
                }
            }
            
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.setSetting(key, value);
                }
            }
            
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

window.DatabaseManager = DatabaseManager;