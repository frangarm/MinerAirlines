import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';


export async function addManagerEmployee(managerUid, employee) {
    if (!managerUid) throw new Error('Manager UID is required');

    const employeesRef = collection(db, 'customer', managerUid, 'employees');

    const payload = {
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        employeeNumber: employee.employeeNumber || '',
        costCenter: employee.costCenter || '',
        active: true,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(employeesRef, payload);
    return docRef.id;
}


export async function getManagerEmployees(managerUid) {
    if (!managerUid) return [];

    const employeesRef = collection(db, 'customer', managerUid, 'employees');
    const snapshot = await getDocs(employeesRef);

    return snapshot.docs.map(doc => ({
        employeeId: doc.id,
        ...doc.data()
    }));
}


export async function updateManagerEmployee(managerUid, employeeId, updates) {
    if (!managerUid || !employeeId) {
        throw new Error('Manager UID and employee ID are required');
    }

    const ref = doc(db, 'customer', managerUid, 'employees', employeeId);
    await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

//labels employee as deactive, cannot be booked for
export async function deactivateManagerEmployee(managerUid, employeeId) {
    return updateManagerEmployee(managerUid, employeeId, { active: false });
}


export async function deleteManagerEmployee(managerUid, employeeId) {
    const ref = doc(db, 'customer', managerUid, 'employees', employeeId);
    await deleteDoc(ref);
}
