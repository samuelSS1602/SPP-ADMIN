
function startLiveClock() {
    const renderClock = function () {
        const node = document.getElementById('liveDateTime');
        if (!node) return;
        node.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    renderClock();

    if (liveClockTimer) {
        clearInterval(liveClockTimer);
    }

    liveClockTimer = setInterval(renderClock, 1000);
}

function getLocalISODate() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
}

function setTextById(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function getCustomerRecordForBooking(booking) {
    return data.customers.find(customer =>
        customer.name === booking.guestName ||
        customer.mobile === booking.guestPhone ||
        customer.phone === booking.guestPhone ||
        customer.email === booking.guestEmail
    ) || null;
}
