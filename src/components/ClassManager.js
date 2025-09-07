import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FormShimmer } from './ShimmerLoader';
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
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem
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
    const [adminMembers, setAdminMembers] = useState([]);
    const [loadingAdminMembers, setLoadingAdminMembers] = useState(false);

    useEffect(() => {
        fetchClasses();
        fetchAdminMembers();
    }, []);

    const fetchClasses = async () => {
        try {
            const response = await axios.get('/api/classes');
            setClasses(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching classes", error);
        }
    };

    const fetchAdminMembers = async () => {
        try {
            setLoadingAdminMembers(true);
            const response = await axios.get('/api/classes/instructors');
            setAdminMembers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching admin instructors", error);
        } finally {
            setLoadingAdminMembers(false);
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
        setInstructor(adminMembers.length > 0 ? adminMembers[0].name : '');
        setDuration('');
    };

    return (
        <div>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 <strong>Note:</strong> Only admin members can be assigned as class instructors
                </Typography>
                <Button variant="contained" onClick={() => {
                    resetForm();
                    setOpenAdd(true);
                }}>Add Class</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Class</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Class Name" value={name} onChange={e => setName(e.target.value)} required />
                        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline rows={3} />
                        <FormControl fullWidth required>
                            <InputLabel>Instructor</InputLabel>
                            <Select value={instructor} onChange={e => setInstructor(e.target.value)} label="Instructor" disabled={loadingAdminMembers}>
                                {loadingAdminMembers ? (
                                    <MenuItem disabled><FormShimmer /></MenuItem>
                                ) : adminMembers.length > 0 ? (
                                    adminMembers.map(member => (
                                        <MenuItem key={member.id} value={member.name}>
                                            {member.name} {member.is_admin === 1 && '⭐'}
                                        </MenuItem>
                                    ))
                                ) : (
                                    <MenuItem disabled>No admin members available</MenuItem>
                                )}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Only admin members can be assigned as instructors
                            </Typography>
                        </FormControl>
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
                        <FormControl fullWidth required>
                            <InputLabel>Instructor</InputLabel>
                            <Select value={instructor} onChange={e => setInstructor(e.target.value)} label="Instructor" disabled={loadingAdminMembers}>
                                {loadingAdminMembers ? (
                                    <MenuItem disabled><FormShimmer /></MenuItem>
                                ) : adminMembers.length > 0 ? (
                                    adminMembers.map(member => (
                                        <MenuItem key={member.id} value={member.name}>
                                            {member.name} {member.is_admin === 1 && '⭐'}
                                        </MenuItem>
                                    ))
                                ) : (
                                    <MenuItem disabled>No admin members available</MenuItem>
                                )}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Only admin members can be assigned as instructors
                            </Typography>
                        </FormControl>
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
                                    <TableCell>
                                        {cls.instructor}
                                        {adminMembers.some(m => m.name === cls.instructor && m.is_admin === 1) && ' ⭐'}
                                    </TableCell>
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
