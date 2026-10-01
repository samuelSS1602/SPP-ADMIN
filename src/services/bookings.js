import { data, findBooking, notify, session } from '../store/store.js';
import { commit, saveDataToStorage } from '../store/persistence.js';
import { deletePhotoFromLocal, migratePhotoInLocal, savePhotoToLocal } from '../store/indexedDb.js';
import { isCloudReady } from '../firebase/client.js';
import {
    deleteBookingDoc, deleteBookingPhotosDoc, getBookingPhotosDoc, setBookingPhotosDoc, syncBookingToFirebase
} from '../firebase/sync.js';
import { runWithRealtimePaused } from '../firebase/realtime.js';
import { calculateBookingDays, getBookingTotal } from '../lib/bookingCalc.js';
import {
    capitalizeAllText, formatNumber, getCurrentTimeValue, getLocalISODate, parseBookingDateTime, toDisplayTime
} from '../lib/format.js';
import {
    buildCheckInWhatsAppMessage, buildOwnerCheckinMessage, normalizePhoneForWhatsApp, openWhatsAppMessage, OWNER_WHATSAPP_PHONE
} from '../lib/whatsapp.js';
import { addAuditLog } from './audit.js';
import { addNotification } from './notifications.js';
import { upsertGuestRecord } from './guests.js';
import { showToast } from './toast.js';

function freeBookingRooms(booking, { looseMatch = false } = {}) {
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(roomData => {
            const room = data.rooms.find(item => item.id === roomData.roomId);
            if (room) room.status = 'available';
        });
    } else if (booking.roomId) {
        // eslint-disable-next-line eqeqeq
        const room = data.rooms.find(item => (looseMatch ? item.id == booking.roomId : item.id === booking.roomId));
        if (room) room.status = 'available';
    }
}

