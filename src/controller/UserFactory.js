import { User, Admin, Employee, Pilot, FlightAttendant, Customer } from '../model/User';
/**
 * Will create a user account based on the user's type
 * @param {string} firstName The first name of the user
 * @param {string} lastName The last name of the user
 * @param {Date} dateOfBirth The user's date of birth
 * @param {number} age The user's age
 * @param {string} gender The user's gender
 * @param {string} userId The user's ID
 * @param {string} email The user's email
 * @param {string} password The user's password
 * @param {string} type The account type
 * @param {string} misc Misc info
 * @param {boolean} isCitizen Whether the user is a US Citizen or not
 */
export function UserFactory(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type, misc, isCitizen){
    switch(type.toLowerCase()){

        case "admin":
            return new Admin(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type);

        case "pilot":
            return new Pilot(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type, misc);

        case "attendant":
            return new FlightAttendant(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type, misc);

        case "customer":
            return new Customer(firstName, lastName, dateOfBirth, age, gender, misc, isCitizen, userId, email, password, type);

        case "corporate_travel_manager":
	    return new Customer(firstName, lastName, dateOfBirth, age, gender, misc, isCitizen, userId, email, password, type);
	
        default:
            throw new Error(`Unknown account type: ${type}`);
    }
}
