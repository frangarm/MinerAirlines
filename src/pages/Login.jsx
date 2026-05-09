// @ts-nocheck
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { deriveNamesFromCustomer, resolveAppRole } from '../auth/resolveAppRole';
import { writeCachedRole } from '../auth/roleCache';

export default function Login() {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const redirectTo = location.state?.redirectTo || null;

    const navigateToRedirect = (fallbackPath, fallbackState) => {
        if (redirectTo?.pathname) {
            navigate(`${redirectTo.pathname}${redirectTo.search || ''}`, {
                replace: true,
                state: redirectTo.state || undefined
            });
            return;
        }

        navigate(fallbackPath, {
            replace: true,
            state: fallbackState
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const signedInEmail = credential.user.email || email;

            const resolved = await resolveAppRole(credential.user);

            if (resolved.role === 'admin') {
                writeCachedRole(credential.user.uid, 'admin');
                navigate('/admin-dashboard', { replace: true });
                return;
            }

            if (resolved.role === 'employee') {
                writeCachedRole(credential.user.uid, 'employee');
                const ep = resolved.employeeProfile;
                navigate('/employee-dashboard', {
                    replace: true,
                    state: {
                        firstName: ep?.firstName || '',
                        lastName: ep?.lastName || '',
                        role: ep?.role || ep?.type || '',
                        email: signedInEmail
                    }
                });
                return;
            }

            if (resolved.role === 'customer') {
		writeCachedRole(
		    credential.user.uid,
		    resolved.customerProfile?.type || 'customer'
		);

		const { firstName, lastName } = deriveNamesFromCustomer(
		    resolved.customerProfile?.name,
		    signedInEmail
		);

		const isManager = resolved.customerProfile?.type === 'corporate_travel_manager';

		navigate(
		    isManager ? '/travel-manager-dashboard' : '/customer-dashboard',
		    {
			replace: true,
			state: { firstName, lastName, email: signedInEmail }
		    }
		);
		return;
	    }

            setError('This account signed in, but no matching Firestore profile was found for it.');
        } catch (authError) {
            if (authError?.code === 'auth/invalid-credential' || authError?.code === 'auth/user-not-found' || authError?.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (authError?.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
            } else if (authError?.code === 'permission-denied' || authError?.code === 'firestore/permission-denied') {
                setError('Firestore denied access while loading the account profile. Check the role document and rules.');
            } else {
                setError('Unable to sign in right now. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="app-site-main app-site-main--narrow">
            <div className="app-auth-card">
                <h1>Welcome Back</h1>
                <p>Log in to manage your trips and schedules.</p>

                <form className="form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="actions">
                        <button className="button" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </button>
                        <Link to="/" className="button secondary">Back</Link>
                    </div>
                    {error && <p className="helper">{error}</p>}
                </form>

                <div className="helper">
                    Need an account? <Link to="/create-account">Create one</Link>
                </div>
            </div>
        </main>
    );
}
