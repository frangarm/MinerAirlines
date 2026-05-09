// @ts-nocheck
import { deleteDoc, doc } from 'firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { deleteUser } from 'firebase/auth';

/**
 * Deletes a flight from Firestore using its document ID
 * @param {*} firestoreDocId 
 */
export async function deleteFlightByDocId(firestoreDocId) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore flight document id.');
    }

    await deleteDoc(doc(db, 'flights', firestoreDocId));
}
/**
 * Deletes a user from Firestore using its document ID and account type
 * @param {*} firestoreDocId 
 * @param {string} accountType 
 */
export async function deleteUserByDocId(firestoreDocId, accountType) {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore user document id.');
    }
    switch (accountType) {
        case 'customer':
            await deleteDoc(doc(db, 'customer', firestoreDocId));
            break;
        case 'pilot':
            await deleteDoc(doc(db, 'pilot', firestoreDocId));
            break;
        case 'admin':
            await deleteDoc(doc(db, 'admin', firestoreDocId));
            break;
        case 'attendant':
            await deleteDoc(doc(db, 'attendant', firestoreDocId));
            break;
        default:
            throw new Error('Invalid account type.');
    }
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No signed-in user found for auth deletion.');
    }

    await deleteUser(user);
    console.log('User deleted successfully.');
}

/**
 * Deletes the account of an employee. 
 * Intended for admin account management screens.
 * @param {string} firestoreDocId
 * @param {'admin' | 'pilot' | 'attendant'} accountType
 * @param {string} authUid
 */
export async function deleteInsiderAccountRecordByType(firestoreDocId, accountType, authUid = '') {
    if (!firestoreDocId) {
        throw new Error('Missing Firestore user document id.');
    }

    const normalizedType = String(accountType || '').toLowerCase();
    if (!['admin', 'pilot', 'attendant'].includes(normalizedType)) {
        throw new Error('Invalid insider account type.');
    }

    await deleteDoc(doc(db, normalizedType, firestoreDocId));

    const normalizedAuthUid = String(authUid || '').trim();
    if (!normalizedAuthUid) {
        return;
    }

    // Also remove any insider docs sharing the same auth UID.
    for (const type of ['admin', 'pilot', 'attendant']) {
        const matches = await getDocs(
            query(collection(db, type), where('authUid', '==', normalizedAuthUid))
        );

        for (const matchedDoc of matches.docs) {
            if (matchedDoc.id === firestoreDocId && type === normalizedType) {
                continue;
            }
            await deleteDoc(doc(db, type, matchedDoc.id));
        }
    }
}

// @ts-ignore
export async function cancelBookingByDocId(bookingDocId) {
    if (!bookingDocId) {
        throw new Error('Missing booking document id.');
    }

    // @ts-ignore
    await deleteDoc(doc(db, 'boardingPasses', bookingDocId));
}