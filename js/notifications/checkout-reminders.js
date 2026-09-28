
function startCheckoutReminderService() {
    stopCheckoutReminderService();
    processCheckoutReminders();
    checkoutReminderTimer = setInterval(processCheckoutReminders, 60000);
}

function stopCheckoutReminderService() {
    if (checkoutReminderTimer) {
        clearInterval(checkoutReminderTimer);
        checkoutReminderTimer = null;
    }
}

function processCheckoutReminders() {
    const now = new Date();

    data.bookings.forEach(booking => {
        if (!booking || booking.status === 'completed' || booking.checkoutReminderSent) return;

        const phone = normalizePhoneForWhatsApp(booking.guestPhone || '');
        if (!phone) return;

        const checkoutDateTime = parseBookingDateTime(booking.checkOut, booking.checkOutTime);
        if (!checkoutDateTime) return;

        const oneHourBeforeCheckout = new Date(checkoutDateTime.getTime() - 60 * 60 * 1000);
        if (now < oneHourBeforeCheckout) return;

        if (typeof showToast === 'function') {
            showToast({
                title: `${booking.guestName} checkout due`,
                message: `Room ${booking.roomName || 'N/A'} is due for checkout in the next hour.`,
                type: 'reminder',
                duration: 4800,
                variant: 'reminder'
            });
        }

        booking.checkoutReminderSent = true;
        saveDataToStorage();
        syncBookingToFirebase(booking);
    });
}
