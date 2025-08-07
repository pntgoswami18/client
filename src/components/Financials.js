import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';

const Financials = () => {
    const [plans, setPlans] = useState([]);
    const [planName, setPlanName] = useState('');
    const [planPrice, setPlanPrice] = useState('');
    const [planDuration, setPlanDuration] = useState('');
    const [planDescription, setPlanDescription] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [financialSummary, setFinancialSummary] = useState({
        outstandingInvoices: [],
        paymentHistory: [],
        memberPaymentStatus: []
    });

    useEffect(() => {
        fetchPlans();
        fetchCurrency();
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
            const response = await axios.get('/api/settings/currency');
            setCurrency(response.data.value);
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
            alert('Membership plan created successfully!');
        } catch (error) {
            console.error("Error creating plan", error);
            alert('Error creating plan. Please try again.');
        }
    };

    const resetPlanForm = () => {
        setPlanName('');
        setPlanPrice('');
        setPlanDuration('');
        setPlanDescription('');
    };

    return (
        <div>
            <h2>Financials</h2>
            
            {/* Membership Plans Section */}
            <div style={{ marginBottom: '40px' }}>
                <h3>Membership Plans</h3>
                
                {/* Create New Plan Form */}
                <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h4>Create New Membership Plan</h4>
                    <form onSubmit={handleCreatePlan}>
                        <input
                            type="text"
                            value={planName}
                            onChange={e => setPlanName(e.target.value)}
                            placeholder="Plan Name (e.g., Monthly Premium)"
                            required
                        />
                        <input
                            type="number"
                            step="0.01"
                            value={planPrice}
                            onChange={e => setPlanPrice(e.target.value)}
                            placeholder="Price (e.g., 49.99)"
                            required
                        />
                        <input
                            type="number"
                            value={planDuration}
                            onChange={e => setPlanDuration(e.target.value)}
                            placeholder="Duration in Days (e.g., 30)"
                            required
                        />
                        <textarea
                            value={planDescription}
                            onChange={e => setPlanDescription(e.target.value)}
                            placeholder="Description (optional)"
                            rows="3"
                        ></textarea>
                        <button type="submit">Create Plan</button>
                    </form>
                </div>

                {/* Existing Plans Table */}
                <div>
                    <h4>Existing Plans</h4>
                    {plans.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Plan Name</th>
                                    <th>Price</th>
                                    <th>Duration (Days)</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map(plan => (
                                    <tr key={plan.id}>
                                        <td>{plan.name}</td>
                                        <td>{formatCurrency(plan.price, currency)}</td>
                                        <td>{plan.duration_days}</td>
                                        <td>{plan.description || 'No description'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No membership plans found. Create one above.</p>
                    )}
                </div>
            </div>

            {/* Payment Processing Section */}
            <div style={{ marginBottom: '40px' }}>
                <h3>Payment Processing</h3>
                <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                    <p><strong>Payment Integration:</strong> This system is integrated with Stripe for secure payment processing.</p>
                    <p><strong>Note:</strong> To process actual payments, you'll need to:</p>
                    <ul>
                        <li>Set up your Stripe account and add the secret key to your .env file</li>
                        <li>Create invoices for members through the backend API</li>
                        <li>Use the /api/payments endpoint to process payments</li>
                    </ul>
                    <p>For testing, you can use Stripe's test card numbers.</p>
                </div>
            </div>

            {/* Financial Summary Section */}
            <div>
                <h3>Financial Summary</h3>
                
                {/* Outstanding Invoices */}
                <div style={{ marginBottom: '30px' }}>
                    <h4>Outstanding Invoices</h4>
                    {financialSummary.outstandingInvoices.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Member Name</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialSummary.outstandingInvoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td>{invoice.id}</td>
                                        <td>{invoice.member_name}</td>
                                        <td>{formatCurrency(invoice.amount, currency)}</td>
                                        <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No outstanding invoices.</p>
                    )}
                </div>

                {/* Payment History */}
                <div style={{ marginBottom: '30px' }}>
                    <h4>Recent Payment History</h4>
                    {financialSummary.paymentHistory.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Payment ID</th>
                                    <th>Member Name</th>
                                    <th>Amount</th>
                                    <th>Payment Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialSummary.paymentHistory.map(payment => (
                                    <tr key={payment.id}>
                                        <td>{payment.id}</td>
                                        <td>{payment.member_name}</td>
                                        <td>{formatCurrency(payment.amount, currency)}</td>
                                        <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No payment history available.</p>
                    )}
                </div>

                {/* Member Payment Status */}
                <div>
                    <h4>Member Payment Status</h4>
                    {financialSummary.memberPaymentStatus.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Member Name</th>
                                    <th>Email</th>
                                    <th>Last Payment Date</th>
                                    <th>Last Invoice Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialSummary.memberPaymentStatus.map(member => (
                                    <tr key={member.id}>
                                        <td>{member.name}</td>
                                        <td>{member.email}</td>
                                        <td>{member.last_payment_date ? new Date(member.last_payment_date).toLocaleDateString() : 'N/A'}</td>
                                        <td>{member.last_invoice_status || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No member payment status available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Financials;