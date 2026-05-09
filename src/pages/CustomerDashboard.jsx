// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import { auth, hasFirebaseConfiguration } from '../firebase';
import { fetchBuyingCustomer, fetchRewardRedemptions } from '../controller/FetchFromFirebase';
import { subscribeBookingsByAuthUid } from '../controller/SubscribeFirebase';
import { deleteUserByDocId } from '../controller/DeleteFromFirebase';
import { redeemCustomerReward } from '../controller/StoreFirebaseInfo';
import { formatBookingRouteLabel } from '../controller/FlightDisplay';
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
        maximumFractionDigits: 0,
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
        minute: '2-digit',
    });
}

const rewardsCatalog = [
    {
        id: 'free-checked-bag',
        type: 'Baggage',
        title: 'Free Checked Bag',
        description: 'Redeem one standard checked bag on a future itinerary.',
        miles: 2500
    },
    {
        id: 'priority-boarding',
        type: 'Airport',
        title: 'Priority Boarding',
        description: 'Board earlier and settle in before the main cabin starts lining up.',
        miles: 4000
    },
    {
        id: 'inflight-meal',
        type: 'Cabin',
        title: 'Free Meal Combo',
        description: 'Use a reward credit for one inflight meal and drink combo.',
        miles: 5500
    },
    {
        id: 'wifi-pass',
        type: 'Cabin',
        title: 'Free Wi-Fi Pass',
        description: 'Unlock inflight Wi-Fi for one travel day on a participating flight.',
        miles: 7000
    },
    {
        id: 'flight-voucher',
        type: 'Savings',
        title: '$100 Flight Voucher',
        description: 'Apply a travel credit toward a future MinerAirlines booking.',
        miles: 12000
    },
    {
        id: 'domestic-one-way',
        type: 'Travel',
        title: 'Domestic Reward Flight',
        description: 'Redeem a standard one-way domestic flight when reward inventory is open.',
        miles: 25000
    }
];

