
// --- LIVE CLOUD SYNC ---
// Keeps this browser in step with the cloud (and the mobile app) while signed in.
// Firestore listeners push every change made elsewhere straight into `data` and re-render
// the open page. The cloud is the source of truth for bookings, audit logs and customers.

let realtimeUnsubscribers = [];
let realtimeSyncPaused = false;
let realtimeSeenFirstBookings = false;
let pendingBookingsSnapshot = null;
let pendingSnapshotTimer = null;
let realtimeRefreshTimer = null;

const LOCAL_PHOTO_FIELDS = ['customerPhoto', 'idProofPhoto', 'customerPhotoUrl', 'idProofPhotoUrl'];

function bookingSortNumber(id) {
    const number = parseInt(String(id || '').replace(/\D/g, ''), 10);
    return Number.isNaN(number) ? 0 : number;
}

// Same guest and stay? Booking ids are reused after a renumber, so an id alone is not enough.
function isSameStay(first, second) {
    return String(first.guestName || '') === String(second.guestName || '') &&
        String(first.createdAt || first.checkIn || '') === String(second.createdAt || second.checkIn || '');
}

function applyCloudBookings(snapshot) {
    const localById = new Map(data.bookings.map(booking => [String(booking.id), booking]));
    const cloudIds = new Set();
    const next = [];

    snapshot.forEach(doc => {
        const cloud = doc.data();
        if (!cloud.id) return;
        const id = String(cloud.id);
        cloudIds.add(id);
        const merged = { ...cloud };
        const local = localById.get(id);
        if (local && isSameStay(local, cloud)) {
            // Photos are kept in booking_photos, not in the booking document; keep this browser's copy.
            LOCAL_PHOTO_FIELDS.forEach(key => {
                if (local[key] && merged[key] === undefined) merged[key] = local[key];
            });
        } else if (local) {
            // This id now belongs to a different stay (renumbered on another device): drop its cached photos.
            deletePhotoFromLocal(id).catch(() => {});
        }
        next.push(merged);
    });

    // Bookings that only ever existed in this browser are kept aside instead of silently disappearing.
    if (!realtimeSeenFirstBookings) {
        const localOnly = data.bookings.filter(booking => booking.id && !cloudIds.has(String(booking.id)));
        if (localOnly.length) {
            try {
                localStorage.setItem('lodgeAdminLocalOnlyBookings', JSON.stringify(localOnly.map(stripPhotoDataForLocalCache)));
            } catch (error) {
                console.warn('Could not keep local-only bookings:', error);
            }
            console.warn(`${localOnly.length} booking(s) existed only in this browser and were not in the cloud. Copies are in localStorage "lodgeAdminLocalOnlyBookings".`);
        }
        realtimeSeenFirstBookings = true;
    }

    next.sort((first, second) => bookingSortNumber(first.id) - bookingSortNumber(second.id) || String(first.id).localeCompare(String(second.id)));
    data.bookings = next;

    data.guests = [];
    data.bookings.forEach(booking => {
        if (booking.guestName && (booking.guestPhone || booking.guestEmail)) {
            upsertGuestRecord(
                booking.guestName,
                booking.guestPhone || 'N/A',
                booking.guestEmail || '',
                booking.checkOut || booking.checkIn || getLocalISODate(),
                booking.id
            );
        }
    });
    updateRoomStatusesFromBookings();
}

function handleBookingsSnapshot(snapshot) {
    if (realtimeSyncPaused) {
        // A delete/renumber is running in this browser; apply the newest state once it finishes.
        pendingBookingsSnapshot = snapshot;
        return;
    }
    pendingBookingsSnapshot = null;
    clearTimeout(pendingSnapshotTimer);
    applyCloudBookings(snapshot);
    scheduleRealtimeRefresh();
}

function handleRoomsSnapshot(snapshot) {
    // Only rooms changed in the cloud are applied, so local check-out updates are not overwritten.
    snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        const cloudRoom = change.doc.data();
        const room = data.rooms.find(item => String(item.id) === String(cloudRoom.id || change.doc.id));
        if (!room) return;
        if (cloudRoom.price !== undefined) room.price = Number(cloudRoom.price) || room.price;
        if (cloudRoom.status) room.status = cloudRoom.status;
    });
    updateRoomStatusesFromBookings();
    scheduleRealtimeRefresh();
}

