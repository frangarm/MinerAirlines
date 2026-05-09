// @ts-ignore
import { auth, db } from '../firebase';
// @ts-ignore
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';

// @ts-ignore
export async function getCustomerProfile(authUid, email) {
    return getCustomerDocByAuthUid(authUid, email);
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

/**
 * 
 * @param {string} authUid 
 * @param {string} email 
 * @returns 
 */
export async function getCustomerDocByAuthUid(authUid, email = '') {
    const customer = await getFirstDocByQueries('customer', [
        { field: 'authUid', value: authUid },
        { field: 'email', value: email }
    ]);

    if (!customer) {
        return null;
    }

    return {
        customerDocId: customer.docId,
        ...customer
    };
}

/**
 * 
 * @param {string} collectionName 
 * @param {Array<{field: string, value: *}>} constraints 
 * @returns 
 */
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
