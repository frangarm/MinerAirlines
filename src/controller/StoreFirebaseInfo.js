// @ts-nocheck
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    // @ts-ignore
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from "firebase/firestore";
import {Plane} from "../model/Plane";
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, getSecondaryAuth } from "../firebase";
import { addPlane, createFlight } from "./FlightFunctions";
import { storeFlight } from "./StoreInfo";
import { estimateArrivalFromDistance, getRouteDetailsByIata } from "./AirportData";
import { createCustomerAccount, createStaffAccount } from "./AccountFunctions";
import { ensureAuthPersistence } from "./SignIn";
import { Customer } from "../model/User";
const validEmployeeDomains = ['@minerairlines.com']; 
// @ts-ignore
function fullName(firstName, lastName) {
    return `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
}

function defaultSeatPricing(basePrice = 199) {
    const economy = Number(basePrice) || 199;
    return {
        Economy: economy,
        Business: Math.round(economy * 2),
        'First Class': Math.round(economy * 3)
    };
}

// @ts-ignore
function normalizeWholeNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.round(parsed);
}

// @ts-ignore
async function getFirstDocByQueries(collectionName, constraints) {
    for (const constraint of constraints) {
        if (!constraint?.field || constraint.value == null || constraint.value === '') {
            continue;
        }

        try {
            const snapshot = await getDocs(
                // @ts-ignore
                query(collection(db, collectionName), where(constraint.field, '==', constraint.value))
            );

            if (!snapshot.empty) {
                const firstDoc = snapshot.docs[0];
                return {
                    docId: firstDoc.id,
                    ...firstDoc.data()
                };
            }
        } catch (error) {
            // @ts-ignore
            if (error?.code !== 'permission-denied' && error?.code !== 'firestore/permission-denied') {
                throw error;
            }
        }
    }

    return null;
}

// @ts-ignore
function toTimestampValue(value) {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizeCustomerPoints(customer = {}) {
    // @ts-ignore
    const rawPoints = customer.loyaltyPoints ?? customer.miles ?? 0;
    const parsedPoints = Number(rawPoints);
    return Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0;
}

function generateVoucherCode(prefix = 'MR') {
    const normalizedPrefix = String(prefix || 'MR').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'MR';
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${normalizedPrefix}-${datePart}-${randomPart}`;
}

// @ts-ignore
function getSeatsPerRowFromCapacity(capacityIn) {
    const capacity = Number(capacityIn) || 0;
    return capacity >= 180 ? 9 : 4;
}

// @ts-ignore
function seatIdToIndex(seatId, seatsPerRow, mapLength) {
    const match = /^([1-9]\d*)([A-I])$/.exec(String(seatId || '').trim().toUpperCase());
    if (!match) {
        throw new Error(`Invalid seat id: ${seatId}`);
    }

    const row = Number(match[1]);
    const letter = match[2];
    const seatOffset = 'ABCDEFGHI'.indexOf(letter);
    if (seatOffset < 0 || seatOffset >= seatsPerRow) {
        throw new Error(`Invalid seat id for this aircraft layout: ${seatId}`);
    }

    const seatIndex = (row - 1) * seatsPerRow + seatOffset;
    if (seatIndex < 0 || seatIndex >= mapLength) {
        throw new Error(`Seat ${seatId} is out of range`);
    }

    return seatIndex;
}

// @ts-ignore
function scoreCustomerCandidate(customer, authUid = '', email = '', userId = '') {
    let score = 0;

    if (authUid && customer.authUid === authUid) score += 1000;
    if (email && customer.email === email) score += 200;
    if (userId && customer.userId === userId) score += 100;

    score += normalizeCustomerPoints(customer);
    score += toTimestampValue(customer.updatedAt) / 1e15;

    return score;
}

