// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { auth } from '../firebase';
import { fetchPublicSchedule } from '../controller/FetchInfo';
import { describeLayovers, formatAirportLabel, formatDateTime, formatRouteLabel } from '../controller/FlightDisplay';
import { fetchBuyingCustomer, fetchRewardRedemptions } from '../controller/FetchFromFirebase';
import { submitBooking } from '../controller/StoreFirebaseInfo';
import '../styles/Flights.css';
import '../styles/Booking.css';

const WIDE_BODY_THRESHOLD = 180;
const DEFAULT_PLANE_CAPACITY = 120;

const ACCOMMODATIONS = [
  { id: 'wheelchair', label: 'Wheelchair Assistance' },
  { id: 'visual', label: 'Visual Impairment Assistance' },
  { id: 'hearing', label: 'Hearing Impairment Assistance' },
  { id: 'oxygen', label: 'Medical Oxygen' },
  { id: 'service_animal', label: 'Service Animal' },
  { id: 'unaccompanied', label: 'Unaccompanied Minor' },
  { id: 'other', label: 'Other (specify in notes)' },
];

function getTierValue(source, tier) {
  if (!source) return 0;
  if (source instanceof Map) return Number(source.get(tier)) || 0;
  return Number(source[tier]) || 0;
}

function fmtCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function tierClassName(tier) {
  if (tier === 'Business') return 'tier-business';
  if (tier === 'First Class') return 'tier-first-class';
  return 'tier-economy';
}

function getSeatClassName(seat, selectedTier, selectedSeatIds) {
  const classes = ['btn', 'seat-button'];

  if (seat.tier !== selectedTier) {
    classes.push('seat-button-out-of-tier');
    return classes.join(' ');
  }

  if (!seat.available) {
    classes.push('seat-button-unavailable');
    return classes.join(' ');
  }

  if (selectedSeatIds.includes(seat.id)) {
    classes.push('seat-button-selected');
    return classes.join(' ');
  }

  classes.push('seat-button-available');
  return classes.join(' ');
}

