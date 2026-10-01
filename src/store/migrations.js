import { data, ROOM_TEMPLATE } from './store.js';
import { saveDataToStorage } from './persistence.js';
import { ACTIVE_STATUSES, getBookingRoomIds } from '../lib/bookingCalc.js';
import { getCurrentTimeValue, getLocalISODate, toDisplayTime } from '../lib/format.js';
import { syncBookingToFirebase } from '../firebase/sync.js';

// Rooms with an active booking are occupied; an "occupied" room with no booking becomes available again.
export function updateRoomStatusesFromBookings() {
    if (!data.rooms || !data.bookings) return;
    const occupiedRoomIds = new Set();
    data.bookings
        .filter(b => ACTIVE_STATUSES.includes(b.status))
        .forEach(booking => getBookingRoomIds(booking).forEach(id => occupiedRoomIds.add(id)));

    data.rooms.forEach(room => {
        if (occupiedRoomIds.has(room.id)) {
            room.status = 'occupied';
        } else if (room.status === 'occupied') {
            room.status = 'available';
        }
    });
}

// BK243 was cancelled by mistake; it is a completed stay.
export function correctMistakenBookingStatuses() {
    const booking = data.bookings.find(item => String(item.id || '').toUpperCase() === 'BK243');
    if (!booking || String(booking.status || '').toLowerCase() !== 'cancelled') return false;

    booking.status = 'completed';
    if (!booking.actualCheckOutDate) booking.actualCheckOutDate = getLocalISODate();
    if (!booking.actualCheckOutTime) booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    saveDataToStorage();
    syncBookingToFirebase(booking);
    return true;
}

// Removes the demo records shipped with early versions
export function purgeLegacySeedData() {
    const legacyBookingIds = new Set(['BK001', 'BK002', 'BK003', 'BK004', 'BK005', 'BK006']);
    const legacyCustomerIds = new Set(['CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005', 'CUST006']);
    const hasLegacyBookings = data.bookings.some(booking => legacyBookingIds.has(String(booking.id || '').toUpperCase()));
    const hasLegacyCustomers = data.customers.some(customer => legacyCustomerIds.has(String(customer.id || '').toUpperCase()));
    if (!hasLegacyBookings && !hasLegacyCustomers) return;

    data.bookings = [];
    data.customers = [];
    data.guests = [];
    data.rooms = data.rooms.map(room => ({ ...room, status: 'available' }));
    saveDataToStorage();
}

const ROOM_ID_TO_NAME = { 101: 'F1-102', 102: 'F1-103', 103: 'F1-104', 104: 'F1-105', 105: 'F1-101', 201: 'F2-201', 202: 'F2-202', 203: 'F2-203', 204: 'F2-204' };
const LEGACY_ROOM_NAMES = [
    ['floor1-101', 'F1-102'], ['floor1-102', 'F1-103'], ['floor1-103', 'F1-104'], ['floor1-104', 'F1-105'], ['floor1-105', 'F1-101'],
    ['floor2-201', 'F2-201'], ['floor2-202', 'F2-202'], ['floor2-203', 'F2-203'], ['floor2-204', 'F2-204'],
    ['F1-R1', 'F1-102'], ['F1-R2', 'F1-103'], ['F1-R3', 'F1-104'], ['F1-R4', 'F1-105'], ['F1-R5', 'F1-101'],
    ['F2-R1', 'F2-201'], ['F2-R2', 'F2-202'], ['F2-R3', 'F2-203'], ['F2-R4', 'F2-204']
];

// Keeps the nine configured rooms (prices/status preserved) and fixes legacy room names
export function enforceRequestedRoomSetup() {
    const existingRoomById = new Map(data.rooms.map(room => [room.id, room]));
    data.rooms = ROOM_TEMPLATE.map(template => {
        const existing = existingRoomById.get(template.id);
        return {
            id: template.id,
            name: template.name,
            floor: template.floor,
            type: template.type,
            capacity: template.capacity,
            price: existing?.price || 2500,
            status: existing?.status || 'available',
            emoji: template.emoji
        };
    });

    const activeRoomIds = new Set();
    data.bookings
        .filter(booking => booking.status !== 'completed')
        .forEach(booking => {
            if (booking.rooms && Array.isArray(booking.rooms)) {
                booking.rooms.forEach(room => activeRoomIds.add(parseInt(room.roomId, 10)));
            } else if (booking.roomId) {
                activeRoomIds.add(parseInt(booking.roomId, 10));
            }
        });

    // Rooms on an active booking are occupied; otherwise manual statuses stick
    data.rooms = data.rooms.map(room => (activeRoomIds.has(parseInt(room.id, 10)) ? { ...room, status: 'occupied' } : room));

    data.bookings.forEach(booking => {
        if ([201, 202, 203, 204].includes(booking.roomId)) booking.floor = 2;
        const mappedName = ROOM_ID_TO_NAME[booking.roomId];
        if (mappedName) booking.roomName = mappedName;
    });

    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            if (typeof historyItem.room !== 'string') return;
            LEGACY_ROOM_NAMES.forEach(([from, to]) => { historyItem.room = historyItem.room.replace(from, to); });
        });
    });

    saveDataToStorage();
}
