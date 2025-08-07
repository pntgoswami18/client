import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceTracker = () => {
    const [members, setMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [simulateMemberId, setSimulateMemberId] = useState('');

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await axios.get('/api/members');
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
        }
    };

    const fetchAttendanceForMember = async (memberId) => {
        try {
            const response = await axios.get(`/api/attendance/${memberId}`);
            setAttendanceRecords(response.data);
        } catch (error) {
            console.error("Error fetching attendance", error);
            setAttendanceRecords([]);
        }
    };

    const handleMemberSelect = (e) => {
        const memberId = e.target.value;
        setSelectedMemberId(memberId);
        if (memberId) {
            fetchAttendanceForMember(memberId);
        } else {
            setAttendanceRecords([]);
        }
    };

    const simulateCheckIn = async (e) => {
        e.preventDefault();
        if (!simulateMemberId) return;

        try {
            await axios.post('/api/attendance/check-in', { memberId: parseInt(simulateMemberId) });
            alert('Check-in successful!');
            
            // If the simulated member is currently selected, refresh their attendance
            if (selectedMemberId === simulateMemberId) {
                fetchAttendanceForMember(simulateMemberId);
            }
            setSimulateMemberId('');
        } catch (error) {
            console.error("Error simulating check-in", error);
            alert('Error during check-in. Please check if the member exists.');
        }
    };

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString();
    };

    const getMemberName = (memberId) => {
        const member = members.find(m => m.id === memberId);
        return member ? member.name : 'Unknown';
    };

    return (
        <div>
            <h2>Attendance Tracking</h2>
            
            {/* Simulate Check-in Section */}
            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h3>Simulate Biometric Check-in</h3>
                <p>This simulates what a biometric device would do when a member checks in.</p>
                <form onSubmit={simulateCheckIn}>
                    <select 
                        value={simulateMemberId} 
                        onChange={e => setSimulateMemberId(e.target.value)} 
                        required
                    >
                        <option value="">Select Member to Check In</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.name} (ID: {member.id})
                            </option>
                        ))}
                    </select>
                    <button type="submit">Simulate Check-in</button>
                </form>
            </div>

            {/* View Attendance Section */}
            <div>
                <h3>View Attendance Records</h3>
                <select value={selectedMemberId} onChange={handleMemberSelect}>
                    <option value="">Select a member to view attendance</option>
                    {members.map(member => (
                        <option key={member.id} value={member.id}>
                            {member.name} - {member.email}
                        </option>
                    ))}
                </select>

                {selectedMemberId && (
                    <div style={{ marginTop: '20px' }}>
                        <h4>Attendance for {getMemberName(parseInt(selectedMemberId))}</h4>
                        {attendanceRecords.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Check-in Time</th>
                                        <th>Check-out Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceRecords.map(record => (
                                        <tr key={record.id}>
                                            <td>{formatDateTime(record.check_in_time)}</td>
                                            <td>{record.check_out_time ? formatDateTime(record.check_out_time) : 'Still in gym'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No attendance records found for this member.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTracker;