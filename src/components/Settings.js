import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Settings = () => {
    const [currency, setCurrency] = useState('INR');

    useEffect(() => {
        fetchCurrency();
    }, []);

    const fetchCurrency = async () => {
        try {
            const response = await axios.get('/api/settings/currency');
            setCurrency(response.data.value);
        } catch (error) {
            console.error("Error fetching currency setting", error);
        }
    };

    const handleCurrencyChange = async (e) => {
        const newCurrency = e.target.value;
        setCurrency(newCurrency);
        try {
            await axios.put('/api/settings/currency', { value: newCurrency });
            alert('Currency updated successfully!');
        } catch (error) {
            console.error("Error updating currency", error);
            alert('Error updating currency. Please try again.');
        }
    };

    return (
        <div>
            <h2>Settings</h2>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <form>
                    <label htmlFor="currency">Currency</label>
                    <select id="currency" value={currency} onChange={handleCurrencyChange}>
                        <option value="INR">Indian Rupee (INR)</option>
                        <option value="USD">United States Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                    </select>
                </form>
            </div>
        </div>
    );
};

export default Settings;

