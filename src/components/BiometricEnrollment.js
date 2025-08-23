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
  Tabs
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
  Monitor as MonitorIcon
} from '@mui/icons-material';

const BiometricEnrollment = () => {
  // Core state
  const [members, setMembers] = useState([]);
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
  
  // Enrollment state
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [enrollmentProgress, setEnrollmentProgress] = useState(null);
  const [deviceUserId, setDeviceUserId] = useState('');
  const [sensorMemberId, setSensorMemberId] = useState('');
  const [manualMember, setManualMember] = useState('');
  
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

  const checkEnrollmentProgress = useCallback(async () => {
    if (!enrollmentProgress) {
      return;
    }
    
    try {
      const response = await fetch('/api/biometric/enrollment/status');
      const data = await response.json();
      
      if (data.success && data.status) {
        if (data.status.status === 'completed') {
          setSuccess('Fingerprint enrollment completed successfully!');
          setEnrollmentProgress(null);
          setActiveStep(3);
          fetchMembersWithoutBiometric(); // Refresh members list
        } else if (data.status.status === 'failed') {
          setError('Fingerprint enrollment failed: ' + data.status.message);
          setEnrollmentProgress(null);
          setActiveStep(0);
        } else {
          setEnrollmentProgress(data.status);
        }
      }
    } catch (error) {
      console.error('Failed to check enrollment progress:', error);
    }
  }, [enrollmentProgress, fetchMembersWithoutBiometric]);

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

  // Fetch data on component mount
  useEffect(() => {
    fetchMembersWithoutBiometric();
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
  }, [checkEnrollmentProgress, fetchMembersWithoutBiometric, fetchDevices, fetchSystemStatus, fetchEnrollmentStatus, fetchBiometricEvents]);



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
      if (deviceId) {
        // ESP32 device-specific enrollment
        setActiveStep(2);
        response = await fetch(`/api/biometric/devices/${deviceId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId })
        });
      } else {
        // Basic enrollment
        response = await fetch(`/api/biometric/members/${memberId}/enroll`, {
        method: 'POST'
      });
      }
      
      const data = await response.json();

      if (data.success) {
                if (deviceId) {
          setEnrollmentProgress({ status: 'in_progress', step: 1 });
          setSuccess('Enrollment started. Please place finger on the selected device.');
        } else {
        setSuccess('Enrollment started! Please ask the member to place their finger on the biometric device.');
        fetchEnrollmentStatus();
        }
      } else {
        setError(data.message || 'Failed to start enrollment');
        if (deviceId) {
          setActiveStep(1);
        }
      }
    } catch (error) {
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
        setError(data.message || 'Failed to stop enrollment');
      }
    } catch (error) {
      setError('Error stopping enrollment: ' + error.message);
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
        setError(data.message || 'Connection test failed');
      }
    } catch (error) {
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
    setSensorMemberId('');
    setError(null);
    setSuccess(null);
    setManualDialogOpen(true);
  };

  const closeManualEnrollment = () => {
    setManualDialogOpen(false);
    setManualMember('');
    setDeviceUserId('');
    setSensorMemberId('');
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
          sensorMemberId: sensorMemberId.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Manual enrollment completed successfully!');
        closeManualEnrollment();
        fetchMembersWithoutBiometric();
        fetchBiometricEvents();
      } else {
        setError(data.message || 'Failed to assign biometric data');
      }
    } catch (error) {
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
                        <Card variant="outlined">
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
                            <Button
                              fullWidth
                              variant="contained"
                    onClick={() => startEnrollment(member.id)}
                    disabled={loading || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable}
                              startIcon={<FingerprintIcon />}
                              sx={{ mb: 1 }}
                            >
                              Enroll Fingerprint
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                    onClick={() => openManualEnrollment(member)}
                    disabled={loading}
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
            
            {biometricEvents.length === 0 ? (
              <Typography>No biometric events recorded yet.</Typography>
            ) : (
              <List>
                {biometricEvents.map(event => (
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
        onClose={() => setEnrollDialogOpen(false)}
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
      <Dialog open={manualDialogOpen} onClose={() => setManualDialogOpen(false)}>
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
          
          <TextField
            fullWidth
            label="Sensor Member ID"
                  value={sensorMemberId}
                  onChange={(e) => setSensorMemberId(e.target.value)}
                  placeholder="Enter sensor member ID (optional)"
            helperText="The member ID sent by the biometric sensor (if different from device user ID)"
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
    </Box>
  );
};

export default BiometricEnrollment;
