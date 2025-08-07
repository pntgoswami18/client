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
    IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ClassManager = () => {
    const [classes, setClasses] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instructor, setInstructor] = useState('');
    const [duration, setDuration] = useState('');
    const [editingClass, setEditingClass] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

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
        const classData = { name, description, instructor, duration_minutes: parseInt(duration) };

        try {
            if (editingClass) {
                await axios.put(`/api/classes/${editingClass.id}`, classData);
            } else {
                await axios.post('/api/classes', classData);
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
            <Typography variant="h4" gutterBottom>Class Management</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                <TextField label="Class Name" value={name} onChange={e => setName(e.target.value)} required />
                <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline rows={3} />
                <TextField label="Instructor" value={instructor} onChange={e => setInstructor(e.target.value)} required />
                <TextField label="Duration (minutes)" type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                <Box sx={{ display: 'flex', gap: '1rem' }}>
                    <Button type="submit" variant="contained">{editingClass ? 'Update Class' : 'Add Class'}</Button>
                    {editingClass && <Button variant="outlined" onClick={resetForm}>Cancel</Button>}
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
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
        </div>
    );
};

export default ClassManager;
