import { Flight } from "./Flight";
import { publicScheduleMap} from "./MapsInfo";

class Schedule{
    
    constructor(){
        if(this.constructor == Schedule){
            throw new Error("Schedule cannot be instantiated since it is an abstract class.");
        }
    }
}
export class StaffSchedule extends Schedule{
    /**
     * Represents the Schedule associated with each individual Staff, it will be unique
     * @param {string} staffIdIn Will store the ID of the staff associated with this schedule
     * @var {string} scheduleId Will generate a new random ID
     * @var {Map<string, Flight>} staffScheduleMap Will Store the information of every Flight the Staff Member is assigned to
     */
    constructor(staffIdIn){
        super();
        this.staffId = staffIdIn;
        this.scheduleId = crypto.randomUUID();
        this.staffScheduleMap = new Map();
    }
    /**
     * Will add the information of a flight to the Staff Member's Map
     * @param {Flight} flightIn 
     */
    assignFlight(flightIn){
        this.staffScheduleMap.set(flightIn.flightId, flightIn);
    }
    /**
     * Will remove the Flight's Information
     * @param {string} flightIdIn
     */
    unassignFlight(flightIdIn) {
        this.staffScheduleMap.delete(flightIdIn);
    }
    /**
     * Will return a Flight's information
     * @param {string} flightIdIn
     * @returns 
     */
    getFlight(flightIdIn) {
        if(this.staffScheduleMap.has(flightIdIn)){
            return this.staffScheduleMap.get(flightIdIn);
        }
        else{
            throw new Error('Flight ID does not exist in this staff schedule');
        }
    }
    viewFlights(){
        this.staffScheduleMap.forEach((value, key) => {
        console.log(value, key);
        });
    }
}


export class PublicSchedule extends Schedule{
    /**
     * Rrepresents the public schedule that anyone can see, it is not unique
    */
    /** 
     * @type {PublicSchedule | null} 
    */
    static #instance = null;

    constructor() {
        super();
    }

    static getInstance() {
        if (!PublicSchedule.#instance) {
            PublicSchedule.#instance = new PublicSchedule();
        }
        return PublicSchedule.#instance;
    }
   
    /**
     * Will add Flights to the public schedule
     * @param {Flight} flightIn Flight to be added to the schedule
     */
    addFlight(flightIn){
        publicScheduleMap.set(flightIn.flightNumber, flightIn);
    }
    /**
     * Will remove a Flight from the public schedule
     * @param {string} flightNumberIn The flight number of the flight to be removed
     */
    removeFlight(flightNumberIn){
        publicScheduleMap.delete(flightNumberIn);
    }
    /**
     * Will return a Flight's information
     * @param {string} flightNumberIn The flight number of the flight to be returned
     * @returns {Flight | undefined} The Flight object if it exists, undefined otherwise
     */
    getFlight(flightNumberIn){
        return publicScheduleMap.get(flightNumberIn);
    }
}
