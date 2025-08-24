// Central configuration constants for R-Service Tracker
export const CONFIG = {
    DAILY_WAGE: 25,
    PAYMENT_THRESHOLD: 4, // Days before payment can be collected
    CURRENCY_SYMBOL: '₹',
    CURRENCY_NAME: 'rupees'
};

// Make it available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.R_SERVICE_CONFIG = CONFIG;
}