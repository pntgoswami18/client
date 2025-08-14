import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency, formatDate } from '../utils/formatting';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [summaryStats, setSummaryStats] = useState({});
    const [memberGrowth, setMemberGrowth] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [popularClasses, setPopularClasses] = useState([]);
    const [revenueStats, setRevenueStats] = useState([]);
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

    const fetchAllReports = async () => {
        try {
            const [summary, growth, attendance, classes, revenue] = await Promise.all([
                axios.get('/api/reports/summary'),
                axios.get('/api/reports/member-growth'),
                axios.get('/api/reports/attendance-stats'),
                axios.get('/api/reports/popular-classes'),
                axios.get('/api/reports/revenue-stats')
            ]);

            setSummaryStats(summary.data || {});
            setMemberGrowth(Array.isArray(growth.data) ? growth.data : []);
            setAttendanceStats(Array.isArray(attendance.data) ? attendance.data : []);
            setPopularClasses(Array.isArray(classes.data) ? classes.data : []);
            setRevenueStats(Array.isArray(revenue.data) ? revenue.data : []);
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
            <h2 style={{
                background: 'var(--accent-secondary-bg)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>Dashboard - Analytics & Reports</h2>
            
            {/* Summary Stats Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '8px' }}>
                {cardPrefs.show_total_members && <div
                    onClick={() => navigate('/members')}
                    onMouseEnter={() => setHoveredCard(0)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#f0f8ff',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        width: '260px',
                        flex: '0 0 260px',
                        boxShadow: hoveredCard === 0 ? '0 12px 32px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        transform: hoveredCard === 0 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 0 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#2c5aa0' }}>Total Members</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.totalMembers)}</p>
                </div>}
                {cardPrefs.show_total_revenue && <div
                    onClick={() => navigate('/financials?section=pending-payments')}
                    onMouseEnter={() => setHoveredCard(1)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#f0fff0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        width: '260px',
                        flex: '0 0 260px',
                        boxShadow: hoveredCard === 1 ? '0 12px 32px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        transform: hoveredCard === 1 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 1 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#228b22' }}>Total Revenue</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.totalRevenue, true)}</p>
                </div>}
                {cardPrefs.show_new_members_this_month && <div
                    onClick={() => navigate('/members?filter=new-this-month')}
                    onMouseEnter={() => setHoveredCard(2)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#fff8dc',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        width: '260px',
                        flex: '0 0 260px',
                        boxShadow: hoveredCard === 2 ? '0 12px 32px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        transform: hoveredCard === 2 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 2 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#daa520' }}>New Members This Month</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.newMembersThisMonth)}</p>
                </div>}
                {cardPrefs.show_unpaid_members_this_month && <div
                    onClick={() => navigate('/members?filter=unpaid-this-month')}
                    onMouseEnter={() => setHoveredCard(3)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#fde2e1',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        width: '260px',
                        flex: '0 0 260px',
                        boxShadow: hoveredCard === 3 ? '0 12px 32px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        transform: hoveredCard === 3 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 3 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#b22222' }}>Unpaid Members This Month</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.unpaidMembersThisMonth)}</p>
                </div>}
                {cardPrefs.show_active_schedules && <div
                    onClick={() => navigate('/schedules')}
                    onMouseEnter={() => setHoveredCard(4)}
                    onMouseLeave={() => setHoveredCard(-1)}
                    style={{
                        padding: '20px',
                        backgroundColor: '#ffe4e1',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        width: '260px',
                        flex: '0 0 260px',
                        boxShadow: hoveredCard === 4 ? '0 12px 32px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        transform: hoveredCard === 4 ? 'translateY(-2px)' : 'translateY(0)',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                        backgroundSize: '250% 250%',
                        backgroundPosition: hoveredCard === 4 ? 'right center' : 'left center',
                        transition: 'box-shadow .3s ease, transform .3s ease, background-position .7s ease'
                    }}
                >
                    <h3 style={{ margin: 0, color: '#dc143c' }}>Active Schedules</h3>
                    <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', alignSelf: 'flex-start' }}>{displayValue(summaryStats.activeSchedules)}</p>
                </div>}
            </div>

            {/* Popular Classes */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Most Popular Classes</h3>
                {popularClasses.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Class Name</th>
                                <th>Instructor</th>
                                <th>Total Bookings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {popularClasses.map((cls, index) => (
                                <tr key={index}>
                                    <td>{cls.name}</td>
                                    <td>{cls.instructor}</td>
                                    <td>{cls.booking_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No booking data available yet.</p>
                )}
            </div>

            {/* Member Growth Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Member Growth (Last 12 Months)</h3>
                {memberGrowth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={memberGrowth}>
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
                <h3>Revenue Trend (Last 12 Months)</h3>
                {revenueStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueStats}>
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
                <h3>Daily Attendance (Last 30 Days)</h3>
                {attendanceStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceStats}>
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
