
// --- TRADING-STYLE REVENUE CALENDAR HEATMAP ---
let salesCalendarYear = new Date().getFullYear();
let salesCalendarMonth = new Date().getMonth();

function initSalesCalendar() {
    salesCalendarYear = new Date().getFullYear();
    salesCalendarMonth = new Date().getMonth();
    renderSalesCalendar();
}

function changeSalesCalendarMonth(offset) {
    salesCalendarMonth += offset;
    if (salesCalendarMonth < 0) {
        salesCalendarMonth = 11;
        salesCalendarYear--;
    } else if (salesCalendarMonth > 11) {
        salesCalendarMonth = 0;
        salesCalendarYear++;
    }
    renderSalesCalendar();
}

function renderSalesCalendar() {
    const grid = document.getElementById('salesCalendarGrid');
    const label = document.getElementById('salesCalendarMonthLabel');
    if (!grid || !label) return;
    
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    label.textContent = `${monthNames[salesCalendarMonth]} ${salesCalendarYear}`;
    
    // Clear grid
    grid.innerHTML = '';
    
    const firstDayIndex = new Date(salesCalendarYear, salesCalendarMonth, 1).getDay();
    const daysInMonth = new Date(salesCalendarYear, salesCalendarMonth + 1, 0).getDate();
    
    // Calculate daily sales for heatmap normalization
    const dailyRevenues = {};
    let maxSales = 1000; // minimum normalization floor to prevent divide-by-zero
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${salesCalendarYear}-${String(salesCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBookings = data.bookings.filter(b => b.checkIn === dateString);
        const daySales = dayBookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
        dailyRevenues[day] = { sales: daySales, bookings: dayBookings };
        if (daySales > maxSales) {
            maxSales = daySales;
        }
    }
    
    // 1. Render empty padding days
    for (let i = 0; i < firstDayIndex; i++) {
        grid.innerHTML += `<div class="revenue-calendar-day empty-day"></div>`;
    }
    
    // 2. Render actual calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayData = dailyRevenues[day];
        const hasSales = dayData.sales > 0;
        const salesText = hasSales ? `₹${formatNumber(dayData.sales)}` : '';
        
        // Heatmap cell styling
        let cellStyle = '';
        let cellClass = 'revenue-calendar-day';
        if (hasSales) {
            cellClass += ' has-sales';
            // Compute intensity from 0.15 to 0.85 opacity based on sales volume
            const intensity = 0.15 + (dayData.sales / maxSales) * 0.75;
            cellStyle = `background: rgba(37, 99, 235, ${intensity}); color: ${intensity > 0.6 ? '#ffffff' : 'var(--text-dark)'};`;
            if (intensity > 0.6) {
                cellStyle += ` --text-light: rgba(255,255,255,0.7);`;
            }
        }
        
        // Create tooltip listing guest bookings for this day
        const dateString = `${salesCalendarYear}-${String(salesCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let tooltipHtml = `<strong>${day} ${monthNames[salesCalendarMonth]} ${salesCalendarYear}</strong><br>`;
        tooltipHtml += `Daily Sales: <strong>₹${formatNumber(dayData.sales)}</strong>`;
        
        if (dayData.bookings.length > 0) {
            tooltipHtml += `<hr style="margin: 6px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.25);">`;
            tooltipHtml += dayData.bookings.map(b => {
                const roomNames = b.rooms ? b.rooms.map(r => r.name).join(', ') : (b.roomName || 'Room');
                return `• ${b.guestName} (${roomNames}): ₹${formatNumber(getBookingTotal(b))}`;
            }).join('<br>');
        } else {
            tooltipHtml += `<br><span style="opacity: 0.6; font-size: 10px;">No check-ins on this day</span>`;
        }
        
        const dayHtml = `
            <div class="${cellClass}" style="${cellStyle}">
                <div class="revenue-calendar-day-num">${day}</div>
                <div class="revenue-calendar-day-sales" style="${hasSales && parseFloat(dayData.sales/maxSales) > 0.6 ? 'color: #ffffff' : ''}">${salesText}</div>
                <div class="revenue-calendar-tooltip">${tooltipHtml}</div>
            </div>
        `;
        grid.innerHTML += dayHtml;
    }
}
