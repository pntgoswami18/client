import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
            <h2>Class Management</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Class Name" required />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"></textarea>
                <input type="text" value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Instructor" required />
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (minutes)" required />
                <button type="submit">{editingClass ? 'Update Class' : 'Add Class'}</button>
                {editingClass && <button type="button" onClick={resetForm}>Cancel Edit</button>}
            </form>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Instructor</th>
                        <th>Duration</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {classes.map(cls => (
                        <tr key={cls.id}>
                            <td>{cls.name}</td>
                            <td>{cls.description}</td>
                            <td>{cls.instructor}</td>
                            <td>{cls.duration_minutes}</td>
                            <td>
                                <button onClick={() => handleEdit(cls)}>Edit</button>
                                <button onClick={() => handleDelete(cls.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ClassManager;
