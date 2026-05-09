import { StaffSchedule } from "./Schedule";

class User{
    //User will be the parent class of the Admin, Customer, and Employee classes
    /**
     * Abstract User class constructor, which represents a user of the system. 
     * Contains information about the user's name, date of birth, age, gender, user ID, email, password, and account type. 
     * Also contains boolean values to determine if the user has admin or employee privileges.
     * @param {string} firstName The first name of the user
     * @param {string} lastName The last name of the user
     * @param {Date} dateOfBirth The date of birth of the user
     * @param {number} age The age of the user, which is calculated based on the date of birth
     * @param {string} gender The gender of the user
     * @param {string} userId The user's ID
     * @param {string} email The user's email
     * @param {string} password The user's password
     * @param {string} type The account type of the user
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type){
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = firstName + " "  + lastName; 
        this.dateOfBirth = dateOfBirth;
        this.age = age;
        this.gender = gender;
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.ADMIN_PRIVELEGES = false;
        this.EMPLOYEE_PRIVELEGES = false;
        switch(type.toLowerCase()){
            case "admin":
                this.EMPLOYEE_PRIVELEGES = true;
                this.ADMIN_PRIVELEGES = true;
                break;
            case "employee":
                this.EMPLOYEE_PRIVELEGES = true;
                break;
        }
        //User is an abstract class, will throw an error if instantiated
        if(this.constructor == User){
            throw new Error("User cannot be instantiated since it is an abstract class.");
        }
    }
}

class Admin extends User{
    /**
     * Admin class constructor, which represents an admin user of the system. Inherits from the User class and has admin privileges.
     * @param {string} firstName The first name of the admin user
     * @param {string} lastName The last name of the admin user
     * @param {Date} dateOfBirth The date of birth of the admin user
     * @param {number} age The age of the admin user
     * @param {string} gender The gender of the admin user
     * @param {string} userId The admin user's ID
     * @param {string} email The admin user's email
     * @param {string} password The admin user's password
     * @param {string} type The account type of the admin user
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type){
        super(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type);
        this.userId = "A-" + userId;

    }
}
class Employee extends User{
    /**
     * Employee class constructor, which represents an employee user of the system. Inherits from the User class and has employee privileges.
     * @param {string} firstName The first name of the employee user
     * @param {string} lastName The last name of the employee user
     * @param {Date} dateOfBirth The date of birth of the employee user
     * @param {number} age The age of the employee user
     * @param {string} gender The gender of the employee user
     * @param {string} userId The employee user's ID
     * @param {string} email The employee user's email
     * @param {string} password The employee user's password
     * @param {string} type The account type of the employee user
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type){
        super(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type);
        
        //IDs starting with E- are employee IDs
        this.employeeId = "E-" + userId;
        this.employeeSchedule = new StaffSchedule(this.employeeId);
        this.hoursWorked = {
            daily: 0,
            monthly: 0,
            yearly: 0
        }
        //Employee is an abstract class, will throw an error if instantiated
        if(this.constructor == Employee){
            throw new Error("Employee cannot be instantiated since it is an abstract class.");
        }
    }

}

class Pilot extends Employee{
    //Pilots are mandated by law to only work for a maximum of 8 hours by day, 100 by month, and 1000 by year, static so only one LEGAL_LIMITS is stored
    static LEGAL_LIMITS = {
        daily: 8,
        monthly: 100,
        yearly: 1000
    }
    /**
     * Pilot class constructor, which represents a pilot user of the system. 
     * Inherits from the Employee class and has employee privileges. 
     * Contains additional information about the pilot's license number.
     * @param {string} firstName The first name of the pilot user
     * @param {string} lastName The last name of the pilot user
     * @param {Date} dateOfBirth The date of birth of the pilot user
     * @param {number} age The age of the pilot user
     * @param {string} gender The gender of the pilot user
     * @param {string} userId The pilot user's ID
     * @param {string} email The pilot user's email
     * @param {string} password The pilot user's password
     * @param {string} type The account type of the pilot user
     * @param {string} licenseNumber The pilot user's license number
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type, licenseNumber){
        super(firstName, lastName, dateOfBirth, age,gender, userId, email, password, type);
        this.licenseNumber = licenseNumber;
    }
}

class FlightAttendant extends Employee{
    //Attendants are mandated by law to only work for a maximum of 14 hours per day, static so that only one LEGAL_DAILY_LIMIT is stored
    static LEGAL_DAILY_LIMIT = 14;
    /**
     * Flight Attendant class constructor, which represents a flight attendant user of the system. 
     * Inherits from the Employee class and has employee privileges. 
     * Contains additional information about the flight attendant's rank.
     * @param {string} firstName The first name of the flight attendant user
     * @param {string} lastName The last name of the flight attendant user
     * @param {Date} dateOfBirth The date of birth of the flight attendant user
     * @param {number} age The age of the flight attendant user
     * @param {string} gender The gender of the flight attendant user
     * @param {string} userId The flight attendant user's ID
     * @param {string} email The flight attendant user's email
     * @param {string} password The flight attendant user's password
     * @param {string} type The account type of the flight attendant user
     * @param {string} crewRank The rank of the flight attendant user
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type, crewRank){
        super(firstName, lastName, dateOfBirth, age,gender, userId, email, password, type);
        this.crewRank = crewRank;
    }
  
}

class Customer extends User{
    /**
     * Customer class constructor, which represents a customer user of the system. Inherits from the User class and has no special privileges. Contains additional information about whether the customer is a US citizen and a map of the customer's boarding passes.
     * @param {string} firstName The first name of the customer user
     * @param {string} lastName The last name of the customer user
     * @param {Date} dateOfBirth The date of birth of the customer user
     * @param {number} age The age of the customer user
     * @param {string} gender The gender of the customer user
     * @param {string} citizenStatus The customer's citizenship status (US Citizen or Non US Citizen)
     * @param {boolean} isCitizen Whether the customer is a US citizen or not
     * @param {string} userId The user's ID 
     * @param {string} email The user's email
     * @param {string} password The customer's password
     * @param {string} type The account type
     */
    constructor(firstName, lastName, dateOfBirth, age, gender, citizenStatus, isCitizen, userId, email, password, type){
        super(firstName, lastName, dateOfBirth, age, gender, userId, email, password, type);
        this.isCitizen = isCitizen;
        this.citizenStatus = citizenStatus;
        this.loyaltyPoints = 0;
    }
}

//Exports Classes
export {User, Admin,Employee, Pilot, FlightAttendant, Customer };
