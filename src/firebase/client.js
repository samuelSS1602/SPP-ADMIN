import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project as before — all existing bookings, photos, rooms, diary and audit logs are read from here.
export const firebaseConfig = {
    apiKey: 'AIzaSyD1d53LVXEVRscJl5dWS8LDoPi7s6x2C1I',
    authDomain: 'adminlodge.firebaseapp.com',
    projectId: 'adminlodge',
    storageBucket: 'adminlodge.firebasestorage.app',
    messagingSenderId: '420131634685',
    appId: '1:420131634685:web:978017c2cfa6f833432d94',
    measurementId: 'G-J41F52DYHD'
};

export const fb = {
    enabled: false,
    auth: null,
    db: null
};

export function initFirebaseServices() {
    if (fb.enabled) return;
    if (!firebaseConfig.apiKey) {
        console.info('Firebase config not provided. Running in local mode.');
        return;
    }
    try {
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        fb.auth = getAuth(app);
        fb.db = getFirestore(app);
        fb.enabled = true;
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        fb.enabled = false;
    }
}

export function isCloudReady() {
    return fb.enabled && Boolean(fb.db);
}
