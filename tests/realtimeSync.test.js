const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Runs js/firebase/firebase-realtime.js against fake Firestore snapshots.
const deletedPhotos = [];
const stored = {};
const context = {
    console: { warn() {}, log() {} },
    setTimeout, clearTimeout,
    localStorage: { setItem: (key, value) => { stored[key] = value; } },
    window: { deleteBooking: async () => {}, renumberAllBookings: async () => {} },
    data: { bookings: [], guests: [], rooms: [{ id: 101, status: 'available', price: 2500 }], auditLogs: [], diary: {}, customers: [] },
    deletePhotoFromLocal: id => { deletedPhotos.push(id); return Promise.resolve(); },
    stripPhotoDataForLocalCache: booking => ({ ...booking, customerPhoto: undefined }),
    getLocalISODate: () => '2026-09-30',
    updateRoomStatusesFromBookings: () => {},
    upsertGuestRecord(name, phone) { context.data.guests.push({ name, phone }); }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'firebase', 'firebase-realtime.js'), 'utf8'), context);
context.scheduleRealtimeRefresh = () => {}; // page re-rendering needs the browser

const snapshot = docs => ({ forEach: fn => docs.forEach(doc => fn({ data: () => doc })) });

context.data.bookings = [
    { id: 'BK001', guestName: 'ANU', createdAt: 'a', customerPhoto: 'data:image/jpeg;base64,AAA' },
    { id: 'BK002', guestName: 'RAVI', createdAt: 'b', customerPhoto: 'data:image/jpeg;base64,BBB' },
    { id: 'BK009', guestName: 'LOCAL ONLY', createdAt: 'z' }
];

// Another device deleted BK001 and renumbered RAVI to BK001; a new stay now uses BK002.
context.applyCloudBookings(snapshot([
    { id: 'BK010', guestName: 'MEENA', createdAt: 'x', guestPhone: '1' },
    { id: 'BK002', guestName: 'KUMAR', createdAt: 'c', guestPhone: '2' },
    { id: 'BK001', guestName: 'RAVI', createdAt: 'b', guestPhone: '3' }
]));

const ids = context.data.bookings.map(booking => booking.id);
assert.strictEqual(ids.join(','), 'BK001,BK002,BK010', 'Cloud list replaces local list, sorted by booking number');
assert.strictEqual(context.data.bookings[0].customerPhoto, undefined, 'A photo must not follow an id that now belongs to another guest');
assert.ok(deletedPhotos.includes('BK001') && deletedPhotos.includes('BK002'), 'Cached photos for reused ids are cleared');
assert.ok(stored.lodgeAdminLocalOnlyBookings.includes('LOCAL ONLY'), 'Browser-only bookings are kept aside, not lost');
assert.strictEqual(context.data.guests.length, 3, 'Guest list is rebuilt from the cloud bookings');

// Same stay keeps this browser's photo.
context.data.bookings[2].customerPhoto = 'data:image/jpeg;base64,MMM';
context.applyCloudBookings(snapshot([{ id: 'BK010', guestName: 'MEENA', createdAt: 'x', status: 'completed' }]));
assert.strictEqual(context.data.bookings[0].customerPhoto, 'data:image/jpeg;base64,MMM', 'Photo is kept when the stay is unchanged');
assert.strictEqual(context.data.bookings[0].status, 'completed', 'Cloud fields win');

// Room changes from the cloud apply only to rooms that changed.
context.handleRoomsSnapshot({ docChanges: () => [{ type: 'modified', doc: { id: '101', data: () => ({ id: 101, status: 'cleaning', price: 3000 }) } }] });
assert.strictEqual(context.data.rooms[0].status, 'cleaning');
assert.strictEqual(context.data.rooms[0].price, 3000);

console.log('realtimeSync tests passed');
