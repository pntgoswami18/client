import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  LinearProgress,
  Badge,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  FiberManualRecord as StatusIcon,
  Fingerprint as FingerprintIcon,
  LockOpen as UnlockIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Wifi as WifiIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const ESP32Monitor = ({ onUnsavedChanges, onSave }) => {
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const eventSourceRef = useRef(null);
  const maxEvents = 100;

  useEffect(() => {
    if (!isPaused) {
      connectToEventStream();
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isPaused]);

  useEffect(() => {
    // Fetch initial device statuses
    fetchDeviceStatuses();
    
    // Update device statuses every 30 seconds
    const statusInterval = setInterval(fetchDeviceStatuses, 30000);
    return () => clearInterval(statusInterval);
  }, []);

  const connectToEventStream = () => {
    // Note: In a real implementation, you'd set up Server-Sent Events (SSE) or WebSocket
    // For now, we'll simulate with polling
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/biometric/events?limit=10');
        const data = await response.json();
        
        if (data.success && data.events) {
          // Add new events to the beginning of the array
          setRealtimeEvents(prev => {
            const newEvents = data.events.filter(event => 
              !prev.some(existing => existing.id === event.id)
            );
            return [...newEvents, ...prev].slice(0, maxEvents);
          });
        }
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setIsConnected(false);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  };

  const fetchDeviceStatuses = async () => {
    try {
      const response = await fetch('/api/biometric/devices');
      const data = await response.json();
      
      if (data.success) {
        const statusMap = {};
        data.devices.forEach(device => {
          statusMap[device.device_id] = device;
        });
        setDeviceStatuses(statusMap);
      }
    } catch (error) {
      console.error('Failed to fetch device statuses:', error);
    }
  };

  const getEventIcon = (eventType, success) => {
    switch (eventType) {
      case 'checkin':
      case 'checkout':
        return success ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />;
      case 'enrollment':
        return <FingerprintIcon color="primary" />;
      case 'remote_unlock':
      case 'emergency_unlock':
        return <UnlockIcon color="warning" />;
      case 'heartbeat':
        return <StatusIcon color="success" />;
      default:
        return <TimelineIcon />;
    }
  };

  const getEventColor = (eventType, success) => {
    if (!success) return 'error';
    
    switch (eventType) {
      case 'checkin':
      case 'checkout':
        return 'success';
      case 'enrollment':
        return 'primary';
      case 'remote_unlock':
      case 'emergency_unlock':
        return 'warning';
      case 'heartbeat':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatEventMessage = (event) => {
    const deviceId = event.device_id || 'Unknown Device';
    const memberInfo = event.member_id ? ` (Member: ${event.member_id})` : '';
    
    switch (event.event_type) {
      case 'checkin':
        return `Member checked in at ${deviceId}${memberInfo}`;
      case 'checkout':
        return `Member checked out at ${deviceId}${memberInfo}`;
      case 'enrollment':
        return `Fingerprint enrolled at ${deviceId}${memberInfo}`;
      case 'remote_unlock':
        return `Door remotely unlocked at ${deviceId}`;
      case 'emergency_unlock':
        return `Emergency unlock at ${deviceId}`;
      case 'heartbeat':
        return `Device heartbeat from ${deviceId}`;
      default:
        return `${event.event_type} at ${deviceId}${memberInfo}`;
    }
  };

  const filteredEvents = realtimeEvents.filter(event => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'access') return ['checkin', 'checkout'].includes(event.event_type);
    if (eventFilter === 'security') return ['remote_unlock', 'emergency_unlock', 'failed_access'].includes(event.event_type);
    if (eventFilter === 'system') return ['heartbeat', 'enrollment'].includes(event.event_type);
    return event.event_type === eventFilter;
  });

  const getDeviceHealth = (device) => {
    if (!device || device.status !== 'online') return 0;
    
    let health = 100;
    const lastSeen = new Date(device.last_seen);
    const minutesAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60);
    
    // Reduce health based on last heartbeat
    if (minutesAgo > 5) health -= 20;
    if (minutesAgo > 10) health -= 30;
    
    // Consider signal strength
    if (device.deviceData?.wifi_rssi < -70) health -= 20;
    if (device.deviceData?.wifi_rssi < -80) health -= 30;
    
    // Consider memory usage
    if (device.deviceData?.free_heap < 50000) health -= 20;
    
    return Math.max(0, health);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Real-Time Device Monitor
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                icon={<NotificationsOffIcon />}
                checkedIcon={<NotificationsIcon />}
              />
            }
            label="Notifications"
          />
          <IconButton
            onClick={() => setIsPaused(!isPaused)}
            color={isPaused ? "error" : "success"}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
          <Chip
            icon={<StatusIcon />}
            label={isConnected ? "Connected" : "Disconnected"}
            color={isConnected ? "success" : "error"}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Device Status Grid */}
      <Grid container spacing={3} mb={4}>
        {Object.values(deviceStatuses).map((device) => {
          const health = getDeviceHealth(device);
          return (
            <Grid item xs={12} sm={6} md={4} key={device.device_id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3">
                      {device.device_id}
                    </Typography>
                    <Badge
                      badgeContent={device.status === 'online' ? '' : '!'}
                      color="error"
                      invisible={device.status === 'online'}
                    >
                      <Chip
                        size="small"
                        label={device.status}
                        color={device.status === 'online' ? 'success' : 'error'}
                      />
                    </Badge>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Health Score: {health}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={health}
                    color={health > 70 ? 'success' : health > 40 ? 'warning' : 'error'}
                    sx={{ mb: 2 }}
                  />
                  
                  {device.deviceData && (
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <WifiIcon fontSize="small" />
                        <Typography variant="body2">
                          {device.deviceData.wifi_rssi}dBm
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <MemoryIcon fontSize="small" />
                        <Typography variant="body2">
                          {Math.round(device.deviceData.free_heap / 1024)}KB free
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FingerprintIcon fontSize="small" />
                        <Typography variant="body2">
                          {device.deviceData.enrolled_prints || 0} enrolled
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Event Filter */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Live Events
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {['all', 'access', 'security', 'system'].map((filter) => (
            <Chip
              key={filter}
              label={filter.charAt(0).toUpperCase() + filter.slice(1)}
              onClick={() => setEventFilter(filter)}
              color={eventFilter === filter ? 'primary' : 'default'}
              variant={eventFilter === filter ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Real-time Events */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Event Stream
            <Chip
              size="small"
              label={`${filteredEvents.length} events`}
              sx={{ ml: 2 }}
            />
          </Typography>
          
          {isPaused && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Event monitoring is paused. Click the play button to resume.
            </Alert>
          )}
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredEvents.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No events"
                  secondary="Waiting for device activity..."
                />
              </ListItem>
            ) : (
              filteredEvents.map((event, index) => (
                <ListItem key={event.id || index} divider>
                  <ListItemIcon>
                    {getEventIcon(event.event_type, event.success)}
                  </ListItemIcon>
                  <ListItemText
                    primary={formatEventMessage(event)}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </Typography>
                        <Chip
                          size="small"
                          label={event.event_type}
                          color={getEventColor(event.event_type, event.success)}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ESP32Monitor;
