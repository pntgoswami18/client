import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';
import { formatDateToLocalString } from '../utils/formatting';
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
    Alert,
    FormControlLabel,
    Checkbox,
    Chip
} from '@mui/material';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import CrownIcon from '@mui/icons-material/Star';
import StarIcon from '@mui/icons-material/Star';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [unpaidMembersThisMonth, setUnpaidMembersThisMonth] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [filter, setFilter] = useState(queryParams.get('filter') || 'all');
    const [searchTerm, setSearchTerm] = useState('');
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
    const [editingMember, setEditingMember] = useState(null);
    const [openInvoice, setOpenInvoice] = useState(false);
    const [invoicePlanId, setInvoicePlanId] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceDueDate, setInvoiceDueDate] = useState('');
    const [lastCreatedMemberId, setLastCreatedMemberId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Webcam functionality
    const [cameraOpen, setCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    // New state for biometric data
    const [memberBiometricStatus, setMemberBiometricStatus] = useState(null);
    const [biometricLoading, setBiometricLoading] = useState(false);
    const [biometricError, setBiometricError] = useState('');
    const [biometricSuccess, setBiometricSuccess] = useState('');

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
                photo_url: photoUrl || null,
                is_admin: isAdmin
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
                setInvoiceDueDate(formatDateToLocalString(dueDate));
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
                photo_url: photoUrl || null,
                is_admin: isAdmin,
                membership_plan_id: isAdmin ? null : (membershipPlanId ? parseInt(membershipPlanId, 10) : null)
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
        setIsAdmin(member.is_admin === 1);
        setMembershipPlanId(member.membership_plan_id ? String(member.membership_plan_id) : '');
        setOpenEdit(true);
    };

    const openBiometricDialog = async (member) => {
        setEditingMember(member);
        setOpenBiometric(true);
        setMemberBiometricStatus(null);
        setBiometricError('');
        setBiometricSuccess('');
        
        // Fetch member's biometric status
        try {
            setBiometricLoading(true);
            const response = await axios.get(`/api/biometric/members/${member.id}/status`);
            if (response.data.success) {
                setMemberBiometricStatus(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching biometric status:', error);
            setBiometricError('Failed to fetch biometric status');
        } finally {
            setBiometricLoading(false);
        }
    };

    const startEnrollment = async () => {
        if (!editingMember) return;
        
        try {
            setBiometricLoading(true);
            setBiometricError('');
            setBiometricSuccess('');
            
            const response = await axios.post(`/api/biometric/members/${editingMember.id}/enroll`);
            if (response.data.success) {
                setBiometricSuccess('Enrollment started successfully. Please ask the member to place their finger on the biometric device.');
                // Refresh biometric status
                openBiometricDialog(editingMember);
            }
        } catch (error) {
            console.error('Error starting enrollment:', error);
            setBiometricError(error?.response?.data?.message || 'Failed to start enrollment');
        } finally {
            setBiometricLoading(false);
        }
    };

    const deleteEnrollment = async () => {
        if (!editingMember) return;
        
        if (!window.confirm(`Are you sure you want to delete the biometric enrollment for ${editingMember.name}?`)) {
            return;
        }
        
        try {
            setBiometricLoading(true);
            setBiometricError('');
            setBiometricSuccess('');
            
            const response = await axios.delete(`/api/biometric/members/${editingMember.id}/biometric`);
            if (response.data.success) {
                setBiometricSuccess('Biometric enrollment deleted successfully. The member can now be re-enrolled.');
                // Refresh biometric status
                openBiometricDialog(editingMember);
            }
        } catch (error) {
            console.error('Error deleting enrollment:', error);
            setBiometricError(error?.response?.data?.message || 'Failed to delete enrollment');
        } finally {
            setBiometricLoading(false);
        }
    };

    const reEnroll = async () => {
        if (!editingMember) return;
        
        try {
            setBiometricLoading(true);
            setBiometricError('');
            setBiometricSuccess('');
            
            // First delete existing enrollment
            const deleteResponse = await axios.delete(`/api/biometric/members/${editingMember.id}/biometric`);
            if (deleteResponse.data.success) {
                // Then start new enrollment
                const enrollResponse = await axios.post(`/api/biometric/members/${editingMember.id}/enroll`);
                if (enrollResponse.data.success) {
                    setBiometricSuccess('Re-enrollment started successfully. Please ask the member to place their finger on the biometric device.');
                    // Refresh biometric status
                    openBiometricDialog(editingMember);
                }
            }
        } catch (error) {
            console.error('Error starting re-enrollment:', error);
            setBiometricError(error?.response?.data?.message || 'Failed to start re-enrollment');
        } finally {
            setBiometricLoading(false);
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

    // Webcam functions
    const openCamera = async () => {
        try {
            setCameraLoading(true);
            setCameraError('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user' // Use front camera
                }
            });
            setStream(mediaStream);
            setCameraOpen(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            setCameraError('Unable to access camera. Please check camera permissions.');
            alert('Unable to access camera. Please check camera permissions.');
        } finally {
            setCameraLoading(false);
        }
    };

    // Set video stream when camera opens
    useEffect(() => {
        if (cameraOpen && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [cameraOpen, stream]);

    const closeCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraOpen(false);
        setCapturedImage(null);
        setCameraLoading(false);
        setCameraError('');
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageDataUrl);

            // Convert to file
            canvas.toBlob((blob) => {
                const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
                setPhotoFile(file);
                setPhotoUrl(imageDataUrl);
            }, 'image/jpeg', 0.8);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setPhotoFile(null);
        setPhotoUrl('');
        // Restart camera stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        openCamera();
    };

    const filteredMembers = useMemo(() => {
        let filtered = members;

        // Apply category filter first
        if (filter === 'new-this-month') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);
            filtered = filtered.filter(m => m.join_date && new Date(m.join_date) >= startOfMonth);
        } else if (filter === 'unpaid-this-month') {
            const unpaidIds = new Set(unpaidMembersThisMonth.map(m => String(m.id)));
            filtered = filtered.filter(m => unpaidIds.has(String(m.id)) && m.is_admin !== 1);
        } else if (filter === 'admins') {
            filtered = filtered.filter(m => m.is_admin === 1);
        } else if (filter === 'members') {
            filtered = filtered.filter(m => m.is_admin !== 1);
        }

        // Apply keyword search
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(member => {
                const nameMatch = member.name && member.name.toLowerCase().includes(searchLower);
                const phoneMatch = member.phone && member.phone.toLowerCase().includes(searchLower);
                return nameMatch || phoneMatch;
            });
        }

        return filtered;
    }, [members, filter, unpaidMembersThisMonth, searchTerm]);

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
                        <MenuItem value="admins">Admins</MenuItem>
                        <MenuItem value="members">Regular Members</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    size="small"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: 250 }}
                    InputProps={{
                        startAdornment: (
                            <Box sx={{ mr: 1, color: 'text.secondary' }}>🔍</Box>
                        ),
                    }}
                />
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => {
                    setEditingMember(null);
                    setName('');
                    setPhone('');
                    setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                    setIsAdmin(false);
                    setOpenAdd(true);
                }}>Add Member</Button>
            </Box>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Member</DialogTitle>
                <DialogContent sx={{
                    ...(isAdmin && {
                        background: 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)',
                        border: '2px solid #ffd700',
                        borderRadius: 1
                    })
                }}>
                    {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
                    <Box component="form" onSubmit={addMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                fullWidth
                            />
                            {isAdmin && (
                                <StarIcon 
                                    sx={{ 
                                        color: '#ffd700', 
                                        fontSize: 24,
                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                    }} 
                                />
                            )}
                        </Box>
                        <TextField
                            label="Phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            inputProps={{ pattern: "^\\+?[0-9]{10,15}$" }}
                            helperText="10–15 digits, optional leading +"
                        />
                        
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                />
                            }
                            label="Admin User (can enter multiple times per day)"
                        />
                        
                        <TextField label="Address" value={address} onChange={(e)=>setAddress(e.target.value)} multiline minRows={2} />
                        <TextField label="Birthday" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button variant="outlined" component="label" size="small">
                                    Upload Photo
                                    <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; if (f) { setPhotoFile(f); try { setPhotoUrl(URL.createObjectURL(f)); } catch (_) {} } }} />
                                </Button>
                                <Button variant="outlined" size="small" onClick={openCamera} startIcon="📷">
                                    Take Photo
                                </Button>
                                {photoUrl && <Button color="error" size="small" onClick={()=>{ setPhotoFile(null); setPhotoUrl(''); }}>Remove</Button>}
                            </Box>
                        </Box>

                        <FormControl fullWidth required disabled={plans.length === 0 || isAdmin}>
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
                            {isAdmin && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Admin users are exempt from membership plans
                                </Typography>
                            )}
                        </FormControl>
                        
                        {isAdmin && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', p: 1, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #ffd700' }}>
                                ⭐ Admin users are exempt from payments and membership plans
                            </Typography>
                        )}
                        
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                            <Button type="submit" variant="contained" disabled={plans.length === 0 && !isAdmin}>Add Member</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Member</DialogTitle>
                <DialogContent sx={{
                    ...(isAdmin && {
                        background: 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)',
                        border: '2px solid #ffd700',
                        borderRadius: 1
                    })
                }}>
                    {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
                    <Box component="form" onSubmit={updateMember} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                fullWidth
                            />
                            {isAdmin && (
                                <StarIcon 
                                    sx={{ 
                                        color: '#ffd700', 
                                        fontSize: 24,
                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                    }} 
                                />
                            )}
                        </Box>
                        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputProps={{ pattern: "^\\+?[0-9]{10,15}$" }} helperText="10–15 digits, optional leading +" />
                        
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                />
                            }
                            label="Admin User (can enter multiple times per day)"
                        />
                        
                        {isAdmin && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', p: 1, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #ffd700' }}>
                                ⭐ Admin users are exempt from payments and membership plans
                            </Typography>
                        )}
                        
                        {editingMember && editingMember.is_admin !== 1 && isAdmin && (
                            <Typography variant="caption" color="warning.main" sx={{ textAlign: 'center', p: 1, bgcolor: '#fff3cd', borderRadius: 1, border: '1px solid #ff9800' }}>
                                ⚠️ Changing this member to admin will remove their current membership plan
                            </Typography>
                        )}
                        
                        {editingMember && editingMember.is_admin === 1 && !isAdmin && (
                            <Typography variant="caption" color="info.main" sx={{ textAlign: 'center', p: 1, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                                ℹ️ Changing this member from admin to regular member will allow them to select a membership plan
                            </Typography>
                        )}
                        
                        <FormControl fullWidth required disabled={plans.length === 0 || isAdmin}>
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
                            {isAdmin && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Admin users are exempt from membership plans
                                </Typography>
                                )}
                        </FormControl>
                        
                        <TextField label="Address" value={address} onChange={(e)=>setAddress(e.target.value)} multiline minRows={2} />
                        <TextField label="Birthday" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button variant="outlined" component="label" size="small">
                                    Upload Photo
                                    <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; if (f) { setPhotoFile(f); try { setPhotoUrl(URL.createObjectURL(f)); } catch (_) {} } }} />
                                </Button>
                                <Button variant="outlined" size="small" onClick={openCamera} startIcon="📷">
                                    Take Photo
                                </Button>
                                {photoUrl && <Button color="error" size="small" onClick={()=>{ setPhotoFile(null); setPhotoUrl(''); }}>Remove</Button>}
                            </Box>
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
                                const today = new Date();
                                const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
                                const todayDay = String(today.getDate()).padStart(2, '0');
                                const isBirthdayToday = Boolean(member.birthday) && member.birthday.slice(5,10) === `${todayMonth}-${todayDay}`;
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
                                    <ListItem 
                                        key={member.id} 
                                        divider 
                                        sx={{
                                            background: member.is_admin === 1 ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)' : 'transparent',
                                            border: member.is_admin === 1 ? '2px solid #ffd700' : 'none',
                                            borderRadius: member.is_admin === 1 ? 2 : 0,
                                            mb: member.is_admin === 1 ? 1 : 0
                                        }}
                                        secondaryAction={
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
                                            <Button size="small" onClick={() => openBiometricDialog(member)}>Biometric Data</Button>
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
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <span>{member.name}</span>
                                                    {member.is_admin === 1 && (
                                                        <CrownIcon 
                                                            sx={{ 
                                                                color: '#ffd700', 
                                                                fontSize: 20,
                                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                                            }} 
                                                        />
                                                    )}
                                                    {isBirthdayToday && '🎂'}
                                                    {String(member.is_active) === '0' && '(Deactivated)'}
                                                </Box>
                                            }
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
                <DialogTitle>
                    Biometric data for {editingMember?.name || 'Member'}
                </DialogTitle>
                <DialogContent>
                    {biometricLoading && (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography>Loading biometric status...</Typography>
                        </Box>
                    )}
                    
                    {biometricError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {biometricError}
                        </Alert>
                    )}
                    
                    {biometricSuccess && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {biometricSuccess}
                        </Alert>
                    )}
                    
                    {!biometricLoading && memberBiometricStatus && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                            {/* Biometric Status Display */}
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Enrollment Status
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {memberBiometricStatus.hasFingerprint ? (
                                        <Chip 
                                            icon={<FingerprintIcon />} 
                                            label="Enrolled" 
                                            color="success" 
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Chip 
                                            icon={<FingerprintIcon />} 
                                            label="Not Enrolled" 
                                            color="default" 
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            </Box>
                            
                            {/* Biometric Member ID Field */}
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Biometric Member ID
                                </Typography>
                                <TextField
                                    fullWidth
                                    value={memberBiometricStatus.biometricId || 'Not assigned'}
                                    InputProps={{
                                        readOnly: true,
                                        sx: { 
                                            backgroundColor: memberBiometricStatus.biometricId ? '#f5f5f5' : '#fff3cd',
                                            '& .MuiInputBase-input': { 
                                                color: memberBiometricStatus.biometricId ? 'text.primary' : 'text.secondary'
                                            }
                                        }
                                    }}
                                    helperText={
                                        memberBiometricStatus.biometricId 
                                            ? "This ID is automatically assigned when the member is biometrically enrolled"
                                            : "This field will show the biometric member ID once enrollment is completed"
                                    }
                                />
                            </Box>
                            
                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {!memberBiometricStatus.hasFingerprint ? (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={startEnrollment}
                                        disabled={biometricLoading}
                                        startIcon={<FingerprintIcon />}
                                        sx={{ py: 1.5 }}
                                    >
                                        Enroll Fingerprints
                                    </Button>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="error"
                                            onClick={deleteEnrollment}
                                            disabled={biometricLoading}
                                            startIcon={<DeleteIcon />}
                                            sx={{ py: 1.5 }}
                                        >
                                            Delete Enrollment
                                        </Button>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={reEnroll}
                                            disabled={biometricLoading}
                                            startIcon={<RefreshIcon />}
                                            sx={{ py: 1.5 }}
                                        >
                                            Re-enroll Now
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenBiometric(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Camera Dialog */}
            <Dialog open={cameraOpen} onClose={closeCamera} fullWidth maxWidth="md">
                <DialogTitle>Take Member Photo</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        {cameraLoading ? (
                            <Box sx={{ 
                                width: '100%', 
                                maxWidth: '400px', 
                                height: '300px',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '8px',
                                border: '2px solid #ddd',
                                backgroundColor: '#f5f5f5'
                            }}>
                                <Typography>Loading camera...</Typography>
                            </Box>
                        ) : cameraError ? (
                            <Box sx={{ 
                                width: '100%', 
                                maxWidth: '400px', 
                                height: '300px',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '8px',
                                border: '2px solid #ddd',
                                backgroundColor: '#f5f5f5',
                                flexDirection: 'column',
                                gap: 1
                            }}>
                                <Typography color="error">{cameraError}</Typography>
                                <Button variant="outlined" onClick={openCamera}>Retry</Button>
                            </Box>
                        ) : !capturedImage ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={() => {
                                        if (videoRef.current) {
                                            videoRef.current.play().catch(e => 
                                                console.error('Error playing video:', e)
                                            );
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        borderRadius: '8px',
                                        border: '2px solid #ddd',
                                        backgroundColor: '#f5f5f5'
                                    }}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button variant="contained" onClick={capturePhoto} startIcon="📸">
                                        Capture Photo
                                    </Button>
                                    <Button variant="outlined" onClick={closeCamera}>
                                        Cancel
                                    </Button>
                                </Box>
                            </>
                        ) : (
                            <>
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        borderRadius: '8px',
                                        border: '2px solid #ddd'
                                    }}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button variant="contained" onClick={() => {
                                        closeCamera();
                                        if (editingMember) {
                                            setOpenEdit(true);
                                        } else {
                                            setOpenAdd(true);
                                        }
                                    }}>
                                        Use This Photo
                                    </Button>
                                    <Button variant="outlined" onClick={retakePhoto}>
                                        Retake
                                    </Button>
                                    <Button variant="outlined" onClick={closeCamera}>
                                        Cancel
                                    </Button>
                                </Box>
                            </>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </Box>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Member;
