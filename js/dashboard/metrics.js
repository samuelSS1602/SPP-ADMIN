
function updateRealtimeDashboardMetrics() {
    const totalBookings = data.bookings.length;
    const totalRooms = data.rooms.length;
    const availableRooms = data.rooms.filter(room => room.status === 'available').length;
    const occupiedRooms = data.rooms.filter(room => room.status === 'occupied').length;
    const maintenanceRooms = data.rooms.filter(room => room.status === 'maintenance').length;
    const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const today = getLocalISODate();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const checkInsToday = data.bookings.filter(booking => booking.checkIn === today).length;
    const checkOutsToday = data.bookings.filter(booking => booking.checkOut === today).length;

    const revenueToday = data.bookings
        .filter(booking => booking.checkIn === today)
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    const monthlyRevenue = data.bookings
        .filter(booking => {
            const checkInDate = new Date(booking.checkIn);
            return checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear;
        })
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    // Sum balances of active (non-completed/non-cancelled) bookings
    const activeStatuses = ['confirmed', 'pending', 'paid'];
    const pendingPayments = data.bookings
        .filter(booking => activeStatuses.includes(booking.status))
        .reduce((sum, booking) => sum + getBookingBalance(booking), 0);

    setTextById('metricTotalRooms', String(totalRooms));
    
    setTextById('metricOccupiedRooms', String(occupiedRooms));
    setTextById('metricOccupiedRoomsInfo', `${occupiedRooms} of ${totalRooms} rooms occupied`);
    
    setTextById('metricAvailableRooms', String(availableRooms));
    setTextById('metricAvailableRoomsInfo', `${availableRooms} of ${totalRooms} available`);
    
    setTextById('metricTotalBookings', String(totalBookings));
    setTextById('metricTotalBookingsInfo', 'Total bookings on record');
    
    setTextById('statCheckinsToday', String(checkInsToday));
    setTextById('statCheckoutsToday', String(checkOutsToday));
    setTextById('statMaintenance', String(maintenanceRooms));
    
    setTextById('statMonthlyRevenue', `₹${formatNumber(monthlyRevenue)}`);
    
    setTextById('metricPendingPayments', `₹${formatNumber(pendingPayments)}`);
    setTextById('metricPendingPaymentsInfo', `Outstanding frontdesk balance`);

    setTextById('metricRevenueToday', `₹${formatNumber(revenueToday)}`);
    
    // Enhanced owner financials and reports calculations
    const activeBookingsToday = data.bookings.filter(b => b.checkIn <= today && b.checkOut >= today && b.status !== 'cancelled');
    let roomsBookedToday = 0;
    activeBookingsToday.forEach(b => {
        if (b.rooms && Array.isArray(b.rooms)) {
            roomsBookedToday += b.rooms.length;
        } else if (b.roomId) {
            roomsBookedToday += 1;
        }
    });
    const avgOccRate = Math.min(100, Math.round((roomsBookedToday / 9) * 100));
    
    let totalDays = 0;
    let validBookingsCount = 0;
    let totalDiscounts = 0;
    let totalNetRoomRevenue = 0;
    let totalRoomNights = 0;
    
    data.bookings.forEach(b => {
        if (b.status !== 'cancelled') {
            const days = calculateBookingDays(b);
            totalDays += days;
            validBookingsCount++;
            
            const discount = Number(b.discount) || 0;
            totalDiscounts += discount;
            
            const totalRoom = (Number(b.roomRate) || 0) * days;
            totalNetRoomRevenue += Math.max(0, totalRoom - discount);
            
            if (b.rooms && Array.isArray(b.rooms)) {
                totalRoomNights += b.rooms.length * days;
            } else {
                totalRoomNights += days;
            }
        }
    });
    
    const avgDuration = validBookingsCount > 0 ? (totalDays / validBookingsCount).toFixed(1) : '1.2';
    const adr = totalRoomNights > 0 ? (totalNetRoomRevenue / totalRoomNights) : 0;
    const revpar = adr * (avgOccRate / 100);
    
    const cgst = totalNetRoomRevenue * 0.025;
    const sgst = totalNetRoomRevenue * 0.025;
    const gstTotal = cgst + sgst;
    
    setTextById('repOccupancyRate', `${avgOccRate}%`);
    setTextById('repAvgDuration', `${avgDuration} Nights`);
    setTextById('repAdr', `₹${formatNumber(Math.round(adr))}`);
    setTextById('repRevPar', `₹${formatNumber(Math.round(revpar))}`);
    setTextById('repTotalDiscounts', `₹${formatNumber(totalDiscounts)}`);
    setTextById('repCgstCollected', `₹${formatNumber(Math.round(cgst))}`);
    setTextById('repSgstCollected', `₹${formatNumber(Math.round(sgst))}`);
    setTextById('repGstCollected', `₹${formatNumber(Math.round(gstTotal))}`);
    
    // Trigger sparkline draws
    if (typeof drawSparklines === 'function') {
        drawSparklines();
    }
}
