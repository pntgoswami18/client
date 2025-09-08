import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { List as VirtualList } from 'react-window';
import { ListShimmer, FormShimmer } from './ShimmerLoader';
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
  Checkbox,
  InputAdornment,
  IconButton,
  Pagination,
  CircularProgress
} from '@mui/material';
import SearchableMemberDropdown from './SearchableMemberDropdown';
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
  Delete as DeleteIcon,
  Star as StarIcon,
  Search as SearchIcon,
  Clear as ClearIcon
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
  
  // Individual button loading states
  const [buttonLoading, setButtonLoading] = useState({
    enroll: new Set(), // Set of member IDs being enrolled
    manual: new Set(), // Set of member IDs with manual enrollment loading
    delete: new Set(), // Set of member IDs being deleted
    reenroll: new Set(), // Set of member IDs being re-enrolled
    cancel: false, // Global cancel loading state
    stop: false, // Global stop loading state
    deleteConfirm: false // Delete confirmation dialog loading
  });
  
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
  
  // Pagination state
  const [membersWithoutBiometricPage, setMembersWithoutBiometricPage] = useState(1);
  const [membersWithBiometricPage, setMembersWithBiometricPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    membersWithoutBiometric: { total: 0, page: 1, limit: 10, totalPages: 0 },
    membersWithBiometric: { total: 0, page: 1, limit: 10, totalPages: 0 },
    events: { total: 0, page: 1, limit: 10, totalPages: 0 }
  });
  
  // Event caching for performance
  const [eventCache, setEventCache] = useState(new Map());
  const [lastFetchParams, setLastFetchParams] = useState(null);
  
  // WebSocket connection for real-time updates
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  
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

  // Member search state
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const enrollmentSteps = [
    'Select Member',
    'Select Device', 
    'Start Enrollment',
    'Complete Enrollment'
  ];

  // Add refs for request cancellation
  const abortControllerRef = useRef(null);

  // Define callback functions first
  const fetchMembersWithoutBiometric = useCallback(async (page = 1, limit = 10, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search || ''
      });
      
      const response = await fetch(`/api/biometric/members/without-biometric?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
        setPaginationMeta(prev => ({
          ...prev,
          membersWithoutBiometric: data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
        }));
        console.log(`Loaded ${data.data?.length || 0} members without biometric data (page ${page})`);
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
  const fetchMembersWithBiometric = useCallback(async (page = 1, limit = 10, search = '') => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search || ''
      });
      
      const response = await fetch(`/api/biometric/members/with-biometric?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMembersWithBiometric(data.data || []);
        setPaginationMeta(prev => ({
          ...prev,
          membersWithBiometric: data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
        }));
        console.log(`Loaded ${data.data?.length || 0} members with biometric data (page ${page})`);
      } else {
        console.error('API returned error:', data.message);
        setError(`Failed to load members with biometric: ${data.message}`);
        setMembersWithBiometric([]); // Set empty array as fallback
      }
    } catch (error) {
      // Ignore aborted requests
      if (error.name === 'AbortError') {
        return;
      }
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
          if (data.status.status === 'completed' || data.status.endReason === 'success') {
            setSuccess('Fingerprint enrollment completed successfully!');
            setEnrollmentProgress(null);
            setActiveStep(3);
            fetchMembersWithoutBiometric(); // Refresh members list
          } else if (data.status.status === 'failed' || data.status.endReason === 'max_attempts' || data.status.endReason === 'error') {
            setSuccess(null); // Clear the enrollment started message
            setError('Fingerprint enrollment failed: ' + (data.status.message || 'Maximum attempts reached or error occurred'));
            setEnrollmentProgress(null);
            setActiveStep(0);
          } else if (data.status.endReason === 'cancelled') {
            setSuccess(null); // Clear the enrollment started message
            setError('Fingerprint enrollment was cancelled.');
            setEnrollmentProgress(null);
            setActiveStep(0);
          } else if (data.status.currentStep) {
            // Show progress update
            setEnrollmentProgress(data.status);
            setSuccess(`🔄 Enrollment in progress: ${data.status.currentStep}`);
          } else {
            setEnrollmentProgress(data.status);
          }
        }
      }
      
      // Check individual member enrollment progress
      if (ongoingEnrollment) {
        const response = await fetch(`/api/biometric/events?limit=10&memberId=${ongoingEnrollment.memberId}`);
        const data = await response.json();
        
        if (data.success && data.data.events) {
          // Look for recent enrollment events for this member
          const recentEvents = data.data.events.filter(event => 
            (event.event_type === 'enrollment' || event.event_type === 'enrollment_progress' || event.event_type === 'enrollment_failed' || event.event_type === 'enrollment_cancelled') &&
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
            } else if (latestEvent.event_type === 'enrollment_progress') {
              // Reset the timeout timer since we received a progress update
              // This means the enrollment is still active
              setSuccess(`🔄 Enrollment in progress: ${latestEvent.raw_data ? JSON.parse(latestEvent.raw_data).enrollmentStep || 'scanning' : 'scanning'}`);
            } else if (latestEvent.event_type === 'enrollment_cancelled') {
              setSuccess(`⏹️ Enrollment cancelled for ${ongoingEnrollment.memberName}.`);
              setOngoingEnrollment(null);
            } else if (latestEvent.event_type === 'enrollment_failed' || !latestEvent.success) {
              setSuccess(null); // Clear the enrollment started message
              setError(`❌ Fingerprint enrollment failed for ${ongoingEnrollment.memberName}. Please try again. Make sure the finger is clean and placed firmly on the scanner.`);
              setOngoingEnrollment(null);
            }
          }
          
          // Auto-timeout after 3 minutes (increased from 2 minutes)
          // But only if no progress events have been received recently
          const enrollmentAge = Date.now() - new Date(ongoingEnrollment.startTime).getTime();
          const hasRecentProgress = recentEvents.some(event => 
            event.event_type === 'enrollment_progress' && 
            new Date(event.timestamp) > new Date(Date.now() - 60000) // Progress in last minute
          );
          
          if (enrollmentAge > 180000 && !hasRecentProgress) { // 3 minutes and no recent progress
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

  const fetchBiometricEvents = useCallback(async (page = eventsPage, limit = itemsPerPage, search = eventSearchTerm) => {
    try {
      const cacheKey = `${page}-${limit}-${search || ''}`;
      
      // Check cache first
      if (eventCache.has(cacheKey) && lastFetchParams === cacheKey) {
        const cachedData = eventCache.get(cacheKey);
        setBiometricEvents(cachedData.events);
        setPaginationMeta(prev => ({
          ...prev,
          events: cachedData.pagination
        }));
        return;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search || ''
      });
      
      const response = await fetch(`/api/biometric/events?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        const events = data.data || [];
        const pagination = data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
        
        setBiometricEvents(events);
        setPaginationMeta(prev => ({
          ...prev,
          events: pagination
        }));
        
        // Cache the results
        setEventCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, { events, pagination });
          // Limit cache size to prevent memory issues
          if (newCache.size > 10) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          return newCache;
        });
        setLastFetchParams(cacheKey);
      } else {
        setBiometricEvents([]);
      }
    } catch (error) {
      console.error('Error fetching biometric events:', error);
      setBiometricEvents([]);
    }
  }, [eventsPage, itemsPerPage, eventSearchTerm, eventCache, lastFetchParams]);

  // Pagination handlers
  const handleMembersWithoutBiometricPageChange = (event, page) => {
    setMembersWithoutBiometricPage(page);
    fetchMembersWithoutBiometric(page, itemsPerPage, memberSearchTerm);
  };

  const handleMembersWithBiometricPageChange = (event, page) => {
    setMembersWithBiometricPage(page);
    fetchMembersWithBiometric(page, itemsPerPage, memberSearchTerm);
  };

  const handleEventsPageChange = (event, page) => {
    setEventsPage(page);
    fetchBiometricEvents(page, itemsPerPage, eventSearchTerm);
  };

  const handleItemsPerPageChange = (event) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setItemsPerPage(newItemsPerPage);
    setMembersWithoutBiometricPage(1);
    setMembersWithBiometricPage(1);
    setEventsPage(1);
    fetchMembersWithoutBiometric(1, newItemsPerPage, memberSearchTerm);
    fetchMembersWithBiometric(1, newItemsPerPage, memberSearchTerm);
    fetchBiometricEvents(1, newItemsPerPage, eventSearchTerm);
  };

  // Debounced search for members to improve performance
  const [debouncedMemberSearchTerm, setDebouncedMemberSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearchTerm(memberSearchTerm);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [memberSearchTerm]);
  
  // Load initial data on component mount
  useEffect(() => {
    // Simple approach - just load members without biometric first
    fetchMembersWithoutBiometric(1, 10, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only on mount

  // Update members when debounced search term changes
  useEffect(() => {
    setMembersWithoutBiometricPage(1);
    setMembersWithBiometricPage(1);
    fetchMembersWithoutBiometric(1, itemsPerPage, debouncedMemberSearchTerm);
    fetchMembersWithBiometric(1, itemsPerPage, debouncedMemberSearchTerm);
  }, [debouncedMemberSearchTerm, itemsPerPage, fetchMembersWithoutBiometric, fetchMembersWithBiometric]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleMemberSearchChange = (event) => {
    const newSearchTerm = event.target.value;
    setMemberSearchTerm(newSearchTerm);
    // API calls will be triggered by debounced effect
  };

  // Debounced search for better performance
  const [debouncedEventSearchTerm, setDebouncedEventSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEventSearchTerm(eventSearchTerm);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [eventSearchTerm]);
  
  // Update events when debounced search term changes
  useEffect(() => {
    if (debouncedEventSearchTerm !== eventSearchTerm) {
      setEventsPage(1);
      fetchBiometricEvents(1, itemsPerPage, debouncedEventSearchTerm);
    }
  }, [debouncedEventSearchTerm, itemsPerPage, fetchBiometricEvents, eventSearchTerm]);

  const handleEventSearchChange = (event) => {
    const newSearchTerm = event.target.value;
    setEventSearchTerm(newSearchTerm);
    // API call will be triggered by debounced effect
  };

  // Memoized event type filter options for performance
  const eventTypeFilterOptions = useMemo(() => {
    return Object.entries(eventTypeFilters).map(([eventType, isChecked]) => ({
      eventType,
      isChecked,
      label: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }, [eventTypeFilters]);

  // Memoized formatDateTime function for performance
  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) {
      return '';
    }
    try {
      return new Date(dateStr).toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  }, []);

  // Function to format event messages based on event type and reason
  const formatEventMessage = useCallback((event) => {
    const rawData = event.raw_data ? JSON.parse(event.raw_data) : {};
    const { reason } = rawData;
    
    switch (event.event_type) {
      case 'button_override':
        return 'Door unlocked via physical button override';
      case 'remote_unlock':
        if (reason && reason !== 'admin_unlock') {
          return `Door unlocked remotely - Reason: ${reason}`;
        } else {
          return 'Door unlocked remotely - Admin override';
        }
      case 'checkin':
        return `Member check-in - ${event.member_name || 'Unknown'}`;
      case 'enrollment':
        return `Fingerprint enrollment - ${event.member_name || 'Unknown'}`;
      case 'access_denied':
        return `Access denied - ${event.member_name || 'Unknown'}`;
      default:
        return `${event.event_type} - ${event.member_name || 'Unknown'}`;
    }
  }, []);

  // Memoized event item component for virtual scrolling performance
  const EventItem = useCallback(({ index, style, data }) => {
    const event = data[index];
    if (!event) {
      return null;
    }
    
    return (
      <div style={style}>
        <ListItem divider>
          <ListItemIcon>
            <Chip
              size="small"
              label={event.success ? 'Success' : 'Error'}
              color={event.success ? 'success' : 'error'}
            />
          </ListItemIcon>
          <ListItemText
            primary={formatEventMessage(event)}
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
      </div>
    );
  }, [formatDateTime, formatEventMessage]);

  // Event filter handling
  const handleEventFilterChange = (eventType, checked) => {
    setEventTypeFilters(prev => ({
      ...prev,
      [eventType]: checked
    }));
  };

  // Filter events based on selected event types - Memoized for performance
  const filteredBiometricEvents = useMemo(() => {
    return biometricEvents.filter(event => {
    return eventTypeFilters[event.event_type] !== false;
  });
  }, [biometricEvents, eventTypeFilters]);

  // Fetch data on component mount
  useEffect(() => {
    fetchMembersWithoutBiometric();
    fetchMembersWithBiometric();
    fetchDevices();
    fetchSystemStatus();
    fetchEnrollmentStatus();
    fetchBiometricEvents();
    
    // Set up WebSocket connection for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '3001';
    const wsUrl = `${protocol}//${window.location.hostname}:${backendPort}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('🔌 WebSocket connected for real-time enrollment updates');
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 WebSocket message received:', data);
        
        if (data.type === 'enrollment_started') {
          setSuccess(`📱 Enrollment started for ${data.memberName}. Please place your finger on the biometric device.`);
          setOngoingEnrollment({
            memberId: data.memberId,
            memberName: data.memberName,
            startTime: new Date().toISOString()
          });
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
            setSuccess(message);
          } else if (data.status === 'retry') {
            setSuccess(`🔄 ${data.message}`);
          }
        } else if (data.type === 'enrollment_complete') {
          if (data.status === 'success') {
            setSuccess(`🎉 ${data.memberName} has been successfully enrolled! They can now use their fingerprint to access the gym.`);
            setOngoingEnrollment(null);
            fetchMembersWithoutBiometric(); // Refresh members list
          } else if (data.status === 'failed') {
            // Check if this is a retryable failure
            const retryableErrors = ['timeout_first_finger', 'timeout_second_finger', 'timeout_finger_removal', 'imaging_error', 'prints_mismatch', 'communication_error'];
            const isRetryable = retryableErrors.some(error => data.message?.includes(error));
            
            if (isRetryable) {
              setError(`❌ Enrollment failed for ${data.memberName}: ${data.message}. You can retry enrollment by clicking the enroll button again.`);
            } else {
              setError(`❌ Enrollment failed for ${data.memberName}: ${data.message}`);
            }
            setOngoingEnrollment(null);
          } else if (data.status === 'cancelled') {
            setSuccess(`⏹️ Enrollment cancelled for ${data.memberName}.`);
            setOngoingEnrollment(null);
          } else if (data.status === 'error') {
            setError(`❌ Enrollment error for ${data.memberName}: ${data.message}`);
            setOngoingEnrollment(null);
          }
        } else if (data.type === 'enrollment_stopped' && data.reason !== 'success') {
          setSuccess(null);
          setError(`⏹️ Enrollment stopped for ${data.memberName}: ${data.reason}`);
          setOngoingEnrollment(null);
        } else if (data.type === 'whatsapp_welcome_sent') {
          setSuccess(`📱 WhatsApp welcome message prepared for ${data.memberName}! The message is ready to be sent.`);
        } else if (data.type === 'whatsapp_welcome_failed') {
          setError(`📱 WhatsApp welcome message failed for ${data.memberName}: ${data.error}`);
        } else if (data.type === 'whatsapp_welcome_error') {
          setError(`📱 WhatsApp welcome message error for member ${data.memberId}: ${data.error}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setWsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };
    
    // Poll enrollment status every 2 seconds (fallback)
    const interval = setInterval(() => {
      fetchEnrollmentStatus();
      checkEnrollmentProgress();
    }, 2000);

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [checkEnrollmentProgress, fetchMembersWithoutBiometric, fetchMembersWithBiometric, fetchDevices, fetchSystemStatus, fetchEnrollmentStatus, fetchBiometricEvents]);

  // Helper functions for individual button loading states
  const setButtonLoadingState = (action, memberId = null, isLoading = true) => {
    setButtonLoading(prev => {
      const newState = { ...prev };
      if (memberId !== null) {
        if (isLoading) {
          newState[action].add(memberId);
        } else {
          newState[action].delete(memberId);
        }
      } else {
        newState[action] = isLoading;
      }
      return newState;
    });
  };

  const isButtonLoading = (action, memberId = null) => {
    if (memberId !== null) {
      return buttonLoading[action].has(memberId);
    }
    return buttonLoading[action];
  };

  const startEnrollment = async (memberId, deviceId = null) => {
    if (deviceId && (!selectedMember || !selectedDevice)) {
      setError('Please select both a member and device');
      return;
    }
    
    // Determine if this is a re-enrollment by checking if member has biometric data
    const member = membersWithBiometric.find(m => m.id === parseInt(memberId));
    const isReenrollment = !!member;
    const loadingKey = isReenrollment ? 'reenroll' : 'enroll';
    
    setButtonLoadingState(loadingKey, memberId, true);
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
      setButtonLoadingState(loadingKey, memberId, false);
    }
  };

  const startDeviceEnrollment = async () => {
    await startEnrollment(selectedMember, selectedDevice);
  };

  const stopEnrollment = async () => {
    setButtonLoadingState('stop', null, true);
    setError(null);

    try {
      const response = await fetch('/api/biometric/enrollment/stop', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        const memberName = ongoingEnrollment?.memberName || 'the member';
        setSuccess(`⏹️ Enrollment manually aborted for ${memberName}. You can retry enrollment anytime.`);
        setOngoingEnrollment(null);
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
      setButtonLoadingState('stop', null, false);
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
    setButtonLoadingState('deleteConfirm', null, true);
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
      setButtonLoadingState('deleteConfirm', null, false);
    }
  };

  const cancelOngoingEnrollment = async () => {
    if (!ongoingEnrollment) {
      return;
    }
    
    setButtonLoadingState('cancel', null, true);
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
      setButtonLoadingState('cancel', null, false);
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

    setButtonLoadingState('manual', manualMember, true);
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
      setButtonLoadingState('manual', manualMember, false);
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
              <SearchableMemberDropdown
                value={selectedMember}
                onChange={(e) => {
                  setSelectedMember(e.target.value);
                  if (e.target.value) {
                    setActiveStep(1);
                  }
                }}
                members={members}
                label="Select Member"
                placeholder="Search members by name, ID, or phone..."
                showId={true}
                showEmail={false}
                showAdminIcon={true}
                sx={{ mb: 2 }}
              />
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
              disabled={isButtonLoading('enroll', selectedMember)}
                    startIcon={isButtonLoading('enroll', selectedMember) ? <CircularProgress size={16} /> : <FingerprintIcon />}
                  >
                    {isButtonLoading('enroll', selectedMember) ? 'Starting...' : 'Start Fingerprint Enrollment'}
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
    <Box sx={{ 
      maxWidth: 'none', 
      mx: 0, 
      px: 0,
      position: 'relative'
    }}>
      {/* Header with Tabs and Status Cards */}
      <Box sx={{ mb: 3 }}>
        {/* Title */}
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Biometric Management
        </Typography>
        
        {/* Combined Tabs and Status Cards Row */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Tabs Section */}
          <Box sx={{ flex: 1 }}>
            <Paper>
              <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                <Tab icon={<PersonIcon />} label="Members" />
                <Tab icon={<DeviceIcon />} label="Devices" />
                <Tab icon={<HistoryIcon />} label="Events" />
              </Tabs>
            </Paper>
      </Box>

          {/* Status Cards Section */}
          <Box sx={{ display: 'flex', gap: 2, minWidth: '700px' }}>
            {/* Service Status Card */}
            <Card sx={{ minHeight: '48px', flex: 1, minWidth: '320px' }}>
              <CardContent sx={{ py: 1.5, px: 3, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center">
                    <MonitorIcon color="primary" sx={{ mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Service Status
                </Typography>
              </Box>
              <Chip
                label={systemStatus?.biometricServiceAvailable ? 'Online' : 'Offline'}
                color={systemStatus?.biometricServiceAvailable ? 'success' : 'error'}
                    size="small"
              />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  label={wsConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
                  color={wsConnected ? 'success' : 'warning'}
                  size="small"
                  icon={wsConnected ? <DeviceIcon /> : <WarningIcon />}
                />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: '80px' }}>
                      Devices: {systemStatus?.connectedDevices || 0}
              </Typography>
                  </Box>
                <Button
                  variant="outlined"
                  onClick={testConnection}
                  disabled={loading || !systemStatus?.biometricServiceAvailable}
                  startIcon={<RefreshIcon />}
                  size="small"
                >
                    Test
                </Button>
              </Box>
            </CardContent>
          </Card>
            
            {/* Enrollment Status Card */}
            <Card sx={{ minHeight: '48px', flex: 1, minWidth: '320px' }}>
              <CardContent sx={{ py: 1.5, px: 3, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center">
                    <FingerprintIcon color="primary" sx={{ mr: 1, fontSize: '1.2rem' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Enrollment Status
                </Typography>
              </Box>
              <Chip
                label={enrollmentStatus?.active ? 'Active' : 'Inactive'}
                color={enrollmentStatus?.active ? 'warning' : 'default'}
                    size="small"
              />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" flexDirection="column" gap={0.5} sx={{ minWidth: '200px' }}>
                    {enrollmentStatus?.active ? (
                <>
                        <Typography variant="caption" color="text.secondary">
                          {enrollmentStatus.enrollmentMode?.memberName}
                  </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {enrollmentStatus.enrollmentMode?.attempts || 0}/{enrollmentStatus.enrollmentMode?.maxAttempts || 3} attempts
                  </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No active enrollment
                  </Typography>
                    )}
                  </Box>
                  {enrollmentStatus?.active && (
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={stopEnrollment}
                      disabled={isButtonLoading('stop')}
                      startIcon={isButtonLoading('stop') ? <CircularProgress size={16} /> : <CloseIcon />}
                      size="small"
                    >
                      {isButtonLoading('stop') ? 'Stopping...' : 'Stop'}
                    </Button>
              )}
                </Box>
            </CardContent>
          </Card>
          </Box>
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
              disabled={isButtonLoading('cancel')}
              startIcon={isButtonLoading('cancel') ? <CircularProgress size={16} /> : <CloseIcon />}
            >
              {isButtonLoading('cancel') ? 'Cancelling...' : 'Cancel Enrollment'}
            </Button>
          }
        >
          🔄 Enrollment in progress for <strong>{ongoingEnrollment.memberName}</strong>. 
          Please place your finger on the biometric device and follow the prompts.
        </Alert>
      )}

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

      {/* Tab Content */}
      {currentTab === 0 && (
        <>
          {/* Search Bar - Full Width Above */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search Members"
                  placeholder="Search by name, ID, email, phone, or biometric enrollment ID..."
                  value={memberSearchTerm}
                  onChange={handleMemberSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: memberSearchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => {
                          setMemberSearchTerm('');
                          setMembersWithoutBiometricPage(1);
                          setMembersWithBiometricPage(1);
                          fetchMembersWithoutBiometric(1, itemsPerPage, '');
                          fetchMembersWithBiometric(1, itemsPerPage, '');
                        }}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              {memberSearchTerm && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {paginationMeta.membersWithoutBiometric.total} members without biometric data and {paginationMeta.membersWithBiometric.total} members with biometric data
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Member Cards Grid */}
          <Grid container spacing={3} sx={{ width: '100%' }}>
            <Grid item xs={12}>
              <Card sx={{ width: '100%' }}>
                <CardContent sx={{ width: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Members Without Biometric Enrollment ({paginationMeta.membersWithoutBiometric.total})
                  </Typography>
                  
                  {/* Pagination Controls */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Showing {((membersWithoutBiometricPage - 1) * itemsPerPage) + 1} to {Math.min(membersWithoutBiometricPage * itemsPerPage, paginationMeta.membersWithoutBiometric.total)} of {paginationMeta.membersWithoutBiometric.total} members
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <InputLabel>Per Page</InputLabel>
                      <Select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        label="Per Page"
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
        
        {!systemStatus?.biometricServiceAvailable && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Biometric service is offline. Member data may not be current. Service is not required to view members, but enrollment will not work.
                  </Alert>
        )}
        
        {members === undefined || members === null ? (
          <ListShimmer count={5} />
        ) : members.length === 0 ? (
          memberSearchTerm ? (
            <Alert severity="info">
              No members without biometric enrollment found matching "{memberSearchTerm}"
            </Alert>
          ) : (
            <Alert severity="success">
              🎉 All members have biometric enrollment completed!
            </Alert>
          )
        ) : (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1fr 2fr',
                      gap: 1,
                      alignItems: 'center',
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      mb: 1,
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      width: '100%'
                    }}>
                      <Box>Name</Box>
                      <Box>Email</Box>
                      <Box>Phone</Box>
                      <Box>Joined</Box>
                      <Box>Status</Box>
                      <Box>Actions</Box>
                    </Box>
            {members.map(member => (
                      <Box
                        key={member.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1fr 2fr',
                          gap: 1,
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: 'grey.300',
                          borderRadius: 1,
                          mb: 1,
                          background: (member.is_admin === 1 || member.is_admin === true) ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)' : 'transparent',
                          width: '100%',
                          ...(ongoingEnrollment && ongoingEnrollment.memberId === member.id && {
                            border: '2px solid #2196f3',
                            boxShadow: '0 0 10px rgba(33, 150, 243, 0.3)'
                          })
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {member.name}
                          {(member.is_admin === 1 || member.is_admin === true) && (
                            <StarIcon 
                              sx={{ 
                                color: '#ffd700', 
                                fontSize: 16,
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                              }} 
                            />
                          )}
                        </Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{member.email}</Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{member.phone}</Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{formatDateTime(member.join_date)}</Box>
                        <Box>
                          {ongoingEnrollment && ongoingEnrollment.memberId === member.id ? (
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
                          ) : (
                            <Chip label="Not Enrolled" color="default" size="small" />
                                )}
                              </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {ongoingEnrollment && ongoingEnrollment.memberId === member.id ? (
                              <>
                                <Button
                                  variant="contained"
                                  disabled
                                  startIcon={<FingerprintIcon />}
                                size="small"
                                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                                >
                                  Enrolling...
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={cancelOngoingEnrollment}
                                  disabled={isButtonLoading('cancel')}
                                  startIcon={isButtonLoading('cancel') ? <CircularProgress size={16} /> : <CloseIcon />}
                                size="small"
                                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                                >
                                {isButtonLoading('cancel') ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="contained"
                                  onClick={() => startEnrollment(member.id)}
                                  disabled={isButtonLoading('enroll', member.id) || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable || !!ongoingEnrollment}
                                  startIcon={isButtonLoading('enroll', member.id) ? <CircularProgress size={16} /> : <FingerprintIcon />}
                                size="small"
                                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                                >
                                {isButtonLoading('enroll', member.id) ? 'Starting...' : 'Enroll'}
                                </Button>
                            <Button
                              variant="outlined"
                              onClick={() => openManualEnrollment(member)}
                              disabled={isButtonLoading('manual', member.id) || !!ongoingEnrollment}
                              startIcon={isButtonLoading('manual', member.id) ? <CircularProgress size={16} /> : <SettingsIcon />}
                                size="small"
                                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                            >
                                {isButtonLoading('manual', member.id) ? 'Loading...' : 'Manual'}
                            </Button>
                            </>
                          )}
                          </Box>
                      </Box>
                    ))}
                  </Box>
        )}
                
                {/* Members Without Biometric Enrollment Pagination */}
                {paginationMeta.membersWithoutBiometric.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={paginationMeta.membersWithoutBiometric.totalPages}
                      page={membersWithoutBiometricPage}
                      onChange={handleMembersWithoutBiometricPageChange}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Members With Biometric Enrollment */}
          <Grid item xs={12}>
            <Card sx={{ width: '100%' }}>
              <CardContent sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <FingerprintIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Members With Biometric Enrollment ({paginationMeta.membersWithBiometric.total})
                  </Typography>
                </Box>
                
                {/* Pagination Controls */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((membersWithBiometricPage - 1) * itemsPerPage) + 1} to {Math.min(membersWithBiometricPage * itemsPerPage, paginationMeta.membersWithBiometric.total)} of {paginationMeta.membersWithBiometric.total} members
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Per Page</InputLabel>
                    <Select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      label="Per Page"
                    >
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                {membersWithBiometric && membersWithBiometric.length === 0 ? (
                  memberSearchTerm ? (
                    <Alert severity="info">
                      No members with biometric enrollment found matching "{memberSearchTerm}"
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      📝 No members have biometric enrollment yet.
                    </Alert>
                  )
                ) : membersWithBiometric && membersWithBiometric.length > 0 ? (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1.5fr 1fr 2fr',
                      gap: 1,
                      alignItems: 'center',
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      mb: 1,
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      width: '100%'
                    }}>
                      <Box>Name</Box>
                      <Box>Email</Box>
                      <Box>Phone</Box>
                      <Box>Biometric ID</Box>
                      <Box>Joined</Box>
                      <Box>Status</Box>
                      <Box>Actions</Box>
                    </Box>
                    {membersWithBiometric.map(member => (
                      <Box
                        key={member.id}
                            sx={{ 
                          display: 'grid',
                          gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1.5fr 1fr 2fr',
                          gap: 1,
                              alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: (member.is_admin === 1 || member.is_admin === true) ? '#ffd700' : '#4caf50',
                          borderRadius: 1,
                          mb: 1,
                          background: (member.is_admin === 1 || member.is_admin === true) ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)' : 'transparent',
                          boxShadow: (member.is_admin === 1 || member.is_admin === true) ? '0 0 10px rgba(255, 215, 0, 0.3)' : '0 0 10px rgba(76, 175, 80, 0.2)',
                          width: '100%'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {member.name}
                              {(member.is_admin === 1 || member.is_admin === true) && (
                                <StarIcon 
                                  sx={{ 
                                    color: '#ffd700', 
                                fontSize: 16,
                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                  }} 
                                />
                              )}
                            </Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{member.email}</Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{member.phone}</Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{member.biometric_id}</Box>
                        <Box sx={{ fontSize: '0.875rem' }}>{formatDateTime(member.join_date)}</Box>
                        <Box>
                          <Chip
                            label="Enrolled"
                            color="success"
                            size="small"
                            icon={<FingerprintIcon sx={{ fontSize: '1rem' }} />}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => openDeleteConfirmDialog(member.id, member.name)}
                              disabled={isButtonLoading('delete', member.id) || !!ongoingEnrollment}
                              startIcon={isButtonLoading('delete', member.id) ? <CircularProgress size={16} /> : <DeleteIcon />}
                            size="small"
                            sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                            >
                            {isButtonLoading('delete', member.id) ? 'Loading...' : 'Delete'}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => startEnrollment(member.id)}
                              disabled={isButtonLoading('reenroll', member.id) || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable || !!ongoingEnrollment}
                              startIcon={isButtonLoading('reenroll', member.id) ? <CircularProgress size={16} /> : <RefreshIcon />}
                            size="small"
                            sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                            >
                            {isButtonLoading('reenroll', member.id) ? 'Starting...' : 'Re-enroll'}
                            </Button>
                          </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <ListShimmer count={5} />
                )}
                
                {/* Members With Biometric Enrollment Pagination */}
                {paginationMeta.membersWithBiometric.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={paginationMeta.membersWithBiometric.totalPages}
                      page={membersWithBiometricPage}
                      onChange={handleMembersWithBiometricPageChange}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </>
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
            
            {/* Event Type Filters */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Filter by Event Type:
              </Typography>
              <Grid container spacing={1}>
                {eventTypeFilterOptions.map(({ eventType, isChecked, label }) => (
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
                          {label}
                        </Typography>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            {/* Events Search and Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search events..."
                value={eventSearchTerm}
                onChange={handleEventSearchChange}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: eventSearchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => {
                        setEventSearchTerm('');
                        setEventsPage(1);
                        fetchBiometricEvents(1, itemsPerPage, '');
                      }}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  label="Per Page"
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {((eventsPage - 1) * itemsPerPage) + 1} to {Math.min(eventsPage * itemsPerPage, paginationMeta.events.total)} of {paginationMeta.events.total} events
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <FormShimmer />
              </Box>
            ) : biometricEvents.length === 0 ? (
              <Typography>No biometric events recorded yet.</Typography>
            ) : filteredBiometricEvents.length === 0 ? (
              <Typography>No events match the selected filters.</Typography>
            ) : (
              <>
                {/* Virtual scrolling for large event lists */}
                {filteredBiometricEvents.length > 50 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      ⚡ Virtual scrolling enabled for {filteredBiometricEvents.length} events (performance optimized)
                    </Typography>
                    <Box sx={{ height: 400, width: '100%' }}>
                      <VirtualList
                        height={400}
                        itemCount={filteredBiometricEvents.length}
                        itemSize={80}
                        itemData={filteredBiometricEvents}
                      >
                        {EventItem}
                      </VirtualList>
                    </Box>
                  </Box>
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
                      primary={formatEventMessage(event)}
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
                
                {/* Events Pagination */}
                {paginationMeta.events.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={paginationMeta.events.totalPages}
                      page={eventsPage}
                      onChange={handleEventsPageChange}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
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
          
          <SearchableMemberDropdown
            value={manualMember}
            onChange={(e) => setManualMember(e.target.value)}
            members={members}
            label="Select Member"
            placeholder="Search members by name, ID, or phone..."
            showId={true}
            showEmail={false}
            showAdminIcon={true}
            sx={{ mb: 2 }}
          />
          
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
            disabled={isButtonLoading('manual', manualMember) || !manualMember || !deviceUserId}
            startIcon={isButtonLoading('manual', manualMember) ? <CircularProgress size={16} /> : <FingerprintIcon />}
              >
                {isButtonLoading('manual', manualMember) ? 'Assigning...' : 'Assign Biometric Data'}
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
          Confirm Enrollment Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the biometric enrollment for{' '}
            <strong>{deleteConfirmDialog.memberName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will remove their fingerprint data and require them to re-enroll. The action cannot be undone.
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
            disabled={isButtonLoading('deleteConfirm')}
            startIcon={isButtonLoading('deleteConfirm') ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isButtonLoading('deleteConfirm') ? 'Deleting...' : 'Delete Enrollment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BiometricEnrollment;
