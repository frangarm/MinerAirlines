// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/Flights.css";
import { fetchPublicSchedule } from "../controller/FetchInfo";
import { describeLayovers, formatAirportLabel, formatDateTime, formatRouteLabel } from "../controller/FlightDisplay";
import { fromFlightSearchParams } from "../controller/FlightSearchCriteria";
import { auth } from "../firebase";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function cleanAirportCode(v) {
  return (v || "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3);
}

function sameCalendarDayUTC(dateValue, yyyyMmDd) {
  if (!dateValue || !yyyyMmDd) return false;

  const f = new Date(dateValue);
  const [y, m, d] = yyyyMmDd.split("-").map(Number);

  return (
    f.getUTCFullYear() === y &&
    f.getUTCMonth() + 1 === m &&
    f.getUTCDate() === d
  );
}

function minutesBetween(startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const minutes = Math.round((end - start) / 60000);
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

function fmtDate(dateValue) {
  if (!dateValue) return "—";
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Flights() {
  const query = useQuery();
  const navigate = useNavigate();
  const booking = fromFlightSearchParams(query);

  const [flights, setFlights] = useState([]);
  const [from, setFrom] = useState(booking.from);
  const [to, setTo] = useState(booking.to);
  const [depart, setDepart] = useState(booking.depart);
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingBookingId, setSavingBookingId] = useState("");

  const tripType = booking.tripType;
  const ret = booking.returnDate;
  const passengers = String(booking.passengers);
  const hasAnyParams = Boolean(booking.from || booking.to || booking.depart);
  const hasFullFilter = Boolean(from && to && depart);

  const location = useLocation();
  const selectedEmployees = location.state?.selectedEmployees || [];  

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

  const results = useMemo(() => {
    const activeFlights = flights.filter((flight) => (flight.status || "ACTIVE") !== "CANCELLED");

    if (!hasAnyParams && !isEditing) {
      return [...activeFlights].sort(
        (a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime()
      );
    }

    const filtered = (isEditing && !hasFullFilter)
      ? activeFlights
      : activeFlights.filter((f) => (
        (!from || cleanAirportCode(f.origin) === from) &&
        (!to || cleanAirportCode(f.destination) === to) &&
        (!depart || sameCalendarDayUTC(f.departure, depart))
      ));

    return [...filtered].sort(
      (a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime()
    );
  }, [flights, hasAnyParams, isEditing, hasFullFilter, from, to, depart]);

  const headerText = () => {
      if (!hasAnyParams && !isEditing) return "Showing all flights";

      if (from || to || depart) {
	  return (
	      <>
		  {from || "ANY"} → {to || "ANY"} • Depart {depart ? fmtDate(depart) : "Any day"}
		  {tripType === "round-trip" && ret ? ` • Return ${fmtDate(ret)}` : ""}
		  {" "}• {passengers} seat(s)
		  {selectedEmployees.length > 0 && (
		      <> • Booking for {selectedEmployees.length} employee(s)</>
		  )}
	      </>
	  );
      }
      
      return "Showing all flights";
  };

    const handleSelectFlight = (flight) => {
        setStatusMessage("");
        setErrorMessage("");

        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate("/login", {
            state: {
              redirectTo: {
                pathname: `/select-seats/${flight.flightNumber}`,
                state: {
                  flight,
                  passengers: Number(passengers) || 1,
                  tripType,
                  returnDate: booking.returnDate,
                },
              },
            },
          });
          return;
        }

    
	navigate(`/select-seats/${flight.flightNumber}`, {
	    state: {
		flight,
		passengers: Number(passengers) || 1,
		tripType,
		returnDate: booking.returnDate,
		selectedEmployees, 
	    },
	});
    };

  return (
    <main className="app-site-main">
    <div className="flightsPage">
      <div className="flightsContainer">
        <div className="flightsHeader">
          <h2>Available Flights</h2>
          <p className="sub">{headerText()}</p>

          <div className="headerActions">
            {!isEditing && (
              <button
                className="button secondary"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                Edit Search
              </button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="inlineSearchWrapper">
            <button
              className="closeInline"
              type="button"
              onClick={() => setIsEditing(false)}
              aria-label="Hide search"
              title="Hide"
            >
              ✕
            </button>

            <div className="inlineSearch">
              <div className="field">
                <label>From</label>
                <input
                  type="text"
                  placeholder="ELP"
                  value={from}
                  onChange={(e) => setFrom(cleanAirportCode(e.target.value))}
                />
              </div>

              <div className="field">
                <label>To</label>
                <input
                  type="text"
                  placeholder="DFW"
                  value={to}
                  onChange={(e) => setTo(cleanAirportCode(e.target.value))}
                />
              </div>

              <div className="field">
                <label>Departure</label>
                <input
                  type="date"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <div className="emptyState">
            <p><b>No flights found.</b></p>
            <p className="muted">Try adjusting your search.</p>
          </div>
        ) : (
          <div className="results">
            {results.map((flight) => {
              const durationMinutes = minutesBetween(flight.departure, flight.arrival);
              const durationText = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
              const routeLabel = formatRouteLabel(flight);
              const layoversText = describeLayovers(flight.layovers);

              return (
                <div className="flightCard" key={flight.firestoreDocId || flight.flightNumber}>
                  <div className="flightTop">
                    <div>
                      <div className="flightId">
                        {flight.flightNumber} • {flight.airline}
                      </div>
                      <div className="route">
                        {routeLabel}
                      </div>
                    </div>
                    <div className="smallMuted">{fmtDate(flight.departure)}</div>
                  </div>

                  <div className="flightMid">
                    <div className="timeBlock">
                      <span className="time">{formatDateTime(flight.departure)}</span>
                      <span className="label">Departure</span>
                    </div>

                    <div className="metaBlock">
                      <span className="duration">{durationText}</span>
                    </div>

                    <div className="timeBlock">
                      <span className="time">{formatDateTime(flight.arrival)}</span>
                      <span className="label">Arrival</span>
                    </div>
                  </div>

                  <div className="flightBottom">
                    <span className="smallMuted">Origin: {formatAirportLabel(flight.originAirport, flight.origin)}</span>
                    <span className="smallMuted">Destination: {formatAirportLabel(flight.destinationAirport, flight.destination)}</span>
                    <span className="smallMuted">Layovers: {layoversText}</span>
                    <button
                      className="button"
                      type="button"
                      onClick={() => handleSelectFlight(flight)}
                    >
                      Select
                    </button>
                    <span className="smallMuted">Flight No: {flight.flightNumber || 'N/A'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {statusMessage && <p className="hint">{statusMessage}</p>}
        {errorMessage && <p className="hint">{errorMessage}</p>}

        <div style={{ marginTop: "14px" }}>
          <Link to="/booking" className="button secondary">
            Back to Booking
          </Link>
          <Link to="/my-bookings" className="button secondary">
            My Bookings
          </Link>
        </div>
      </div>
    </div>
    </main>
  );
}
