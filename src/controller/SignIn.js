import { browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../firebase";

/**
 * @type {Promise<void> | undefined}
 */
/** @type {Promise<void> | undefined} */
let persistencePromise;

/**
 * Ensures auth persistence is configured once and reused.
 * @returns {Promise<void>}
 */
export function ensureAuthPersistence() {
    if (!persistencePromise) {
        // @ts-ignore
        persistencePromise = setPersistence(auth, browserSessionPersistence)
            .then(() => undefined)
            .catch((error) => {
                persistencePromise = undefined;
                throw error;
            });
    }

    return persistencePromise;
}

/**
 * Will sign in a user with the given email and password, and set the persistence to session-based. Uses Firebase Authentication to handle the sign-in process.
 * @param {string} email The email of the user trying to sign in
 * @param {string} password The password of the user trying to sign in
 * @returns A promise that resolves with the user credentials if the sign-in is successful, or rejects with an error if it fails
 */
export function signIn(email, password){
    return ensureAuthPersistence()
        // @ts-ignore
        .then(() => signInWithEmailAndPassword(auth, email, password));
}

/**
 * Optional auth-state observer. Returns unsubscribe function.
 * @param {(user: import('firebase/auth').User | null) => void} callback A callback function that will be called whenever the authentication state changes, with the current user (or null if signed out) as an argument
 * @returns A function that can be called to unsubscribe from the auth state changes
 */
export function observeAuthState(callback) {
    // @ts-ignore
    return onAuthStateChanged(auth, callback);
}

/**
 * Returns the currently signed-in auth user, if any.
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentAuthUser() {
    return auth.currentUser;
}

/**
 * Will sign out the currently signed-in user by calling the signOut method from Firebase Authentication, which will end the user's session and update the authentication state accordingly.
 * @returns  A promise that resolves when the sign-out process is complete, or rejects with an error if it fails
 */
export function signOut() {
    // @ts-ignore
    return auth.signOut();
}