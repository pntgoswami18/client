import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency, formatDate } from '../utils/formatting';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [summaryStats, setSummaryStats] = useState({});
    const [memberGrowth, setMemberGrowth] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState([]);
    
    const [revenueStats, setRevenueStats] = useState([]);
    const [birthdaysToday, setBirthdaysToday] = useState([]);
    const [showBirthdays, setShowBirthdays] = useState(false);
    const [timeframe, setTimeframe] = useState('all'); // all | 12m | 6m | 3m | 30d
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
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllReports();
        fetchCurrency();
        fetchCardPrefs();
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
            const [summary, growth, attendance, revenue, birthdays] = await Promise.all([
                axios.get('/api/reports/summary'),
                axios.get('/api/reports/member-growth'),
                axios.get('/api/reports/attendance-stats'),
                axios.get('/api/reports/revenue-stats'),
                axios.get('/api/reports/birthdays-today')
            ]);

            setSummaryStats(summary.data || {});
            setMemberGrowth(Array.isArray(growth.data) ? growth.data : []);
            setAttendanceStats(Array.isArray(attendance.data) ? attendance.data : []);
            setRevenueStats(Array.isArray(revenue.data) ? revenue.data : []);
            const bdays = Array.isArray(birthdays.data) ? birthdays.data : [];
            setBirthdaysToday(bdays);
            setShowBirthdays(bdays.length);
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
        } catch (e) { /* ignore */ }
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
                `}
            </style>
            <div style={{ position: 'relative' }}>
                <h2 style={{
                    background: 'var(--accent-secondary-bg)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>Dashboard - Analytics & Reports</h2>
                
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
            </div>
            
            {/* Summary Stats Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', paddingBottom: '8px', flexWrap: 'nowrap', alignItems: 'stretch', overflowX: 'hidden', marginTop: birthdaysToday.length > 0 ? '20px' : '0' }}>
                {cardPrefs.show_total_members && <div
                    onClick={() => navigate('/members')}
                    onMouseEnter={() => setHoveredCard(0)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#1e3a8a',
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
                        boxShadow: hoveredCard === 0 ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transform: hoveredCard === 0 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 0 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#fff' }}>Total Members</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.totalMembers)}</p>
                </div>}
                {cardPrefs.show_total_revenue && <div
                    onClick={() => navigate('/financials?section=pending-payments')}
                    onMouseEnter={() => setHoveredCard(1)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#166534',
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
                        boxShadow: hoveredCard === 1 ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transform: hoveredCard === 1 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 1 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#fff' }}>Total Revenue This Month</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.totalRevenueThisMonth, true)}</p>
                </div>}
                {cardPrefs.show_new_members_this_month && <div
                    onClick={() => navigate('/members?filter=new-this-month')}
                    onMouseEnter={() => setHoveredCard(2)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#78350f',
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
                        boxShadow: hoveredCard === 2 ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transform: hoveredCard === 2 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 2 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#fff' }}>New Members This Month</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.newMembersThisMonth)}</p>
                </div>}
                {cardPrefs.show_unpaid_members_this_month && <div
                    onClick={() => navigate('/members?filter=unpaid-this-month')}
                    onMouseEnter={() => setHoveredCard(3)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#7f1d1d',
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
                        boxShadow: hoveredCard === 3 ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transform: hoveredCard === 3 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 3 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#fff' }}>Unpaid Members This Month</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.unpaidMembersThisMonth)}</p>
                </div>}
                {cardPrefs.show_active_schedules && <div
                    onClick={() => navigate('/schedules')}
                    onMouseEnter={() => setHoveredCard(4)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#7c1d24',
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
                        boxShadow: hoveredCard === 4 ? '0 16px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transform: hoveredCard === 4 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.24), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 4 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#fff' }}>Active Schedules</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.activeSchedules)}</p>
                </div>}
            </div>

            

            {/* Birthday Notification Popup */}
            {showBirthdays && birthdaysToday.length > 0 && (
                <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 1300, maxWidth: 360 }}>
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
        </div>
    );
};

export default Dashboard;
