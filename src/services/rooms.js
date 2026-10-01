import { data, findRoom, session } from '../store/store.js';
import { commit, saveDataToStorage } from '../store/persistence.js';
import { syncRoomToFirebase } from '../firebase/sync.js';
import { ACTIVE_STATUSES } from '../lib/bookingCalc.js';
import { formatNumber } from '../lib/format.js';
import { addAuditLog } from './audit.js';

export function getActiveBookingForRoom(roomId) {
    const numericRoomId = parseInt(roomId, 10);
    return [...data.bookings]
        .filter(booking => {
            const hasRoom = parseInt(booking.roomId, 10) === numericRoomId ||
                (booking.rooms && booking.rooms.some(r => parseInt(r.roomId, 10) === numericRoomId));
            return hasRoom && ACTIVE_STATUSES.includes(booking.status);
        })
        .sort((first, second) => new Date(second.checkIn) - new Date(first.checkIn))[0] || null;
}

export function updateRoomStatus(roomId, status) {
    const room = findRoom(roomId);
    if (!room) return;
    room.status = status;
    commit();
    syncRoomToFirebase(room).catch(e => console.warn('Could not sync room status to Firebase:', e));
}

export async function updateRoomPrice(roomId, newPrice) {
    if (session.role !== 'owner') {
        alert('Only the Owner can update room prices.');
        return false;
    }
    if (!newPrice || newPrice < 100) {
        alert('Please enter a valid price (minimum ₹100)');
        return false;
    }
    const room = findRoom(roomId);
    if (!room) return false;

    const oldPrice = room.price;
    room.price = newPrice;
    try {
        await syncRoomToFirebase(room);
        saveDataToStorage();
    } catch (error) {
        room.price = oldPrice;
        commit();
        console.warn('Could not sync room price to Firebase:', error);
        alert('Price update failed and was reverted. Please try again.');
        return false;
    }

    addAuditLog('PRICE_UPDATED', `Room ${room.name} | ₹${formatNumber(oldPrice)} → ₹${formatNumber(newPrice)} | Updated by ${session.userName}`);
    alert(`Room ${room.name} price updated from ₹${formatNumber(oldPrice)} to ₹${formatNumber(newPrice)}`);
    commit();
    return true;
}
