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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const [currencyRes, typesRes, nameRes, logoRes] = await Promise.all([
                axios.get('/api/settings/currency'),
                axios.get('/api/settings/membership_types'),
                axios.get('/api/settings/gym_name'),
                axios.get('/api/settings/gym_logo')
            ]);
            setCurrency(currencyRes.data.value);
            setMembershipTypes(typesRes.data.value);
            setGymName(nameRes.data.value);
            setGymLogo(logoRes.data.value);
        } catch (error) {
            console.error("Error fetching settings", error);
        }
    };

    const handleSaveAllSettings = async () => {
        try {
            if (logoFile) {
                const formData = new FormData();
                formData.append('logo', logoFile);
                const uploadRes = await axios.post('/api/settings/upload-logo', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                await axios.put('/api/settings/gym_logo', { value: uploadRes.data.logoUrl });
            }
            
            await Promise.all([
                axios.put('/api/settings/currency', { value: currency }),
                axios.put('/api/settings/membership_types', { value: membershipTypes }),
                axios.put('/api/settings/gym_name', { value: gymName })
            ]);

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
.                                onDelete={() => handleDeleteMembershipType(type)}
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
                <Button variant="contained" color="primary" onClick={handleSaveAllSettings} style={{marginTop: '20px'}}>Save All Settings</Button>
            </div>
        </div>
    );
};

export default Settings;
