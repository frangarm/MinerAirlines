// @ts-nocheck
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { findBestCustomerDoc } from './StoreFirebaseInfo';

function normalizePoints(customerData = {}) {
    const rawPoints = customerData.loyaltyPoints ?? customerData.miles ?? 0;
    const parsedPoints = Number(rawPoints);
    return Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0;
}

/**
 * Function that will fetch boarding pass information of a customer from firebase
 * @returns A customer's boarding passes
 */
export async function fetchBoardingPasses() {
    try {
        const signedInUser = auth.currentUser;
        if (!signedInUser) {
            return [];
        }

        const boardingPassCollection = collection(db, 'boardingPasses');
        let snapshot = await getDocs(
            query(
                boardingPassCollection,
                where('authUid', '==', signedInUser.uid)
            )
        );

        if (snapshot.empty && signedInUser.email) {
            snapshot = await getDocs(
                query(
                    boardingPassCollection,
                    where('customerEmail', '==', signedInUser.email)
                )
            );
        }

        return snapshot.docs
            .map((boardingPassDoc) => ({
                boardingPassId: boardingPassDoc.id,
                ...boardingPassDoc.data(),
            }))
            .sort((a, b) => {
                const aTime = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const bTime = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return aTime - bTime;
            });
    } catch (error) {
        console.error('Error fetching boarding passes:', error);
        return [];
    }
}

/**
 * Fetches one boarding pass by id and validates that it belongs to the signed-in user.
 * @param {string} boardingPassId
 * @returns {Promise<object>}
 */
export async function fetchBoardingPass(boardingPassId) {
    const signedInUser = auth.currentUser;
    if (!signedInUser) {
        throw new Error('Please sign in to view a boarding pass.');
    }

    const normalizedId = String(boardingPassId || '').trim();
    if (!normalizedId) {
        throw new Error('Missing boarding pass id.');
    }

    const directSnapshot = await getDoc(doc(db, 'boardingPasses', normalizedId));
    let boardingPassDoc = null;

    if (directSnapshot.exists()) {
        boardingPassDoc = {
            id: directSnapshot.id,
            data: () => directSnapshot.data() || {}
        };
    } else {
        const snapshot = await getDocs(
            query(
                collection(db, 'boardingPasses'),
                where('boardingPassId', '==', normalizedId),
                limit(1)
            )
        );

        if (snapshot.empty) {
            throw new Error('Boarding pass not found.');
        }

        boardingPassDoc = snapshot.docs[0];
    }

    const data = boardingPassDoc.data() || {};
    const ownedByAuthUid = data.authUid && data.authUid === signedInUser.uid;
    const ownedByEmail = data.customerEmail && signedInUser.email && data.customerEmail === signedInUser.email;

    if (!ownedByAuthUid && !ownedByEmail) {
        throw new Error('You do not have access to this boarding pass.');
    }

    return {
        boardingPassDocId: boardingPassDoc.id,
        ...data
    };
}
/**
 * Function that will fetch customer information from firebase
 * @return The customer information, such as first and last names, email, and user id
 */
export async function fetchBuyingCustomer(){
    const signedInUser = auth.currentUser;
        if (!signedInUser) {
          throw new Error('Please log in before booking seats.');
        }

        const customerData = await findBestCustomerDoc({
          authUid: signedInUser.uid,
          email: signedInUser.email || ''
        });

        if (!customerData) {
          throw new Error('Could not find your customer profile in the database.');
        }

        const firstName = customerData.firstName || '';
        const lastName = customerData.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || customerData.email || 'Guest';

        return {
                    customerDocId: customerData.customerDocId || customerData.docId || signedInUser.uid,
                    authUid: customerData.authUid || signedInUser.uid,
          userId: customerData.userId || '',
          email: customerData.email || '',
          firstName,
          lastName,
          fullName,
          loyaltyPoints: normalizePoints(customerData),
        };

    
}

/**
 * Fetches reward redemptions for the currently signed-in customer.
 * @returns {Promise<any[]>}
 */
export async function fetchRewardRedemptions() {
    try {
        const signedInUser = auth.currentUser;
        if (!signedInUser) {
            return [];
        }

        const redemptionsCollection = collection(db, 'rewardRedemptions');
        let snapshot = await getDocs(
            query(
                redemptionsCollection,
                where('authUid', '==', signedInUser.uid)
            )
        );

        if (snapshot.empty && signedInUser.email) {
            snapshot = await getDocs(
                query(
                    redemptionsCollection,
                    where('email', '==', signedInUser.email)
                )
            );
        }

        return snapshot.docs
            .map((redemptionDoc) => ({
                redemptionDocId: redemptionDoc.id,
                ...redemptionDoc.data(),
            }))
            .sort((a, b) => {
                const aTime = typeof a.redeemedAt?.toDate === 'function' ? a.redeemedAt.toDate().getTime() : new Date(a.redeemedAt || 0).getTime();
                const bTime = typeof b.redeemedAt?.toDate === 'function' ? b.redeemedAt.toDate().getTime() : new Date(b.redeemedAt || 0).getTime();
                return bTime - aTime;
            });
    } catch (error) {
        console.error('Error fetching reward redemptions:', error);
        return [];
    }
}
 
