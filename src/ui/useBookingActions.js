import { useMemo } from 'react';
import { useUI } from './UIContext.jsx';
import { canCheckout, cancelBooking, deleteBooking } from '../services/bookings.js';

// Booking actions shared by the bookings list, guests CRM, room details and payments table
export function useBookingActions() {
    const { openModal } = useUI();
    return useMemo(() => ({
        receipt: bookingId => openModal('receipt', { bookingId }),
        edit: bookingId => openModal('editBooking', { bookingId }),
        photos: bookingId => openModal('photoViewer', { bookingId }),
        extra: (bookingId, roomId) => openModal('extraAmount', { bookingId, roomId }),
        checkout: bookingId => { if (canCheckout(bookingId)) openModal('checkout', { bookingId }); },
        cancel: bookingId => cancelBooking(bookingId),
        remove: bookingId => deleteBooking(bookingId)
    }), [openModal]);
}
