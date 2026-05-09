// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicSchedule } from "../controller/FetchInfo";
import { formatRouteLabel } from "../controller/FlightDisplay";
import { observeAuthState } from "../controller/SignIn";
import {
  cancelBookingByDocId,
  checkInBookingByDocId,
  rescheduleBookingByDocId,
} from "../controller/UpdateBookingStatus";
import { subscribeBookingsByAuthUid } from "../controller/SubscribeFirebase";
function fmtDateTime(dateValue) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleString();
}

function toDateValue(dateLike) {
  if (!dateLike) return null;
  if (typeof dateLike?.toDate === "function") return dateLike.toDate();
  return new Date(dateLike);
}

function getCheckInState(booking) {
  const departure = toDateValue(booking.flight?.departure);
  if (!departure || Number.isNaN(departure.getTime())) {
    return { eligible: false, reason: "Departure time unavailable." };
  }

  const now = Date.now();
  const departureMs = departure.getTime();
  const windowStart = departureMs - 24 * 60 * 60 * 1000;

  if (booking.status === "CHECKED_IN") {
    return { eligible: false, reason: "You are already checked in." };
  }
  if (booking.status === "FLIGHT_CANCELLED") {
    return { eligible: false, reason: "This flight was cancelled by the airline." };
  }
  if (booking.status !== "CONFIRMED") {
    return { eligible: false, reason: "Only confirmed boarding passes can check in." };
  }
  if (now >= departureMs) {
    return { eligible: false, reason: "Check-in is closed because departure time has passed." };
  }
  if (now < windowStart) {
    return { eligible: false, reason: "Check-in opens 24 hours before departure." };
  }

  return { eligible: true, reason: "Check-in is open." };
}

