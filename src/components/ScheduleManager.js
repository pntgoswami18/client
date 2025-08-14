import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TextField,
    Button,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';

const ScheduleManager = () => {
    const [schedules, setSchedules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [classId, setClassId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [maxCapacity, setMaxCapacity] = useState('');
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    useEffect(() => {
        fetchSchedules();
        fetchClasses();
    }, []);

    const fetchSchedules = async () => {
        try {
            const response = await axios.get('/api/schedules');
            setSchedules(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching schedules", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await axios.get('/api/classes');
            setClasses(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching classes", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const scheduleData = {
            class_id: parseInt(classId),
            start_time: startTime,
            end_time: endTime,
            max_capacity: parseInt(maxCapacity)
        };

        try {
            await axios.post('/api/schedules', scheduleData);
            fetchSchedules();
            resetForm();
            setOpenAdd(false);
        } catch (error) {
            console.error("Error creating schedule", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this schedule?')) {
            try {
                await axios.delete(`/api/schedules/${id}`);
                fetchSchedules();
            } catch (error) {
                console.error("Error deleting schedule", error);
            }
        }
    };

    const openEditDialog = (schedule) => {
        setEditingSchedule(schedule);
        const cls = classes.find(c => c.name === schedule.class_name && c.instructor === schedule.instructor);
        setClassId(cls ? cls.id : '');
        setStartTime(schedule.start_time?.slice(0,16));
        setEndTime(schedule.end_time?.slice(0,16));
        setMaxCapacity(String(schedule.max_capacity || ''));
        setOpenEdit(true);
    };

    const resetForm = () => {
        setClassId('');
        setStartTime('');
        setEndTime('');
        setMaxCapacity('');
    };

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString();
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>Schedule Management</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => setOpenAdd(true)}>Add Schedule</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create New Schedule</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Select Class</InputLabel>
                            <Select value={classId} onChange={e => setClassId(e.target.value)}>
                                {classes.map(cls => (
                                    <MenuItem key={cls.id} value={cls.id}>
                                        {cls.name} - {cls.instructor}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Start Time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <TextField label="End Time" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <TextField label="Max Capacity" type="number" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} inputProps={{ min: 1 }} required />
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Create</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Schedule</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={async (e)=>{
                        e.preventDefault();
                        try {
                            await axios.put(`/api/schedules/${editingSchedule.id}`, {
                                class_id: parseInt(classId,10),
                                start_time: startTime,
                                end_time: endTime,
                                max_capacity: parseInt(maxCapacity,10)
                            });
                            setOpenEdit(false);
                            setEditingSchedule(null);
                            resetForm();
                            fetchSchedules();
                        } catch (err) { console.error('Error updating schedule', err); }
                    }} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Select Class</InputLabel>
                            <Select value={classId} onChange={e => setClassId(e.target.value)}>
                                {classes.map(cls => (
                                    <MenuItem key={cls.id} value={cls.id}>
                                        {cls.name} - {cls.instructor}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Start Time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <TextField label="End Time" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <TextField label="Max Capacity" type="number" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} inputProps={{ min: 1 }} required />
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Save</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Typography variant="h5" gutterBottom>Scheduled Classes</Typography>
            {schedules.length === 0 ? (
                <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', background: '#fafafa' }}>
                    <EventBusyOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography gutterBottom>No schedules found.</Typography>
                    {classes.length === 0 ? (
                        <Typography variant="body2">Create a class first to add schedules.</Typography>
                    ) : (
                        <Button variant="contained" onClick={() => setOpenAdd(true)}>Create your first schedule</Button>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Class Name</TableCell>
                                <TableCell>Instructor</TableCell>
                                <TableCell>Start Time</TableCell>
                                <TableCell>End Time</TableCell>
                                <TableCell>Capacity</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedules.map(schedule => (
                                <TableRow key={schedule.id}>
                                    <TableCell>{schedule.class_name}</TableCell>
                                    <TableCell>{schedule.instructor}</TableCell>
                                    <TableCell>{formatDateTime(schedule.start_time)}</TableCell>
                                    <TableCell>{formatDateTime(schedule.end_time)}</TableCell>
                                    <TableCell>{schedule.max_capacity}</TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => openEditDialog(schedule)} sx={{ mr: 1 }}>Edit</Button>
                                        <IconButton onClick={() => handleDelete(schedule.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default ScheduleManager;