import { Flight } from "./Flight";
import { Plane } from "./Plane";
/** @typedef {import("./User").Employee} Employee */
/** @typedef {import("./User").Admin} Admin */
/** 
 * Will store the flight info for Internal View
 * @type {Map<string, Flight>} 
*/
export const scheduleMap = new Map();

/** 
 * Will store the flight info for Public View
 * @type {Map<string, Flight>} 
*/
export const publicScheduleMap = new Map();
/**
 * Will store the list of planes available 
 * @type {Map<string, Plane>}
 */
export const planeList = new Map();

/** 
 * Will store the list of employee accounts
 * @type {Map<string, Employee>} 
*/
export const staffMap = new Map();
/**
 * Will store the list of admin accounts
 * @type {Map<string, Admin>}
 */
export const adminMap = new Map();
