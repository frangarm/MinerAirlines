// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import AirportAutocompleteField from "../components/AirportAutocompleteField";
import { fetchPublicSchedule, fetchPlanes } from '../controller/FetchInfo';
import { storePlane, cancelFlightAndCompensateByDocId, submitFlight, submitInsiderAccount,  syncFlightRouteDataByDocId, updateFlightCrewByDocId, updateFlightDetailsByDocId } from "../controller/StoreFirebaseInfo";
import {subscribeAllBookings, subscribeEmployeesByType} from "../controller/SubscribeFirebase";
import { deleteFlightByDocId } from "../controller/DeleteFromFirebase";
import { estimateArrivalFromDistance, getRouteDetailsByIata } from "../controller/AirportData";
import { describeLayovers, formatAirportLabel, formatBookingRouteLabel, formatDateTime, formatRouteLabel } from "../controller/FlightDisplay";
import { AggregateField } from "firebase/firestore";

const COMPANY_EMAIL_DOMAIN = '@minerairlines.com';

function toCompanyEmail(input) {
    const localPart = String(input ?? '')
        .trim()
        .toLowerCase()
        .split('@')[0]
        .replace(/\s+/g, '');

    return localPart ? `${localPart}${COMPANY_EMAIL_DOMAIN}` : '';
}