export async function findBestCustomerDoc({ authUid = '', email = '', userId = '' } = {}) {
    // @ts-ignore
    const customerCollection = collection(db, 'customer');
    const snapshots = await Promise.all([
        authUid ? getDocs(query(customerCollection, where('authUid', '==', authUid))) : Promise.resolve(null),
        email ? getDocs(query(customerCollection, where('email', '==', email))) : Promise.resolve(null),
        userId ? getDocs(query(customerCollection, where('userId', '==', userId))) : Promise.resolve(null),
    ]);

    const candidates = new Map();

    snapshots.forEach((snapshot) => {
        if (!snapshot?.docs?.length) return;

        snapshot.docs.forEach((customerDoc) => {
            candidates.set(customerDoc.id, {
                docId: customerDoc.id,
                ...customerDoc.data()
            });
        });
    });

    const ranked = Array.from(candidates.values()).sort(
        (a, b) => scoreCustomerCandidate(b, authUid, email, userId) - scoreCustomerCandidate(a, authUid, email, userId)
    );

    if (ranked.length === 0) {
        return null;
    }

    return {
        customerDocId: ranked[0].docId,
        ...ranked[0]
    };
}

// @ts-ignore
async function getCustomerDocByAuthUid(authUid, email = '') {
    return findBestCustomerDoc({ authUid, email });
}

async function getCustomerDocForBooking(booking = {}) {
    return findBestCustomerDoc({
        // @ts-ignore
        authUid: booking.authUid,
        // @ts-ignore
        email: booking.customerEmail,
        // @ts-ignore
        userId: booking.passengerId
    });
}

// @ts-ignore
function toManifestMap(snapshot) {
    const manifestMap = new Map();
    // @ts-ignore
    snapshot.docs.forEach((manifestDoc) => {
        manifestMap.set(manifestDoc.id, {
            manifestDocId: manifestDoc.id,
            ...manifestDoc.data()
        });
    });
    return manifestMap;
}

// @ts-ignore
function mergeBoardingPassesWithManifest(boardingPasses, manifestMap) {
    // @ts-ignore
    return boardingPasses.map((boardingPass) => {
        const manifest = manifestMap.get(boardingPass.boardingPassId || boardingPass.bookingDocId);
        if (!manifest) {
            return boardingPass;
        }

        return {
            ...boardingPass,
            status: manifest.status || boardingPass.status,
            checkedInAt: manifest.checkedInAt || boardingPass.checkedInAt || null,
            manifest
        };
    });
}


/**
 * Stores Flight information to Firebase
 * @param {string} origin The origin of the flight
 * @param {string} destination The flight's destination
 * @param {Date} departure The departure time of the flight
 * @param {*} layovers 
 * @param {Plane} plane The model of plane the flight will use
 * @param {number} economyPricing The price of economy seats, will be used to calculate the price of other tiers
 * @param {string} gate The gate where the flight will depart
 * @returns {Promise<string>} The document ID of the newly created flight in Firestore
 */
export async function submitFlight(origin, destination, departure, layovers, plane, economyPricing, gate) {
    if (!plane) {
        throw new Error('Plane is required to create a flight.');
    }
    const routeDetails = await getRouteDetailsByIata(origin, destination);
    const normalizedDistanceMiles = normalizeWholeNumber(routeDetails.distanceMiles, 0);
    const departureDate = departure instanceof Date ? departure : new Date(departure);
    const arrivalDate = estimateArrivalFromDistance(departureDate, normalizedDistanceMiles);
    const newFlight = createFlight(origin, destination, departure, arrivalDate, layovers, plane, economyPricing, gate);
    const serializedPlane = {
        planeId: newFlight.plane.planeId,
        name: newFlight.plane.name,
        capacity: newFlight.plane.capacity,
        manufacturer: newFlight.plane.manufacturer,
        model: newFlight.plane.model
    };

    // @ts-ignore
    const docRef = await addDoc(collection(db, "flights"), {
        flightId: newFlight.flightId,
        origin: String(origin || ''),
        destination: String(destination || ''),
        originAirport: routeDetails.originAirport,
        destinationAirport: routeDetails.destinationAirport,
        departure: newFlight.departure,
        arrival: newFlight.arrival,
        airline: newFlight.airline,
        layovers: newFlight.layovers,
        flightNumber: newFlight.flightNumber,
        plane: serializedPlane,
        status: 'ACTIVE',
        distanceMiles: normalizedDistanceMiles,
        economySeating: newFlight.seatsAvailable.get("Economy"),
        businessSeating: newFlight.seatsAvailable.get("Business"),
        firstClassSeating: newFlight.seatsAvailable.get("First Class"),
        seatingMap: newFlight.seatingMap,
        economyPrice: newFlight.seatPricing.get("Economy"),
        businessPrice: newFlight.seatPricing.get("Business"),
        firstClassPrice: newFlight.seatPricing.get("First Class"),
        gate: newFlight.gate
    });
    
    storeFlight({
        ...newFlight,
        // @ts-ignore
        firestoreDocId: docRef.id,
        status: 'ACTIVE',
        compensationMiles: 0,
        distanceMiles: normalizedDistanceMiles,
        originAirport: routeDetails.originAirport,
        destinationAirport: routeDetails.destinationAirport,
        crew: {
            pilots: [],
            attendants: []
        }
    });
    return docRef.id;
}

