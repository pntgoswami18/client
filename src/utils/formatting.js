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

