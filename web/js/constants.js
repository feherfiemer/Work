(function() {
    'use strict';
    
    const CONFIG = {
        DAILY_WAGE: 25,
        PAYMENT_THRESHOLD: 4, // Days before payment can be collected
        CURRENCY_SYMBOL: '₹',
        CURRENCY_NAME: 'rupees',
        INCREMENT_VALUE: 25, // Default increment for payment amounts
        PAYMENT_DAY_DURATION: 4, // Default payment day duration
        MAX_PAYMENT_AMOUNT: 500, // Default maximum payment amount
        TIMEZONE: 'Asia/Kolkata' // IST timezone
    };

    const ConfigManager = {
        getConfig() {
            const userConfig = this.getUserConfig();
            return { ...CONFIG, ...userConfig };
        },

        getUserConfig() {
            try {
                const stored = localStorage.getItem('r-service-user-config');
                return stored ? JSON.parse(stored) : {};
            } catch (error) {
                console.error('Error loading user config:', error);
                return {};
            }
        },

        saveUserConfig(config) {
            try {
                const currentUserConfig = this.getUserConfig();
                const newUserConfig = { ...currentUserConfig, ...config };
                localStorage.setItem('r-service-user-config', JSON.stringify(newUserConfig));
                
                if (typeof window !== 'undefined') {
                    window.R_SERVICE_CONFIG = this.getConfig();
                }
                
                console.log('Configuration saved:', newUserConfig);
                return true;
            } catch (error) {
                console.error('Error saving user config:', error);
                return false;
            }
        },

        resetToDefaults() {
            try {
                localStorage.removeItem('r-service-user-config');
                if (typeof window !== 'undefined') {
                    window.R_SERVICE_CONFIG = { ...CONFIG };
                }
                console.log('Configuration reset to defaults');
                return true;
            } catch (error) {
                console.error('Error resetting config:', error);
                return false;
            }
        },

        generatePaymentAmounts() {
            const config = this.getConfig();
            const increment = config.INCREMENT_VALUE || 25;
            const maxAmount = config.MAX_PAYMENT_AMOUNT || 500;
            
            const amounts = [];
            for (let amount = increment; amount <= maxAmount; amount += increment) {
                amounts.push(amount);
            }
            
            if (amounts.length === 0) {
                const dailyWage = config.DAILY_WAGE || 25;
                return [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 500];
            }
            
            return amounts;
        },

        init() {
            try {
                window.R_SERVICE_CONFIG = this.getConfig();
                window.ConfigManager = this;
                
                console.log('ConfigManager initialized with:', window.R_SERVICE_CONFIG);
                return true;
            } catch (error) {
                console.error('Error initializing ConfigManager:', error);
                window.R_SERVICE_CONFIG = { ...CONFIG };
                window.ConfigManager = this;
                return false;
            }
        }
    };

    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                ConfigManager.init();
            });
        } else {
            ConfigManager.init();
        }
    }

})();