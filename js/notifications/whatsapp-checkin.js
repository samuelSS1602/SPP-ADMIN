
// --- ANALYTICS / REPORTS INTERVAL TOGGLES ---


function sendCheckInWhatsAppMessage(booking) {
    if (!booking || booking.checkInWhatsAppSent) return;

    const phone = normalizePhoneForWhatsApp(booking.guestPhone || '');

    // Send guest check-in message
    if (phone) {
        const message = buildCheckInWhatsAppMessage(booking);
        const shouldSend = confirm(`Send WhatsApp check-in message to ${booking.guestName}?`);
        if (shouldSend) {
            openWhatsAppMessage(phone, message);
        }
    }

    booking.checkInWhatsAppSent = true;

    // Send owner notification (only when receptionist creates booking)
    // Use a longer delay so the first WhatsApp tab fully opens before triggering the second
    if (currentUserRole === 'receptionist') {
        setTimeout(() => {
            sendOwnerCheckinNotification(booking);
        }, 2000);
    }
}

function sendOwnerCheckinNotification(booking) {
    if (!booking || !OWNER_WHATSAPP_PHONE) return;

    const message = buildOwnerCheckinMessage(booking);

    const shouldSend = confirm('Send check-in notification to Owner via WhatsApp?');
    if (shouldSend) {
        const url = `https://wa.me/${OWNER_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
        const win = window.open(url, '_blank');

        // If popup was blocked, provide a fallback
        if (!win || win.closed || typeof win.closed === 'undefined') {
            // Try to copy the message and show URL
            try {
                navigator.clipboard.writeText(message);
                alert('Popup was blocked! The owner notification message has been copied to your clipboard.\n\nPlease open WhatsApp manually and paste the message to the owner.');
            } catch (e) {
                alert('Popup was blocked! Please allow popups for this site, or manually send the following to the Owner:\n\n' + message);
            }
        }
    }
}

function buildOwnerCheckinMessage(booking) {
    const roomDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(r => `${r.roomName} (Floor ${r.floor})`).join(', ')
        : `${booking.roomName || 'N/A'}`;

    const ciTime = booking.checkInTime || '12:00 PM';
    const ciDateTime = booking.checkIn ? formatDateTime(booking.checkIn, ciTime) : 'N/A';
    const coTime = booking.checkOutTime || '11:00 AM';
    const coDateTime = booking.checkOut ? formatDateTime(booking.checkOut, coTime) : 'N/A';

    const totalRate = booking.roomRate || 0;
    const advance = booking.advance || 0;
    const extras = (booking.extras || 0) + (booking.extraBed || 0);
    const total = getBookingTotal(booking);
    const balance = getBookingBalance(booking);
    const guests = `${booking.maleCount || 0}M + ${booking.femaleCount || 0}F + ${booking.childrenCount || 0}C`;

    return `🏨 *New Check-In Alert*
Sri Padmavati Pleasants

👤 Guest: ${booking.guestName}
📱 Phone: ${booking.guestPhone || 'N/A'}
👥 Guests: ${guests}
🛏️ Room: ${roomDisplay}
📅 Check-in: ${ciDateTime}
📅 Check-out: ${coDateTime}
💳 Payment: ${booking.paymentMethod || 'N/A'}${booking.bookingSource ? ' (' + booking.bookingSource + ')' : ''}

💰 Room Rate: ₹${formatNumber(totalRate)}
💵 Advance Received: ₹${formatNumber(advance)}
➕ Extras: ₹${formatNumber(extras)}
🧾 Total Billing: ₹${formatNumber(total)}
⚖️ Balance Due: ₹${formatNumber(balance)}

📋 Booking ID: ${booking.id}`;
}
