import { data } from '../store/store.js';
import { ACTIVE_STATUSES, calculateBookingDays, getBookingBalance, getBookingTotal } from '../lib/bookingCalc.js';
import { getLocalISODate, toISODateFromDate } from '../lib/format.js';

export function computeDashboardMetrics() {
    const totalRooms = data.rooms.length;
    const count = status => data.rooms.filter(room => room.status === status).length;
    const today = getLocalISODate();
    const now = new Date();

    const revenueToday = data.bookings.filter(b => b.checkIn === today).reduce((sum, b) => sum + getBookingTotal(b), 0);
    const monthlyRevenue = data.bookings
        .filter(b => {
            const d = new Date(b.checkIn);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, b) => sum + getBookingTotal(b), 0);
    const pendingPayments = data.bookings
        .filter(b => ACTIVE_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + getBookingBalance(b), 0);

    return {
        totalRooms,
        occupiedRooms: count('occupied'),
        availableRooms: count('available'),
        maintenanceRooms: count('maintenance'),
        cleaningRooms: count('cleaning'),
        totalBookings: data.bookings.length,
        checkInsToday: data.bookings.filter(b => b.checkIn === today).length,
        checkOutsToday: data.bookings.filter(b => b.checkOut === today).length,
        revenueToday,
        monthlyRevenue,
        pendingPayments
    };
}

// Owner reports centre summary
export function computePerformanceSummary() {
    const today = getLocalISODate();
    let roomsBookedToday = 0;
    data.bookings
        .filter(b => b.checkIn <= today && b.checkOut >= today && b.status !== 'cancelled')
        .forEach(b => {
            if (b.rooms && Array.isArray(b.rooms)) roomsBookedToday += b.rooms.length;
            else if (b.roomId) roomsBookedToday += 1;
        });
    const avgOccRate = Math.min(100, Math.round((roomsBookedToday / 9) * 100));

    let totalDays = 0;
    let validBookingsCount = 0;
    let totalDiscounts = 0;
    let totalNetRoomRevenue = 0;
    let totalRoomNights = 0;
    data.bookings.forEach(b => {
        if (b.status === 'cancelled') return;
        const days = calculateBookingDays(b);
        totalDays += days;
        validBookingsCount++;
        const discount = Number(b.discount) || 0;
        totalDiscounts += discount;
        totalNetRoomRevenue += Math.max(0, (Number(b.roomRate) || 0) * days - discount);
        totalRoomNights += (b.rooms && Array.isArray(b.rooms)) ? b.rooms.length * days : days;
    });

    const adr = totalRoomNights > 0 ? totalNetRoomRevenue / totalRoomNights : 0;
    const cgst = totalNetRoomRevenue * 0.025;
    const sgst = totalNetRoomRevenue * 0.025;
    return {
        avgOccRate,
        avgDuration: validBookingsCount > 0 ? (totalDays / validBookingsCount).toFixed(1) : '1.2',
        adr,
        revpar: adr * (avgOccRate / 100),
        totalDiscounts,
        cgst,
        sgst,
        gstTotal: cgst + sgst
    };
}

export function getLast7DaysRevenueData() {
    const labels = [];
    const values = [];
    const today = new Date();
    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - dayOffset);
        const isoDate = toISODateFromDate(date);
        labels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
        values.push(data.bookings.filter(b => b.checkIn === isoDate).reduce((sum, b) => sum + getBookingTotal(b), 0));
    }
    return { labels, values };
}

export function getLast6MonthsRevenueData() {
    const labels = [];
    const values = [];
    const today = new Date();
    for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        labels.push(monthDate.toLocaleDateString('en-IN', { month: 'short' }));
        values.push(data.bookings
            .filter(b => {
                const d = new Date(b.checkIn);
                return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
            })
            .reduce((sum, b) => sum + getBookingTotal(b), 0));
    }
    return { labels, values };
}