// @ts-ignore
export async function updateFlightCrewByDocId(firestoreDocId, pilots, attendants) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore flight document id.');
    }

    // @ts-ignore
    await updateDoc(doc(db, 'flights', firestoreDocId), {
        crew: {
            pilots: pilots || [],
            attendants: attendants || []
        },
        updatedAt: new Date()
    });
}

// @ts-ignore
export async function updateFlightDetailsByDocId(firestoreDocId, origin, destination, departure, basePrice) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore flight document id.');
    }

    const departureDate = departure instanceof Date ? departure : new Date(departure);
    if (Number.isNaN(departureDate.getTime())) {
        throw new Error('Departure must be a valid date.');
    }

    const routeDetails = await getRouteDetailsByIata(origin, destination);
    const arrivalDate = estimateArrivalFromDistance(departureDate, routeDetails.distanceMiles);
    const normalizedBasePrice = normalizeWholeNumber(basePrice, 199);
    const seatPricing = defaultSeatPricing(normalizedBasePrice);

    // @ts-ignore
    await updateDoc(doc(db, 'flights', firestoreDocId), {
        origin: String(origin || ''),
        destination: String(destination || ''),
        departure: departureDate,
        arrival: arrivalDate,
        distanceMiles: normalizeWholeNumber(routeDetails.distanceMiles, 0),
        originAirport: routeDetails.originAirport,
        destinationAirport: routeDetails.destinationAirport,
        basePrice: normalizedBasePrice,
        seatPricing,
        updatedAt: new Date()
    });

    const affectedBoardingPasses = await getDocs(
        // @ts-ignore
        query(collection(db, 'boardingPasses'), where('flightId', '==', firestoreDocId))
    );

    for (const boardingPassDoc of affectedBoardingPasses.docs) {
        // @ts-ignore
        await updateDoc(doc(db, 'boardingPasses', boardingPassDoc.id), {
            'flight.origin': String(origin || ''),
            'flight.destination': String(destination || ''),
            'flight.originAirport': routeDetails.originAirport,
            'flight.destinationAirport': routeDetails.destinationAirport,
            'flight.departure': departureDate,
            'flight.arrival': arrivalDate,
            'flight.seatPricing': seatPricing,
            updatedAt: new Date()
        });
    }
}
// @ts-ignore
export async function syncFlightRouteDataByDocId(firestoreDocId, origin, destination) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore flight document id.');
    }

    const routeDetails = await getRouteDetailsByIata(origin, destination);

    // @ts-ignore
    await updateDoc(doc(db, 'flights', firestoreDocId), {
        originAirport: routeDetails.originAirport,
        destinationAirport: routeDetails.destinationAirport,
        distanceMiles: normalizeWholeNumber(routeDetails.distanceMiles, 0),
        updatedAt: new Date()
    });

    return routeDetails;
}

/**
 * Will create a staff account and add it to Firebase
 * @param {string} firstName The first name of the user
 * @param {string} lastName The last name of the user
 * @param {Date} dateOfBirth The date of birth of the user
 * @param {string} gender The gender of the user
 * @param {string} email The email address of the user
 * @param {string} password The password for the user's account
 * @param {string} type The account type
 * @param {string} misc Misc info
 * @return {Promise<string>} The document ID of the newly created user in Firestore
 */
