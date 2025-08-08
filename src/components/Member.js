import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [unpaidMembersThisMonth, setUnpaidMembersThisMonth] = useState([]);
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [filter, setFilter] = useState(queryParams.get('filter') || 'all');
    const [plans, setPlans] = useState([]);
    const [membershipTypes, setMembershipTypes] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('');
    const [membershipPlanId, setMembershipPlanId] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openBiometric, setOpenBiometric] = useState(false);
    const [bioDeviceUserId, setBioDeviceUserId] = useState('');
    const [bioTemplate, setBioTemplate] = useState('');
    const [editingMember, setEditingMember] = useState(null);
    const [openInvoice, setOpenInvoice] = useState(false);
    const [invoicePlanId, setInvoicePlanId] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceDueDate, setInvoiceDueDate] = useState('');
    const [lastCreatedMemberId, setLastCreatedMemberId] = useState(null);

    useEffect(() => {
        fetchMembers();
        fetchPlans();
        fetchMembershipTypes();
        fetchCurrency();
    }, []);

    useEffect(() => {
        const qp = new URLSearchParams(location.search);
        const f = qp.get('filter') || 'all';
        setFilter(f);
        if (f === 'unpaid-this-month') {
            (async () => {
                try {
                    const res = await axios.get('/api/reports/unpaid-members-this-month');
                    setUnpaidMembersThisMonth(res.data || []);
                } catch (e) {
                    console.error('Error fetching unpaid members this month', e);
                    setUnpaidMembersThisMonth([]);
                }
            })();
        }
    }, [location.search]);

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
            if (response.data.length > 0) { setMembershipPlanId(response.data[0].id); }
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const fetchMembershipTypes = async () => {
        try {
            const response = await axios.get('/api/settings');
            const types = response.data.membership_types || [];
            setMembershipTypes(types);
            if (types.length > 0) { setMembershipType(types[0]); }
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
                membership_plan_id: membershipPlanId ? parseInt(membershipPlanId, 10) : null
            };
            const res = await axios.post('/api/members', newMember);
            fetchMembers();
            setName('');
            setEmail('');
            if (membershipTypes.length > 0) { setMembershipType(membershipTypes[0]); }
            if (plans.length > 0) { setMembershipPlanId(plans[0].id); }
            setOpenAdd(false);
            if (res && res.data && res.data.id) {
                setLastCreatedMemberId(res.data.id);
                setInvoicePlanId(membershipPlanId || (plans[0]?.id || ''));
                const selectedPlan = plans.find(p => String(p.id) === String(membershipPlanId)) || plans[0];
                setInvoiceAmount(selectedPlan ? String(selectedPlan.price) : '');
                setInvoiceDueDate(new Date().toISOString().slice(0,10));
                setOpenInvoice(true);
            }
        } catch (error) {
            console.error("Error adding member", error);
        }
    };

    const updateMember = async (e) => {
        e.preventDefault();
        if (!editingMember) {
            return;
        }
        try {
            const body = {
                name,
                email,
                membership_type: membershipType
            };
            await axios.put(`/api/members/${editingMember.id}`, body);
            fetchMembers();
            setOpenEdit(false);
            setEditingMember(null);
        } catch (error) {
            console.error('Error updating member', error);
        }
    };

    const openEditDialog = (member) => {
        setEditingMember(member);
        setName(member.name);
        setEmail(member.email);
        setMembershipType(member.membership_type || '');
        setOpenEdit(true);
    };

    const openBiometricDialog = (member) => {
        setEditingMember(member);
        setOpenBiometric(true);
        setBioDeviceUserId('');
        setBioTemplate('');
    };

    const saveBiometric = async () => {
        if (!editingMember) {
            return;
        }
        try {
            const payload = {};
            if (bioDeviceUserId) { payload.device_user_id = bioDeviceUserId; }
            if (bioTemplate) { payload.template = bioTemplate; }
            await axios.put(`/api/members/${editingMember.id}/biometric`, payload);
            setOpenBiometric(false);
        } catch (e) {
            console.error('Error saving biometric', e);
            alert(e?.response?.data?.message || 'Failed to save biometric');
        }
    };

    const handleCreateInvoice = async () => {
        if (!lastCreatedMemberId) { setOpenInvoice(false); return; }
        try {
            await axios.post('/api/payments/invoice', {
                member_id: lastCreatedMemberId,
                plan_id: invoicePlanId ? parseInt(invoicePlanId,10) : null,
                amount: parseFloat(invoiceAmount),
                due_date: invoiceDueDate
            });
            setOpenInvoice(false);
        } catch (error) {
            console.error('Error creating invoice', error);
        }
    };

    const filteredMembers = useMemo(() => {
        if (filter === 'new-this-month') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);
            return members.filter(m => m.join_date && new Date(m.join_date) >= startOfMonth);
        }
        if (filter === 'unpaid-this-month') {
            const unpaidIds = new Set(unpaidMembersThisMonth.map(m => String(m.id)));
            return members.filter(m => unpaidIds.has(String(m.id)));
        }
        return members;
    }, [members, filter, unpaidMembersThisMonth]);

    return (
        <div>
            <Typography variant="h4" gutterBottom>Members</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Filter</InputLabel>
                    <Select label="Filter" value={filter} onChange={(e)=>setFilter(e.target.value)}>
                        <MenuItem value="all">All Members</MenuItem>
                        <MenuItem value="new-this-month">Joined This Month</MenuItem>
                        <MenuItem value="unpaid-this-month">Unpaid This Month</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => setOpenAdd(true)}>Add Member</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Member</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={addMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
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
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                            <Button type="submit" variant="contained" disabled={plans.length === 0 || membershipTypes.length === 0}>Add Member</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Member</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={updateMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <FormControl fullWidth>
                            <InputLabel>Membership Type</InputLabel>
                            <Select value={membershipType} onChange={(e) => setMembershipType(e.target.value)}>
                                {membershipTypes.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Save</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openInvoice} onClose={() => setOpenInvoice(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create Invoice for New Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Plan</InputLabel>
                            <Select value={invoicePlanId} onChange={(e) => {
                                setInvoicePlanId(e.target.value);
                                const p = plans.find(pl => String(pl.id) === String(e.target.value));
                                if (p) { setInvoiceAmount(String(p.price)); }
                            }}>
                                {plans.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price, currency)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Amount" type="number" value={invoiceAmount} onChange={(e)=>setInvoiceAmount(e.target.value)} />
                        <TextField label="Due Date" type="date" value={invoiceDueDate} onChange={(e)=>setInvoiceDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInvoice(false)}>Skip</Button>
                    <Button onClick={handleCreateInvoice} variant="contained">Create Invoice</Button>
                </DialogActions>
            </Dialog>
            
            <Typography variant="h5" gutterBottom>Current Members</Typography>
            <List>
                {filteredMembers.map(member => (
                    <ListItem key={member.id} divider secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => openEditDialog(member)}>Edit</Button>
                            <Button size="small" onClick={() => openBiometricDialog(member)}>Biometric</Button>
                        </Box>
                    }>
                        <ListItemText
                            primary={member.name}
                            secondary={`${member.email} - ${member.membership_type}`}
                        />
                    </ListItem>
                ))}
            </List>

            <Dialog open={openBiometric} onClose={() => setOpenBiometric(false)} fullWidth maxWidth="sm">
                <DialogTitle>Link Biometric to Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Device User ID (Secureye)" value={bioDeviceUserId} onChange={(e)=>setBioDeviceUserId(e.target.value)} helperText="User ID configured on device (if already enrolled)" />
                        <TextField label="Template (Base64)" value={bioTemplate} onChange={(e)=>setBioTemplate(e.target.value)} multiline minRows={3} placeholder="Paste template string if captured via SDK" />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={()=>setOpenBiometric(false)}>Cancel</Button>
                    <Button variant="contained" onClick={saveBiometric}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Member;
