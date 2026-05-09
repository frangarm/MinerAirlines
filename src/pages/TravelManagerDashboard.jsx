import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';

import { auth, hasFirebaseConfiguration } from '../firebase';
import { fetchBuyingCustomer } from '../controller/FetchFromFirebase';
import { subscribeBookingsByAuthUid } from '../controller/SubscribeFirebase';
import { formatBookingRouteLabel } from '../controller/FlightDisplay';
import { deleteUserByDocId } from '../controller/DeleteFromFirebase';

import {
    AppAlert as Alert,
    AppBadge as Badge,
    AppButton as Button,
    AppContainer as Container
} from '../styles/Components';

function toDateValue(value) {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fmtCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function fmtDateTime(value) {
    const parsed = toDateValue(value);
    if (!parsed) return 'TBD';
    return parsed.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

export default function TravelManagerDashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    const [managerData, setManagerData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteToast, setDeleteToast] = useState({
        show: false,
        type: 'success',
        message: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    

    //profile loading
    useEffect(() => {
        fetchBuyingCustomer()
            .then(setManagerData)
            .catch(() => setManagerData(null));
    }, []);

    //subscribe to bookings
    useEffect(() => {
        let unsubscribeBookings = null;

        if (!hasFirebaseConfiguration()) {
            setAuthReady(true);
            setBookings([]);
            return () => {};
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setAuthReady(true);
                setBookings([]);
                return;
            }

            setLoadingBookings(true);
            setAuthReady(true);

            unsubscribeBookings = subscribeBookingsByAuthUid(
                user.uid,
                (data) => {
                    setBookings(data || []);
                    setLoadingBookings(false);
                },
                () => {
                    setBookings([]);
                    setLoadingBookings(false);
                }
            );
        });

        return () => {
            unsubscribeBookings?.();
            unsubscribeAuth();
        };
    }, []);

    const totalSpend = useMemo(
        () => bookings.reduce((sum, b) => sum + (Number(b.total || b.price) || 0), 0),
        [bookings]
    );

    const totalSeats = useMemo(
        () => bookings.reduce(
            (sum, b) => sum + ((b.selectedSeats || []).length || b.passengers || 1),
            0
        ),
        [bookings]
    );

    const upcomingTrips = useMemo(() => {
        return bookings
            .filter(b => (b.status || 'CONFIRMED') !== 'FLIGHT_CANCELLED')
            .sort((a, b) => {
                const ta = toDateValue(a.flight?.departure)?.getTime() ?? Infinity;
                const tb = toDateValue(b.flight?.departure)?.getTime() ?? Infinity;
                return ta - tb;
            });
    }, [bookings]);

    //handlers
    const handleAddEmployee = () => navigate('/travel-manager/employees');
    const handleDeleteAccount = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {

        if (!managerData?.customerDocId) {
            setDeleteToast({
                show: true,
                type: 'error',
                message: 'Unable to delete account: customer profile ID was not found.'
            });
            return;
        }

        try {
            setIsDeletingAccount(true);
            await deleteUserByDocId(managerData.customerDocId, 'customer', managerData.authUid || '');
            setDeleteToast({
                show: true,
                type: 'success',
                message: 'Account deleted successfully. Redirecting...'
            });
            setTimeout(() => navigate('/', { replace: true }), 1200);
        } catch (error) {
            console.error('Error deleting customer account:', error);
            const requiresRecentLogin = error?.code === 'auth/requires-recent-login';
            setDeleteToast({
                show: true,
                type: 'error',
                message: requiresRecentLogin
                    ? 'For security, please sign in again and retry account deletion.'
                    : `Unable to delete account: ${error?.message || 'unexpected error'}`
            });
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    //render
    if (!authReady) {
        return (
            <main className="app-site-main app-site-main--fluid">
                <Container>
                    <Alert variant="info">Loading your account…</Alert>
                </Container>
            </main>
        );
    }

    if (!managerData) {
        return (
            <main className="app-site-main app-site-main--fluid">
                <Container>
                    <h1>Travel Manager Dashboard</h1>
                    <Alert variant="warning">
                        Setting up your corporate account. Please refresh if this
                        takes more than a moment.
                    </Alert>
                </Container>
            </main>
        );
    }

    const displayName = managerData.firstName || 'Manager';


    return (
        <main className="app-site-main app-site-main--fluid app-site-main--flush-top">
            <Container fluid className="customer-account-shell">

		{/* Header */} 
                <section className="customer-account-hero">
		    <Container fluid className="customer-account-shell">
			<div className="customer-account-hero__grid">
                            <div className="customer-account-hero__intro">
				<p className="customer-account-hero__eyebrow">
                                    Corporate Travel Manager Overview
				</p>
				<h1> Company Account • Managed by {displayName}</h1>
			    </div>
			</div>
		   </Container>
                </section>


		{/* Buttons */}
                <Stack direction="horizontal" gap={3} className="mb-4">
                    <Button size="lg" variant="secondary" onClick={handleAddEmployee}>
                        Add and Book Employees
                    </Button>
                </Stack>

                {/* Metrics */}
                <Row className="g-4 mb-4">
                    <Col md={4}>
                        <div className="reward-summary-card">
                            <span>Total Company Spend</span>
                            <h3>{fmtCurrency(totalSpend)}</h3>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="reward-summary-card">
                            <span>Total Seats Booked</span>
                            <h3>{totalSeats}</h3>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="reward-summary-card">
                            <span>Upcoming Trips</span>
                            <h3>{upcomingTrips.length}</h3>
                        </div>
                    </Col>
                </Row>

                {/* Past Bookings */}
                <section className="customer-panel customer-panel--primary">
                    <h2>Upcoming Company Trips</h2>

                    {loadingBookings ? (
                        <Alert variant="info">Loading bookings…</Alert>
                    ) : upcomingTrips.length === 0 ? (
                        <Alert variant="secondary">
                            No company bookings yet.
                            <br />
                            Add employees and book flights in bulk to get started.
                        </Alert>
                    ) : (
                        <Stack gap={3}>
                            {upcomingTrips.map((trip, idx) => (
                                <article key={idx} className="trip-activity-card">
                                    <div className="trip-activity-card__header">
                                        <strong>{trip.flight?.flightNumber || 'Flight'}</strong>
                                        <Badge bg="secondary">
                                            {(trip.selectedSeats || []).length || trip.passengers || 1} seat(s)
                                        </Badge>
                                    </div>

                                    <Row className="g-3">
                                        <Col md={4}>
                                            <div className="trip-activity-card__label">Route</div>
                                            <div className="trip-activity-card__value">
                                                {formatBookingRouteLabel(trip)}
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="trip-activity-card__label">Departure</div>
                                            <div className="trip-activity-card__value">
                                                {fmtDateTime(trip.flight?.departure)}
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="trip-activity-card__label">Total Cost</div>
                                            <div className="trip-activity-card__value">
                                                {fmtCurrency(trip.total || trip.price)}
                                            </div>
                                        </Col>
                                    </Row>
                                </article>
                            ))}
                        </Stack>
                    )}
                </section>

            </Container>

	{/* Delete Button */}

        {showDeleteConfirm ? (
            <div
                className="position-fixed top-0 start-0 z-3 w-100 h-100 d-flex align-items-center justify-content-center p-3 bg-dark bg-opacity-50"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isDeletingAccount) {
                        setShowDeleteConfirm(false);
                    }
                }}
            >
                <div className="app-auth-card app-auth-card--wide" style={{ maxWidth: '640px' }}>
                    <h1 style={{ fontSize: '1.8rem' }}>Delete Account</h1>
                    <p>This action cannot be undone. Do you want to continue?</p>
                    <div className="actions">
                        <button
                            type="button"
                            className="button secondary"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeletingAccount}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="button"
                            onClick={confirmDeleteAccount}
                            disabled={isDeletingAccount}
                        >
                            {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </div>
        ) : null}
        <div className="customer-delete-action">
            <button
                type="button"
                className="customer-delete-button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
            >
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </button>
        </div>

	
        </main>
    );
}
