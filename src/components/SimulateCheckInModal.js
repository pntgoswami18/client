import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Alert
} from '@mui/material';
import SearchableMemberDropdown from './SearchableMemberDropdown';

const SimulateCheckInModal = ({ open, onClose, members, onCheckInSuccess }) => {
    const [simulateMemberId, setSimulateMemberId] = useState('');
    const [checkInError, setCheckInError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            setSimulateMemberId('');
            setCheckInError('');
        }
    }, [open]);

    const handleSimulateCheckIn = async () => {
        if (!simulateMemberId) {
            setCheckInError('Please select a member to check in.');
            return;
        }

        try {
            setIsLoading(true);
            setCheckInError('');
            await axios.post('/api/attendance/check-in', { memberId: Number(simulateMemberId) });
            
            // Call success callback if provided
            if (onCheckInSuccess) {
                onCheckInSuccess(Number(simulateMemberId));
            }
            
            // Close modal and reset form
            setSimulateMemberId('');
            onClose();
            
        } catch (error) {
            console.error("Error simulating check-in", error);
            const msg = error?.response?.data?.message || 'Error during check-in. Please check if the member exists.';
            setCheckInError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSimulateMemberId('');
        setCheckInError('');
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }
            }}
        >
            <DialogTitle sx={{ 
                background: 'var(--accent-secondary-bg)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1.25rem'
            }}>
                Simulate Biometric Check-in
            </DialogTitle>
            
            <DialogContent sx={{ pt: 3 }}>
                <Alert severity="info" sx={{ marginBottom: '1.5rem' }}>
                    This simulates what a biometric device would do when a member checks in.
                </Alert>
                
                {checkInError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {checkInError}
                    </Alert>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SearchableMemberDropdown
                        value={simulateMemberId}
                        onChange={e => setSimulateMemberId(e.target.value)}
                        members={members}
                        label="Select Member to Check In"
                        placeholder="Search members by name, ID, or phone..."
                        showId={true}
                        showEmail={false}
                        showAdminIcon={true}
                    />
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ p: 3, gap: 1 }}>
                <Button 
                    onClick={handleClose}
                    variant="outlined"
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSimulateCheckIn}
                    variant="contained"
                    disabled={!simulateMemberId || isLoading}
                    sx={{
                        background: 'var(--accent-secondary-bg)',
                        '&:hover': {
                            background: 'var(--accent-secondary-bg)',
                            filter: 'brightness(0.95)'
                        }
                    }}
                >
                    {isLoading ? 'Processing...' : 'Simulate Check-in'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SimulateCheckInModal;
