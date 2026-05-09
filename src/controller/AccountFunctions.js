import { Customer, User } from "../model/User";
import { UserFactory } from "./UserFactory";

//List of valid employee email domains
const validEmployeeDomains = ['@minerairlines.com']; 

/**
 * Will create the customer's account when called by using UserFactory. Will generate the User's ID and call a function to calculate their age.
 * @param {string} firstName The first name of the customer
 * @param {string} lastName The last name of the customer
 * @param {Date} dateOfBirth The date of birth of the customer
 * @param {string} gender The gender of the customer
 * @param {string} email The email of the customer
 * @param {string} password The password of the customer
 * @param {string} type The customer's type (Regular Customer or Corporate Travel Manager)
 * @param {string} citizenStatus Wheter the customer is a US citizen or not
 * @returns {User} Returns the customer account
 */
export function createCustomerAccount(firstName, lastName, dateOfBirth, gender, email, password, type, citizenStatus){;
    let isCitizen = false;
    //Will generate a random id
    let id = crypto.randomUUID();
    const normalizedDateOfBirth = normalizeDateOfBirth(dateOfBirth);
    //Calls calculate age
    let age = calculateAge(normalizedDateOfBirth);
    if(citizenStatus === "US Citizen"){
        isCitizen = true;
    }

														      
    if( !['customer', 'corporate_travel_manager'].includes(type.toLowerCase()) ){
        throw new Error("Invalid account type. Must be 'customer' or 'travel manager'.");
    }
    if(age < 18){
        throw new Error("Invalid customer account. Minors are not allowed.");
    }
    //newAccount will be the Customer object returned by this function
    const newAccount = UserFactory(firstName, lastName, normalizedDateOfBirth, age, gender, id, email, password, type, citizenStatus, isCitizen);
    return newAccount;
}

/**
 * Will create a staff account when called by using UserFactory. Will generate the User's ID and call a function to calculate their age. 
 * @param {string} firstName The first name of the employee
 * @param {string} lastName The last name of the employee
 * @param {Date} dateOfBirth The date of birth of the employee
 * @param {string} gender The gender of the employee
 * @param {string} email The email of the employee
 * @param {string} password The password of the employee
 * @param {string} type The type of employee (Admin, Pilot, Flight Attendant)
 * @param {string} misc Misc information such as Pilot License or Flight Attendant Rank
 * @return {User}
 */
export function createStaffAccount(firstName, lastName, dateOfBirth, gender, email, password, type, misc){
    //Will check if the email ends with a valid employee domain, nomalize the email by trimming whitespace and converting 
    // to lowercase for consistent validation
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const isValidEmployeeDomain = validEmployeeDomains.some(domain => normalizedEmail.endsWith(domain));
    //If the email does not end with a valid employee domain, throw an error
    if(!isValidEmployeeDomain){
        throw new Error("Invalid email domain. Employee email must end with '@minerairlines.com'.");
    }
    let id = crypto.randomUUID();
    const normalizedDateOfBirth = normalizeDateOfBirth(dateOfBirth);
    let age = calculateAge(normalizedDateOfBirth);
    if(age < 16){
        throw new Error("People under 16 are not allowed to be staff members.");
    }
   
    const newAccount = UserFactory(firstName, lastName, normalizedDateOfBirth, age, gender, id, normalizedEmail, password, type, misc, true);
    return newAccount;
}
/**
 * Will calculate the age of a user basend on their date of birth
 * @param {Date} dob The date of birth of an user
 * @returns {number} The calculated age
 */
function calculateAge(dob){
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    return age;
}

/**
 * Normalizes the date of birth to a Date object
 * @param {*} dateOfBirth The date of birth as a string
 * @returns {Date} The normalized date of birth
 */
function normalizeDateOfBirth(dateOfBirth) {
    if (dateOfBirth instanceof Date) {
        return dateOfBirth;
    }

    if (typeof dateOfBirth === 'string' || typeof dateOfBirth === 'number') {
        const parsed = new Date(dateOfBirth);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    throw new Error('Invalid date of birth.');
}
