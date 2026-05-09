import { User, Admin, Employee, Pilot, FlightAttendant } from '../model/User';
import { getFlights, addFlight, addPlane} from '../model/Data';
import { Flight } from '../model/Flight';
import {Plane} from "../model/Plane";
/**
 * Will store the flight
 * @param {Flight} flightIn 
 */
export function storeFlight(flightIn){
    addFlight(flightIn);
}
/**
 * 
 * @param {Plane} planeIn 
 */
export function storePlane(planeIn){
    addPlane(planeIn);
}
