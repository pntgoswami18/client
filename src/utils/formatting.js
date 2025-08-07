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
    return new Date(dateString).toLocaleDateString();
};

