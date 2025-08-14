import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chip, TextField, Button, Box, Grid, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import GradientEditor from './GradientEditor';

const Settings = () => {
    const [currency, setCurrency] = useState('INR');
    const [membershipTypes, setMembershipTypes] = useState([]);
    const [newMembershipType, setNewMembershipType] = useState('');
    const [gymName, setGymName] = useState('');
    const [gymLogo, setGymLogo] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [primaryColor, setPrimaryColor] = useState('#3f51b5');
    const [secondaryColor, setSecondaryColor] = useState('#f50057');
    const [primaryColorMode, setPrimaryColorMode] = useState('solid');
    const [secondaryColorMode, setSecondaryColorMode] = useState('solid');
    const [primaryGradient, setPrimaryGradient] = useState('');
    const [secondaryGradient, setSecondaryGradient] = useState('');
    const [paymentReminderDays, setPaymentReminderDays] = useState('7');
    const [morningStart, setMorningStart] = useState('05:00');
    const [morningEnd, setMorningEnd] = useState('11:00');
    const [eveningStart, setEveningStart] = useState('16:00');
    const [eveningEnd, setEveningEnd] = useState('22:00');
    const [showTotalMembers, setShowTotalMembers] = useState(true);
    const [showTotalRevenue, setShowTotalRevenue] = useState(true);
    const [showNewMembersThisMonth, setShowNewMembersThisMonth] = useState(true);
    const [showUnpaidMembersThisMonth, setShowUnpaidMembersThisMonth] = useState(true);
    const [showActiveSchedules, setShowActiveSchedules] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/settings');
            const { currency, membership_types, gym_name, gym_logo, primary_color, secondary_color, primary_color_mode, secondary_color_mode, primary_color_gradient, secondary_color_gradient, payment_reminder_days, morning_session_start, morning_session_end, evening_session_start, evening_session_end, show_card_total_members, show_card_total_revenue, show_card_new_members_this_month, show_card_unpaid_members_this_month, show_card_active_schedules } = response.data;
            if (currency) { setCurrency(currency); }
            if (membership_types) { setMembershipTypes(membership_types); }
            if (gym_name) { setGymName(gym_name); }
            if (gym_logo) { setGymLogo(gym_logo); }
            if (primary_color) { setPrimaryColor(primary_color); }
            if (secondary_color) { setSecondaryColor(secondary_color); }
            if (primary_color_mode) { setPrimaryColorMode(primary_color_mode); }
            if (secondary_color_mode) { setSecondaryColorMode(secondary_color_mode); }
            if (primary_color_gradient !== undefined) { setPrimaryGradient(primary_color_gradient); }
            if (secondary_color_gradient !== undefined) { setSecondaryGradient(secondary_color_gradient); }
            if (payment_reminder_days) { setPaymentReminderDays(String(payment_reminder_days)); }
            if (morning_session_start) { setMorningStart(morning_session_start); }
            if (morning_session_end) { setMorningEnd(morning_session_end); }
            if (evening_session_start) { setEveningStart(evening_session_start); }
            if (evening_session_end) { setEveningEnd(evening_session_end); }
            if (show_card_total_members !== undefined) { setShowTotalMembers(String(show_card_total_members) !== 'false'); }
            if (show_card_total_revenue !== undefined) { setShowTotalRevenue(String(show_card_total_revenue) !== 'false'); }
            if (show_card_new_members_this_month !== undefined) { setShowNewMembersThisMonth(String(show_card_new_members_this_month) !== 'false'); }
            if (show_card_unpaid_members_this_month !== undefined) { setShowUnpaidMembersThisMonth(String(show_card_unpaid_members_this_month) !== 'false'); }
            if (show_card_active_schedules !== undefined) { setShowActiveSchedules(String(show_card_active_schedules) !== 'false'); }
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
                primary_color_mode: primaryColorMode,
                secondary_color_mode: secondaryColorMode,
                primary_color_gradient: primaryGradient,
                secondary_color_gradient: secondaryGradient,
                payment_reminder_days: paymentReminderDays,
                morning_session_start: morningStart,
                morning_session_end: morningEnd,
                evening_session_start: eveningStart,
                evening_session_end: eveningEnd,
                show_card_total_members: showTotalMembers,
                show_card_total_revenue: showTotalRevenue,
                show_card_new_members_this_month: showNewMembersThisMonth,
                show_card_unpaid_members_this_month: showUnpaidMembersThisMonth,
                show_card_active_schedules: showActiveSchedules
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

                    {/* Logo uploader with replace/remove actions */}
                    <label htmlFor="gym-logo" style={{ display: 'block', marginTop: 8 }}>Gym Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        {gymLogo ? (
                            <img src={gymLogo} alt="logo" style={{ height: '64px', borderRadius: 6, border: '1px solid #eee' }} />
                        ) : (
                            <div style={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#888' }}>No Logo</div>
                        )}
                        <input
                            id="gym-logo"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files && e.target.files[0];
                                if (file) {
                                    setLogoFile(file);
                                    try { setGymLogo(URL.createObjectURL(file)); } catch (_) {}
                                }
                            }}
                        />
                        <Button variant="outlined" onClick={(e) => {
                            e.preventDefault();
                            const input = document.getElementById('gym-logo');
                            if (input) { input.click(); }
                        }}>Replace Logo</Button>
                        <Button variant="text" color="error" onClick={(e) => {
                            e.preventDefault();
                            setGymLogo('');
                            setLogoFile(null);
                        }}>Remove</Button>
                    </div>

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
                    <label>Dashboard Cards</label>
                    <FormGroup sx={{ mt: 1 }}>
                        <FormControlLabel control={<Checkbox checked={showTotalMembers} onChange={(e)=>setShowTotalMembers(e.target.checked)} />} label="Total Members" />
                        <FormControlLabel control={<Checkbox checked={showTotalRevenue} onChange={(e)=>setShowTotalRevenue(e.target.checked)} />} label="Total Revenue" />
                        <FormControlLabel control={<Checkbox checked={showNewMembersThisMonth} onChange={(e)=>setShowNewMembersThisMonth(e.target.checked)} />} label="New Members This Month" />
                        <FormControlLabel control={<Checkbox checked={showUnpaidMembersThisMonth} onChange={(e)=>setShowUnpaidMembersThisMonth(e.target.checked)} />} label="Unpaid Members This Month" />
                        <FormControlLabel control={<Checkbox checked={showActiveSchedules} onChange={(e)=>setShowActiveSchedules(e.target.checked)} />} label="Active Schedules" />
                    </FormGroup>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Choose which summary cards show on the dashboard.</Typography>
                </div>
                <div style={{ marginTop: '30px' }}>
                    <label>Working Hours</label>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Morning Start"
                                type="time"
                                value={morningStart}
                                onChange={(e) => setMorningStart(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Morning End"
                                type="time"
                                value={morningEnd}
                                onChange={(e) => setMorningEnd(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Evening Start"
                                type="time"
                                value={eveningStart}
                                onChange={(e) => setEveningStart(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Evening End"
                                type="time"
                                value={eveningEnd}
                                onChange={(e) => setEveningEnd(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        These values control check-in allowed hours used by Attendance.
                    </Typography>
                </div>
                <div style={{ marginTop: '30px' }}>
                    <label>Accent Colors</label>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            label="Primary Color"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            sx={{ width: 120 }}
                        />
                        <TextField
                            label="Primary Mode (solid/gradient)"
                            select
                            value={primaryColorMode}
                            onChange={(e)=>setPrimaryColorMode(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ width: 220 }}
                        >
                            <option value="solid">Solid</option>
                            <option value="gradient">Gradient</option>
                        </TextField>
                        {primaryColorMode === 'gradient' && (
                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <GradientEditor
                                    value={primaryGradient}
                                    onChange={setPrimaryGradient}
                                    defaultStops={[
                                        { color: primaryColor, pos: 0 },
                                        { color: secondaryColor, pos: 50 },
                                        { color: '#EDDD53', pos: 100 }
                                    ]}
                                />
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            label="Secondary Color"
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            sx={{ width: 120 }}
                        />
                        <TextField
                            label="Secondary Mode (solid/gradient)"
                            select
                            value={secondaryColorMode}
                            onChange={(e)=>setSecondaryColorMode(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ width: 220 }}
                        >
                            <option value="solid">Solid</option>
                            <option value="gradient">Gradient</option>
                        </TextField>
                        {secondaryColorMode === 'gradient' && (
                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <GradientEditor
                                    value={secondaryGradient}
                                    onChange={setSecondaryGradient}
                                    defaultStops={[
                                        { color: secondaryColor, pos: 0 },
                                        { color: primaryColor, pos: 50 },
                                        { color: '#EDDD53', pos: 100 }
                                    ]}
                                />
                            </Box>
                        )}
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
