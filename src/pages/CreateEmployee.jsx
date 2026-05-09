// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submitInsiderAccount } from '../controller/StoreFirebaseInfo';

export default function CreateEmployee() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'pilot',
        misc: ''
    });
    const [status, setStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const companyDomain = '@minerairlines.com';

    const miscLabel = useMemo(() => (
        formData.role === 'pilot' ? 'License Number' : 'Crew Rank'
    ), [formData.role]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('');
        setErrorMessage('');

        if (formData.password !== formData.confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }
        if (!String(formData.email || '').toLowerCase().endsWith(companyDomain)) {
            setErrorMessage('Employee email must end with @minerairlines.com.');
            return;
        }

        try {
            await submitInsiderAccount(
                formData.firstName,
                formData.lastName,
                formData.dateOfBirth,
                formData.gender,
                formData.email,
                formData.password,
                formData.role,
                formData.misc
            );

            setStatus('Employee account created successfully.');
            setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'pilot',
                misc: ''
            });
            navigate('/welcome-admin', {
                state: {
                    firstName: formData.firstName,
                    lastName: formData.lastName
                }
            });
        } catch (error) {
            setErrorMessage(error?.message || 'Unknown error while creating employee account.');
        }
    };

    return (
        <main className="app-site-main app-site-main--narrow">
        <div className="app-auth-card app-auth-card--wide">
            <h1>Create Employee Account</h1>
            <p>Create pilot and flight attendant accounts.</p>

            <form className="form" onSubmit={handleSubmit}>
                <div className="app-auth-grid">
                    <div className="field">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="app-auth-grid">
                    <div className="field">
                        <label htmlFor="dateOfBirth">Date of Birth</label>
                        <input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="gender">Gender</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="role">Role</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                    >
                        <option value="pilot">Pilot</option>
                        <option value="attendant">Attendant</option>
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="misc">{miscLabel}</label>
                    <input
                        id="misc"
                        name="misc"
                        type="text"
                        placeholder={formData.role === 'pilot' ? 'Pilot license number' : 'Crew rank'}
                        value={formData.misc}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@minerairlines.com"
                        value={formData.email}
                        onChange={handleChange}
                        pattern="^[A-Za-z0-9._%+-]+@minerairlines\.com$"
                        title="Use a valid company email ending in @minerairlines.com"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="field">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="actions">
                    <button className="button" type="submit">Create Employee</button>
                    <Link to="/admin-dashboard" className="button secondary">Back</Link>
                </div>
            </form>

            {status && <p className="helper">{status}</p>}
            {errorMessage && <p className="helper">{errorMessage}</p>}
        </div>
        </main>
    );
}
