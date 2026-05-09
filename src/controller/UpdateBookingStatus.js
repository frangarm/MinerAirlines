// @ts-nocheck
import { deleteDoc, doc, getDoc, increment, limit, query, setDoc, updateDoc, where, writeBatch, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

function getSeatsPerRowFromCapacity(capacity) {
    return Number(capacity) >= 180 ? 9 : 4;
}

function seatIdToIndex(seatId, seatsPerRow, mapLength) {
    const match = /^([1-9]\d*)([A-I])$/.exec(String(seatId || '').trim().toUpperCase());
    if (!match) {
        return -1;
    }

    const row = Number(match[1]);
    const letter = match[2];
    const seatOffset = 'ABCDEFGHI'.indexOf(letter);
    if (seatOffset < 0 || seatOffset >= seatsPerRow) {
        return -1;
    }

    const seatIndex = (row - 1) * seatsPerRow + seatOffset;
    if (seatIndex < 0 || seatIndex >= mapLength) {
        return -1;
    }

    return seatIndex;
}

// @ts-ignore
export async function cancelBookingByDocId(bookingDocId) {
    if (!bookingDocId) {
        throw new Error('Missing booking document id.');
    }

    const boardingPassRef = doc(db, 'boardingPasses', bookingDocId);
    const boardingPassSnapshot = await getDoc(boardingPassRef);
    if (!boardingPassSnapshot.exists()) {
        throw new Error('Boarding pass was not found.');
    }

    const boardingPass = boardingPassSnapshot.data() || {};
    const flightDocId = boardingPass.flightId || boardingPass?.flight?.firestoreDocId || '';

    const selectedSeats = Array.isArray(boardingPass.selectedSeats)
        ? boardingPass.selectedSeats
        : Array.isArray(boardingPass.seats)
            ? boardingPass.seats
            : (typeof boardingPass.seatNumber === 'string'
                ? boardingPass.seatNumber.split(',').map((seat) => String(seat || '').trim()).filter(Boolean)
                : []);

    let flightRef = null;
    let nextSeatingMap = null;

    if (flightDocId) {
        flightRef = doc(db, 'flights', flightDocId);
    } else {
        const flightNumber = boardingPass.flightNumber || boardingPass?.flight?.flightNumber || '';
        if (flightNumber) {
            const flightSnapshot = await getDocs(
                query(collection(db, 'flights'), where('flightNumber', '==', flightNumber), limit(1))
            );
            if (!flightSnapshot.empty) {
                flightRef = flightSnapshot.docs[0].ref;
            }
        }
    }

    if (flightRef) {
        const flightSnapshot = await getDoc(flightRef);
        if (flightSnapshot.exists()) {
            const flightData = flightSnapshot.data() || {};
            const seatingMap = Array.isArray(flightData.seatingMap)
                ? [...flightData.seatingMap].map((status) => (Number(status) === 1 ? 1 : 0))
                : [];

            if (seatingMap.length > 0 && selectedSeats.length > 0) {
                const seatsPerRow = getSeatsPerRowFromCapacity(flightData?.plane?.capacity || seatingMap.length);
                selectedSeats.forEach((seatId) => {
                    const seatIndex = seatIdToIndex(seatId, seatsPerRow, seatingMap.length);
                    if (seatIndex >= 0) {
                        seatingMap[seatIndex] = 0;
                    }
                });
                nextSeatingMap = seatingMap;
            }
        }
    }

    const loyaltyPointsEarned = Math.max(
        0,
        Number(
            boardingPass.loyaltyPointsEarned
            || (Number(boardingPass.distanceMiles || 0) * Math.max(1, Number(boardingPass.passengers || 1)))
        ) || 0
    );

    const batch = writeBatch(db);
    batch.delete(boardingPassRef);

    if (flightRef && Array.isArray(nextSeatingMap)) {
        batch.update(flightRef, {
            seatingMap: nextSeatingMap,
            updatedAt: new Date()
        });
    }

    batch.set(doc(db, 'flightManifest', bookingDocId), {
        status: 'CANCELLED_BY_CUSTOMER',
        cancelledAt: new Date(),
        updatedAt: new Date()
    }, { merge: true });

    await batch.commit();

    const signedInUser = auth.currentUser;
    if (signedInUser && loyaltyPointsEarned > 0) {
        await updateDoc(doc(db, 'customer', signedInUser.uid), {
            loyaltyPoints: increment(-loyaltyPointsEarned),
            miles: increment(-loyaltyPointsEarned),
            updatedAt: new Date()
        });
    }
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