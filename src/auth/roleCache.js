// @ts-nocheck
const CACHE_KEY = 'maRoleCache';

export function readCachedRole(uid) {
    if (!uid) return null;
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.uid !== uid) return null;
        const role = parsed?.role;
        if (role === 'admin' || role === 'employee' || role === 'customer' || role === 'unknown') {
            return role;
        }
        return null;
    } catch {
        return null;
    }
}

export function writeCachedRole(uid, role) {
    if (!uid || !role) return;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ uid, role }));
    } catch {
        /* ignore quota / private mode */
    }
}

export function clearCachedRole() {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        /* ignore */
    }
}
