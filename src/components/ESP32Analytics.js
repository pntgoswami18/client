import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Fingerprint as FingerprintIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  DeviceHub as DeviceHubIcon,
  Wifi as WifiIcon,
  Memory as MemoryIcon,
  WarningAmber as WarningAmberIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const EVENT_LABELS = {
  enrollment: 'Enrollments',
  enrollment_failed: 'Enrollment Failures',
  manual_enrollment: 'Manual Enrollments',
  checkin: 'Check-ins',
  checkout: 'Check-outs',
  remote_unlock: 'Remote Unlocks',
  button_override: 'Button Overrides',
  emergency_unlock: 'Emergency Unlocks',
  heartbeat: 'Heartbeats',
  esp32_command: 'ESP32 Commands',
  access_denied: 'Access Denied',
};

const ALERT_EVENT_TYPES = new Set([
  'enrollment_failed',
  'access_denied',
  'esp32_command',
  'remote_unlock',
  'emergency_unlock',
]);

const getFriendlyLabel = (eventType) => {
  if (!eventType) {
    return 'Unknown';
  }
  if (EVENT_LABELS[eventType]) {
    return EVENT_LABELS[eventType];
  }
  return eventType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const safeParseDate = (value) => {
  if (!value) {
    return null;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    // Heuristic: treat seconds vs milliseconds epoch
    if (numeric > 1e12) {
      return new Date(numeric);
    }
    if (numeric > 1e9) {
      return new Date(numeric * 1000);
    }
  }

  return null;
};

const getRelativeTime = (timestamp) => {
  const parsed = safeParseDate(timestamp);
  if (!parsed) {
    return 'Unknown';
  }

  try {
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
};

const buildSummary = (events = [], devices = []) => {
  const totalEvents = events.length;
  const successCount = events.filter((event) => event.success).length;
  const failureCount = totalEvents - successCount;
  const successRate = totalEvents ? Math.round((successCount / totalEvents) * 100) : 0;

  const eventTypeStats = events.reduce((accumulator, event) => {
    const key = event.event_type || 'unknown';
    if (!accumulator[key]) {
      accumulator[key] = {
        eventType: key,
        label: getFriendlyLabel(key),
        total: 0,
        success: 0,
        failure: 0,
      };
    }
    accumulator[key].total += 1;
    if (event.success) {
      accumulator[key].success += 1;
    } else {
      accumulator[key].failure += 1;
    }
    return accumulator;
  }, {});

  const topEvents = Object.values(eventTypeStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const deviceEventStats = events.reduce((accumulator, event) => {
    const deviceId = event.device_id || 'unknown';
    if (!accumulator[deviceId]) {
      accumulator[deviceId] = {
        deviceId,
        total: 0,
        success: 0,
        failure: 0,
        lastEvent: null,
      };
    }
    accumulator[deviceId].total += 1;
    if (event.success) {
      accumulator[deviceId].success += 1;
    } else {
      accumulator[deviceId].failure += 1;
    }

    const parsedTimestamp = safeParseDate(event.timestamp);
    if (
      parsedTimestamp &&
      (!accumulator[deviceId].lastEvent || parsedTimestamp > accumulator[deviceId].lastEvent)
    ) {
      accumulator[deviceId].lastEvent = parsedTimestamp;
    }
    return accumulator;
  }, {});

  const devicesById = devices.reduce((accumulator, device) => {
    if (device?.device_id) {
      accumulator[device.device_id] = device;
    }
    return accumulator;
  }, {});

  const deviceStats = Object.values(deviceEventStats)
    .map((deviceStat) => {
      const deviceDetails = devicesById[deviceStat.deviceId] || {};
      return {
        ...deviceStat,
        status: deviceDetails.status,
        deviceData: deviceDetails.deviceData,
        lastSeen: deviceDetails.last_seen || deviceStat.lastEvent,
        eventCount24h: deviceDetails.event_count || deviceStat.total,
      };
    })
    .sort((a, b) => b.total - a.total);

  const enrollmentEvents = events.filter((event) =>
    ['enrollment', 'enrollment_failed', 'manual_enrollment'].includes(event.event_type),
  );
  const enrollmentSuccess = enrollmentEvents.filter((event) => event.success).length;
  const enrollmentTotal = enrollmentEvents.length;
  const enrollmentSuccessRate = enrollmentTotal
    ? Math.round((enrollmentSuccess / enrollmentTotal) * 100)
    : null;

  const recentAlerts = events
    .filter(
      (event) =>
        !event.success ||
        ALERT_EVENT_TYPES.has(event.event_type) ||
        (event.error_message && event.error_message.trim()),
    )
    .slice(0, 10);

  const lastEvent = events.length
    ? events
        .map((event) => safeParseDate(event.timestamp))
        .filter(Boolean)
        .sort((a, b) => b - a)[0]
    : null;

  return {
    totals: {
      totalEvents,
      successCount,
      failureCount,
      successRate,
      lastEvent,
    },
    topEvents,
    deviceStats,
    enrollment: {
      total: enrollmentTotal,
      success: enrollmentSuccess,
      successRate: enrollmentSuccessRate,
    },
    recentAlerts,
  };
};

const StatusChip = ({ label, color, icon }) => (
  <Chip
    icon={icon}
    label={label}
    color={color}
    size="small"
    sx={{ textTransform: 'capitalize', fontWeight: 500 }}
  />
);

const StatCard = ({ title, value, icon, iconColor = 'primary.main', helperText }) => (
  <Card>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            backgroundColor: `${iconColor}22`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" component="p">
            {value}
          </Typography>
          {helperText && (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const DeviceHealthBar = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value));
  let color = 'success';
  if (clamped < 40) {
    color = 'error';
  } else if (clamped < 70) {
    color = 'warning';
  }
  return (
    <LinearProgress
      variant="determinate"
      value={clamped}
      color={color}
      sx={{ height: 8, borderRadius: 4 }}
    />
  );
};

const ESP32Analytics = ({ onUnsavedChanges, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    if (onUnsavedChanges) {
      onUnsavedChanges(false);
    }
    if (onSave) {
      onSave();
    }
  }, [onUnsavedChanges, onSave]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsResponse, devicesResponse] = await Promise.all([
        axios.get('/api/biometric/events', {
          params: { limit: 250 },
        }),
        axios.get('/api/biometric/devices'),
      ]);

      const fetchedEvents =
        eventsResponse?.data?.data || eventsResponse?.data?.events || [];
      const fetchedDevices = devicesResponse?.data?.devices || [];

      setEvents(fetchedEvents);
      setDevices(fetchedDevices);
    } catch (fetchError) {
      console.error('Failed to load analytics data', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          'Failed to load analytics data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => buildSummary(events, devices), [events, devices]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading device analytics…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadData} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Device Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Insight into ESP32 biometric device performance, usage trends, and alerting events.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Events (24h window)"
            value={summary.totals.totalEvents}
            icon={<AnalyticsIcon />}
            helperText={
              summary.totals.lastEvent
                ? `Last event ${getRelativeTime(summary.totals.lastEvent)}`
                : 'No recent events'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={`${summary.totals.successRate}%`}
            icon={<BarChartIcon />}
            iconColor="success.main"
            helperText={`${summary.totals.successCount} success • ${summary.totals.failureCount} failure`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Enrollment Success"
            value={
              summary.enrollment.successRate !== null
                ? `${summary.enrollment.successRate}%`
                : 'No data'
            }
            icon={<FingerprintIcon />}
            iconColor="primary.main"
            helperText={
              summary.enrollment.total
                ? `${summary.enrollment.success}/${summary.enrollment.total} successful`
                : 'No enrollment attempts recorded'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tracked Devices"
            value={Math.max(summary.deviceStats.length, devices.length)}
            icon={<DeviceHubIcon />}
            iconColor="info.main"
            helperText="Devices reporting in the last 24 hours"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event Mix
              </Typography>
              {summary.topEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No biometric events recorded for the selected window.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {summary.topEvents.map((eventStat) => {
                    const successRate = eventStat.total
                      ? Math.round((eventStat.success / eventStat.total) * 100)
                      : 0;
                    const progressColor =
                      successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error';
                    return (
                      <Box key={eventStat.eventType}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">{eventStat.label}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {eventStat.total} events
                            </Typography>
                            <StatusChip
                              label={`${successRate}% success`}
                              color={progressColor}
                              icon={<TimelineIcon fontSize="small" />}
                            />
                          </Stack>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={successRate}
                          color={progressColor}
                          sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts & Exceptions
              </Typography>
              {summary.recentAlerts.length === 0 ? (
                <Alert severity="success" icon={<SuccessIcon fontSize="small" />}>
                  No alert-worthy events detected in the sampled window.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {summary.recentAlerts.slice(0, 6).map((event) => {
                    const isFailure = !event.success;
                    const label = getFriendlyLabel(event.event_type);
                    const description = event.error_message || event.message || '';
                    return (
                      <Box
                        key={`${event.id}-${event.timestamp}-${event.event_type}`}
                        sx={{
                          border: '1px solid',
                          borderColor: isFailure ? 'error.light' : 'warning.light',
                          borderRadius: 2,
                          p: 2,
                          backgroundColor: isFailure ? '#ffebee' : '#fff8e1',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <WarningAmberIcon
                            color={isFailure ? 'error' : 'warning'}
                            fontSize="small"
                          />
                          <Typography variant="subtitle2">{label}</Typography>
                          <StatusChip
                            label={event.success ? 'Success' : 'Failed'}
                            color={event.success ? 'success' : 'error'}
                            icon={
                              event.success ? (
                                <SuccessIcon fontSize="small" />
                              ) : (
                                <ErrorIcon fontSize="small" />
                              )
                            }
                          />
                          {event.device_id && (
                            <Chip
                              label={event.device_id}
                              size="small"
                              variant="outlined"
                              icon={<DeviceHubIcon fontSize="small" />}
                            />
                          )}
                        </Stack>
                        <Typography variant="body2">
                          {description || 'No additional details provided.'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getRelativeTime(event.timestamp)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom>
        Device Performance
      </Typography>
      {summary.deviceStats.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No device activity was detected in the sampled window.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {summary.deviceStats.map((device) => {
            const successRate = device.total
              ? Math.round((device.success / device.total) * 100)
              : 0;
            const lastSeenLabel = getRelativeTime(device.lastSeen);
            const wifiRssi = device.deviceData?.wifi_rssi;
            const freeHeap = device.deviceData?.free_heap;
            const healthScore = device.deviceData?.healthScore ?? successRate;

            return (
              <Grid item xs={12} md={6} lg={4} key={device.deviceId}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{device.deviceId}</Typography>
                      <StatusChip
                        label={device.status || 'Unknown'}
                        color={device.status === 'online' ? 'success' : 'default'}
                        icon={<DeviceHubIcon fontSize="small" />}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Last heard {lastSeenLabel}
                    </Typography>

                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Success rate</Typography>
                          <Typography variant="body2">{successRate}%</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={successRate}
                          color={successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error'}
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                        />
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Overall health</Typography>
                          <Typography variant="body2">{Math.round(healthScore)}%</Typography>
                        </Stack>
                        <DeviceHealthBar value={healthScore} />
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Signal strength (RSSI)">
                          <Chip
                            icon={<WifiIcon fontSize="small" />}
                            label={
                              wifiRssi !== undefined ? `${wifiRssi} dBm` : 'Signal: unknown'
                            }
                            variant="outlined"
                            size="small"
                          />
                        </Tooltip>
                        <Tooltip title="Free heap memory">
                          <Chip
                            icon={<MemoryIcon fontSize="small" />}
                            label={
                              freeHeap !== undefined
                                ? `${Math.round(freeHeap / 1024)} KB free`
                                : 'Memory: unknown'
                            }
                            variant="outlined"
                            size="small"
                          />
                        </Tooltip>
                        <Tooltip title="Events recorded in the last 24h">
                          <Chip
                            icon={<TimelineIcon fontSize="small" />}
                            label={`${device.total} events`}
                            size="small"
                          />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default ESP32Analytics;
