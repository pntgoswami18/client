// src/utils/formatting.js
const getCurrencyLocale = (currency) => {
    switch (currency) {
        case 'INR':
            return 'en-IN';
        case 'USD':
            return 'en-US';
        case 'EUR':
            return 'de-DE'; // Just an example for Euro
        case 'GBP':
            return 'en-GB';
        default:
            return 'en-US';
    }
}

export const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat(getCurrencyLocale(currency), {
        style: 'currency',
        currency: currency
    }).format(amount);
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const s = String(dateString);
    const isYearMonth = /^\d{4}-\d{2}$/.test(s);
    const isFullDate = /^\d{4}-\d{2}-\d{2}$/.test(s);

    try {
        if (isYearMonth) {
            const d = new Date(`${s}-01T00:00:00`);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            }
        }
        if (isFullDate) {
            const d = new Date(`${s}T00:00:00`);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
            }
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString();
        }
    } catch (_) {}
    return s;
};

/**
 * Get current date in local timezone as YYYY-MM-DD string
 * This prevents timezone-related date shifts that can occur with toISOString()
 * @returns {string} Current date in YYYY-MM-DD format
 */
export const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * @param {Date} date - Date object to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateToLocalString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

