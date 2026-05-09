// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { generatePath, useLocation, useNavigate } from 'react-router-dom';
import { generateQRCode } from '../controller/GenerateQRCode';
import { fetchBoardingPass } from '../controller/FetchFromFirebase';
import { describeLayovers, formatAirportLabel, formatDateTime, formatRouteLabel } from '../controller/FlightDisplay';

const ACCOMMODATION_LABELS = {
    wheelchair: 'Wheelchair Assistance',
    visual: 'Visual Impairment Assistance',
    hearing: 'Hearing Impairment Assistance',
    oxygen: 'Medical Oxygen',
    service_animal: 'Service Animal',
    unaccompanied: 'Unaccompanied Minor',
    other: 'Other',
};

const formatAccommodation = (id) => ACCOMMODATION_LABELS[id] ?? id;

export default function BookingSuccessful(){
    const location = useLocation();
    const navigate = useNavigate();
    const [boardingPass, setBoardingPass] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const {
        firstName = 'Guest',
        lastName = '',
        flightOrigin: flightOriginFallback = 'N/A',
        flightDestination: flightDestinationFallback = 'N/A',
        passengers = 0,
        tripType = 'one-way',
        returnDate = '',
        total = 0,
        loyaltyPointsEarned = 0,
        appliedRewards = [],
        accommodations: accommodationsFromState = [],
    } = location.state || {};
    const boardingPassId = location.state?.boardingPassId || '';
    const qrCodeRef = useRef(null);
    const qrPath = generatePath('/customer-boarding-pass/:id', { id: boardingPassId });
    const qrScanUrl = `${window.location.origin}${window.location.pathname}#${qrPath}`;
    const totalDisplay = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(total) || 0);
    const passengerName = boardingPass?.passengerName || `${firstName} ${lastName}`.trim() || 'Customer';
    const flight = boardingPass?.flight || {};
    const flightNumber = flight.flightNumber || boardingPass?.flightNumber || 'N/A';
    const flightOrigin = formatAirportLabel(flight.originAirport, flight.origin || flightOriginFallback);
    const flightDestination = formatAirportLabel(flight.destinationAirport, flight.destination || flightDestinationFallback);
    const flightRoute = formatRouteLabel({
        ...flight,
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        origin: flight.origin || flightOriginFallback,
        destination: flight.destination || flightDestinationFallback,
    });
    const flightLayovers = describeLayovers(flight.layovers);
    const flightDeparture = formatDateTime(flight.departure || boardingPass?.departure);
    const flightArrival = formatDateTime(flight.arrival || boardingPass?.arrival);
    const selectedAccommodations = Array.isArray(boardingPass?.accommodations)
        ? boardingPass.accommodations
        : (Array.isArray(accommodationsFromState) ? accommodationsFromState : []);

    const loadBoardingPass = async () => {
        if (!boardingPassId) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await fetchBoardingPass(boardingPassId);
            setBoardingPass(data);
        } catch (loadError) {
            setError(loadError?.message || 'Unable to load this boarding pass.');
        } finally {
            setIsLoading(false);
        }
    }

    const generateBoardingPassQR = () => {
        if (!boardingPassId) {
            return;
        }

        try {
            const qrCodeTarget = qrCodeRef.current;
            if (!qrCodeTarget) {
                return;
            }
            qrCodeTarget.innerHTML = '';
            generateQRCode(passengerName, qrScanUrl, qrCodeTarget);
        } catch (qrError) {
            console.error('Error generating QR code:', qrError);
        }
    };

    useEffect(() => {
        loadBoardingPass();
    }, []);

    useEffect(() => {
        generateBoardingPassQR();
    }, [boardingPass, boardingPassId, passengerName, qrScanUrl]);

    const returnDateDisplay = returnDate || 'N/A';

    return(
        <main className="app-site-main">
        <div className="app-page bg-surface-muted booking-success-shell">
            <div className="app-card w-100 border-0 mx-auto booking-success-card" style={{ maxWidth: '860px' }}>
                <div>
                    <div className="d-grid gap-4">
                        <div className="booking-success-hero">
                            <span className="badge text-bg-success booking-success-badge">Confirmed</span>
                            <h1 className="section-title mb-2">Booking Successful!</h1>
                            <p className="text-muted mb-0">
                                {firstName} {lastName}, your boarding pass has been saved.
                            </p>
                        </div>

                        <div className="app-card border-soft rounded-soft booking-success-details">
                            <div>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <div className="booking-field-label">Flight Number</div>
                                        <div className="booking-field-value">{flightNumber}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="booking-field-label">Flight Origin</div>
                                        <div className="booking-field-value">{flightOrigin}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="booking-field-label">Flight Destination</div>
                                        <div className="booking-field-value">{flightDestination}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Departure</div>
                                        <div className="booking-field-value">{flightDeparture}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Arrival</div>
                                        <div className="booking-field-value">{flightArrival}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Layovers</div>
                                        <div className="booking-field-value">{flightLayovers}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Number of Seats</div>
                                        <div className="booking-field-value">{passengers}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Trip Type</div>
                                        <div className="booking-field-value text-capitalize">{tripType}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="booking-field-label">Return Date</div>
                                        <div className="booking-field-value">{returnDateDisplay}</div>
                                    </div>
                                    <div className="col-12">
                                        <div className="booking-field-label">Accommodations</div>
                                        <div className="booking-field-value">
                                            {selectedAccommodations.length ? selectedAccommodations.map(formatAccommodation).join(', ') : 'None selected'}
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="booking-field-label">Route</div>
                                        <div className="booking-field-value">{flightRoute}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="booking-success-total d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span className="booking-field-label mb-0">Total Paid</span>
                            <span className="booking-total-value">{totalDisplay}</span>
                        </div>

                        <div className="booking-success-total d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span className="booking-field-label mb-0">Loyalty Points Earned</span>
                            <span className="booking-total-value">{Number(loyaltyPointsEarned) || 0}</span>
                        </div>
                        {appliedRewards.length ? (
                            <div className="app-card border-soft rounded-soft">
                                <div>
                                    <div className="booking-field-label mb-3">Applied Rewards</div>
                                    <div className="d-grid gap-2">
                                        {appliedRewards.map((reward, index) => (
                                            <div key={reward.redemptionDocId || reward.rewardId || index} className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <div>
                                                    <div className="booking-field-value">{reward.title || 'Reward'}</div>
                                                    <div className="text-muted small">{reward.voucherCode || 'No voucher code'}</div>
                                                </div>
                                                <span className="badge text-bg-success">{reward.type || 'Reward'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div className="app-card border-soft rounded-soft">
                            <div>
                                <div className="booking-field-label mb-2">Scan To Open Boarding Pass</div>
                                <div id="qr-code" ref={qrCodeRef} className="d-flex justify-content-center" />
                            </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/customer-dashboard', {
                                    state: { firstName, lastName }
                                })}
                            >
                                Back to Home
                            </button>
                            <button type="button" className="btn btn-warning" onClick={() => navigate('/public-schedule')}>
                                Browse More Flights
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </main>
    );
}
