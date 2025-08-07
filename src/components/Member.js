import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [membershipTypes, setMembershipTypes] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('');
    const [membershipPlanId, setMembershipPlanId] = useState('');

    useEffect(() => {
        fetchMembers();
        fetchPlans();
        fetchMembershipTypes();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await axios.get('/api/members');
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await axios.get('/api/plans');
            setPlans(response.data);
            if (response.data.length > 0) {
                setMembershipPlanId(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const fetchMembershipTypes = async () => {
        try {
            const response = await axios.get('/api/settings/membership_types');
            setMembershipTypes(response.data.value);
            if (response.data.value.length > 0) {
                setMembershipType(response.data.value[0]);
            }
        } catch (error) {
            console.error("Error fetching membership types", error);
        }
    };

    const addMember = async (e) => {
        e.preventDefault();
        try {
            const newMember = { 
                name, 
                email, 
                membership_type: membershipType,
                membership_plan_id: membershipPlanId || null
            };
            await axios.post('/api/members', newMember);
            fetchMembers();
            setName('');
            setEmail('');
            if (membershipTypes.length > 0) {
                setMembershipType(membershipTypes[0]);
            }
            if (plans.length > 0) {
                setMembershipPlanId(plans[0].id);
            }
        } catch (error) {
            console.error("Error adding member", error);
        }
    };

    return (
        <div>
            <h2>Members</h2>
            <form onSubmit={addMember}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    required
                />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                />
                <select value={membershipType} onChange={(e) => setMembershipType(e.target.value)} required disabled={membershipTypes.length === 0}>
                    {membershipTypes.length > 0 ? (
                        membershipTypes.map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))
                    ) : (
                        <option>Please create a membership type first</option>
                    )}
                </select>
                <select value={membershipPlanId} onChange={(e) => setMembershipPlanId(e.target.value)} required disabled={plans.length === 0}>
                    {plans.length > 0 ? (
                        plans.map(plan => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} - {formatCurrency(plan.price)}
                            </option>
                        ))
                    ) : (
                        <option>Please create a membership plan first</option>
                    )}
                </select>
                <button type="submit" disabled={plans.length === 0 || membershipTypes.length === 0}>Add Member</button>
            </form>
            <ul>
                {members.map(member => (
                    <li key={member.id}>
                        {member.name} ({member.email}) - {member.membership_type}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Member;
