import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chip, TextField, Button, Box } from '@mui/material';

const Settings = () => {
    const [currency, setCurrency] = useState('INR');
    const [membershipTypes, setMembershipTypes] = useState([]);
    const [newMembershipType, setNewMembershipType] = useState('');
    const [gymName, setGymName] = useState('');
    const [gymLogo, setGymLogo] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [primaryColor, setPrimaryColor] = useState('#3f51b5');
    const [secondaryColor, setSecondaryColor] = useState('#f50057');
    const [paymentReminderDays, setPaymentReminderDays] = useState('7');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/settings');
            const { currency, membership_types, gym_name, gym_logo, primary_color, secondary_color, payment_reminder_days } = response.data;
            if (currency) setCurrency(currency);
            if (membership_types) setMembershipTypes(membership_types);
            if (gym_name) setGymName(gym_name);
            if (gym_logo) setGymLogo(gym_logo);
            if (primary_color) setPrimaryColor(primary_color);
            if (secondary_color) setSecondaryColor(secondary_color);
            if (payment_reminder_days) setPaymentReminderDays(String(payment_reminder_days));
        } catch (error) {
            console.error("Error fetching settings", error);
        }
    };

    const handleSaveAllSettings = async () => {
        try {
            let logoUrl = gymLogo;

            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);
                const uploadRes = await axios.post('/api/settings/upload-logo', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                logoUrl = uploadRes.data.logoUrl;
            }
            
            const settingsToUpdate = {
                currency,
                membership_types: membershipTypes,
                gym_name: gymName,
                gym_logo: logoUrl,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                payment_reminder_days: paymentReminderDays
            };

            await axios.put('/api/settings', settingsToUpdate);

            alert('Settings updated successfully!');
            fetchSettings();
        } catch (error) {
            console.error("Error updating settings", error);
            alert('Error updating settings. Please try again.');
        }
    };

    const handleAddMembershipType = () => {
        if (newMembershipType && !membershipTypes.includes(newMembershipType)) {
            setMembershipTypes([...membershipTypes, newMembershipType]);
            setNewMembershipType('');
        }
    };

    const handleDeleteMembershipType = (typeToDelete) => {
        setMembershipTypes(membershipTypes.filter(type => type !== typeToDelete));
    };

    return (
        <div>
            <h2>Settings</h2>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <form>
                    <TextField
                        id="gym-name"
                        label="Gym Name"
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        fullWidth
                        margin="normal"
                    />

                    <label htmlFor="gym-logo">Gym Logo</label>
                    {gymLogo && <img src={gymLogo} alt="logo" style={{height: '80px', marginBottom: '10px', display: 'block'}}/>}
                    <input
                        id="gym-logo"
                        type="file"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                    />

                    <TextField
                        id="currency"
                        select
                        label="Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        fullWidth
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="INR">Indian Rupee (INR)</option>
                        <option value="USD">United States Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                    </TextField>
                </form>

                <div style={{ marginTop: '30px' }}>
                    <label>Membership Types</label>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
                        {membershipTypes.map((type) => (
                            <Chip
                                key={type}
                                label={type}
                                onDelete={() => handleDeleteMembershipType(type)}
                            />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            label="New Membership Type"
                            value={newMembershipType}
                            onChange={(e) => setNewMembershipType(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMembershipType();
                                }
                            }}
                            size="small"
                        />
                        <Button variant="contained" onClick={handleAddMembershipType}>Add</Button>
                    </Box>
                </div>
                <div style={{ marginTop: '30px' }}>
                    <label>Accent Colors</label>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                        <TextField
                            label="Primary Color"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            sx={{ width: 120 }}
                        />
                        <TextField
                            label="Secondary Color"
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            sx={{ width: 120 }}
                        />
                    </Box>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <TextField
                        label="Payment Reminder (days before due date)"
                        type="number"
                        value={paymentReminderDays}
                        onChange={(e) => setPaymentReminderDays(e.target.value)}
                        inputProps={{ min: 1 }}
                        fullWidth
                        margin="normal"
                    />
                </div>
                <Button variant="contained" color="primary" onClick={handleSaveAllSettings} style={{marginTop: '20px'}}>Save All Settings</Button>
            </div>
        </div>
    );
};

export default Settings;