function CreditCardModal({ onClose, onConfirm, isSubmitting, totalAmount }) {
  const [cardType, setCardType] = useState('credit');
  const [network, setNetwork] = useState('visa');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);

    if (!cardName.trim()) errs.cardName = 'Name is required';
    if (cardNum.replace(/\s/g, '').length !== 16) errs.cardNum = 'Enter a 16-digit card number';
    if (!expiryMatch) {
      errs.expiry = 'Use MM/YY format';
    } else {
      const month = Number(expiryMatch[1]);
      const year = 2000 + Number(expiryMatch[2]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        errs.expiry = 'Enter a valid month (01-12)';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errs.expiry = 'Card is expired';
      }
    }
    if (cvv.length < 3) errs.cvv = 'CVV must be 3-4 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handlePay() {
    if (!validate()) return;
    onConfirm({ cardType, network, cardName, cardNum, expiry, cvv });
  }

  return (
    <div
      className="position-fixed top-0 start-0 z-3 w-100 h-100 d-flex align-items-center justify-content-center p-3 bg-dark bg-opacity-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bookingCard app-auth-card--wide w-100" style={{ maxWidth: '980px' }}>
        <div className="bookingHeader">
          <h2>Payment Details</h2>
          <p>Total due: {fmtCurrency(totalAmount)}</p>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Card type</label>
            <div className="tabs">
              <button
                type="button"
                className={cardType === 'credit' ? 'tab active' : 'tab'}
                onClick={() => setCardType('credit')}
              >
                Credit
              </button>
              <button
                type="button"
                className={cardType === 'debit' ? 'tab active' : 'tab'}
                onClick={() => setCardType('debit')}
              >
                Debit
              </button>
            </div>
          </div>
           <div className="field">
            <label>Network</label>
            <div className="tabs d-flex flex-wrap gap-2">
              <button
                type="button"
                className={network === 'visa' ? 'tab active' : 'tab'}
                onClick={() => setNetwork('visa')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="24" viewBox="0 0 750 471" style={{ display: 'block' }}>
                  <rect width="750" height="471" rx="40" fill="#1a1f71"/>
                  <text x="375" y="320" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="240" fill="#fff" letterSpacing="-10">VISA</text>
                </svg>
              </button>
              <button
                type="button"
                className={network === 'mastercard' ? 'tab active' : 'tab'}
                onClick={() => setNetwork('mastercard')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="24" viewBox="0 0 750 471">
                  <rect width="750" height="471" rx="40" fill="#252525"/>
                  <circle cx="280" cy="235" r="165" fill="#eb001b"/>
                  <circle cx="470" cy="235" r="165" fill="#f79e1b"/>
                  <path d="M375 113a165 165 0 0 1 0 244 165 165 0 0 1 0-244z" fill="#ff5f00"/>
                </svg>
              </button>
              <button
                type="button"
                className={network === 'discover' ? 'tab active' : 'tab'}
                onClick={() => setNetwork('discover')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="24" viewBox="0 0 750 471">
                  <rect width="750" height="471" rx="40" fill="#fff" stroke="#e0e0e0" strokeWidth="8"/>
                  <text x="160" y="300" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="130" fill="#231f20">DISCOVER</text>
                  <circle cx="618" cy="235" r="140" fill="#f76f20"/>
                </svg>
              </button>
              <button
                type="button"
                className={network === 'american express' ? 'tab active' : 'tab'}
                onClick={() => setNetwork('american express')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="24" viewBox="0 0 750 471">
                  <rect width="750" height="471" rx="40" fill="#2557d6"/>
                  <text x="375" y="290" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="110" fill="#fff" letterSpacing="2">AMERICAN</text>
                  <text x="375" y="390" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="110" fill="#fff" letterSpacing="2">EXPRESS</text>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="field">
          <label>Name on card</label>
          <input
            placeholder="John Smith"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
          {errors.cardName && <small className="hint text-danger">{errors.cardName}</small>}
        </div>

        <div className="field">
          <label>Card number</label>
          <input
            placeholder="0000 0000 0000 0000"
            value={cardNum}
            onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
            inputMode="numeric"
          />
          {errors.cardNum && <small className="hint text-danger">{errors.cardNum}</small>}
        </div>

        <div className="grid2">
          <div className="field">
            <label>Expiry</label>
            <input
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              inputMode="numeric"
              maxLength={5}
            />
            {errors.expiry && <small className="hint text-danger">{errors.expiry}</small>}
          </div>
          <div className="field">
            <label>CVV</label>
            <input
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
            />
            {errors.cvv && <small className="hint text-danger">{errors.cvv}</small>}
          </div>
        </div>

        <div className="actions-row mt-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-warning" onClick={handlePay} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : `Pay ${fmtCurrency(totalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectSeats() {
  const { flightNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedFromState = location.state?.flight;
  const selectedEmployees = location.state?.selectedEmployees || [];
  const seatsRequired =
	selectedEmployees.length > 0
	? selectedEmployees.length
	: Number(location.state?.passengers) || 1;  

  const [signedInUser, setSignedInUser] = useState(null);
  const [tier, setTier] = useState('Economy');
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [selectedAccom, setSelectedAccom] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [availableRewards, setAvailableRewards] = useState([]);
  const [applyFreeFlight, setApplyFreeFlight] = useState(false);
  const [applyFreeBag, setApplyFreeBag] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const flight = useMemo(() => {
    if (selectedFromState?.flightNumber === flightNumber) return selectedFromState;
    return fetchPublicSchedule().find((f) => f.flightNumber === flightNumber);
  }, [selectedFromState, flightNumber]);

  const priceByTier = useMemo(
    () => ({
      Economy: getTierValue(flight?.seatPricing, 'Economy'),
      Business: getTierValue(flight?.seatPricing, 'Business'),
      'First Class': getTierValue(flight?.seatPricing, 'First Class'),
    }),
    [flight]
  );

  const seatingMap = useMemo(() => {
    const capacity = Number(flight?.plane?.capacity) || DEFAULT_PLANE_CAPACITY;
    const rawMap = Array.isArray(flight?.seatingMap) ? flight.seatingMap : [];
    const source = rawMap.length > 0 ? rawMap : Array(capacity).fill(0);
    return source.map((s) => (Number(s) === 1 ? 1 : 0));
  }, [flight]);

  const openSeatsFromMap = useMemo(
    () => seatingMap.reduce((n, s) => n + (s === 0 ? 1 : 0), 0),
    [seatingMap]
  );

  const seatingLayout = useMemo(() => {
    const capacity = Number(flight?.plane?.capacity) || DEFAULT_PLANE_CAPACITY;
    return capacity >= WIDE_BODY_THRESHOLD
      ? { seatGroupsPerRow: 3, seatsPerGroup: 3 }
      : { seatGroupsPerRow: 2, seatsPerGroup: 2 };
  }, [flight]);

  const seatsPerRow = seatingLayout.seatGroupsPerRow * seatingLayout.seatsPerGroup;

  const seatTierByIndex = useMemo(() => {
    const totalSeats = seatingMap.length;
    if (totalSeats === 0) return [];

    const totalRows = Math.ceil(totalSeats / seatsPerRow);
    const tierRowCounts = {
      'First Class': Math.max(1, Math.floor(totalRows * 0.02)),
      Business: Math.floor(totalRows * 0.10),
    };
    tierRowCounts.Economy = Math.max(0, totalRows - tierRowCounts['First Class'] - tierRowCounts.Business);

    const tierBySeat = new Array(totalSeats);
    let rowCursor = 0;

    [
      { name: 'Economy' },
      { name: 'Business' },
      { name: 'First Class' },
    ].forEach((tc) => {
      const rowCount = tierRowCounts[tc.name] || 0;
      for (let r = 0; r < rowCount && rowCursor < totalRows; r++) {
        const start = rowCursor * seatsPerRow;
        const end = Math.min(start + seatsPerRow, totalSeats);
        for (let s = start; s < end; s++) tierBySeat[s] = tc.name;
        rowCursor++;
      }
    });

    return tierBySeat;
  }, [seatingMap, seatsPerRow]);

  const availableByTier = useMemo(() => {
    const counts = { Economy: 0, Business: 0, 'First Class': 0 };
    seatingMap.forEach((status, idx) => {
      if (status !== 0) return;
      const tn = seatTierByIndex[idx];
      if (tn && Object.prototype.hasOwnProperty.call(counts, tn)) counts[tn]++;
    });
    return counts;
  }, [seatingMap, seatTierByIndex]);

  const rowTemplate = useMemo(() => {
    const cols = [];
    for (let i = 0; i < seatingLayout.seatGroupsPerRow; i++) {
      cols.push('1fr');
      if (i < seatingLayout.seatGroupsPerRow - 1) cols.push('44px');
    }
    return cols.join(' ');
  }, [seatingLayout]);

  const seatRows = useMemo(() => {
    const rows = [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    for (let i = 0; i < seatingMap.length; i += seatsPerRow) {
      const chunk = seatingMap.slice(i, i + seatsPerRow);
      const rowNumber = Math.floor(i / seatsPerRow) + 1;
      const groups = Array.from({ length: seatingLayout.seatGroupsPerRow }, (_, gi) => {
        const start = gi * seatingLayout.seatsPerGroup;
        return chunk.slice(start, start + seatingLayout.seatsPerGroup).map((status, so) => {
          const absIdx = start + so;
          const mapIdx = i + absIdx;
          return {
            id: `${rowNumber}${letters[absIdx]}`,
            available: status === 0,
            tier: seatTierByIndex[mapIdx] || 'Economy',
          };
        });
      });
      rows.push({ rowNumber, groups, rowTier: seatTierByIndex[i] || 'Economy' });
    }

    return rows;
  }, [seatingMap, seatingLayout, seatsPerRow, seatTierByIndex]);

  const totalSeats = Object.values(availableByTier).reduce((a, n) => a + n, 0);
  const selectedPrice = (priceByTier[tier] || 0) * selectedSeatIds.length;

  const freeFlightReward = useMemo(
    () => availableRewards.find((r) => r.rewardId === 'domestic-one-way' && r.status === 'AVAILABLE'),
    [availableRewards]
  );
  const freeBagReward = useMemo(
    () => availableRewards.find((r) => r.rewardId === 'free-checked-bag' && r.status === 'AVAILABLE'),
    [availableRewards]
  );

  const adjustedPrice = applyFreeFlight && freeFlightReward ? 0 : selectedPrice;
  const canContinue =
	selectedEmployees.length > 0
	? selectedSeatIds.length === seatsRequired
	: selectedSeatIds.length > 0;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setSignedInUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const redemptions = await fetchRewardRedemptions();
        setAvailableRewards(redemptions.filter((r) => r.status === 'AVAILABLE'));
      } catch {
        setAvailableRewards([]);
      }
    };

    load();
  }, []);

  function toggleSeatSelection(seat) {
      if (!seat.available || seat.tier !== tier) return;

      setSelectedSeatIds((prev) => {
	  const already = prev.includes(seat.id);

	  // Deselect always allowed
	  if (already) return prev.filter((id) => id !== seat.id);

	  // Prevent selecting more than required seats (only in bulk flow)
	  if (selectedEmployees.length > 0 && prev.length >= seatsRequired) {
	      return prev; // ignore extra clicks
	  }

	  return [...prev, seat.id];
      });
  }

  function toggleAccom(id) {
    setSelectedAccom((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleConfirmPayment(cardDetails) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const signedInUser = auth.currentUser;
      if (!signedInUser) throw new Error('Please log in before booking seats.');

      const customer = await fetchBuyingCustomer();
      if (!flight?.firestoreDocId) {
        throw new Error('Could not resolve flight details. Please go back and select this flight again.');
      }

      const bookingReturnDate = location.state?.returnDate || '';
      const selectedAccommodations = Array.from(selectedAccom);
      const appliedRewards = [];

      if (applyFreeFlight && freeFlightReward) {
        appliedRewards.push({
          redemptionDocId: freeFlightReward.redemptionDocId,
          rewardId: freeFlightReward.rewardId,
          title: freeFlightReward.title,
          type: freeFlightReward.type,
          voucherCode: freeFlightReward.voucherCode,
          milesCost: freeFlightReward.milesCost,
        });
      }

      if (applyFreeBag && freeBagReward) {
        appliedRewards.push({
          redemptionDocId: freeBagReward.redemptionDocId,
          rewardId: freeBagReward.rewardId,
          title: freeBagReward.title,
          type: freeBagReward.type,
          voucherCode: freeBagReward.voucherCode,
          milesCost: freeBagReward.milesCost,
        });
      }

      const boardingPassId = await submitBooking({
        authUid: signedInUser.uid,
        customerEmail: customer.email,
        tripType: location.state?.tripType || 'one-way',
        passengers: selectedSeatIds.length,
        requestedDepartDate: flight?.departure ? new Date(flight.departure).toISOString().slice(0, 10) : '',
        requestedReturnDate: bookingReturnDate,
        selectedSeats: selectedSeatIds,
        ticketTier: tier,
        accommodations: selectedAccommodations,
        price: adjustedPrice,
        appliedRewards,
        payment: { cardType: cardDetails.cardType, network: cardDetails.network },
        flight: {
          firestoreDocId: flight.firestoreDocId,
          flightNumber: flight.flightNumber,
          origin: flight.origin || '',
          destination: flight.destination || '',
          originAirport: flight.originAirport || null,
          destinationAirport: flight.destinationAirport || null,
          departure: flight.departure,
          arrival: flight.arrival,
          airline: flight.airline,
          layovers: flight.layovers,
          distanceMiles: flight.distanceMiles || 0,
          basePrice: priceByTier[tier] || 0,
          seatPricing: priceByTier,
        },
      });

      setSubmitSuccess('Seats booked successfully.');
      setSelectedSeatIds([]);
      setShowPayModal(false);

      navigate('/booking-successful', {
        state: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          flightOrigin: flight.origin,
          flightDestination: flight.destination,
          passengers: selectedSeatIds.length,
          tripType: location.state?.tripType || 'one-way',
          returnDate: bookingReturnDate,
          total: adjustedPrice,
          loyaltyPointsEarned: (Number(flight.distanceMiles) || 0) * selectedSeatIds.length,
          boardingPassId,
          appliedRewards,
          accommodations: selectedAccommodations,
        },
      });
    } catch (error) {
      setSubmitError(error?.message || 'Unable to complete booking right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!flight) {
    return (
      <main className="app-site-main app-site-main--fluid">
        <div className="flightsPage">
          <div className="app-card">
            <div className="flightsHeader">
              <h2>Seat Selector</h2>
            </div>
            <div className="alert alert-danger">We could not find that flight in the schedule.</div>
            <Link to="/public-schedule" className="button secondary">
              Back to flights
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
      <main className="app-site-main app-site-main--fluid">
      <div className="flightsPage">
        <div className="app-card">
          <div className="flightsHeader">
            <h2>Select Seats</h2>
            <p className="sub">
              {flight.flightNumber} - {formatRouteLabel(flight)}
            </p>

	      {selectedEmployees.length > 0 && (
		  <span className="badge text-bg-primary mt-2">
		      Booking for {selectedEmployees.length} employee(s)
		  </span>
	      )}
          </div>

          <div className="flightCard mb-3 p-3">
            <div className="smallMuted text-uppercase mb-2">Flight Summary</div>
            <div className="d-grid gap-1">
              <div className="smallMuted">Flight Number: {flight.flightNumber || 'N/A'}</div>
              <div className="smallMuted">Origin: {formatAirportLabel(flight.originAirport, flight.origin)}</div>
              <div className="smallMuted">Destination: {formatAirportLabel(flight.destinationAirport, flight.destination)}</div>
              <div className="smallMuted">Departure: {formatDateTime(flight.departure)}</div>
              <div className="smallMuted">Arrival: {formatDateTime(flight.arrival)}</div>
              <div className="smallMuted">Layovers: {describeLayovers(flight.layovers)}</div>
            </div>
          </div>

          <div className="row g-2 mb-3">
            {[
		['Total Available', totalSeats],
		['Open Seats', openSeatsFromMap],
		['Unavailable', seatingMap.length - openSeatsFromMap],
		selectedEmployees.length > 0
		    ? ['Employees', selectedEmployees.length]
		    : ['Selected', selectedSeatIds.length],
	    ].map(([label, val]) => (
		<div key={label} className="col-6 col-md-3">
		    <div className="flightCard p-2 h-100">
			<div className="smallMuted text-uppercase">{label}</div>
			<div className="route">{val}</div>
		    </div>
		</div>
	    ))}
	  </div>

          <div className="mb-3">
            <div className="field mb-2">
              <label>Cabin Tier</label>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {Object.keys(availableByTier).map((tn) => (
                <button
                  key={tn}
                  type="button"
                  className={tier === tn ? 'button m-0' : 'button secondary m-0'}
                  onClick={() => {
                    setTier(tn);
                    setSelectedSeatIds([]);
                  }}
                >
                  {tn} ({availableByTier[tn]} left)
                </button>
              ))}
            </div>
            <div className="hint mt-2">{fmtCurrency(priceByTier[tier])} per seat</div>
          </div>

          {(freeFlightReward || freeBagReward) && (
            <div className="flightCard mb-3">
              <div className="field mb-2">
                <label>Available Reward Benefits</label>
              </div>
              <div className="d-flex flex-column gap-2">
                {freeFlightReward && (
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyFreeFlight}
                      onChange={(e) => setApplyFreeFlight(e.target.checked)}
                    />
                    <span>
                      Use {freeFlightReward.title} ({freeFlightReward.voucherCode}) to book this trip for free
                    </span>
                  </label>
                )}
                {freeBagReward && (
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyFreeBag}
                      onChange={(e) => setApplyFreeBag(e.target.checked)}
                    />
                    <span>
                      Use {freeBagReward.title} ({freeBagReward.voucherCode}) for this trip
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <span className="badge text-bg-light">Estimated total: {fmtCurrency(adjustedPrice)}</span>
            <span className="badge text-bg-light">
              Selected: {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? 's' : ''}
            </span>
            {applyFreeFlight && freeFlightReward && <span className="badge text-bg-success">Free flight applied</span>}
            {applyFreeBag && freeBagReward && <span className="badge text-bg-success">Free luggage applied</span>}
            {selectedAccom.size > 0 && (
              <span className="badge text-bg-primary">
                {selectedAccom.size} accommodation{selectedAccom.size > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {selectedSeatIds.length > 0 && <p className="hint">Seats: {selectedSeatIds.join(', ')}</p>}

          <div className="flightCard mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span className="fw-semibold">Seating map</span>
              <div className="d-flex flex-wrap gap-3">
                <span className="smallMuted d-inline-flex align-items-center gap-2">
                  <i className="seat-swatch seat-swatch-available" />
                  Available
                </span>
                <span className="smallMuted d-inline-flex align-items-center gap-2">
                  <i className="seat-swatch seat-swatch-unavailable" />
                  Unavailable
                </span>
                <span className="smallMuted d-inline-flex align-items-center gap-2">
                  <i className="seat-swatch seat-swatch-selected" />
                  Selected
                </span>
                <span className="smallMuted d-inline-flex align-items-center gap-2">
                  <i className="seat-swatch seat-swatch-out-of-tier" />
                  Other tier
                </span>
              </div>
            </div>

            {seatingMap.length === 0 ? (
              <div className="emptyState text-start">No seating map available for this flight.</div>
            ) : (
              <div className="seat-map-shell" role="list" aria-label="Flight seating map">
                <div className="seat-map-nose" />
                <div className="seat-map-cabin">
                  {seatRows.map((row, ri) => (
                    <div key={`row-wrap-${row.rowNumber}`} className="mb-2">
                      {(ri === 0 || row.rowTier !== seatRows[ri - 1]?.rowTier) && (
                        <div className={`tier-divider ${tierClassName(row.rowTier)}`}>{row.rowTier}</div>
                      )}
                      <div role="listitem" className="seat-map-row" style={{ gridTemplateColumns: rowTemplate, gap: '12px' }}>
                        {row.groups.map((groupSeats, gi) => (
                          <React.Fragment key={`g-${row.rowNumber}-${gi}`}>
                            <div
                              className="seat-map-block"
                              style={{
                                gridTemplateColumns: `repeat(${seatingLayout.seatsPerGroup}, minmax(0, 1fr))`,
                                gap: '12px',
                              }}
                            >
                              {groupSeats.map((seat) => (
                                <button
                                  key={seat.id}
                                  type="button"
                                  className={getSeatClassName(seat, tier, selectedSeatIds)}
                                  title={`Seat ${seat.id}: ${seat.available ? 'available' : 'unavailable'} (${seat.tier})`}
                                  onClick={() => toggleSeatSelection(seat)}
                                  disabled={!seat.available || seat.tier !== tier}
                                >
                                  {seat.id}
                                </button>
                              ))}
                            </div>
                            {gi < row.groups.length - 1 && <div className="seat-map-aisle" aria-hidden="true" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flightCard mb-3">
            <div className="field mb-2">
              <label>Special Accommodations</label>
            </div>
            <p className="hint mb-3">
              Select any accommodations you require. We will make arrangements for your comfort.
            </p>
            <div className="row g-2">
              {ACCOMMODATIONS.map(({ id, label }) => {
                const on = selectedAccom.has(id);
                return (
                  <div key={id} className="col-12 col-md-6">
                    <button
                      type="button"
                      className={`${on ? 'button' : 'button secondary'} w-100 m-0 text-start`}
                      onClick={() => toggleAccom(id)}
                    >
                      {label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="d-flex justify-content-between flex-wrap gap-2">
            <Link
              to="/public-schedule"
              state={{
                from: flight.origin,
                to: flight.destination,
                tripType: location.state?.tripType || 'one-way',
                returnDate: location.state?.returnDate || '',
              }}
              className="button secondary"
            >
              Back to flights
            </Link>
            {signedInUser && (
              <button
                type="button"
                className="button"
                disabled={!canContinue || isSubmitting}
                onClick={() => setShowPayModal(true)}
              >
              Buy {selectedSeatIds.length > 0 ? `(${selectedSeatIds.length} seat${selectedSeatIds.length > 1 ? 's' : ''})` : ''}
            </button>
            )}
            {!signedInUser && (
              <Link to="/login" className="button">
                Log In To Book
              </Link>
            )}
          </div>

          {submitError && <div className="alert alert-danger mt-3">{submitError}</div>}
          {submitSuccess && <div className="alert alert-success mt-3">{submitSuccess}</div>}
        </div>
      </div>

      {showPayModal && (
        <CreditCardModal
          totalAmount={adjustedPrice}
          isSubmitting={isSubmitting}
          onClose={() => setShowPayModal(false)}
          onConfirm={handleConfirmPayment}
        />
      )}
    </main>
  );
}
