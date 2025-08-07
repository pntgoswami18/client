import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Member = () => {
    const [members, setMembers] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('');

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await axios.get('/api/members');
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
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
                <input
                    type="text"
                    value={membershipType}
                    onChange={(e) => setMembershipType(e.target.value)}
                    placeholder="Membership Type"
                    required
                />
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
