import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';
import {
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    List,
    ListItem,
    ListItemText,
    Typography
} from '@mui/material';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [membershipTypes, setMembershipTypes] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('');
    const [membershipPlanId, setMembershipPlanId] = useState('');
    const [currency, setCurrency] = useState('INR');

    useEffect(() => {
        fetchMembers();
        fetchPlans();
        fetchMembershipTypes();
        fetchCurrency();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await axios.get('/api/members');
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await axios.get('/api/plans');
            setPlans(response.data);
            if (response.data.length > 0) {
                setMembershipPlanId(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const fetchMembershipTypes = async () => {
        try {
            const response = await axios.get('/api/settings');
            const types = response.data.membership_types || [];
            setMembershipTypes(types);
            if (types.length > 0) {
                setMembershipType(types[0]);
            }
        } catch (error) {
            console.error("Error fetching membership types", error);
        }
    };

    const fetchCurrency = async () => {
        try {
            const response = await axios.get('/api/settings');
            const currentCurrency = response.data.currency || 'INR';
            setCurrency(currentCurrency);
        } catch (error) {
            console.error("Error fetching currency", error);
        }
    };

    const addMember = async (e) => {
        e.preventDefault();
        try {
            const newMember = { 
                name, 
                email, 
                membership_type: membershipType,
                membership_plan_id: membershipPlanId || null
            };
            await axios.post('/api/members', newMember);
            fetchMembers();
            setName('');
            setEmail('');
            if (membershipTypes.length > 0) {
                setMembershipType(membershipTypes[0]);
            }
            if (plans.length > 0) {
                setMembershipPlanId(plans[0].id);
            }
        } catch (error) {
            console.error("Error adding member", error);
        }
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>Members</Typography>
            <Box component="form" onSubmit={addMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <FormControl fullWidth required disabled={membershipTypes.length === 0}>
                    <InputLabel>Membership Type</InputLabel>
                    <Select value={membershipType} onChange={(e) => setMembershipType(e.target.value)}>
                        {membershipTypes.length > 0 ? (
                            membershipTypes.map(type => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Please create a membership type first</MenuItem>
                        )}
                    </Select>
                </FormControl>
                <FormControl fullWidth required disabled={plans.length === 0}>
                    <InputLabel>Membership Plan</InputLabel>
                    <Select value={membershipPlanId} onChange={(e) => setMembershipPlanId(e.target.value)}>
                        {plans.length > 0 ? (
                            plans.map(plan => (
                                <MenuItem key={plan.id} value={plan.id}>
                                    {plan.name} - {formatCurrency(plan.price, currency)}
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Please create a membership plan first</MenuItem>
                        )}
                    </Select>
                </FormControl>
                <Button type="submit" variant="contained" disabled={plans.length === 0 || membershipTypes.length === 0}>Add Member</Button>
            </Box>
            <Typography variant="h5" gutterBottom>Current Members</Typography>
            <List>
                {members.map(member => (
                    <ListItem key={member.id} divider>
                        <ListItemText 
                            primary={member.name}
                            secondary={`${member.email} - ${member.membership_type}`}
                        />
                    </ListItem>
                ))}
            </List>
        </div>
    );
};

export default Member;
