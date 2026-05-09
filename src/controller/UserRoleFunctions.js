import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

/**
 * Checks whether a signed-in auth user is an admin in Firestore.
 * @param {string} uid
 * @param {string | null | undefined} userEmail
 * @returns {Promise<boolean>}
 */
export async function isAdminUser(uid, userEmail) {
    // @ts-ignore
    const adminCollection = collection(db, 'admin');
    const lookups = [
        getDocs(
            query(
                adminCollection,
                where('authUid', '==', uid),
                limit(1)
            )
        )
    ];

    if (userEmail) {
        lookups.push(
            getDocs(
                query(
                    adminCollection,
                    where('email', '==', userEmail),
                    limit(1)
                )
            )
        );
    }

    const snapshots = await Promise.all(lookups);
    return snapshots.some((snapshot) => !snapshot.empty);
}

/**
 * Checks whether the currently signed-in user is an admin.
 * Keeps Firebase auth access in controller layer, not page components.
 * @returns {Promise<boolean>}
 */
export async function isCurrentUserAdmin() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return false;
    }

    // @ts-ignore
    return isAdminUser(currentUser.uid, currentUser.email);
}

/**
 * Gets customer's first and last names for a signed-in auth user
 * @param {string} uid
 * @returns {Promise<{firstName: string, lastName: string}>}
 */
export async function getCustomerNameByAuthUid(uid) {
    const customerByUidQuery = query(
        // @ts-ignore
        collection(db, 'customer'),
        where('authUid', '==', uid),
        limit(1)
    );
    const customerByUidSnapshot = await getDocs(customerByUidQuery);

    if (customerByUidSnapshot.empty) {
        return { firstName: 'Guest', lastName: '' };
    }

    const customerData = customerByUidSnapshot.docs[0].data();
    return {
        firstName: customerData?.firstName || 'Guest',
        lastName: customerData?.lastName || ''
    };
}
