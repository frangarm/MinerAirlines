// @ts-nocheck
import {Customer} from '../model/User';
import { Flight } from '../model/Flight';
import { BoardingPass } from '../model/Booking';
import { getSchedule } from '../model/Data';
import { collection, doc, getDoc, getDocs, increment, limit, query, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { storeTransactionDocuments } from './StoreFirebaseInfo';

/**
 * Checks if a passenger exists in the database by looking for a matching userId or email.
 * @param {Customer} customerIn The customer to check for in the database
 * @returns {Promise<boolean>} True if the passenger exists in the database, false otherwise
 */
async function passengerExistsInDb(customerIn) {
    const signedInUser = auth.currentUser;
    if (!signedInUser) {
        return false;
    }

    // @ts-ignore
    const canonicalCustomerRef = doc(db, 'customer', signedInUser.uid);
    const canonicalCustomerSnapshot = await getDoc(canonicalCustomerRef);
    if (!canonicalCustomerSnapshot.exists()) {
        return false;
    }

    const canonicalCustomerData = canonicalCustomerSnapshot.data() || {};
    const expectedUserId = customerIn?.userId;
    const expectedEmail = customerIn?.email;

    const userIdMatches = !expectedUserId
        || canonicalCustomerData.userId === expectedUserId
        // @ts-ignore
        || signedInUser.uid === expectedUserId;

    const emailMatches = !expectedEmail
        || canonicalCustomerData.email === expectedEmail
        // @ts-ignore
        || signedInUser.email === expectedEmail;

    return userIdMatches && emailMatches;
}

/**
 * Initiates a transaction by creating a boarding pass, adding the passenger to the flight, and storing the transaction documents in Firebase.
 * @param {Flight | any} flightIn The flight for which the transaction is being made
 * @param {Customer} customerIn The customer initiating the transaction
 * @param {number} ticketNum The number of tickets being purchased
 * @param {string[]} selectedSeats The seat IDs of the seats being purchased
 * @param {string} ticketTier The tier of the tickets being purchased
 * @param {string} returnDate The return date for the transaction
 * @param {number[]} seatIndexes The indexes of the seats being purchased
 */
export async function initiateTransaction(flightIn, customerIn, ticketNum, selectedSeats, ticketTier, returnDate, seatIndexes) {
    /**
     * @param {string} stepName
     * @param {() => Promise<any>} action
     * @param {Record<string, any>} metadata
     */
    const executeWithTransactionDiagnostics = async (stepName, action, metadata = {}) => {
        try {
            return await action();
        } catch (error) {
            const errorAny = /** @type {any} */ (error);
            const code = errorAny?.code || 'unknown';
            const message = errorAny?.message || 'Unknown transaction error';
            throw new Error(`Checkout transaction failed at ${stepName} (code: ${code}): ${message}. Context: ${JSON.stringify(metadata)}`);
        }
    };

    const tierPrice = flightIn.seatPricing.get(ticketTier);
    if (tierPrice === undefined) {
        throw new Error(`Invalid ticket tier: ${ticketTier}`);
    }

    /**
     * @type {number}
     */
    const totalPrice = tierPrice * ticketNum;
    if(!getSchedule().has(flightIn.flightId)){
        throw new Error(`Flight ${flightIn.flightId} not found`);
    }

    const passengerExists = await executeWithTransactionDiagnostics(
        'customer/exists-check',
        () => passengerExistsInDb(customerIn),
        { userId: customerIn?.userId || '', email: customerIn?.email || '' }
    );
    if (!passengerExists) {
        throw new Error(`Passenger ${customerIn.fullName} not found in Database`);
    }

    if (selectedSeats.length !== ticketNum) {
        throw new Error(`Expected ${ticketNum} seat(s), but received ${selectedSeats.length}`);
    }

    const flightNumber = flightIn.flightNumber;
    const flightGate = flightIn.gate;
    const flightOrigin = flightIn.origin;
    const flightDestination = flightIn.destination;
    const flightDeparture = flightIn.departure;
    const flightArrival = flightIn.arrival;
    const newBoardingPass = new BoardingPass({
        price: totalPrice,
        numTickets: ticketNum,
        selectedSeats,
        seatIndexes,
        ticketTier,
        passengerName: customerIn.fullName,
        passengerId: customerIn.userId,
        passengerEmail: customerIn.email,
        authUid: auth.currentUser?.uid || '',
        returnDate,
        requestedReturnDate: returnDate,
        requestedDepartDate: flightDeparture ? new Date(flightDeparture).toISOString().slice(0, 10) : '',
        distanceMiles: Number(flightIn?.distanceMiles || 0),
        flight: {
            firestoreDocId: flightIn?.firestoreDocId || flightIn?.flightId || '',
            flightId: flightIn?.flightId || flightIn?.firestoreDocId || '',
            flightNumber,
            gate: flightGate,
            origin: flightOrigin,
            destination: flightDestination,
            departure: flightDeparture,
            arrival: flightArrival,
            airline: flightIn?.airline || 'Miner Airlines',
            layovers: flightIn?.layovers || 'None',
            distanceMiles: Number(flightIn?.distanceMiles || 0),
            seatPricing: flightIn?.seatPricing || null,
        },
    });

    flightIn.addPassengers([customerIn], newBoardingPass);
    const firestoreDocumentIds = await executeWithTransactionDiagnostics(
        'documents/store',
        () => storeTransactionDocuments(flightIn, [customerIn], newBoardingPass),
        { flightId: flightIn?.flightId || '', passengerId: customerIn?.userId || '' }
    );
    return {
        boardingPass: newBoardingPass,
        firestoreDocumentIds
    };
}

/**
 * Cancels a booking by a customer, deletes all relevant information from Firebase, and updates the flight's passenger list accordingly.
 * @param {BoardingPass | any} boardingPassIn The boarding pass associated with the booking to be canceled
 * @param {Customer | any} customerIn The customer who made the booking to be canceled
 * @param {Flight | any} flightIn  The flight associated with the booking to be canceled
 */
export async function cancelBooking(boardingPassIn, customerIn, flightIn){
    if (!boardingPassIn || !customerIn || !flightIn) {
        throw new Error('Missing required parameters for canceling booking');
    }
    
    try{
        //Check if the passenger exists in the database 
        const passengerExists = await passengerExistsInDb(customerIn);
        if (!passengerExists) {
            throw new Error(`Passenger ${customerIn.fullName} not found in Database`);
        }
        //Check if the boarding pass ID exists in the database
        const boardingPassId = boardingPassIn.boardingPassId || boardingPassIn.boardingPassDocumentId || boardingPassIn.bookingId;
        if (!boardingPassId) {
            throw new Error('Missing boarding pass ID for cancellation.');
        }
        //Will use a batch write to ensure that all related documents are updated/deleted
        // @ts-ignore
        const batch = writeBatch(db);
        //Delete the boarding pass from Firebase
        // @ts-ignore
        batch.delete(doc(db, 'boardingPasses', boardingPassId));

        //Update the flight's seating map in Firebase, making the seats available 
        const selectedSeats = Array.isArray(boardingPassIn.seats)
            ? boardingPassIn.seats
            : (Array.isArray(boardingPassIn.selectedSeats)
                ? boardingPassIn.selectedSeats
                : (typeof boardingPassIn.seatNumber === 'string'
                    ? boardingPassIn.seatNumber.split(',').map((seat) => String(seat || '').trim()).filter(Boolean)
                    : []));
        if (Array.isArray(flightIn.seatingMap) && typeof flightIn.getSeatIndex === 'function') {
            selectedSeats.forEach((/** @type {string} */ seatId) => {
                const seatIndex = flightIn.getSeatIndex(seatId);
                if (seatIndex >= 0 && seatIndex < flightIn.seatingMap.length) {
                    flightIn.seatingMap[seatIndex] = 0;
                }
            });

            if (flightIn.flightDocRef) {
                batch.update(flightIn.flightDocRef, {
                    seatingMap: flightIn.seatingMap
                });
            } else if (flightIn.flightId) {
                const flightSnapshot = await getDocs(
                    // @ts-ignore
                    query(collection(db, 'flights'), where('flightId', '==', flightIn.flightId), limit(1))
                );
                if (!flightSnapshot.empty) {
                    batch.update(flightSnapshot.docs[0].ref, {
                        seatingMap: flightIn.seatingMap
                    });
                }
            }
        }
        //Delete the passenger from the flight's manifest in Firebase when a flight id is available.
        if (flightIn.flightId) {
            // @ts-ignore
            const flightManifestRef = doc(db, 'flightManifest', flightIn.flightId);
            const flightManifestSnapshot = await getDoc(flightManifestRef);
            if (flightManifestSnapshot.exists()) {
                const flightManifestData = flightManifestSnapshot.data();
                const existingPassengers = Array.isArray(flightManifestData?.passengers)
                    ? flightManifestData.passengers
                    : [];
                const filteredPassengers = existingPassengers.filter((passenger) => passenger?.userId !== customerIn.userId);

                batch.update(flightManifestRef, {
                    passengers: filteredPassengers
                });
            }
        }
        //Delete the boarding pass from the signed-in customer's document in Firebase.
        //Use authUid/email resolution to ensure this update follows security rules.
        const signedInUser = auth.currentUser;
        if (signedInUser) {
            // @ts-ignore
            const customerCollection = collection(db, 'customer');
            let customerSnapshot = await getDocs(
                // @ts-ignore
                query(customerCollection, where('authUid', '==', signedInUser.uid), limit(1))
            );

            // @ts-ignore
            if (customerSnapshot.empty && signedInUser.email) {
                customerSnapshot = await getDocs(
                    // @ts-ignore
                    query(customerCollection, where('email', '==', signedInUser.email), limit(1))
                );
            }

            if (!customerSnapshot.empty) {
                const existingBoardingPasses = Array.isArray(customerSnapshot.docs[0].data().boardingPasses)
                    ? customerSnapshot.docs[0].data().boardingPasses
                    : [];
                batch.update(customerSnapshot.docs[0].ref, {
                    boardingPasses: existingBoardingPasses.filter((/** @type {{ boardingPassId?: string, boardingPassDocumentId?: string, bookingId?: string }} */ bp) => {
                        const existingId = bp.boardingPassDocumentId || bp.boardingPassId || bp.bookingId;
                        return existingId !== boardingPassId;
                    })
                });
            }
        }
        //Commit the batch write to apply all deletions/updates
        await batch.commit();
        
    }
    catch (error) {
        console.error('Error deleting booking documents:', error);
        throw new Error('Failed to cancel booking. Please try again later.');
    }
}

/**
 * Cancels a booking by resolving flight data from Firestore using the boarding pass flight number.
 * @param {BoardingPass | any} boardingPassIn
 * @param {Customer | any} customerIn
 */
export async function cancelBookingForCustomer(boardingPassIn, customerIn) {
    const firstNonEmpty = (...values) => values.find((value) => value != null && value !== '');

    const boardingPassId = firstNonEmpty(
        boardingPassIn?.boardingPassDocumentId,
        boardingPassIn?.boardingPassId,
        boardingPassIn?.bookingDocId,
        boardingPassIn?.bookingId,
        boardingPassIn?.docId,
    ) || '';
    let canonicalBoardingPass = null;

    if (boardingPassId) {
        const directSnapshot = await getDoc(doc(db, 'boardingPasses', boardingPassId));
        if (directSnapshot.exists()) {
            canonicalBoardingPass = {
                boardingPassId: directSnapshot.id,
                ...directSnapshot.data()
            };
        } else {
            const fallbackSnapshot = await getDocs(
                // @ts-ignore
                query(collection(db, 'boardingPasses'), where('boardingPassId', '==', boardingPassId), limit(1))
            );

            if (!fallbackSnapshot.empty) {
                canonicalBoardingPass = {
                    boardingPassId: fallbackSnapshot.docs[0].id,
                    ...fallbackSnapshot.docs[0].data()
                };
            }
        }
    }

    if (!canonicalBoardingPass && customerIn?.userId) {
        const passengerBookingsSnapshot = await getDocs(
            // @ts-ignore
            query(collection(db, 'boardingPasses'), where('passengerId', '==', customerIn.userId), limit(25))
        );

        const requestedSeatList = Array.isArray(boardingPassIn?.seats)
            ? boardingPassIn.seats
            : (Array.isArray(boardingPassIn?.selectedSeats) ? boardingPassIn.selectedSeats : []);
        const requestedSeatKey = requestedSeatList.join(',');
        const requestedFlightKey = firstNonEmpty(
            boardingPassIn?.flightNumber,
            boardingPassIn?.flight?.flightNumber,
            boardingPassIn?.flightId,
            boardingPassIn?.flight?.firestoreDocId,
        ) || '';

        const matchedDoc = passengerBookingsSnapshot.docs.find((bookingDoc) => {
            const data = bookingDoc.data() || {};
            const docFlightKey = firstNonEmpty(
                data.flightId,
                data.flightNumber,
                data?.flight?.firestoreDocId,
                data?.flight?.flightNumber,
            ) || '';

            const docSeats = Array.isArray(data.seats)
                ? data.seats
                : (Array.isArray(data.selectedSeats) ? data.selectedSeats : []);

            if (requestedFlightKey && docFlightKey && requestedFlightKey === docFlightKey) {
                return true;
            }

            if (requestedSeatKey && docSeats.join(',') === requestedSeatKey) {
                return true;
            }

            return false;
        }) || passengerBookingsSnapshot.docs[0];

        if (matchedDoc) {
            canonicalBoardingPass = {
                boardingPassId: matchedDoc.id,
                ...matchedDoc.data()
            };
        }
    }

    const effectiveBoardingPass = {
        ...(canonicalBoardingPass || {}),
        ...(boardingPassIn || {})
    };

    let flightNumber = firstNonEmpty(
        boardingPassIn?.flightNumber,
        boardingPassIn?.flight?.flightNumber,
        canonicalBoardingPass?.flightNumber,
        canonicalBoardingPass?.flight?.flightNumber,
    ) || '';

    let firestoreFlightDocId = firstNonEmpty(
        boardingPassIn?.flightId,
        boardingPassIn?.flight?.firestoreDocId,
        canonicalBoardingPass?.flightId,
        canonicalBoardingPass?.flight?.firestoreDocId,
    ) || '';

    let flightDoc = null;

    if (firestoreFlightDocId) {
        const flightByIdSnapshot = await getDoc(doc(db, 'flights', firestoreFlightDocId));
        if (flightByIdSnapshot.exists()) {
            flightDoc = flightByIdSnapshot;
        }
    }

    if (!flightDoc && flightNumber) {
        const flightSnapshot = await getDocs(
            // @ts-ignore
            query(collection(db, 'flights'), where('flightNumber', '==', flightNumber), limit(1))
        );

        if (!flightSnapshot.empty) {
            flightDoc = flightSnapshot.docs[0];
        }
    }

    const flightData = flightDoc ? flightDoc.data() : {};
    const seatingMap = Array.isArray(flightData?.seatingMap) ? flightData.seatingMap : [];

    /**
     * Accepts seat labels like "12A" or "A12" (with optional spaces/hyphens).
     * Returns null when a seat label cannot be parsed.
     * @param {string} rawSeatId
     * @returns {{ row: number, letter: string } | null}
     */
    const parseSeatId = (rawSeatId) => {
        if (typeof rawSeatId !== 'string') {
            return null;
        }

        const normalized = rawSeatId.trim().toUpperCase().replace(/[\s-]/g, '');
        if (!normalized) {
            return null;
        }

        const rowLetterMatch = /^(\d+)([A-I])$/.exec(normalized);
        if (rowLetterMatch) {
            return { row: Number(rowLetterMatch[1]), letter: rowLetterMatch[2] };
        }

        const letterRowMatch = /^([A-I])(\d+)$/.exec(normalized);
        if (letterRowMatch) {
            return { row: Number(letterRowMatch[2]), letter: letterRowMatch[1] };
        }

        return null;
    };

    await cancelBooking(effectiveBoardingPass, customerIn, {
        flightId: flightData.flightId || firestoreFlightDocId || effectiveBoardingPass?.flight?.flightId || '',
        flightDocRef: flightDoc?.ref || null,
        seatingMap,
        getSeatIndex: (
            /** @type {string} */ seatId
        ) => {
            const parsed = parseSeatId(seatId);
            if (!parsed || parsed.row < 1) {
                return -1;
            }

            const seatOffset = 'ABCDEFGHI'.indexOf(parsed.letter);
            if (seatOffset < 0) {
                return -1;
            }

            const seatLayouts = [4, 6, 9];
            let firstValidIndex = -1;

            for (const seatsPerRow of seatLayouts) {
                if (seatOffset >= seatsPerRow) {
                    continue;
                }
                const seatIndex = (parsed.row - 1) * seatsPerRow + seatOffset;
                if (seatIndex < 0 || seatIndex >= seatingMap.length) {
                    continue;
                }
                if (firstValidIndex === -1) {
                    firstValidIndex = seatIndex;
                }
                if (Number(seatingMap[seatIndex]) === 1) {
                    return seatIndex;
                }
            }

            return firstValidIndex;
        }
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
    let totalMilesAwarded = 0;

    for (const boardingPassDoc of affectedBoardingPasses.docs) {
        const boardingPass = boardingPassDoc.data();
        const passengerId = boardingPass.passengerId;
        const passengerCount = Math.max(1, Number(boardingPass.passengers || 1));
        const awardedMiles = Math.max(0, Number(compensationMiles || 0)) * passengerCount;

        // @ts-ignore
        await updateDoc(doc(db, 'boardingPasses', boardingPassDoc.id), {
            status: 'FLIGHT_CANCELLED',
            compensationMilesAwarded: awardedMiles,
            cancelledAt: new Date()
        });

        if (passengerId) {
            // @ts-ignore
            await updateDoc(doc(db, 'customer', passengerId), {
                miles: increment(awardedMiles)
            });
            rewardedCustomers += 1;
            totalMilesAwarded += awardedMiles;
        }
    }

    return {
        affectedBookings: affectedBoardingPasses.size,
        rewardedCustomers,
        totalMilesAwarded
    };
}