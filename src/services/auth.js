import { EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { fb, initFirebaseServices } from '../firebase/client.js';
import { fetchAllDataFromFirebase, startRealtimeSync, stopRealtimeSync } from '../firebase/realtime.js';
import { notify, OWNER_EMAIL, session } from '../store/store.js';
import { hydrateDataFromStorage, hydrateFullDataFromIndexedDB } from '../store/persistence.js';
import { correctMistakenBookingStatuses, enforceRequestedRoomSetup, purgeLegacySeedData } from '../store/migrations.js';
import { seedConsoleDefaults } from './settings.js';
import { fixBookingStatus, processCheckoutReminders } from './bookings.js';

let checkoutReminderTimer = null;
let bootstrapped = false;

// Runs once when the app loads (before login)
export function bootstrapApp() {
    if (bootstrapped) return;
    bootstrapped = true;
    initFirebaseServices();
    hydrateDataFromStorage();
    hydrateFullDataFromIndexedDB().then(found => { if (found) notify(); });
    correctMistakenBookingStatuses();
    purgeLegacySeedData();
    enforceRequestedRoomSetup();
    seedConsoleDefaults();
    // Admin console helper kept from the previous version
    window.fixBookingStatus = fixBookingStatus;
    notify();
}

export function getFirebaseLoginErrorMessage(error) {
    const code = error && error.code ? String(error.code) : '';
    switch (code) {
        case 'auth/invalid-credential':
            return 'Login failed: invalid credential. Check email/password and verify Email/Password sign-in is enabled in Firebase Console > Authentication > Sign-in method. Also confirm this app is using the same Firebase project where the user account exists.';
        case 'auth/user-not-found':
            return 'Login failed: this user does not exist in Firebase Authentication for the configured project.';
        case 'auth/wrong-password':
            return 'Login failed: password is incorrect.';
        case 'auth/invalid-email':
            return 'Login failed: email address format is invalid.';
        case 'auth/too-many-requests':
            return 'Login temporarily blocked due to too many attempts. Please wait and try again.';
        case 'auth/network-request-failed':
            return 'Login failed due to a network error. Check internet connection and try again.';
        default:
            return `Firebase login failed: ${error && error.message ? error.message : 'Unknown error'}`;
    }
}

function startCheckoutReminderService() {
    stopCheckoutReminderService();
    processCheckoutReminders();
    checkoutReminderTimer = setInterval(processCheckoutReminders, 60000);
}

function stopCheckoutReminderService() {
    if (checkoutReminderTimer) {
        clearInterval(checkoutReminderTimer);
        checkoutReminderTimer = null;
    }
}

/** @param onStage called with 'signing-in' then 'fetching' to update the button label */
export async function login(email, password, onStage) {
    if (!fb.enabled || !fb.auth) {
        alert('Realtime login requires Firebase Authentication. Please use your Firebase user credentials.');
        return false;
    }
    try {
        onStage?.('signing-in');
        await signInWithEmailAndPassword(fb.auth, email.trim().toLowerCase(), password);

        // Pull all cloud data first so an empty device is populated
        onStage?.('fetching');
        await fetchAllDataFromFirebase();

        const loggedInEmail = fb.auth.currentUser.email.toLowerCase();
        const isOwner = loggedInEmail === OWNER_EMAIL;
        session.loggedIn = true;
        session.role = isOwner ? 'owner' : 'receptionist';
        session.userName = isOwner ? 'Owner' : 'Receptionist';
        session.email = fb.auth.currentUser.email;

        startCheckoutReminderService();
        startRealtimeSync();
        notify();
        return true;
    } catch (error) {
        alert(getFirebaseLoginErrorMessage(error));
        return false;
    }
}

export async function logout() {
    if (!confirm('Are you sure you want to logout?')) return false;
    if (fb.enabled && fb.auth) {
        try {
            await signOut(fb.auth);
        } catch (error) {
            console.warn('Firebase sign out failed:', error);
        }
    }
    stopCheckoutReminderService();
    stopRealtimeSync();
    session.loggedIn = false;
    session.role = 'receptionist';
    session.userName = 'Receptionist';
    session.email = '';
    notify();
    return true;
}

export async function changePassword(currentPassword, newPassword, confirmNewPassword) {
    if (newPassword !== confirmNewPassword) {
        alert('New passwords do not match!');
        return false;
    }
    if (!fb.enabled || !fb.auth) {
        alert('Authentication service is unavailable.');
        return false;
    }
    const user = fb.auth.currentUser;
    if (!user) {
        alert('No user is currently signed in.');
        return false;
    }
    try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
        await updatePassword(user, newPassword);
        alert('Password updated successfully!');
        return true;
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('The current password you entered is incorrect.');
        } else if (error.code === 'auth/weak-password') {
            alert('The new password is too weak. Please use at least 6 characters.');
        } else {
            alert('Failed to update password: ' + error.message);
        }
        return false;
    }
}
