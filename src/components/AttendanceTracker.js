import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TableShimmer } from './ShimmerLoader';
import {
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Pagination
} from '@mui/material';
import SearchableMemberDropdown from './SearchableMemberDropdown';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import { getCurrentDateString, getPreviousDayString } from '../utils/formatting';
import CrownIcon from '@mui/icons-material/Star';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SimulateCheckInModal from './SimulateCheckInModal';

const AttendanceTracker = () => {
    const [members, setMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState('all');
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [simulateModalOpen, setSimulateModalOpen] = useState(false);
    const [startDate, setStartDate] = useState(() => getPreviousDayString());
    const [endDate, setEndDate] = useState(() => getCurrentDateString());
    const [memberTypeFilter, setMemberTypeFilter] = useState('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [paginationMeta, setPaginationMeta] = useState({
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await axios.get('/api/members?filter=all');
            // The API returns { members: [...], pagination: {...} }
            const membersData = response.data.members || response.data;
            setMembers(Array.isArray(membersData) ? membersData : []);
        } catch (error) {
            console.error("Error fetching members", error);
        }
    };

    const fetchAttendanceForMember = async (memberId) => {
        try {
            const params = new URLSearchParams();
            if (startDate) { params.append('start', startDate); }
            if (endDate) { params.append('end', endDate); }
            const response = await axios.get(`/api/attendance/${memberId}?${params.toString()}`);
            setAttendanceRecords(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching attendance", error);
            setAttendanceRecords([]);
        }
    };

    const fetchAttendanceAll = async (page = currentPage, limit = itemsPerPage) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) { params.append('start', startDate); }
            if (endDate) { params.append('end', endDate); }
            if (memberTypeFilter !== 'all') { params.append('member_type', memberTypeFilter); }
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            
            const response = await axios.get(`/api/attendance?${params.toString()}`);
            const { attendance, pagination } = response.data;
            setAttendanceRecords(Array.isArray(attendance) ? attendance : []);
            setPaginationMeta(pagination || { total: 0, page: 1, limit: 50, totalPages: 0 });
        } catch (error) {
            console.error("Error fetching all attendance", error);
            setAttendanceRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberSelect = (e) => {
        const memberId = e.target.value;
        setSelectedMemberId(memberId);
        if (memberId === 'all') {
            setCurrentPage(1);
            fetchAttendanceAll(1, itemsPerPage);
        } else if (memberId) {
            fetchAttendanceForMember(memberId);
        } else {
            setAttendanceRecords([]);
        }
    };

    // Pagination handlers
    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchAttendanceAll(page, itemsPerPage);
    };

    const handleItemsPerPageChange = (event) => {
        const newItemsPerPage = parseInt(event.target.value, 10);
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
        fetchAttendanceAll(1, newItemsPerPage);
    };

    const handleSimulateCheckInSuccess = (memberId) => {
        // If the simulated member is currently selected, refresh their attendance
        if (String(selectedMemberId) === String(memberId)) {
            fetchAttendanceForMember(Number(memberId));
        }
    };

    const handleOpenSimulateModal = () => {
        setSimulateModalOpen(true);
    };

    const handleCloseSimulateModal = () => {
        setSimulateModalOpen(false);
    };

    useEffect(() => {
        // Auto-refresh when selection or dates change
        if (selectedMemberId === 'all') {
            setCurrentPage(1);
            fetchAttendanceAll(1, itemsPerPage);
        } else if (selectedMemberId) {
            fetchAttendanceForMember(selectedMemberId);
        } else {
            setAttendanceRecords([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMemberId, startDate, endDate, memberTypeFilter]);

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString();
    };

    const getMemberName = (memberId) => {
        const member = members.find(m => m.id === memberId);
        return member ? member.name : 'Unknown';
    };

    return (
        <div>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ borderBottom: '2px solid var(--accent-secondary-color)', pb: 1, mb: 0 }}>
                    Attendance
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<FingerprintIcon />}
                    onClick={handleOpenSimulateModal}
                    sx={{
                        background: 'var(--accent-secondary-bg)',
                        '&:hover': {
                            background: 'var(--accent-secondary-bg)',
                            filter: 'brightness(0.95)'
                        }
                    }}
                >
                    Simulate Check-in
                </Button>
            </Box>
            
            {/* View Attendance Section */}
            <Typography variant="h5" gutterBottom>View Attendance Records</Typography>
            <Box sx={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 160px 160px 160px', gap: 1, alignItems: 'start', maxWidth: 800 }}>
                <SearchableMemberDropdown
                    value={selectedMemberId}
                    onChange={handleMemberSelect}
                    members={members}
                    label="Select member or All users"
                    placeholder="Search members by name, ID, or phone..."
                    showId={false}
                    showEmail={false}
                    showAdminIcon={true}
                    includeAllOption={true}
                    allOptionLabel="All users"
                    allOptionValue="all"
                />
                <FormControl fullWidth>
                    <InputLabel shrink>Member Type</InputLabel>
                    <Select value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value)} label="Member Type">
                        <MenuItem value="all">All member types</MenuItem>
                        <MenuItem value="admins">Admins</MenuItem>
                        <MenuItem value="members">Members</MenuItem>
                    </Select>
                </FormControl>
                <TextField label="Start" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="End" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>

            {!selectedMemberId && members.length === 0 && (
                <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', background: '#fafafa' }}>
                    <PersonOffOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography>No members found. Add members first to track attendance.</Typography>
                </Box>
            )}
            {selectedMemberId && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        {selectedMemberId === 'all' ? 'Attendance for all users' : `Attendance for ${getMemberName(Number(selectedMemberId))}`}
                    </Typography>
                    
                    {/* Pagination Controls - Only show for "all" view */}
                    {selectedMemberId === 'all' && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, paginationMeta.total)} of {paginationMeta.total} records
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 80 }}>
                                    <InputLabel>Per Page</InputLabel>
                                    <Select
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        label="Per Page"
                                    >
                                        <MenuItem value={25}>25</MenuItem>
                                        <MenuItem value={50}>50</MenuItem>
                                        <MenuItem value={100}>100</MenuItem>
                                        <MenuItem value={200}>200</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </>
                    )}
                    
                    {loading ? (
                        <TableShimmer rows={8} columns={5} />
                    ) : attendanceRecords.length > 0 ? (
                        <>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                    <TableRow sx={{ 
                                        background: 'var(--accent-secondary-bg)',
                                        '& .MuiTableCell-root': {
                                            color: '#fff',
                                            fontWeight: 700
                                        }
                                    }}>
                                        {selectedMemberId === 'all' && <TableCell>Member</TableCell>}
                                        <TableCell>Check-in Time</TableCell>
                                    </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {attendanceRecords.map(record => (
                                            <TableRow 
                                                key={record.id}
                                                sx={{
                                                    background: record.is_admin === 1 ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)' : 'transparent',
                                                    border: record.is_admin === 1 ? '2px solid #ffd700' : 'none',
                                                    '&:hover': {
                                                        background: record.is_admin === 1 ? 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)' : undefined
                                                    }
                                                }}
                                            >
                                                {selectedMemberId === 'all' && (
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {record.member_name || getMemberName(record.member_id)}
                                                            {record.is_admin === 1 && (
                                                                <CrownIcon 
                                                                    sx={{ 
                                                                        color: '#ffd700', 
                                                                        fontSize: 16,
                                                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                                                    }} 
                                                                />
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                )}
                                                <TableCell>{formatDateTime(record.check_in_time)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            
                            {/* Pagination - Only show for "all" view */}
                            {selectedMemberId === 'all' && paginationMeta.totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                    <Pagination
                                        count={paginationMeta.totalPages}
                                        page={currentPage}
                                        onChange={handlePageChange}
                                        color="primary"
                                        showFirstButton
                                        showLastButton
                                    />
                                </Box>
                            )}
                        </>
                    ) : (
                        <Typography>
                            {selectedMemberId === 'all' ? 'No attendance records found for the selected period.' : 'No attendance records found for this member.'}
                        </Typography>
                    )}
                </Box>
            )}
            
            {/* Simulate Check-in Modal */}
            <SimulateCheckInModal
                open={simulateModalOpen}
                onClose={handleCloseSimulateModal}
                members={members}
                onCheckInSuccess={handleSimulateCheckInSuccess}
            />
        </div>
    );
};

export default AttendanceTracker;