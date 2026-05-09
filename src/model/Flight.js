import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Plane } from "./Plane";
class Flight{
    /**
     * Flight class constructor, which represents a flight. Contains information about the flight's origin, destination, departure and arrival times, layovers, airline, plane, seating map, flight ID, flight number, seat pricing, seats available, and flight manifest.
     * @param {string} origin The origin of the Flight
     * @param {string} destination The destination of the Flight
     * @param {Date} departure The departure time of the Flight
     * @param {Date} arrival The arrival time of the Flight
     * @param {*} layovers 
     * @param {Plane} plane The plane assigned to the Flight
     * @param {number} economyPricing The price of an economy seat on the Flight
     * @param {string} gate The gate where the flight will depart
     */
    constructor(origin, destination, departure , arrival, layovers, plane, economyPricing, gate){
        this.origin = origin;
        this.destination = destination;
        this.departure = departure;
        this.arrival = arrival;
        this.layovers = layovers;
        this.airline = 'Miner Airlines';
        this.plane = plane;
        this.gate = gate;
        this.seatingMap = new Array(plane.capacity).fill(0);
        this.flightId = this.airline.slice(0, 3).toUpperCase() + setFlightID();
        this.flightNumber = this.airline.slice(0, 3).toUpperCase() + Math.floor(Math.random() * 900) + 100;
        /**
         * @type {Map<string, number>}
         */
        this.seatPricing = new Map();
        /**
         * @type {Map<string, number>}
         */
        this.seatsAvailable = new Map();
        this.setSeats(economyPricing);
        /**
         * @type {Map<string, string>}
         */
        this.flightManifest = new Map();
    }
    /**
     * @returns {number} Returns the capacity of the flight, which is determined by the plane assigned to the flight
     */
    getCapacity(){
        return this.plane.capacity;
    }
    /**
     * Will set the number of seats available for each tier and the price of each tier based on the price of an economy seat. The number of seats available for each tier is determined by the plane's capacity, with 88% of seats being economy, 10% being business, and 2% being first class.
     * @param {number} priceIn The price of an economy seat
     */
    setSeats(priceIn){
        const capacity = Math.max(0, Math.floor(Number(this.plane.capacity) || 0));
        const businessSeats = Math.floor(capacity * 0.10);
        const firstClassSeats = Math.max(1, Math.floor(capacity * 0.02));
        const economySeats = Math.max(0, capacity - businessSeats - firstClassSeats);

        this.seatsAvailable.set("Economy", economySeats);
        this.seatsAvailable.set("Business", businessSeats);
        this.seatsAvailable.set("First Class", firstClassSeats);
        this.seatPricing.set("Economy", priceIn);
        this.seatPricing.set("Business", priceIn * 4);
        this.seatPricing.set("First Class", priceIn * 8);
    }

    /**
     * Determines the number of seats per row based on the plane's capacity. Planes with a capacity of 180 or more have 9 seats per row, while smaller planes have 4 seats per row.
     * @returns {number} The number of seats per row for the flight's plane
     */
    getSeatsPerRow(){
        return this.plane.capacity >= 180 ? 9 : 4;
    }

    /**
     * Will convert a seat ID (e.g. "12A") to the corresponding index in the seating map array. 
     * The row number is multiplied by the number of seats per row, and the letter is converted to an offset based on its position in the alphabet. 
     * @param {string} seatId The seat ID to convert (e.g. "12A")
     * @returns {number} The index in the seating map array corresponding to the given seat ID
     */
    getSeatIndex(seatId){
        const match = /^([1-9]\d*)([A-I])$/.exec(String(seatId).trim());
        if (!match) {
            throw new Error(`Invalid seat id: ${seatId}`);
        }

        const row = Number(match[1]);
        const letter = match[2];
        const seatsPerRow = this.getSeatsPerRow();
        const seatOffset = 'ABCDEFGHI'.indexOf(letter);

        if (seatOffset < 0 || seatOffset >= seatsPerRow) {
            throw new Error(`Invalid seat id for this aircraft layout: ${seatId}`);
        }

        const seatIndex = (row - 1) * seatsPerRow + seatOffset;
        if (seatIndex < 0 || seatIndex >= this.seatingMap.length) {
            throw new Error(`Seat ${seatId} is out of range`);
        }

        return seatIndex;
    }

    /**
     * Will add passengers to the flight manifest and associate them with a boarding pass. Also updates the seating map to mark the seats included on the boarding pass as unavailable.
     * @param {string[]} passengerIn
     * @param {string[]} seatIndexes
     */
    addPassengers(passengerIn, seatIndexes){
        const passengers = Array.isArray(passengerIn) ? passengerIn : [passengerIn];
        passengers.forEach((passenger) => {
            this.flightManifest.set(passenger[0], passenger[1]);
        });

        const selectedSeats = Array.isArray(seatIndexes) ? seatIndexes : [];
        selectedSeats.forEach((seatId) => {
            const seatIndex = this.getSeatIndex(seatId);
            if (this.seatingMap[seatIndex] === 1) {
                throw new Error(`Seat ${seatId} is already unavailable`);
            }
            this.seatingMap[seatIndex] = 1;
        });
    }
}
//Sets the flight's ID. This is not public information
/**@returns {string} */
function setFlightID(){
    /**@type {string} */
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    /**@type {Uint8Array} */
    const generateRandom = crypto.getRandomValues(new Uint8Array(4));
    return Array.from(generateRandom, byte => chars[byte % chars.length]).join('');
}
export {Flight};
