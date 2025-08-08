import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';
import {
    Typography,
    TextField,
    Button,
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

const Financials = () => {
    const [plans, setPlans] = useState([]);
    const [members, setMembers] = useState([]);
    const [planName, setPlanName] = useState('');
    const [planPrice, setPlanPrice] = useState('');
    const [planDuration, setPlanDuration] = useState('');
    const [planDescription, setPlanDescription] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [openAddPlan, setOpenAddPlan] = useState(false);
    const [openEditPlan, setOpenEditPlan] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [openManualPayment, setOpenManualPayment] = useState(false);
    const [manualInvoiceId, setManualInvoiceId] = useState('');
    const [manualAmount, setManualAmount] = useState('');
    const [manualMethod, setManualMethod] = useState('cash');
    const [manualTxnId, setManualTxnId] = useState('');
    const [openCreateInvoice, setOpenCreateInvoice] = useState(false);
    const [invMemberId, setInvMemberId] = useState('');
    const [invPlanId, setInvPlanId] = useState('');
    const [invAmount, setInvAmount] = useState('');
    const [invDueDate, setInvDueDate] = useState('');
    const [financialSummary, setFinancialSummary] = useState({
        outstandingInvoices: [],
        paymentHistory: [],
        memberPaymentStatus: []
    });

    useEffect(() => {
        fetchPlans();
        fetchCurrency();
        fetchMembers();
        fetchFinancialSummary();
    }, []);

    const fetchFinancialSummary = async () => {
        try {
            const response = await axios.get('/api/reports/financial-summary');
            setFinancialSummary(response.data);
        } catch (error) {
            console.error("Error fetching financial summary", error);
        }
    };

    const fetchCurrency = async () => {
        try {
            const response = await axios.get('/api/settings');
            setCurrency(response.data.currency);
        } catch (error) {
            console.error("Error fetching currency setting", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await axios.get('/api/plans');
            setPlans(response.data);
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await axios.get('/api/members');
            setMembers(res.data);
        } catch (e) {
            console.error('Error fetching members', e);
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        const planData = {
            name: planName,
            price: parseFloat(planPrice),
            duration_days: parseInt(planDuration),
            description: planDescription
        };

        try {
            await axios.post('/api/plans', planData);
            fetchPlans();
            resetPlanForm();
            setOpenAddPlan(false);
            alert('Membership plan created successfully!');
        } catch (error) {
            console.error("Error creating plan", error);
            alert('Error creating plan. Please try again.');
        }
    };

    const handleUpdatePlan = async (e) => {
        e.preventDefault();
        if (!editingPlan) return;
        try {
            await axios.put(`/api/plans/${editingPlan.id}`, {
                name: planName,
                price: parseFloat(planPrice),
                duration_days: parseInt(planDuration),
                description: planDescription
            });
            setOpenEditPlan(false);
            setEditingPlan(null);
            resetPlanForm();
            fetchPlans();
        } catch (error) {
            console.error('Error updating plan', error);
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Delete this plan?')) return;
        try {
            await axios.delete(`/api/plans/${id}`);
            fetchPlans();
        } catch (e) { console.error(e); }
    };

    const resetPlanForm = () => {
        setPlanName('');
        setPlanPrice('');
        setPlanDuration('');
        setPlanDescription('');
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>Financials</Typography>
            
            {/* Membership Plans Section */}
            <Box sx={{ marginBottom: '3rem' }}>
                <Typography variant="h5" gutterBottom>Membership Plans</Typography>
                
                {/* Create New Plan Form */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" onClick={() => setOpenAddPlan(true)}>Add Plan</Button>
                </Box>
                <Dialog open={openAddPlan} onClose={() => setOpenAddPlan(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Create New Membership Plan</DialogTitle>
                    <DialogContent>
                        <Box component="form" onSubmit={handleCreatePlan} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                            <TextField label="Plan Name" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g., Monthly Premium" required />
                            <TextField label="Price" type="number" inputProps={{ step: '0.01' }} value={planPrice} onChange={e => setPlanPrice(e.target.value)} placeholder="e.g., 49.99" required />
                            <TextField label="Duration (Days)" type="number" value={planDuration} onChange={e => setPlanDuration(e.target.value)} placeholder="e.g., 30" required />
                            <TextField label="Description" value={planDescription} onChange={e => setPlanDescription(e.target.value)} placeholder="Description (optional)" multiline rows={3} />
                            <DialogActions sx={{ px: 0 }}>
                                <Button onClick={() => setOpenAddPlan(false)}>Cancel</Button>
                                <Button type="submit" variant="contained">Create</Button>
                            </DialogActions>
                        </Box>
                    </DialogContent>
                </Dialog>
                <Card sx={{ display: 'none' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Create New Membership Plan</Typography>
                        <Box component="form" onSubmit={handleCreatePlan} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                            <TextField
                                label="Plan Name"
                            value={planName}
                            onChange={e => setPlanName(e.target.value)}
                                placeholder="e.g., Monthly Premium"
                            required
                        />
                            <TextField
                                label="Price"
                            type="number"
                                inputProps={{ step: "0.01" }}
                            value={planPrice}
                            onChange={e => setPlanPrice(e.target.value)}
                                placeholder="e.g., 49.99"
                            required
                        />
                            <TextField
                                label="Duration (Days)"
                            type="number"
                            value={planDuration}
                            onChange={e => setPlanDuration(e.target.value)}
                                placeholder="e.g., 30"
                            required
                        />
                            <TextField
                                label="Description"
                            value={planDescription}
                            onChange={e => setPlanDescription(e.target.value)}
                            placeholder="Description (optional)"
                                multiline
                                rows={3}
                            />
                            <Button type="submit" variant="contained">Create Plan</Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* Existing Plans Table */}
                <Typography variant="h6" gutterBottom>Existing Plans</Typography>
                    {plans.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Plan Name</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Duration (Days)</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {plans.map(plan => (
                                    <TableRow key={plan.id}>
                                        <TableCell>{plan.name}</TableCell>
                                        <TableCell>{formatCurrency(plan.price, currency)}</TableCell>
                                        <TableCell>{plan.duration_days}</TableCell>
                                        <TableCell>{plan.description || 'No description'}</TableCell>
                                        <TableCell>
                                            <Button size="small" onClick={() => {
                                                setEditingPlan(plan);
                                                setPlanName(plan.name);
                                                setPlanPrice(String(plan.price));
                                                setPlanDuration(String(plan.duration_days));
                                                setPlanDescription(plan.description || '');
                                                setOpenEditPlan(true);
                                            }}>Edit</Button>
                                            <Button size="small" color="error" onClick={() => handleDeletePlan(plan.id)}>Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography>No membership plans found. Create one above.</Typography>
                )}
            </Box>

            <Dialog open={openEditPlan} onClose={() => setOpenEditPlan(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Membership Plan</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleUpdatePlan} sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <TextField label="Plan Name" value={planName} onChange={e => setPlanName(e.target.value)} required />
                        <TextField label="Price" type="number" inputProps={{ step: '0.01' }} value={planPrice} onChange={e => setPlanPrice(e.target.value)} required />
                        <TextField label="Duration (Days)" type="number" value={planDuration} onChange={e => setPlanDuration(e.target.value)} required />
                        <TextField label="Description" value={planDescription} onChange={e => setPlanDescription(e.target.value)} multiline rows={3} />
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={() => setOpenEditPlan(false)}>Cancel</Button>
                            <Button type="submit" variant="contained">Save</Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Divider sx={{ marginY: '2rem' }} />

            {/* Payment Processing Section */}
            <Box sx={{ marginBottom: '3rem' }}>
                <Typography variant="h5" gutterBottom>Payment Processing</Typography>
                <Alert severity="info">
                    <Typography variant="subtitle1" gutterBottom><strong>Payment Integration:</strong> This system is integrated with Stripe for secure payment processing.</Typography>
                    <Typography variant="body2" gutterBottom><strong>Note:</strong> To process actual payments, you'll need to:</Typography>
                    <ul>
                        <li>Set up your Stripe account and add the secret key to your .env file</li>
                        <li>Create invoices for members through the backend API</li>
                        <li>Use the /api/payments endpoint to process payments</li>
                    </ul>
                    <Typography variant="body2">For testing, you can use Stripe's test card numbers.</Typography>
                </Alert>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button variant="outlined" onClick={() => setOpenManualPayment(true)}>Record Manual Payment</Button>
                    <Button variant="outlined" onClick={() => {
                        setOpenCreateInvoice(true);
                        setInvDueDate(new Date().toISOString().slice(0,10));
                    }}>Create Invoice</Button>
                </Box>
            </Box>

            <Dialog open={openManualPayment} onClose={() => setOpenManualPayment(false)} fullWidth maxWidth="sm">
                <DialogTitle>Record Manual Payment</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField label="Invoice ID" type="number" value={manualInvoiceId} onChange={(e)=>setManualInvoiceId(e.target.value)} sx={{ flex: 1 }} />
                            <Button onClick={() => setManualInvoiceId(String(Math.floor(100000 + Math.random() * 900000)))}>Generate Invoice ID</Button>
                        </Box>
                        <TextField label="Amount" type="number" value={manualAmount} onChange={(e)=>setManualAmount(e.target.value)} required />
                        <FormControl fullWidth>
                            <InputLabel>Method</InputLabel>
                            <Select value={manualMethod} onChange={(e)=>setManualMethod(e.target.value)}>
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="bank">Bank</MenuItem>
                                <MenuItem value="upi">UPI</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Transaction ID (optional)" value={manualTxnId} onChange={(e)=>setManualTxnId(e.target.value)} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenManualPayment(false)}>Cancel</Button>
                    <Button onClick={async ()=>{
                        try {
                            const amountNum = Number(manualAmount);
                            if (!manualAmount || Number.isNaN(amountNum) || amountNum <= 0) {
                                alert('Please enter a valid amount greater than 0.');
                                return;
                            }

                            const payload = {
                                amount: amountNum,
                                method: manualMethod,
                                transaction_id: manualTxnId || undefined
                            };
                            if (manualInvoiceId) payload.invoice_id = parseInt(manualInvoiceId,10);
                            await axios.post('/api/payments/manual', payload);
                            setOpenManualPayment(false);
                            fetchFinancialSummary();
                        } catch (e) {
                            console.error(e);
                            alert(e?.response?.data?.message || 'Error recording manual payment.');
                        }
                    }} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openCreateInvoice} onClose={() => setOpenCreateInvoice(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Member</InputLabel>
                            <Select value={invMemberId} onChange={(e)=>{ setInvMemberId(e.target.value); }}>
                                {members.map(m => (
                                    <MenuItem key={m.id} value={m.id}>{m.name} - {m.email}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Plan</InputLabel>
                            <Select value={invPlanId} onChange={(e)=>{
                                setInvPlanId(e.target.value);
                                const p = plans.find(pl => String(pl.id) === String(e.target.value));
                                if (p) setInvAmount(String(p.price));
                            }}>
                                {plans.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price, currency)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Amount" type="number" value={invAmount} onChange={(e)=>setInvAmount(e.target.value)} />
                        <TextField label="Due Date" type="date" value={invDueDate} onChange={(e)=>setInvDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={()=>setOpenCreateInvoice(false)}>Cancel</Button>
                    <Button variant="contained" onClick={async ()=>{
                        try {
                            await axios.post('/api/payments/invoice', {
                                member_id: parseInt(invMemberId,10),
                                plan_id: invPlanId ? parseInt(invPlanId,10) : null,
                                amount: parseFloat(invAmount),
                                due_date: invDueDate
                            });
                            setOpenCreateInvoice(false);
                            fetchFinancialSummary();
                        } catch (e) { console.error(e); }
                    }}>Create</Button>
                </DialogActions>
            </Dialog>

            <Divider sx={{ marginY: '2rem' }} />

            {/* Financial Summary Section */}
            <Typography variant="h5" gutterBottom>Financial Summary</Typography>
            
            {/* Outstanding Invoices */}
            <Box sx={{ marginBottom: '2rem' }}>
                <Typography variant="h6" gutterBottom>Outstanding Invoices</Typography>
                {financialSummary.outstandingInvoices.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Invoice ID</TableCell>
                                    <TableCell>Member Name</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Due Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {financialSummary.outstandingInvoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>{invoice.id}</TableCell>
                                        <TableCell>{invoice.member_name}</TableCell>
                                        <TableCell>{formatCurrency(invoice.amount, currency)}</TableCell>
                                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography>No outstanding invoices.</Typography>
                )}
            </Box>

            {/* Payment History */}
            <Box sx={{ marginBottom: '2rem' }}>
                <Typography variant="h6" gutterBottom>Recent Payment History</Typography>
                {financialSummary.paymentHistory.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Payment ID</TableCell>
                                    <TableCell>Member Name</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Payment Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {financialSummary.paymentHistory.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{payment.id}</TableCell>
                                        <TableCell>{payment.member_name}</TableCell>
                                        <TableCell>{formatCurrency(payment.amount, currency)}</TableCell>
                                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography>No payment history available.</Typography>
                )}
            </Box>

            {/* Member Payment Status */}
            <Box>
                <Typography variant="h6" gutterBottom>Member Payment Status</Typography>
                {financialSummary.memberPaymentStatus.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Member Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Last Payment Date</TableCell>
                                    <TableCell>Last Invoice Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {financialSummary.memberPaymentStatus.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell>{member.name}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.last_payment_date ? new Date(member.last_payment_date).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>{member.last_invoice_status || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography>No member payment status available.</Typography>
                )}
            </Box>
        </div>
    );
};

export default Financials;