function parseEmails(str) {
    return (str || '')
        .split(/[\s,]+/g)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

function fmtDateTime(value) {
    if (!value) return 'N/A';
    const parsed = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
}

function toDateTimeLocalValue(value) {
    if (!value) return '';
    const parsed = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    const pad = (part) => String(part).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function normalizeMiles(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function cleanAirportCode(value) {
    return String(value || '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3);
}

function toEmailList(list) {
    return Array.isArray(list) ? list.map((item) => String(item).toLowerCase()) : [];
}

function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}

export default function AdminDashboard() {
    const [flight, setFlight] = useState({
        origin: '',
        destination: '',
        departure: '',
        layovers: '',
        planeId: '',
        economyPricing: '',
        gate: ''
    });
    const [adminForm, setAdminForm] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [plane, setPLane] = useState({
        manufacturer: '',
        model: '',
        capacity: ''
    });
    const [status, setStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [flights, setFlights] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [bookingError, setBookingError] = useState('');
    const [pilots, setPilots] = useState([]);
    const [attendants, setAttendants] = useState([]);
    const [adminStatus, setAdminStatus] = useState('');
    const [adminErrorMessage, setAdminErrorMessage] = useState('');
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
    const [isCreatingFlight, setIsCreatingFlight] = useState(false);
    const [planes, setPlanes] = useState([]);
    const [newPlane, setNewPlane] = useState({
        capacity: '',
        manufacturer: '',
        model: ''
    });
    const [arrivalPreview, setArrivalPreview] = useState('');
    const [routeDistancePreview, setRouteDistancePreview] = useState(null);
    const [routePreviewLoading, setRoutePreviewLoading] = useState(false);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');


    useEffect(() => {
        const refreshFlights = () => {
            setFlights(fetchPublicSchedule());
        };


        refreshFlights();
        window.addEventListener('public-schedule-updated', refreshFlights);

        return () => {
            window.removeEventListener('public-schedule-updated', refreshFlights);
        };
    }, []);

    useEffect(() => {
        const refreshPlanes = async () => {
            try {
                const fetchedPlanes = await fetchPlanes();
                setPlanes(fetchedPlanes);
                setFlight((prevFlight) => {
                    if (prevFlight.planeId && fetchedPlanes.some((plane) => plane.planeId === prevFlight.planeId)) {
                        return prevFlight;
                    }
                    return {
                        ...prevFlight,
                        planeId: fetchedPlanes[0]?.planeId || ''
                    };
                });
            } catch (error) {
                setErrorMessage(error?.message || 'Unable to load planes.');
            }
        };

        refreshPlanes();
        window.addEventListener('planes-updated', refreshPlanes);

        return () => {
            window.removeEventListener('planes-updated', refreshPlanes);
        };
    }, []);

    useEffect(() => {
        let stopPilots = null;
        let stopAttendants = null;

        try {
            stopPilots = subscribeEmployeesByType('pilot', setPilots, () => {});
            stopAttendants = subscribeEmployeesByType('attendant', setAttendants, () => {});
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to load employees.');
        }

        return () => {
            if (typeof stopPilots === 'function') stopPilots();
            if (typeof stopAttendants === 'function') stopAttendants();
        };
    }, []);

    useEffect(() => {
        let stop = null;

        try {
            stop = subscribeAllBookings(
                (bookingsIn) => {
                    setBookings(bookingsIn);
                    setBookingError('');
                },
                (error) => {
                    setBookingError(error?.message || 'Unable to load bookings.');
                }
            );
        } catch (error) {
            setBookingError(error?.message || 'Unable to load bookings.');
        }

        return () => {
            if (typeof stop === 'function') {
                stop();
            }
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const updateRoutePreview = async () => {
            if (flight.origin.length !== 3 || flight.destination.length !== 3 || !flight.departure) {
                setArrivalPreview('');
                setRouteDistancePreview(null);
                setRoutePreviewLoading(false);
                return;
            }

            try {
                setRoutePreviewLoading(true);
                const routeDetails = await getRouteDetailsByIata(flight.origin, flight.destination);
                const estimatedArrival = estimateArrivalFromDistance(flight.departure, routeDetails.distanceMiles);

                if (isCancelled) return;

                setArrivalPreview(fmtDateTime(estimatedArrival));
                setRouteDistancePreview(routeDetails.distanceMiles);
            } catch (_) {
                if (isCancelled) return;
                setArrivalPreview('');
                setRouteDistancePreview(null);
            } finally {
                if (!isCancelled) {
                    setRoutePreviewLoading(false);
                }
            }
        };

        updateRoutePreview();

        return () => {
            isCancelled = true;
        };
    }, [flight.origin, flight.destination, flight.departure]);

    const sortedFlights = useMemo(() => {
        return [...flights].sort(
            (a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime()
        );
    }, [flights]);

    // @ts-ignore
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFlight((prevFlight) => ({
            ...prevFlight,
            [name]: name === 'origin' || name === 'destination' ? cleanAirportCode(value) : value
        }));
    };

    const handleAdminChange = (e) => {
        const { name, value } = e.target;
        setAdminForm((prevForm) => ({
            ...prevForm,
            [name]: name === 'email' ? value.trim().split('@')[0] : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isCreatingFlight) return;
        setStatus('');
        setErrorMessage('');

        if (flight.origin.length !== 3 || flight.destination.length !== 3) {
            setErrorMessage('Origin and destination must be valid 3-letter airport codes like ELP or LAX.');
            return;
        }

        try {
            setIsCreatingFlight(true);
            const departureDate = new Date(flight.departure);
            const economyPrice = Number(flight.economyPrice);
            const selectedPlane = planes.find(
                (plane) => plane.planeId === flight.planeId
            );

            const docId = await submitFlight(
                flight.origin,
                flight.destination,
                departureDate,
                flight.layovers,
                selectedPlane,
                flight.economyPricing,
                flight.gate
            );

            setStatus(`Flight added. Firestore doc id: ${docId}`);
            setFlight({ origin: '', destination: '', departure: '', arrival: '', layovers: '', gate: '', planeId: planes[0]?.planeId || '', economyPrice: '' });
            setOriginQuery('');
            setDestinationQuery('');
        } catch (error) {
            setErrorMessage(error?.message || 'Unknown error while adding flight.');
        } finally {
            setIsCreatingFlight(false);
        }
    };

    const handlePlaneChange = (e) => {
    const { name, value } = e.target;
        setNewPlane((prevPlane) => ({
            ...prevPlane,
            [name]: value
        }));
    };

    const handleCreatePlane = async (e) => {
        e.preventDefault();
        setStatus('');
        setErrorMessage('');

        try {
            const capacity = Number(newPlane.capacity);
            if (!Number.isFinite(capacity)) {
                throw new Error('Please enter a valid plane capacity.');
            }

            await storePlane(capacity, newPlane.manufacturer, newPlane.model);
            setStatus('Plane added successfully.');
            setNewPlane({ capacity: '', manufacturer: '', model: '' });
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to add plane.');
        }
    };

    const handleDelete = async (firestoreDocId) => {
        setStatus('');
        setErrorMessage('');

        try {
            await deleteFlightByDocId(firestoreDocId);
            setStatus('Flight deleted successfully.');
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to delete flight.');
        }
    };

    const handleCancelFlight = async (firestoreDocId, compensationMiles) => {
        setStatus('');
        setErrorMessage('');

        try {
            const result = await cancelFlightAndCompensateByDocId(firestoreDocId, compensationMiles);
            setStatus(
                `Flight cancelled. ${result.affectedBookings} bookings updated, ${result.rewardedCustomers} customers rewarded, ${result.totalPointsAwarded} loyalty points granted.`
            );
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to cancel flight.');
        }
    };

    const handleSaveCrew = async (firestoreDocId, flightNumber, pilotsDraft, attendantsDraft) => {
        setStatus('');
        setErrorMessage('');

        try {
            await updateFlightCrewByDocId(
                firestoreDocId,
                parseEmails(pilotsDraft),
                parseEmails(attendantsDraft)
            );
            setStatus(`Crew updated successfully for ${flightNumber || firestoreDocId}.`);
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to update crew.');
        }
    };

    const handleRefreshRouteData = async (firestoreDocId, origin, destination, flightNumber) => {
        setStatus('');
        setErrorMessage('');

        try {
            const routeDetails = await syncFlightRouteDataByDocId(firestoreDocId, origin, destination);
            setStatus(`Route data refreshed for ${flightNumber || firestoreDocId}. ${routeDetails.distanceMiles} miles calculated from airport coordinates.`);
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to refresh route data.');
        }
    };

    const handleUpdateFlightDetails = async (firestoreDocId, flightNumber, origin, destination, departure, basePrice) => {
        setStatus('');
        setErrorMessage('');

        try {
            await updateFlightDetailsByDocId(firestoreDocId, origin, destination, departure, basePrice);
            setStatus(`Flight details updated successfully for ${flightNumber || firestoreDocId}.`);
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to update flight details.');
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (isCreatingAdmin) return;

        setAdminStatus('');
        setAdminErrorMessage('');

        const companyEmail = toCompanyEmail(adminForm.email);
        if (!adminForm.firstName || !adminForm.lastName || !companyEmail || !adminForm.password || !adminForm.confirmPassword) {
            setAdminErrorMessage('Please complete all admin account fields.');
            return;
        }
        if (adminForm.password !== adminForm.confirmPassword) {
            setAdminErrorMessage('Passwords do not match.');
            return;
        }

        try {
            setIsCreatingAdmin(true);
            await submitInsiderAccount(
                adminForm.firstName,
                adminForm.lastName,
                adminForm.dateOfBirth,
                adminForm.gender,
                companyEmail,
                adminForm.password,
                'admin'
            );
            setAdminStatus(`Admin account created for ${companyEmail}.`);
            setAdminForm({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: '',
                email: '',
                password: '',
                confirmPassword: ''
            });
        } catch (error) {
            setAdminErrorMessage(error?.message || 'Unable to create admin account.');
        } finally {
            setIsCreatingAdmin(false);
        }
    };

    return (
        <main className="app-site-main app-site-main--fluid">
        <div className="adminDashboardPage">
            <div className="adminContainer">
                <div className="adminHeader">
                    <h2>Admin</h2>
                    <p>Create flights and assign crew.</p>
                </div>

                <h3>Create Admin Account</h3>

                <form className="adminPanel" onSubmit={handleCreateAdmin}>
                    <div className="adminGrid2">
                        <div className="field">
                            <label>First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First name"
                                value={adminForm.firstName}
                                onChange={handleAdminChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last name"
                                value={adminForm.lastName}
                                onChange={handleAdminChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="adminGrid2">
                        <div className="field">
                            <label>Date of Birth</label>
                            <input 
                                type="date"
                                name="dateOfBirth"
                                placeholder="Date of Birth"
                                value={adminForm.dateOfBirth}
                                onChange={handleAdminChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Gender</label>
                            <select
                                name="gender"
                                value={adminForm.gender}
                                onChange={handleAdminChange}
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="adminGrid2">
                        <div className="field">
                            <label>Email Username</label>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <input
                                    type="text"
                                    name="email"
                                    placeholder="admin"
                                    value={adminForm.email}
                                    onChange={handleAdminChange}
                                    required
                                />
                                <span className="hint">{COMPANY_EMAIL_DOMAIN}</span>
                            </div>
                        </div>
                        <div className="field">
                            <label>Password</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Create a password"
                                value={adminForm.password}
                                onChange={handleAdminChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="adminGrid2">
                        <div className="field">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm password"
                                value={adminForm.confirmPassword}
                                onChange={handleAdminChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Role</label>
                            <input type="text" value="Admin" disabled />
                        </div>
                    </div>

                    <button className="adminCta" type="submit">
                        {isCreatingAdmin ? 'Creating Admin...' : 'Create Admin Account'}
                    </button>
                </form>

                {adminStatus && <p className="hint">{adminStatus}</p>}
                {adminErrorMessage && <p className="hint">{adminErrorMessage}</p>}

                <hr className="divider" />

                <h3>Create Flight</h3>

                <form className="adminPanel" onSubmit={handleSubmit}>
                    <div className="adminGrid2">
                        <AirportAutocompleteField
                            label="Origin"
                            placeholder="El Paso or ELP"
                            query={originQuery}
                            code={flight.origin}
                            onQueryChange={setOriginQuery}
                            onCodeChange={(value) => setFlight((prevFlight) => ({ ...prevFlight, origin: value }))}
                            hint="Search by city, airport name, or code."
                            required
                        />
                        <AirportAutocompleteField
                            label="Destination"
                            placeholder="Los Angeles or LAX"
                            query={destinationQuery}
                            code={flight.destination}
                            onQueryChange={setDestinationQuery}
                            onCodeChange={(value) => setFlight((prevFlight) => ({ ...prevFlight, destination: value }))}
                            hint="Search by city, airport name, or code."
                            required
                        />
                    </div>

                    <div className="adminGrid2">
                        <div className="field">
                            <label>Departure</label>
                            <input
                                type="datetime-local"
                                name="departure"
                                value={flight.departure}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Arrival</label>
                            <input
                                type="text"
                                value={
                                    routePreviewLoading
                                        ? 'Calculating route time...'
                                        : arrivalPreview || 'Calculated automatically from route distance'
                                }
                                disabled
                            />
                            <small className="hint">
                                {routeDistancePreview != null
                                    ? `${routeDistancePreview} miles estimated from airport coordinates.`
                                    : 'Arrival time appears after valid origin, destination, and departure are entered.'}
                            </small>
                        </div>
                    </div>

                    <div className="adminGrid2">
                        <div className="field">
                            <label>Economy Pricing</label>
                            <input
                                type="number"
                                name="economyPricing"
                                placeholder="Economy Pricing"
                                value={flight.economyPricing}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="adminGrid2">
                            <div className="field">
                                <label>Gate</label>
                                <input
                                    type="text"
                                    name="gate"
                                    placeholder="Gate"
                                    value={flight.gate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="adminGrid2">
                            <div className="field">
                                <label>Plane</label>
                                <select
                                    name="planeId"
                                    value={flight.planeId}
                                    onChange={handleChange}
                                    required
                                >
                                    {planes.length === 0 && (
                                        <option value="">No planes found in database</option>
                                    )}
                                    {planes.map((plane) => {
                                        const displayName = plane.name || [plane.manufacturer, plane.model].filter(Boolean).join(' ');
                                        return (
                                            <option key={plane.planeId} value={plane.planeId}>
                                                {displayName || 'Unnamed plane'} • {plane.capacity || 'N/A'} seats
                                            </option>
                                        );
                                    })}
                                </select>
                                <small className="hint">Loaded from Firestore planes collection.</small>
                            </div>
                        </div>
                        <div className="field">
                            <label>Layovers</label>
                            <input
                                type="text"
                                name="layovers"
                                placeholder="Layovers (Optional)"
                                value={flight.layovers}
                                onChange={handleChange}
                            />
                            <small className="hint">Optional</small>
                        </div>
                    </div>

                    <p className="hint">Distance and arrival time are calculated automatically from airport latitude and longitude using `airport-data-js`.</p>
                    {errorMessage && <p className="hint">{errorMessage}</p>}
                    {status && <p className="hint">{status}</p>}

                    <button className="adminCta" type="submit" disabled={isCreatingFlight}>
                        {isCreatingFlight ? 'Creating Flight...' : 'Create Flight'}
                    </button>
                </form>

                <hr className="divider" />

                <h3>Create Plane</h3>

                <form className="adminPanel" onSubmit={handleCreatePlane}>
                    <div className="adminGrid3">
                        <div className="field">
                            <label>Manufacturer</label>
                            <input
                                type="text"
                                name="manufacturer"
                                placeholder="Boeing"
                                value={newPlane.manufacturer}
                                onChange={handlePlaneChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Model</label>
                            <input
                                type="text"
                                name="model"
                                placeholder="737 MAX 8"
                                value={newPlane.model}
                                onChange={handlePlaneChange}
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Capacity</label>
                            <input
                                type="number"
                                name="capacity"
                                min="37"
                                max="853"
                                step="1"
                                placeholder="180"
                                value={newPlane.capacity}
                                onChange={handlePlaneChange}
                                required
                            />
                        </div>
                    </div>

                    <button className="adminCta" type="submit">Add Plane</button>
                </form>

                <hr className="divider" />

                <h3>All Flights</h3>

                {sortedFlights.length === 0 ? (
                    <p className="empty">No flights created yet.</p>
                ) : (
                    <div className="flightList">
                        {sortedFlights.map((flight) => (
                            <FlightRow
                                key={flight.firestoreDocId || flight.flightNumber}
                                flight={flight}
                                allFlights={sortedFlights}
                                pilots={pilots}
                                attendants={attendants}
                                onDelete={handleDelete}
                                onCancelFlight={handleCancelFlight}
                                onRefreshRouteData={handleRefreshRouteData}
                                onUpdateFlightDetails={handleUpdateFlightDetails}
                                onSaveCrew={handleSaveCrew}
                            />
                        ))}
                    </div>
                )}

                {!status ? null : <p className="hint">{status}</p>}
                {!errorMessage ? null : <p className="hint">{errorMessage}</p>}

                <hr className="divider" />

                <h3>All Bookings</h3>
                {bookingError && <p className="hint">{bookingError}</p>}
                {bookings.length === 0 ? (
                    <p className="empty">No bookings yet.</p>
                ) : (
                    <div className="flightList">
                        {bookings.map((booking) => (
                            <div className="flightRow" key={booking.bookingDocId}>
                                <div className="flightRowMain">
                                    <div className="rowTitle">
                                        {booking.flight?.flightNumber || 'Flight'} • {formatBookingRouteLabel(booking)}
                                    </div>
                                    <div className="rowSub">
                                        Booking ID: {booking.bookingDocId}
                                    </div>
                                    <div className="rowSub">
                                        Customer: {booking.customerEmail || booking.authUid || 'Unknown'}
                                    </div>
                                    <div className="rowSub">
                                        Status: <b>{booking.status || 'CONFIRMED'}</b> • Passengers: {booking.passengers || 1}
                                    </div>
                                    <div className="rowSub">
                                        Depart: {fmtDateTime(booking.flight?.departure)} • Arrive: {fmtDateTime(booking.flight?.arrival)}
                                    </div>
                                    <div className="rowSub">
                                        Booked: {fmtDateTime(booking.createdAt)} • Checked In: {fmtDateTime(booking.checkedInAt)}
                                    </div>
                                    {booking.status === 'FLIGHT_CANCELLED' && (
                                        <div className="rowSub">
                                            Compensation: {booking.compensationPointsAwarded || booking.compensationMilesAwarded || 0} loyalty points • Cancelled: {fmtDateTime(booking.cancelledAt)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
        </main>
    );
}

function FlightRow({ flight, allFlights, pilots, attendants, onDelete, onCancelFlight, onRefreshRouteData, onSaveCrew, onUpdateFlightDetails }) {
    const [pilotsDraft, setPilotsDraft] = useState(flight.crew?.pilots?.join(', ') || '');
    const [attDraft, setAttDraft] = useState(flight.crew?.attendants?.join(', ') || '');
    const [compensationMiles, setCompensationMiles] = useState(String(flight.compensationMiles ?? 500));
    const [departureDraft, setDepartureDraft] = useState(toDateTimeLocalValue(flight.departure));
    const [basePriceDraft, setBasePriceDraft] = useState(String(flight.basePrice ?? flight.seatPricing?.Economy ?? 199));

    const flightStart = new Date(flight.departure).getTime();
    const flightEnd = new Date(flight.arrival).getTime();
    const isCancelled = (flight.status || 'ACTIVE') === 'CANCELLED';

    const getAvailability = (employeeList, roleKey) => {
        return employeeList.map((employee) => {
            const email = String(employee.email || '').toLowerCase();
            const conflicts = allFlights.filter((otherFlight) => {
                const otherId = otherFlight.firestoreDocId || otherFlight.flightNumber;
                const currentId = flight.firestoreDocId || flight.flightNumber;
                if (otherId === currentId) return false;
                if ((otherFlight.status || 'ACTIVE') === 'CANCELLED') return false;

                const otherStart = new Date(otherFlight.departure).getTime();
                const otherEnd = new Date(otherFlight.arrival).getTime();
                const assignedEmails = toEmailList(otherFlight.crew?.[roleKey]);

                return assignedEmails.includes(email) && overlaps(flightStart, flightEnd, otherStart, otherEnd);
            });

            return {
                ...employee,
                email,
                available: conflicts.length === 0,
                conflicts
            };
        });
    };

    const pilotAvailability = getAvailability(pilots, 'pilots');
    const attendantAvailability = getAvailability(attendants, 'attendants');

    const availablePilots = pilotAvailability.filter((employee) => employee.available).map((employee) => employee.email);
    const unavailablePilots = pilotAvailability.filter((employee) => !employee.available).map((employee) => employee.email);
    const availableAttendants = attendantAvailability.filter((employee) => employee.available).map((employee) => employee.email);
    const unavailableAttendants = attendantAvailability.filter((employee) => !employee.available).map((employee) => employee.email);

    return (
        <div className="flightRow">
            <div className="flightRowMain">
                <div className="rowTitle">
                    {flight.flightNumber || 'Flight'} • {formatRouteLabel(flight)}
                </div>

                <div className="rowSub">
                    Depart: {formatDateTime(flight.departure)} • Arrive: {formatDateTime(flight.arrival)}
                </div>

                <div className="rowSub">
                    Origin: {formatAirportLabel(flight.originAirport, flight.origin)} • Destination: {formatAirportLabel(flight.destinationAirport, flight.destination)}
                </div>
                <div className="rowSub">
                    Flight No: {flight.flightNumber || 'N/A'} • Airline: {flight.airline || 'N/A'} • Distance: {flight.distanceMiles || 0} miles
                </div>
                <div className="rowSub">
                    Gate: {flight.gate || 'N/A'} • Layovers: {describeLayovers(flight.layovers)}
                </div>
                <div className="rowSub">
                    Timezones: {flight.originAirport?.time || 'N/A'} → {flight.destinationAirport?.time || 'N/A'}
                </div>
                <div className="rowSub">
                    Status: <b>{flight.status || 'ACTIVE'}</b>
                    {isCancelled ? ` • Compensation: ${flight.compensationMiles || 0} loyalty points` : ''}
                </div>

                <div className="crewBox">
                    <div className="adminGrid2">
                        <div className="field">
                            <label>Departure Time</label>
                            <input
                                type="datetime-local"
                                value={departureDraft}
                                onChange={(e) => setDepartureDraft(e.target.value)}
                                disabled={isCancelled}
                            />
                        </div>
                        <div className="field">
                            <label>Arrival Time</label>
                            <input
                                type="text"
                                value={fmtDateTime(flight.arrival)}
                                disabled
                            />
                            <small className="hint">Recalculated automatically from the route when you save.</small>
                        </div>
                    </div>

                    <div className="adminGrid2 adminGrid2--basePriceSave">
                        <div className="field adminBasePriceField">
                            <label htmlFor={`base-price-${flight.firestoreDocId || flight.flightNumber}`}>Base Price</label>
                            <div className="adminBasePriceField__row">
                                <input
                                    id={`base-price-${flight.firestoreDocId || flight.flightNumber}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={basePriceDraft}
                                    onChange={(e) => setBasePriceDraft(e.target.value)}
                                    disabled={isCancelled}
                                />
                                <button
                                    className="adminBtn adminBtn--gold"
                                    type="button"
                                    onClick={() => onUpdateFlightDetails(
                                        flight.firestoreDocId,
                                        flight.flightNumber,
                                        flight.origin,
                                        flight.destination,
                                        departureDraft,
                                        basePriceDraft
                                    )}
                                    disabled={isCancelled}
                                >
                                    Save Time & Price
                                </button>
                            </div>
                            <small className="hint">Business and First Class prices are recalculated from this amount.</small>
                        </div>
                    </div>

                    <div className="adminGrid2">
                        <div className="field">
                            <label>Pilots</label>
                            <input
                                list={`pilot-options-${flight.firestoreDocId || flight.flightNumber}`}
                                value={pilotsDraft}
                                onChange={(e) => setPilotsDraft(e.target.value)}
                                disabled={isCancelled}
                            />
                            <datalist id={`pilot-options-${flight.firestoreDocId || flight.flightNumber}`}>
                                {pilots.map((pilot) => (
                                    <option key={pilot.employeeDocId || pilot.email} value={pilot.email} />
                                ))}
                            </datalist>
                            <small className="hint">Available: {availablePilots.join(', ') || 'None'}</small>
                            <small className="hint">Unavailable: {unavailablePilots.join(', ') || 'None'}</small>
                        </div>
                        <div className="field">
                            <label>Attendants</label>
                            <input
                                list={`attendant-options-${flight.firestoreDocId || flight.flightNumber}`}
                                value={attDraft}
                                onChange={(e) => setAttDraft(e.target.value)}
                                disabled={isCancelled}
                            />
                            <datalist id={`attendant-options-${flight.firestoreDocId || flight.flightNumber}`}>
                                {attendants.map((attendant) => (
                                    <option key={attendant.employeeDocId || attendant.email} value={attendant.email} />
                                ))}
                            </datalist>
                            <small className="hint">Available: {availableAttendants.join(', ') || 'None'}</small>
                            <small className="hint">Unavailable: {unavailableAttendants.join(', ') || 'None'}</small>
                        </div>
                    </div>

                    <div className="adminFlightRowBtnRow">
                        <button
                            className="adminBtn adminBtn--secondary"
                            type="button"
                            onClick={() => onSaveCrew(flight.firestoreDocId, flight.flightNumber, pilotsDraft, attDraft)}
                            disabled={isCancelled}
                        >
                            Save Crew
                        </button>
                        <button
                            className="adminBtn adminBtn--secondary"
                            type="button"
                            onClick={() => onRefreshRouteData(flight.firestoreDocId, flight.origin, flight.destination, flight.flightNumber)}
                        >
                            Refresh Route Data
                        </button>
                    </div>

                    <div className="adminGrid2 compensationGrid">
                        <div className="field">
                            <label>Compensation Loyalty Points</label>
                            <input
                                type="number"
                                min="0"
                                step="50"
                                value={compensationMiles}
                                onChange={(e) => setCompensationMiles(e.target.value)}
                                disabled={isCancelled}
                            />
                        </div>
                        <button
                            className="adminBtn adminBtn--danger"
                            type="button"
                            onClick={() => onCancelFlight(flight.firestoreDocId, normalizeMiles(compensationMiles))}
                            disabled={isCancelled}
                        >
                            Cancel Flight + Award Points
                        </button>
                    </div>
                </div>
            </div>

            <button
                className="adminBtn adminBtn--deleteGhost adminBtn--compact"
                type="button"
                onClick={() => onDelete(flight.firestoreDocId)}
            >
                Delete
            </button>
        </div>
    );
}
