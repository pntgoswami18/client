import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency, formatDate } from '../utils/formatting';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField, 
    Typography,
    Alert
} from '@mui/material';

const Dashboard = () => {
    const [summaryStats, setSummaryStats] = useState({});
    const [memberGrowth, setMemberGrowth] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState([]);
    
    const [revenueStats, setRevenueStats] = useState([]);
    const [birthdaysToday, setBirthdaysToday] = useState([]);
    const [showBirthdays, setShowBirthdays] = useState(false);
    const [paymentReminders, setPaymentReminders] = useState([]);
    const [upcomingRenewals, setUpcomingRenewals] = useState([]);
    const [showPaymentReminders, setShowPaymentReminders] = useState(false);
    const [timeframe, setTimeframe] = useState('3m'); // all | 12m | 6m | 3m | 30d
    const [currency, setCurrency] = useState('INR');
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState(-1);
    const [cardPrefs, setCardPrefs] = useState({
        show_total_members: true,
        show_total_revenue: true,
        show_new_members_this_month: true,
        show_unpaid_members_this_month: true,
        show_active_schedules: true,
    });
    const [cardOrder, setCardOrder] = useState([
        'total_members',
        'total_revenue', 
        'new_members_this_month',
        'unpaid_members_this_month',
        'active_schedules'
    ]);
    const [esp32Devices, setEsp32Devices] = useState([]);
    const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
    const [unlockReason, setUnlockReason] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [unlockLoading, setUnlockLoading] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [unlockSuccess, setUnlockSuccess] = useState('');
    const [askUnlockReason, setAskUnlockReason] = useState(true);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllReports();
        fetchCurrency();
        fetchCardPrefs();
        fetchESP32Devices();
        fetchUnlockSettings();
    }, []);

    // Listen for settings updates from localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            const settingsUpdated = localStorage.getItem('settingsUpdated');
            if (settingsUpdated) {
                // Clear the flag and refresh card preferences
                localStorage.removeItem('settingsUpdated');
                fetchCardPrefs();
            }
        };

        // Check for updates every 1 second
        const interval = setInterval(handleStorageChange, 1000);

        // Also listen for storage events (in case settings are saved in another tab)
        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const fetchCurrency = async () => {
        try {
            const response = await axios.get('/api/settings');
            if (response.data.currency) {
                setCurrency(response.data.currency);
            }
        } catch (error) {
            console.error("Error fetching currency setting", error);
        }
    };

    // Helpers to filter series by timeframe
    const computeCutoff = (tf) => {
        if (tf === 'all') {
            return null;
        }
        const now = new Date();
        const cutoff = new Date(now);
        if (tf === '30d') {
            cutoff.setDate(now.getDate() - 30);
            return cutoff;
        }
        const months = tf === '3m' ? 3 : tf === '6m' ? 6 : 12;
        cutoff.setMonth(now.getMonth() - months);
        return cutoff;
    };

    const cutoffDate = useMemo(() => computeCutoff(timeframe), [timeframe]);

    const filteredAttendanceStats = useMemo(() => {
        if (!cutoffDate) {
            return attendanceStats;
        }
        return attendanceStats.filter(p => {
            const d = new Date(`${p.date}T00:00:00`);
            return d >= cutoffDate;
        });
    }, [attendanceStats, cutoffDate]);

    const filteredMemberGrowth = useMemo(() => {
        if (!cutoffDate) {
            return memberGrowth;
        }
        return memberGrowth.filter(p => {
            const d = new Date(`${p.month}-01T00:00:00`);
            return d >= cutoffDate;
        });
    }, [memberGrowth, cutoffDate]);

    const filteredRevenueStats = useMemo(() => {
        if (!cutoffDate) {
            return revenueStats;
        }
        return revenueStats.filter(p => {
            const d = new Date(`${p.month}-01T00:00:00`);
            return d >= cutoffDate;
        });
    }, [revenueStats, cutoffDate]);

    const timeframeLabel = useMemo(() => {
        switch (timeframe) {
            case '30d': return 'Last 30 days';
            case '3m': return 'Last 3 months';
            case '6m': return 'Last 6 months';
            case '12m': return 'Last 12 months';
            default: return 'All time';
        }
    }, [timeframe]);

    const fetchAllReports = async () => {
        try {
            const [summary, growth, attendance, revenue, birthdays, reminders, renewals] = await Promise.all([
                axios.get('/api/reports/summary'),
                axios.get('/api/reports/member-growth'),
                axios.get('/api/reports/attendance-stats'),
                axios.get('/api/reports/revenue-stats'),
                axios.get('/api/reports/birthdays-today'),
                axios.get('/api/reports/payment-reminders'),
                axios.get('/api/reports/upcoming-renewals')
            ]);

            setSummaryStats(summary.data || {});
            setMemberGrowth(Array.isArray(growth.data) ? growth.data : []);
            setAttendanceStats(Array.isArray(attendance.data) ? attendance.data : []);
            setRevenueStats(Array.isArray(revenue.data) ? revenue.data : []);
            const bdays = Array.isArray(birthdays.data) ? birthdays.data : [];
            setBirthdaysToday(bdays);
            setShowBirthdays(false);
            
            // Handle payment reminders
            const overdueInvoices = Array.isArray(reminders.data?.overdue_invoices) ? reminders.data.overdue_invoices : [];
            const upcomingRenewalsData = Array.isArray(renewals.data?.upcoming_renewals) ? renewals.data.upcoming_renewals : [];
            setPaymentReminders(overdueInvoices);
            setUpcomingRenewals(upcomingRenewalsData);
            setShowPaymentReminders(false);
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reports:', error);
            setLoading(false);
        }
    };

    const fetchCardPrefs = async () => {
        try {
            const res = await axios.get('/api/settings');
            setCardPrefs({
                show_total_members: String(res.data.show_card_total_members) !== 'false',
                show_total_revenue: String(res.data.show_card_total_revenue) !== 'false',
                show_new_members_this_month: String(res.data.show_card_new_members_this_month) !== 'false',
                show_unpaid_members_this_month: String(res.data.show_card_unpaid_members_this_month) !== 'false',
                show_active_schedules: String(res.data.show_card_active_schedules) !== 'false',
            });
            
            // Fetch card order with fallback to default
            if (res.data.card_order && Array.isArray(res.data.card_order)) {
                console.log('Loading saved card order:', res.data.card_order);
                setCardOrder(res.data.card_order);
            } else {
                // Set default order if no saved order exists
                console.log('No saved card order found, using default');
                setCardOrder([
                    'total_members',
                    'total_revenue', 
                    'new_members_this_month',
                    'unpaid_members_this_month',
                    'active_schedules'
                ]);
            }
        } catch (e) { 
            console.error('Error fetching card preferences:', e);
            // Set default order on error
            setCardOrder([
                'total_members',
                'total_revenue', 
                'new_members_this_month',
                'unpaid_members_this_month',
                'active_schedules'
            ]);
        }
    };

    const fetchESP32Devices = async () => {
        try {
            const response = await axios.get('/api/biometric/devices');
            if (response.data && response.data.success && Array.isArray(response.data.devices)) {
                setEsp32Devices(response.data.devices.filter(device => device.status === 'online'));
            }
        } catch (error) {
            console.error('Error fetching ESP32 devices:', error);
        }
    };

    const fetchUnlockSettings = async () => {
        try {
            const response = await axios.get('/api/settings');
            setAskUnlockReason(String(response.data.ask_unlock_reason) !== 'false');
        } catch (error) {
            console.error('Error fetching unlock settings:', error);
        }
    };

    const handleQuickUnlock = async (device) => {
        if (!device) {
            return;
        }
        
        try {
            setUnlockLoading(true);
            setUnlockError('');
            setUnlockSuccess('');
            
            const reason = askUnlockReason ? unlockReason || 'Quick unlock from dashboard' : 'Quick unlock from dashboard';
            
            const response = await axios.post(`/api/biometric/devices/${device.device_id}/unlock`, {
                reason: reason
            });
            
            if (response.data.success) {
                setUnlockSuccess(`Door ${device.device_id} unlocked successfully!`);
                setUnlockDialogOpen(false);
                setUnlockReason('');
                setTimeout(() => setUnlockSuccess(''), 3000);
                
                // Show success notification for direct unlock
                if (!askUnlockReason) {
                    setShowSuccessNotification(true);
                    setTimeout(() => setShowSuccessNotification(false), 3000);
                }
            } else {
                setUnlockError(response.data.message || 'Failed to unlock door');
            }
        } catch (error) {
            setUnlockError('Failed to unlock door: ' + (error.response?.data?.message || error.message));
        } finally {
            setUnlockLoading(false);
        }
    };

    // Function to render cards in the specified order
    const renderCardsInOrder = () => {
        const cardConfigs = {
            total_members: {
                key: 'total_members',
                title: 'Total Members',
                value: displayValue(summaryStats.totalMembers),
                color: '#1e3a8a',
                onClick: () => navigate('/members'),
                hoverIndex: 0,
                show: cardPrefs.show_total_members
            },
            total_revenue: {
                key: 'total_revenue',
                title: 'Total Revenue This Month',
                value: displayValue(summaryStats.totalRevenueThisMonth, true),
                color: '#166534',
                onClick: () => navigate('/financials?section=pending-payments'),
                hoverIndex: 1,
                show: cardPrefs.show_total_revenue
            },
            new_members_this_month: {
                key: 'new_members_this_month',
                title: 'New Members This Month',
                value: displayValue(summaryStats.newMembersThisMonth),
                color: '#78350f',
                onClick: () => navigate('/members?filter=new-this-month'),
                hoverIndex: 2,
                show: cardPrefs.show_new_members_this_month
            },
            unpaid_members_this_month: {
                key: 'unpaid_members_this_month',
                title: 'Unpaid Members This Month',
                value: displayValue(summaryStats.unpaidMembersThisMonth),
                color: '#7f1d1d',
                onClick: () => navigate('/members?filter=unpaid-this-month'),
                hoverIndex: 3,
                show: cardPrefs.show_unpaid_members_this_month
            },
            active_schedules: {
                key: 'active_schedules',
                title: 'Active Schedules',
                value: displayValue(summaryStats.activeSchedules),
                color: '#7c1d24',
                onClick: () => navigate('/schedules'),
                hoverIndex: 4,
                show: cardPrefs.show_active_schedules
            }
        };

        return cardOrder
            .filter(cardKey => cardConfigs[cardKey] && cardConfigs[cardKey].show)
            .map(cardKey => {
                const config = cardConfigs[cardKey];
                return (
                    <div
                        key={config.key}
                        onClick={config.onClick}
                        onMouseEnter={() => setHoveredCard(config.hoverIndex)}
                        onMouseLeave={() => setHoveredCard(-1)}
                        style={{
                            padding: '20px',
                            backgroundColor: config.color,
                            color: '#fff',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '140px',
                            width: 'auto',
                            flex: '1 1 0',
                            minWidth: 0,
                            boxShadow: hoveredCard === config.hoverIndex ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transform: hoveredCard === config.hoverIndex ? 'translateY(-2px)' : 'translateY(0)',
                            backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                            backgroundSize: '250% 250%',
                            backgroundPosition: hoveredCard === config.hoverIndex ? 'right center' : 'left center',
                            transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                        }}
                    >
                        <h3 style={{ margin: 0, color: '#fff' }}>{config.title}</h3>
                        <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{config.value}</p>
                    </div>
                );
            });
    };

    if (loading) {
        return <div><h2>Dashboard</h2><p>Loading analytics...</p></div>;
    }
    
    const displayValue = (value, isCurrency = false) => {
        const num = Number(value);
        if (isNaN(num)) { return isCurrency ? formatCurrency(0, currency) : 0; }
        return isCurrency ? formatCurrency(num, currency) : num;
    };

    return (
        <div>
            <style>
                {`
                    @keyframes birthdayPulse {
                        0%, 100% {
                            box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2);
                        }
                        50% {
                            box-shadow: 0 12px 35px rgba(255, 107, 53, 0.6), 0 6px 15px rgba(0, 0, 0, 0.3);
                        }
                    }
                    @keyframes paymentPulse {
                        0%, 100% {
                            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2);
                        }
                        50% {
                            box-shadow: 0 12px 35px rgba(220, 38, 38, 0.6), 0 6px 15px rgba(0, 0, 0, 0.3);
                        }
                    }
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `}
            </style>
            <div style={{ position: 'relative' }}>
                <h2 style={{
                    background: 'var(--accent-secondary-bg)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>Dashboard - Analytics & Reports</h2>
                
                {/* Quick Door Unlock Section */}
                {esp32Devices.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: '#fff', 
                                    fontSize: '18px',
                                    fontWeight: '600'
                                }}>
                                    🔓 Quick Door Unlock
                                </h3>
                                <p style={{ 
                                    margin: '4px 0 0 0', 
                                    color: 'rgba(255,255,255,0.8)', 
                                    fontSize: '14px'
                                }}>
                                    {esp32Devices.length} device{esp32Devices.length > 1 ? 's' : ''} online
                                </p>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap'
                            }}>
                                {esp32Devices.map((device) => (
                                    <button
                                        key={device.device_id}
                                        onClick={() => {
                                            if (askUnlockReason) {
                                                setSelectedDevice(device);
                                                setUnlockDialogOpen(true);
                                            } else {
                                                handleQuickUnlock(device);
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: '8px',
                                            padding: '8px 16px',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.3)';
                                            e.target.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.2)';
                                            e.target.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <span>🔓</span>
                                        {device.location || device.device_id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                                )}

                {/* Success Notification for Direct Unlock */}
                {showSuccessNotification && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 1400,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        animation: 'slideInRight 0.3s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>✅</span>
                            <span style={{ fontWeight: '500' }}>Door unlocked successfully!</span>
                        </div>
                    </div>
                )}
                
                {/* Birthday Reminder Icon */}
                {birthdaysToday.length > 0 && (
                    <div 
                        onClick={() => setShowBirthdays(!showBirthdays)}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            width: '60px',
                            height: '60px',
                            zIndex: 1000,
                            background: 'linear-gradient(145deg, #ff6b35, #f7931e)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(255, 107, 53, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2)',
                            transform: showBirthdays ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '3px solid #fff',
                            animation: 'birthdayPulse 2s infinite'
                        }}
                    >
                        <span style={{ 
                            fontSize: '24px', 
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}>🎂</span>
                        {birthdaysToday.length > 1 && (
                            <div style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '24px',
                                height: '24px',
                                background: '#dc2626',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#fff',
                                border: '2px solid #fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}>
                                {birthdaysToday.length}
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Reminder Icon */}
                {(paymentReminders.length > 0 || upcomingRenewals.length > 0) && (
                    <div 
                        onClick={() => setShowPaymentReminders(!showPaymentReminders)}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            right: birthdaysToday.length > 0 ? '60px' : '-10px',
                            width: '60px',
                            height: '60px',
                            zIndex: 1000,
                            background: 'linear-gradient(145deg, #dc2626, #b91c1c)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2)',
                            transform: showPaymentReminders ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '3px solid #fff',
                            animation: 'paymentPulse 2s infinite'
                        }}
                    >
                        <span style={{ 
                            fontSize: '24px', 
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}>💳</span>
                        {(paymentReminders.length + upcomingRenewals.length) > 1 && (
                            <div style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '24px',
                                height: '24px',
                                background: '#f59e0b',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#fff',
                                border: '2px solid #fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}>
                                {paymentReminders.length + upcomingRenewals.length}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Summary Stats Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', paddingBottom: '8px', flexWrap: 'nowrap', alignItems: 'stretch', overflowX: 'hidden', marginTop: (birthdaysToday.length > 0 || paymentReminders.length > 0 || upcomingRenewals.length > 0) ? '20px' : '0' }}>
                {renderCardsInOrder()}
            </div>

            

            {/* Birthday Notification Popup */}
            {showBirthdays && birthdaysToday.length > 0 && (
                <div style={{ position: 'fixed', top: 80, right: showPaymentReminders ? 440 : 24, zIndex: 1300, maxWidth: 360 }}>
                    <div style={{
                        background: '#111827',
                        color: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px',
                            backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.08), rgba(255,255,255,0))'
                        }}>
                            <span>🎂 Birthdays Today</span>
                            <button onClick={() => setShowBirthdays(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ maxHeight: 260, overflowY: 'auto', padding: '10px 14px' }}>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {birthdaysToday.map((b) => (
                                    <li key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ fontWeight: 600 }}>{b.name}</div>
                                        {b.phone && <div style={{ opacity: 0.8, fontSize: 12 }}>{b.phone}</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Reminder Popup */}
            {showPaymentReminders && (paymentReminders.length > 0 || upcomingRenewals.length > 0) && (
                <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 1300, maxWidth: 420 }}>
                    <div style={{
                        background: '#7f1d1d',
                        color: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px',
                            backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.08), rgba(255,255,255,0))'
                        }}>
                            <span>💳 Payment Reminders</span>
                            <button onClick={() => setShowPaymentReminders(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '10px 14px' }}>
                            {paymentReminders.length > 0 && (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '10px', color: '#fca5a5' }}>Overdue Payments</div>
                                    {paymentReminders.map((reminder) => {
                                        const whatsappMessage = `Hi ${reminder.member_name}, your payment of ${formatCurrency(reminder.amount, currency)} for ${reminder.plan_name || 'membership'} was due on ${new Date(reminder.due_date).toLocaleDateString()}. Please make the payment at your earliest convenience. Thank you!`;
                                        const whatsappUrl = reminder.phone ? `https://wa.me/${encodeURIComponent(reminder.phone.replace(/\D/g,''))}?text=${encodeURIComponent(whatsappMessage)}` : null;
                                        
                                        return (
                                            <div key={reminder.invoice_id} style={{ 
                                                padding: '10px', 
                                                marginBottom: '8px', 
                                                background: 'rgba(255,255,255,0.05)', 
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{reminder.member_name}</div>
                                                <div style={{ opacity: 0.9, fontSize: '12px', margin: '4px 0' }}>
                                                    {formatCurrency(reminder.amount, currency)} • Due: {new Date(reminder.due_date).toLocaleDateString()} • {Math.floor(reminder.days_overdue)} days overdue
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    {whatsappUrl && (
                                                        <a 
                                                            href={whatsappUrl} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            style={{
                                                                background: '#25d366',
                                                                color: '#fff',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                textDecoration: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            📱 WhatsApp
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => navigate('/financials?section=pending-payments')}
                                                        style={{
                                                            background: '#1f2937',
                                                            color: '#fff',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {upcomingRenewals.length > 0 && (
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '10px', color: '#fbbf24' }}>Upcoming Renewals</div>
                                    {upcomingRenewals.map((renewal) => {
                                        const whatsappMessage = `Hi ${renewal.member_name}, your ${renewal.plan_name} membership is due for renewal on ${new Date(renewal.next_due_date).toLocaleDateString()}. Amount: ${formatCurrency(renewal.price, currency)}. Please renew to continue enjoying our services!`;
                                        const whatsappUrl = renewal.phone ? `https://wa.me/${encodeURIComponent(renewal.phone.replace(/\D/g,''))}?text=${encodeURIComponent(whatsappMessage)}` : null;
                                        
                                        return (
                                            <div key={renewal.member_id} style={{ 
                                                padding: '10px', 
                                                marginBottom: '8px', 
                                                background: 'rgba(251, 191, 36, 0.1)', 
                                                borderRadius: '6px',
                                                border: '1px solid rgba(251, 191, 36, 0.3)'
                                            }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{renewal.member_name}</div>
                                                <div style={{ opacity: 0.9, fontSize: '12px', margin: '4px 0' }}>
                                                    {renewal.plan_name} • {formatCurrency(renewal.price, currency)} • Due: {new Date(renewal.next_due_date).toLocaleDateString()}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    {whatsappUrl && (
                                                        <a 
                                                            href={whatsappUrl} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            style={{
                                                                background: '#25d366',
                                                                color: '#fff',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                textDecoration: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            📱 WhatsApp
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => navigate('/financials')}
                                                        style={{
                                                            background: '#1f2937',
                                                            color: '#fff',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Create Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Timeframe controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <label style={{ marginRight: 8 }}>Timeframe:</label>
                <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6 }}>
                    <option value="all">All time</option>
                    <option value="12m">Last 12 months</option>
                    <option value="6m">Last 6 months</option>
                    <option value="3m">Last 3 months</option>
                    <option value="30d">Last 30 days</option>
                </select>
            </div>

            {/* Member Growth Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Member Growth ({timeframeLabel})</h3>
                {filteredMemberGrowth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredMemberGrowth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="new_members" fill="#8884d8" name="New Members" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p>No member growth data available yet.</p>
                )}
            </div>

            {/* Revenue Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Revenue Trend ({timeframeLabel})</h3>
                {filteredRevenueStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredRevenueStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickFormatter={formatDate} />
                            <YAxis tickFormatter={(value) => formatCurrency(value, currency)} />
                            <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                            <Legend />
                            <Line type="monotone" dataKey="total_revenue" stroke="#82ca9d" name="Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p>No revenue data available yet.</p>
                )}
            </div>

            {/* Attendance Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Daily Attendance ({timeframeLabel})</h3>
                {filteredAttendanceStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredAttendanceStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total_checkins" stroke="#8884d8" name="Check-ins" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p>No attendance data available yet.</p>
                )}
            </div>

            {/* Quick Unlock Dialog */}
            <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔓</span>
                        Quick Door Unlock
                    </div>
                </DialogTitle>
                <DialogContent>
                    {unlockError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {unlockError}
                        </Alert>
                    )}
                    {unlockSuccess && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {unlockSuccess}
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Device: {selectedDevice?.location || selectedDevice?.device_id}
                    </Typography>
                    {askUnlockReason && (
                        <TextField
                            fullWidth
                            label="Unlock Reason"
                            value={unlockReason}
                            onChange={(e) => setUnlockReason(e.target.value)}
                            placeholder="e.g., Emergency access, Maintenance, Admin override"
                            sx={{ mt: 2 }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setUnlockDialogOpen(false);
                        setUnlockReason('');
                        setUnlockError('');
                        setUnlockSuccess('');
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => handleQuickUnlock(selectedDevice)} 
                        variant="contained" 
                        disabled={unlockLoading}
                        sx={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                            }
                        }}
                    >
                        {unlockLoading ? 'Unlocking...' : 'Unlock Door'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Dashboard;
