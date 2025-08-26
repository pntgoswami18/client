import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Person as PersonIcon,
  DeviceHub as DeviceIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Monitor as MonitorIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const BiometricEnrollment = () => {
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
  // Core state
  const [members, setMembers] = useState([]);
  const [membersWithBiometric, setMembersWithBiometric] = useState([]);
  const [devices, setDevices] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [biometricEvents, setBiometricEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // UI state
  const [currentTab, setCurrentTab] = useState(0);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, memberId: null, memberName: '' });
  
  // Enrollment state
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [enrollmentProgress, setEnrollmentProgress] = useState(null);
  const [deviceUserId, setDeviceUserId] = useState('');
  const [manualMember, setManualMember] = useState('');
  
  // Track ongoing enrollments for individual members
  const [ongoingEnrollment, setOngoingEnrollment] = useState(null); // { memberId, memberName, startTime }
  const [lastCheckedEventId, setLastCheckedEventId] = useState(null);
  
  // Event filtering state - heartbeat events deselected by default
  const [eventTypeFilters, setEventTypeFilters] = useState({
    checkin: true,
    checkout: true,
    enrollment: true,
    enrollment_failed: true,
    enrollment_cancelled: true,
    access_denied: true,
    remote_unlock: true,
    emergency_unlock: true,
    heartbeat: false // Deselected by default as requested
  });
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const enrollmentSteps = [
    'Select Member',
    'Select Device', 
    'Start Enrollment',
    'Complete Enrollment'
  ];

  // Define callback functions first
  const fetchMembersWithoutBiometric = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/members/without-biometric');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} members without biometric data`);
      } else {
        console.error('API returned error:', data.message);
        setError(`Failed to load members: ${data.message}`);
        setMembers([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError(`Network error: ${error.message}`);
      setMembers([]); // Set empty array as fallback
    }
  }, []);

  // Fetch members with biometric data
  const fetchMembersWithBiometric = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/members/with-biometric');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMembersWithBiometric(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} members with biometric data`);
      } else {
        console.error('API returned error:', data.message);
        setError(`Failed to load members with biometric: ${data.message}`);
        setMembersWithBiometric([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching members with biometric:', error);
      setError(`Network error: ${error.message}`);
      setMembersWithBiometric([]); // Set empty array as fallback
    }
  }, []);

  const checkEnrollmentProgress = useCallback(async () => {
    if (!enrollmentProgress && !ongoingEnrollment) {
      return;
    }
    
    try {
      // Check wizard-based enrollment progress
      if (enrollmentProgress) {
        const response = await fetch('/api/biometric/enrollment/status');
        const data = await response.json();
        
        if (data.success && data.status) {
          if (data.status.status === 'completed') {
            setSuccess('Fingerprint enrollment completed successfully!');
            setEnrollmentProgress(null);
            setActiveStep(3);
            fetchMembersWithoutBiometric(); // Refresh members list
          } else if (data.status.status === 'failed') {
            setSuccess(null); // Clear the enrollment started message
            setError('Fingerprint enrollment failed: ' + data.status.message);
            setEnrollmentProgress(null);
            setActiveStep(0);
          } else {
            setEnrollmentProgress(data.status);
          }
        }
      }
      
      // Check individual member enrollment progress
      if (ongoingEnrollment) {
        const response = await fetch(`/api/biometric/events?limit=5&memberId=${ongoingEnrollment.memberId}`);
        const data = await response.json();
        
        if (data.success && data.data.events) {
          // Look for recent enrollment events for this member
          const recentEvents = data.data.events.filter(event => 
            (event.event_type === 'enrollment' || event.event_type === 'enrollment_failed' || event.event_type === 'enrollment_cancelled') &&
            new Date(event.timestamp) > new Date(ongoingEnrollment.startTime) &&
            (!lastCheckedEventId || event.id !== lastCheckedEventId)
          );
          
          if (recentEvents.length > 0) {
            const latestEvent = recentEvents[0];
            setLastCheckedEventId(latestEvent.id);
            
            if (latestEvent.event_type === 'enrollment' && latestEvent.success) {
              setSuccess(`🎉 ${ongoingEnrollment.memberName} has been successfully enrolled! They can now use their fingerprint to access the gym.`);
              setOngoingEnrollment(null);
              fetchMembersWithoutBiometric(); // Refresh members list
            } else if (latestEvent.event_type === 'enrollment_cancelled') {
              setSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName}.`);
              setOngoingEnrollment(null);
            } else if (latestEvent.event_type === 'enrollment_failed' || !latestEvent.success) {
              setSuccess(null); // Clear the enrollment started message
              setError(`❌ Fingerprint enrollment failed for ${ongoingEnrollment.memberName}. Please try again. Make sure the finger is clean and placed firmly on the scanner.`);
              setOngoingEnrollment(null);
            }
          }
          
          // Auto-timeout after 2 minutes
          const enrollmentAge = Date.now() - new Date(ongoingEnrollment.startTime).getTime();
          if (enrollmentAge > 120000) { // 2 minutes
            setSuccess(null); // Clear the enrollment started message
            setError(`⏰ Enrollment timeout for ${ongoingEnrollment.memberName}. Please try again.`);
            setOngoingEnrollment(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check enrollment progress:', error);
    }
  }, [enrollmentProgress, ongoingEnrollment, lastCheckedEventId, fetchMembersWithoutBiometric]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/devices');
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices.filter(device => device.status === 'online') || []);
      }
    } catch (error) {
      setError('Failed to fetch devices: ' + error.message);
    }
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/status');
      const data = await response.json();
      if (data.success) {
        setSystemStatus(data.data);
      } else {
        console.warn('Biometric system status unavailable:', data.message);
        setSystemStatus({
          biometricServiceAvailable: false,
          enrollmentActive: false,
          connectedDevices: 0
        });
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      setSystemStatus({
        biometricServiceAvailable: false,
        enrollmentActive: false,
        connectedDevices: 0
      });
    }
  }, []);

  const fetchEnrollmentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/enrollment/status');
      const data = await response.json();
      if (data.success) {
        setEnrollmentStatus(data.data);
      } else {
        setEnrollmentStatus({ active: false });
      }
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
      setEnrollmentStatus({ active: false });
    }
  }, []);

  const fetchBiometricEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/biometric/events?limit=20');
      const data = await response.json();
      if (data.success) {
        setBiometricEvents(data.data.events || []);
      } else {
        setBiometricEvents([]);
      }
    } catch (error) {
      console.error('Error fetching biometric events:', error);
      setBiometricEvents([]);
    }
  }, []);

  // Event filter handling
  const handleEventFilterChange = (eventType, checked) => {
    setEventTypeFilters(prev => ({
      ...prev,
      [eventType]: checked
    }));
  };

  // Filter events based on selected event types
  const filteredBiometricEvents = biometricEvents.filter(event => {
    return eventTypeFilters[event.event_type] !== false;
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchMembersWithoutBiometric();
    fetchMembersWithBiometric();
    fetchDevices();
    fetchSystemStatus();
    fetchEnrollmentStatus();
    fetchBiometricEvents();
    
    // Poll enrollment status every 2 seconds
    const interval = setInterval(() => {
      fetchEnrollmentStatus();
      checkEnrollmentProgress();
    }, 2000);

    return () => clearInterval(interval);
  }, [checkEnrollmentProgress, fetchMembersWithoutBiometric, fetchMembersWithBiometric, fetchDevices, fetchSystemStatus, fetchEnrollmentStatus, fetchBiometricEvents]);



  const startEnrollment = async (memberId, deviceId = null) => {
    if (deviceId && (!selectedMember || !selectedDevice)) {
      setError('Please select both a member and device');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      let targetDeviceId = deviceId;
      
      // Find member name for tracking
      const member = members.find(m => m.id === parseInt(memberId));
      const memberName = member ? member.name : `Member ${memberId}`;
      
      // If no device specified, try to use the first online device
      if (!targetDeviceId && devices.length > 0) {
        const onlineDevice = devices.find(device => device.status === 'online');
        if (onlineDevice) {
          targetDeviceId = onlineDevice.device_id;
          console.log(`Auto-selecting device: ${targetDeviceId}`);
        }
      }
      
      if (targetDeviceId) {
        // ESP32 device-specific enrollment
        if (deviceId) {
          setActiveStep(2);
        }
        response = await fetch(`/api/biometric/devices/${targetDeviceId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId })
        });
      } else {
        // Fallback to basic enrollment if no devices available
        response = await fetch(`/api/biometric/members/${memberId}/enroll`, {
        method: 'POST'
      });
      }
      
      const data = await response.json();

      if (data.success) {
        // Set up enrollment tracking for individual member enrollments
        if (!deviceId) { // This is individual member enrollment, not wizard
          setOngoingEnrollment({
            memberId: parseInt(memberId),
            memberName: memberName,
            startTime: new Date().toISOString()
          });
          setLastCheckedEventId(null); // Reset event tracking
        }
        
        if (targetDeviceId) {
          if (deviceId) {
            setEnrollmentProgress({ status: 'in_progress', step: 1 });
          }
          setSuccess(`📱 Enrollment started for ${memberName}. Please place your finger on the biometric device and follow the prompts.`);
          fetchEnrollmentStatus();
        } else {
          setSuccess(`📱 Enrollment started for ${memberName}. Please place your finger on the biometric device and follow the prompts.`);
          fetchEnrollmentStatus();
        }
      } else {
        setSuccess(null); // Clear any existing success message
        setError(data.message || 'Failed to start enrollment');
        if (deviceId) {
          setActiveStep(1);
        }
      }
    } catch (error) {
      setSuccess(null); // Clear any existing success message
      setError('Error starting enrollment: ' + error.message);
      if (deviceId) {
        setActiveStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const startDeviceEnrollment = async () => {
    await startEnrollment(selectedMember, selectedDevice);
  };

  const stopEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/biometric/enrollment/stop', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('Enrollment stopped');
        fetchEnrollmentStatus();
        fetchMembersWithoutBiometric();
      } else {
        setSuccess(null); // Clear any existing success message
        setError(data.message || 'Failed to stop enrollment');
      }
    } catch (error) {
      setSuccess(null); // Clear any existing success message
      setError('Error stopping enrollment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmDialog = (memberId, memberName) => {
    setDeleteConfirmDialog({ open: true, memberId, memberName });
  };

  const closeDeleteConfirmDialog = () => {
    setDeleteConfirmDialog({ open: false, memberId: null, memberName: '' });
  };

  const confirmDeleteBiometricData = async () => {
    const { memberId, memberName } = deleteConfirmDialog;
    setLoading(true);
    setError(null);
    closeDeleteConfirmDialog();

    try {
      const response = await fetch(`/api/biometric/members/${memberId}/biometric`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Biometric data deleted for ${memberName}. They can now be re-enrolled.`);
        // Refresh both lists
        fetchMembersWithoutBiometric();
        fetchMembersWithBiometric();
      } else {
        setSuccess(null); // Clear any existing success message
        setError(`❌ Failed to delete biometric data: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting biometric data:', error);
      setSuccess(null); // Clear any existing success message
      setError(`❌ Error deleting biometric data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelOngoingEnrollment = async () => {
    if (!ongoingEnrollment) return;
    
    setLoading(true);
    setError(null);

    try {
      // Try to send cancel command to ESP32 devices
      const response = await fetch('/api/biometric/enrollment/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: ongoingEnrollment.memberId,
          reason: 'user_cancelled'
        })
      });

      const data = await response.json();
      
      // Always clear the ongoing enrollment state, regardless of ESP32 response
      setOngoingEnrollment(null);
      setLastCheckedEventId(null);
      
      if (data.success) {
        setSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName}`);
      } else {
        setSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName} (local cancellation)`);
      }
    } catch (error) {
      // Even if the API call fails, we should still cancel locally
      console.error('Error cancelling enrollment:', error);
      setOngoingEnrollment(null);
      setLastCheckedEventId(null);
      setSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName} (local cancellation)`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/biometric/test-connection', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(`Test message sent to ${data.data.connectedDevices} device(s)`);
      } else {
        setSuccess(null); // Clear any existing success message
        setError(data.message || 'Connection test failed');
      }
    } catch (error) {
      setSuccess(null); // Clear any existing success message
      setError('Error testing connection: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const openManualEnrollment = (member) => {
    setManualMember(member.id);
    setDeviceUserId('');
    setError(null);
    setSuccess(null);
    setManualDialogOpen(true);
  };

  const closeManualEnrollment = () => {
    setManualDialogOpen(false);
    setManualMember('');
    setDeviceUserId('');
  };

  const handleManualEnrollment = async () => {
    if (!manualMember || !deviceUserId.trim()) {
      setError('Member and Device User ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/biometric/members/${manualMember}/manual-enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceUserId: deviceUserId.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Manual enrollment completed successfully!');
        closeManualEnrollment();
        setOngoingEnrollment(null); // Clear any ongoing enrollment tracking
        fetchMembersWithoutBiometric();
        fetchBiometricEvents();
      } else {
        setSuccess(null); // Clear any existing success message
        setError(data.message || 'Failed to assign biometric data');
      }
    } catch (error) {
      setSuccess(null); // Clear any existing success message
      setError('Error assigning biometric data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };



  const resetEnrollment = () => {
    setSelectedMember('');
    setSelectedDevice('');
    setEnrollmentProgress(null);
    setActiveStep(0);
    setEnrollDialogOpen(false);
    setOngoingEnrollment(null); // Clear ongoing enrollment tracking
    setSuccess(null); // Clear any success messages
    setError(null); // Clear any error messages
  };

  const getDeviceStatusChip = (device) => (
    <Chip
      size="small"
      label={device.status}
      color={device.status === 'online' ? 'success' : 'error'}
      sx={{ ml: 1 }}
    />
  );

  // Enrollment Stepper Component
  const EnrollmentStepper = () => (
    <Stepper activeStep={activeStep} orientation="vertical">
      {enrollmentSteps.map((label, index) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
          <StepContent>
            {index === 0 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Member</InputLabel>
                <Select
                  value={selectedMember}
                  onChange={(e) => {
                    setSelectedMember(e.target.value);
                    if (e.target.value) {
                      setActiveStep(1);
                    }
                  }}
                >
                  {members.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name} (ID: {member.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {index === 1 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Device</InputLabel>
                <Select
                  value={selectedDevice}
                  onChange={(e) => {
                    setSelectedDevice(e.target.value);
                    if (e.target.value) {
                      setActiveStep(2);
                    }
                  }}
                >
                  {devices.map((device) => (
                    <MenuItem key={device.device_id} value={device.device_id}>
                      {device.device_id} - {device.location || 'Unknown Location'}
                      {getDeviceStatusChip(device)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {index === 2 && (
              <Box>
                {enrollmentProgress ? (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Enrollment in progress...
                    </Typography>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography variant="caption" color="text.secondary">
                      Step {enrollmentProgress.step || 1} - Please follow device instructions
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    onClick={startDeviceEnrollment}
              disabled={loading}
                    startIcon={<FingerprintIcon />}
                  >
                    Start Fingerprint Enrollment
                  </Button>
                )}
              </Box>
            )}
            
            {index === 3 && (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Enrollment completed successfully!
                </Alert>
                <Button onClick={resetEnrollment}>
                  Enroll Another Member
                </Button>
              </Box>
            )}
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Biometric Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => setManualDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Manual Assignment
          </Button>
          <Button
            variant="contained"
            onClick={() => setEnrollDialogOpen(true)}
            startIcon={<FingerprintIcon />}
          >
            New Enrollment
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Ongoing Enrollment Alert with Cancel Button */}
      {ongoingEnrollment && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={cancelOngoingEnrollment}
              disabled={loading}
              startIcon={<CloseIcon />}
            >
              Cancel Enrollment
            </Button>
          }
        >
          🔄 Enrollment in progress for <strong>{ongoingEnrollment.memberName}</strong>. 
          Please place your finger on the biometric device and follow the prompts.
        </Alert>
      )}

      {/* Status Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MonitorIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Service Status
                </Typography>
              </Box>
              <Chip
                label={systemStatus?.biometricServiceAvailable ? 'Online' : 'Offline'}
                color={systemStatus?.biometricServiceAvailable ? 'success' : 'error'}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Connected Devices: {systemStatus?.connectedDevices || 0}
              </Typography>
              <Box mt={2}>
                <Button
                  variant="outlined"
                  onClick={testConnection}
                  disabled={loading || !systemStatus?.biometricServiceAvailable}
                  startIcon={<RefreshIcon />}
                  size="small"
                >
                  Test Connection
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FingerprintIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Enrollment Status
                </Typography>
              </Box>
              <Chip
                label={enrollmentStatus?.active ? 'Active' : 'Inactive'}
                color={enrollmentStatus?.active ? 'warning' : 'default'}
                sx={{ mb: 1 }}
              />
              {enrollmentStatus?.active && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Member: {enrollmentStatus.enrollmentMode?.memberName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Started: {formatDateTime(enrollmentStatus.enrollmentMode?.startTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attempts: {enrollmentStatus.enrollmentMode?.attempts || 0}/{enrollmentStatus.enrollmentMode?.maxAttempts || 3}
                  </Typography>
                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={stopEnrollment}
                      disabled={loading}
                      startIcon={<CloseIcon />}
                      size="small"
                    >
                      Stop Enrollment
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Enrollment Instructions */}
      {enrollmentStatus?.active && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Active Enrollment Session
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Follow these instructions for successful enrollment:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Ask the member to clean their finger" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Place finger firmly on the biometric scanner" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Follow the device prompts for multiple scans" />
              </ListItem>
              <ListItem>
                <ListItemText primary="4. Wait for confirmation or error message" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab icon={<PersonIcon />} label="Members" />
          <Tab icon={<DeviceIcon />} label="Devices" />
          <Tab icon={<HistoryIcon />} label="Events" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Members Without Biometric Data ({members ? members.length : '?'})
                </Typography>
        
        {!systemStatus?.biometricServiceAvailable && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Biometric service is offline. Member data may not be current. Service is not required to view members, but enrollment will not work.
                  </Alert>
        )}
        
        {members && members.length === 0 ? (
                  <Alert severity="success">
                    🎉 All members have biometric data enrolled!
                  </Alert>
        ) : members && members.length > 0 ? (
                  <Grid container spacing={2}>
            {members.map(member => (
                      <Grid item xs={12} md={6} lg={4} key={member.id}>
                        <Card variant="outlined" sx={{ 
                          position: 'relative',
                          ...(ongoingEnrollment && ongoingEnrollment.memberId === member.id && {
                            border: '2px solid #2196f3',
                            boxShadow: '0 0 10px rgba(33, 150, 243, 0.3)'
                          })
                        }}>
                          {ongoingEnrollment && ongoingEnrollment.memberId === member.id && (
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8, 
                                bgcolor: 'primary.main', 
                                color: 'white', 
                                px: 1, 
                                py: 0.5, 
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'white',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }}
                              />
                              Enrolling
                            </Box>
                          )}
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {member.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {member.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {member.phone}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Joined: {formatDateTime(member.join_date)}
                            </Typography>
                          </CardContent>
                          <Box p={2} pt={0}>
                            {ongoingEnrollment && ongoingEnrollment.memberId === member.id ? (
                              <>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  disabled
                                  startIcon={<FingerprintIcon />}
                                  sx={{ mb: 1 }}
                                >
                                  Enrolling...
                                </Button>
                                <Button
                                  fullWidth
                                  variant="outlined"
                                  color="warning"
                                  onClick={cancelOngoingEnrollment}
                                  disabled={loading}
                                  startIcon={<CloseIcon />}
                                  sx={{ mb: 1 }}
                                >
                                  Cancel Enrollment
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  onClick={() => startEnrollment(member.id)}
                                  disabled={loading || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable || !!ongoingEnrollment}
                                  startIcon={<FingerprintIcon />}
                                  sx={{ mb: 1 }}
                                >
                                  Enroll Fingerprint
                                </Button>
                              </>
                            )}
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => openManualEnrollment(member)}
                              disabled={loading || !!ongoingEnrollment}
                              startIcon={<SettingsIcon />}
                            >
                              Manual Assignment
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography>Loading member data...</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Members With Biometric Data */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FingerprintIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Members With Biometric Data ({membersWithBiometric ? membersWithBiometric.length : '?'})
                </Typography>
              </Box>
              
              {membersWithBiometric && membersWithBiometric.length === 0 ? (
                <Alert severity="info">
                  📝 No members have biometric data enrolled yet.
                </Alert>
              ) : membersWithBiometric && membersWithBiometric.length > 0 ? (
                <Grid container spacing={2}>
                  {membersWithBiometric.map(member => (
                    <Grid item xs={12} md={6} lg={4} key={member.id}>
                      <Card variant="outlined" sx={{ 
                        position: 'relative',
                        border: '2px solid #4caf50',
                        boxShadow: '0 0 10px rgba(76, 175, 80, 0.2)'
                      }}>
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8, 
                            bgcolor: 'success.main', 
                            color: 'white', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <FingerprintIcon sx={{ fontSize: '1rem' }} />
                          Enrolled
                        </Box>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {member.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {member.email}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {member.phone}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Biometric ID: {member.biometric_id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Joined: {formatDateTime(member.join_date)}
                          </Typography>
                        </CardContent>
                        <Box p={2} pt={0}>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => openDeleteConfirmDialog(member.id, member.name)}
                            disabled={loading || !!ongoingEnrollment}
                            startIcon={<DeleteIcon />}
                            sx={{ mb: 1 }}
                          >
                            Delete & Re-enroll
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => startEnrollment(member.id)}
                            disabled={loading || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable || !!ongoingEnrollment}
                            startIcon={<RefreshIcon />}
                          >
                            Re-enroll Now
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography>Loading member data...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Devices Tab */}
      {currentTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Devices
            </Typography>
            <List>
              {devices.length === 0 ? (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="No online devices"
                    secondary="Make sure ESP32 devices are connected"
                  />
                </ListItem>
              ) : (
                devices.map((device) => (
                  <ListItem key={device.device_id}>
                    <ListItemIcon>
                      <DeviceIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={device.device_id}
                      secondary={`${device.location || 'Unknown Location'} - ${device.deviceData?.enrolled_prints || 0} enrolled`}
                    />
                    <ListItemSecondaryAction>
                      {getDeviceStatusChip(device)}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Events Tab */}
      {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Biometric Events
            </Typography>
            
            {/* Event Type Filters */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Filter by Event Type:
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(eventTypeFilters).map(([eventType, isChecked]) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={eventType}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => handleEventFilterChange(eventType, e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            {biometricEvents.length === 0 ? (
              <Typography>No biometric events recorded yet.</Typography>
            ) : filteredBiometricEvents.length === 0 ? (
              <Typography>No events match the selected filters.</Typography>
            ) : (
              <List>
                {filteredBiometricEvents.map(event => (
                  <ListItem key={event.id} divider>
                    <ListItemIcon>
                      <Chip
                        size="small"
                        label={event.success ? 'Success' : 'Error'}
                        color={event.success ? 'success' : 'error'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${event.event_type} - ${event.member_name || 'Unknown'}`}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {formatDateTime(event.timestamp)}
                          </Typography>
                          {event.device_id && (
                            <Typography variant="caption" display="block">
                              Device: {event.device_id}
                            </Typography>
                          )}
                          {event.biometric_id && (
                            <Typography variant="caption" display="block">
                              Device ID: {event.biometric_id}
                            </Typography>
                          )}
                          {event.error_message && (
                            <Typography variant="caption" color="error" display="block">
                              Error: {event.error_message}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enrollment Dialog */}
      <Dialog 
        open={enrollDialogOpen} 
        onClose={() => {
          setEnrollDialogOpen(false);
          setSuccess(null); // Clear success message when dialog is closed
          setError(null); // Clear error message when dialog is closed
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Fingerprint Enrollment Wizard
        </DialogTitle>
        <DialogContent>
          <EnrollmentStepper />
        </DialogContent>
        <DialogActions>
          <Button onClick={resetEnrollment}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Enrollment Dialog */}
      <Dialog open={manualDialogOpen} onClose={() => {
        setManualDialogOpen(false);
        setSuccess(null); // Clear success message when dialog is closed
        setError(null); // Clear error message when dialog is closed
      }}>
        <DialogTitle>Manual Biometric Assignment</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use this for members who have already enrolled their fingerprint directly on the device.
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Member</InputLabel>
            <Select
              value={manualMember}
              onChange={(e) => setManualMember(e.target.value)}
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name} (ID: {member.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Device User ID"
                  value={deviceUserId}
                  onChange={(e) => setDeviceUserId(e.target.value)}
            placeholder="e.g., 1, 2, 3..."
            helperText="The user ID assigned by the ESP32 device"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManualEnrollment}>Cancel</Button>
          <Button 
                onClick={handleManualEnrollment}
            variant="contained"
            disabled={loading || !manualMember || !deviceUserId}
              >
                {loading ? 'Assigning...' : 'Assign Biometric Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={closeDeleteConfirmDialog}
        aria-labelledby="delete-confirm-dialog-title"
        aria-describedby="delete-confirm-dialog-description"
      >
        <DialogTitle id="delete-confirm-dialog-title">
          Confirm Biometric Data Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the biometric data for{' '}
            <strong>{deleteConfirmDialog.memberName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will require them to re-enroll their fingerprint. The action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteBiometricData} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            Delete & Re-enroll
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BiometricEnrollment;
