// --- LIVE CLOUD SYNC ---
// Keeps this browser in step with the cloud (and the mobile app) while signed in.
// Firestore listeners push every change made elsewhere straight into `data` and re-render.
// The cloud is the source of truth for bookings, audit logs and customers.
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { fb, isCloudReady } from './client.js';
import { applyDiaryChanges, applyRoomChanges, mergeCloudBookings } from './merge.js';
import { data } from '../store/store.js';
import { commit, keepLocalOnlyBookingsAside, saveDataToStorage } from '../store/persistence.js';
import { deletePhotoFromLocal } from '../store/indexedDb.js';
import { correctMistakenBookingStatuses, updateRoomStatusesFromBookings } from '../store/migrations.js';
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

export function startRealtimeSync() {
    stopRealtimeSync();
    if (!isCloudReady()) return;
    const listen = (name, handler) => {
        realtimeUnsubscribers.push(onSnapshot(collection(fb.db, name), handler, error => {
            console.warn(`Live sync for ${name} stopped:`, error);
        }));
    };
    listen('bookings', handleBookingsSnapshot);
    listen('rooms', handleRoomsSnapshot);
    listen('audit_logs', handleAuditSnapshot);
    listen('diaryReminder', handleDiarySnapshot);
    listen('customers', handleCustomersSnapshot);
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

// One-off pull on sign-in so an empty device is populated before the dashboard shows
export async function fetchAllDataFromFirebase() {
    if (!isCloudReady()) return;
    try {
        console.log('Fetching cloud data...');
        const getAll = async name => (await getDocs(collection(fb.db, name))).docs;

        // Customers (cloud overrides local)
        (await getAll('customers')).map(d => d.data()).filter(c => c.id).forEach(fc => {
            const idx = data.customers.findIndex(c => c.id === fc.id);
            if (idx === -1) data.customers.push(fc);
            else data.customers[idx] = { ...data.customers[idx], ...fc };
        });

        // Bookings (cloud overrides local)
        (await getAll('bookings')).map(d => d.data()).filter(b => b.id).forEach(fbk => {
            const idx = data.bookings.findIndex(b => b.id === fbk.id);
            if (idx === -1) data.bookings.push(fbk);
            else data.bookings[idx] = { ...data.bookings[idx], ...fbk };
        });

        (await getAll('rooms')).forEach(d => {
            const cloudRoom = d.data();
            const room = data.rooms.find(item => String(item.id) === String(cloudRoom.id || d.id));
            if (room) Object.assign(room, cloudRoom);
        });

        const auditById = new Map((data.auditLogs || []).map(log => [log.id, log]));
        (await getAll('audit_logs')).forEach(d => {
            const cloudLog = d.data();
            if (cloudLog.id) auditById.set(cloudLog.id, cloudLog);
        });
        data.auditLogs = [...auditById.values()];

        correctMistakenBookingStatuses();
        updateRoomStatusesFromBookings();

        // Room diary reminders
        if (!data.diary) data.diary = {};
        (await getAll('diaryReminder')).forEach(d => {
            const entry = d.data();
            if (entry.date && entry.roomId) {
                if (!data.diary[entry.date]) data.diary[entry.date] = {};
                data.diary[entry.date][entry.roomId] = entry.guestName;
            }
        });

        rebuildGuestsFromBookings();
        saveDataToStorage();
        console.log('Cloud sync complete!');
    } catch (error) {
        console.error('Could not fetch remote data:', error);
    }
}
