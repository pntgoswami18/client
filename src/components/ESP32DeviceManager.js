import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
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
  Tooltip
} from '@mui/material';
import {
  LockOpen as LockOpenIcon,
  Fingerprint as FingerprintIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Monitor as MonitorIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  DeviceHub as DeviceHubIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const ESP32DeviceManager = ({ onUnsavedChanges, onSave }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // ESP32 Biometric Reader Configuration
  const [esp32Host, setEsp32Host] = useState('192.168.1.100');
  const [esp32Port, setEsp32Port] = useState('80');
  const [localListenHost, setLocalListenHost] = useState('0.0.0.0');
  const [localListenPort, setLocalListenPort] = useState('8080');
  const [hasUnsavedConfigChanges, setHasUnsavedConfigChanges] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState(null);
  const initialConfigValues = useRef({});
  
  // Dialog states
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [unlockReason, setUnlockReason] = useState('');
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [editDevice, setEditDevice] = useState({
    device_id: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    fetchDevices();
    fetchMembers();
    fetchEsp32Settings();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEsp32Settings = async () => {
    try {
      const response = await axios.get('/api/settings');
      const { esp32_host, esp32_port, local_listen_host, local_listen_port } = response.data;
      
      if (esp32_host) { setEsp32Host(esp32_host); }
      if (esp32_port !== undefined) { setEsp32Port(String(esp32_port)); }
      if (local_listen_host) { setLocalListenHost(local_listen_host); }
      if (local_listen_port) { setLocalListenPort(String(local_listen_port)); }
      
      // Store initial values for change tracking
      setTimeout(() => {
        initialConfigValues.current = {
          esp32Host: esp32_host || '192.168.1.100',
          esp32Port: String(esp32_port || '80'),
          localListenHost: local_listen_host || '0.0.0.0',
          localListenPort: String(local_listen_port || '8080')
        };
      }, 100);
    } catch (error) {
      console.error("Error fetching ESP32 settings", error);
    }
  };

  const saveEsp32Settings = async () => {
    try {
      const settingsToUpdate = {
        esp32_host: esp32Host,
        esp32_port: parseInt(esp32Port) || 80,
        local_listen_host: localListenHost,
        local_listen_port: parseInt(localListenPort) || 8080
      };

      await axios.put('/api/settings', settingsToUpdate);
      
      // Update initial values with the actual saved values to prevent false change detection
      initialConfigValues.current = {
        esp32Host: esp32Host,
        esp32Port: esp32Port,
        localListenHost: localListenHost,
        localListenPort: localListenPort
      };
      
      setHasUnsavedConfigChanges(false);
      if (onSave) { onSave(); }
      if (onUnsavedChanges) { onUnsavedChanges(false); }
      setSuccess('ESP32 configuration updated successfully!');
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error("Error updating ESP32 settings", error);
      setError('Error updating ESP32 configuration. Please try again.');
      
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const testESP32Connection = async () => {
    try {
      setTestingConnection(true);
      setTestConnectionResult(null);
      
      try {
        // Test ESP32 device connectivity via backend
        const response = await fetch(`/api/biometric/test-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            host: esp32Host, 
            port: parseInt(esp32Port) || 80 
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setTestConnectionResult({
            type: 'success',
            message: `✅ Connection test successful! ESP32 web interface is reachable at ${esp32Host}:${esp32Port}`
          });
        } else {
          setTestConnectionResult({
            type: 'error',
            message: `❌ Connection test failed: ${result.message || 'Unable to reach ESP32 device'}`,
            tips: [
              'Check if ESP32 IP address is correct',
              'Ensure ESP32 is powered on and connected to WiFi',
              'Verify you\'re on the same network as the ESP32'
            ]
          });
        }
      } catch (fetchError) {
        setTestConnectionResult({
          type: 'error',
          message: `❌ Connection test failed: Network error`,
          tips: [
            `Check if ESP32 IP address (${esp32Host}) is correct`,
            'Ensure ESP32 is powered on and connected to WiFi',
            'Verify you\'re on the same network as the ESP32',
            'Check router admin panel for connected devices'
          ]
        });
      }
      
    } catch (error) {
      console.error('Error testing ESP32 connection:', error);
      setTestConnectionResult({
        type: 'error',
        message: 'Error testing connection. Please check your configuration.'
      });
    } finally {
      setTestingConnection(false);
      
      // Auto-clear the test result after 10 seconds
      setTimeout(() => {
        setTestConnectionResult(null);
      }, 10000);
    }
  };

  const handleEditDevice = (device) => {
    setEditDevice({
      device_id: device.device_id,
      location: device.location || '',
      description: device.description || ''
    });
    setSelectedDevice(device);
    setEditDialogOpen(true);
  };

  const handleUpdateDevice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/devices/${selectedDevice.device_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: editDevice.device_id,
          location: editDevice.location,
          description: editDevice.description
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Device updated successfully!');
        setEditDialogOpen(false);
        fetchDevices(); // Refresh the devices list
      } else {
        setError(data.message || 'Failed to update device');
      }
    } catch (error) {
      setError('Failed to update device: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = (device) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDevice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/biometric/devices/${selectedDevice.device_id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Device deleted successfully!');
        setDeleteDialogOpen(false);
        fetchDevices(); // Refresh the devices list
      } else {
        setError(data.message || 'Failed to delete device');
      }
    } catch (error) {
      setError('Failed to delete device: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Check for changes in ESP32 configuration
  const checkForConfigChanges = useCallback(() => {
    if (!initialConfigValues.current || Object.keys(initialConfigValues.current).length === 0) {
      return;
    }

    const currentConfigValues = {
      esp32Host,
      esp32Port,
      localListenHost,
      localListenPort
    };

    const hasChanges = JSON.stringify(currentConfigValues) !== JSON.stringify(initialConfigValues.current);
    
    if (hasChanges !== hasUnsavedConfigChanges) {
      setHasUnsavedConfigChanges(hasChanges);
      if (onUnsavedChanges) {
        onUnsavedChanges(hasChanges);
      }
    }
  }, [esp32Host, esp32Port, localListenHost, localListenPort, hasUnsavedConfigChanges, onUnsavedChanges]);

  // Track changes in configuration values
  useEffect(() => {
    checkForConfigChanges();
  }, [checkForConfigChanges]);

  const getDeviceStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'unknown': return 'warning';
      default: return 'default';
    }
  };

  const getSignalStrength = (rssi) => {
    if (!rssi) { return 'Unknown'; }
    if (rssi > -50) { return 'Excellent'; }
    if (rssi > -60) { return 'Good'; }
    if (rssi > -70) { return 'Fair'; }
    return 'Poor';
  };

  const handleUnlockDevice = async () => {
    if (!selectedDevice) { return; }
    
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
    if (!selectedDevice || !enrollMemberId) { return; }
    
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
        <Tooltip 
          title={device.status !== 'online' ? 'Device must be online to unlock' : 'Remotely unlock door'}
        >
          <span>
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
          </span>
        </Tooltip>
        <Tooltip 
          title={device.status !== 'online' ? 'Device must be online to enroll fingerprints' : 'Enroll new fingerprint'}
        >
          <span>
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
          </span>
        </Tooltip>
        <Tooltip 
          title={device.status !== 'online' ? 'Device must be online to edit settings' : 'Edit device settings'}
        >
          <span>
            <IconButton 
              size="small"
              onClick={() => handleEditDevice(device)}
              color="primary"
              disabled={device.status !== 'online'}
            >
              <EditIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip 
          title={device.status !== 'online' ? 'Device must be online to delete' : 'Delete device'}
        >
          <span>
            <IconButton 
              size="small"
              onClick={() => handleDeleteDevice(device)}
              color="error"
              disabled={device.status !== 'online'}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
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
          <Tab label="Configuration" />
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

          {activeTab === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                All Device Details
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Comprehensive details for all connected ESP32 devices
              </Typography>
              
              {devices.length === 0 ? (
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
              ) : (
                <Grid container spacing={3}>
                  {devices.map((device) => (
                    <Grid item xs={12} lg={6} key={device.device_id}>
                      <DeviceDetails device={device} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                ESP32 Biometric Reader Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Configure connection settings for ESP32 fingerprint readers and the local listener service.
              </Typography>
              
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="ESP32 Device Host Address"
                        value={esp32Host}
                        onChange={(e) => {
                          setEsp32Host(e.target.value);
                          setTestConnectionResult(null); // Clear test result when config changes
                        }}
                        fullWidth
                        helperText="IP address of your ESP32 device (check router admin panel or ESP32 Serial Monitor)"
                        placeholder="192.168.1.100"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="ESP32 Device Port"
                        type="number"
                        value={esp32Port}
                        onChange={(e) => {
                          setEsp32Port(e.target.value);
                          setTestConnectionResult(null); // Clear test result when config changes
                        }}
                        fullWidth
                        helperText="Port number for ESP32 web interface (default: 80)"
                        placeholder="80"
                        slotProps={{ htmlInput: { min: 1, max: 65535 } }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Local Listen Host"
                        value={localListenHost}
                        onChange={(e) => {
                          setLocalListenHost(e.target.value);
                          setTestConnectionResult(null); // Clear test result when config changes
                        }}
                        fullWidth
                        helperText="Host address for incoming connections (default: 0.0.0.0 = all interfaces)"
                        placeholder="0.0.0.0"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Local Listen Port"
                        type="number"
                        value={localListenPort}
                        onChange={(e) => {
                          setLocalListenPort(e.target.value);
                          setTestConnectionResult(null); // Clear test result when config changes
                        }}
                        fullWidth
                        helperText="Port for gym management app to listen on (default: 8080)"
                        placeholder="8080"
                        slotProps={{ htmlInput: { min: 1, max: 65535 } }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>📋 How to Find ESP32 Host and Port:</strong>
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      <strong>1. Find ESP32 IP Address:</strong>
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 2, mb: 0.5 }}>
                      • Check your router's admin panel for connected devices (look for "ESP32" or device MAC)
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 2, mb: 0.5 }}>
                      • Connect ESP32 via USB and check Serial Monitor for IP address output
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 2, mb: 1 }}>
                      • Use network scanner: <code style={{ backgroundColor: '#e0e0e0', padding: '1px 4px' }}>nmap -sn 192.168.1.0/24</code>
                    </Typography>
                    
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      <strong>2. ESP32 Port:</strong> Default is 80 (ESP32 web interface port, not biometric data port)
                    </Typography>
                    
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      <strong>3. Local Listen Settings:</strong>
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 2, mb: 0.5 }}>
                      • <strong>Host:</strong> Use 0.0.0.0 to listen on all network interfaces
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 2, mb: 1 }}>
                      • <strong>Port:</strong> Must match BIOMETRIC_PORT in your .env file (default: 8080)
                    </Typography>
                    
                    <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        <strong>🔧 Port Architecture Explained:</strong>
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ ml: 1, mb: 0.5 }}>
                        • <strong>ESP32 Port 80:</strong> Web interface for status/control (ESP32 listens)
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ ml: 1, mb: 0.5 }}>
                        • <strong>ESP32 → Server Port 5005:</strong> Biometric data sent TO your gym server
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ ml: 1, mb: 1 }}>
                        • <strong>Local Listen Port 8080:</strong> Where gym server listens FOR ESP32 data
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                      <Typography variant="caption" display="block">
                        <strong>💡 Quick Test:</strong> After setting up, ESP32 devices should appear in the "Device Overview" tab above within 1-2 minutes if configured correctly.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ gap: 1 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={saveEsp32Settings}
                    startIcon={<SettingsIcon />}
                  >
                    Save Configuration
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={testESP32Connection}
                    disabled={testingConnection || !esp32Host}
                    startIcon={testingConnection ? <CircularProgress size={16} /> : <WifiIcon />}
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                </CardActions>
                
                {/* Test Connection Result */}
                {testConnectionResult && (
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Alert 
                      severity={testConnectionResult.type === 'success' ? 'success' : 'error'} 
                      onClose={() => setTestConnectionResult(null)}
                      sx={{ mb: 0 }}
                    >
                      <Typography variant="body2" gutterBottom>
                        {testConnectionResult.message}
                      </Typography>
                      {testConnectionResult.tips && testConnectionResult.tips.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            Troubleshooting Tips:
                          </Typography>
                          {testConnectionResult.tips.map((tip, index) => (
                            <Typography key={index} variant="caption" display="block" sx={{ ml: 1 }}>
                              • {tip}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  </Box>
                )}
              </Card>
            </Box>
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

      {/* Edit Device Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            Edit Device
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Device ID"
              value={editDevice.device_id}
              onChange={(e) => setEditDevice(prev => ({ ...prev, device_id: e.target.value }))}
              margin="normal"
              helperText="Unique identifier for this ESP32 device"
            />
            <TextField
              fullWidth
              label="Location"
              value={editDevice.location}
              onChange={(e) => setEditDevice(prev => ({ ...prev, location: e.target.value }))}
              margin="normal"
              helperText="Physical location of the device (e.g., Main Entrance, Back Door)"
            />
            <TextField
              fullWidth
              label="Description"
              value={editDevice.description}
              onChange={(e) => setEditDevice(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              helperText="Optional description or notes about this device"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateDevice}
            variant="contained"
            disabled={!editDevice.device_id || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <EditIcon />}
          >
            {loading ? 'Updating...' : 'Update Device'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1} color="error.main">
            <DeleteIcon />
            Delete Device
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All associated data for this device will be permanently removed.
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the following device?
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Device ID:</strong> {selectedDevice?.device_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Location:</strong> {selectedDevice?.location || 'Not specified'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {selectedDevice?.status || 'Unknown'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteDevice}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete Device'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ESP32DeviceManager;