export async function submitInsiderAccount(firstName, lastName, dateOfBirth, gender, email, password, type, misc){
    const role = String(type || '').toLowerCase();
    if (!['admin', 'pilot', 'attendant'].includes(role)) {
        throw new Error(`Unsupported insider account type: ${type}`);
    }
    //Will check if the email ends with a valid employee domain, nomalize the email by trimming whitespace and converting 
    //to lowercase for consistent validation
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const isValidEmployeeDomain = validEmployeeDomains.some(domain => normalizedEmail.endsWith(domain));
    //If the email does not end with a valid employee domain, throw an error
    if(!isValidEmployeeDomain){
        throw new Error("Invalid email domain. Employee email must end with '@minerairlines.com'.");
    }
    const dob = new Date(dateOfBirth).toISOString().slice(0,10);
    const accountMisc = misc ?? "";
    const newUser = createStaffAccount(firstName, lastName, dateOfBirth, gender, normalizedEmail, password, type, accountMisc);
    await ensureAuthPersistence();
    // @ts-ignore
    const secondaryAuth = getSecondaryAuth();
    // @ts-ignore
    const authCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);

    // Use authUid as document ID so Firestore security rules can look it up with exists()
    // @ts-ignore
    const docRef = doc(db, type, authCredential.user.uid);
    await setDoc(docRef, {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        dateOfBirth: dob,
        age: newUser.age,
        gender: newUser.gender,
        email: newUser.email,
        authUid: authCredential.user.uid,
        type: type,
        userId: newUser.userId,
        misc: accountMisc
    });
    // @ts-ignore
    await signOut(secondaryAuth);
    return authCredential.user.uid;
}

/**
 * Will create a customer account and add it to Firebase
 * @param {string} firstName The first name of the customer
 * @param {string} lastName The last name of the customer
 * @param {Date} dateOfBirth The date of birth of the customer
 * @param {string} gender The gender of teh customer
 * @param {string} email The email of the customer
 * @param {string} password The password of the customer
 * @param {string} type The account type
 * @param {string} citizenStatus Whether the customer is a US citizen or not
 * @returns {Promise<string>} The document ID of the newly created customer in Firestore
 */
export async function submitCustomerAccount(firstName, lastName, dateOfBirth, gender, email, password, type, citizenStatus){
    const dob = new Date(dateOfBirth).toISOString().slice(0,10);
    const newUser = /** @type {Customer} */ (createCustomerAccount(firstName, lastName, dateOfBirth, gender, email, password, type, citizenStatus));
    await ensureAuthPersistence();
    // @ts-ignore
    const authCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    //Use authUid as document ID so Firestore security rules can look it up with exists()
    // @ts-ignore
    const docRef = doc(db, 'customer', authCredential.user.uid);
    await setDoc(docRef, {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        dateOfBirth: dob,
        age: newUser.age,
        gender: newUser.gender,
        email: newUser.email,
        authUid: authCredential.user.uid,
        type: type,
        loyaltyPoints: 0,
        userId: newUser.userId,
        isCitizen: newUser.isCitizen,
        citizenStatus: newUser.citizenStatus
    });
    
    return authCredential.user.uid;
}

// @ts-ignore
export async function getCustomerProfile(authUid, email) {
    return getCustomerDocByAuthUid(authUid, email);
}

// @ts-ignore
export async function redeemCustomerReward({
    customerDocId,
    authUid,
    userId,
    email,
    rewardId,
    title,
    type,
    milesCost
}) {
    const normalizedCost = normalizeWholeNumber(milesCost, 0);
    if (!customerDocId) {
        throw new Error('Missing customer profile id.');
    }
    if (!rewardId || !title) {
        throw new Error('Missing reward information.');
    }
    if (normalizedCost <= 0) {
        throw new Error('Reward cost must be greater than zero.');
    }

    const customerRef = doc(db, 'customer', customerDocId);
    const customerSnapshot = await getDoc(customerRef);

    if (!customerSnapshot.exists()) {
        throw new Error('Customer profile not found.');
    }

    const customerData = customerSnapshot.data() || {};
    const currentPoints = normalizeCustomerPoints(customerData);
    if (currentPoints < normalizedCost) {
        throw new Error(`Not enough points. You need ${normalizedCost - currentPoints} more.`);
    }

    const batch = writeBatch(db);
    const redemptionRef = doc(collection(db, 'rewardRedemptions'));
    const nextPoints = currentPoints - normalizedCost;
    const voucherCode = generateVoucherCode(rewardId);

    batch.set(redemptionRef, {
        rewardId,
        title,
        type: type || 'Reward',
        milesCost: normalizedCost,
        voucherCode,
        customerDocId,
        authUid: authUid || customerData.authUid || '',
        userId: userId || customerData.userId || '',
        email: email || customerData.email || '',
        redeemedAt: new Date(),
        status: 'AVAILABLE'
    });

    batch.update(customerRef, {
        loyaltyPoints: nextPoints,
        miles: nextPoints,
        updatedAt: new Date()
    });

    await batch.commit();

    return {
        redemptionDocId: redemptionRef.id,
        remainingPoints: nextPoints,
        voucherCode
    };
}

