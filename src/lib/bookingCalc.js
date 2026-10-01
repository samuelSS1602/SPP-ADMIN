export const ACTIVE_STATUSES = ['confirmed', 'pending', 'paid'];

export function calculateBookingDays(booking) {
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const checkOutDateStr = booking.actualCheckOutDate || booking.checkOut;
    const checkOutDate = checkOutDateStr ? new Date(checkOutDateStr) : new Date();

    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDate - checkInDate) / msPerDay);
    if (days < 1 || Number.isNaN(days)) days = 1;
    return days;
}

export function getBookingTotal(booking) {
    const days = calculateBookingDays(booking);
    const totalRoom = (Number(booking.roomRate) || 0) * days;
    const discount = Number(booking.discount) || 0;
    const totalGrossRoom = Math.max(0, totalRoom - discount);
    return totalGrossRoom + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
}

export function getBookingBalance(booking) {
    const advance = Number(booking.advance) || 0;
    return Math.max(getBookingTotal(booking) - advance, 0);
}

export function isBookingFullyPaid(booking) {
    return getBookingBalance(booking) <= 0 || booking.status === 'paid' || booking.status === 'completed';
}

// Room IDs held by a booking (multi-room bookings use `rooms`, legacy ones `roomId`)
export function getBookingRoomIds(booking) {
    if (booking.rooms && booking.rooms.length > 0) return booking.rooms.map(r => parseInt(r.roomId, 10));
    if (booking.roomId) return [parseInt(booking.roomId, 10)];
    return [];
}

// Surcharges applied on top of the selected rooms' base rate
export function calculateSurchargedRate(totalRate, checkInDate, settings = {}) {
    let finalRate = totalRate;
    const surchargeInfo = [];

    if (checkInDate && settings.weekendSurcharge > 0) {
        // Local day of week (Sunday 0, Friday 5, Saturday 6)
        const dayOfWeek = new Date(checkInDate).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            finalRate += totalRate * (settings.weekendSurcharge / 100);
            surchargeInfo.push(`Weekend Surge (+${settings.weekendSurcharge}%)`);
        }
    }

    if (settings.holidaySurgeActive && settings.holidaySurgeRate > 0) {
        finalRate += totalRate * (settings.holidaySurgeRate / 100);
        surchargeInfo.push(`Holiday Surge (+${settings.holidaySurgeRate}%)`);
    }

    return { roundedRate: Math.round(finalRate), surchargeInfo };
}
