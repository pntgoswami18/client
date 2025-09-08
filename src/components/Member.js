
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';
import { formatDateToLocalString } from '../utils/formatting';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Avatar,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    FormControlLabel,
    Checkbox,
    Chip,
    Pagination,
    CircularProgress,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton
} from '@mui/material';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CrownIcon from '@mui/icons-material/Star';
import StarIcon from '@mui/icons-material/Star';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PhoneIcon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import SearchableMemberDropdown from './SearchableMemberDropdown';
import { FormShimmer, CameraShimmer } from './ShimmerLoader';

const Member = () => {
    // Add CSS animation for pulsing effect
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.3; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const [members, setMembers] = useState([]);
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [filter, setFilter] = useState(queryParams.get('filter') || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [plans, setPlans] = useState([]);
    const [name, setName] = useState('');
    
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [birthday, setBirthday] = useState('');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [referralMemberId, setReferralMemberId] = useState('');
    const [referralSystemEnabled, setReferralSystemEnabled] = useState(false);
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
    const [openMemberDetails, setOpenMemberDetails] = useState(false);
    const [memberDetails, setMemberDetails] = useState(null);
    const [memberDetailsLoading, setMemberDetailsLoading] = useState(false);
    const [currentViewingMember, setCurrentViewingMember] = useState(null);
    const [invoicePlanId, setInvoicePlanId] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceDueDate, setInvoiceDueDate] = useState('');
    const [lastCreatedMemberId, setLastCreatedMemberId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [calculatedDueDate, setCalculatedDueDate] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [paginationMeta, setPaginationMeta] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    // Webcam functionality
    const [cameraOpen, setCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Photo cropping functionality
    const [cropOpen, setCropOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
    });
    const [croppedImageUrl, setCroppedImageUrl] = useState(null);
    const cropImageRef = useRef(null);

    
    // New state for biometric data
    const [memberBiometricStatus, setMemberBiometricStatus] = useState(null);
    // Individual biometric button loading states
    const [biometricButtonLoading, setBiometricButtonLoading] = useState({
        delete: false,
        reenroll: false,
        enroll: false,
        cancel: false
    });
    const [biometricDataLoading, setBiometricDataLoading] = useState(false);
    const [biometricError, setBiometricError] = useState('');
    const [biometricSuccess, setBiometricSuccess] = useState('');
    
    // WebSocket and enrollment tracking state
    const [wsConnected, setWsConnected] = useState(false);
    const [ongoingEnrollment, setOngoingEnrollment] = useState(null); // { memberId, memberName, startTime }
    const wsRef = useRef(null);

    // Pagination handlers
    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchMembers(page, itemsPerPage, searchTerm, filter);
    };


    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        setCurrentPage(1);
        fetchMembers(1, itemsPerPage, newSearchTerm, filter);
    };

    const handleFilterChange = (event) => {
        const newFilter = event.target.value;
        setFilter(newFilter);
        setCurrentPage(1);
        fetchMembers(1, itemsPerPage, searchTerm, newFilter);
    };

    const fetchMembers = useCallback(async (page = currentPage, limit = itemsPerPage, search = searchTerm, filterType = filter) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search || '',
                filter: filterType || 'all'
            });
            const response = await axios.get(`/api/members?${params}`);
            const { members, pagination } = response.data;
            setMembers(Array.isArray(members) ? members : []);
            setPaginationMeta(pagination || { total: 0, page: 1, limit: 10, totalPages: 0 });
        } catch (error) {
            console.error("Error fetching members", error);
            setMembers([]);
        }
    }, [currentPage, itemsPerPage, searchTerm, filter]);

    useEffect(() => {
        fetchMembers();
        fetchPlans();
        fetchCurrency();
    }, [fetchMembers]);

    const calculateDueDate = useCallback(() => {
        if (!joinDate || !membershipPlanId || isAdmin) {
            setCalculatedDueDate('');
            setDueDate('');
            return;
        }

        const selectedPlan = plans.find(p => String(p.id) === String(membershipPlanId));
        if (!selectedPlan || !selectedPlan.duration_days) {
            setCalculatedDueDate('');
            setDueDate('');
            return;
        }

        const joinDateObj = new Date(joinDate);
        const calculatedDueDate = new Date(joinDateObj);
        
        if (selectedPlan.duration_days === 30) {
            // For monthly plans, use normalized month calculation
            const dayOfMonth = joinDateObj.getDate();
            calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 1);
            calculatedDueDate.setDate(dayOfMonth);
        } else {
            // For other durations, use simple day addition
            calculatedDueDate.setDate(calculatedDueDate.getDate() + parseInt(selectedPlan.duration_days, 10));
        }
        
        const formattedDueDate = formatDateToLocalString(calculatedDueDate);
        setCalculatedDueDate(formattedDueDate);
        setDueDate(formattedDueDate);
    }, [joinDate, membershipPlanId, isAdmin, plans]);

    useEffect(() => {
        calculateDueDate();
    }, [calculateDueDate]);

    // Handle WebSocket enrollment messages
    const handleEnrollmentWebSocketMessage = useCallback((data) => {
        console.log('📡 Handling enrollment WebSocket message:', data);
        
        if (data.type === 'enrollment_started') {
            setBiometricSuccess(`📱 Enrollment started for ${data.memberName}. Please place your finger on the biometric device.`);
            setOngoingEnrollment({
                memberId: data.memberId,
                memberName: data.memberName,
                startTime: new Date().toISOString()
            });
            console.log('✅ Enrollment started for member:', data.memberName);
        } else if (data.type === 'enrollment_progress') {
            if (data.status === 'progress') {
                // Map enrollment steps to user-friendly messages
                const stepMessages = {
                    'scanning_first_finger': `👆 ${data.memberName}, please place your finger on the biometric device for the first scan`,
                    'first_finger_captured': `✅ First fingerprint captured successfully! Please remove your finger`,
                    'remove_finger': `👆 Please remove your finger from the device`,
                    'scanning_second_finger': `👆 ${data.memberName}, please place your finger on the biometric device again for the second scan`,
                    'second_finger_captured': `✅ Second fingerprint captured successfully!`,
                    'creating_model': `🔄 Creating your biometric model from both fingerprints...`,
                    'prints_matched': `✅ Fingerprints matched! Creating your biometric profile...`,
                    'storing_model': `💾 Saving your biometric data to the device...`,
                    'model_stored': `✅ Biometric profile saved successfully!`,
                    'timeout_first_finger': `⏰ Timeout waiting for first fingerprint scan`,
                    'timeout_second_finger': `⏰ Timeout waiting for second fingerprint scan`,
                    'timeout_finger_removal': `⏰ Timeout waiting for finger removal`,
                    'communication_error': `❌ Communication error with biometric device`,
                    'imaging_error': `❌ Fingerprint imaging error - please try again`,
                    'template_creation_failed': `❌ Failed to create fingerprint template`,
                    'second_template_failed': `❌ Failed to create second fingerprint template`,
                    'prints_mismatch': `❌ Fingerprints don't match - please try again`,
                    'storage_failed': `❌ Failed to save biometric data`,
                    'unknown_error': `❌ Unknown error occurred during enrollment`,
                    'enrollment_failed': `❌ Enrollment failed - please try again`
                };
                
                const message = stepMessages[data.currentStep] || `🔄 Enrollment in progress: ${data.currentStep}`;
                setBiometricSuccess(message);
            } else if (data.status === 'retry') {
                setBiometricSuccess(`🔄 ${data.message}`);
            }
        } else if (data.type === 'enrollment_complete') {
            if (data.status === 'success') {
                setBiometricSuccess(`🎉 ${data.memberName} has been successfully enrolled! They can now use their fingerprint to access the gym.`);
                setOngoingEnrollment(null);
                // Refresh biometric status
                if (editingMember) {
                    openBiometricDialog(editingMember);
                }
            } else if (data.status === 'failed') {
                // Check if this is a retryable failure
                const retryableErrors = ['timeout_first_finger', 'timeout_second_finger', 'timeout_finger_removal', 'imaging_error', 'prints_mismatch', 'communication_error'];
                const isRetryable = retryableErrors.some(error => data.message?.includes(error));
                
                if (isRetryable) {
                    setBiometricError(`❌ Enrollment failed for ${data.memberName}: ${data.message}. You can retry enrollment by clicking the enroll button again.`);
                } else {
                    setBiometricError(`❌ Enrollment failed for ${data.memberName}: ${data.message}`);
                }
                setOngoingEnrollment(null);
            } else if (data.status === 'cancelled') {
                setBiometricSuccess(`⏹️ Enrollment cancelled for ${data.memberName}.`);
                setOngoingEnrollment(null);
            } else if (data.status === 'error') {
                setBiometricError(`❌ Enrollment error for ${data.memberName}: ${data.message}`);
                setOngoingEnrollment(null);
            }
        } else if (data.type === 'enrollment_stopped' && data.reason !== 'success') {
            setBiometricSuccess(null);
            setBiometricError(`⏹️ Enrollment stopped for ${data.memberName}: ${data.reason}`);
            setOngoingEnrollment(null);
        } else if (data.type === 'whatsapp_welcome_sent') {
            setBiometricSuccess(`📱 WhatsApp welcome message prepared for ${data.memberName}! The message is ready to be sent.`);
        } else if (data.type === 'whatsapp_welcome_failed') {
            setBiometricError(`📱 WhatsApp welcome message failed for ${data.memberName}: ${data.error}`);
        } else if (data.type === 'whatsapp_welcome_error') {
            setBiometricError(`📱 WhatsApp welcome message error for member ${data.memberId}: ${data.error}`);
        }
    }, [editingMember]);

    // WebSocket setup for real-time enrollment updates
    useEffect(() => {
        // Set up WebSocket connection for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendPort = process.env.REACT_APP_BACKEND_PORT || '3001';
        const wsUrl = `${protocol}//${window.location.hostname}:${backendPort}/ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
            console.log('🔌 WebSocket connected for real-time enrollment updates (Member component)');
            setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 WebSocket message received in Member component:', data);
                
                // Handle enrollment events - be more flexible with member ID matching
                if (data.type && data.type.startsWith('enrollment_')) {
                    const messageMemberId = String(data.memberId || '');
                    const currentMemberId = String(editingMember?.id || '');
                    
                    if (messageMemberId && currentMemberId && messageMemberId === currentMemberId) {
                        console.log('📡 Processing enrollment message for current member');
                        handleEnrollmentWebSocketMessage(data);
                    } else if (data.type === 'enrollment_started' && !currentMemberId) {
                        console.log('📡 Processing enrollment_started without current member (fallback)');
                        handleEnrollmentWebSocketMessage(data);
                    } else {
                        console.log('📡 Skipping enrollment message - member ID mismatch');
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected (Member component)');
            setWsConnected(false);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error (Member component):', error);
            setWsConnected(false);
        };

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [editingMember]); // Remove handleEnrollmentWebSocketMessage from dependencies to avoid circular dependency

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
            const referralEnabled = response.data.referral_system_enabled === 'true' || response.data.referral_system_enabled === true;
            setReferralSystemEnabled(referralEnabled);
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
                is_admin: isAdmin,
                join_date: joinDate,
                due_date: dueDate || null
            };
            const res = await axios.post('/api/members', newMember);
            if (res?.data?.id && photoFile) {
                const form = new FormData();
                form.append('photo', photoFile);
                form.append('prefix', `member-${res.data.id}`);
                const up = await axios.post(`/api/members/${res.data.id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setPhotoUrl(up?.data?.photo_url || '');
            }
            
            // Handle referral if specified
            if (referralMemberId && res?.data?.id) {
                try {
                    await axios.post('/api/referrals', {
                        referrer_id: parseInt(referralMemberId, 10),
                        referred_id: res.data.id
                    });
                } catch (referralError) {
                    console.error('Error creating referral:', referralError);
                    // Don't fail the member creation if referral fails
                }
            }
            fetchMembers(currentPage, itemsPerPage, searchTerm, filter);
            setName('');
            setPhone('');
            setAddress('');
            setBirthday('');
            setJoinDate(new Date().toISOString().split('T')[0]);
            setCalculatedDueDate('');
            setDueDate('');
            setPhotoFile(null);
            setPhotoUrl('');
            setReferralMemberId('');
            if (plans.length > 0) { setMembershipPlanId(plans[0].id); }
            setOpenAdd(false);
            if (res && res.data && res.data.id) {
                setLastCreatedMemberId(res.data.id);
                setInvoicePlanId(membershipPlanId || (plans[0]?.id || ''));
                const selectedPlan = plans.find(p => String(p.id) === String(membershipPlanId)) || plans[0];
                setInvoiceAmount(selectedPlan ? String(selectedPlan.price) : '');
                
                // Use calculated due date for invoice creation
                if (dueDate) {
                    setInvoiceDueDate(dueDate);
                } else if (selectedPlan && selectedPlan.duration_days) {
                    // Fallback calculation if dueDate is not set
                    const joinDateObj = new Date(joinDate);
                    const calculatedDueDate = new Date(joinDateObj);
                    
                    if (selectedPlan.duration_days === 30) {
                        // For monthly plans, use normalized month calculation
                        const dayOfMonth = joinDateObj.getDate();
                        calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 1);
                        calculatedDueDate.setDate(dayOfMonth);
                    } else {
                        // For other durations, use simple day addition
                        calculatedDueDate.setDate(calculatedDueDate.getDate() + parseInt(selectedPlan.duration_days, 10));
                    }
                    setInvoiceDueDate(formatDateToLocalString(calculatedDueDate));
                } else {
                    // Default 30 days if no plan selected
                    const joinDateObj = new Date(joinDate);
                    const calculatedDueDate = new Date(joinDateObj);
                    calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 1);
                    setInvoiceDueDate(formatDateToLocalString(calculatedDueDate));
                }
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
                join_date: joinDate,
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
            fetchMembers(currentPage, itemsPerPage, searchTerm, filter);
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
        setJoinDate(member.join_date || new Date().toISOString().split('T')[0]);
        setCalculatedDueDate('');
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
            setBiometricDataLoading(true);
            const response = await axios.get(`/api/biometric/members/${member.id}/status`);
            if (response.data.success) {
                setMemberBiometricStatus(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching biometric status:', error);
            setBiometricError('Failed to fetch biometric status');
        } finally {
            setBiometricDataLoading(false);
        }
    };

    const openMemberDetailsDialog = async (member) => {
        try {
            setMemberDetailsLoading(true);
            setCurrentViewingMember(member);
            const response = await axios.get(`/api/members/${member.id}/details`);
            setMemberDetails(response.data);
            setOpenMemberDetails(true);
        } catch (error) {
            console.error('Error fetching member details:', error);
            alert('Failed to load member details');
        } finally {
            setMemberDetailsLoading(false);
        }
    };

    const toggleMemberActiveStatus = async () => {
        if (!currentViewingMember) {
            return;
        }
        
        try {
            const newVal = String(currentViewingMember.is_active) === '0' ? 1 : 0;
            await axios.put(`/api/members/${currentViewingMember.id}/status`, { is_active: newVal });
            
            // Update the current viewing member state
            setCurrentViewingMember(prev => ({
                ...prev,
                is_active: newVal
            }));
            
            // Update the member details
            setMemberDetails(prev => ({
                ...prev,
                member: {
                    ...prev.member,
                    is_active: newVal
                }
            }));
            
            // Refresh the members list
            fetchMembers(currentPage, itemsPerPage, searchTerm, filter);
        } catch (e) {
            console.error('Failed to update status', e);
            alert('Failed to update member status');
        }
    };

    // Helper functions for individual button loading states
    const setBiometricButtonLoadingState = (action, isLoading = true) => {
        setBiometricButtonLoading(prev => ({
            ...prev,
            [action]: isLoading
        }));
    };

    const isBiometricButtonLoading = (action) => {
        return biometricButtonLoading[action];
    };

    const startEnrollment = async () => {
        if (!editingMember) {
            return;
        }
        
        try {
            setBiometricButtonLoadingState('enroll', true);
            setBiometricError('');
            setBiometricSuccess('');
            
            console.log('🚀 Starting enrollment for member:', editingMember.id, editingMember.name);
            
            // First, check if biometric service is available
            console.log('🔐 Checking biometric service status...');
            const statusResponse = await axios.get('/api/biometric/status');
            console.log('🔐 Biometric service status:', statusResponse.data);
            
            if (!statusResponse.data.success || !statusResponse.data.data?.biometricServiceAvailable) {
                throw new Error('Biometric service is not available. Please check if biometric integration is enabled.');
            }
            
            // Check if there are any online ESP32 devices
            console.log('📡 Fetching ESP32 devices...');
            const devicesResponse = await axios.get('/api/biometric/devices');
            console.log('📡 Devices response:', devicesResponse.data);
            
            let targetDeviceId = null;
            
            if (devicesResponse.data.success && devicesResponse.data.devices.length > 0) {
                // Find the first online device
                const onlineDevice = devicesResponse.data.devices.find(device => device.status === 'online');
                console.log('📡 Online device found:', onlineDevice);
                if (onlineDevice) {
                    targetDeviceId = onlineDevice.device_id;
                    console.log(`Auto-selecting device: ${targetDeviceId}`);
                } else {
                    console.log('⚠️ No online ESP32 devices found');
                }
            } else {
                console.log('⚠️ No ESP32 devices found or devices not online');
            }
            
            let response;
            if (targetDeviceId) {
                // Use ESP32 device-specific enrollment (same as BiometricEnrollment component)
                console.log(`📱 Sending enrollment command to ESP32 device: ${targetDeviceId}`);
                response = await axios.post(`/api/biometric/devices/${targetDeviceId}/enroll`, {
                    memberId: editingMember.id
                });
                console.log('📱 ESP32 enrollment response:', response.data);
            } else {
                // Fallback to basic enrollment if no devices available
                console.log('📱 Using fallback basic enrollment');
                response = await axios.post(`/api/biometric/members/${editingMember.id}/enroll`);
                console.log('📱 Basic enrollment response:', response.data);
            }
            
            if (response.data.success) {
                const deviceInfo = targetDeviceId ? ` on ESP32 device ${targetDeviceId}` : '';
                setBiometricSuccess(`Enrollment started for ${editingMember.name}${deviceInfo}. Please ask the member to place their finger on the biometric device and follow the prompts.`);
                // Refresh biometric status
                openBiometricDialog(editingMember);
            } else {
                setBiometricError(response.data.message || 'Failed to start enrollment');
            }
        } catch (error) {
            console.error('❌ Error starting enrollment:', error);
            console.error('❌ Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            
            // Provide more specific error messages
            let errorMessage = 'Failed to start enrollment';
            if (error.response?.status === 503) {
                errorMessage = 'Biometric service is not available. Please check if biometric integration is enabled.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Member not found or biometric service unavailable.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setBiometricError(errorMessage);
        } finally {
            setBiometricButtonLoadingState('enroll', false);
        }
    };

    const deleteEnrollment = async () => {
        if (!editingMember) {
            return;
        }
        
        if (!window.confirm(`Are you sure you want to delete the biometric enrollment for ${editingMember.name}?`)) {
            return;
        }
        
        try {
            setBiometricButtonLoadingState('delete', true);
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
            setBiometricButtonLoadingState('delete', false);
        }
    };

    const reEnroll = async () => {
        if (!editingMember) {
            return;
        }
        
        try {
            setBiometricButtonLoadingState('reenroll', true);
            setBiometricError('');
            setBiometricSuccess('');
            
            // First delete existing enrollment
            const deleteResponse = await axios.delete(`/api/biometric/members/${editingMember.id}/biometric`);
            if (deleteResponse.data.success) {
                // Then start new enrollment using the same logic as startEnrollment
                // First, check if there are any online ESP32 devices
                const devicesResponse = await axios.get('/api/biometric/devices');
                let targetDeviceId = null;
                
                if (devicesResponse.data.success && devicesResponse.data.devices.length > 0) {
                    // Find the first online device
                    const onlineDevice = devicesResponse.data.devices.find(device => device.status === 'online');
                    if (onlineDevice) {
                        targetDeviceId = onlineDevice.device_id;
                        console.log(`Auto-selecting device for re-enrollment: ${targetDeviceId}`);
                    }
                }
                
                let enrollResponse;
                if (targetDeviceId) {
                    // Use ESP32 device-specific enrollment (same as BiometricEnrollment component)
                    enrollResponse = await axios.post(`/api/biometric/devices/${targetDeviceId}/enroll`, {
                        memberId: editingMember.id
                    });
                } else {
                    // Fallback to basic enrollment if no devices available
                    enrollResponse = await axios.post(`/api/biometric/members/${editingMember.id}/enroll`);
                }
                
                if (enrollResponse.data.success) {
                    setBiometricSuccess(`Re-enrollment started for ${editingMember.name}. Please ask the member to place their finger on the biometric device and follow the prompts.`);
                    // Refresh biometric status
                    openBiometricDialog(editingMember);
                } else {
                    setBiometricError('Failed to start enrollment after deletion');
                }
            } else {
                setBiometricError('Failed to delete existing biometric data');
            }
        } catch (error) {
            console.error('Error starting re-enrollment:', error);
            setBiometricError(error?.response?.data?.message || 'Failed to start re-enrollment');
        } finally {
            setBiometricButtonLoadingState('reenroll', false);
        }
    };

    const cancelEnrollment = async () => {
        if (!ongoingEnrollment) {
            return;
        }
        
        try {
            setBiometricButtonLoadingState('cancel', true);
            setBiometricError('');
            setBiometricSuccess('');
            
            // Use the same endpoint as Biometric Management for consistency
            const response = await axios.post('/api/biometric/enrollment/cancel', {
                memberId: ongoingEnrollment.memberId,
                reason: 'user_cancelled'
            });
            
            // Always clear state and provide feedback (same as Biometric Management)
            setOngoingEnrollment(null);
            
            if (response.data.success) {
                setBiometricSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName}. You can retry enrollment anytime.`);
            } else {
                setBiometricSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName} (local cancellation). You can retry enrollment anytime.`);
            }
            
            // Refresh biometric status
            if (editingMember) {
                openBiometricDialog(editingMember);
            }
        } catch (error) {
            console.error('Error cancelling enrollment:', error);
            // Even on error, clear state and provide feedback
            setOngoingEnrollment(null);
            setBiometricSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName} (local cancellation). You can retry enrollment anytime.`);
        } finally {
            setBiometricButtonLoadingState('cancel', false);
        }
    };

    const handleCreateInvoice = async () => {
        if (!lastCreatedMemberId) { 
            setOpenInvoice(false); 
            return; 
        }
        try {
            await axios.post('/api/payments/invoice', {
                member_id: lastCreatedMemberId,
                plan_id: invoicePlanId ? parseInt(invoicePlanId,10) : null,
                amount: parseFloat(invoiceAmount),
                due_date: invoiceDueDate,
                join_date: joinDate
            });
            setOpenInvoice(false);
        } catch (error) {
            console.error('Error creating invoice', error);
        }
    };

        // Webcam functions
    const openCamera = async () => {
        // Prevent multiple simultaneous camera initializations
        if (cameraLoading || cameraOpen) {
            console.log('Camera already initializing or open, skipping...');
            return;
        }
        
        try {
            // Clean up any existing stream first
            if (stream) {
                console.log('Cleaning up existing stream before opening camera');
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            
            // Clear video element if it exists
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            
            setCameraLoading(true);
            setCameraError('');
            setVideoReady(false);
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            // Check camera permissions
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                if (permissionStatus.state === 'denied') {
                    throw new Error('Camera access denied. Please enable camera permissions in your browser settings.');
                }
            } catch (permissionError) {
                console.log('Permission check failed, proceeding anyway:', permissionError);
            }

            console.log('Requesting camera access...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            console.log('Camera stream obtained successfully');
            setStream(mediaStream);
            setCameraOpen(true);
            
            // Set loading to false immediately after getting the stream
            // The video element will be rendered and can start loading
            setCameraLoading(false);
            
            // Force stream setup after a short delay to ensure video element is mounted
            setTimeout(() => {
                if (videoRef.current && mediaStream) {
                    console.log('Setting video srcObject in timeout');
                    videoRef.current.srcObject = mediaStream;
                    // Don't call play() here - let the useEffect handle it
                } else {
                    console.log('Video element not ready, retrying...');
                    // Retry after another short delay
                    setTimeout(() => {
                        if (videoRef.current && mediaStream) {
                            console.log('Setting video srcObject in retry');
                            videoRef.current.srcObject = mediaStream;
                        }
                    }, 200);
                }
            }, 100);
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            setCameraError(`Camera error: ${error.message}`);
            alert(`Unable to access camera: ${error.message}`);
            setCameraLoading(false);
        }
    };

    // Set video stream when camera opens and ensure it plays
    useEffect(() => {
        if (cameraOpen && stream && videoRef.current) {
            console.log('Setting up video stream');
            videoRef.current.srcObject = stream;
            
            // Ensure video plays with proper error handling
            const playVideo = async () => {
                try {
                    // Check if video is already playing
                    if (videoRef.current && !videoRef.current.paused) {
                        console.log('Video already playing');
                        return; // Already playing
                    }
                    
                    console.log('Attempting to play video');
                    await videoRef.current.play();
                    console.log('Video play successful');
                } catch (playError) {
                    // Only log non-abort errors
                    if (playError.name !== 'AbortError') {
                        console.error('Error playing video:', playError);
                        setCameraError(`Video play error: ${playError.message}`);
                    }
                }
            };
            
            playVideo();
        }
    }, [cameraOpen, stream]);


    // Handle loading state when video is ready
    useEffect(() => {
        if (videoReady && cameraLoading) {
            setCameraLoading(false);
        }
    }, [videoReady, cameraLoading]);

    // Timeout fallback for loading state
    useEffect(() => {
        if (cameraLoading && cameraOpen) {
            const timeout = setTimeout(() => {
                setCameraLoading(false);
                // Don't set error if we have a stream - just force the video to render
                if (!videoReady && stream) {
                    // Force video element to render by clearing error
                    setCameraError('');
                } else if (!videoReady && !stream) {
                    setCameraError('Camera took too long to load. Please try again.');
                }
            }, 10000); // 10 second timeout

            return () => clearTimeout(timeout);
        }
    }, [cameraLoading, cameraOpen, videoReady, stream]);

    // Cleanup camera stream on component unmount
    useEffect(() => {
        return () => {
            if (stream) {
                console.log('Component unmounting, cleaning up camera stream');
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const closeCamera = () => {
        console.log('Closing camera...');
        
        if (stream) {
            console.log('Stopping camera stream tracks');
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        
        // Clear video element srcObject to prevent memory leaks
        if (videoRef.current) {
            console.log('Clearing video element srcObject');
            videoRef.current.srcObject = null;
        }
        
        setCameraOpen(false);
        setCapturedImage(null);
        setCameraLoading(false);
        setCameraError('');
        setVideoReady(false);
        
        // Ensure focus is properly managed when closing
        setTimeout(() => {
            // Focus back to the document body to prevent focus trap
            document.body.focus();
        }, 0);
    };

    const capturePhoto = () => {
        if (!videoReady) {
            alert('Camera not ready. Please wait a moment and try again.');
            return;
        }
        
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                alert('Camera not ready. Please wait a moment and try again.');
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageDataUrl);
            
            // Open crop dialog with the captured image
            closeCamera();
            openCropDialog(imageDataUrl);
        } else {
            alert('Camera not available for capture');
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setPhotoFile(null);
        setPhotoUrl('');
        setVideoReady(false);
        // Restart camera stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        openCamera();
    };

    // Photo cropping functions
    const openCropDialog = (imageUrl) => {
        setImageToCrop(imageUrl);
        setCropOpen(true);
        setCrop({
            unit: '%',
            width: 90,
            height: 90,
            x: 5,
            y: 5
        });
    };

    const getCroppedImg = (image, crop, fileName) => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    return;
                }
                blob.name = fileName;
                const fileUrl = window.URL.createObjectURL(blob);
                resolve({ file: blob, url: fileUrl });
            }, 'image/jpeg', 0.8);
        });
    };

    const onCropComplete = async () => {
        if (!cropImageRef.current || !crop.width || !crop.height) {
            return;
        }

        try {
            const croppedImageData = await getCroppedImg(
                cropImageRef.current,
                crop,
                'cropped-photo.jpg'
            );
            setCroppedImageUrl(croppedImageData.url);
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    const applyCrop = () => {
        if (croppedImageUrl) {
            setPhotoUrl(croppedImageUrl);
            // Convert URL to File object
            fetch(croppedImageUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], 'cropped-photo.jpg', { type: 'image/jpeg' });
                    setPhotoFile(file);
                });
        }
        setCropOpen(false);
        setImageToCrop(null);
        setCroppedImageUrl(null);
    };

    const cancelCrop = () => {
        setCropOpen(false);
        setImageToCrop(null);
        setCroppedImageUrl(null);
    };


    return (
        <div>
            <Typography variant="h4" gutterBottom sx={{ borderBottom: '2px solid var(--accent-secondary-color)', pb: 1 }}>Members</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Filter</InputLabel>
                    <Select label="Filter" value={filter} onChange={handleFilterChange}>
                        <MenuItem value="all">All Active Members</MenuItem>
                        <MenuItem value="deactivated">Deactivated Members</MenuItem>
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
                    onChange={handleSearchChange}
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
                    setAddress('');
                    setBirthday('');
                    setJoinDate(new Date().toISOString().split('T')[0]);
                    setCalculatedDueDate('');
                    setDueDate('');
                    setPhotoFile(null);
                    setPhotoUrl('');
                    setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                    setIsAdmin(false);
                    setOpenAdd(true);
                }}>Add Member</Button>
            </Box>

            <Dialog 
                open={openAdd} 
                onClose={() => {
                    setOpenAdd(false);
                    setEditingMember(null);
                    setName('');
                    setPhone('');
                    setAddress('');
                    setBirthday('');
                    setJoinDate(new Date().toISOString().split('T')[0]);
                    setCalculatedDueDate('');
                    setDueDate('');
                    setPhotoFile(null);
                    setPhotoUrl('');
                    setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                    setIsAdmin(false);
                }} 
                fullWidth 
                maxWidth="sm"
                disableRestoreFocus
                keepMounted={false}
            >
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
                        
                        {referralSystemEnabled && (
                            <SearchableMemberDropdown
                                value={referralMemberId}
                                onChange={(e) => setReferralMemberId(e.target.value)}
                                members={members.filter(member => member.id !== parseInt(referralMemberId))} // Exclude self
                                label="Referred By (Optional)"
                                placeholder="Search members by name, ID, or phone..."
                                showId={false}
                                showEmail={false}
                                showAdminIcon={false}
                            />
                        )}
                        
                        <TextField label="Address" value={address} onChange={(e)=>setAddress(e.target.value)} multiline minRows={2} />
                        <TextField label="Birthday" type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Joining Date" type="date" value={joinDate} onChange={(e)=>setJoinDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                                <Button variant="outlined" component="label" size="small">
                                    Upload Photo
                                    <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; f && (() => { const url = URL.createObjectURL(f); openCropDialog(url) })() }} />
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
                        
                        {!isAdmin && (
                            <TextField 
                                label="Due Date" 
                                value={calculatedDueDate || ''} 
                                InputProps={{ readOnly: true }}
                                InputLabelProps={{ shrink: true }}
                                helperText="Auto-calculated based on joining date and membership plan"
                                sx={{ 
                                    '& .MuiInputBase-input': { 
                                        backgroundColor: '#f5f5f5',
                                        color: '#666'
                                    }
                                }}
                            />
                        )}
                        
                        {isAdmin && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', p: 1, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #ffd700' }}>
                                ⭐ Admin users are exempt from payments and membership plans
                            </Typography>
                        )}
                        
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => {
                                setOpenAdd(false);
                                setEditingMember(null);
                                setName('');
                                setPhone('');
                                setAddress('');
                                setBirthday('');
                                setJoinDate(new Date().toISOString().split('T')[0]);
                                setCalculatedDueDate('');
                                setDueDate('');
                                setPhotoFile(null);
                                setPhotoUrl('');
                                setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                                setIsAdmin(false);
                            }}>Cancel</Button>
                            <Button type="submit" variant="contained" disabled={plans.length === 0 && !isAdmin}>Add Member</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog 
                open={openEdit} 
                onClose={() => {
                    setOpenEdit(false);
                    setEditingMember(null);
                    setName('');
                    setPhone('');
                    setAddress('');
                    setBirthday('');
                    setJoinDate(new Date().toISOString().split('T')[0]);
                    setCalculatedDueDate('');
                    setPhotoFile(null);
                    setPhotoUrl('');
                    setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                    setIsAdmin(false);
                }} 
                fullWidth 
                maxWidth="sm"
                disableRestoreFocus
                keepMounted={false}
            >
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
                        <TextField label="Joining Date" type="date" value={joinDate} onChange={(e)=>setJoinDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="member" style={{ height: 64, width: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <Box sx={{ height: 64, width: 64, border: '1px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>No Photo</Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                                <Button variant="outlined" component="label" size="small">
                                    Upload Photo
                                    <input type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; f && (() => { const url = URL.createObjectURL(f); openCropDialog(url) })() }} />
                                </Button>
                                <Button variant="outlined" size="small" onClick={openCamera} startIcon="📷">
                                    Take Photo
                                </Button>
                                {photoUrl && <Button color="error" size="small" onClick={()=>{ setPhotoFile(null); setPhotoUrl(''); }}>Remove</Button>}
                            </Box>
                        </Box>

                        {calculatedDueDate && !isAdmin && (
                            <TextField 
                                label="Due Date" 
                                value={calculatedDueDate} 
                                InputProps={{ readOnly: true }}
                                InputLabelProps={{ shrink: true }}
                                helperText="Auto-calculated based on joining date and membership plan"
                                sx={{ 
                                    '& .MuiInputBase-input': { 
                                        backgroundColor: '#f5f5f5',
                                        color: '#666'
                                    }
                                }}
                            />
                        )}

                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => {
                                setOpenEdit(false);
                                setEditingMember(null);
                                setName('');
                                setPhone('');
                                setAddress('');
                                setBirthday('');
                                setJoinDate(new Date().toISOString().split('T')[0]);
                                setCalculatedDueDate('');
                                setPhotoFile(null);
                                setPhotoUrl('');
                                setMembershipPlanId(plans.length > 0 ? plans[0].id : '');
                                setIsAdmin(false);
                            }}>Cancel</Button>
                            <Button type="submit" variant="contained">Save</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog 
                open={openInvoice} 
                onClose={() => {
                    setOpenInvoice(false);
                }} 
                fullWidth 
                maxWidth="sm"
                disableRestoreFocus
                keepMounted={false}
            >
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
                        <TextField 
                            label="Due Date" 
                            type="date" 
                            value={invoiceDueDate} 
                            onChange={(e)=>setInvoiceDueDate(e.target.value)} 
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenInvoice(false);
                    }}>Skip</Button>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {members.map(member => {
                            const today = new Date();
                            const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
                            const todayDay = String(today.getDate()).padStart(2, '0');
                            const isBirthdayToday = Boolean(member.birthday) && member.birthday.slice(5,10) === `${todayMonth}-${todayDay}`;
                            const whatsappHref = member.phone ? `https://wa.me/${encodeURIComponent(member.phone.replace(/\D/g,''))}?text=${encodeURIComponent(`Happy Birthday, ${member.name}! 🎉🎂 Wishing you a fantastic year ahead from ${currency} Gym!`)}` : null;
                            return (
                                <Card 
                                    key={member.id} 
                                    sx={{ 
                                        mb: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        background: member.is_admin === 1 ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)' : 
                                                   member.has_overdue_payments === 1 ? 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)' : 'background.paper',
                                        border: member.is_admin === 1 ? '2px solid #ffd700' : 
                                               member.has_overdue_payments === 1 ? '2px solid #f44336' : '1px solid',
                                        borderColor: 'divider',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 3,
                                            backgroundColor: member.is_admin === 1 ? 'linear-gradient(135deg, #fff8e1 0%, #fffde7 100%)' : 
                                                           member.has_overdue_payments === 1 ? 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)' : 'action.hover'
                                        }
                                    }}
                                    onClick={() => openMemberDetailsDialog(member)}
                                >
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                <Avatar 
                                                    src={member.photo_url || undefined}
                                                    sx={{ 
                                                        width: 48, 
                                                        height: 48,
                                                        mr: 2,
                                                        bgcolor: String(member.is_active) === '0' ? 'grey.400' : 
                                                               member.is_admin === 1 ? 'warning.main' : 'primary.main',
                                                        border: '2px solid',
                                                        borderColor: member.is_admin === 1 ? '#ffd700' : 
                                                                   member.has_overdue_payments === 1 ? '#f44336' : 'transparent'
                                                    }}
                                                >
                                                    {!member.photo_url && (member.name || '').slice(0, 2).toUpperCase()}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                            {member.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                            #{member.id}
                                                        </Typography>
                                                        {member.is_admin === 1 && (
                                                            <CrownIcon 
                                                                sx={{ 
                                                                    color: '#ffd700', 
                                                                    fontSize: 20,
                                                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                                                }} 
                                                            />
                                                        )}
                                                        {member.has_overdue_payments === 1 && (
                                                            <CreditCardIcon 
                                                                sx={{ 
                                                                    color: '#f44336', 
                                                                    fontSize: 20,
                                                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                                                }} 
                                                            />
                                                        )}
                                                        {isBirthdayToday && (
                                                            <Chip 
                                                                label="🎂 Birthday" 
                                                                size="small" 
                                                                color="secondary" 
                                                                sx={{ fontSize: '0.75rem' }}
                                                            />
                                                        )}
                                                        {String(member.is_active) === '0' && (
                                                            <Chip 
                                                                label="Deactivated" 
                                                                size="small" 
                                                                color="error" 
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {member.phone || 'No phone'} • {member.birthday || 'No birthday'} • Joined: {formatDateToLocalString(new Date(member.join_date))}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                                {whatsappHref && (
                                                    <Button 
                                                        size="small" 
                                                        variant="outlined"
                                                        href={whatsappHref} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        startIcon={<WhatsAppIcon />}
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{ 
                                                            color: '#25D366',
                                                            borderColor: '#25D366',
                                                            '&:hover': {
                                                                backgroundColor: '#25D366',
                                                                color: 'white'
                                                            }
                                                        }}
                                                    >
                                                        Message
                                                    </Button>
                                                )}
                                                <Button 
                                                    size="small" 
                                                    variant="outlined"
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        openBiometricDialog(member); 
                                                    }}
                                                    startIcon={<FingerprintIcon />}
                                                >
                                                    Biometric
                                                </Button>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                    
                    {/* Pagination */}
                    {paginationMeta.totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination
                                count={paginationMeta.totalPages}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                </>
            )}

            <Dialog 
                open={openBiometric} 
                onClose={() => setOpenBiometric(false)} 
                fullWidth 
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        ...(ongoingEnrollment && {
                            border: '2px solid #2196f3',
                            boxShadow: '0 0 15px rgba(33, 150, 243, 0.4)'
                        })
                    }
                }}
            >
                <DialogTitle>
                    Biometric data for {editingMember?.name || 'Member'}
                </DialogTitle>
                <DialogContent>
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
                    
                    {biometricDataLoading && !memberBiometricStatus && (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <FormShimmer />
                        </Box>
                    )}
                    
                    {memberBiometricStatus && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                            {/* System Status Indicator */}
                            <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: 1,
                                border: '1px solid #e0e0e0'
                            }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    System Status
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Chip 
                                        label="Biometric Service" 
                                        color="primary" 
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        Ready for enrollment
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip 
                                        label="Real-time Updates" 
                                        color={wsConnected ? "success" : "error"} 
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {wsConnected ? "Connected" : "Disconnected"}
                                    </Typography>
                                </Box>
                            </Box>
                            {/* Biometric Status Display */}
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Enrollment Status
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {ongoingEnrollment ? (
                                        <Chip
                                            label="Enrolling"
                                            color="primary"
                                            size="small"
                                            icon={
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor: 'white',
                                                        animation: 'pulse 1.5s ease-in-out infinite'
                                                    }}
                                                />
                                            }
                                        />
                                    ) : memberBiometricStatus.hasFingerprint ? (
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
                                {memberBiometricStatus.hasFingerprint ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="error"
                                            onClick={deleteEnrollment}
                                            disabled={isBiometricButtonLoading('delete')}
                                            startIcon={isBiometricButtonLoading('delete') ? <CircularProgress size={20} /> : <DeleteIcon />}
                                            sx={{ py: 1.5 }}
                                        >
                                            {isBiometricButtonLoading('delete') ? 'Deleting...' : 'Delete Enrollment'}
                                        </Button>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={reEnroll}
                                            disabled={isBiometricButtonLoading('reenroll') || !!ongoingEnrollment}
                                            startIcon={isBiometricButtonLoading('reenroll') ? <CircularProgress size={20} /> : <RefreshIcon />}
                                            sx={{ py: 1.5 }}
                                        >
                                            {isBiometricButtonLoading('reenroll') ? 'Starting Re-enrollment...' : ongoingEnrollment ? 'Enrollment in Progress...' : 'Re-enroll Now'}
                                        </Button>
                                    </Box>
                                ) : (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={startEnrollment}
                                        disabled={isBiometricButtonLoading('enroll') || !!ongoingEnrollment}
                                        startIcon={isBiometricButtonLoading('enroll') ? <CircularProgress size={20} /> : <FingerprintIcon />}
                                        sx={{ py: 1.5 }}
                                    >
                                        {isBiometricButtonLoading('enroll') ? 'Starting Enrollment...' : ongoingEnrollment ? 'Enrollment in Progress...' : 'Enroll Fingerprints'}
                                    </Button>
                                )}
                                
                                {/* Cancel Enrollment Button - Show when enrollment is ongoing */}
                                {ongoingEnrollment && (
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="error"
                                            onClick={cancelEnrollment}
                                            disabled={isBiometricButtonLoading('cancel')}
                                            startIcon={isBiometricButtonLoading('cancel') ? <CircularProgress size={20} /> : <CancelIcon />}
                                            sx={{ py: 1.5 }}
                                        >
                                            {isBiometricButtonLoading('cancel') ? 'Cancelling...' : 'Cancel Enrollment'}
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
            <Dialog 
                open={cameraOpen} 
                onClose={closeCamera} 
                fullWidth 
                maxWidth="md"
                disableRestoreFocus
                keepMounted={false}
            >
                <DialogTitle>Take Member Photo</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        {cameraLoading ? (
                            <Box sx={{ 
                                width: '100%', 
                                maxWidth: '400px', 
                                height: '300px',
                                borderRadius: '8px',
                                border: '2px solid #ddd',
                                backgroundColor: '#f5f5f5',
                                position: 'relative'
                            }}>
                                <CameraShimmer />
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        position: 'absolute',
                                        bottom: 8,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        color: '#666',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Initializing camera...
                                </Typography>
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
                        ) : stream ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadStart={() => {
                                        console.log('Video load started');
                                    }}
                                    onLoadedMetadata={() => {
                                        console.log('Video metadata loaded');
                                        if (videoRef.current) {
                                            // Don't call play() here - let the useEffect handle it
                                        }
                                    }}
                                    onCanPlay={() => {
                                        console.log('Video can play');
                                        setVideoReady(true);
                                    }}
                                    onCanPlayThrough={() => {
                                        console.log('Video can play through');
                                    }}
                                    onError={(e) => {
                                        console.error('Video error:', e);
                                        setCameraError('Video playback error: ' + (e.target.error?.message || 'Unknown error'));
                                        setVideoReady(false);
                                    }}
                                    onStalled={() => {
                                        console.log('Video stalled');
                                    }}
                                    onSuspend={() => {
                                        console.log('Video suspended');
                                    }}
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        borderRadius: '8px',
                                        border: videoReady ? '2px solid #4caf50' : '2px solid #ddd',
                                        backgroundColor: '#f5f5f5',
                                        transform: 'scaleX(-1)' // Mirror the video horizontally
                                    }}
                                />
                                {videoReady && (
                                    <Typography variant="body2" color="success.main" sx={{ textAlign: 'center' }}>
                                        ✅ Camera ready for capture
                                    </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button 
                                        variant="contained" 
                                        onClick={capturePhoto} 
                                        startIcon="📸"
                                        disabled={!videoReady}
                                    >
                                        {videoReady ? 'Capture Photo' : 'Camera Loading...'}
                                    </Button>
                                    <Button variant="outlined" onClick={closeCamera}>
                                        Cancel
                                    </Button>
                                </Box>
                            </>
                        ) : capturedImage ? (
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
                        ) : (
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
                                gap: 2
                            }}>
                                <Typography variant="body2" color="text.secondary">
                                    Camera not initialized
                                </Typography>
                                <Button variant="contained" onClick={openCamera}>
                                    Start Camera
                                </Button>
                            </Box>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Photo Crop Dialog */}
            <Dialog 
                open={cropOpen} 
                onClose={cancelCrop} 
                fullWidth 
                maxWidth="md"
                disableRestoreFocus
                keepMounted={false}
            >
                <DialogTitle>Crop Photo</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        {imageToCrop && (
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={onCropComplete}
                                aspect={1}
                                circularCrop
                            >
                                <img
                                    ref={cropImageRef}
                                    src={imageToCrop}
                                    alt="Crop preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '400px',
                                        borderRadius: '8px'
                                    }}
                                />
                            </ReactCrop>
                        )}
                        
                        {croppedImageUrl && (
                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="success.main">
                                    ✅ Cropped preview ready
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelCrop}>Cancel</Button>
                    <Button 
                        onClick={applyCrop} 
                        variant="contained" 
                        disabled={!croppedImageUrl}
                    >
                        Apply Crop
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Member Details Modal */}
            <Dialog 
                open={openMemberDetails} 
                onClose={() => {
                    setOpenMemberDetails(false);
                    setCurrentViewingMember(null);
                }} 
                fullWidth 
                maxWidth="md"
                disableRestoreFocus
                keepMounted={false}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        {memberDetails?.member?.name || 'Member Details'}
                    </Typography>
                    <IconButton onClick={() => setOpenMemberDetails(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {memberDetailsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : memberDetails ? (
                        <Box sx={{ mt: 1 }}>
                            <Grid container spacing={3}>
                                {/* Member Photo and Basic Info */}
                                <Grid item xs={12} sm={4} md={3}>
                                    <Card sx={{ height: '100%' }}>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Avatar 
                                                src={memberDetails.member.photo_url || undefined}
                                                sx={{ 
                                                    width: 120, 
                                                    height: 120, 
                                                    mx: 'auto', 
                                                    mb: 2,
                                                    bgcolor: memberDetails.member.is_admin === 1 ? 'warning.main' : 'primary.main'
                                                }}
                                            >
                                                {!memberDetails.member.photo_url && (memberDetails.member.name || '').slice(0, 2).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="h6" gutterBottom>
                                                {memberDetails.member.name}
                                                {memberDetails.member.is_admin === 1 && (
                                                    <CrownIcon sx={{ ml: 1, color: '#ffd700', fontSize: 24 }} />
                                                )}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Member ID: {memberDetails.member.id}
                                            </Typography>
                                            {memberDetails.member.is_active === 0 && (
                                                <Chip label="Deactivated" color="error" size="small" sx={{ mt: 1 }} />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Member Information */}
                                <Grid item xs={12} sm={8} md={9}>
                                    <Card sx={{ height: '100%', width: '100%' }}>
                                        <CardHeader title="Member Information" />
                                        <CardContent sx={{ width: '100%', p: 3 }}>
                                            <Grid container spacing={3} sx={{ width: '100%' }}>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                                        <PhoneIcon sx={{ mr: 2, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Phone Number
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                                {memberDetails.member.phone || 'Not provided'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                                        <CakeIcon sx={{ mr: 2, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Birthday
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                                {memberDetails.member.birthday ? formatDateToLocalString(new Date(memberDetails.member.birthday)) : 'Not provided'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                                        <CalendarTodayIcon sx={{ mr: 2, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Joining Date
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                                {formatDateToLocalString(new Date(memberDetails.member.join_date))}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                                                        <CardMembershipIcon sx={{ mr: 2, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Membership Plan
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                                {memberDetails.member.plan_name || 'No plan assigned'}
                                                            </Typography>
                                                            {memberDetails.member.plan_price && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                    {formatCurrency(memberDetails.member.plan_price, currency)}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                {memberDetails.member.address && (
                                                    <Grid item xs={12}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                                            <LocationOnIcon sx={{ mr: 2, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                    Address
                                                                </Typography>
                                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                                    {memberDetails.member.address}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Referral Discount */}
                                {memberDetails.referralSystemEnabled && memberDetails.unusedReferralDiscount && (
                                    <Grid item xs={12}>
                                        <Card>
                                            <CardHeader 
                                                title="Referral Discount" 
                                                avatar={<Chip label="Available" color="success" size="small" />}
                                            />
                                            <CardContent>
                                                <Typography variant="body1" gutterBottom>
                                                    You have an unused referral discount of {formatCurrency(memberDetails.unusedReferralDiscount.discount_amount, currency)} 
                                                    from referring {memberDetails.unusedReferralDiscount.referrer_name}.
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    This discount will be automatically applied to your next payment.
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )}

                                {/* Latest Invoice Status */}
                                {memberDetails.latestInvoice && (
                                    <Grid item xs={12} sm={6}>
                                        <Card>
                                            <CardHeader 
                                                title="Latest Invoice" 
                                                avatar={
                                                    <Chip 
                                                        label={memberDetails.latestInvoice.status} 
                                                        color={memberDetails.latestInvoice.status === 'paid' ? 'success' : 
                                                               memberDetails.has_overdue_payments ? 'error' : 'warning'} 
                                                        size="small" 
                                                    />
                                                }
                                            />
                                            <CardContent>
                                                <Typography variant="body1" gutterBottom>
                                                    Amount: {formatCurrency(memberDetails.latestInvoice.amount, currency)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Due Date: {formatDateToLocalString(new Date(memberDetails.latestInvoice.due_date))}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Plan: {memberDetails.latestInvoice.plan_name || 'N/A'}
                                                </Typography>
                                                {memberDetails.has_overdue_payments && (
                                                    <Alert severity="error" sx={{ mt: 2 }}>
                                                        This invoice is overdue!
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )}

                                {/* Payment History */}
                                <Grid item xs={12} sm={6}>
                                    <Card>
                                        <CardHeader title="Recent Payments" />
                                        <CardContent>
                                            {memberDetails.paymentHistory.length > 0 ? (
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Date</TableCell>
                                                                <TableCell>Amount</TableCell>
                                                                <TableCell>Method</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {memberDetails.paymentHistory.map((payment) => (
                                                                <TableRow key={payment.id}>
                                                                    <TableCell>
                                                                        {formatDateToLocalString(new Date(payment.payment_date))}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatCurrency(payment.amount, currency)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {payment.payment_method || 'N/A'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No payment history available
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                            variant="outlined" 
                            startIcon={<EditIcon />}
                            onClick={() => {
                                setOpenMemberDetails(false);
                                openEditDialog(currentViewingMember);
                            }}
                            disabled={!currentViewingMember}
                        >
                            Edit Member
                        </Button>
                        <Button 
                            variant="outlined" 
                            color={currentViewingMember?.is_active === 0 ? 'success' : 'warning'}
                            startIcon={currentViewingMember?.is_active === 0 ? <ToggleOnIcon /> : <ToggleOffIcon />}
                            onClick={toggleMemberActiveStatus}
                            disabled={!currentViewingMember}
                        >
                            {currentViewingMember?.is_active === 0 ? 'Activate' : 'Deactivate'}
                        </Button>
                        {currentViewingMember?.phone && (
                            <Button 
                                variant="outlined" 
                                startIcon={<WhatsAppIcon />}
                                href={`https://wa.me/${encodeURIComponent(currentViewingMember.phone.replace(/\D/g,''))}?text=${encodeURIComponent(`Happy Birthday, ${currentViewingMember.name}! 🎉🎂 Wishing you a fantastic year ahead from ${currency} Gym!`)}`}
                                target="_blank" 
                                rel="noreferrer"
                                disabled={!currentViewingMember}
                            >
                                Message on WhatsApp
                            </Button>
                        )}
                        <Button 
                            variant="outlined" 
                            startIcon={<FingerprintIcon />}
                            onClick={() => {
                                setOpenMemberDetails(false);
                                openBiometricDialog(currentViewingMember);
                            }}
                            disabled={!currentViewingMember}
                        >
                            Biometric Data
                        </Button>
                    </Box>
                    <Button onClick={() => {
                        setOpenMemberDetails(false);
                        setCurrentViewingMember(null);
                    }}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Member;