// @ts-ignore
export async function getAdminProfile(authUid, email) {
    const admin = await getFirstDocByQueries('admin', [
        { field: 'email', value: email },
        { field: 'authUid', value: authUid }
    ]);

    if (!admin) {
        return null;
    }

    return { adminDocId: admin.docId, ...admin };
}

// @ts-ignore
export async function getEmployeeProfile(authUid, email) {
    for (const role of ['pilot', 'attendant']) {
        const employee = await getFirstDocByQueries(role, [
            { field: 'email', value: email },
            { field: 'authUid', value: authUid }
        ]);

        if (employee) {
            return { employeeDocId: employee.docId, role, ...employee };
        }
    }

    return null;
}

// @ts-ignore
export async function submitBooking(bookingIn) {
    if (!bookingIn?.authUid) {
        throw new Error('A signed-in user is required to create a booking.');
    }
    if (!bookingIn?.flight?.firestoreDocId) {
        throw new Error('Missing flight details for booking.');
    }

    const customer = await getCustomerDocByAuthUid(bookingIn.authUid);
    if (!customer?.userId) {
        throw new Error('Customer profile is missing. Please sign in again.');
    }

    const selectedSeats = Array.isArray(bookingIn.selectedSeats)
        // @ts-ignore
        ? bookingIn.selectedSeats.map((seat) => String(seat || '').trim()).filter(Boolean)
        : [];
    const passengers = Math.max(1, Number(bookingIn.passengers || selectedSeats.length || 1));
    const seatRow = Math.max(1, Math.min(30, Math.floor(Math.random() * 30) + 1));
    const seatLetter = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)];
    const seatNumber = bookingIn.seatNumber || (selectedSeats.length ? selectedSeats.join(', ') : `${seatRow}${seatLetter}`);
    const totalPrice = Number.isFinite(Number(bookingIn.price))
        ? Number(bookingIn.price)
        : Number.isFinite(Number(bookingIn.totalPrice))
            ? Number(bookingIn.totalPrice)
            : Number.isFinite(Number(bookingIn.flight.basePrice))
                ? Number(bookingIn.flight.basePrice)
                : 0;
    const appliedRewards = Array.isArray(bookingIn.appliedRewards)
        ? bookingIn.appliedRewards
            .filter(Boolean)
            .map((reward) => ({
                redemptionDocId: String(reward.redemptionDocId || ''),
                rewardId: String(reward.rewardId || ''),
                title: String(reward.title || ''),
                type: String(reward.type || ''),
                voucherCode: String(reward.voucherCode || ''),
                milesCost: normalizeWholeNumber(reward.milesCost, 0)
            }))
        : [];
    const accommodations = Array.isArray(bookingIn.accommodations)
        ? bookingIn.accommodations
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        : [];
    const flightRef = doc(db, 'flights', bookingIn.flight.firestoreDocId);
    const flightSnapshot = await getDoc(flightRef);
    if (!flightSnapshot.exists()) {
        throw new Error('Flight is no longer available. Please refresh and try again.');
    }

    const flightData = flightSnapshot.data() || {};
    const bookingFlight = bookingIn.flight || {};
    const distanceMiles = normalizeWholeNumber(flightData.distanceMiles ?? bookingFlight.distanceMiles, 0);
    const loyaltyPointsEarned = distanceMiles * passengers;
    const flightSnapshotForBooking = {
        firestoreDocId: bookingFlight.firestoreDocId,
        flightNumber: flightData.flightNumber || bookingFlight.flightNumber || '',
        origin: flightData.origin || bookingFlight.origin || '',
        destination: flightData.destination || bookingFlight.destination || '',
        originAirport: flightData.originAirport || bookingFlight.originAirport || null,
        destinationAirport: flightData.destinationAirport || bookingFlight.destinationAirport || null,
        departure: flightData.departure || bookingFlight.departure || null,
        arrival: flightData.arrival || bookingFlight.arrival || null,
        airline: flightData.airline || bookingFlight.airline || '',
        layovers: flightData.layovers || bookingFlight.layovers || 'None',
        distanceMiles,
        seatPricing: flightData.seatPricing || bookingFlight.seatPricing || null
    };
    const derivedCapacity = Number(flightData?.plane?.capacity || bookingIn?.flight?.plane?.capacity || 0);
    const baseMap = Array.isArray(flightData.seatingMap)
        ? flightData.seatingMap.map((status) => (Number(status) === 1 ? 1 : 0))
        : [];
    const mapLength = baseMap.length > 0 ? baseMap.length : Math.max(derivedCapacity, 0);
    const nextSeatingMap = mapLength > 0 ? [...baseMap] : [];

    if (nextSeatingMap.length === 0) {
        throw new Error('Flight seating information is unavailable. Please try again later.');
    }

    const seatsPerRow = getSeatsPerRowFromCapacity(derivedCapacity || nextSeatingMap.length);
    selectedSeats.forEach((seatId) => {
        const seatIndex = seatIdToIndex(seatId, seatsPerRow, nextSeatingMap.length);
        if (nextSeatingMap[seatIndex] === 1) {
            throw new Error(`Seat ${seatId} was just booked by another customer. Please choose another seat.`);
        }
        nextSeatingMap[seatIndex] = 1;
    });

    await updateDoc(flightRef, {
        seatingMap: nextSeatingMap,
        updatedAt: new Date()
    });

    const boardingPassRef = doc(collection(db, 'boardingPasses'));
    // @ts-ignore
    await setDoc(boardingPassRef, {
        boardingPassId: boardingPassRef.id,
        passengerId: customer.userId,
        authUid: bookingIn.authUid,
        customerEmail: bookingIn.customerEmail || customer.email || '',
        flightId: bookingIn.flight.firestoreDocId,
        seatNumber,
        selectedSeats,
        ticketTier: bookingIn.ticketTier || bookingIn.cabinTier || 'Economy',
        status: 'CONFIRMED',
        tripType: bookingIn.tripType || 'one-way',
        passengers,
        requestedDepartDate: bookingIn.requestedDepartDate || '',
        requestedReturnDate: bookingIn.requestedReturnDate || '',
        accommodations,
        price: totalPrice,
        appliedRewards,
        distanceMiles,
        loyaltyPointsEarned,
        createdAt: new Date(),
        flight: flightSnapshotForBooking
    });

    // @ts-ignore
    await updateDoc(doc(db, 'customer', customer.customerDocId), {
        loyaltyPoints: increment(loyaltyPointsEarned),
        miles: increment(loyaltyPointsEarned),
        updatedAt: new Date()
    });

    await Promise.all(
        appliedRewards
            .filter((reward) => reward.redemptionDocId)
            .map((reward) => (
                updateDoc(doc(db, 'rewardRedemptions', reward.redemptionDocId), {
                    status: 'USED',
                    usedAt: new Date(),
                    usedOnBoardingPassId: boardingPassRef.id,
                    usedFlightId: bookingIn.flight.firestoreDocId,
                    usedFlightNumber: bookingIn.flight.flightNumber || ''
                })
            ))
    );

    return boardingPassRef.id;
}

