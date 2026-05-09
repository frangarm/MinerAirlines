// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, hasFirebaseConfiguration } from '../firebase';
import { fetchBuyingCustomer } from '../controller/FetchFromFirebase';
import { getCustomerProfile } from '../controller/StoreFirebaseInfo';

function deriveNames(fullName, fallbackFirstName, fallbackLastName, email) {
    const trimmedName = String(fullName || '').trim();
    if (trimmedName) {
        const nameParts = trimmedName.split(/\s+/).filter(Boolean);
        return {
            firstName: nameParts[0] || fallbackFirstName || 'Guest',
            lastName: nameParts.slice(1).join(' ') || fallbackLastName || ''
        };
    }

    const emailPrefix = String(email || '').split('@')[0].trim();
    if (emailPrefix) {
        return {
            firstName: fallbackFirstName || emailPrefix || 'Guest',
            lastName: fallbackLastName || ''
        };
    }

    return {
        firstName: fallbackFirstName || 'Guest',
        lastName: fallbackLastName || ''
    };
}

export default function WelcomeUser() {
    const location = useLocation();
    const {
        firstName: initialFirstName,
        lastName: initialLastName,
        email: initialEmail
    } = location.state || { firstName: 'Guest', lastName: '', email: '' };
    const [profile, setProfile] = useState({
        firstName: initialFirstName || 'Guest',
        lastName: initialLastName || ''
    });
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);

    useEffect(() => {
        if (!hasFirebaseConfiguration()) {
            return () => {};
        }

        const stopAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) return;

            try {
                const customerProfile = await getCustomerProfile(user.uid, user.email || '');
                if (customerProfile) {
                    setProfile(deriveNames(
                        customerProfile.name,
                        initialFirstName,
                        initialLastName,
                        user.email || initialEmail
                    ));
                }

                const customerData = await fetchBuyingCustomer();
                setLoyaltyPoints(Number(customerData?.loyaltyPoints) || 0);
            } catch (_) {
                // Keep the fallback state from navigation when Firestore data is unavailable.
            }
        });

        return () => stopAuth();
    }, [initialEmail, initialFirstName, initialLastName]);

    const handleLogout = async () => {
        if (hasFirebaseConfiguration()) {
            await signOut(auth);
        }
    };

    return (
        <main className="app-site-main app-site-main--narrow">
        <div className="app-auth-card">
            <h1>Welcome, {profile.firstName} {profile.lastName}! 🎉</h1>
            <p>Your customer account is ready to use.</p>
            <p>Loyalty points balance: <b>{loyaltyPoints}</b></p>
            <p>Start by searching and booking your next flight.</p>
            
            <div className="actions">
                <Link to="/customer-dashboard" className="button secondary">Customer Dashboard</Link>
                <Link to="/booking" className="button">Book A Flight</Link>
                <Link to="/flights" className="button secondary">Browse Flights</Link>
                <Link to="/my-bookings" className="button secondary">My Bookings</Link>
                <Link to="/login" className="button secondary" onClick={handleLogout}>Log out</Link>
                <Link to="/" className="button secondary">Back to Home</Link>
            </div>
        </div>
        </main>
    );
}
