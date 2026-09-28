
async function downloadDailyRevenue() {
    await ensureXlsxLoaded();
    const today = getLocalISODate();
    const todayLabel = formatDate(today);
    const todaysBookings = data.bookings.filter(booking => booking.checkIn === today);

    const data_export = [
        ['Sri Padmavati Pleasants - Daily Revenue Report'],
        ['Date: ' + todayLabel],
        [],
        ['Check-in Time', 'Room', 'Guest', 'Room Rate', 'Advance', 'Extras', 'Total']
    ];

    if (!todaysBookings.length) {
        data_export.push(['No records', '-', '-', 0, 0, 0, 0]);
    } else {
        todaysBookings.forEach(booking => {
            const days = calculateBookingDays(booking);
            const totalRoom = (Number(booking.roomRate) || 0) * days;
            const discount = Number(booking.discount) || 0;
            const totalGrossRoom = Math.max(0, totalRoom - discount);

            data_export.push([
                booking.checkInTime || 'N/A',
                booking.roomName || '-',
                booking.guestName || '-',
                totalGrossRoom,
                Number(booking.advance) || 0,
                (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0),
                getBookingTotal(booking)
            ]);
        });
    }

    const dailyTotal = todaysBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    data_export.push([]);
    data_export.push(['DAILY TOTAL', '', '', '', '', '', dailyTotal]);

    const ws = XLSX.utils.aoa_to_sheet(data_export);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Revenue');
    XLSX.writeFile(wb, `Daily_Revenue_${today}.xlsx`);
    alert('Daily Revenue report downloaded!');
}

async function downloadMonthlyRevenue() {
    await ensureXlsxLoaded();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentYear = new Date().getFullYear();

        const monthlySummary = monthNames.map((month, monthIndex) => {
            const monthBookings = data.bookings.filter(booking => {
                const date = new Date(booking.checkIn);
                return date.getFullYear() === currentYear && date.getMonth() === monthIndex;
            });

            const advance = monthBookings.reduce((sum, booking) => sum + (Number(booking.advance) || 0), 0);
            const balance = monthBookings.reduce((sum, booking) => sum + getBookingBalance(booking), 0);
            const extras = monthBookings.reduce((sum, booking) => sum + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0), 0);
            const total = monthBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            return [`${month} ${currentYear}`, monthBookings.length, advance, balance, extras, total];
        });

        const data_export = [
            ['Sri Padmavati Pleasants - Monthly Revenue Report'],
            [],
            ['Month', 'Room Bookings', 'Advance Received', 'Balance Received', 'Extras', 'Total Revenue'],
            ...monthlySummary
        ];

        const ws = XLSX.utils.aoa_to_sheet(data_export);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Revenue');
        XLSX.writeFile(wb, 'Monthly_Revenue_Report.xlsx');
        alert('Monthly Revenue report downloaded!');
    }

    async function downloadYearlyRevenue() {
        await ensureXlsxLoaded();
        const yearlyMap = new Map();

        data.bookings.forEach(booking => {
            const date = new Date(booking.checkIn);
            if (Number.isNaN(date.getTime())) return;

            const year = date.getFullYear();
            if (!yearlyMap.has(year)) {
                yearlyMap.set(year, {
                    bookings: 0,
                    roomRateRevenue: 0,
                    advanceCollected: 0,
                    balanceCollected: 0,
                    extrasRevenue: 0,
                    totalRevenue: 0
                });
            }

            const yearSummary = yearlyMap.get(year);
            yearSummary.bookings += 1;
            const days = calculateBookingDays(booking);
            const totalRoom = (Number(booking.roomRate) || 0) * days;
            const discount = Number(booking.discount) || 0;
            const totalGrossRoom = Math.max(0, totalRoom - discount);

            yearSummary.roomRateRevenue += totalGrossRoom;
            yearSummary.advanceCollected += Number(booking.advance) || 0;
            yearSummary.balanceCollected += getBookingBalance(booking);
            yearSummary.extrasRevenue += (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
            yearSummary.totalRevenue += getBookingTotal(booking);
        });

        if (!yearlyMap.size) {
            yearlyMap.set(new Date().getFullYear(), {
                bookings: 0,
                roomRateRevenue: 0,
                advanceCollected: 0,
                balanceCollected: 0,
                extrasRevenue: 0,
                totalRevenue: 0
            });
        }

        const rows = Array.from(yearlyMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([year, summary]) => [
                String(year),
                summary.bookings,
                summary.roomRateRevenue,
                summary.advanceCollected,
                summary.balanceCollected,
                summary.extrasRevenue,
                summary.totalRevenue
            ]);

        const data_export = [
            ['Sri Padmavati Pleasants - Yearly Revenue Report'],
            [],
            ['Year', 'Total Bookings', 'Room Rate Revenue', 'Advance Collected', 'Balance Collected', 'Extras Revenue', 'Total Revenue'],
            ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(data_export);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yearly Revenue');
        XLSX.writeFile(wb, 'Yearly_Revenue_Report.xlsx');
        alert('Yearly Revenue report downloaded!');
    }
