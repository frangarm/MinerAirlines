export class BoardingPass{
    /**
     * Constructor for the BoardingPass class, which represents a boarding pass for a flight. Contains information about the passenger, the flight, the seats, and the price of the transaction.
     * @param {*} priceOrPayload The total price of the transaction
     * @param {number} numTickets The total number of seats on the boarding pass
     * @param {string[]} seats The seats included on the boarding pass
     * @param {string} passengerName The name of the buying customer
     * @param {string} passengerId The user ID of the buying customer
     * @param {string} flightNumber The flight associated with the boarding pass
     * @param {string} flightGate The gate for the flight
     * @param {string} flightOrigin The origin airport for the flight
     * @param {string} flightDestination The destination airport for the flight
     * @param {Date} flightDeparture The departure date and time for the flight
     * @param {Date} flightArrival The arrival date and time for the flight
     * @param {string} returnDate The return date for the transaction
     * @param {number[]} seatIndexes The indexes of the seats included on the boarding pass
     */
    constructor(priceOrPayload, numTickets, seats, passengerName, passengerId, flightNumber, flightGate, flightOrigin, flightDestination, flightDeparture, flightArrival, returnDate = '', seatIndexes) {
      this.tier = {
        ECONOMY: "Economy",
        BUSINESS: "Business",
        FIRST_CLASS: "First Class"
      };

      const payload = (
        priceOrPayload
        && typeof priceOrPayload === 'object'
        && !Array.isArray(priceOrPayload)
      )
        ? priceOrPayload
        : {
          price: priceOrPayload,
          numTickets,
          seats,
          passengerName,
          passengerId,
          flight: {
            flightNumber,
            gate: flightGate,
            origin: flightOrigin,
            destination: flightDestination,
            departure: flightDeparture,
            arrival: flightArrival,
          },
          returnDate,
          seatIndexes,
        };

      const selectedSeats = Array.isArray(payload.selectedSeats)
        ? payload.selectedSeats
        : (Array.isArray(payload.seats) ? payload.seats : []);
      const passengerCount = Math.max(1, Number(payload.numTickets || payload.passengers || selectedSeats.length || 1));
      const totalPrice = Number(payload.total ?? payload.price) || 0;
      const resolvedFlight = payload.flight || {};
      const resolvedDistanceMiles = Math.max(0, Number(payload.distanceMiles ?? resolvedFlight.distanceMiles) || 0);
      const resolvedLoyaltyPoints = Number.isFinite(Number(payload.loyaltyPointsEarned))
        ? Number(payload.loyaltyPointsEarned)
        : resolvedDistanceMiles * passengerCount;

      this.total = totalPrice;
      this.price = totalPrice;
      this.numTickets = passengerCount;
      this.passengers = passengerCount;

      this.seats = selectedSeats;
      this.selectedSeats = selectedSeats;
      this.seatIndexes = Array.isArray(payload.seatIndexes) ? payload.seatIndexes : [];
      this.seatNumber = payload.seatNumber || (selectedSeats.length ? selectedSeats.join(', ') : '');
      this.ticketTier = payload.ticketTier || 'Economy';
      this.accommodations = Array.isArray(payload.accommodations)
        ? payload.accommodations.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

      this.passengerName = payload.passengerName || '';
      this.passengerId = payload.passengerId || '';
      this.passengerEmail = payload.passengerEmail || payload.customerEmail || '';
      this.customerEmail = this.passengerEmail;
      this.authUid = payload.authUid || '';
      this.passenger = {
        name: this.passengerName,
        userId: this.passengerId,
        email: this.passengerEmail,
        authUid: this.authUid,
      };

      this.flightId = resolvedFlight.firestoreDocId || resolvedFlight.flightId || payload.flightId || '';
      this.flightNumber = resolvedFlight.flightNumber || payload.flightNumber || '';
      this.gate = resolvedFlight.gate || payload.flightGate || payload.gate || '';
      this.origin = resolvedFlight.origin || payload.flightOrigin || payload.origin || '';
      this.destination = resolvedFlight.destination || payload.flightDestination || payload.destination || '';
      this.departure = resolvedFlight.departure || payload.flightDeparture || payload.departure || null;
      this.arrival = resolvedFlight.arrival || payload.flightArrival || payload.arrival || null;
      this.flight = {
        firestoreDocId: this.flightId,
        flightId: this.flightId,
        flightNumber: this.flightNumber,
        gate: this.gate,
        origin: this.origin,
        destination: this.destination,
        departure: this.departure,
        arrival: this.arrival,
        airline: resolvedFlight.airline || payload.airline || 'Miner Airlines',
        layovers: resolvedFlight.layovers || payload.layovers || 'None',
        distanceMiles: resolvedDistanceMiles,
        seatPricing: resolvedFlight.seatPricing || payload.seatPricing || null,
      };

      this.returnDate = payload.returnDate || '';
      this.requestedDepartDate = payload.requestedDepartDate || '';
      this.requestedReturnDate = payload.requestedReturnDate || this.returnDate || '';

      this.distanceMiles = resolvedDistanceMiles;
      this.loyaltyPointsEarned = Math.max(0, Math.floor(resolvedLoyaltyPoints));

      this.boardingPassId = payload.boardingPassId
        || `${this.passengerId || this.authUid || 'passenger'}-${this.flightNumber || 'flight'}-${Date.now()}`;
    }
}