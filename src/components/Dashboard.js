import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
    const [summaryStats, setSummaryStats] = useState({});
    const [memberGrowth, setMemberGrowth] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [popularClasses, setPopularClasses] = useState([]);
    const [revenueStats, setRevenueStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllReports();
    }, []);

    const fetchAllReports = async () => {
        try {
            const [summary, growth, attendance, classes, revenue] = await Promise.all([
                axios.get('/api/reports/summary'),
                axios.get('/api/reports/member-growth'),
                axios.get('/api/reports/attendance-stats'),
                axios.get('/api/reports/popular-classes'),
                axios.get('/api/reports/revenue-stats')
            ]);

            setSummaryStats(summary.data);
            setMemberGrowth(growth.data);
            setAttendanceStats(attendance.data);
            setPopularClasses(classes.data);
            setRevenueStats(revenue.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reports:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <div><h2>Dashboard</h2><p>Loading analytics...</p></div>;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div>
            <h2>Dashboard - Analytics & Reports</h2>
            
            {/* Summary Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#2c5aa0' }}>Total Members</h3>
                    <p style={{ fontSize: '2em', margin: '0', fontWeight: 'bold' }}>{summaryStats.totalMembers}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f0fff0', borderRadius: '8px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#228b22' }}>Total Revenue</h3>
                    <p style={{ fontSize: '2em', margin: '0', fontWeight: 'bold' }}>{formatCurrency(summaryStats.totalRevenue)}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#fff8dc', borderRadius: '8px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#daa520' }}>New Members This Month</h3>
                    <p style={{ fontSize: '2em', margin: '0', fontWeight: 'bold' }}>{summaryStats.newMembersThisMonth}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#ffe4e1', borderRadius: '8px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#dc143c' }}>Active Schedules</h3>
                    <p style={{ fontSize: '2em', margin: '0', fontWeight: 'bold' }}>{summaryStats.activeSchedules}</p>
                </div>
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
                    <table>
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>New Members</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memberGrowth.map((data, index) => (
                                <tr key={index}>
                                    <td>{formatDate(data.month)}</td>
                                    <td>{data.new_members}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No member growth data available yet.</p>
                )}
            </div>

            {/* Revenue Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Revenue Trend (Last 12 Months)</h3>
                {revenueStats.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueStats.map((data, index) => (
                                <tr key={index}>
                                    <td>{formatDate(data.month)}</td>
                                    <td>{formatCurrency(data.total_revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No revenue data available yet.</p>
                )}
            </div>

            {/* Attendance Trend */}
            <div style={{ marginBottom: '30px' }}>
                <h3>Daily Attendance (Last 30 Days)</h3>
                {attendanceStats.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Check-ins</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceStats.map((data, index) => (
                                <tr key={index}>
                                    <td>{formatDate(data.date)}</td>
                                    <td>{data.total_checkins}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No attendance data available yet.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;