
function checkoutBooking(bookingId) {
    if (currentUserRole !== 'receptionist') {
        if (typeof showToast === 'function') {
            showToast({ title: 'Access Restricted', message: 'Checkout is available to Receptionists only.', type: 'warning' });
        }
        return;
    }

    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    if (booking.status === 'completed') {
        if (typeof showToast === 'function') {
            showToast({ title: 'Already Checked Out', message: 'This booking is already checked out.', type: 'warning' });
        }
        return;
    }

    window.pendingCheckoutBookingId = bookingId;
    openCheckoutModal(booking);
}

function openCheckoutModal(booking) {
    const roomsDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(room => room.roomName).join(', ')
        : (booking.roomName || booking.roomId || 'Unassigned');
    const nights = typeof calculateBookingDays === 'function' ? calculateBookingDays(booking) : 1;
    const roomCharges = Number(booking.roomRate || 0) * nights;
    const additionalCharges = Number(booking.extras || 0) + Number(booking.extraBed || 0);
    const discount = Number(booking.discount || 0);
    const taxableAmount = Math.max(0, roomCharges + additionalCharges - discount);
    const tax = Math.round(taxableAmount * 0.05);
    const grandTotal = Math.max(0, taxableAmount + tax);
    const paid = Number(booking.advance || 0);
    const balance = Math.max(0, grandTotal - paid);
    const body = document.getElementById('checkoutModalBody');
    if (!body) return;
    body.innerHTML = `<div class="checkout-guest-summary"><div class="checkout-guest-avatar">${(booking.guestName || 'G').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><span class="eyebrow">Guest</span><h4>${booking.guestName}</h4><p>${roomsDisplay} · ${booking.id}</p></div></div><div class="checkout-facts"><div><small>Check-in</small><strong>${formatDateTime(booking.checkIn, booking.checkInTime)}</strong></div><div><small>Expected check-out</small><strong>${formatDateTime(booking.checkOut, booking.checkOutTime)}</strong></div><div><small>Total nights</small><strong>${nights}</strong></div></div><div class="checkout-line-items"><div><span>Room charges</span><strong>₹${formatNumber(roomCharges)}</strong></div><div><span>Additional charges</span><strong>₹${formatNumber(additionalCharges)}</strong></div><div><span>Discount</span><strong>- ₹${formatNumber(discount)}</strong></div><div><span>Tax / GST</span><strong>₹${formatNumber(tax)}</strong></div><div class="checkout-total"><span>Grand total</span><strong>₹${formatNumber(grandTotal)}</strong></div><div class="checkout-paid"><span>Paid</span><strong>₹${formatNumber(paid)}</strong></div><div class="checkout-balance"><span>Balance due</span><strong>₹${formatNumber(balance)}</strong></div></div><label class="checkout-payment-select">Payment method<select id="checkoutPaymentMethod"><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option><option value="Other">Other</option></select></label>`;
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal')?.classList.remove('active');
    window.pendingCheckoutBookingId = null;
}

function confirmCheckout() {
    const booking = data.bookings.find(item => item.id === window.pendingCheckoutBookingId);
    if (!booking) { closeCheckoutModal(); return; }
    const roomsDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(room => room.roomName).join(', ')
        : booking.roomName;
    const paymentMethod = document.getElementById('checkoutPaymentMethod')?.value || booking.paymentMethod || 'Cash';
    booking.status = 'completed';
    booking.actualCheckOutDate = getLocalISODate();
    booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    booking.checkoutProcessedBy = currentUserName || currentUserRole || 'Receptionist';
    booking.paymentMethod = paymentMethod;
    const checkoutNights = typeof calculateBookingDays === 'function' ? calculateBookingDays(booking) : 1;
    const checkoutSubtotal = Math.max(0, (Number(booking.roomRate || 0) * checkoutNights) + Number(booking.extras || 0) + Number(booking.extraBed || 0) - Number(booking.discount || 0));
    booking.finalAmount = Math.round(checkoutSubtotal * 1.05);

    booking.status = 'completed';
    booking.actualCheckOutDate = getLocalISODate();
    booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());

    // Free all rooms in the booking
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(roomData => {
            const room = data.rooms.find(item => item.id === roomData.roomId);
            if (room) {
                room.status = 'available';
            }
        });
    } else {
        // Fallback for old single-room bookings
        const room = data.rooms.find(item => item.id === booking.roomId);
        if (room) {
            room.status = 'available';
        }
    }

    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Checkout', `Guest ${booking.guestName} checked out from room(s) ${roomsDisplay}.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('checkout', 'Guest Checked Out', `${booking.guestName} departed Room ${roomsDisplay}.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    if (currentRoomDetailsRoomId) {
        const room = data.rooms.find(r => r.id === currentRoomDetailsRoomId);
        if (room) {
            showRoomDetails(room.id);
        }
    }

    if (typeof showToast === 'function') {
        showToast({
            title: 'Guest Checked Out',
            message: `Checkout successful. ${roomsDisplay} is now free.`,
            type: 'success'
        });
    }
    closeCheckoutModal();
}