function handleAuditSnapshot(snapshot) {
    const logs = [];
    snapshot.forEach(doc => {
        const log = doc.data();
        if (log.id) logs.push(log);
    });
    data.auditLogs = logs.sort((first, second) => new Date(second.time || 0) - new Date(first.time || 0));
    scheduleRealtimeRefresh();
}

function handleDiarySnapshot(snapshot) {
    if (!data.diary) data.diary = {};
    snapshot.docChanges().forEach(change => {
        const entry = change.doc.data();
        if (!entry.date || !entry.roomId) return;
        if (change.type === 'removed') {
            if (data.diary[entry.date]) delete data.diary[entry.date][entry.roomId];
            return;
        }
        if (!data.diary[entry.date]) data.diary[entry.date] = {};
        data.diary[entry.date][entry.roomId] = entry.guestName;
    });
    scheduleRealtimeRefresh();
}

function handleCustomersSnapshot(snapshot) {
    const customers = [];
    snapshot.forEach(doc => {
        const customer = doc.data();
        if (customer.id) customers.push(customer);
    });
    data.customers = customers;
    scheduleRealtimeRefresh();
}

// Refills the diary inputs without touching the one being typed in.
function refreshDiaryInputs() {
    const dateInput = document.getElementById('diaryDate');
    if (!dateInput || !dateInput.value || !isPageVisible('diary')) return;
    const entries = (data.diary && data.diary[dateInput.value]) || {};
    document.querySelectorAll('.diary-room-item input').forEach(input => {
        if (input === document.activeElement) return;
        const roomId = input.id.replace('diary-', '');
        input.value = entries[roomId] || '';
    });
}

function scheduleRealtimeRefresh() {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
        saveDataToStorage();
        loadBookings();
        loadRooms();
        loadGuests();
        loadPayments();
        updateRealtimeDashboardMetrics();
        renderAuditLogs();
        if (isPageVisible('audit-logs-tab')) filterAuditLogs();
        if (isPageVisible('pricing')) loadPricingPage();
        refreshDiaryInputs();
        if (charts.occupancy) createOccupancyChart();
        if (charts.revenue) createRevenueChart();
    }, 150);
}

function startRealtimeSync() {
    stopRealtimeSync();
    if (!firebaseEnabled || !firebaseDb) return;

    const listen = (collection, handler) => {
        realtimeUnsubscribers.push(firebaseDb.collection(collection).onSnapshot(handler, error => {
            console.warn(`Live sync for ${collection} stopped:`, error);
        }));
    };
    listen('bookings', handleBookingsSnapshot);
    listen('rooms', handleRoomsSnapshot);
    listen('audit_logs', handleAuditSnapshot);
    listen('diaryReminder', handleDiarySnapshot);
    listen('customers', handleCustomersSnapshot);
}

function stopRealtimeSync() {
    realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
    realtimeUnsubscribers = [];
    realtimeSeenFirstBookings = false;
    pendingBookingsSnapshot = null;
    clearTimeout(pendingSnapshotTimer);
    clearTimeout(realtimeRefreshTimer);
}

// Deleting or renumbering rewrites many booking ids one by one; pause live updates until it finishes.
function runWithRealtimePaused(action) {
    return async function (...args) {
        realtimeSyncPaused = true;
        try {
            return await action.apply(this, args);
        } finally {
            realtimeSyncPaused = false;
            // Give the final writes a moment to arrive as a fresh snapshot; otherwise apply the last one seen.
            pendingSnapshotTimer = setTimeout(() => {
                if (pendingBookingsSnapshot) {
                    const snapshot = pendingBookingsSnapshot;
                    pendingBookingsSnapshot = null;
                    applyCloudBookings(snapshot);
                    scheduleRealtimeRefresh();
                }
            }, 1500);
        }
    };
}

window.deleteBooking = runWithRealtimePaused(window.deleteBooking);
window.renumberAllBookings = runWithRealtimePaused(window.renumberAllBookings);
