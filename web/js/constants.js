// Central configuration constants for R-Service Tracker
(function() {
    'use strict';
    
    const CONFIG = {
        DAILY_WAGE: 25,
        PAYMENT_THRESHOLD: 4, // Days before payment can be collected
        CURRENCY_SYMBOL: '₹',
        CURRENCY_NAME: 'rupees',
        // New configurable settings
        INCREMENT_VALUE: 25, // Default increment for payment amounts
        PAYMENT_DAY_DURATION: 4, // Default payment day duration
        MAX_PAYMENT_AMOUNT: 1000 // Default maximum payment amount
    };

    // Configuration management functions
    const ConfigManager = {
        // Get current configuration with user overrides
        getConfig() {
            const userConfig = this.getUserConfig();
            return { ...CONFIG, ...userConfig };
        },

        // Get user configuration from localStorage
        getUserConfig() {
            try {
                const stored = localStorage.getItem('r-service-user-config');
                return stored ? JSON.parse(stored) : {};
            } catch (error) {
                console.error('Error loading user config:', error);
                return {};
            }
        },

        // Save user configuration to localStorage
        saveUserConfig(config) {
            try {
                const currentUserConfig = this.getUserConfig();
                const newUserConfig = { ...currentUserConfig, ...config };
                localStorage.setItem('r-service-user-config', JSON.stringify(newUserConfig));
                
                // Update global config
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

        // Reset to default configuration
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

        // Generate payment amounts based on increment value
        generatePaymentAmounts() {
            const config = this.getConfig();
            const increment = config.INCREMENT_VALUE || 25;
            const maxAmount = config.MAX_PAYMENT_AMOUNT || 1000;
            
            const amounts = [];
            for (let amount = increment; amount <= maxAmount; amount += increment) {
                amounts.push(amount);
            }
            
            // Ensure we have at least a few default amounts
            if (amounts.length === 0) {
                return [25, 50, 75, 100, 200, 300, 400, 500, 600, 1000];
            }
            
            return amounts;
        },

        // Initialize configuration system
        init() {
            try {
                // Set up global config
                window.R_SERVICE_CONFIG = this.getConfig();
                window.ConfigManager = this;
                
                console.log('ConfigManager initialized with:', window.R_SERVICE_CONFIG);
                return true;
            } catch (error) {
                console.error('Error initializing ConfigManager:', error);
                // Fallback configuration
                window.R_SERVICE_CONFIG = { ...CONFIG };
                window.ConfigManager = this;
                return false;
            }
        }
    };

    // Initialize immediately when script loads
    if (typeof window !== 'undefined') {
        // Wait for DOM to be ready if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                ConfigManager.init();
            });
        } else {
            ConfigManager.init();
        }
    }

})();