// @ts-ignore
export async function storeTransactionDocuments(flightIn, passengersIn, boardingPassIn) {
    const signedInUser = auth.currentUser;
    if (!signedInUser) {
        throw new Error('A signed-in user is required to create a booking.');
    }

    const firstPassenger = Array.isArray(passengersIn) ? passengersIn[0] : null;
    const selectedSeats = Array.isArray(boardingPassIn?.selectedSeats)
        ? boardingPassIn.selectedSeats
        : Array.isArray(boardingPassIn?.seats)
            ? boardingPassIn.seats
            : [];

    const bookingPayload = {
        authUid: signedInUser.uid,
        customerEmail: signedInUser.email || firstPassenger?.email || '',
        passengers: Number(boardingPassIn?.numTickets || selectedSeats.length || 1),
        selectedSeats,
        accommodations: Array.isArray(boardingPassIn?.accommodations)
            ? boardingPassIn.accommodations
            : [],
        seatNumber: boardingPassIn?.seatNumber || (selectedSeats.length ? selectedSeats.join(', ') : ''),
        tripType: boardingPassIn?.returnDate ? 'round-trip' : 'one-way',
        requestedReturnDate: boardingPassIn?.returnDate || '',
        ticketTier: boardingPassIn?.ticketTier || 'Economy',
        price: Number(boardingPassIn?.price || 0),
        flight: {
            firestoreDocId: flightIn?.firestoreDocId || flightIn?.flightId || '',
            flightNumber: flightIn?.flightNumber || '',
            origin: flightIn?.origin || '',
            destination: flightIn?.destination || '',
            originAirport: flightIn?.originAirport || null,
            destinationAirport: flightIn?.destinationAirport || null,
            departure: flightIn?.departure || null,
            arrival: flightIn?.arrival || null,
            airline: flightIn?.airline || '',
            layovers: flightIn?.layovers || 'None',
            distanceMiles: Number(flightIn?.distanceMiles || 0),
            seatPricing: flightIn?.seatPricing || null,
            basePrice: Number(flightIn?.basePrice || 0)
        }
    };

    const bookingDocId = await submitBooking(bookingPayload);
    return { bookingDocId };
}

