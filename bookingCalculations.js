function calculateBookingDays(booking) {
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const checkOutDateStr = booking.actualCheckOutDate || booking.checkOut;
    const checkOutDate = checkOutDateStr ? new Date(checkOutDateStr) : new Date();

    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDate - checkInDate) / msPerDay);
    if (days < 1 || isNaN(days)) days = 1;
    return days;
}

function getBookingTotal(booking) {
    const days = calculateBookingDays(booking);
    const totalRoom = (Number(booking.roomRate) || 0) * days;
    const discount = Number(booking.discount) || 0;
    const totalGrossRoom = Math.max(0, totalRoom - discount);
    return totalGrossRoom + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
}

function getBookingBalance(booking) {
    const advance = Number(booking.advance) || 0;
    return Math.max(getBookingTotal(booking) - advance, 0);
}

if (typeof module !== 'undefined') {
    module.exports = { calculateBookingDays, getBookingTotal, getBookingBalance };
}
