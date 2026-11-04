// --- LIVE CLOUD SYNC ---
// Keeps this browser in step with the cloud (and the mobile app) while signed in.
// Firestore listeners push every change made elsewhere straight into `data` and re-render.
// The cloud is the source of truth for bookings, audit logs and customers.
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { toISODateFromDate } from '../lib/format.js';
import { fb, isCloudReady } from './client.js';
import { cloudPath } from './dataScope.js';
import { applyDiaryChanges, applyRoomChanges, mergeCloudBookings } from './merge.js';
import { data } from '../store/store.js';
import { commit, keepLocalOnlyBookingsAside } from '../store/persistence.js';
import { deletePhotoFromLocal } from '../store/indexedDb.js';
import { updateRoomStatusesFromBookings } from '../store/migrations.js';
import { rebuildGuestsFromBookings } from '../services/guests.js';

let realtimeUnsubscribers = [];
let realtimeSyncPaused = false;
let realtimeSeenFirstBookings = false;
let pendingBookingsDocs = null;
let pendingSnapshotTimer = null;
let realtimeRefreshTimer = null;

function snapshotDocs(snapshot) {
    return snapshot.docs.map(item => item.data());
}

function snapshotChanges(snapshot) {
    return snapshot.docChanges().map(change => ({ type: change.type, id: change.doc.id, data: change.doc.data() }));
}

function applyCloudBookings(cloudBookings) {
    const { bookings, localOnly, reusedIds } = mergeCloudBookings(data.bookings, cloudBookings);
    reusedIds.forEach(id => deletePhotoFromLocal(id).catch(() => {}));

    // Bookings that only ever existed in this browser are kept aside instead of silently disappearing.
    if (!realtimeSeenFirstBookings) {
        if (localOnly.length) {
            keepLocalOnlyBookingsAside(localOnly);
            console.warn(`${localOnly.length} booking(s) existed only in this browser and were not in the cloud. Copies are in localStorage "lodgeAdminLocalOnlyBookings".`);
        }
        realtimeSeenFirstBookings = true;
    }

    data.bookings = bookings;
    rebuildGuestsFromBookings();
    updateRoomStatusesFromBookings();
}

function scheduleRealtimeRefresh() {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(commit, 150);
}

function handleBookingsSnapshot(snapshot) {
    const docs = snapshotDocs(snapshot);
    if (realtimeSyncPaused) {
        // A delete/renumber is running in this browser; apply the newest state once it finishes.
        pendingBookingsDocs = docs;
        return;
    }
    pendingBookingsDocs = null;
    clearTimeout(pendingSnapshotTimer);
    applyCloudBookings(docs);
    scheduleRealtimeRefresh();
}

function handleRoomsSnapshot(snapshot) {
    applyRoomChanges(data.rooms, snapshotChanges(snapshot));
    updateRoomStatusesFromBookings();
    scheduleRealtimeRefresh();
}

function handleAuditSnapshot(snapshot) {
    data.auditLogs = snapshotDocs(snapshot)
        .filter(log => log.id)
        .sort((first, second) => new Date(second.time || 0) - new Date(first.time || 0));
    scheduleRealtimeRefresh();
}

function handleDiarySnapshot(snapshot) {
    if (!data.diary) data.diary = {};
    applyDiaryChanges(data.diary, snapshotChanges(snapshot));
    scheduleRealtimeRefresh();
}

function handleCustomersSnapshot(snapshot) {
    data.customers = snapshotDocs(snapshot).filter(customer => customer.id);
    scheduleRealtimeRefresh();
}

// Every document a listener returns counts against Firestore's free 50,000 reads a day, and every
// login starts the listeners again, so the ever-growing collections are narrowed to what is shown.
const AUDIT_LOG_LIMIT = 200;
const DIARY_DAYS_BACK = 90;

/**
 * Starts the live listeners. The returned promise resolves once every collection has been read
 * from the server (or after 30 s, e.g. offline), so sign-in can wait for complete data. The
 * listeners' first answer is the initial load; there is no separate fetch reading everything twice.
 */
export function startRealtimeSync() {
    stopRealtimeSync();
    if (!isCloudReady()) return Promise.resolve();
    const listen = (name, handler, constraints = []) => new Promise(resolve => {
        const ref = collection(fb.db, cloudPath(name));
        let applied = false;
        realtimeUnsubscribers.push(onSnapshot(constraints.length ? query(ref, ...constraints) : ref, { includeMetadataChanges: true }, snapshot => {
            // Skip events where only the sync state changed; the documents are the same as last time.
            if (!applied || snapshot.docChanges().length) {
                applied = true;
                handler(snapshot);
            }
            if (!snapshot.metadata.fromCache) resolve();
        }, error => {
            console.warn(`Live sync for ${name} stopped:`, error);
            resolve();
        }));
    });
    const diaryFrom = toISODateFromDate(new Date(Date.now() - DIARY_DAYS_BACK * 24 * 60 * 60 * 1000));
    const ready = Promise.all([
        listen('bookings', handleBookingsSnapshot),
        listen('rooms', handleRoomsSnapshot),
        listen('audit_logs', handleAuditSnapshot, [orderBy('time', 'desc'), limit(AUDIT_LOG_LIMIT)]),
        listen('diaryReminder', handleDiarySnapshot, [where('date', '>=', diaryFrom)]),
        listen('customers', handleCustomersSnapshot)
    ]);
    return Promise.race([ready, new Promise(resolve => setTimeout(resolve, 30000))]);
}

export function stopRealtimeSync() {
    realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
    realtimeUnsubscribers = [];
    realtimeSeenFirstBookings = false;
    pendingBookingsDocs = null;
    clearTimeout(pendingSnapshotTimer);
    clearTimeout(realtimeRefreshTimer);
}

// Deleting or renumbering rewrites many booking ids one by one; pause live updates until it finishes.
export function runWithRealtimePaused(action) {
    return async function (...args) {
        realtimeSyncPaused = true;
        try {
            return await action.apply(this, args);
        } finally {
            realtimeSyncPaused = false;
            // Give the final writes a moment to arrive as a fresh snapshot; otherwise apply the last one seen.
            pendingSnapshotTimer = setTimeout(() => {
                if (pendingBookingsDocs) {
                    const docs = pendingBookingsDocs;
                    pendingBookingsDocs = null;
                    applyCloudBookings(docs);
                    scheduleRealtimeRefresh();
                }
            }, 1500);
        }
    };
}
