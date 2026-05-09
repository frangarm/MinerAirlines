import { Plane } from "../model/Plane";
import { Flight } from "../model/Flight";
import { PublicSchedule } from "../model/Schedule";
import { getFlights } from "../model/Data";

/**
 * Function that will add a flight to the schedule
 * @param {string} origin The origin of the flight
 * @param {string} destination The flight's destination
 * @param {Date} departure Departure time
 * @param {Date} arrival  Arrival Time
 * @param {*} layovers 
 * @param {Plane} plane The model of plane the flight will use
 * @param {number} economyPricing The price of economy seats, will be used to calculate the price of other tiers
 * @param {string} gate The gate where the flight will depart
 * @returns {Flight} returns the created flight
 */
export function createFlight(origin, destination, departure, arrival, layovers, plane, economyPricing, gate){
    if(departure >= arrival){
        throw new Error("Departure Time cannot be after or at the same time as Arrival Time")
    }
    if(layovers == null || layovers === ""){
        layovers = "None";
    }
    const newFlight = new Flight(origin, destination, departure, arrival, layovers, plane, economyPricing, gate);
    return newFlight;
}
/**
 * Function that will add a plane to the database
 * @param {number} capacity The plane's capacity
 * @param {string} manufacturer The plane's manufacture
 * @param {string} model The plane's model
 * @return {Plane} The plane being added
 */
export function addPlane(capacity, manufacturer, model){
    if(capacity < 37){
        throw new Error("Capacity cannot be less than 37");
    }
    else if(capacity > 853){
        throw new Error("Capacity cannot exceed 853");
    }
    const newPlane = new Plane(capacity, manufacturer, model);
    return newPlane;
}

/**
 * Removes a flight from the schedule
 * @param {string} flightNumberIn 
 */
export function removeFlight(flightNumberIn){
    PublicSchedule.getInstance().removeFlight(flightNumberIn);
}
