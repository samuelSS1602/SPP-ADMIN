import { data } from '../store/store.js';
import { getLocalISODate } from '../lib/format.js';

export function upsertGuestRecord(name, phone, email, lastVisit, lastBookingId) {
    const existingGuest = data.guests.find(guest => guest.phone === phone || guest.name === name);
    if (existingGuest) {
        existingGuest.name = name;
        existingGuest.phone = phone;
        existingGuest.email = email || existingGuest.email;
        existingGuest.visits += 1;
        existingGuest.lastVisit = lastVisit;
        if (lastBookingId) existingGuest.lastBookingId = lastBookingId;
        return;
    }
    data.guests.push({
        name,
        email: email || 'N/A',
        phone,
        visits: 1,
        lastVisit,
        lastBookingId: lastBookingId || null
    });
}

// The guest list is derived from the bookings
export function rebuildGuestsFromBookings() {
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
}

export function getCustomerRecordForBooking(booking) {
    return data.customers.find(customer =>
        customer.name === booking.guestName ||
        customer.mobile === booking.guestPhone ||
        customer.phone === booking.guestPhone ||
        customer.email === booking.guestEmail
    ) || null;
}

export function getGuestProfile(booking) {
    const customer = data.customers.find(item => item.name === booking.guestName || item.mobile === booking.guestPhone || item.email === booking.guestEmail);
    if (customer) {
        return {
            phone: customer.mobile || customer.phone || 'N/A',
            email: customer.email || 'N/A',
            address: customer.address || 'N/A'
        };
    }
    const guest = data.guests.find(item => item.name === booking.guestName);
    return {
        phone: guest?.phone || 'N/A',
        email: guest?.email || 'N/A',
        address: 'N/A'
    };
}

export function getGuestBookings(guestName, guestPhone) {
    return data.bookings.filter(b => b.guestName === guestName || b.guestPhone === guestPhone);
}
