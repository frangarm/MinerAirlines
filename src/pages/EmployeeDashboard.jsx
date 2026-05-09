// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchPublicSchedule } from '../controller/FetchInfo';
import { formatAirportLabel, formatDateTime, formatRouteLabel } from '../controller/FlightDisplay';
import { observeAuthState, signOut as signOut} from '../controller/SignIn';

function toEmailList(list) {
    if (Array.isArray(list)) {
        return list.map((item) => String(item).toLowerCase());
    }
    return [];
}

export default function EmployeeDashboard() {
    const location = useLocation();
    const initialEmail = (location.state?.email || '').toLowerCase();
    const initialRole = (location.state?.role || '').toLowerCase();
    const initialName = `${location.state?.firstName || ''} ${location.state?.lastName || ''}`.trim() || 'Employee';

    const [employeeEmail, setEmployeeEmail] = useState(initialEmail);
    const [employeeRole, setEmployeeRole] = useState(initialRole);
    const [employeeName, setEmployeeName] = useState(initialName);
    const [flights, setFlights] = useState([]);

    useEffect(() => {
        const stop = observeAuthState((user) => {
            if (user?.email) {
                setEmployeeEmail(user.email.toLowerCase());
            }
            if (!user) {
                setEmployeeEmail('');
            }
        });

        return () => stop();
    }, []);

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

    const assignedFlights = useMemo(() => {
        if (!employeeEmail) return [];

        const roleKey = employeeRole === 'attendant' ? 'attendants' : 'pilots';
        return flights
            .filter((flight) => toEmailList(flight.crew?.[roleKey]).includes(employeeEmail))
            .sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
    }, [flights, employeeEmail, employeeRole]);

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <main className="app-site-main">
        <div className="flightsPage">
            <div className="flightsContainer">
                <div className="flightsHeader">
                    <h2>{employeeName}</h2>
                    <p className="sub">
                        Role: {(employeeRole || 'pilot').toUpperCase()} • {employeeEmail || 'No email'}
                    </p>
                </div>

                {assignedFlights.length === 0 ? (
                    <div className="emptyState">
                        <p><b>No assigned flights.</b></p>
                        <p className="muted">You will see flights here once an admin assigns you.</p>
                    </div>
                ) : (
                    <div className="results">
                        {assignedFlights.map((flight) => (
                            <div className="flightCard" key={flight.firestoreDocId || flight.flightNumber}>
                                <div className="flightTop">
                                    <div>
                                        <div className="flightId">
                                            {flight.flightNumber} • {flight.airline}
                                        </div>
                                        <div className="route">
                                            {formatRouteLabel(flight)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flightBottom">
                                    <span className="smallMuted">Origin: {formatAirportLabel(flight.originAirport, flight.origin)}</span>
                                    <span className="smallMuted">Destination: {formatAirportLabel(flight.destinationAirport, flight.destination)}</span>
                                    <span className="smallMuted">Depart: {formatDateTime(flight.departure)}</span>
                                    <span className="smallMuted">Arrive: {formatDateTime(flight.arrival)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '14px' }}>
                    <Link to="/flights" className="button secondary">Browse Flights</Link>
                    <Link to="/login" className="button secondary" onClick={handleLogout}>Log out</Link>
                    <Link to="/" className="button secondary">Home</Link>
                </div>
            </div>
        </div>
        </main>
    );
}
