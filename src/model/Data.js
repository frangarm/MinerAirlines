//Will store the flights in a map, with the key being the flight's ID
import { PublicSchedule, StaffSchedule } from "./Schedule";
import {Flight} from "./Flight";
import { planeList, publicScheduleMap, scheduleMap, staffMap, adminMap} from "./MapsInfo";
import { Admin, Employee } from "./User";
import { Plane } from "./Plane";

const publicSchedule = PublicSchedule.getInstance();

/**
 * @returns {Map<string, Flight>} 
 */
export function getFlights(){
    return publicScheduleMap;
}

/**
 * @returns {Map<string, Plane>}
 */
export function getPlanes(){
    return planeList;
}
export function getSchedule(){
    return scheduleMap;
}
/**
 * Adds Flights to the Public Schedule, as well as to the internal schedule
 * .addFlight hides the flight's ID
 * @param {Flight} flightIn The flight that will be added
 */
export function addFlight(flightIn){
    publicSchedule.addFlight(flightIn);
    scheduleMap.set(flightIn.flightId,flightIn);
}

/**
 * Will add employee to the local cache, stored in a map
 * @param {Employee} employeeIn 
*/
export function addEmployee(employeeIn){
    staffMap.set(employeeIn.employeeId, employeeIn)
}
/**
 * Will add admin to the local cache, stored in a map
 * @param {Admin} adminIn 
 */
export function addAdmin(adminIn){
    adminMap.set(adminIn.userId, adminIn);
}

/**
 * 
 * @param {string} flightId 
 * @returns {number} The capacity of the flight with the given ID, or 0 if not found
 */
export function getFlightCapacity(flightId){
    const flight = scheduleMap.get(flightId);
    if(flight){
        return flight.plane.capacity;
    }
    return 0;
}
/**
 * 
 * @param {Plane} planeIn 
 */
export function addPlane(planeIn){
    planeList.set(planeIn.planeId, planeIn);
}