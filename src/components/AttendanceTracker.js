import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert
} from '@mui/material';

const AttendanceTracker = () => {
    const [members, setMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [simulateMemberId, setSimulateMemberId] = useState('');
    const [checkInError, setCheckInError] = useState('');

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
        if (!simulateMemberId) {
            return;
        }

        try {
            setCheckInError('');
            await axios.post('/api/attendance/check-in', { memberId: parseInt(simulateMemberId) });
            alert('Check-in successful!');
            
            // If the simulated member is currently selected, refresh their attendance
            if (selectedMemberId === simulateMemberId) {
                fetchAttendanceForMember(simulateMemberId);
            }
            setSimulateMemberId('');
        } catch (error) {
            console.error("Error simulating check-in", error);
            const msg = error?.response?.data?.message || 'Error during check-in. Please check if the member exists.';
            setCheckInError(msg);
            alert(msg);
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
            <Typography variant="h4" gutterBottom>Attendance Tracking</Typography>
            
            {/* Simulate Check-in Section */}
            <Card sx={{ marginBottom: '2rem' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Simulate Biometric Check-in</Typography>
                    <Alert severity="info" sx={{ marginBottom: '1rem' }}>
                        This simulates what a biometric device would do when a member checks in.
                    </Alert>
                    {checkInError && (
                        <Alert severity="error" sx={{ mb: 2 }}>{checkInError}</Alert>
                    )}
                    <Box component="form" onSubmit={simulateCheckIn} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                        <FormControl fullWidth required>
                            <InputLabel>Select Member to Check In</InputLabel>
                            <Select value={simulateMemberId} onChange={e => setSimulateMemberId(e.target.value)}>
                                {members.map(member => (
                                    <MenuItem key={member.id} value={member.id}>
                                        {member.name} (ID: {member.id})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button type="submit" variant="contained">Simulate Check-in</Button>
                    </Box>
                </CardContent>
            </Card>

            {/* View Attendance Section */}
            <Typography variant="h5" gutterBottom>View Attendance Records</Typography>
            <Box sx={{ marginBottom: '2rem', maxWidth: '400px' }}>
                <FormControl fullWidth>
                    <InputLabel>Select a member to view attendance</InputLabel>
                    <Select value={selectedMemberId} onChange={handleMemberSelect}>
                        <MenuItem value="">Select a member to view attendance</MenuItem>
                        {members.map(member => (
                            <MenuItem key={member.id} value={member.id}>
                                {member.name} - {member.email}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {selectedMemberId && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Attendance for {getMemberName(parseInt(selectedMemberId))}
                    </Typography>
                    {attendanceRecords.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                <TableRow>
                                    <TableCell>Check-in Time</TableCell>
                                </TableRow>
                                </TableHead>
                                <TableBody>
                                    {attendanceRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDateTime(record.check_in_time)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography>No attendance records found for this member.</Typography>
                    )}
                </Box>
            )}
        </div>
    );
};

export default AttendanceTracker;