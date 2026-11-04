// Live data vs. the test sandbox.
//
// The testing login (TESTER_EMAILS) works on a separate copy of every collection under
// `sandbox/test/...`, and the owner can switch to it to look at the testers' bookings. Test
// bookings never touch live rooms, booking numbers or reports. The browser caches are kept
// apart the same way, so one computer can be used for both without mixing them.
// Firestore rules (firestore.rules) enforce the same split on the server.

export const TESTER_EMAILS = ['spp1@gmail.com'];

const SANDBOX_ROOT = 'sandbox/test/';

// Every collection the console stores in the sandbox (used by "Reset test data").
export const SANDBOX_COLLECTIONS = ['bookings', 'booking_photos', 'rooms', 'diaryReminder', 'audit_logs', 'customers'];

export const dataScope = {
    test: false
};

export function isTesterEmail(email) {
    return TESTER_EMAILS.includes(String(email || '').trim().toLowerCase());
}

export function setTestScope(test) {
    dataScope.test = Boolean(test);
}

/** Firestore collection path for the current scope, e.g. 'bookings' or 'sandbox/test/bookings'. */
export function cloudPath(collectionName) {
    return dataScope.test ? SANDBOX_ROOT + collectionName : collectionName;
}

/** Browser cache key for the current scope. */
export function localKey(key) {
    return dataScope.test ? `${key}:test` : key;
}
