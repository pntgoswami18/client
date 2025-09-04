import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useBeforeUnload } from 'react-router-dom';
import axios from 'axios';
import { 
  TextField, 
  Button, 
  Box, 
  Grid, 
  Typography, 
  FormGroup, 
  FormControlLabel, 
  Checkbox,
  Tabs,
  Tab,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  DeviceHub as DeviceHubIcon,
  Monitor as MonitorIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GradientEditor from './GradientEditor';
import ESP32DeviceManager from './ESP32DeviceManager';
import ESP32Monitor from './ESP32Monitor';
import ESP32Analytics from './ESP32Analytics';

const GeneralSettings = ({ onUnsavedChanges, onSave }) => {
    const [currency, setCurrency] = useState('INR');
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
    const [askUnlockReason, setAskUnlockReason] = useState(true);
    const [cardOrder, setCardOrder] = useState([
        'total_members',
        'total_revenue', 
        'new_members_this_month',
        'unpaid_members_this_month',
        'active_schedules'
    ]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const initialValues = useRef({});
    


    const fetchSettings = useCallback(async () => {
        try {
            const response = await axios.get('/api/settings');
            const { currency, gym_name, gym_logo, primary_color, secondary_color, primary_color_mode, secondary_color_mode, primary_color_gradient, secondary_color_gradient, payment_reminder_days, morning_session_start, morning_session_end, evening_session_start, evening_session_end, show_card_total_members, show_card_total_revenue, show_card_new_members_this_month, show_card_unpaid_members_this_month, show_card_active_schedules, ask_unlock_reason } = response.data;
            if (currency) { setCurrency(currency); }
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
            if (ask_unlock_reason !== undefined) { setAskUnlockReason(String(ask_unlock_reason) !== 'false'); }
            
            // Fetch card order
            if (response.data.card_order && Array.isArray(response.data.card_order)) {
                setCardOrder(response.data.card_order);
            }

            // Store initial values after loading with the actual fetched values
            initialValues.current = {
                currency: currency || 'INR',
                gymName: gym_name || '',
                gymLogo: gym_logo || '',
                primaryColor: primary_color || '#3f51b5',
                secondaryColor: secondary_color || '#f50057',
                primaryColorMode: primary_color_mode || 'solid',
                secondaryColorMode: secondary_color_mode || 'solid',
                primaryGradient: primary_color_gradient || '',
                secondaryGradient: secondary_color_gradient || '',
                paymentReminderDays: String(payment_reminder_days || '7'),
                morningStart: morning_session_start || '05:00',
                morningEnd: morning_session_end || '11:00',
                eveningStart: evening_session_start || '16:00',
                eveningEnd: evening_session_end || '22:00',
                showTotalMembers: String(show_card_total_members) !== 'false',
                showTotalRevenue: String(show_card_total_revenue) !== 'false',
                showNewMembersThisMonth: String(show_card_new_members_this_month) !== 'false',
                showUnpaidMembersThisMonth: String(show_card_unpaid_members_this_month) !== 'false',
                showActiveSchedules: String(show_card_active_schedules) !== 'false',
                askUnlockReason: String(ask_unlock_reason) !== 'false',
                cardOrder: response.data.card_order && Array.isArray(response.data.card_order) ? response.data.card_order : [
                    'total_members',
                    'total_revenue', 
                    'new_members_this_month',
                    'unpaid_members_this_month',
                    'active_schedules'
                ]
            };

        } catch (error) {
            console.error("Error fetching settings", error);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

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
                show_card_active_schedules: showActiveSchedules,
                ask_unlock_reason: askUnlockReason,
                card_order: cardOrder
            };

            console.log('Saving settings with card order:', cardOrder);

            await axios.put('/api/settings', settingsToUpdate);

            // Reset the logo file state since it was successfully uploaded
            setLogoFile(null);
            setHasUnsavedChanges(false);
            if (onSave) { onSave(); }
            if (onUnsavedChanges) { onUnsavedChanges(false); }
            alert('Settings updated successfully!');
            fetchSettings();
        } catch (error) {
            console.error("Error updating settings", error);
            alert('Error updating settings. Please try again.');
        }
    };

    // Check for changes in form values
    const checkForChanges = useCallback(() => {
        if (!initialValues.current || Object.keys(initialValues.current).length === 0) {
            return;
        }

        const currentValues = {
            currency,
            gymName,
            gymLogo,
            primaryColor,
            secondaryColor,
            primaryColorMode,
            secondaryColorMode,
            primaryGradient,
            secondaryGradient,
            paymentReminderDays,
            morningStart,
            morningEnd,
            eveningStart,
            eveningEnd,
            showTotalMembers,
            showTotalRevenue,
            showNewMembersThisMonth,
            showUnpaidMembersThisMonth,
            showActiveSchedules,
            askUnlockReason,
            cardOrder
        };

        const hasChanges = JSON.stringify(currentValues) !== JSON.stringify(initialValues.current) || logoFile !== null;
        
        if (hasChanges !== hasUnsavedChanges) {
            setHasUnsavedChanges(hasChanges);
            if (onUnsavedChanges) {
                onUnsavedChanges(hasChanges);
            }
        }
    }, [currency, gymName, gymLogo, primaryColor, secondaryColor, primaryColorMode, secondaryColorMode, 
        primaryGradient, secondaryGradient, paymentReminderDays, morningStart, morningEnd, eveningStart, 
        eveningEnd, showTotalMembers, showTotalRevenue, showNewMembersThisMonth, showUnpaidMembersThisMonth, 
        showActiveSchedules, askUnlockReason, cardOrder, logoFile, hasUnsavedChanges, onUnsavedChanges]);

    // Sortable card component
    const SortableCard = ({ id, title, checked, onChange }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    margin: '8px 0',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    cursor: 'grab',
                    userSelect: 'none',
                    gap: '12px'
                }}
                {...attributes}
                {...listeners}
            >
                <DragIndicatorIcon style={{ color: '#6c757d', cursor: 'grab' }} />
                <FormControlLabel
                    control={<Checkbox checked={checked} onChange={onChange} />}
                    label={title}
                    style={{ flex: 1, margin: 0 }}
                />
            </div>
        );
    };

    // Handle drag end
    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setCardOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Track changes in form values
    useEffect(() => {
        checkForChanges();
    }, [checkForChanges]);

    return (
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

                <Divider sx={{ my: 3 }} />

                <div style={{ marginTop: '30px' }}>
                    <label>Dashboard Cards</label>
                    <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                        Drag and drop to reorder cards. Check/uncheck to show/hide cards on the dashboard.
                    </Typography>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={cardOrder}
                            strategy={verticalListSortingStrategy}
                        >
                            {cardOrder.map((cardId) => {
                                const cardConfigs = {
                                    total_members: {
                                        title: "Total Members",
                                        checked: showTotalMembers,
                                        onChange: (e) => setShowTotalMembers(e.target.checked)
                                    },
                                    total_revenue: {
                                        title: "Total Revenue",
                                        checked: showTotalRevenue,
                                        onChange: (e) => setShowTotalRevenue(e.target.checked)
                                    },
                                    new_members_this_month: {
                                        title: "New Members This Month",
                                        checked: showNewMembersThisMonth,
                                        onChange: (e) => setShowNewMembersThisMonth(e.target.checked)
                                    },
                                    unpaid_members_this_month: {
                                        title: "Unpaid Members This Month",
                                        checked: showUnpaidMembersThisMonth,
                                        onChange: (e) => setShowUnpaidMembersThisMonth(e.target.checked)
                                    },
                                    active_schedules: {
                                        title: "Active Schedules",
                                        checked: showActiveSchedules,
                                        onChange: (e) => setShowActiveSchedules(e.target.checked)
                                    }
                                };

                                const config = cardConfigs[cardId];
                                if (!config) return null;

                                return (
                                    <SortableCard
                                        key={cardId}
                                        id={cardId}
                                        title={config.title}
                                        checked={config.checked}
                                        onChange={config.onChange}
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                </div>

                <Divider sx={{ my: 3 }} />

                <div style={{ marginTop: '30px' }}>
                    <label>Door Unlock Settings</label>
                    <FormGroup sx={{ mt: 1 }}>
                        <FormControlLabel 
                            control={<Checkbox checked={askUnlockReason} onChange={(e)=>setAskUnlockReason(e.target.checked)} />} 
                            label="Ask for reason when unlocking doors" 
                        />
                    </FormGroup>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        When enabled, users will be prompted to provide a reason when unlocking doors remotely.
                    </Typography>
                </div>

                <Divider sx={{ my: 3 }} />

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

                <Divider sx={{ my: 3 }} />

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

                <Divider sx={{ my: 3 }} />

                <div style={{ marginTop: '30px' }}>
                    <TextField
                        label="Payment Reminder (days before due date)"
                        type="number"
                        value={paymentReminderDays}
                        onChange={(e) => setPaymentReminderDays(e.target.value)}
                        slotProps={{ htmlInput: { min: 1 } }}
                        fullWidth
                        margin="normal"
                    />
                </div>

                <Divider sx={{ my: 3 }} />

                <Button variant="contained" color="primary" onClick={handleSaveAllSettings} style={{marginTop: '20px'}}>Save All Settings</Button>
            </div>
    );
};

const Settings = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState(null);

    
    // Determine active tab based on current route
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/settings/esp32-devices')) {
            return 1;
        }
        if (path.includes('/settings/esp32-monitor')) {
            return 2;
        }
        if (path.includes('/settings/esp32-analytics')) {
            return 3;
        }
        return 0; // General settings
    };
    
    // Use beforeunload to warn about unsaved changes when leaving the page
    useBeforeUnload(
        React.useCallback(() => {
            if (hasUnsavedChanges) {
                return 'You have unsaved changes. Are you sure you want to leave?';
            }
        }, [hasUnsavedChanges])
    );

    const handleUnsavedChanges = useCallback((hasChanges) => {
        setHasUnsavedChanges(hasChanges);
    }, []);

    const handleSave = useCallback(() => {
        setHasUnsavedChanges(false);
    }, []);

    const handleTabChange = (event, newValue) => {
        const routes = [
            '/settings',
            '/settings/esp32-devices',
            '/settings/esp32-monitor',
            '/settings/esp32-analytics'
        ];
        
        if (hasUnsavedChanges) {
            setPendingNavigation(routes[newValue]);
            setConfirmDialogOpen(true);
        } else {
            navigate(routes[newValue]);
        }
    };

    const handleConfirmNavigation = () => {
        setHasUnsavedChanges(false);
        setConfirmDialogOpen(false);
        if (pendingNavigation) {
            navigate(pendingNavigation);
            setPendingNavigation(null);
        }
    };

    const handleCancelNavigation = () => {
        setConfirmDialogOpen(false);
        setPendingNavigation(null);
    };

    const handleSaveAndNavigate = async () => {
        // For now, just proceed with navigation
        // Individual components handle their own save logic
        handleConfirmNavigation();
    };

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Settings
            </Typography>
            
            <Paper sx={{ mb: 3 }}>
                <Tabs 
                    value={getActiveTab()} 
                    onChange={handleTabChange}
                    aria-label="settings tabs"
                >
                    <Tab 
                        icon={<SettingsIcon />} 
                        label="General" 
                        sx={{ minHeight: 72 }}
                    />
                    <Tab 
                        icon={<DeviceHubIcon />} 
                        label="ESP32 Devices" 
                        sx={{ minHeight: 72 }}
                    />
                    <Tab 
                        icon={<MonitorIcon />} 
                        label="Device Monitor" 
                        sx={{ minHeight: 72 }}
                    />
                    <Tab 
                        icon={<AnalyticsIcon />} 
                        label="Device Analytics" 
                        sx={{ minHeight: 72 }}
                    />
                </Tabs>
            </Paper>

            <Routes>
                <Route path="/" element={
                    <GeneralSettings 
                        onUnsavedChanges={handleUnsavedChanges} 
                        onSave={handleSave}
                    />
                } />
                <Route path="/esp32-devices" element={
                    <ESP32DeviceManager 
                        onUnsavedChanges={handleUnsavedChanges}
                        onSave={handleSave}
                    />
                } />
                <Route path="/esp32-monitor" element={
                    <ESP32Monitor 
                        onUnsavedChanges={handleUnsavedChanges}
                        onSave={handleSave}
                    />
                } />
                <Route path="/esp32-analytics" element={
                    <ESP32Analytics 
                        onUnsavedChanges={handleUnsavedChanges}
                        onSave={handleSave}
                    />
                } />
            </Routes>

            {/* Unsaved Changes Warning Banner */}
            {hasUnsavedChanges && (
                <Box 
                    sx={{ 
                        position: 'fixed', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        bgcolor: 'warning.main', 
                        color: 'warning.contrastText',
                        p: 2,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1
                    }}
                >
                    <WarningIcon />
                    <Typography variant="body2">
                        You have unsaved changes
                    </Typography>
                </Box>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCancelNavigation}
                aria-labelledby="unsaved-changes-dialog-title"
                aria-describedby="unsaved-changes-dialog-description"
            >
                <DialogTitle id="unsaved-changes-dialog-title">
                    <Box display="flex" alignItems="center" gap={1}>
                        <WarningIcon color="warning" />
                        Unsaved Changes
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        You have unsaved changes that will be lost if you navigate away.
                    </Alert>
                    <Typography variant="body1">
                        What would you like to do?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelNavigation} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmNavigation} color="error" variant="outlined">
                        Discard Changes
                    </Button>
                    <Button onClick={handleSaveAndNavigate} color="primary" variant="contained">
                        Save & Continue
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Settings;
