// @ts-nocheck
import { getAdminProfile, getCustomerProfile, getEmployeeProfile } from '../controller/StoreFirebaseInfo';

/**
 * Resolves app role for a signed-in Firebase user (admin → employee → customer).
 * Matches post-login routing order in Login.jsx.
 */
export async function resolveAppRole(user) {
    if (!user) {
        return { role: null, email: null, employeeProfile: null, customerProfile: null };
    }

    const email = user.email || '';

    const adminProfile = await getAdminProfile(user.uid, email);
    if (adminProfile) {
        return { role: 'admin', email, adminProfile, employeeProfile: null, customerProfile: null };
    }

    const employeeProfile = await getEmployeeProfile(user.uid, email);
    if (employeeProfile) {
        return { role: 'employee', email, adminProfile: null, employeeProfile, customerProfile: null };
    }

    const customerProfile = await getCustomerProfile(user.uid, email);
    if (customerProfile) {
        return { role: 'customer', email, adminProfile: null, employeeProfile: null, customerProfile };
    }

    return { role: 'unknown', email, adminProfile: null, employeeProfile: null, customerProfile: null };
}

export function deriveNamesFromCustomer(fullName, email) {
    const trimmedName = String(fullName || '').trim();
    if (trimmedName) {
        const nameParts = trimmedName.split(/\s+/).filter(Boolean);
        return {
            firstName: nameParts[0] || 'Guest',
            lastName: nameParts.slice(1).join(' ')
        };
    }

    const emailPrefix = String(email || '').split('@')[0].trim();
    if (emailPrefix) {
        return {
            firstName: emailPrefix,
            lastName: ''
        };
    }

    return {
        firstName: 'Guest',
        lastName: ''
    };
}
