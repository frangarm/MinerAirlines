// @ts-nocheck

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomerDocByAuthUid } from './FetchProfilesFromFirebase';

// @ts-ignore
export function subscribeEmployeesByType(type, onData, onError) {
    if (!type) {
        throw new Error('Employee type is required.');
    }

    return onSnapshot(
        // @ts-ignore
        collection(db, type),
        (snapshot) => {
            const employees = snapshot.docs.map((employeeDoc) => ({
                employeeDocId: employeeDoc.id,
                ...employeeDoc.data()
            }));
            onData(employees);
        },
        (error) => {
            if (typeof onError === 'function') onError(error);
        }
    );
}

// @ts-ignore
export function subscribeAllBookings(onData, onError) {
    let stopBoardingPasses = null;
    let stopManifest = null;
    // @ts-ignore
    let latestBoardingPasses = [];
    let latestManifestMap = new Map();

    const emit = () => {
        // @ts-ignore
        onData(mergeBoardingPassesWithManifest(latestBoardingPasses, latestManifestMap));
    };

    stopBoardingPasses = onSnapshot(
        // @ts-ignore
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
        // @ts-ignore
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

// @ts-ignore
export function subscribeBookingsByAuthUid(authUid, onData, onError) {
    if (!authUid) {
        throw new Error('Missing auth UID for bookings subscription.');
    }

    // @ts-ignore
    let stopBoardingPasses = null;
    // @ts-ignore
    let stopManifest = null;
    // @ts-ignore
    let latestBoardingPasses = [];
    let latestManifestMap = new Map();

    const emit = () => {
        // @ts-ignore
        onData(mergeBoardingPassesWithManifest(latestBoardingPasses, latestManifestMap));
    };

    getCustomerDocByAuthUid(authUid)
        .then((customer) => {
            if (!customer?.userId) {
                latestBoardingPasses = [];
                emit();
                return;
            }

            stopBoardingPasses = onSnapshot(
                // @ts-ignore
                query(collection(db, 'boardingPasses'), where('passengerId', '==', customer.userId)),
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
                // @ts-ignore
                query(collection(db, 'flightManifest'), where('passengerId', '==', customer.userId)),
                (snapshot) => {
                    latestManifestMap = toManifestMap(snapshot);
                    emit();
                },
                (error) => {
                    if (typeof onError === 'function') onError(error);
                }
            );
        })
        .catch((error) => {
            if (typeof onError === 'function') onError(error);
        });

    return () => {
        // @ts-ignore
        if (typeof stopBoardingPasses === 'function') stopBoardingPasses();
        // @ts-ignore
        if (typeof stopManifest === 'function') stopManifest();
    };
}

// @ts-ignore
export function toManifestMap(snapshot) {
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
export function mergeBoardingPassesWithManifest(boardingPasses, manifestMap) {
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