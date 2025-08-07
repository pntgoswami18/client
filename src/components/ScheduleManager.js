import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
            <h2>Schedule Management</h2>
            
            <div style={{ marginBottom: '30px' }}>
                <h3>Create New Schedule</h3>
                <form onSubmit={handleSubmit}>
                    <select value={classId} onChange={e => setClassId(e.target.value)} required>
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name} - {cls.instructor}</option>
                        ))}
                    </select>
                    
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        placeholder="Start Time"
                        required
                    />
                    
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        placeholder="End Time"
                        required
                    />
                    
                    <input
                        type="number"
                        value={maxCapacity}
                        onChange={e => setMaxCapacity(e.target.value)}
                        placeholder="Max Capacity"
                        min="1"
                        required
                    />
                    
                    <button type="submit">Create Schedule</button>
                </form>
            </div>

            <div>
                <h3>Scheduled Classes</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Instructor</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Capacity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map(schedule => (
                            <tr key={schedule.id}>
                                <td>{schedule.class_name}</td>
                                <td>{schedule.instructor}</td>
                                <td>{formatDateTime(schedule.start_time)}</td>
                                <td>{formatDateTime(schedule.end_time)}</td>
                                <td>{schedule.max_capacity}</td>
                                <td>
                                    <button onClick={() => handleDelete(schedule.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {schedules.length === 0 && <p>No schedules found. Create one above.</p>}
            </div>
        </div>
    );
};

export default ScheduleManager;