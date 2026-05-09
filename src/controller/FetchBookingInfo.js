// @ts-nocheck
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { toManifestMap, mergeBoardingPassesWithManifest } from './SubscribeFirebase';
/**
 * Helper function to parse the createdAt field from a booking document, which can be in various formats depending on how it was stored. 
 * It handles Firestore Timestamp objects, ISO date strings, and JavaScript Date objects, returning a consistent Date object or null if parsing fails.
 */
function parseCreatedAt(rawCreatedAt) {
    if (!rawCreatedAt) {
        return null;
    }

    if (rawCreatedAt instanceof Date) {
        return rawCreatedAt;
    }

    if (typeof rawCreatedAt?.toDate === 'function') {
        return rawCreatedAt.toDate();
    }

    const parsed = new Date(rawCreatedAt);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}
/**
 * Formats a date into a readable string format for the admin analytics chart 
 */
function formatDayLabel(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(date);
}

/**
 * Gets booking information from the database, will be used for admin analytics page
 * @returns {Promise<Array<{name: string, ticketsSold: number, seatsSold: number, sortTs: number}>>}
 */
export async function fetchBookings() {
    try {
        const snapshot = await getDocs(collection(db, 'boardingPasses'));
        const totalsByDay = new Map();

        snapshot.forEach((docSnapshot) => {
            const booking = docSnapshot.data() || {};
            const parsedDate = parseCreatedAt(booking.createdAt);
            const total = Number(booking.price) || 0;                    
            const dayLabel = parsedDate ? formatDayLabel(parsedDate) : 'Unknown Date';
            const sortTs = parsedDate ? parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
            const ticketsSold = Number(booking.passengers) || 0;         
            const seatsSold = Array.isArray(booking.selectedSeats)
                ? booking.selectedSeats.length
                : ticketsSold;                                            

            if (!totalsByDay.has(dayLabel)) {
                totalsByDay.set(dayLabel, {
                    name: dayLabel,
                    ticketsSold: 0,
                    seatsSold: 0,
                    totalRevenue: 0,
                    sortTs
                });
            }

            const current = totalsByDay.get(dayLabel);
            current.ticketsSold += ticketsSold;
            current.seatsSold += seatsSold;
            current.totalRevenue += total;
            current.sortTs = Math.min(current.sortTs, sortTs);
        });

        return Array.from(totalsByDay.values()).sort((a, b) => a.sortTs - b.sortTs);
    } catch (error) {
        console.error('Error fetching booking analytics:', error);
        throw error;
    }
}
/**
 * Gets seat count information for each flight from the database
 * @returns {Promise<Array<{flightNumber: string, seatsSold: number}>>}
 */
export async function fetchDestinations() {
    try {
        let info = []
        let total = 0;
        let flightNumber = '';
        let totalSeats = [];
        const snapshot = await getDocs(collection(db, 'flights'));
        snapshot.forEach((docSnapshot) => {
            totalSeats = Array.isArray(docSnapshot.data()?.seatingMap)
                ? docSnapshot.data().seatingMap
                : [];
            flightNumber = docSnapshot.data()?.flightNumber || 'Unknown Flight';
            totalSeats.forEach((element) => {
                if (element === 1) {
                    total++;
                }
            
            });
            info.push({ flightNumber, seatsSold: total });
            total = 0;
        });
        return info;
    } catch (error) {
        console.error('Error fetching destinations:', error);
        throw error;
    }
}


export function subscribeAllBookings(onData, onError) {
    let stopBoardingPasses = null;
    let stopManifest = null;
    let latestBoardingPasses = [];
    let latestManifestMap = new Map();

    const emit = () => {
        onData(mergeBoardingPassesWithManifest(latestBoardingPasses, latestManifestMap));
    };

    stopBoardingPasses = onSnapshot(
        collection(db, 'boardingPasses'),
        (snapshot) => {
            latestBoardingPasses = snapshot.docs.map((boardingPassDoc) => ({
                bookingDocId: boardingPassDoc.id,
                boardingPassId: boardingPassDoc.id,
                ...boardingPassDoc.data()
            }));
            emit();
        },
        (error) => {
            if (typeof onError === 'function') onError(error);
        }
    );

    stopManifest = onSnapshot(
        collection(db, 'flightManifest'),
        (snapshot) => {
            latestManifestMap = toManifestMap(snapshot);
            emit();
        },
        (error) => {
            if (typeof onError === 'function') onError(error);
        }
    );

    return () => {
        if (typeof stopBoardingPasses === 'function') stopBoardingPasses();
        if (typeof stopManifest === 'function') stopManifest();
    };
}

export function subscribeFlights(onData, onError) {
    return onSnapshot(
        collection(db, 'flights'),
        (snapshot) => {
            const flightInfo = snapshot.docs.map((d) => {
                const seatingMap = Array.isArray(d.data().seatingMap) ? d.data().seatingMap : [];
                return {
                    flightNumber: d.data().flightNumber || 'Unknown',
                    seatsSold: seatingMap.filter((s) => s === 1).length
                };
            });
            onData(flightInfo);
        },
        (error) => {
            if (typeof onError === 'function') onError(error);
        }
    );
}

export function aggregateByDay(bookings) {
  const totalsByDay = new Map();

  bookings.forEach((booking) => {
    const parsedDate = parseCreatedAt(booking.createdAt);
    const dayLabel = parsedDate ? formatDayLabel(parsedDate) : 'Unknown Date';
    const sortTs = parsedDate ? parsedDate.getTime() : Number.MAX_SAFE_INTEGER;
    const ticketsSold = Number(booking.passengers) || 0;                        
    const seatsSold = Array.isArray(booking.selectedSeats)
        ? booking.selectedSeats.length
        : ticketsSold;                                                             
    const total = Number(booking.price) || 0;                                    

    if (!totalsByDay.has(dayLabel)) {
      totalsByDay.set(dayLabel, {
        name: dayLabel,
        ticketsSold: 0,
        seatsSold: 0,
        totalRevenue: 0,
        sortTs
      });
    }

    const current = totalsByDay.get(dayLabel);
    current.ticketsSold += ticketsSold;
    current.seatsSold += seatsSold;
    current.totalRevenue += total;
    current.sortTs = Math.min(current.sortTs, sortTs);
  });

  return Array.from(totalsByDay.values()).sort((a, b) => a.sortTs - b.sortTs);
}