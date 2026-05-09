import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function WelcomeAdmin() {
    const location = useLocation();
    const { firstName, lastName } = location.state || { firstName: 'Guest', lastName: '' };

    return (
        <main className="app-site-main app-site-main--narrow">
        <div className="app-auth-card">
            <h1>Welcome, {firstName} {lastName}! 🎉</h1>
            <p>Your account has been successfully created.</p>
            <p>You can now manage employees and flights!</p>
            
            <div className="actions">
                <Link to="/admin-dashboard" className="button">Go to dashboard</Link>
                <Link to="/create-employee" className="button secondary">Create Employee</Link>
                <Link to="/login" className="button secondary">Go to Login</Link>
                <Link to="/" className="button secondary">Back to Home</Link>
            </div>
        </div>
        </main>
    );
}
