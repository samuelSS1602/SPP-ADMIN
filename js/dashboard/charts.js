

    async function createCharts() {
        await ensureChartJsLoaded();
        createRevenueChart();
        createOccupancyChart();
    }

    function createRevenueChart() {
        if (charts.revenue) charts.revenue.destroy();
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        const weeklyRevenue = getLast7DaysRevenueData();

        charts.revenue = new Chart(ctx, {
            type: 'line',
            data: { labels: weeklyRevenue.labels, datasets: [{ label: 'Daily Revenue', data: weeklyRevenue.values, borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#D4AF37' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function createOccupancyChart() {
        if (charts.occupancy) charts.occupancy.destroy();
        const ctx = document.getElementById('occupancyChart');
        if (!ctx) return;
        const occupied = data.rooms.filter(r => r.status === 'occupied').length;
        const available = data.rooms.filter(r => r.status === 'available').length;
        const cleaning = data.rooms.filter(r => r.status === 'cleaning').length;
        charts.occupancy = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Occupied', 'Available', 'Cleaning'], datasets: [{ data: [occupied, available, cleaning], backgroundColor: ['#E74C3C', '#27AE60', '#F39C12'], borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    async function createAnalyticsChart() {
        await ensureChartJsLoaded();
        if (charts.monthly) charts.monthly.destroy();
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        const monthlyRevenue = getLast6MonthsRevenueData();

        charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: { labels: monthlyRevenue.labels, datasets: [{ label: 'Monthly Revenue', data: monthlyRevenue.values, backgroundColor: ['#1B4D3E', '#2D7A6F', '#4DB8A8', '#D4AF37', '#4DB8A8', '#2D7A6F'], borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function getLast7DaysRevenueData() {
        const labels = [];
        const values = [];
        const today = new Date();

        for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - dayOffset);

            const isoDate = toISODateFromDate(date);
            const label = date.toLocaleDateString('en-IN', { weekday: 'short' });
            const total = data.bookings
                .filter(booking => booking.checkIn === isoDate)
                .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            labels.push(label);
            values.push(total);
        }

        return { labels, values };
    }

    function getLast6MonthsRevenueData() {
        const labels = [];
        const values = [];
        const today = new Date();

        for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
            const label = monthDate.toLocaleDateString('en-IN', { month: 'short' });
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();

            const total = data.bookings
                .filter(booking => {
                    const bookingDate = new Date(booking.checkIn);
                    return !Number.isNaN(bookingDate.getTime()) && bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
                })
                .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            labels.push(label);
            values.push(total);
        }

        return { labels, values };
    }

    function toISODateFromDate(date) {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().split('T')[0];
    }

    function destroyCharts() {
        if (charts.revenue) charts.revenue.destroy();
        if (charts.occupancy) charts.occupancy.destroy();
        if (charts.monthly) charts.monthly.destroy();
        charts = {};
    }
