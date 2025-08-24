// Central configuration constants for R-Service Tracker
export const CONFIG = {
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
export const ConfigManager = {
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
            
            return true;
        } catch (error) {
            console.error('Error saving user config:', error);
            return false;
        }
    },

    // Reset to default configuration
    resetToDefaults() {
        localStorage.removeItem('r-service-user-config');
        if (typeof window !== 'undefined') {
            window.R_SERVICE_CONFIG = { ...CONFIG };
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
        
        return amounts;
    }
};

// Make it available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.R_SERVICE_CONFIG = ConfigManager.getConfig();
    window.ConfigManager = ConfigManager;
}