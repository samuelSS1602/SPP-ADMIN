
function loadPayments() {
    let totalRevenue = 0;
    let totalPending = 0;
    let totalReceived = 0;
    let totalTariff = 0;
    let totalGST = 0;

    // Build enriched payment data for sorting/filtering
    window._paymentRows = data.bookings.map(booking => {
        const days = typeof calculateBookingDays === 'function' ? calculateBookingDays(booking) : 1;
        const roomRate = Number(booking.roomRate) || 0;
        const roomTariff = roomRate * days;
        const discount = Number(booking.discount) || 0;
        const netTariff = Math.max(0, roomTariff - discount);
        const gstAmount = Math.round(netTariff * 0.05);  // 5% GST (2.5% CGST + 2.5% SGST)
        const extras = Number(booking.extras) || 0;
        const extraBed = Number(booking.extraBed) || 0;
        const total = getBookingTotal(booking);
        const balance = getBookingBalance(booking);
        const isFullyPaid = balance <= 0 || booking.status === 'paid' || booking.status === 'completed';
        const statusBadge = isFullyPaid ? 'paid' : 'pending';
        const pendingAmount = isFullyPaid ? 0 : balance;
        const receivedAmount = total - pendingAmount;

        totalRevenue += total;
        totalPending += pendingAmount;
        totalReceived += receivedAmount;
        totalTariff += netTariff;
        totalGST += gstAmount;

        const roomDisplayName = (booking.rooms && booking.rooms.length > 0)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.roomName || 'N/A');

        return {
            booking,
            roomDisplayName,
            netTariff,
            gstAmount,
            extras,
            total,
            advance: Number(booking.advance) || 0,
            pendingAmount,
            statusBadge,
            paymentMethod: booking.paymentMethod || 'Cash'
        };
    });

    // Update summary cards
    const el = id => document.getElementById(id);
    if (el('paymentTotalRevenue')) el('paymentTotalRevenue').textContent = `₹${formatNumber(totalRevenue)}`;
    if (el('paymentPendingBalance')) el('paymentPendingBalance').textContent = `₹${formatNumber(totalPending)}`;
    if (el('paymentReceivedAmount')) el('paymentReceivedAmount').textContent = `₹${formatNumber(totalReceived)}`;
    if (el('paymentTotalTariff')) el('paymentTotalTariff').textContent = `₹${formatNumber(totalTariff)}`;
    if (el('paymentTotalGST')) el('paymentTotalGST').textContent = `₹${formatNumber(totalGST)}`;

    if (isPageVisible('payments')) filterPaymentsTable();
}

function filterPaymentsTable() {
    const rows = window._paymentRows || [];
    const searchVal = (document.getElementById('paymentSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || 'all';
    const methodFilter = document.getElementById('paymentMethodFilter')?.value || 'all';
    const sortBy = document.getElementById('paymentSortBy')?.value || 'newest';

    // Filter
    let filtered = rows.filter(r => {
        const matchSearch = !searchVal || 
            r.booking.guestName.toLowerCase().includes(searchVal) || 
            r.booking.id.toLowerCase().includes(searchVal);
        const matchStatus = statusFilter === 'all' || r.statusBadge === statusFilter;
        const matchMethod = methodFilter === 'all' || r.paymentMethod === methodFilter;
        return matchSearch && matchStatus && matchMethod;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'newest': return (b.booking.checkIn || '').localeCompare(a.booking.checkIn || '');
            case 'oldest': return (a.booking.checkIn || '').localeCompare(b.booking.checkIn || '');
            case 'amount-high': return b.total - a.total;
            case 'amount-low': return a.total - b.total;
            case 'guest-az': return a.booking.guestName.localeCompare(b.booking.guestName);
            default: return 0;
        }
    });

    // Render
    const rowsHtml = filtered.map(r => `<tr>
            <td><strong>INV-${r.booking.id}</strong></td>
            <td>${r.booking.guestName}</td>
            <td>${r.roomDisplayName}</td>
            <td>${formatDate(r.booking.checkIn)}</td>
            <td>${r.paymentMethod}</td>
            <td>₹${formatNumber(r.netTariff)}</td>
            <td>₹${formatNumber(r.gstAmount)}</td>
            <td>₹${formatNumber(r.extras)}</td>
            <td><strong>₹${formatNumber(r.total)}</strong></td>
            <td>₹${formatNumber(r.advance)}</td>
            <td style="color: ${r.pendingAmount > 0 ? 'var(--warning)' : 'var(--success)'}">₹${formatNumber(r.pendingAmount)}</td>
            <td><span class="status-badge ${r.statusBadge}">${capitalizeFirst(r.statusBadge)}</span></td>
            <td><button class="btn-primary receptionist-only" onclick="openExtraAmountModal('${r.booking.id}')" style="padding: 6px 10px; font-size: 11px;"><i class="fas fa-plus"></i> Extra</button></td>
            <td><button class="btn-primary" onclick="showReceipt('${r.booking.id}')" style="padding: 6px 12px; font-size: 11px;"><i class="fas fa-download"></i></button></td>
        </tr>`);

    const tableBody = document.getElementById('paymentsTable');
    if (!tableBody) return;

    const renderToken = ++paymentsTableRenderToken;
    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 24px; color: var(--text-light);">No matching invoices found</td></tr>';
        return;
    }

    // Render the newest rows now and the rest as the user scrolls towards the end of the table.
    // Laying out hundreds of 14-column rows at once froze the page; totals, filters, GST print
    // and exports all use window._paymentRows, not the table, so nothing depends on every row being in the DOM.
    let rendered = 0;
    const sentinel = document.createElement('tr');
    sentinel.className = 'table-load-more';
    sentinel.innerHTML = '<td colspan="14"><i class="fas fa-circle-notch fa-spin"></i> Loading more invoices…</td>';

    const renderMore = () => {
        if (renderToken !== paymentsTableRenderToken) return;
        const batch = rowsHtml.slice(rendered, rendered + (rendered === 0 ? PAYMENT_ROWS_FIRST_PAINT : PAYMENT_ROWS_PER_BATCH));
        rendered += batch.length;
        sentinel.insertAdjacentHTML('beforebegin', batch.join(''));
        if (rendered >= rowsHtml.length) {
            sentinel.remove();
            if (paymentsTableObserver) paymentsTableObserver.disconnect();
        }
    };

    if (paymentsTableObserver) paymentsTableObserver.disconnect();
    tableBody.innerHTML = '';
    tableBody.appendChild(sentinel);
    renderMore();
    if (rendered < rowsHtml.length) {
        if ('IntersectionObserver' in window) {
            paymentsTableObserver = new IntersectionObserver((entries, observer) => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                renderMore();
                // Re-observe so the check runs again: if the sentinel is still in view, load the next batch too
                if (sentinel.isConnected) {
                    observer.unobserve(sentinel);
                    observer.observe(sentinel);
                }
            }, { rootMargin: '800px 0px' });
            paymentsTableObserver.observe(sentinel);
        } else {
            while (rendered < rowsHtml.length) renderMore();
        }
    }
}

const PAYMENT_ROWS_FIRST_PAINT = 50;
const PAYMENT_ROWS_PER_BATCH = 100;
let paymentsTableObserver = null;
let paymentsTableRenderToken = 0;
