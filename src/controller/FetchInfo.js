import { getFlights, getPlanes, getSchedule  } from "../model/Data";

export function fetchPublicSchedule(){
    return Array.from(getFlights().values());
}

export function fetchPlanes(){
    return Array.from(getPlanes().values());
}

export function fetchFlights(){
    return Array.from(getSchedule().values());
}
/**
 * 
 * @param {string} flightIdIn 
 */
export function getFlight(flightIdIn){
    if(getSchedule().has(flightIdIn)){
        return getSchedule().get(flightIdIn);
    }
    else{
        throw new Error;
    }
}   