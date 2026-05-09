// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, hasFirebaseConfiguration } from '../firebase';
import { resolveAppRole } from '../auth/resolveAppRole';
import { clearCachedRole, readCachedRole, writeCachedRole } from '../auth/roleCache';
import '../styles/AppSiteLayout.css';

/**
 * Shared top bar + info strip (same chrome on AppSiteLayout routes and Landing).
 */
export default function SiteChromeHeader() {
    const navigate = useNavigate();
    const [firebaseUser, setFirebaseUser] = useState(() => auth.currentUser);
    const [customerType, setCustomerType] = useState(null);
    const [role, setRole] = useState(() => {
        const u = auth.currentUser;
        return u ? readCachedRole(u.uid) : null;
    });

    useEffect(() => {
        if (!hasFirebaseConfiguration()) {
            setFirebaseUser(null);
            setRole(null);
            return () => {};
        }

        const stop = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);

            if (!user) {
                setRole(null);
                clearCachedRole();
                return;
            }

            const cached = readCachedRole(user.uid);
            if (cached) {
                setRole(cached);
            }

            
	    try {
		const resolved = await resolveAppRole(user);

		setRole(resolved.role);

		if (resolved.role === 'customer') {
		    setCustomerType(resolved.customerProfile?.type || 'customer');
		} else {
		    setCustomerType(null);
		}
		
		writeCachedRole(user.uid, resolved.role);
	    } catch {
		setRole('unknown');
		setCustomerType(null);
		writeCachedRole(user.uid, 'unknown');
	    }
        });

        return () => stop();
    }, []);

    const handleLogout = async () => {
        clearCachedRole();
        if (hasFirebaseConfiguration()) {
            await signOut(auth);
        }
        navigate('/', { replace: true });
    };

    const navClass = ({ isActive }) =>
        `appSiteNav__link${isActive ? ' is-active' : ''}`;

    const navClassCta = ({ isActive }) =>
        `appSiteNav__link appSiteNav__cta${isActive ? ' is-active' : ''}`;

    const showAuthPending = Boolean(firebaseUser) && role == null;

    
    const getDashboardPath = () => {
	if (role === 'customer' && customerType === 'corporate_travel_manager') {
            return '/travel-manager-dashboard';
	}

	if (role === 'customer') {
            return '/customer-dashboard';
	}

	return '/';
    };

    return (
        <>
            <header className="appSiteTopbar">
                <div className="appSiteTopbar__inner">
                    <NavLink to="/" className="appSiteBrand" end>
                        <span className="appSiteBrand__wordmark">MinerAirlines</span>
                        <span className="appSiteBrand__mark" aria-hidden="true">✈</span>
                    </NavLink>

                    <nav className="appSiteNav" aria-label="Primary">
                        <NavLink to="/" className={navClass} end>Home</NavLink>
                        <NavLink to="/public-schedule" className={navClass}>Schedule</NavLink>
                        <NavLink to="/booking" className={navClass}>Book</NavLink>
                        {!firebaseUser ? (
                            <>
                                <NavLink to="/login" className={navClassCta}>Log In</NavLink>
                                <NavLink to="/create-account" className={navClass}>Create Account</NavLink>
                            </>
                        ) : null}

                        {showAuthPending ? (
                            <span className="appSiteNav__pending" aria-live="polite" aria-busy="true">
                                Account…
                            </span>
                        ) : null}

                        {firebaseUser && role === 'customer' ? (
			    <>
				<NavLink to={getDashboardPath()} className={navClass}>
				    Dashboard
				</NavLink>

				{customerType !== 'corporate_travel_manager' && (
				    <NavLink to="/my-bookings" className={navClass}>
					My Bookings
				    </NavLink>
				)}

				<button
				    type="button"
				    className="appSiteNav__link"
				    onClick={handleLogout}
				>
				    Log Out
				</button>
			    </>
			) : null}
			
			
                        {firebaseUser && role === 'employee' ? (
                            <>
                                <NavLink to="/employee-dashboard" className={navClass}>Employee</NavLink>
                                <button type="button" className="appSiteNav__link" onClick={handleLogout}>Log Out</button>
                            </>
                        ) : null}

                        {firebaseUser && role === 'admin' ? (
                            <>
                                <NavLink to="/admin-dashboard" className={navClass}>Admin</NavLink>
                                <NavLink to="/employee-list" className={navClass}>Employee List</NavLink>
                                <NavLink to="/create-employee" className={navClass}>Create Employee</NavLink>
                                <NavLink to="/admin-analytics" className={navClass}>Analytics</NavLink>
                                <button type="button" className="appSiteNav__link" onClick={handleLogout}>Log Out</button>
                            </>
                        ) : null}

                        {firebaseUser && role === 'unknown' ? (
                            <button type="button" className="appSiteNav__link" onClick={handleLogout}>Log Out</button>
                        ) : null}
                        <NavLink to="/about-us" className={navClass}>About Us</NavLink>
                    </nav>
                </div>
            </header>

            <div className="appSiteInfoBar">
                <div className="appSiteInfoBar__inner">
                    <span className="appSiteInfoBar__icon" aria-hidden="true">i</span>
                    <span>Plan your next trip with live schedule browsing, customer rewards, and self-service booking.</span>
                </div>
            </div>
        </>
    );
}
