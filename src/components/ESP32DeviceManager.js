import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Fingerprint as FingerprintIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Emergency as EmergencyIcon,
  Monitor as MonitorIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  DeviceHub as DeviceHubIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const ESP32DeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // Form states
  const [unlockReason, setUnlockReason] = useState('');
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchDevices();
    fetchMembers();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/biometric/devices');
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch devices: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/biometric/members/without-biometric');
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const getDeviceStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'unknown': return 'warning';
      default: return 'default';
    }
  };

  const getSignalStrength = (rssi) => {
    if (!rssi) return 'Unknown';
    if (rssi > -50) return 'Excellent';
    if (rssi > -60) return 'Good';
    if (rssi > -70) return 'Fair';
    return 'Poor';
  };

  const handleUnlockDevice = async () => {
    if (!selectedDevice) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/devices/${selectedDevice.device_id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unlockReason || 'Admin unlock' })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(`Door ${selectedDevice.device_id} unlocked successfully`);
        setUnlockDialogOpen(false);
        setUnlockReason('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to unlock device: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoteEnrollment = async () => {
    if (!selectedDevice || !enrollMemberId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/devices/${selectedDevice.device_id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: enrollMemberId })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(`Enrollment started for member ${enrollMemberId} on device ${selectedDevice.device_id}`);
        setEnrollDialogOpen(false);
        setEnrollMemberId('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to start enrollment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const DeviceCard = ({ device }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h3">
            {device.device_id}
          </Typography>
          <Chip 
            label={device.status || 'unknown'} 
            color={getDeviceStatusColor(device.status)}
            size="small"
            icon={device.status === 'online' ? <WifiIcon /> : <WifiOffIcon />}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Location: {device.location || 'Not specified'}
        </Typography>
        
        {device.last_seen && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Last seen: {formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}
          </Typography>
        )}
        
        {device.deviceData && (
          <Box mt={2}>
            <Typography variant="body2">
              Signal: {getSignalStrength(device.deviceData.wifi_rssi)} ({device.deviceData.wifi_rssi}dBm)
            </Typography>
            <Typography variant="body2">
              Memory: {Math.round((device.deviceData.free_heap || 0) / 1024)}KB free
            </Typography>
            <Typography variant="body2">
              Enrolled: {device.deviceData.enrolled_prints || 0} fingerprints
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<LockOpenIcon />}
          onClick={() => {
            setSelectedDevice(device);
            setUnlockDialogOpen(true);
          }}
          disabled={device.status !== 'online'}
        >
          Unlock
        </Button>
        <Button 
          size="small" 
          startIcon={<FingerprintIcon />}
          onClick={() => {
            setSelectedDevice(device);
            setEnrollDialogOpen(true);
          }}
          disabled={device.status !== 'online'}
        >
          Enroll
        </Button>
        <IconButton 
          size="small"
          onClick={() => {
            setSelectedDevice(device);
            setConfigDialogOpen(true);
          }}
        >
          <SettingsIcon />
        </IconButton>
      </CardActions>
    </Card>
  );

  const DeviceDetails = ({ device }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Device Details: {device.device_id}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <List>
              <ListItem>
                <ListItemIcon><DeviceHubIcon /></ListItemIcon>
                <ListItemText primary="Device ID" secondary={device.device_id} />
              </ListItem>
              <ListItem>
                <ListItemIcon><MonitorIcon /></ListItemIcon>
                <ListItemText primary="Status" secondary={device.status} />
              </ListItem>
              <ListItem>
                <ListItemIcon><WifiIcon /></ListItemIcon>
                <ListItemText 
                  primary="Signal Strength" 
                  secondary={device.deviceData ? `${device.deviceData.wifi_rssi}dBm (${getSignalStrength(device.deviceData.wifi_rssi)})` : 'Unknown'} 
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List>
              <ListItem>
                <ListItemIcon><SecurityIcon /></ListItemIcon>
                <ListItemText 
                  primary="Enrolled Fingerprints" 
                  secondary={device.deviceData?.enrolled_prints || 0} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><TimelineIcon /></ListItemIcon>
                <ListItemText 
                  primary="Free Memory" 
                  secondary={device.deviceData ? `${Math.round(device.deviceData.free_heap / 1024)}KB` : 'Unknown'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><RefreshIcon /></ListItemIcon>
                <ListItemText 
                  primary="Last Heartbeat" 
                  secondary={device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }) : 'Never'} 
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ESP32 Device Manager
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDevices}
          disabled={loading}
        >
          Refresh
        </Button>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Device Overview" />
          <Tab label="Device Details" />
          <Tab label="Device Analytics" />
        </Tabs>
      </Box>

      {/* Content */}
      {loading && devices.length === 0 ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {devices.map((device) => (
                <Grid item xs={12} sm={6} md={4} key={device.device_id}>
                  <DeviceCard device={device} />
                </Grid>
              ))}
              {devices.length === 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center" color="text.secondary">
                        No ESP32 devices found
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        Make sure your ESP32 devices are connected and sending heartbeat messages.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {activeTab === 1 && selectedDevice && (
            <DeviceDetails device={selectedDevice} />
          )}

          {activeTab === 2 && (
            <Typography variant="h6" color="text.secondary">
              Device Analytics - Coming Soon
            </Typography>
          )}
        </>
      )}

      {/* Unlock Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)}>
        <DialogTitle>Remote Door Unlock</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Device: {selectedDevice?.device_id}
          </Typography>
          <TextField
            fullWidth
            label="Unlock Reason"
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="e.g., Emergency access, Maintenance, Admin override"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUnlockDevice} 
            variant="contained" 
            startIcon={<LockOpenIcon />}
            disabled={loading}
          >
            Unlock Door
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)}>
        <DialogTitle>Remote Fingerprint Enrollment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Device: {selectedDevice?.device_id}
          </Typography>
          <TextField
            fullWidth
            select
            label="Select Member"
            value={enrollMemberId}
            onChange={(e) => setEnrollMemberId(e.target.value)}
            sx={{ mt: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="">Select a member...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} (ID: {member.id})
              </option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRemoteEnrollment} 
            variant="contained" 
            startIcon={<FingerprintIcon />}
            disabled={loading || !enrollMemberId}
          >
            Start Enrollment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ESP32DeviceManager;
