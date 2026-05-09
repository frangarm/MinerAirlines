// @ts-nocheck
import { collection, onSnapshot } from 'firebase/firestore';
import { db, hasFirebaseConfiguration } from '../firebase';
import { User, Employee, Pilot, FlightAttendant } from '../model/User';
import {PublicSchedule, StaffSchedule} from '../model/Schedule';
import { addFlight, addPlane, getFlights, getPlanes, getSchedule } from '../model/Data';
import { Plane } from '../model/Plane';
export const publicSchedule = new PublicSchedule();
/**
 * Converts the date to a Date data type
 * @param {*} date 
 * @returns 
 */
function toDate(date){
    if(date && typeof date.toDate === 'function'){
        return date.toDate();
    }
    if(date instanceof Date){
        return date;
    }
    if(typeof date === 'string' || typeof date === 'number'){
        return new Date(date);
    }
    return new Date();
}
/**
 * Initializes the Firestore Database to the Local Database
 */
export function startSync(){
    if (!hasFirebaseConfiguration()) {
        console.warn('Skipping Firestore sync because Firebase config is not available.');
        return () => {};
    }

    PublicSchedule.getInstance();
    const flightsCollection = collection(db, 'flights');
    const planesCollection = collection(db, 'planes');

    const stopFlights = onSnapshot(
        flightsCollection,
        (snapshot) => {
            getFlights().clear();
            getSchedule().clear();

            snapshot.forEach((document) => {
                const data = document.data();
                const departure = toDate(data.departure);
                const arrival = toDate(data.arrival);
                const layovers = data.layovers == null || data.layovers === '' ? 'None' : data.layovers;
                const planeData = data.plane || {};
                const syncedPlane = new Plane(
                    Number(planeData.capacity) || 37,
                    planeData.manufacturer || 'Unknown',
                    planeData.model || 'Unknown'
                );
                if (planeData.planeId) {
                    syncedPlane.planeId = planeData.planeId;
                }
                if (planeData.name) {
                    syncedPlane.name = planeData.name;
                }
                const normalizedSeatingMap = Array.isArray(data.seatingMap)
                    ? data.seatingMap.map((status) => (Number(status) === 1 ? 1 : 0))
                    : new Array(Number(syncedPlane.capacity) || 37).fill(0);
                const normalizedSeatPricing = data.seatPricing || {
                    Economy: Number(data.economyPrice) || 0,
                    Business: Number(data.businessPrice) || 0,
                    'First Class': Number(data.firstClassPrice) || 0,
                };
                 const syncedFlight = {
                    firestoreDocId: document.id,
                    internalFlightId: document.id,
                    flightId: data.flightId || document.id,
                    flightNumber: data.flightNumber || '',
                    origin: data.origin || '',
                    destination: data.destination || '',
                    departure,
                    arrival,
                    layovers,
                    originAirport: data.originAirport || null,
                    destinationAirport: data.destinationAirport || null,
                    plane: syncedPlane,
                    seatingMap: normalizedSeatingMap,
                    seatPricing: normalizedSeatPricing,
                    gate: data.gate || '',
                    crew: data.crew || { pilots: [], attendants: [] },
                    aircraftType: data.aircraftType || '',
                    status: data.status || 'ACTIVE',
                    distanceMiles: Number(data.distanceMiles) || 0,
                    compensationMiles: data.compensationMiles ?? 0,
                    cancelledAt: data.cancelledAt || null
                };
                
                addFlight(syncedFlight);
            });

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('public-schedule-updated'));
            }
        },
        (error) => {
            console.error('Error syncing flights from Firestore:', error);
        }
    );

    const stopPlanes = onSnapshot(
        planesCollection,
        (snapshot) => {
            const localPlaneMap = getPlanes();
            localPlaneMap.clear();

            snapshot.forEach((document) => {
                const data = document.data() || {};
                const syncedPlane = new Plane(
                    Number(data.planeCapacity ?? data.capacity) || 37,
                    data.planeManufacturer || data.manufacturer || 'Unknown',
                    data.planeModel || data.model || 'Unknown'
                );

                syncedPlane.planeId = data.planeId || document.id;
                syncedPlane.name = data.planeName || data.name || syncedPlane.name;
                addPlane(syncedPlane);
            });

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('planes-updated'));
            }
        },
        (error) => {
            console.error('Error syncing planes from Firestore:', error);
        }
    );

    return () => {
        if (typeof stopFlights === 'function') stopFlights();
        if (typeof stopPlanes === 'function') stopPlanes();
    };
}
