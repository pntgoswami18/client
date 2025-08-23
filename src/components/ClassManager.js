import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    LibraryBooksOutlined as LibraryBooksOutlinedIcon,
    Class as ClassIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import ScheduleManager from './ScheduleManager';

const ClassesManagement = () => {
    const [classes, setClasses] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instructor, setInstructor] = useState('');
    const [duration, setDuration] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

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
        const classData = { name, description, instructor, duration_minutes: parseInt(duration) };

        try {
            if (editingClass) {
                await axios.put(`/api/classes/${editingClass.id}`, classData);
                setOpenEdit(false);
            } else {
                await axios.post('/api/classes', classData);
                setOpenAdd(false);
            }
            fetchClasses();
            resetForm();
        } catch (error) {
            console.error("Error saving class", error);
        }
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setName(cls.name);
        setDescription(cls.description);
        setInstructor(cls.instructor);
        setDuration(cls.duration_minutes);
        setOpenEdit(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/classes/${id}`);
            fetchClasses();
        } catch (error) {
            console.error("Error deleting class", error);
        }
    };

    const resetForm = () => {
        setEditingClass(null);
        setName('');
        setDescription('');
        setInstructor('');
        setDuration('');
    };

    return (
        <div>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => setOpenAdd(true)}>Add Class</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Class</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Class Name" value={name} onChange={e => setName(e.target.value)} required />
                        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline rows={3} />
                        <TextField label="Instructor" value={instructor} onChange={e => setInstructor(e.target.value)} required />
                        <TextField label="Duration (minutes)" type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Create</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Class</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Class Name" value={name} onChange={e => setName(e.target.value)} required />
                        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline rows={3} />
                        <TextField label="Instructor" value={instructor} onChange={e => setInstructor(e.target.value)} required />
                        <TextField label="Duration (minutes)" type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Save</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            {classes.length === 0 ? (
                <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', background: '#fafafa' }}>
                    <LibraryBooksOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography gutterBottom>No classes found.</Typography>
                    <Button variant="contained" onClick={() => setOpenAdd(true)}>Create your first class</Button>
                </Box>
            ) : (
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
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Instructor</TableCell>
                                <TableCell>Duration (min)</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {classes.map(cls => (
                                <TableRow key={cls.id}>
                                    <TableCell>{cls.name}</TableCell>
                                    <TableCell>{cls.description}</TableCell>
                                    <TableCell>{cls.instructor}</TableCell>
                                    <TableCell>{cls.duration_minutes}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => handleEdit(cls)}><EditIcon /></IconButton>
                                        <IconButton onClick={() => handleDelete(cls.id)}><DeleteIcon /></IconButton>
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

const ClassManager = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine active tab based on current route
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/classes/schedules')) {
            return 1;
        }
        return 0; // Classes management
    };
    
    const handleTabChange = (event, newValue) => {
        const routes = [
            '/classes',
            '/classes/schedules'
        ];
        navigate(routes[newValue]);
    };

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Class Management
            </Typography>
            
            <Paper sx={{ mb: 3 }}>
                <Tabs 
                    value={getActiveTab()} 
                    onChange={handleTabChange}
                    aria-label="class management tabs"
                >
                    <Tab 
                        icon={<ClassIcon />} 
                        label="Classes" 
                        sx={{ minHeight: 72 }}
                    />
                    <Tab 
                        icon={<ScheduleIcon />} 
                        label="Schedules" 
                        sx={{ minHeight: 72 }}
                    />
                </Tabs>
            </Paper>

            <Routes>
                <Route path="/" element={<ClassesManagement />} />
                <Route path="/schedules" element={<ScheduleManager />} />
            </Routes>
        </Box>
    );
};

export default ClassManager;
