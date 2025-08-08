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
    MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ScheduleManager = () => {
    const [schedules, setSchedules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [classId, setClassId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [maxCapacity, setMaxCapacity] = useState('');

    useEffect(() => {
        fetchSchedules();
        fetchClasses();
    }, []);

    const fetchSchedules = async () => {
        try {
            const response = await axios.get('/api/schedules');
            setSchedules(response.data);
        } catch (error) {
            console.error("Error fetching schedules", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await axios.get('/api/classes');
            setClasses(response.data);
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
            
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                <Typography variant="h6" gutterBottom>Create New Schedule</Typography>
                
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
                
                <TextField
                    label="Start Time"
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                />
                
                <TextField
                    label="End Time"
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                />
                
                <TextField
                    label="Max Capacity"
                    type="number"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                    inputProps={{ min: 1 }}
                    required
                />
                
                <Button type="submit" variant="contained">Create Schedule</Button>
            </Box>

            <Typography variant="h5" gutterBottom>Scheduled Classes</Typography>
            {schedules.length === 0 ? (
                <Typography>No schedules found. Create one above.</Typography>
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