export function bookingRoomsLabel(booking) {
    return (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(room => room.roomName).join(', ')
        : booking.roomName;
}

// ---------- WhatsApp check-in messages ----------
function sendOwnerCheckinNotification(booking) {
    if (!booking || !OWNER_WHATSAPP_PHONE) return;
    const message = buildOwnerCheckinMessage(booking);
    if (!confirm('Send check-in notification to Owner via WhatsApp?')) return;

    const win = window.open(`https://wa.me/${OWNER_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
    // If the popup was blocked, fall back to the clipboard
    if (!win || win.closed || typeof win.closed === 'undefined') {
        try {
            navigator.clipboard.writeText(message);
            alert('Popup was blocked! The owner notification message has been copied to your clipboard.\n\nPlease open WhatsApp manually and paste the message to the owner.');
        } catch (e) {
            alert('Popup was blocked! Please allow popups for this site, or manually send the following to the Owner:\n\n' + message);
        }
    }
}

export function sendCheckInWhatsAppMessage(booking) {
    if (!booking || booking.checkInWhatsAppSent) return;
    const phone = normalizePhoneForWhatsApp(booking.guestPhone || '');
    if (phone && confirm(`Send WhatsApp check-in message to ${booking.guestName}?`)) {
        openWhatsAppMessage(phone, buildCheckInWhatsAppMessage(booking));
    }
    booking.checkInWhatsAppSent = true;

    // Owner notification only when a receptionist creates the booking; the delay lets the first WhatsApp tab open
    if (session.role === 'receptionist') {
        setTimeout(() => sendOwnerCheckinNotification(booking), 2000);
    }
}

// ---------- Create ----------
/**
 * @param form values collected by the New Booking page
 * @param selection [{roomId, roomName, floor, price}]
 * @returns created booking or null when the rooms were taken in the meantime
 */
export function createBooking(form, selection, idProofNormalized) {
    const selectedRoomIds = selection.map(r => r.roomId);
    const roomsToBook = selectedRoomIds.map(roomId => data.rooms.find(r => r.id === roomId)).filter(Boolean);
    const unavailableRooms = roomsToBook.filter(room => room.status !== 'available');
    if (unavailableRooms.length > 0) {
        alert(`The following rooms are no longer available: ${unavailableRooms.map(r => r.name).join(', ')}`);
        return null;
    }

    const bookingId = `BK${String(data.bookings.length + 1).padStart(3, '0')}`;
    const booking = {
        id: bookingId,
        guestName: capitalizeAllText(form.guestName),
        guestPhone: form.guestPhone,
        guestEmail: capitalizeAllText(form.guestEmail),
        idProofType: form.idProofType,
        idProofNumber: idProofNormalized,
        rooms: selection,
        createdAt: new Date().toISOString(),
        checkIn: form.checkIn,
        checkInTime: form.checkInTime,
        checkOut: form.checkOut,
        checkOutTime: form.checkOutTime,
        paymentMethod: form.paymentMethod,
        status: 'confirmed',
        roomRate: form.roomRate,
        advance: form.advance,
        extras: form.extras,
        extraBed: form.extraBed,
        maleCount: form.maleCount,
        femaleCount: form.femaleCount,
        childrenCount: form.childrenCount,
        vehicleNumber: capitalizeAllText(form.vehicleNumber),
        companyName: capitalizeAllText(form.companyName),
        guestGST: form.guestGST,
        discount: 0,
        customerPhoto: form.customerPhoto,
        idProofPhoto: form.idProofPhoto,
        bookingSource: form.bookingSource,
        recommendedBy: capitalizeAllText(form.recommendedBy),
        checkInWhatsAppSent: false,
        checkoutReminderSent: false
    };
    data.bookings.push(booking);
    roomsToBook.forEach(room => { room.status = 'occupied'; });

    // Legacy single-room fields kept for compatibility (mobile app, old reports)
    booking.roomId = selectedRoomIds[0];
    booking.roomName = selection[0].roomName;
    booking.floor = selection[0].floor;

    const bookedRoomNames = booking.rooms.map(r => r.roomName);
    sendCheckInWhatsAppMessage(booking);
    upsertGuestRecord(booking.guestName, form.guestPhone, booking.guestEmail, form.checkOut, booking.id);

    // Photos go to IndexedDB (this device) and Firestore booking_photos (cloud)
    savePhotoToLocal(booking.id, form.customerPhoto, form.idProofPhoto)
        .then(() => console.log(`Photos for ${booking.id} saved to IndexedDB`))
        .catch(err => console.warn('IndexedDB photo save failed:', err));

    saveDataToStorage();
    syncBookingToFirebase(booking);
    addAuditLog('New Booking', `Booking ${bookingId} created for guest ${booking.guestName} in room(s) ${bookedRoomNames.join(', ')}.`);
    addNotification('new-booking', 'New Booking Created', `Guest ${booking.guestName} reserved Room ${bookedRoomNames.join(', ')}.`);
    notify();
    return booking;
}

// ---------- Edit ----------
export function saveEditedBooking(bookingId, rooms, values) {
    const booking = findBooking(bookingId);
    if (!booking) return false;
    if (rooms.length === 0) {
        alert('A booking must have at least one assigned room.');
        return false;
    }

    const oldRoomIds = [];
    if (booking.rooms && booking.rooms.length > 0) booking.rooms.forEach(r => oldRoomIds.push(r.roomId));
    else if (booking.roomId) oldRoomIds.push(booking.roomId);
    const newRoomIds = rooms.map(r => r.roomId);

    /* eslint-disable eqeqeq */
    oldRoomIds.forEach(id => {
        if (!newRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if (r) r.status = 'available';
        }
    });
    newRoomIds.forEach(id => {
        if (!oldRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if (r) r.status = 'occupied';
        }
    });
    /* eslint-enable eqeqeq */

    booking.rooms = JSON.parse(JSON.stringify(rooms));
    booking.roomId = rooms[0].roomId;
    booking.roomName = rooms[0].roomName;
    booking.floor = rooms[0].floor;

    Object.assign(booking, values);
    booking.adultsCount = booking.maleCount + booking.femaleCount; // legacy field
    if (booking.paymentMethod !== 'Online') booking.bookingSource = '';

    commit();
    syncBookingToFirebase(booking);
    alert(`Booking ${bookingId} details updated.`);
    return true;
}

// ---------- Cancel ----------
export function cancelBooking(bookingId) {
    const booking = findBooking(bookingId);
    if (!booking) return;
    if (booking.status === 'completed' || booking.status === 'cancelled') {
        alert(`This booking is already ${booking.status}.`);
        return;
    }
    if (!confirm(`Are you sure you want to CANCEL booking ${booking.id} for ${booking.guestName}?`)) return;

    booking.status = 'cancelled';
    freeBookingRooms(booking, { looseMatch: true });
    saveDataToStorage();
    syncBookingToFirebase(booking);
    addAuditLog('Booking Cancelled', `Booking ${booking.id} for guest ${booking.guestName} was CANCELLED.`);
    addNotification('alert', 'Booking Cancelled', `Stay ${booking.id} (${booking.guestName}) has been cancelled.`);
    notify();
    alert(`Booking ${bookingId} has been cancelled.`);
}

// ---------- Renumbering (BK001, BK002, ...) ----------
function renumberInMemory({ clearCachedPhotoUrls }) {
    const renameMap = [];
    data.bookings.forEach((booking, i) => {
        const newId = `BK${String(i + 1).padStart(3, '0')}`;
        if (booking.id !== newId) renameMap.push({ oldId: booking.id, newId });
        booking.id = newId;
        if (clearCachedPhotoUrls) {
            // Cached photo URLs are fetched fresh from Firebase under the new id
            delete booking.customerPhotoUrl;
            delete booking.idProofPhotoUrl;
        }
    });
    return renameMap;
}

async function migrateRenamedBookings(renameMap, { tagPhotoDoc }) {
    for (const { oldId, newId } of renameMap) {
        migratePhotoInLocal(oldId, newId).catch(err => console.warn(`IndexedDB migrate ${oldId}→${newId} failed:`, err));
    }
    if (isCloudReady() && renameMap.length > 0) {
        for (const { oldId, newId } of renameMap) {
            try {
                const photoData = await getBookingPhotosDoc(oldId);
                if (photoData) {
                    if (tagPhotoDoc) photoData.bookingId = newId;
                    await setBookingPhotosDoc(newId, photoData);
                    await deleteBookingPhotosDoc(oldId);
                }
                // The booking document is recreated under the new id below
                await deleteBookingDoc(oldId);
            } catch (err) {
                console.warn(`Failed to migrate Firebase docs from ${oldId} to ${newId}:`, err);
            }
        }
        for (const booking of data.bookings) syncBookingToFirebase(booking);
    }

    const rename = id => renameMap.find(r => r.oldId === id)?.newId;
    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            const newId = rename(historyItem.bookingId);
            if (newId) historyItem.bookingId = newId;
        });
    });
    data.guests.forEach(guest => {
        const newId = guest.lastBookingId && rename(guest.lastBookingId);
        if (newId) guest.lastBookingId = newId;
    });
}

export const deleteBooking = runWithRealtimePaused(async function (bookingId) {
    const booking = findBooking(bookingId);
    if (!booking) return;
    if (!confirm(`⚠️ PERMANENTLY DELETE booking ${booking.id} for ${booking.guestName}?\n\nThis will remove the booking and renumber all remaining bookings sequentially.\n\nThis action CANNOT be undone!`)) return;
    if (!confirm(`Are you ABSOLUTELY sure? This will delete ${booking.id} and renumber all bookings.`)) return;

    const index = data.bookings.findIndex(item => item.id === bookingId);
    if (index === -1) return;
    data.bookings.splice(index, 1);

    deletePhotoFromLocal(bookingId).catch(err => console.warn('Failed to delete IndexedDB photo:', err));
    if (isCloudReady()) {
        try {
            await deleteBookingDoc(bookingId);
            await deleteBookingPhotosDoc(bookingId);
        } catch (err) {
            console.warn('Failed to delete old Firebase doc:', err);
        }
    }

    const renameMap = renumberInMemory({ clearCachedPhotoUrls: false });
    await migrateRenamedBookings(renameMap, { tagPhotoDoc: false });

    saveDataToStorage();
    addAuditLog('Booking Deleted', `Booking ${bookingId} was PERMANENTLY DELETED. System reindexed other bookings.`);
    addNotification('alert', 'Booking Permanently Deleted', `Booking ID ${bookingId} has been deleted by Owner.`);
    notify();
    alert(`Booking ${bookingId} has been deleted. All bookings have been renumbered sequentially.`);
});

export const renumberAllBookings = runWithRealtimePaused(async function () {
    if (data.bookings.length === 0) {
        alert('No bookings to renumber.');
        return;
    }
    const needsRenumber = data.bookings.some((booking, i) => booking.id !== `BK${String(i + 1).padStart(3, '0')}`);
    if (!needsRenumber) {
        alert('All booking IDs are already sequential. No renumbering needed.');
        return;
    }
    if (!confirm('⚠️ RENUMBER ALL BOOKINGS?\n\nThis will reassign all booking IDs to be sequential (BK001, BK002, BK003...) with no gaps.\n\nAll Firebase records will be updated.\n\nContinue?')) return;

    const renameMap = renumberInMemory({ clearCachedPhotoUrls: true });
    await migrateRenamedBookings(renameMap, { tagPhotoDoc: true });

    commit();
    alert(`Done! ${renameMap.length} booking(s) have been renumbered sequentially.`);
});

// ---------- Checkout ----------
export function canCheckout(bookingId) {
    if (session.role !== 'receptionist') {
        showToast({ title: 'Access Restricted', message: 'Checkout is available to Receptionists only.', type: 'warning' });
        return false;
    }
    const booking = findBooking(bookingId);
    if (!booking) return false;
    if (booking.status === 'completed') {
        showToast({ title: 'Already Checked Out', message: 'This booking is already checked out.', type: 'warning' });
        return false;
    }
    return true;
}

export function getCheckoutSummary(booking) {
    const nights = calculateBookingDays(booking);
    const roomCharges = Number(booking.roomRate || 0) * nights;
    const additionalCharges = Number(booking.extras || 0) + Number(booking.extraBed || 0);
    const discount = Number(booking.discount || 0);
    const taxableAmount = Math.max(0, roomCharges + additionalCharges - discount);
    const tax = Math.round(taxableAmount * 0.05);
    const grandTotal = Math.max(0, taxableAmount + tax);
    const paid = Number(booking.advance || 0);
    return { nights, roomCharges, additionalCharges, discount, tax, grandTotal, paid, balance: Math.max(0, grandTotal - paid) };
}

export function confirmCheckout(bookingId, paymentMethod) {
    const booking = findBooking(bookingId);
    if (!booking) return;
    const roomsDisplay = bookingRoomsLabel(booking);

    booking.status = 'completed';
    booking.actualCheckOutDate = getLocalISODate();
    booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    booking.checkoutProcessedBy = session.userName || session.role || 'Receptionist';
    booking.paymentMethod = paymentMethod || booking.paymentMethod || 'Cash';
    const nights = calculateBookingDays(booking);
    const subtotal = Math.max(0, (Number(booking.roomRate || 0) * nights) + Number(booking.extras || 0) + Number(booking.extraBed || 0) - Number(booking.discount || 0));
    booking.finalAmount = Math.round(subtotal * 1.05);

    freeBookingRooms(booking);
    saveDataToStorage();
    syncBookingToFirebase(booking);
    addAuditLog('Booking Checkout', `Guest ${booking.guestName} checked out from room(s) ${roomsDisplay}.`);
    addNotification('checkout', 'Guest Checked Out', `${booking.guestName} departed Room ${roomsDisplay}.`);
    notify();
    showToast({ title: 'Guest Checked Out', message: `Checkout successful. ${roomsDisplay} is now free.`, type: 'success' });
}

// ---------- Billing ----------
export function addExtraAmount(bookingId, amount) {
    if (!amount || amount <= 0) {
        alert('Please enter a valid extra amount');
        return false;
    }
    const booking = findBooking(bookingId);
    if (!booking) return false;
    booking.extras = (booking.extras || 0) + amount;
    commit();
    syncBookingToFirebase(booking);
    alert(`Extra amount ₹${formatNumber(amount)} added to INV-${booking.id}`);
    return true;
}

export function applyReceiptAdjustments(bookingId, { discount, extraBed, extras, maleCount, femaleCount, childrenCount }) {
    const booking = findBooking(bookingId);
    if (!booking) return;
    booking.discount = discount;
    booking.extraBed = extraBed;
    booking.extras = extras;
    booking.maleCount = maleCount;
    booking.femaleCount = femaleCount;
    booking.childrenCount = childrenCount;
    booking.adultsCount = maleCount + femaleCount;

    saveDataToStorage();
    syncBookingToFirebase(booking);
    addAuditLog('Tariff Updated', `Modified billing components for Invoice INV-${booking.id} (Discounts: ₹${discount}, Extras: ₹${extras})`);
    notify();
}

export function markReceiptAsPaid(bookingId) {
    const booking = findBooking(bookingId);
    if (!booking) return;
    if (booking.status !== 'completed' && booking.status !== 'paid') booking.status = 'paid';
    booking.advance = getBookingTotal(booking);

    saveDataToStorage();
    syncBookingToFirebase(booking);
    addAuditLog('Payment Settled', `Invoice INV-${booking.id} marked as PAID.`);
    addNotification('payment', 'Invoice Paid', `Invoice INV-${booking.id} has been fully settled.`);
    notify();
    alert(`Booking ${booking.id} marked as fully paid!`);
}

// ---------- Checkout reminders ----------
export function processCheckoutReminders() {
    const now = new Date();
    data.bookings.forEach(booking => {
        if (!booking || booking.status === 'completed' || booking.checkoutReminderSent) return;
        if (!normalizePhoneForWhatsApp(booking.guestPhone || '')) return;
        const checkoutDateTime = parseBookingDateTime(booking.checkOut, booking.checkOutTime);
        if (!checkoutDateTime) return;
        if (now < new Date(checkoutDateTime.getTime() - 60 * 60 * 1000)) return;

        showToast({
            title: `${booking.guestName} checkout due`,
            message: `Room ${booking.roomName || 'N/A'} is due for checkout in the next hour.`,
            type: 'reminder',
            duration: 4800,
            variant: 'reminder'
        });
        booking.checkoutReminderSent = true;
        saveDataToStorage();
        syncBookingToFirebase(booking);
    });
}

// Console helper kept from the previous version: fixBookingStatus('BK012', 'completed')
export function fixBookingStatus(bookingId, newStatus) {
    const booking = findBooking(bookingId);
    if (!booking) {
        alert(`Booking ${bookingId} not found!`);
        return false;
    }
    const oldStatus = booking.status;
    booking.status = newStatus;
    if (newStatus === 'completed' && !booking.actualCheckOutDate) {
        booking.actualCheckOutDate = getLocalISODate();
        booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    }
    commit();
    syncBookingToFirebase(booking);
    alert(`✓ Booking ${bookingId} status changed from "${oldStatus}" to "${newStatus}"`);
    return true;
}
