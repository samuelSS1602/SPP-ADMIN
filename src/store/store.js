import { useSyncExternalStore } from 'react';

export const ROOM_TEMPLATE = [
    { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, emoji: '🧑' },
    { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' },
    { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦' }
];

export const DEFAULT_SETTINGS = {
    lodgeName: 'Sri Padmavati Pleasants',
    gstNumber: '33ANCPP8116B1ZF',
    taxes: { cgst: 2.5, sgst: 2.5 },
    roomCategories: ['Single', 'Double', 'Family', 'Suite'],
    backupSchedule: 'Weekly'
};

// The whole lodge dataset. Same shape as the cache in localStorage/IndexedDB and the
// documents in Firestore, so nothing already stored needs migrating.
export const data = {
    rooms: ROOM_TEMPLATE.map(room => ({ ...room, price: 2500, status: 'available' })),
    bookings: [],
    customers: [],
    guests: [],
    diary: {},
    staff: [],
    housekeepingTasks: [],
    notifications: [],
    settings: { ...DEFAULT_SETTINGS },
    auditLogs: []
};

export const OWNER_EMAIL = 'sppowner@gmail.com';

// Signed-in user
export const session = {
    loggedIn: false,
    role: 'receptionist',
    userName: 'Receptionist',
    email: ''
};

// --- change notification for React ---
let version = 0;
const listeners = new Set();

export function notify() {
    version += 1;
    listeners.forEach(listener => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getVersion() {
    return version;
}

// Re-renders the calling component whenever `data` or `session` changes; returns a change counter for memo deps.
export function useStoreVersion() {
    return useSyncExternalStore(subscribe, getVersion);
}

export function findBooking(bookingId) {
    return data.bookings.find(booking => booking.id === bookingId) || null;
}

export function findRoom(roomId) {
    return data.rooms.find(room => String(room.id) === String(roomId)) || null;
}
