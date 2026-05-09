// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import '../styles/Booking.css';
import AirportAutocompleteField from "../components/AirportAutocompleteField";
import {
  createFlightSearchCriteria,
  toFlightSearchParams,
  validateFlightSearchCriteria,
} from "../controller/FlightSearchCriteria";

export default function Booking() {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState("one-way");
  const [departure, setDeparture] = useState("");
  const [arrive, setArrive] = useState("");
  const [departureQuery, setDepartureQuery] = useState("");
  const [arriveQuery, setArriveQuery] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arriveDate, setArriveDate] = useState("");
  const [passengers, setSeats] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const location = useLocation();
  const selectedEmployees = location.state?.selectedEmployees || [];

  useEffect(() => {
      if (selectedEmployees.length > 0) {
	  setSeats(String(selectedEmployees.length));
      }
  }, [selectedEmployees]);  

  const handleSearchFlights = () => {
    const criteria = createFlightSearchCriteria({
      tripType,
      from: departure,
      to: arrive,
      depart: departureDate,
      returnDate: arriveDate,
      passengers,
    });

    const errors = validateFlightSearchCriteria(criteria);
    if (errors.length > 0) {
      setErrorMessage(errors[0]);
      return;
    }

    setErrorMessage("");
    
    navigate(
	`/flights?${toFlightSearchParams(criteria).toString()}`,
	{
	    state: {
		selectedEmployees: selectedEmployees || [],
	    },
	}
    )

  };

  return (
    <main className="app-site-main app-site-main--narrow">
    <div className="bookingPage">
      <div className="bookingCard">
        <div className="bookingHeader">
          <h2>Search flights</h2>
        </div>

        <div className="row rowTop">
          <div className="tabs">
            <button
              type="button"
              className={tripType === "one-way" ? "tab active" : "tab"}
              onClick={() => {
                setTripType("one-way");
                setArriveDate("");
              }}
            >
              One way
            </button>
            <button
              type="button"
              className={tripType === "round-trip" ? "tab active" : "tab"}
              onClick={() => setTripType("round-trip")}
            >
              Round trip
            </button>
          </div>

          <div className="field">
            <label>Passengers</label>
            <input
              type="number"
              min="1"
              max="9"
              placeholder="1"
              value={passengers}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
        </div>

        {/* From/To */}
        <div className="grid2">
          <AirportAutocompleteField
            label="From"
            placeholder="El Paso or ELP"
            query={departureQuery}
            code={departure}
            onQueryChange={setDepartureQuery}
            onCodeChange={setDeparture}
            hint="Search by city, airport name, or code."
          />

          <AirportAutocompleteField
            label="To"
            placeholder="Dallas or DFW"
            query={arriveQuery}
            code={arrive}
            onQueryChange={setArriveQuery}
            onCodeChange={setArrive}
            hint="Search by city, airport name, or code."
          />
        </div>

        {/* Dates */}
        <div className={tripType === "round-trip" ? "grid2" : "grid2 grid2--single"}>
          <div className="field">
            <label>Departure</label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>

          {tripType === "round-trip" && (
            <div className="field">
              <label>Return</label>
              <input
                type="date"
                value={arriveDate}
                onChange={(e) => setArriveDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <button type="button" className="cta" onClick={handleSearchFlights}>
          Search flights
        </button>
        {errorMessage && <small className="hint">{errorMessage}</small>}
      </div>
    </div>
    </main>
  );
}