// @ts-ignore
export async function updateBookingStatusByDocId(bookingDocId, status) {
    if (!bookingDocId) {
        throw new Error('Missing booking document id.');
    }
    if (!status) {
        throw new Error('Missing booking status.');
    }

    // @ts-ignore
    await setDoc(doc(db, 'flightManifest', bookingDocId), {
        status,
        updatedAt: new Date()
    }, { merge: true });
}

export async function rescheduleBookingByDocId() {
    throw new Error('Current Firestore rules do not allow customer rescheduling from the app.');
}

// @ts-ignore
export async function checkInBookingByDocId(bookingDocId, booking) {
    if (!bookingDocId) {
        throw new Error('Missing booking document id.');
    }

    // @ts-ignore
    await setDoc(doc(db, 'flightManifest', bookingDocId), {
        passengerId: booking?.passengerId || booking?.authUid || '',
        flightId: booking?.flightId || booking?.flight?.firestoreDocId || '',
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        updatedAt: new Date()
    }, { merge: true });
}

/**
 * Stores plane information to Firebase
 * @param {number} capacity The plane's capacity
 * @param {string} manufacturer The plane's manufacture
 * @param {string} model The plane's model
 */
export async function storePlane(capacity, manufacturer, model){
    const newPlane = addPlane(capacity, manufacturer, model);

    // @ts-ignore
    // @ts-ignore
    const docRef = await addDoc(collection(db, "planes"), {
        planeId: newPlane.planeId,
        planeName: newPlane.name,
        planeCapacity: newPlane.capacity,
        planeModel: newPlane.model,
        planeManufacturer: newPlane.manufacturer
    });


}

// @ts-ignore
export async function cancelFlightAndCompensateByDocId(firestoreDocId, compensationMiles) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore flight document id.');
    }

    // @ts-ignore
    await updateDoc(doc(db, 'flights', firestoreDocId), {
        status: 'CANCELLED',
        compensationMiles: compensationMiles || 0,
        updatedAt: new Date()
    });

    const affectedBoardingPasses = await getDocs(
        // @ts-ignore
        query(collection(db, 'boardingPasses'), where('flightId', '==', firestoreDocId))
    );

    let rewardedCustomers = 0;
    let totalPointsAwarded = 0;

    for (const boardingPassDoc of affectedBoardingPasses.docs) {
        const boardingPass = boardingPassDoc.data();
        const passengerCount = Math.max(1, Number(boardingPass.passengers || 1));
        const awardedPoints = Math.max(0, Number(compensationMiles || 0)) * passengerCount;
        const customer = await getCustomerDocForBooking(boardingPass);

        // @ts-ignore
        await updateDoc(doc(db, 'boardingPasses', boardingPassDoc.id), {
            status: 'FLIGHT_CANCELLED',
            compensationMilesAwarded: awardedPoints,
            compensationPointsAwarded: awardedPoints,
            cancelledAt: new Date()
        });

        if (customer?.customerDocId) {
            // @ts-ignore
            await updateDoc(doc(db, 'customer', customer.customerDocId), {
                loyaltyPoints: increment(awardedPoints),
                miles: increment(awardedPoints),
                updatedAt: new Date()
            });
            rewardedCustomers += 1;
            totalPointsAwarded += awardedPoints;
        }
    }

    return {
        affectedBookings: affectedBoardingPasses.size,
        rewardedCustomers,
        totalPointsAwarded
    };
}
