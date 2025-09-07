import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShimmer } from './ShimmerLoader';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { formatDistanceToNow, subDays } from 'date-fns';

const ESP32Analytics = ({ onUnsavedChanges, onSave }) => {
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [devices, setDevices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/biometric/devices');
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      setError('Failed to fetch devices: ' + error.message);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = getPeriodStartDate(selectedPeriod);
      
      // Fetch events for the selected period and device
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000
      });
      
      if (selectedDevice !== 'all') {
        params.append('deviceId', selectedDevice);
      }
      
      const response = await fetch(`/api/biometric/events?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const processedAnalytics = processAnalyticsData(data.events || [], startDate, endDate);
        setAnalytics(processedAnalytics);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch analytics: ' + error.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedDevice]);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      fetchAnalytics();
    }
  }, [selectedDevice, selectedPeriod, devices, fetchAnalytics]);

  const getPeriodStartDate = (period) => {
    const now = new Date();
    switch (period) {
      case '24hours':
        return subDays(now, 1);
      case '7days':
        return subDays(now, 7);
      case '30days':
        return subDays(now, 30);
      case '90days':
        return subDays(now, 90);
      default:
        return subDays(now, 7);
    }
  };

  const processAnalyticsData = (events, startDate, endDate) => {
    // Filter ESP32 events
    const esp32Events = events.filter(event => 
      event.device_id && event.device_id.includes('DOOR')
    );

    // Group events by type
    const eventsByType = esp32Events.reduce((acc, event) => {
      if (!acc[event.event_type]) {
        acc[event.event_type] = [];
      }
      acc[event.event_type].push(event);
      return acc;
    }, {});

    // Calculate metrics
    const totalAccess = (eventsByType.checkin || []).length + (eventsByType.checkout || []).length;
    const successfulAccess = esp32Events.filter(event => 
      ['checkin', 'checkout'].includes(event.event_type) && event.success
    ).length;
    const failedAccess = esp32Events.filter(event => 
      ['checkin', 'checkout'].includes(event.event_type) && !event.success
    ).length;
    
    const enrollments = (eventsByType.enrollment || []).length;
    const remoteUnlocks = (eventsByType.remote_unlock || []).length;
    const emergencyUnlocks = (eventsByType.emergency_unlock || []).length;

    // Calculate success rate
    const successRate = totalAccess > 0 ? (successfulAccess / totalAccess) * 100 : 0;

    // Device performance
    const devicePerformance = calculateDevicePerformance(esp32Events);

    // Peak hours analysis
    const peakHours = calculatePeakHours(esp32Events);

    // Recent security events
    const securityEvents = esp32Events.filter(event => 
      ['remote_unlock', 'emergency_unlock', 'failed_access'].includes(event.event_type)
    ).slice(0, 10);

    // Member usage statistics
    const memberUsage = calculateMemberUsage(esp32Events);

    return {
      totalAccess,
      successfulAccess,
      failedAccess,
      successRate,
      enrollments,
      remoteUnlocks,
      emergencyUnlocks,
      devicePerformance,
      peakHours,
      securityEvents,
      memberUsage,
      period: selectedPeriod,
      dateRange: { startDate, endDate }
    };
  };

  const calculateDevicePerformance = (events) => {
    const deviceStats = {};
    
    events.forEach(event => {
      if (!deviceStats[event.device_id]) {
        deviceStats[event.device_id] = {
          deviceId: event.device_id,
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          lastSeen: null
        };
      }
      
      deviceStats[event.device_id].totalEvents++;
      
      if (event.success) {
        deviceStats[event.device_id].successfulEvents++;
      } else {
        deviceStats[event.device_id].failedEvents++;
      }
      
      const eventTime = new Date(event.timestamp);
      if (!deviceStats[event.device_id].lastSeen || eventTime > deviceStats[event.device_id].lastSeen) {
        deviceStats[event.device_id].lastSeen = eventTime;
      }
    });

    return Object.values(deviceStats).map(device => ({
      ...device,
      successRate: device.totalEvents > 0 ? (device.successfulEvents / device.totalEvents) * 100 : 0
    }));
  };

  const calculatePeakHours = (events) => {
    const hourCounts = {};
    
    events.forEach(event => {
      if (['checkin', 'checkout'].includes(event.event_type)) {
        const hour = new Date(event.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateMemberUsage = (events) => {
    const memberStats = {};
    
    events.forEach(event => {
      if (event.member_id && ['checkin', 'checkout'].includes(event.event_type)) {
        if (!memberStats[event.member_id]) {
          memberStats[event.member_id] = {
            memberId: event.member_id,
            checkins: 0,
            checkouts: 0,
            lastVisit: null
          };
        }
        
        if (event.event_type === 'checkin') {
          memberStats[event.member_id].checkins++;
        } else {
          memberStats[event.member_id].checkouts++;
        }
        
        const eventTime = new Date(event.timestamp);
        if (!memberStats[event.member_id].lastVisit || eventTime > memberStats[event.member_id].lastVisit) {
          memberStats[event.member_id].lastVisit = eventTime;
        }
      }
    });

    return Object.values(memberStats)
      .map(member => ({
        ...member,
        totalVisits: member.checkins
      }))
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 10);
  };

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <TimelineIcon />;
    }
  };

  if (loading && !analytics) {
    return <DashboardShimmer />;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
        <Typography variant="h4" component="h1">
          ESP32 Device Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Device</InputLabel>
            <Select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <MenuItem value="all">All Devices</MenuItem>
              {devices.map((device) => (
                <MenuItem key={device.device_id} value={device.device_id}>
                  {device.device_id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="24hours">24 Hours</MenuItem>
              <MenuItem value="7days">7 Days</MenuItem>
              <MenuItem value="30days">30 Days</MenuItem>
              <MenuItem value="90days">90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {analytics && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.totalAccess}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Access Attempts
                      </Typography>
                    </Box>
                    <AccessTimeIcon color="primary" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.successRate.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Success Rate
                      </Typography>
                    </Box>
                    {analytics.successRate >= 95 ? 
                      <TrendingUpIcon color="success" fontSize="large" /> :
                      <TrendingDownIcon color="warning" fontSize="large" />
                    }
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.successRate}
                    color={analytics.successRate >= 95 ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.enrollments}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New Enrollments
                      </Typography>
                    </Box>
                    <PeopleIcon color="info" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.remoteUnlocks + analytics.emergencyUnlocks}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remote Unlocks
                      </Typography>
                    </Box>
                    <SecurityIcon color="warning" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Device Performance */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Device Performance
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Device ID</TableCell>
                          <TableCell align="right">Events</TableCell>
                          <TableCell align="right">Success Rate</TableCell>
                          <TableCell align="right">Last Seen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.devicePerformance.map((device) => (
                          <TableRow key={device.deviceId}>
                            <TableCell>{device.deviceId}</TableCell>
                            <TableCell align="right">{device.totalEvents}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${device.successRate.toFixed(1)}%`}
                                color={device.successRate >= 95 ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {device.lastSeen ? 
                                formatDistanceToNow(device.lastSeen, { addSuffix: true }) : 
                                'Never'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Peak Access Hours
                  </Typography>
                  <List>
                    {analytics.peakHours.map((peak, index) => (
                      <ListItem key={peak.hour}>
                        <ListItemIcon>
                          <Typography variant="h6" color="primary">
                            #{index + 1}
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={`${formatHour(peak.hour)} - ${formatHour(peak.hour + 1)}`}
                          secondary={`${peak.count} access attempts`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Security Events and Member Usage */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Security Events
                  </Typography>
                  <List>
                    {analytics.securityEvents.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="No security events recorded" />
                      </ListItem>
                    ) : (
                      analytics.securityEvents.map((event, index) => (
                        <React.Fragment key={event.id || index}>
                          <ListItem>
                            <ListItemIcon>
                              {getStatusIcon(event.success ? 'success' : 'failed')}
                            </ListItemIcon>
                            <ListItemText
                              primary={event.event_type.replace('_', ' ').toUpperCase()}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Device: {event.device_id}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < analytics.securityEvents.length - 1 && <Divider />}
                        </React.Fragment>
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
                    Top Member Usage
                  </Typography>
                  <List>
                    {analytics.memberUsage.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="No member usage data" />
                      </ListItem>
                    ) : (
                      analytics.memberUsage.map((member, index) => (
                        <React.Fragment key={member.memberId}>
                          <ListItem>
                            <ListItemIcon>
                              <Typography variant="h6" color="primary">
                                #{index + 1}
                              </Typography>
                            </ListItemIcon>
                            <ListItemText
                              primary={`Member ${member.memberId}`}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    {member.totalVisits} visits
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Last visit: {member.lastVisit ? 
                                      formatDistanceToNow(member.lastVisit, { addSuffix: true }) : 
                                      'Never'
                                    }
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < analytics.memberUsage.length - 1 && <Divider />}
                        </React.Fragment>
                      ))
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default ESP32Analytics;
