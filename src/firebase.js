// @ts-nocheck
import {
    getFirestore
} from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

// Initialize Firebase
let app = null;
export let auth = { currentUser: null };
export let db = {};

if (hasFirebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.warn('Firebase config is missing. Firebase-backed features are disabled until REACT_APP_FIREBASE_* values are provided.');
}

export function getSecondaryAuth() {
    if (!hasFirebaseConfig) {
        return auth;
    }

    const secondaryName = 'secondary-auth';
    const secondaryApp = getApps().some((existingApp) => existingApp.name === secondaryName)
        ? getApp(secondaryName)
        : initializeApp(firebaseConfig, secondaryName);

    return getAuth(secondaryApp);
}

export function hasFirebaseConfiguration() {
    return hasFirebaseConfig;
}

export default app;
    
