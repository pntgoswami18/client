import React, { useState, useEffect } from 'react';
import './BiometricEnrollment.css';

const BiometricEnrollment = () => {
  const [members, setMembers] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [biometricEvents, setBiometricEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Manual enrollment state
  const [showManualEnrollment, setShowManualEnrollment] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deviceUserId, setDeviceUserId] = useState('');
  const [sensorMemberId, setSensorMemberId] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    fetchMembersWithoutBiometric();
    fetchSystemStatus();
    fetchEnrollmentStatus();
    fetchBiometricEvents();
    
    // Poll enrollment status every 2 seconds
    const interval = setInterval(() => {
      fetchEnrollmentStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchMembersWithoutBiometric = async () => {
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
  };

  const fetchSystemStatus = async () => {
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
  };

  const fetchEnrollmentStatus = async () => {
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
  };

  const fetchBiometricEvents = async () => {
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
  };

  const startEnrollment = async (memberId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/biometric/members/${memberId}/enroll`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('Enrollment started! Please ask the member to place their finger on the biometric device.');
        fetchEnrollmentStatus();
      } else {
        setError(data.message || 'Failed to start enrollment');
      }
    } catch (error) {
      setError('Error starting enrollment: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    setSelectedMember(member);
    setDeviceUserId('');
    setSensorMemberId('');
    setError(null);
    setSuccess(null);
    setShowManualEnrollment(true);
  };

  const closeManualEnrollment = () => {
    setShowManualEnrollment(false);
    setSelectedMember(null);
    setDeviceUserId('');
    setSensorMemberId('');
  };

  const handleManualEnrollment = async () => {
    if (!selectedMember || !deviceUserId.trim()) {
      setError('Member and Device User ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/biometric/members/${selectedMember.id}/manual-enroll`, {
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
        setSuccess(`Successfully assigned biometric data to ${selectedMember.name}`);
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

  return (
    <div className="biometric-enrollment">
      <div className="header">
        <h2>🔐 Biometric Enrollment Management</h2>
        
        {/* System Status */}
        <div className="status-cards">
          <div className={`status-card ${systemStatus?.biometricServiceAvailable ? 'online' : 'offline'}`}>
            <h3>Service Status</h3>
            <p>{systemStatus?.biometricServiceAvailable ? '🟢 Online' : '🔴 Offline'}</p>
            <small>Connected Devices: {systemStatus?.connectedDevices || 0}</small>
          </div>

          <div className={`status-card ${enrollmentStatus?.active ? 'active' : 'inactive'}`}>
            <h3>Enrollment Status</h3>
            <p>{enrollmentStatus?.active ? '🟡 Active' : '⚪ Inactive'}</p>
            {enrollmentStatus?.active && (
              <small>Member: {enrollmentStatus.enrollmentMode?.memberName}</small>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            onClick={testConnection}
            disabled={loading || !systemStatus?.biometricServiceAvailable}
            className="btn btn-secondary"
          >
            🧪 Test Connection
          </button>
          
          {enrollmentStatus?.active && (
            <button 
              onClick={stopEnrollment}
              disabled={loading}
              className="btn btn-warning"
            >
              🛑 Stop Enrollment
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      {/* Active Enrollment */}
      {enrollmentStatus?.active && (
        <div className="enrollment-active">
          <h3>🎯 Active Enrollment Session</h3>
          <div className="enrollment-details">
            <p><strong>Member:</strong> {enrollmentStatus.enrollmentMode?.memberName}</p>
            <p><strong>Started:</strong> {formatDateTime(enrollmentStatus.enrollmentMode?.startTime)}</p>
            <p><strong>Attempts:</strong> {enrollmentStatus.enrollmentMode?.attempts || 0}/{enrollmentStatus.enrollmentMode?.maxAttempts || 3}</p>
          </div>
          <div className="enrollment-instructions">
            <h4>📋 Instructions:</h4>
            <ol>
              <li>Ask the member to clean their finger</li>
              <li>Place finger firmly on the biometric scanner</li>
              <li>Follow the device prompts for multiple scans</li>
              <li>Wait for confirmation or error message</li>
            </ol>
          </div>
        </div>
      )}

      {/* Members Without Biometric */}
      <div className="members-section">
        <h3>👥 Members Without Biometric Data ({members ? members.length : '?'})</h3>
        
        {!systemStatus?.biometricServiceAvailable && (
          <div className="alert alert-warning" style={{marginBottom: '20px'}}>
            ⚠️ Biometric service is offline. Member data may not be current. Service is not required to view members, but enrollment will not work.
          </div>
        )}
        
        {members && members.length === 0 ? (
          <div className="no-members">
            <p>🎉 All members have biometric data enrolled!</p>
          </div>
        ) : members && members.length > 0 ? (
          <div className="members-grid">
            {members.map(member => (
              <div key={member.id} className="member-card">
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <p>{member.email}</p>
                  <p>{member.phone}</p>
                  <small>Joined: {formatDateTime(member.join_date)}</small>
                </div>
                <div className="member-actions">
                  <button
                    onClick={() => startEnrollment(member.id)}
                    disabled={loading || enrollmentStatus?.active || !systemStatus?.biometricServiceAvailable}
                    className="btn btn-primary"
                  >
                    🔒 Enroll Fingerprint
                  </button>
                  <button
                    onClick={() => openManualEnrollment(member)}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ marginLeft: '10px' }}
                  >
                    📝 Manual Assignment
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-members">
            <p>Loading member data...</p>
          </div>
        )}
      </div>

      {/* Manual Enrollment Modal */}
      {showManualEnrollment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📝 Manual Biometric Assignment</h3>
              <button 
                onClick={closeManualEnrollment} 
                className="modal-close"
                disabled={loading}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {selectedMember && (
                <div className="member-details">
                  <h4>Assigning biometric data to:</h4>
                  <p><strong>{selectedMember.name}</strong></p>
                  <p>{selectedMember.email}</p>
                  <p>{selectedMember.phone}</p>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="deviceUserId">Device User ID *</label>
                <input
                  id="deviceUserId"
                  type="text"
                  value={deviceUserId}
                  onChange={(e) => setDeviceUserId(e.target.value)}
                  placeholder="Enter device user ID (e.g., 4)"
                  disabled={loading}
                  className="form-input"
                />
                <small className="help-text">
                  The user ID assigned by the biometric device
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="sensorMemberId">Sensor Member ID</label>
                <input
                  id="sensorMemberId"
                  type="text"
                  value={sensorMemberId}
                  onChange={(e) => setSensorMemberId(e.target.value)}
                  placeholder="Enter sensor member ID (optional)"
                  disabled={loading}
                  className="form-input"
                />
                <small className="help-text">
                  The member ID sent by the biometric sensor (if different from device user ID)
                </small>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={closeManualEnrollment}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleManualEnrollment}
                disabled={loading || !deviceUserId.trim()}
                className="btn btn-primary"
              >
                {loading ? 'Assigning...' : 'Assign Biometric Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div className="events-section">
        <h3>📊 Recent Biometric Events</h3>
        
        {biometricEvents.length === 0 ? (
          <p>No biometric events recorded yet.</p>
        ) : (
          <div className="events-list">
            {biometricEvents.map(event => (
              <div key={event.id} className={`event-item ${event.success ? 'success' : 'error'}`}>
                <div className="event-main">
                  <span className="event-type">{event.event_type}</span>
                  <span className="event-member">{event.member_name || 'Unknown'}</span>
                  <span className="event-time">{formatDateTime(event.timestamp)}</span>
                </div>
                <div className="event-details">
                  {event.device_id && <span>Device: {event.device_id}</span>}
                  {event.biometric_id && <span>Device ID: {event.biometric_id}</span>}
                  {event.sensor_member_id && <span>Sensor ID: {event.sensor_member_id}</span>}
                  {event.error_message && <span className="error">Error: {event.error_message}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricEnrollment;
