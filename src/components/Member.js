import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    ListItemAvatar,
    Avatar,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [unpaidMembersThisMonth, setUnpaidMembersThisMonth] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [filter, setFilter] = useState(queryParams.get('filter') || 'all');
    const [plans, setPlans] = useState([]);
    const [name, setName] = useState('');
    
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [birthday, setBirthday] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [membershipPlanId, setMembershipPlanId] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [addError, setAddError] = useState('');
    const [editError, setEditError] = useState('');
    const [openBiometric, setOpenBiometric] = useState(false);
    const [bioDeviceUserId, setBioDeviceUserId] = useState('');
    const [bioSensorMemberId, setBioSensorMemberId] = useState('');
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
            setMembers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching members", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await axios.get('/api/plans');
            const data = Array.isArray(response.data) ? response.data : [];
            setPlans(data);
            if (data.length > 0) { setMembershipPlanId(data[0].id); }
        } catch (error) {
            console.error("Error fetching plans", error);
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
            setAddError('');
            const newMember = { 
                name, 
                phone,
                membership_plan_id: membershipPlanId ? parseInt(membershipPlanId, 10) : null,
                address: address || null,
                birthday: birthday || null,
                photo_url: photoUrl || null
            };
            const res = await axios.post('/api/members', newMember);
            if (res?.data?.id && photoFile) {
                const form = new FormData();
                form.append('photo', photoFile);
                form.append('prefix', `member-${res.data.id}`);
                const up = await axios.post(`/api/members/${res.data.id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setPhotoUrl(up?.data?.photo_url || '');
            }
            fetchMembers();
            setName('');
            setPhone('');
            setAddress('');
            setBirthday('');
            setPhotoFile(null);
            setPhotoUrl('');
            if (plans.length > 0) { setMembershipPlanId(plans[0].id); }
            setOpenAdd(false);
            if (res && res.data && res.data.id) {
                setLastCreatedMemberId(res.data.id);
                setInvoicePlanId(membershipPlanId || (plans[0]?.id || ''));
                const selectedPlan = plans.find(p => String(p.id) === String(membershipPlanId)) || plans[0];
                setInvoiceAmount(selectedPlan ? String(selectedPlan.price) : '');
                
                // Calculate due date based on plan duration from join date
                const joinDate = new Date();
                const dueDate = new Date(joinDate);
                if (selectedPlan && selectedPlan.duration_days) {
                    dueDate.setDate(joinDate.getDate() + parseInt(selectedPlan.duration_days, 10));
                } else {
                    dueDate.setDate(joinDate.getDate() + 30); // Default 30 days
                }
                setInvoiceDueDate(dueDate.toISOString().slice(0,10));
                setOpenInvoice(true);
            }
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to add member. Please check the details and try again.';
            setAddError(msg);
        }
    };

    const updateMember = async (e) => {
        e.preventDefault();
        if (!editingMember) {
            return;
        }
        try {
            setEditError('');
            const body = {
                name,
                phone,
                address: address || null,
                birthday: birthday || null,
                photo_url: photoUrl || null
            };
            await axios.put(`/api/members/${editingMember.id}`, body);
            if (photoFile) {
                const form = new FormData();
                form.append('photo', photoFile);
                form.append('prefix', `member-${editingMember.id}`);
                const up = await axios.post(`/api/members/${editingMember.id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setPhotoUrl(up?.data?.photo_url || '');
            }
            fetchMembers();
            setOpenEdit(false);
            setEditingMember(null);
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to update member. Please check the details and try again.';
            setEditError(msg);
        }
    };

    const openEditDialog = (member) => {
        setEditingMember(member);
        setName(member.name);
        setPhone(member.phone ? String(member.phone) : '');
        setAddress(member.address || '');
        setBirthday(member.birthday || '');
        setPhotoUrl(member.photo_url || '');
        setOpenEdit(true);
    };

    const openBiometricDialog = (member) => {
        setEditingMember(member);
        setOpenBiometric(true);
        setBioDeviceUserId('');
        setBioSensorMemberId('');
        setBioTemplate('');
    };

    const saveBiometric = async () => {
        if (!editingMember) {
            return;
        }
        try {
            const payload = {};
            if (bioDeviceUserId) { payload.device_user_id = bioDeviceUserId; }
            if (bioSensorMemberId) { payload.sensor_member_id = bioSensorMemberId; }
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
            <Typography variant="h4" gutterBottom sx={{ borderBottom: '2px solid var(--accent-secondary-color)', pb: 1 }}>Members</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Filter</InputLabel>
                    <Select label="Filter" value={filter} onChange={(e)=>{
                        const val = e.target.value;
                        setFilter(val);
                        if (val === 'all') { navigate('/members'); } else { navigate(`/members?filter=${val}`); }
                    }}>
                        <MenuItem value="all">All Members</MenuItem>
                        <MenuItem value="new-this-month">Joined This Month</MenuItem>
                        <MenuItem value="unpaid-this-month">Unpaid This Month</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => {
                    setEditingMember(null);
                    setName('');
                    setPhone('');
                    setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                    setOpenAdd(true);
                }}>Add Member</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Member</DialogTitle>
                <DialogContent>
                    {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
                    <Box component="form" onSubmit={addMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <TextField
                            label="Phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            inputProps={{ pattern: "^\\+?[0-9]{10,15}$" }}
                            helperText="10–15 digits, optional leading +"
                        />
                        <TextField label="Address" value={address} onChange={(e)=>setAddress(e.target.value)} multiline minRows={2} />
                        <TextField label="Birthday" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Button variant="outlined" component="label">
                                Upload Photo
                                <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; if (f) { setPhotoFile(f); try { setPhotoUrl(URL.createObjectURL(f)); } catch (_) {} } }} />
                            </Button>
                            {photoUrl && <Button color="error" onClick={()=>{ setPhotoFile(null); setPhotoUrl(''); }}>Remove</Button>}
                        </Box>
                        
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
                            <Button type="submit" variant="contained" disabled={plans.length === 0}>Add Member</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Member</DialogTitle>
                <DialogContent>
                    {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
                    <Box component="form" onSubmit={updateMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputProps={{ pattern: "^\\+?[0-9]{10,15}$" }} helperText="10–15 digits, optional leading +" />
                        <TextField label="Address" value={address} onChange={(e)=>setAddress(e.target.value)} multiline minRows={2} />
                        <TextField label="Birthday" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Button variant="outlined" component="label">
                                Upload Photo
                                <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; if (f) { setPhotoFile(f); try { setPhotoUrl(URL.createObjectURL(f)); } catch (_) {} } }} />
                            </Button>
                            {photoUrl && <Button color="error" onClick={()=>{ setPhotoFile(null); setPhotoUrl(''); }}>Remove</Button>}
                        </Box>
                        
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
            {members.length === 0 ? (
                <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', background: '#fafafa' }}>
                    <GroupAddOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography gutterBottom>No members found.</Typography>
                    <Button variant="contained" onClick={() => setOpenAdd(true)}>Add your first member</Button>
                </Box>
            ) : (
                <>
                    {filteredMembers.length === 0 ? (
                        <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', background: '#fafafa' }}>
                            <FilterAltOffOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                            <Typography>No members match the selected filter.</Typography>
                        </Box>
                    ) : (
                        <List>
                            {filteredMembers.map(member => {
                                const isBirthdayToday = Boolean(member.birthday) && member.birthday.slice(5,10) === new Date().toISOString().slice(5,10);
                                const whatsappHref = member.phone ? `https://wa.me/${encodeURIComponent(member.phone.replace(/\D/g,''))}?text=${encodeURIComponent(`Happy Birthday, ${member.name}! 🎉🎂 Wishing you a fantastic year ahead from ${currency} Gym!`)}` : null;
                                const toggleActive = async () => {
                                    try {
                                        const newVal = String(member.is_active) === '0' ? 1 : 0;
                                        await axios.put(`/api/members/${member.id}/status`, { is_active: newVal });
                                        fetchMembers();
                                    } catch (e) {
                                        console.error('Failed to update status', e);
                                    }
                                };
                                return (
                                    <ListItem key={member.id} divider secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            {whatsappHref && (
                                                <Button size="small" href={whatsappHref} target="_blank" rel="noreferrer" startIcon={<WhatsAppIcon />}>
                                                    Wish on WhatsApp
                                                </Button>
                                            )}
                                            <Button size="small" color={String(member.is_active) === '0' ? 'success' : 'warning'} onClick={toggleActive}>
                                                {String(member.is_active) === '0' ? 'Activate' : 'Deactivate'}
                                            </Button>
                                            <Button size="small" onClick={() => openEditDialog(member)}>Edit</Button>
                                            <Button size="small" onClick={() => openBiometricDialog(member)}>Biometric</Button>
                                        </Box>
                                    }>
                                        <ListItemAvatar>
                                            <Avatar 
                                                src={member.photo_url || undefined}
                                                sx={{ 
                                                    width: 48, 
                                                    height: 48,
                                                    bgcolor: String(member.is_active) === '0' ? 'grey.400' : 'primary.main'
                                                }}
                                            >
                                                {!member.photo_url && (member.name || '').slice(0, 2).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<span>{member.name} {isBirthdayToday ? '🎂' : ''} {String(member.is_active) === '0' ? '(Deactivated)' : ''}</span>}
                                            secondary={<span>{member.phone || ''}{member.birthday ? ` • Birthday: ${member.birthday}` : ''}</span>}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </>
            )}

            <Dialog open={openBiometric} onClose={() => setOpenBiometric(false)} fullWidth maxWidth="sm">
                <DialogTitle>Link Biometric to Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Device User ID (Secureye)" value={bioDeviceUserId} onChange={(e)=>setBioDeviceUserId(e.target.value)} helperText="User ID configured on device (if already enrolled)" />
                        <TextField label="Sensor Member ID" value={bioSensorMemberId} onChange={(e)=>setBioSensorMemberId(e.target.value)} helperText="Member ID sent by the biometric sensor (if different from device user ID)" />
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
