import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
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
  IconButton,
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Person as PersonIcon,
  DeviceHub as DeviceIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const ESP32BiometricEnrollment = () => {
  const [members, setMembers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [enrollmentProgress, setEnrollmentProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Manual enrollment
  const [manualMember, setManualMember] = useState('');
  const [deviceUserId, setDeviceUserId] = useState('');
  const [memberToDelete, setMemberToDelete] = useState(null);
  
  // Enrollment steps
  const [activeStep, setActiveStep] = useState(0);
  const enrollmentSteps = [
    'Select Member',
    'Select Device', 
    'Start Enrollment',
    'Complete Enrollment'
  ];

  useEffect(() => {
    fetchMembersWithoutBiometric();
    fetchDevices();
    
    // Poll for enrollment progress
    const interval = setInterval(checkEnrollmentProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchMembersWithoutBiometric = async () => {
    try {
      const response = await fetch('/api/biometric/members/without-biometric');
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (error) {
      setError('Failed to fetch members: ' + error.message);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/biometric/devices');
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices.filter(device => device.status === 'online') || []);
      }
    } catch (error) {
      setError('Failed to fetch devices: ' + error.message);
    }
  };

  const checkEnrollmentProgress = async () => {
    if (!enrollmentProgress) return;
    
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
  };

  const startEnrollment = async () => {
    if (!selectedMember || !selectedDevice) {
      setError('Please select both a member and device');
      return;
    }
    
    try {
      setLoading(true);
      setActiveStep(2);
      
      const response = await fetch(`/api/biometric/devices/${selectedDevice}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMember })
      });
      
      const data = await response.json();
      if (data.success) {
        setEnrollmentProgress({ status: 'in_progress', step: 1 });
        setSuccess('Enrollment started. Please place finger on the selected device.');
      } else {
        setError(data.message);
        setActiveStep(1);
      }
    } catch (error) {
      setError('Failed to start enrollment: ' + error.message);
      setActiveStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEnrollment = async () => {
    if (!manualMember || !deviceUserId) {
      setError('Please provide both member and device user ID');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/members/${manualMember}/manual-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceUserId })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Manual enrollment completed successfully!');
        setManualDialogOpen(false);
        setManualMember('');
        setDeviceUserId('');
        fetchMembersWithoutBiometric();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to complete manual enrollment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBiometric = async () => {
    if (!memberToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/members/${memberToDelete.id}/biometric`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(`Biometric data removed for ${memberToDelete.name}`);
        setDeleteDialogOpen(false);
        setMemberToDelete(null);
        fetchMembersWithoutBiometric();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to delete biometric data: ' + error.message);
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
                    if (e.target.value) setActiveStep(1);
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
                    if (e.target.value) setActiveStep(2);
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
                    onClick={startEnrollment}
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
          ESP32 Biometric Enrollment
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={() => setManualDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Manual Enrollment
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

      {/* Device Status */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
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
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Members Without Biometric
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {members.length} members need fingerprint enrollment
              </Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {members.slice(0, 5).map((member) => (
                  <ListItem key={member.id}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={member.name}
                      secondary={`ID: ${member.id} - Phone: ${member.phone || 'N/A'}`}
                    />
                  </ListItem>
                ))}
                {members.length > 5 && (
                  <ListItem>
                    <ListItemText
                      secondary={`... and ${members.length - 5} more members`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
        <DialogTitle>Manual Biometric Enrollment</DialogTitle>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleManualEnrollment}
            variant="contained"
            disabled={loading || !manualMember || !deviceUserId}
          >
            Link Biometric Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ESP32BiometricEnrollment;
