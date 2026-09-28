
function loadBookings() {
    const container = document.getElementById('bookingsMonthContainer');
    if (!container || !isPageVisible('bookings')) return;

    // Update year label
    const yearLabel = document.getElementById('bookingYearLabel');
    if (yearLabel) yearLabel.textContent = bookingFilterYear;

    // Get status filter
    const statusFilter = document.getElementById('bookingStatusFilter');
    const statusValue = statusFilter ? statusFilter.value : 'all';

    // Filter bookings by year, month, status
    let filtered = data.bookings.filter(booking => {
        const d = new Date(booking.checkIn);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== bookingFilterYear) return false;
        if (bookingFilterMonth !== 'all' && d.getMonth() !== bookingFilterMonth) return false;
        if (statusValue !== 'all' && booking.status !== statusValue) return false;
        return true;
    });

    // Group by month
    const grouped = {};
    filtered.forEach(booking => {
        const d = new Date(booking.checkIn);
        const monthIdx = d.getMonth();
        if (!grouped[monthIdx]) grouped[monthIdx] = [];
        grouped[monthIdx].push(booking);
    });

    // Sort months descending (most recent first)
    const sortedMonths = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    if (sortedMonths.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-calendar-times" style="font-size: 48px; color: var(--text-light); margin-bottom: 16px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 8px;">No bookings found</h3>
                <p style="color: var(--text-light); font-size: 14px;">No bookings match the selected filters for ${bookingFilterYear}.</p>
            </div>`;
        return;
    }

    // Sort key computed once per booking (the comparator used to re-parse dates on every comparison)
    const bookingTimestamp = booking => {
        const parsed = typeof parseBookingDateTime === 'function'
            ? parseBookingDateTime(booking.checkIn, booking.checkInTime)
            : null;
        return parsed && !Number.isNaN(parsed.getTime())
            ? parsed.getTime()
            : new Date(booking.createdAt || booking.checkIn || 0).getTime();
    };

    // Render the first cards immediately; the rest stream in over the next frames so the page never freezes
    const renderToken = ++bookingListRenderToken;
    const deferredGrids = [];
    let immediateCards = 0;

    let html = '';
    sortedMonths.forEach(monthIdx => {
        const bookings = grouped[monthIdx]
            .map(booking => ({ booking, time: bookingTimestamp(booking) }))
            .sort((first, second) => second.time - first.time)
            .map(entry => entry.booking);
        const monthRevenue = bookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
        const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
        const completedCount = bookings.filter(b => b.status === 'completed').length;
        const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

        html += `<div class="month-booking-section">`;
        html += `<div class="month-section-header" onclick="toggleMonthSection(this)">
            <div class="month-header-left">
                <i class="fas fa-chevron-down month-toggle-icon"></i>
                <h3><i class="fas fa-calendar-alt"></i> ${MONTH_NAMES_FULL[monthIdx]} ${bookingFilterYear}</h3>
                <span class="month-booking-count">${bookings.length} booking${bookings.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="month-header-right">
                <div class="month-stats-chips">
                    ${confirmedCount > 0 ? `<span class="month-chip confirmed"><i class="fas fa-check-circle"></i> ${confirmedCount}</span>` : ''}
                    ${completedCount > 0 ? `<span class="month-chip completed"><i class="fas fa-door-open"></i> ${completedCount}</span>` : ''}
                    ${cancelledCount > 0 ? `<span class="month-chip cancelled"><i class="fas fa-ban"></i> ${cancelledCount}</span>` : ''}
                </div>
                <span class="month-revenue owner-only">₹${formatNumber(monthRevenue)}</span>
            </div>
        </div>`;

        const renderNow = bookings.slice(0, Math.max(0, BOOKING_CARDS_FIRST_PAINT - immediateCards));
        immediateCards += renderNow.length;
        if (renderNow.length < bookings.length) deferredGrids.push({ monthIdx, bookings: bookings.slice(renderNow.length) });

        html += `<div class="month-section-body"><div class="guest-card-grid booking-card-grid" data-month-grid="${monthIdx}">`;
        renderNow.forEach(booking => { html += renderBookingCard(booking); });
        html += `</div></div></div>`;
    });

    container.innerHTML = html;
    hydrateBookingPhotos(container);
    streamRemainingBookingCards(container, deferredGrids, renderToken);
}

const BOOKING_CARDS_FIRST_PAINT = 24;
const BOOKING_CARDS_PER_FRAME = 40;
let bookingListRenderToken = 0;

function streamRemainingBookingCards(container, queue, renderToken) {
    if (queue.length === 0) return;
    requestAnimationFrame(() => {
        // A newer loadBookings() call (filter change, save, navigation) replaced this list
        if (renderToken !== bookingListRenderToken || !container.isConnected) return;

        const next = queue[0];
        const chunk = next.bookings.splice(0, BOOKING_CARDS_PER_FRAME);
        const grid = container.querySelector(`[data-month-grid="${next.monthIdx}"]`);
        if (grid) {
            const temp = document.createElement('div');
            temp.innerHTML = chunk.map(renderBookingCard).join('');
            temp.querySelectorAll('.booking-card').forEach(card => card.classList.add('no-enter-animation'));
            hydrateBookingPhotos(temp);
            grid.append(...temp.children);
        }
        if (next.bookings.length === 0) queue.shift();
        streamRemainingBookingCards(container, queue, renderToken);
    });
}

function escapeBookingText(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// One booking as a CRM-style card. Actions and their role classes match the old table row exactly.
function renderBookingCard(booking) {
    const id = booking.id;
    const total = getBookingTotal(booking);
    const balance = getBookingBalance(booking);
    const advance = Number(booking.advance) || 0;
    const hasPhoto = Boolean(booking.customerPhoto || booking.customerPhotoUrl);
    const guestName = escapeBookingText(booking.guestName || 'Guest');
    const initials = (booking.guestName || 'Guest').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

    const roomDisplayText = booking.rooms && booking.rooms.length > 1
        ? `${booking.rooms.map(r => r.roomName).join(', ')} (${booking.rooms.length} rooms)`
        : (booking.rooms && booking.rooms.length === 1
            ? booking.rooms[0].roomName
            : booking.roomName);

    let actionsHtml = '';
    if (booking.status === 'cancelled') {
        actionsHtml += '<button class="btn-secondary compact-action booking-state-pill cancelled" type="button" disabled><i class="fas fa-ban"></i> Cancelled</button>';
        actionsHtml += `<button class="guest-icon-action booking-danger-action owner-only" type="button" onclick="event.stopPropagation(); deleteBooking('${id}')" title="Delete booking" aria-label="Delete booking"><i class="fas fa-trash"></i></button>`;
    } else if (booking.status === 'completed') {
        actionsHtml += '<button class="btn-secondary compact-action booking-state-pill completed" type="button" disabled><i class="fas fa-check"></i> Checked out</button>';
        actionsHtml += `<button class="btn-secondary compact-action owner-only" type="button" onclick="event.stopPropagation(); openEditBookingModal('${id}')" title="Edit booking"><i class="fas fa-edit"></i> Edit</button>`;
        actionsHtml += `<button class="guest-icon-action booking-danger-action owner-only" type="button" onclick="event.stopPropagation(); deleteBooking('${id}')" title="Delete booking" aria-label="Delete booking"><i class="fas fa-trash"></i></button>`;
    } else {
        actionsHtml += `<button class="btn-primary compact-action checkout-action receptionist-only" type="button" onclick="event.stopPropagation(); checkoutBooking('${id}')" title="Checkout"><i class="fas fa-sign-out-alt"></i> Check out</button>`;
        actionsHtml += `<button class="btn-secondary compact-action owner-only" type="button" onclick="event.stopPropagation(); openEditBookingModal('${id}')" title="Edit booking"><i class="fas fa-edit"></i> Edit</button>`;
        actionsHtml += `<button class="guest-icon-action booking-danger-action receptionist-only" type="button" onclick="event.stopPropagation(); cancelBooking('${id}')" title="Cancel booking" aria-label="Cancel booking"><i class="fas fa-times"></i></button>`;
    }

    return `<article class="guest-card booking-card status-${escapeBookingText(booking.status)}" onclick="showReceipt('${id}')" tabindex="0" onkeydown="if(event.key==='Enter')showReceipt('${id}')" aria-label="Booking ${escapeBookingText(id)} for ${guestName}">
        <div class="guest-card-head">
            <div class="guest-avatar guest-avatar-large">${hasPhoto ? `<img data-photo-booking="${escapeBookingText(id)}" alt="${guestName}" decoding="async">` : `<span>${escapeBookingText(initials)}</span>`}</div>
            <div class="guest-card-title">
                <div><h3>${guestName}</h3><span class="status-badge ${escapeBookingText(booking.status)}">${capitalizeFirst(booking.status || '')}</span></div>
                <span class="guest-contact"><i class="fas fa-hashtag"></i> ${escapeBookingText(id)}</span>
                <span class="guest-contact"><i class="fas fa-phone"></i> ${escapeBookingText(booking.guestPhone || 'No phone')}</span>
            </div>
            <button class="guest-more" type="button" onclick="event.stopPropagation(); showReceipt('${id}')" title="Receipt" aria-label="Open receipt"><i class="fas fa-receipt"></i></button>
        </div>
        <div class="guest-stay-strip booking-stay-strip">
            <span><small>Room</small><strong>${escapeBookingText(roomDisplayText)}</strong></span>
            <span><small>Check-in</small><strong>${formatDate(booking.checkIn)}</strong>${booking.checkInTime ? `<small>${escapeBookingText(booking.checkInTime)}</small>` : ''}</span>
            <span><small>Check-out</small><strong>${formatDate(booking.checkOut)}</strong>${booking.checkOutTime ? `<small>${escapeBookingText(booking.checkOutTime)}</small>` : ''}</span>
        </div>
        <div class="guest-card-stats">
            <div><small>Total</small><strong>₹${formatNumber(total)}</strong></div>
            <div><small>Advance</small><strong>₹${formatNumber(advance)}</strong></div>
            <div><small>Payment</small><strong class="${balance > 0 && booking.status !== 'cancelled' ? 'payment-due' : 'payment-clear'}">${balance > 0 && booking.status !== 'cancelled' ? `₹${formatNumber(balance)} due` : 'Settled'}</strong></div>
        </div>
        <div class="guest-card-actions">
            ${actionsHtml}
            <button class="btn-secondary compact-action" type="button" onclick="event.stopPropagation(); showReceipt('${id}')" title="Receipt"><i class="fas fa-receipt"></i> Receipt</button>
            ${hasPhoto ? `<button class="guest-icon-action" type="button" onclick="event.stopPropagation(); viewBookingPhotos('${id}')" title="Photos" aria-label="View photos"><i class="fas fa-camera"></i></button>` : ''}
        </div>
    </article>`;
}

function changeBookingYear(delta) {
    bookingFilterYear += delta;
    loadBookings();
}

function selectBookingMonth(month, btn) {
    bookingFilterMonth = month;
    document.querySelectorAll('#bookingMonthPills .month-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadBookings();
}

function resetBookingFilters() {
    bookingFilterYear = new Date().getFullYear();
    bookingFilterMonth = 'all';
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) statusFilter.value = 'all';
    document.querySelectorAll('#bookingMonthPills .month-pill').forEach(p => p.classList.remove('active'));
    const allPill = document.querySelector('#bookingMonthPills .month-pill[data-month="all"]');
    if (allPill) allPill.classList.add('active');
    loadBookings();
}

function toggleMonthSection(headerEl) {
    const section = headerEl.closest('.month-booking-section');
    if (!section) return;
    section.classList.toggle('collapsed');
}