export default function CustomerDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const [customerData, setCustomerData] = useState(null);
    const [boardingPasses, setBoardingPasses] = useState([]);
    const [rewardRedemptions, setRewardRedemptions] = useState([]);
    const [loadingPasses, setLoadingPasses] = useState(false);
    const [loadingRedemptions, setLoadingRedemptions] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [redeemingRewardId, setRedeemingRewardId] = useState('');
    const [activePanel, setActivePanel] = useState('dashboard');
    const [deleteToast, setDeleteToast] = useState({
        show: false,
        type: 'success',
        message: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { firstName, lastName } = location.state || { firstName: 'Guest', lastName: '' };

    const totalSpent = useMemo(
        () => boardingPasses.reduce((sum, pass) => sum + (Number(pass.price ?? pass.total) || 0), 0),
        [boardingPasses]
    );

    const latestFlightNumber = useMemo(
        () => (
            boardingPasses.length > 0
                ? boardingPasses[boardingPasses.length - 1]?.flight?.flightNumber
                    || boardingPasses[boardingPasses.length - 1]?.flightNumber
                    || 'N/A'
                : 'No trips yet'
        ),
        [boardingPasses]
    );

    const totalPointsEarnedFromBookings = useMemo(
        () => boardingPasses.reduce((sum, pass) => sum + (Number(pass.loyaltyPointsEarned) || 0), 0),
        [boardingPasses]
    );

    const upcomingTrips = useMemo(() => {
        const now = Date.now();
        return boardingPasses
            .filter((pass) => {
                if ((pass.status || 'CONFIRMED') === 'FLIGHT_CANCELLED') return false;
                return true;
            })
            .sort((a, b) => {
                const aDeparture = toDateValue(a.flight?.departure);
                const bDeparture = toDateValue(b.flight?.departure);
                const aTime = aDeparture?.getTime() ?? Number.MAX_SAFE_INTEGER;
                const bTime = bDeparture?.getTime() ?? Number.MAX_SAFE_INTEGER;
                const aFuture = aTime >= now ? 0 : 1;
                const bFuture = bTime >= now ? 0 : 1;

                if (aFuture !== bFuture) return aFuture - bFuture;
                if (aTime !== bTime) return aTime - bTime;

                const aCreated = toDateValue(a.createdAt)?.getTime() || 0;
                const bCreated = toDateValue(b.createdAt)?.getTime() || 0;
                return bCreated - aCreated;
            });
    }, [boardingPasses]);

    const nextTrip = upcomingTrips[0] || null;
    const rewardId = customerData?.userId ? `MR ${String(customerData.userId).slice(0, 10)}` : 'MR Pending';

    useEffect(() => {
        loadCustomerData();
    }, [location.key]);

    useEffect(() => {
        loadRewardRedemptions();
    }, [location.key]);

    useEffect(() => {
        let stopBookingsSubscription = null;

        if (!hasFirebaseConfiguration()) {
            setBoardingPasses([]);
            setLoadingPasses(false);
            return () => {};
        }

        const stopAuthSubscription = onAuthStateChanged(auth, (user) => {
            if (typeof stopBookingsSubscription === 'function') {
                stopBookingsSubscription();
                stopBookingsSubscription = null;
            }

            if (!user) {
                setBoardingPasses([]);
                setLoadingPasses(false);
                return;
            }

            setLoadingPasses(true);

            try {
                stopBookingsSubscription = subscribeBookingsByAuthUid(
                    user.uid,
                    (bookingsIn) => {
                        setBoardingPasses(bookingsIn);
                        setLoadingPasses(false);
                    },
                    (error) => {
                        console.error('Error subscribing to customer bookings:', error);
                        setBoardingPasses([]);
                        setLoadingPasses(false);
                    }
                );
            } catch (error) {
                console.error('Error starting customer bookings subscription:', error);
                setBoardingPasses([]);
                setLoadingPasses(false);
            }
        });

        return () => {
            if (typeof stopBookingsSubscription === 'function') {
                stopBookingsSubscription();
            }
            stopAuthSubscription();
        };
    }, []);

    useEffect(() => {
        if (!deleteToast.show) return undefined;

        const timerId = setTimeout(() => {
            setDeleteToast((prev) => ({ ...prev, show: false }));
        }, 4000);

        return () => clearTimeout(timerId);
    }, [deleteToast.show]);

    const loadCustomerData = async () => {
        try {
            const data = await fetchBuyingCustomer();   
            setCustomerData(data);
        } catch (error) {
            console.error('Error loading customer data:', error);
            setCustomerData(null);
        }
    };

    const loadRewardRedemptions = async () => {
        setLoadingRedemptions(true);
        try {
            const redemptions = await fetchRewardRedemptions();
            setRewardRedemptions(redemptions);
        } catch (error) {
            console.error('Error loading reward redemptions:', error);
            setRewardRedemptions([]);
        } finally {
            setLoadingRedemptions(false);
        }
    };

    const handleDeleteAccount = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {

        if (!customerData?.customerDocId) {
            setDeleteToast({
                show: true,
                type: 'error',
                message: 'Unable to delete account: customer profile ID was not found.'
            });
            return;
        }

        try {
            setIsDeletingAccount(true);
            await deleteUserByDocId(customerData.customerDocId, 'customer', customerData.authUid || '');
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

    const handleBookFlight = () => navigate('/booking');
    const handleSeeFlights = () => navigate('/public-schedule');
    const handleOpenRewards = () => {
        setActivePanel('rewards');
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    const handleOpenDashboard = () => {
        setActivePanel('dashboard');
    };

    const handleRedeemReward = async (reward) => {
        if (!customerData?.customerDocId) {
            setDeleteToast({
                show: true,
                type: 'error',
                message: 'Unable to redeem reward: customer profile not found.'
            });
            return;
        }

        const confirmed = window.confirm(
            `Redeem ${reward.title} for ${reward.miles.toLocaleString()} points?`
        );
        if (!confirmed) {
            return;
        }

        try {
            setRedeemingRewardId(reward.id);
            const result = await redeemCustomerReward({
                customerDocId: customerData.customerDocId,
                authUid: customerData.authUid,
                userId: customerData.userId,
                email: customerData.email,
                rewardId: reward.id,
                title: reward.title,
                type: reward.type,
                milesCost: reward.miles
            });

            setCustomerData((prev) => (
                prev
                    ? {
                        ...prev,
                        loyaltyPoints: result.remainingPoints,
                        miles: result.remainingPoints
                    }
                    : prev
            ));
            setDeleteToast({
                show: true,
                type: 'success',
                message: `${reward.title} redeemed successfully.`
            });
            await loadRewardRedemptions();
        } catch (error) {
            setDeleteToast({
                show: true,
                type: 'error',
                message: error?.message || 'Unable to redeem reward right now.'
            });
        } finally {
            setRedeemingRewardId('');
        }
    };

    return (
        <main className="app-site-main app-site-main--fluid app-site-main--flush-top">
        {deleteToast.show ? (
            <div
                className={`customer-delete-toast customer-delete-toast--${deleteToast.type}`}
                role="status"
                aria-live="polite"
            >
                <span>{deleteToast.message}</span>
                <button
                    type="button"
                    className="customer-delete-toast__close"
                    onClick={() => setDeleteToast((prev) => ({ ...prev, show: false }))}
                    aria-label="Close message"
                >
                    x
                </button>
            </div>
        ) : null}
        <div className="customer-account-page">
            <section className="customer-account-hero">
                <Container fluid className="customer-account-shell">
                    <div className="customer-account-hero__grid">
                        <div className="customer-account-hero__intro">
                            <p className="customer-account-hero__eyebrow">Customer Dashboard</p>
                            <h1>Hi, {customerData?.firstName || firstName || 'Guest'}</h1>
                            <p className="customer-account-hero__id">{rewardId}</p>
                        </div>

                        <div className="customer-account-balance">
                            <div className="customer-account-balance__item">
                                <span className="customer-account-balance__label">Available Credits</span>
                                <span className="customer-account-balance__value">{fmtCurrency(0)}</span>
                            </div>
                            <div className="customer-account-balance__divider" />
                            <div className="customer-account-balance__item">
                                <span className="customer-account-balance__label">Available Points</span>
                                <span className="customer-account-balance__value">{(customerData?.loyaltyPoints || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            <Container fluid className="customer-account-shell customer-account-content">
                <div className="customer-account-actions">
                    <Button size="lg" variant="primary" onClick={handleBookFlight}>Book A Flight</Button>
                    <Button size="lg" variant="secondary" onClick={handleSeeFlights}>Browse Schedule</Button>
                    <Button size="lg" variant={activePanel === 'rewards' ? 'primary' : 'secondary'} onClick={handleOpenRewards}>Rewards</Button>
                </div>

                <div className="customer-account-grid">
                    <section className="customer-panel customer-panel--primary">
                        {activePanel === 'rewards' ? (
                            <>
                                <div className="customer-panel__header">
                                    <h2>Rewards</h2>
                                    <Button variant="secondary" onClick={handleOpenDashboard}>Back to Dashboard</Button>
                                </div>

                                <div className="customer-panel__subheader">
                                    <h3>Available Reward Options</h3>
                                    <span>{rewardsCatalog.length} rewards</span>
                                </div>

                                <Stack gap={3} className="mb-4">
                                    {rewardsCatalog.map((reward) => {
                                        const canAfford = (customerData?.loyaltyPoints || 0) >= reward.miles;
                                        const pointsShort = Math.max(0, reward.miles - (customerData?.loyaltyPoints || 0));

                                        return (
                                            <article key={reward.id} className="trip-activity-card">
                                                <div className="trip-activity-card__header">
                                                    <div>
                                                        <div className="trip-activity-card__title">{reward.title}</div>
                                                        <div className="trip-activity-card__subtitle">{reward.type}</div>
                                                    </div>
                                                    <Badge bg={canAfford ? 'success' : 'secondary'}>
                                                        {reward.miles.toLocaleString()} pts
                                                    </Badge>
                                                </div>
                                                <div className="trip-activity-card__value mb-3">{reward.description}</div>
                                                <Button
                                                    variant={canAfford ? 'primary' : 'secondary'}
                                                    onClick={() => handleRedeemReward(reward)}
                                                    disabled={!canAfford || redeemingRewardId === reward.id}
                                                >
                                                    {redeemingRewardId === reward.id
                                                        ? 'Redeeming...'
                                                        : canAfford
                                                            ? 'Redeem Reward'
                                                            : `Need ${pointsShort.toLocaleString()} More`}
                                                </Button>
                                            </article>
                                        );
                                    })}
                                </Stack>

                                <div className="customer-panel__subheader">
                                    <h3>Reward Redemption History</h3>
                                    <span>{rewardRedemptions.length} redeemed</span>
                                </div>

                                {loadingRedemptions ? (
                                    <Alert variant="info" className="dashboard-empty-alert">Loading redemption history...</Alert>
                                ) : rewardRedemptions.length === 0 ? (
                                    <Alert variant="secondary" className="dashboard-empty-alert">No rewards redeemed yet.</Alert>
                                ) : (
                                    <Stack gap={3}>
                                        {rewardRedemptions.map((redemption) => (
                                            <article key={redemption.redemptionDocId} className="trip-activity-card">
                                                <div className="trip-activity-card__header">
                                                    <div>
                                                        <div className="trip-activity-card__title">{redemption.title || 'Reward'}</div>
                                                        <div className="trip-activity-card__subtitle">{redemption.type || 'Reward'}</div>
                                                    </div>
                                                    <Badge bg="secondary">
                                                        {Number(redemption.milesCost || 0).toLocaleString()} pts
                                                    </Badge>
                                                </div>
                                                <Row className="g-3">
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Voucher Code</div>
                                                        <div className="trip-activity-card__value">{redemption.voucherCode || 'Pending'}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Redeemed</div>
                                                        <div className="trip-activity-card__value">{fmtDateTime(redemption.redeemedAt)}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Status</div>
                                                        <div className="trip-activity-card__value">{redemption.status || 'REDEEMED'}</div>
                                                    </Col>
                                                </Row>
                                            </article>
                                        ))}
                                    </Stack>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="customer-panel__header">
                                    <h2>Upcoming Trips</h2>
                                    <span>{upcomingTrips.length} scheduled</span>
                                </div>

                                {loadingPasses ? (
                                    <Alert variant="info" className="dashboard-empty-alert">Loading your trips...</Alert>
                                ) : nextTrip ? (
                                    <div className="trip-highlight">
                                        <div className="trip-highlight__top">
                                            <div>
                                                <div className="trip-highlight__route">
                                                    {formatBookingRouteLabel(nextTrip)}
                                                </div>
                                                <div className="trip-highlight__flight">
                                                    {nextTrip.flight?.flightNumber || latestFlightNumber} • {fmtDateTime(nextTrip.flight?.departure)}
                                                </div>
                                            </div>
                                            <Badge bg="secondary">{(nextTrip.selectedSeats || []).length || nextTrip.passengers || 0} seat(s)</Badge>
                                        </div>

                                        <div className="trip-highlight__stats">
                                            <div>
                                                <span>Passenger</span>
                                                <strong>{customerData?.fullName || 'Passenger'}</strong>
                                            </div>
                                            <div>
                                                <span>Seats</span>
                                                <strong>{(nextTrip.selectedSeats || []).join(', ') || nextTrip.seatNumber || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span>Total</span>
                                                <strong>{fmtCurrency(nextTrip.price ?? nextTrip.total)}</strong>
                                            </div>
                                            <div>
                                                <span>Points Earned</span>
                                                <strong>{nextTrip.loyaltyPointsEarned || 0}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="customer-empty-state">
                                        <div className="customer-empty-state__pill">You have no upcoming trips.</div>
                                    </div>
                                )}

                                <div className="customer-panel__subheader">
                                    <h3>Recent Booking Activity</h3>
                                    <span>{boardingPasses.length} total booking(s)</span>
                                </div>

                                {boardingPasses.length === 0 ? (
                                    <Alert variant="secondary" className="dashboard-empty-alert">
                                        No bookings yet. <Button variant="link" className="p-0" onClick={handleBookFlight}>Book a flight</Button> to get started.
                                    </Alert>
                                ) : (
                                    <Stack gap={3}>
                                        {boardingPasses.slice().reverse().map((pass, index) => (
                                            <article key={pass.boardingPassId || index} className="trip-activity-card">
                                                <div className="trip-activity-card__header">
                                                    <div>
                                                        <div className="trip-activity-card__title">{pass.flight?.flightNumber || pass.flightNumber || 'Flight'}</div>
                                                        <div className="trip-activity-card__subtitle">
                                                            {formatBookingRouteLabel(pass)}
                                                        </div>
                                                    </div>
                                                    <Badge bg={pass.status === 'FLIGHT_CANCELLED' ? 'warning' : 'secondary'}>
                                                        {pass.status || 'CONFIRMED'}
                                                    </Badge>
                                                </div>

                                                <Row className="g-3">
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Departure</div>
                                                        <div className="trip-activity-card__value">{fmtDateTime(pass.flight?.departure)}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Seats</div>
                                                        <div className="trip-activity-card__value">{(pass.selectedSeats || []).join(', ') || pass.seatNumber || 'N/A'}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Booking Total</div>
                                                        <div className="trip-activity-card__value">{fmtCurrency(pass.price ?? pass.total)}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Points Earned</div>
                                                        <div className="trip-activity-card__value">{pass.loyaltyPointsEarned || 0}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Compensation</div>
                                                        <div className="trip-activity-card__value">{pass.compensationPointsAwarded || pass.compensationMilesAwarded || 0}</div>
                                                    </Col>
                                                    <Col md={4}>
                                                        <div className="trip-activity-card__label">Return</div>
                                                        <div className="trip-activity-card__value">{pass.requestedReturnDate || 'One-way'}</div>
                                                    </Col>
                                                    {Array.isArray(pass.appliedRewards) && pass.appliedRewards.length > 0 ? (
                                                        <Col md={12}>
                                                            <div className="trip-activity-card__label">Applied Rewards</div>
                                                            <div className="trip-activity-card__value">
                                                                {pass.appliedRewards.map((reward) => reward.title || reward.rewardId).join(', ')}
                                                            </div>
                                                        </Col>
                                                    ) : null}
                                                </Row>
                                            </article>
                                        ))}
                                    </Stack>
                                )}
                            </>
                        )}
                    </section>

                    <aside className="customer-panel customer-panel--sidebar">
                        <div className="reward-ad-card">
                            <div className="reward-ad-card__badge">You’re enrolled</div>
                            <h3>{(customerData?.loyaltyPoints || 0).toLocaleString()} points</h3>
                            <p>Keep booking flights to grow your balance. Every mile you fly earns one point.</p>
                            <button type="button" className="reward-ad-card__link" onClick={handleBookFlight}>
                                Earn more points
                            </button>
                        </div>

                        <div className="reward-summary-card">
                            <h3>Rewards Snapshot</h3>
                            <div className="reward-summary-card__row">
                                <span>Total Bookings</span>
                                <strong>{boardingPasses.length}</strong>
                            </div>
                            <div className="reward-summary-card__row">
                                <span>Total Spent</span>
                                <strong>{fmtCurrency(totalSpent)}</strong>
                            </div>
                            <div className="reward-summary-card__row">
                                <span>Latest Flight</span>
                                <strong>{latestFlightNumber}</strong>
                            </div>
                            <div className="reward-summary-card__row">
                                <span>Points From Bookings</span>
                                <strong>{totalPointsEarnedFromBookings}</strong>
                            </div>
                        </div>

                        <div className="reward-summary-card">
                            <h3>Rewards Center</h3>
                            <p className="trip-activity-card__label mb-3">
                                Open your rewards view to redeem benefits and review voucher history.
                            </p>
                            <Button variant="primary" onClick={handleOpenRewards}>Open Rewards</Button>
                        </div>
                    </aside>
                </div>
            </Container>
        </div>
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
