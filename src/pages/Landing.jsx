// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    createFlightSearchCriteria,
    toFlightSearchParams,
    validateFlightSearchCriteria
} from '../controller/FlightSearchCriteria';
import SiteChromeHeader from '../components/SiteChromeHeader';
import '../styles/Landing.css';

const PROMO_MESSAGES = [
    'Earn Miner Rewards points on every flight and manage your upcoming trips from one account dashboard.',
    'Browse the public schedule, choose your seats, and book flights through the same customer flow.',
    'Create a customer account to track booked flights, loyalty points, and boarding activity in one place.',
    'Admins can create flights, update schedules, assign crew, and cancel flights with customer compensation points.',
];

function cleanAirportCode(value) {
    return String(value || '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3);
}

export default function Landing() {
    const navigate = useNavigate();
    const [tripType, setTripType] = useState('one-way');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [depart, setDepart] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [passengers, setPassengers] = useState('1');
    const [errorMessage, setErrorMessage] = useState('');
    const [promoIndex, setPromoIndex] = useState(0);

    const handleSearchFlights = () => {
        const criteria = createFlightSearchCriteria({
            tripType,
            from,
            to,
            depart,
            returnDate,
            passengers,
        });

        const errors = validateFlightSearchCriteria(criteria);
        if (errors.length > 0) {
            setErrorMessage(errors[0]);
            return;
        }

        setErrorMessage('');
        navigate(`/flights?${toFlightSearchParams(criteria).toString()}`);
    };

    const handlePrevPromo = () => {
        setPromoIndex((prev) => (prev - 1 + PROMO_MESSAGES.length) % PROMO_MESSAGES.length);
    };

    const handleNextPromo = () => {
        setPromoIndex((prev) => (prev + 1) % PROMO_MESSAGES.length);
    };

    return (
        <div className="landingPage">
            <SiteChromeHeader />

            <div className="landingPromoBar">
                <div className="landingPromoBar__inner">
                    <button type="button" className="landingPromoBar__arrow" aria-label="Previous promotion" onClick={handlePrevPromo}>‹</button>
                    <p>{PROMO_MESSAGES[promoIndex]}</p>
                    <button type="button" className="landingPromoBar__arrow" aria-label="Next promotion" onClick={handleNextPromo}>›</button>
                </div>
            </div>

            <main className="landingHero">
                <div className="landingHero__shell">
                    <section className="landingSearchCard">
                        <div className="landingSearchTabs">
                            <button type="button" className="landingSearchTabs__tab is-active">Flights</button>
                            <Link to="/public-schedule" className="landingSearchTabs__tab">Schedule</Link>
                            <Link to="/customer-dashboard" className="landingSearchTabs__tab">Rewards</Link>
                            <Link to="/my-bookings" className="landingSearchTabs__tab">Trips</Link>
                        </div>

                        <div className="landingSearchCard__body">
                            <div className="landingSearchCard__topline">
                                <span>* Required fields</span>
                                <span>Search published flights and continue to seat selection after login.</span>
                            </div>

                            <div className="landingSearchGrid landingSearchGrid--top">
                                <div className="field">
                                    <label>Trip type</label>
                                    <select
                                        value={tripType}
                                        onChange={(e) => {
                                            setTripType(e.target.value);
                                            if (e.target.value === 'one-way') setReturnDate('');
                                        }}
                                    >
                                        <option value="one-way">One-way</option>
                                        <option value="round-trip">Round-trip</option>
                                    </select>
                                </div>

                                <div className="field">
                                    <label>Passengers</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="9"
                                        value={passengers}
                                        onChange={(e) => setPassengers(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="landingSearchGrid landingSearchGrid--route">
                                <div className="field">
                                    <label>Depart*</label>
                                    <input
                                        type="text"
                                        placeholder="ELP"
                                        value={from}
                                        onChange={(e) => setFrom(cleanAirportCode(e.target.value))}
                                    />
                                    <small className="hint">3-letter airport code</small>
                                </div>

                                <div className="field">
                                    <label>Arrive*</label>
                                    <input
                                        type="text"
                                        placeholder="LAX"
                                        value={to}
                                        onChange={(e) => setTo(cleanAirportCode(e.target.value))}
                                    />
                                    <small className="hint">3-letter airport code</small>
                                </div>
                            </div>

                            <div className={`landingSearchGrid landingSearchGrid--dates${tripType === 'round-trip' ? '' : ' landingSearchGrid--single'}`}>
                                <div className="field">
                                    <label>Depart date*</label>
                                    <input
                                        type="date"
                                        value={depart}
                                        onChange={(e) => setDepart(e.target.value)}
                                    />
                                </div>

                                {tripType === 'round-trip' && (
                                    <div className="field">
                                        <label>Return date*</label>
                                        <input
                                            type="date"
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="landingSearchActions">
                                <button type="button" className="landingSearchButton" onClick={handleSearchFlights}>
                                    Search flights
                                </button>
                            </div>

                            {errorMessage && <p className="landingSearchError">{errorMessage}</p>}
                        </div>
                    </section>

                    <aside className="landingPromoCard">
                        <span className="landingPromoCard__badge">Miner Rewards Included</span>
                        <h1>Book smarter. Earn points.</h1>
                        <p className="landingPromoCard__fare">Search flights, book seats, and build Miner Rewards points with every mile you fly.</p>

                        <div className="landingPromoCard__ctaRow">
                            <Link to="/booking" className="landingPromoCard__primary">Book now</Link>
                            <Link to="/public-schedule" className="landingPromoCard__secondary">Browse schedule</Link>
                        </div>
                    </aside>
                </div>
            </main>

        </div>
    );
}