function getDisplayStatus(booking) {
  const arrival = toDateValue(booking.flight?.arrival);
  if (
    arrival &&
    !Number.isNaN(arrival.getTime()) &&
    arrival.getTime() < Date.now() &&
    (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN")
  ) {
    return "COMPLETED";
  }

  return booking.status || "CONFIRMED";
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [rawBookings, setRawBookings] = useState([]);
  const [flights, setFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [workingBookingId, setWorkingBookingId] = useState("");

  const getPassId = (booking) => booking.boardingPassId || booking.bookingDocId || "";

  const enrichBookings = (bookingsIn, flightsIn) => {
    const flightsById = new Map(
      flightsIn.map((flight) => [flight.firestoreDocId || flight.flightId, flight])
    );

    return bookingsIn.map((booking) => ({
      ...booking,
      flight: flightsById.get(booking.flightId) || booking.flight || null,
    }));
  };

  const handleCancel = async (booking) => {
    setActionStatus("");
    setActionError("");

    try {
      const passId = getPassId(booking);
      setWorkingBookingId(passId);
      await cancelBookingByDocId(passId);
      setActionStatus(`Boarding pass ${passId} cancelled.`);
    } catch (error) {
      setActionError(error?.message || "Unable to cancel boarding pass.");
    } finally {
      setWorkingBookingId("");
    }
  };

  const handleReschedule = async (booking) => {
    setActionStatus("");
    setActionError("");

    const currentDepart = booking.requestedDepartDate || "";
    const nextDepart = window.prompt("Enter new departure date (YYYY-MM-DD):", currentDepart);
    if (!nextDepart) return;

    let nextReturn = booking.requestedReturnDate || "";
    if ((booking.tripType || "one-way") === "round-trip") {
      const promptedReturn = window.prompt("Enter new return date (YYYY-MM-DD):", nextReturn);
      if (promptedReturn === null) return;
      nextReturn = promptedReturn;
    }

    try {
      const passId = getPassId(booking);
      setWorkingBookingId(passId);
      await rescheduleBookingByDocId(passId, nextDepart, nextReturn);
      setActionStatus(`Boarding pass ${passId} rescheduled.`);
    } catch (error) {
      setActionError(error?.message || "Unable to reschedule boarding pass.");
    } finally {
      setWorkingBookingId("");
    }
  };

  const handleCheckIn = async (booking) => {
    setActionStatus("");
    setActionError("");

    const checkInState = getCheckInState(booking);
    if (!checkInState.eligible) {
      setActionError(checkInState.reason);
      return;
    }

    try {
      const passId = getPassId(booking);
      setWorkingBookingId(passId);
      await checkInBookingByDocId(passId, booking);
      setActionStatus(`Boarding pass ${passId} checked in.`);
    } catch (error) {
      setActionError(error?.message || "Unable to check in.");
    } finally {
      setWorkingBookingId("");
    }
  };

  useEffect(() => {
    const refreshFlights = () => {
      setFlights(fetchPublicSchedule());
    };

    refreshFlights();
    window.addEventListener("public-schedule-updated", refreshFlights);

    return () => {
      window.removeEventListener("public-schedule-updated", refreshFlights);
    };
  }, []);

  useEffect(() => {
    setBookings(enrichBookings(rawBookings, flights));
  }, [rawBookings, flights]);

  useEffect(() => {
    let stopBookingsSubscription = null;

    const stopAuthSubscription = observeAuthState((user) => {
      setErrorMessage("");

      if (!user) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      try {
        stopBookingsSubscription = subscribeBookingsByAuthUid(
          user.uid,
          (bookingsIn) => {
            setRawBookings(bookingsIn);
            setIsLoading(false);
          },
          (error) => {
            setErrorMessage(error?.message || "Unable to fetch your boarding passes.");
            setIsLoading(false);
          }
        );
      } catch (error) {
        setErrorMessage(error?.message || "Unable to subscribe to boarding passes.");
        setIsLoading(false);
      }
    });

    return () => {
      if (typeof stopBookingsSubscription === "function") {
        stopBookingsSubscription();
      }
      stopAuthSubscription();
    };
  }, []);

  return (
    <main className="app-site-main">
    <div className="flightsPage">
      <div className="flightsContainer">
        <div className="flightsHeader">
          <h2>My Boarding Passes</h2>
          <p className="sub">View your confirmed flight reservations and boarding passes.</p>
        </div>

        {isLoading ? (
          <p>Loading boarding passes...</p>
        ) : errorMessage ? (
          <p className="hint">{errorMessage}</p>
        ) : bookings.length === 0 ? (
          <div className="emptyState">
            <p><b>No boarding passes yet.</b></p>
            <p className="muted">Book a flight to see it here.</p>
          </div>
        ) : (
          <div className="results">
            {bookings.map((booking) => (
              <div className="flightCard" key={getPassId(booking)}>
                <div className="flightTop">
                  <div>
                    <div className="flightId">
                      {booking.flight?.flightNumber || "Flight"} • {getDisplayStatus(booking)}
                    </div>
                    <div className="route">
                      {formatRouteLabel(booking.flight || {})}
                    </div>
                  </div>
                  <div className="smallMuted">{booking.tripType || "one-way"}</div>
                </div>

                <div className="flightBottom">
                  <span className="smallMuted">Seat: {booking.selectedSeats?.length ? booking.selectedSeats.join(", ") : booking.seatNumber || "N/A"}</span>
                  <span className="smallMuted">Price: ${booking.price ?? 0}</span>
                </div>
                <div className="flightBottom">
                  <span className="smallMuted">Departure: {fmtDateTime(booking.flight?.departure?.toDate ? booking.flight.departure.toDate() : booking.flight?.departure)}</span>
                  <span className="smallMuted">Arrival: {fmtDateTime(booking.flight?.arrival?.toDate ? booking.flight.arrival.toDate() : booking.flight?.arrival)}</span>
                </div>
                <div className="flightBottom">
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleCheckIn(booking)}
                    disabled={!getCheckInState(booking).eligible || workingBookingId === getPassId(booking)}
                    title={getCheckInState(booking).reason}
                  >
                    {workingBookingId === getPassId(booking) ? "Saving..." : "Check In"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => handleReschedule(booking)}
                    disabled={true}
                    title="Rescheduling is not available under the current Firestore rules."
                  >
                    Reschedule
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => handleCancel(booking)}
                    disabled={booking.status !== "CONFIRMED" || workingBookingId === getPassId(booking)}
                  >
                    {workingBookingId === getPassId(booking) ? "Saving..." : "Cancel"}
                  </button>
                </div>
                <div className="flightBottom">
                  <span className="smallMuted">{getCheckInState(booking).reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {actionStatus && <p className="hint">{actionStatus}</p>}
        {actionError && <p className="hint">{actionError}</p>}

        <div style={{ marginTop: "14px" }}>
          <Link to="/booking" className="button secondary">Book Another Flight</Link>
          <Link to="/flights" className="button secondary">Browse Flights</Link>
          <Link to="/customer-dashboard" className="button secondary">Home</Link>
        </div>
      </div>
    </div>
    </main>
  );
}
