import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';
import { formatDateToLocalString } from '../utils/formatting';
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
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Pagination
} from '@mui/material';
import SearchableMemberDropdown from './SearchableMemberDropdown';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import StarIcon from '@mui/icons-material/Star';

// Debounce utility function
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

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
    const [manualMember, setManualMember] = useState(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [openCreateInvoice, setOpenCreateInvoice] = useState(false);
    const [invMemberId, setInvMemberId] = useState('');
    const [invPlanId, setInvPlanId] = useState('');
    const [invAmount, setInvAmount] = useState('');
    const [invDueDate, setInvDueDate] = useState('');
    const [invJoinDate, setInvJoinDate] = useState('');
    const [createInvoiceError, setCreateInvoiceError] = useState('');
    // Edit invoice state
    const [openEditInvoice, setOpenEditInvoice] = useState(false);
    const [editInvoiceId, setEditInvoiceId] = useState('');
    const [editInvMemberId, setEditInvMemberId] = useState('');
    const [editInvPlanId, setEditInvPlanId] = useState('');
    const [editInvAmount, setEditInvAmount] = useState('');
    const [editInvDueDate, setEditInvDueDate] = useState('');
    const [financialSummary, setFinancialSummary] = useState({
        outstandingInvoices: [],
        paymentHistory: [],
        memberPaymentStatus: []
    });
    
    // Pagination state
    const [outstandingPage, setOutstandingPage] = useState(1);
    const [paymentsPage, setPaymentsPage] = useState(1);
    const [membersPage, setMembersPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Pagination metadata
    const [paginationMeta, setPaginationMeta] = useState({
        outstanding: { total: 0, page: 1, limit: 10 },
        payments: { total: 0, page: 1, limit: 10 },
        members: { total: 0, page: 1, limit: 10 }
    });
    const location = useLocation();
    const navigate = useNavigate();
    const outstandingRef = useRef(null);

    // Date range filters
    const [dateRange, setDateRange] = useState('last-30-days');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Loading states
    const [loadingStates, setLoadingStates] = useState({
        outstanding: false,
        payments: false,
        members: false,
        plans: false,
        currency: false
    });

    // Calculate date range based on filter selection
    const getDateRange = useCallback(() => {
        const today = new Date();
        const startDate = new Date();
        const endDate = new Date();

        switch (dateRange) {
            case 'last-7-days':
                startDate.setDate(today.getDate() - 7);
                break;
            case 'last-30-days':
                startDate.setDate(today.getDate() - 30);
                break;
            case 'last-90-days':
                startDate.setDate(today.getDate() - 90);
                break;
            case 'last-6-months':
                startDate.setMonth(today.getMonth() - 6);
                break;
            case 'last-year':
                startDate.setFullYear(today.getFullYear() - 1);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    return {
                        startDate: new Date(customStartDate).toISOString().split('T')[0],
                        endDate: new Date(customEndDate).toISOString().split('T')[0]
                    };
                }
                // Fall back to last 30 days if custom dates not set
                startDate.setDate(today.getDate() - 30);
                break;
            default:
                startDate.setDate(today.getDate() - 30);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }, [dateRange, customStartDate, customEndDate]);

    const fetchFinancialSummary = useCallback(async (table = 'all', page = 1, limit = itemsPerPage) => {
        try {
            setIsLoading(true);
            
            // Set specific loading states based on table type
            if (table === 'all') {
                setLoadingStates(prev => ({
                    ...prev,
                    outstanding: true,
                    payments: true,
                    members: true
                }));
            } else {
                setLoadingStates(prev => ({
                    ...prev,
                    [table]: true
                }));
            }

            const { startDate, endDate } = getDateRange();
            const params = new URLSearchParams({
                startDate,
                endDate,
                page: page.toString(),
                limit: limit.toString(),
                table
            });
            const response = await axios.get(`/api/reports/financial-summary?${params}`);
            const def = { outstandingInvoices: [], paymentHistory: [], memberPaymentStatus: [] };
            const d = response?.data || {};
            
            // Update financial summary data
            setFinancialSummary(prev => ({
                ...prev,
                ...def,
                ...d,
                outstandingInvoices: Array.isArray(d.outstandingInvoices) ? d.outstandingInvoices : prev.outstandingInvoices,
                paymentHistory: Array.isArray(d.paymentHistory) ? d.paymentHistory : prev.paymentHistory,
                memberPaymentStatus: Array.isArray(d.memberPaymentStatus) ? d.memberPaymentStatus : prev.memberPaymentStatus,
            }));
            
            // Update pagination metadata
            setPaginationMeta(prev => ({
                ...prev,
                outstanding: {
                    total: d.outstandingInvoicesTotal || prev.outstanding.total,
                    page: d.outstandingInvoicesPage || prev.outstanding.page,
                    limit: d.outstandingInvoicesLimit || prev.outstanding.limit
                },
                payments: {
                    total: d.paymentHistoryTotal || prev.payments.total,
                    page: d.paymentHistoryPage || prev.payments.page,
                    limit: d.paymentHistoryLimit || prev.payments.limit
                },
                members: {
                    total: d.memberPaymentStatusTotal || prev.members.total,
                    page: d.memberPaymentStatusPage || prev.members.page,
                    limit: d.memberPaymentStatusLimit || prev.members.limit
                }
            }));
        } catch (error) {
            console.error("Error fetching financial summary", error);
        } finally {
            setIsLoading(false);
            // Clear specific loading states
            if (table === 'all') {
                setLoadingStates(prev => ({
                    ...prev,
                    outstanding: false,
                    payments: false,
                    members: false
                }));
            } else {
                setLoadingStates(prev => ({
                    ...prev,
                    [table]: false
                }));
            }
        }
    }, [getDateRange, itemsPerPage]);

    // Debounced version of fetchFinancialSummary to prevent excessive API calls
    const debouncedFetchFinancialSummary = useCallback(
        debounce(async (table, page, limit) => {
            await fetchFinancialSummary(table, page, limit);
        }, 300),
        [fetchFinancialSummary]
    );

    // Filter out admin users for invoice creation
    const nonAdminMembers = useMemo(() => {
        if (!Array.isArray(members)) {
            return [];
        }
        return members.filter(member => 
            member && 
            typeof member === 'object' && 
            member.id && 
            !(member.is_admin === 1 || member.is_admin === true)
        );
    }, [members]);

    // Pagination handlers
    const handleOutstandingPageChange = (event, page) => {
        setOutstandingPage(page);
        debouncedFetchFinancialSummary('outstanding', page, itemsPerPage);
    };

    const handlePaymentsPageChange = (event, page) => {
        setPaymentsPage(page);
        debouncedFetchFinancialSummary('payments', page, itemsPerPage);
    };

    const handleMembersPageChange = (event, page) => {
        setMembersPage(page);
        debouncedFetchFinancialSummary('members', page, itemsPerPage);
    };

    const handleItemsPerPageChange = (event) => {
        const newItemsPerPage = parseInt(event.target.value, 10);
        setItemsPerPage(newItemsPerPage);
        setOutstandingPage(1);
        setPaymentsPage(1);
        setMembersPage(1);
        debouncedFetchFinancialSummary('all', 1, newItemsPerPage);
    };

    useEffect(() => {
        fetchPlans();
        fetchCurrency();
        fetchMembers();
        fetchFinancialSummary('all', 1, itemsPerPage);
    }, [fetchFinancialSummary, itemsPerPage]);

    useEffect(() => {
        const qp = new URLSearchParams(location.search);
        const section = qp.get('section');
        const editInvoiceParam = qp.get('editInvoice');

        let scrollTimeout;
        let editTimeout;

        if (section === 'pending-payments' && outstandingRef.current) {
            // Scroll to Outstanding Invoices
            scrollTimeout = setTimeout(() => {
                outstandingRef.current.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        if (editInvoiceParam) {
            // Auto-open edit dialog for the specified invoice
            editTimeout = setTimeout(() => {
                handleEditInvoice(parseInt(editInvoiceParam, 10));
                // Clear the URL parameter after opening the dialog
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('editInvoice');
                window.history.replaceState({}, '', newUrl);
            }, 500); // Wait for data to load
        }

        return () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            if (editTimeout) {
                clearTimeout(editTimeout);
            }
        };
    }, [location.search]);

    const handleEditInvoice = async (invoiceId) => {
        try {
            // Fetch full invoice details
            const response = await axios.get(`/api/payments/invoices/${invoiceId}`);
            const invoice = response.data;
            
            // Validate invoice data
            if (!invoice || typeof invoice !== 'object') {
                throw new Error('Invalid invoice data received');
            }
            
            // Populate edit form with defensive programming
            setEditInvoiceId(invoiceId);
            setEditInvMemberId(invoice.member_id ? String(invoice.member_id) : '');
            setEditInvPlanId(invoice.plan_id ? String(invoice.plan_id) : '');
            setEditInvAmount(String(invoice.invoice_amount || ''));
            setEditInvDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '');
            setOpenEditInvoice(true);
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            alert('Error loading invoice details');
        }
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await axios.delete(`/api/payments/invoices/${invoiceId}`);
                alert('Invoice deleted successfully');
                fetchFinancialSummary('outstanding', outstandingPage, itemsPerPage);
            } catch (error) {
                console.error('Error deleting invoice:', error);
                alert(error?.response?.data?.message || 'Error deleting invoice');
            }
        }
    };

    const fetchCurrency = async () => {
        try {
            setLoadingStates(prev => ({ ...prev, currency: true }));
            const response = await axios.get('/api/settings');
            setCurrency(response.data.currency);
        } catch (error) {
            console.error("Error fetching currency setting", error);
        } finally {
            setLoadingStates(prev => ({ ...prev, currency: false }));
        }
    };

    const fetchPlans = async () => {
        try {
            setLoadingStates(prev => ({ ...prev, plans: true }));
            const response = await axios.get('/api/plans');
            const plansData = Array.isArray(response.data) ? response.data : [];
            // Filter out any null/undefined plans
            const validPlans = plansData.filter(plan => plan && typeof plan === 'object' && plan.id);
            setPlans(validPlans);
        } catch (error) {
            console.error("Error fetching plans", error);
            setPlans([]); // Set empty array as fallback
        } finally {
            setLoadingStates(prev => ({ ...prev, plans: false }));
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await axios.get('/api/members');
            // The API returns {members: [...]}, so we need to access res.data.members
            const membersData = Array.isArray(res.data.members) ? res.data.members : [];
            // Filter out any null/undefined members
            const validMembers = membersData.filter(member => member && typeof member === 'object' && member.id);
            setMembers(validMembers);
        } catch (e) {
            console.error('Error fetching members', e);
            setMembers([]); // Set empty array as fallback
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
        if (!editingPlan) {
            return;
        }
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
        if (!window.confirm('Delete this plan?')) {
            return;
        }
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ borderBottom: '2px solid var(--accent-secondary-color)', pb: 1, mb: 0 }}>
                    Financials
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" onClick={() => setOpenManualPayment(true)}>
                        Record Manual Payment
                    </Button>
                    <Button variant="outlined" onClick={() => {
                        setOpenCreateInvoice(true);
                        // Calculate default due date 30 days from now
                        const defaultDueDate = new Date();
                        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
                        setInvDueDate(formatDateToLocalString(defaultDueDate));
                        setInvJoinDate('');
                    }}>
                        Create Invoice
                    </Button>
                </Box>
            </Box>

            {/* Financial Summary Section */}
            <Typography variant="h5" gutterBottom>Financial Summary</Typography>

            {/* Date Range Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Date Range</InputLabel>
                    <Select
                        value={dateRange}
                        label="Date Range"
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <MenuItem value="last-7-days">Last 7 Days</MenuItem>
                        <MenuItem value="last-30-days">Last 30 Days</MenuItem>
                        <MenuItem value="last-90-days">Last 90 Days</MenuItem>
                        <MenuItem value="last-6-months">Last 6 Months</MenuItem>
                        <MenuItem value="last-year">Last Year</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                    </Select>
                </FormControl>

                {dateRange === 'custom' && (
                    <>
                        <TextField
                            label="Start Date"
                            type="date"
                            size="small"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            size="small"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                    </>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Showing data from {getDateRange().startDate} to {getDateRange().endDate}
                </Typography>
            </Box>

            {/* Outstanding Invoices */}
            <Box ref={outstandingRef} sx={{ marginBottom: '2rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Outstanding Invoices
                        {loadingStates.outstanding && <span style={{ marginLeft: '8px', fontSize: '14px' }}>⏳ Loading...</span>}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Showing {((outstandingPage - 1) * itemsPerPage) + 1} to {Math.min(outstandingPage * itemsPerPage, paginationMeta.outstanding.total)} of {paginationMeta.outstanding.total} invoices
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
                </Box>
                {financialSummary.outstandingInvoices.length > 0 ? (
                    <>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{
                                        background: 'var(--accent-secondary-bg)',
                                        '& .MuiTableCell-root': {
                                            color: '#fff',
                                            fontWeight: 700
                                        }
                                    }}>
                                        <TableCell>Invoice ID</TableCell>
                                        <TableCell>Member Name</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Due Date</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {financialSummary.outstandingInvoices.map(invoice => {
                                        // Ensure invoice is valid before rendering
                                        if (!invoice || typeof invoice !== 'object' || !invoice.id) {
                                            return null;
                                        }
                                        return (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{invoice.id}</TableCell>
                                                <TableCell>{invoice.member_name}</TableCell>
                                                <TableCell>{formatCurrency(invoice.amount, currency)}</TableCell>
                                                <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleEditInvoice(invoice.id)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleDeleteInvoice(invoice.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {paginationMeta.outstanding.total > itemsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Pagination
                                    count={Math.ceil(paginationMeta.outstanding.total / itemsPerPage)}
                                    page={outstandingPage}
                                    onChange={handleOutstandingPageChange}
                                    color="primary"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        )}
                    </>
                ) : (
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center' }}>
                        <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                        <Typography>No outstanding invoices.</Typography>
                    </Box>
                )}
            </Box>

            {/* Payment History */}
            <Box sx={{ marginBottom: '2rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Recent Payment History
                        {loadingStates.payments && <span style={{ marginLeft: '8px', fontSize: '14px' }}>⏳ Loading...</span>}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Showing {((paymentsPage - 1) * itemsPerPage) + 1} to {Math.min(paymentsPage * itemsPerPage, paginationMeta.payments.total)} of {paginationMeta.payments.total} payments
                    </Typography>
                </Box>
                {financialSummary.paymentHistory.length > 0 ? (
                    <>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{
                                        background: 'var(--accent-secondary-bg)',
                                        '& .MuiTableCell-root': {
                                            color: '#fff',
                                            fontWeight: 700
                                        }
                                    }}>
                                        <TableCell>Payment ID</TableCell>
                                        <TableCell>Member Name</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Payment Date</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {financialSummary.paymentHistory.map(payment => (
                                        <TableRow key={payment.id} hover>
                                            <TableCell>{payment.id}</TableCell>
                                            <TableCell>{payment.member_name}</TableCell>
                                            <TableCell>{formatCurrency(payment.amount, currency)}</TableCell>
                                            <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => navigate(`/invoices/${payment.id}`)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Are you sure you want to delete payment #${payment.id}? This will make the associated invoice unpaid.`)) {
                                                                try {
                                                                    await axios.delete(`/api/payments/${payment.id}`);
                                                                    fetchFinancialSummary('payments', paymentsPage, itemsPerPage); // Refresh the data
                                                                    alert('Payment deleted successfully. Invoice status updated to unpaid.');
                                                                } catch (error) {
                                                                    console.error('Error deleting payment:', error);
                                                                    alert(error?.response?.data?.message || 'Error deleting payment.');
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {paginationMeta.payments.total > itemsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Pagination
                                    count={Math.ceil(paginationMeta.payments.total / itemsPerPage)}
                                    page={paymentsPage}
                                    onChange={handlePaymentsPageChange}
                                    color="primary"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        )}
                    </>
                ) : (
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center' }}>
                        <HistoryToggleOffOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                        <Typography>No payment history available.</Typography>
                    </Box>
                )}
            </Box>

            {/* Member Payment Status */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Member Payment Status
                        {loadingStates.members && <span style={{ marginLeft: '8px', fontSize: '14px' }}>⏳ Loading...</span>}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Showing {((membersPage - 1) * itemsPerPage) + 1} to {Math.min(membersPage * itemsPerPage, paginationMeta.members.total)} of {paginationMeta.members.total} members
                    </Typography>
                </Box>
                {financialSummary.memberPaymentStatus.length > 0 ? (
                    <>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{
                                        background: 'var(--accent-secondary-bg)',
                                        '& .MuiTableCell-root': {
                                            color: '#fff',
                                            fontWeight: 700
                                        }
                                    }}>
                                        <TableCell>Member Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Last Payment Date</TableCell>
                                        <TableCell>Last Invoice Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {financialSummary.memberPaymentStatus.map(member => (
                                        <TableRow
                                            key={member.id}
                                            sx={{
                                                backgroundColor: member.is_admin === 1
                                                    ? 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)'
                                                    : member.is_overdue_for_plan === 1
                                                        ? 'rgba(239, 68, 68, 0.08)'
                                                        : 'transparent',
                                                borderLeft: member.is_admin === 1
                                                    ? '4px solid #ffd700'
                                                    : member.is_overdue_for_plan === 1
                                                        ? '4px solid #ef4444'
                                                        : '4px solid transparent',
                                                border: member.is_admin === 1 ? '2px solid #ffd700' : 'none',
                                                '&:hover': {
                                                    backgroundColor: member.is_admin === 1
                                                        ? 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)'
                                                        : member.is_overdue_for_plan === 1
                                                            ? 'rgba(239, 68, 68, 0.12)'
                                                            : 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {member.name}
                                                    {member.is_admin === 1 && (
                                                        <StarIcon
                                                            sx={{
                                                                color: '#ffd700',
                                                                fontSize: 16,
                                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                {member.is_overdue_for_plan === 1 && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '12px',
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        padding: '2px 6px',
                                                        borderRadius: '12px',
                                                        fontWeight: '500'
                                                    }}>
                                                        Payment Due
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{member.email || 'N/A'}</TableCell>
                                            <TableCell>
                                                {member.plan_name ? (
                                                    <span>
                                                        {member.plan_name}
                                                        {member.duration_days && (
                                                            <span style={{ opacity: 0.7, fontSize: '12px', display: 'block' }}>
                                                                ({member.duration_days} days)
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : 'No Plan'}
                                            </TableCell>
                                            <TableCell>{member.last_payment_date ? new Date(member.last_payment_date).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    background: member.last_invoice_status === 'paid'
                                                        ? 'rgba(34, 197, 94, 0.1)'
                                                        : member.last_invoice_status === 'unpaid'
                                                            ? 'rgba(239, 68, 68, 0.1)'
                                                            : 'rgba(156, 163, 175, 0.1)',
                                                    color: member.last_invoice_status === 'paid'
                                                        ? '#059669'
                                                        : member.last_invoice_status === 'unpaid'
                                                            ? '#dc2626'
                                                            : '#6b7280'
                                                }}>
                                                    {member.last_invoice_status || 'N/A'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {paginationMeta.members.total > itemsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Pagination
                                    count={Math.ceil(paginationMeta.members.total / itemsPerPage)}
                                    page={membersPage}
                                    onChange={handleMembersPageChange}
                                    color="primary"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        )}
                    </>
                ) : (
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center' }}>
                        <PersonSearchOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                        <Typography>No member payment status available.</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ marginY: '2rem' }} />

            {/* Membership Plans Section */}
            <Box sx={{ marginBottom: '3rem' }}>
                <Typography variant="h5" gutterBottom>Membership Plans</Typography>

                {/* Create New Plan Form */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <Button onClick={() => setOpenAddPlan(true)}>Add Plan</Button>
                </Box>
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
                <Typography variant="h6" sx={{ color: 'var(--accent-secondary-color)', mb: 1 }}>Existing Plans</Typography>
                    {plans.length > 0 ? (
                    <TableContainer component={Paper} sx={{ overflow: 'hidden' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ 
                                    background: 'var(--accent-secondary-bg)',
                                    '& .MuiTableCell-root': {
                                        color: '#fff',
                                        fontWeight: 700
                                    }
                                }}>
                                    <TableCell>Plan Name</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Duration (Days)</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {plans.map(plan => {
                                    // Ensure plan is valid before rendering
                                    if (!plan || typeof plan !== 'object' || !plan.id) {
                                        return null;
                                    }
                                    return (
                                        <TableRow key={plan.id} hover>
                                            <TableCell>{plan.name}</TableCell>
                                            <TableCell>{formatCurrency(plan.price, currency)}</TableCell>
                                            <TableCell>{plan.duration_days}</TableCell>
                                            <TableCell>{plan.description || 'No description'}</TableCell>
                                            <TableCell>
                                                <Button size="small" variant="outlined" onClick={() => {
                                                    setEditingPlan(plan);
                                                    setPlanName(plan.name);
                                                    setPlanPrice(String(plan.price));
                                                    setPlanDuration(String(plan.duration_days));
                                                    setPlanDescription(plan.description || '');
                                                    setOpenEditPlan(true);
                                                }}>Edit</Button>
                                                <Button size="small" color="error" variant="outlined" onClick={() => handleDeletePlan(plan.id)} sx={{ ml: 1 }}>Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography>No membership plans found. Create one above.</Typography>
                )}
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

            <Dialog open={openManualPayment} onClose={() => setOpenManualPayment(false)} fullWidth maxWidth="sm">
                <DialogTitle>Record Manual Payment</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                            Note: Admin users are exempt from payments and cannot have payments recorded against them.
                        </Typography>
                        <Autocomplete
                            options={nonAdminMembers}
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            getOptionLabel={(option) => option?.name || ''}
                            value={manualMember}
                            onChange={async (_e, value) => {
                                setManualMember(value);
                                setManualInvoiceId('');
                                setManualAmount('');
                                if (value && value.id) {
                                    try {
                                        const res = await axios.get(`/api/payments/unpaid`, { params: { member_id: value.id } });
                                        const list = Array.isArray(res.data) ? res.data : [];
                                        setUnpaidInvoices(list);
                                        if (list.length > 0) {
                                            setManualInvoiceId(String(list[0].id));
                                            setManualAmount(String(list[0].amount));
                                        }
                                    } catch (e) {
                                        console.error('Error fetching unpaid invoices', e);
                                        setUnpaidInvoices([]);
                                    }
                                } else {
                                    setUnpaidInvoices([]);
                                }
                            }}
                            renderInput={(params) => <TextField {...params} label="Member" placeholder="Type member name" />}
                        />
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField label="Invoice ID" type="number" value={manualInvoiceId} onChange={(e)=>setManualInvoiceId(e.target.value)} sx={{ flex: 1 }} />
                            <Button onClick={() => setManualInvoiceId(String(Math.floor(100000 + Math.random() * 900000)))}>Generate Invoice ID</Button>
                        </Box>
                        {unpaidInvoices.length > 0 && (
                            <FormControl fullWidth>
                                <InputLabel>Unpaid Invoices</InputLabel>
                                <Select
                                    label="Unpaid Invoices"
                                    value={manualInvoiceId || ''}
                                    onChange={(e) => {
                                        const invId = e.target.value;
                                        setManualInvoiceId(String(invId));
                                        const inv = unpaidInvoices.find(u => String(u.id) === String(invId));
                                        if (inv) { setManualAmount(String(inv.amount)); }
                                    }}
                                >
                                    {unpaidInvoices.map(inv => {
                                        // Ensure invoice is valid before rendering
                                        if (!inv || typeof inv !== 'object' || !inv.id) {
                                            return null;
                                        }
                                        return (
                                            <MenuItem key={inv.id} value={inv.id}>
                                                #{inv.id} — {formatCurrency(inv.amount, currency)} — Due {new Date(inv.due_date).toLocaleDateString()}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        )}
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
                            // Check if selected member is an admin user
                            if (manualMember && manualMember.is_admin === 1) {
                                alert('Admin users are exempt from payments and cannot have payments recorded against them.');
                                return;
                            }
                            
                            const amountNum = Number(manualAmount);
                            if (!manualAmount || Number.isNaN(amountNum) || amountNum <= 0) {
                                alert('Please enter a valid amount greater than 0.');
                                return;
                            }

                            const payload = {
                                amount: amountNum,
                                method: manualMethod,
                                transaction_id: manualTxnId || undefined,
                                member_id: manualMember?.id || undefined
                            };
                            if (manualInvoiceId) { payload.invoice_id = parseInt(manualInvoiceId,10); }
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

            <Dialog open={openCreateInvoice} onClose={() => {
                setOpenCreateInvoice(false);
                setInvJoinDate('');
                setCreateInvoiceError('');
            }} fullWidth maxWidth="sm">
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                            Note: Admin users are exempt from payments and cannot have invoices created against them.
                        </Typography>
                        <SearchableMemberDropdown
                            value={invMemberId}
                            onChange={(e)=>{ 
                                setInvMemberId(e.target.value); 
                                setCreateInvoiceError(''); // Clear error when user selects
                                // Set join_date when member is selected
                                const selectedMember = members.find(m => String(m.id) === String(e.target.value));
                                if (selectedMember && selectedMember.join_date) {
                                    setInvJoinDate(selectedMember.join_date);
                                }
                            }}
                            members={nonAdminMembers}
                            label="Member"
                            placeholder="Search members by name, ID, or phone..."
                            showId={false}
                            showEmail={true}
                            showAdminIcon={false}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Plan</InputLabel>
                            <Select value={invPlanId} onChange={(e)=>{
                                setInvPlanId(e.target.value);
                                const p = plans.find(pl => String(pl.id) === String(e.target.value));
                                if (p) { 
                                    setInvAmount(String(p.price)); 
                                    // Calculate due date based on join_date and plan duration
                                    if (invJoinDate && p.duration_days) {
                                        const joinDateObj = new Date(invJoinDate);
                                        const dueDate = new Date(joinDateObj);
                                        
                                        if (p.duration_days === 30) {
                                            // For monthly plans, use normalized month calculation
                                            const dayOfMonth = joinDateObj.getDate();
                                            dueDate.setMonth(dueDate.getMonth() + 1);
                                            dueDate.setDate(dayOfMonth);
                                        } else {
                                            // For other durations, use simple day addition
                                            dueDate.setDate(dueDate.getDate() + parseInt(p.duration_days, 10));
                                        }
                                        setInvDueDate(formatDateToLocalString(dueDate));
                                    }
                                }
                            }}>
                                {plans.map(p => {
                                    // Ensure plan is valid before rendering
                                    if (!p || typeof p !== 'object' || !p.id) {
                                        return null;
                                    }
                                    return (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name} - {formatCurrency(p.price, currency)}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        <TextField 
                            label="Amount" 
                            type="number" 
                            value={invAmount} 
                            onChange={(e)=>{
                                setInvAmount(e.target.value);
                                setCreateInvoiceError(''); // Clear error when user types
                            }}
                            required
                            error={!!createInvoiceError}
                            helperText={createInvoiceError || 'Enter the invoice amount'}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <TextField 
                            label="Due Date" 
                            type="date" 
                            value={invDueDate} 
                            onChange={(e)=>{
                                setInvDueDate(e.target.value);
                                setCreateInvoiceError(''); // Clear error when user selects
                            }}
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField label="Join Date" type="date" value={invJoinDate} onChange={(e)=>setInvJoinDate(e.target.value)} InputLabelProps={{ shrink: true }} helperText="Member's joining date for due date calculation" />
                </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={()=>{
                        setOpenCreateInvoice(false);
                        setInvJoinDate('');
                        setCreateInvoiceError('');
                    }}>Cancel</Button>
                    <Button variant="contained" onClick={async ()=>{
                        try {
                            // Clear previous errors
                            setCreateInvoiceError('');
                            
                            // Client-side validation
                            if (!invMemberId) {
                                setCreateInvoiceError('Please select a member');
                                return;
                            }
                            
                            if (!invAmount || invAmount.trim() === '') {
                                setCreateInvoiceError('Please enter an amount');
                                return;
                            }
                            
                            const amountValue = parseFloat(invAmount);
                            if (isNaN(amountValue) || amountValue <= 0) {
                                setCreateInvoiceError('Please enter a valid amount greater than 0');
                                return;
                            }
                            
                            if (!invDueDate) {
                                setCreateInvoiceError('Please select a due date');
                                return;
                            }
                            
                            // Check if selected member is an admin user
                            const selectedMember = members.find(m => String(m.id) === String(invMemberId));
                            if (selectedMember && selectedMember.is_admin === 1) {
                                setCreateInvoiceError('Admin users are exempt from payments and cannot have invoices created against them');
                                return;
                            }
                            
                            // If no plan selected, try to get member's current plan
                            let finalPlanId = invPlanId ? parseInt(invPlanId,10) : null;
                            if (!finalPlanId && invMemberId && selectedMember && selectedMember.membership_plan_id) {
                                finalPlanId = selectedMember.membership_plan_id;
                            }
                            
                            await axios.post('/api/payments/invoice', {
                                member_id: parseInt(invMemberId,10),
                                plan_id: finalPlanId,
                                amount: amountValue,
                                due_date: invDueDate,
                                join_date: invJoinDate
                            });
                            setOpenCreateInvoice(false);
                            setInvJoinDate('');
                            setCreateInvoiceError('');
                            fetchFinancialSummary();
                        } catch (e) { 
                            console.error(e);
                            // Handle specific error messages
                            if (e?.response?.data?.message) {
                                const errorMessage = e.response.data.message;
                                if (errorMessage.includes('NOT NULL constraint failed: invoices.amount')) {
                                    setCreateInvoiceError('Please enter a valid amount');
                                } else if (errorMessage.includes('NOT NULL constraint failed')) {
                                    setCreateInvoiceError('Please fill in all required fields');
                                } else {
                                    setCreateInvoiceError(errorMessage);
                                }
                            } else {
                                setCreateInvoiceError('Error creating invoice. Please try again.');
                            }
                        }
                    }}>Create</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Invoice Dialog */}
            <Dialog open={openEditInvoice} onClose={() => {
                setOpenEditInvoice(false);
            }} fullWidth maxWidth="sm">
                <DialogTitle>Edit Invoice #{editInvoiceId}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                            Note: Admin users are exempt from payments and cannot have invoices created against them.
                        </Typography>
                        <SearchableMemberDropdown
                            value={editInvMemberId}
                            onChange={(e)=>{ setEditInvMemberId(e.target.value); }}
                            members={nonAdminMembers}
                            label="Member"
                            placeholder="Search members by name, ID, or phone..."
                            showId={false}
                            showEmail={true}
                            showAdminIcon={false}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Plan</InputLabel>
                            <Select value={editInvPlanId} onChange={(e)=>{
                                setEditInvPlanId(e.target.value);
                                const p = plans.find(pl => String(pl.id) === String(e.target.value));
                                if (p) { setEditInvAmount(String(p.price)); }
                            }}>
                                <MenuItem value="">No Plan</MenuItem>
                                {plans.map(p => {
                                    // Ensure plan is valid before rendering
                                    if (!p || typeof p !== 'object' || !p.id) {
                                        return null;
                                    }
                                    return (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name} - {formatCurrency(p.price, currency)}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        <TextField label="Amount" type="number" value={editInvAmount} onChange={(e)=>setEditInvAmount(e.target.value)} />
                        <TextField 
                            label="Due Date" 
                            type="date" 
                            value={editInvDueDate} 
                            onChange={(e)=>setEditInvDueDate(e.target.value)} 
                            InputLabelProps={{ shrink: true }}
                        />
                </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={()=>{
                        setOpenEditInvoice(false);
                    }}>Cancel</Button>
                    <Button variant="contained" onClick={async ()=>{
                        try {
                            // Check if selected member is an admin user
                            const selectedMember = members.find(m => String(m.id) === String(editInvMemberId));
                            if (selectedMember && selectedMember.is_admin === 1) {
                                alert('Admin users are exempt from payments and cannot have invoices created against them.');
                                return;
                            }
                            
                            // If no plan selected, try to get member's current plan
                            let finalPlanId = editInvPlanId ? parseInt(editInvPlanId,10) : null;
                            if (!finalPlanId && editInvMemberId && selectedMember && selectedMember.membership_plan_id) {
                                finalPlanId = selectedMember.membership_plan_id;
                            }
                            
                            await axios.put(`/api/payments/invoices/${editInvoiceId}`, {
                                member_id: parseInt(editInvMemberId,10),
                                plan_id: finalPlanId,
                                amount: parseFloat(editInvAmount),
                                due_date: editInvDueDate
                            });
                            setOpenEditInvoice(false);
                            fetchFinancialSummary();
                            alert('Invoice updated successfully');
                        } catch (e) {
                            console.error(e);
                            alert(e?.response?.data?.message || 'Error updating invoice');
                        }
                    }}>Update</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
};

export default Financials;