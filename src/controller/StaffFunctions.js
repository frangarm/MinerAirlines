import { Employee, Pilot, FlightAttendant, Admin } from "../model/User";
import { Flight } from "../model/Flight";

/**
 * Function to assign staff members to a flight. Can be used to assign either pilots or flight attendants, or both at the same time.
 * @param {Flight} flightIn The flight to which the staff members will be assigned
 * @param {Employee | { pilots?: string[], attendants?: string[] }} staffIn The staff members to be assigned.
 */
export function assignStaff(flightIn, staffIn){
    if (!flightIn || !staffIn) {
        return;
    }

    const staffAny = /** @type {any} */ (staffIn);
    const flightAny = /** @type {any} */ (flightIn);

    if (typeof staffAny.assignFlight === 'function') {
        staffAny.assignFlight(flightIn);
        return;
    }

    flightAny.crew = {
        pilots: Array.isArray(staffAny.pilots) ? [...staffAny.pilots] : [],
        attendants: Array.isArray(staffAny.attendants) ? [...staffAny.attendants] : []
    };
}
/**
 * Views the schedule of a staff member. Can be used to view the schedule of either pilots or flight attendants, or both at the same time.
 * @param {Employee} staffIn The staff member whose schedule will be viewed
 */
export function viewSchedule(staffIn){
    staffIn.employeeSchedule.viewFlights();
}