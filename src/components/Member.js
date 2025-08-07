import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatting';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('');

    useEffect(() => {
        fetchMembers();
        fetchPlans();
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
                setMembershipType(response.data[0].name);
            }
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const addMember = async (e) => {
        e.preventDefault();
        try {
            const newMember = { name, email, membership_type: membershipType };
            await axios.post('/api/members', newMember);
            fetchMembers();
            setName('');
            setEmail('');
            setMembershipType('');
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
                <select value={membershipType} onChange={(e) => setMembershipType(e.target.value)} required>
                    {plans.map(plan => (
                        <option key={plan.id} value={plan.name}>
                            {plan.name} - {formatCurrency(plan.price)}
                        </option>
                    ))}
                </select>
                <button type="submit">Add Member</button>
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
