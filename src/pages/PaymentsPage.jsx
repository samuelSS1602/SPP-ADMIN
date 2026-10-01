import { useState } from 'react';
import { data, useStoreVersion } from '../store/store.js';
import { usePersistentState, useUI } from '../ui/UIContext.jsx';
import { useBookingActions } from '../ui/useBookingActions.js';
import { calculateBookingDays, getBookingBalance, getBookingTotal, isBookingFullyPaid } from '../lib/bookingCalc.js';
import { capitalizeFirst, formatDate, formatNumber } from '../lib/format.js';
import { getGSTFilteredBookings, gstPresetRange, printGSTBills } from '../services/reports.js';
import { useScrollRevealCount } from '../components/hooks.js';

// One row per booking with its tariff, GST (5% = 2.5% CGST + 2.5% SGST) and balance
function buildPaymentRows() {
    const totals = { revenue: 0, pending: 0, received: 0, tariff: 0, gst: 0 };
    const rows = data.bookings.map(booking => {
        const netTariff = Math.max(0, (Number(booking.roomRate) || 0) * calculateBookingDays(booking) - (Number(booking.discount) || 0));
        const gstAmount = Math.round(netTariff * 0.05);
        const total = getBookingTotal(booking);
        const fullyPaid = isBookingFullyPaid(booking);
        const pendingAmount = fullyPaid ? 0 : getBookingBalance(booking);

        totals.revenue += total;
        totals.pending += pendingAmount;
        totals.received += total - pendingAmount;
        totals.tariff += netTariff;
        totals.gst += gstAmount;

        return {
            booking,
            roomDisplayName: (booking.rooms && booking.rooms.length > 0) ? booking.rooms.map(r => r.roomName).join(', ') : (booking.roomName || 'N/A'),
            netTariff,
            gstAmount,
            extras: Number(booking.extras) || 0,
            total,
            advance: Number(booking.advance) || 0,
            pendingAmount,
            statusBadge: fullyPaid ? 'paid' : 'pending',
            paymentMethod: booking.paymentMethod || 'Cash'
        };
    });
    return { rows, totals };
}

const SORTERS = {
    newest: (a, b) => (b.booking.checkIn || '').localeCompare(a.booking.checkIn || ''),
    oldest: (a, b) => (a.booking.checkIn || '').localeCompare(b.booking.checkIn || ''),
    'amount-high': (a, b) => b.total - a.total,
    'amount-low': (a, b) => a.total - b.total,
    'guest-az': (a, b) => String(a.booking.guestName || '').localeCompare(String(b.booking.guestName || ''))
};

const GST_PILLS = [
    ['all', 'fa-layer-group', 'All Methods'],
    ['Online', 'fa-globe', 'Online Only'],
    ['UPI', 'fa-mobile-alt', 'UPI Only'],
    ['Cash', 'fa-money-bill-wave', 'Cash Only'],
    ['except-online', 'fa-ban', 'Except Online']
];

function GstPrintSection() {
    useStoreVersion();
    const [methodFilter, setMethodFilter] = usePersistentState('gst.method', 'all');
    const [range, setRange] = usePersistentState('gst.range', { from: '', to: '' });
    const [touched, setTouched] = useState(false);
    const matched = getGSTFilteredBookings(methodFilter, range.from, range.to);

    const update = fn => { setTouched(true); fn(); };

    return (
        <div className="gst-print-section" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <i className="fas fa-print" style={{ fontSize: 20, color: '#16a34a' }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#14532d' }}>GST Bill Printout</h4>
                <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>Filter &amp; print invoices for GST filing</span>
            </div>
            <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>Filter by Payment Method</label>
                <div className="gst-filter-pills" id="gstFilterPills">
                    {GST_PILLS.map(([key, icon, label]) => (
                        <button key={key} type="button" className={`gst-pill ${methodFilter === key ? 'active' : ''}`} data-filter={key} onClick={() => update(() => setMethodFilter(key))}>
                            <i className={`fas ${icon}`} /> {label}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                    <label htmlFor="gstPrintFromDate" style={{ fontSize: 11, fontWeight: 600 }}>From Date</label>
                    <input type="date" id="gstPrintFromDate" style={{ height: 38, padding: '0 10px' }} value={range.from}
                        onChange={e => update(() => setRange(r => ({ ...r, from: e.target.value })))} />
                </div>
                <div className="gst-date-arrow" style={{ display: 'flex', alignItems: 'center', paddingBottom: 4 }}><i className="fas fa-arrow-right" style={{ color: '#9ca3af' }} /></div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                    <label htmlFor="gstPrintToDate" style={{ fontSize: 11, fontWeight: 600 }}>To Date</label>
                    <input type="date" id="gstPrintToDate" style={{ height: 38, padding: '0 10px' }} value={range.to}
                        onChange={e => update(() => setRange(r => ({ ...r, to: e.target.value })))} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 2 }}>
                    {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([key, label]) => (
                        <button key={key} type="button" className="preset-btn" style={{ fontSize: 10, padding: '6px 10px' }}
                            onClick={() => update(() => setRange(gstPresetRange(key)))}>{label}</button>
                    ))}
                </div>
            </div>
            <div className="gst-print-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px dashed #bbf7d0' }}>
                <div id="gstPrintRecordCount" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    <i className="fas fa-file-invoice" style={{ color: '#16a34a' }} />{' '}
                    {touched
                        ? <span><strong>{matched.length}</strong> bill{matched.length !== 1 ? 's' : ''} matched</span>
                        : <span>Select filters to see matching bills</span>}
                </div>
                <button type="button" className="btn-primary" onClick={() => printGSTBills(matched)} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', padding: '10px 20px', fontSize: 13, gap: 8 }}>
                    <i className="fas fa-print" /> Print GST Bills
                </button>
            </div>
        </div>
    );
}

export default function PaymentsPage() {
    useStoreVersion();
    const { globalSearch } = useUI();
    const actions = useBookingActions();
    const [search, setSearch] = usePersistentState('payments.search', '');
    const [statusFilter, setStatusFilter] = usePersistentState('payments.status', 'all');
    const [methodFilter, setMethodFilter] = usePersistentState('payments.method', 'all');
    const [sortBy, setSortBy] = usePersistentState('payments.sort', 'newest');

    const { rows, totals } = buildPaymentRows();
    const searchVal = search.toLowerCase();
    const headerQuery = globalSearch.trim().toLowerCase();
    const filtered = rows.filter(r => {
        const matchSearch = !searchVal || String(r.booking.guestName || '').toLowerCase().includes(searchVal) || String(r.booking.id || '').toLowerCase().includes(searchVal);
        const matchHeader = !headerQuery || `inv-${r.booking.id} ${r.booking.guestName} ${r.roomDisplayName} ${r.paymentMethod} ${r.statusBadge}`.toLowerCase().includes(headerQuery);
        return matchSearch && matchHeader && (statusFilter === 'all' || r.statusBadge === statusFilter) && (methodFilter === 'all' || r.paymentMethod === methodFilter);
    }).sort(SORTERS[sortBy] || (() => 0));

    const [visible, sentinelRef] = useScrollRevealCount(filtered.length, { first: 50, step: 100, resetKey: `${searchVal}|${headerQuery}|${statusFilter}|${methodFilter}|${sortBy}` });

    const summary = [
        ['Total Revenue (Gross)', 'var(--secondary)', undefined, 'paymentTotalRevenue', totals.revenue],
        ['Pending Balance Due', 'var(--warning)', 'var(--warning)', 'paymentPendingBalance', totals.pending],
        ['Total Cash / Received', 'var(--success)', 'var(--success)', 'paymentReceivedAmount', totals.received],
        ['Total Room Tariff', '#8B5CF6', '#8B5CF6', 'paymentTotalTariff', totals.tariff],
        ['Total GST Collected (5%)', '#F59E0B', '#F59E0B', 'paymentTotalGST', totals.gst]
    ];

    return (
        <div id="payments" className="page-content owner-only active">
            <div className="page-header">
                <h2>Payments &amp; GST Ledger</h2>
            </div>
            <div className="payment-summary">
                {summary.map(([label, border, color, id, value]) => (
                    <div className="payment-card" key={id} style={{ borderLeftColor: border }}>
                        <h4>{label}</h4>
                        <p className="payment-amount" style={color ? { color } : undefined} id={id}>₹{formatNumber(value)}</p>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="card-header">
                    <h3>Lodge Guest Invoices &amp; Billing Records</h3>
                </div>
                <div className="payments-filters" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                        <input type="search" id="paymentSearchInput" placeholder="Search by guest name or invoice..." style={{ height: 40, padding: '0 12px' }}
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ width: 160, marginBottom: 0 }}>
                        <select id="paymentStatusFilter" style={{ height: 40, padding: '0 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Payment status">
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
                        <select id="paymentMethodFilter" style={{ height: 40, padding: '0 12px' }} value={methodFilter} onChange={e => setMethodFilter(e.target.value)} aria-label="Payment method">
                            <option value="all">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Net Banking">Net Banking</option>
                            <option value="Online">Online (OTA)</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
                        <select id="paymentSortBy" style={{ height: 40, padding: '0 12px' }} value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort">
                            <option value="newest">Sort: Newest First</option>
                            <option value="oldest">Sort: Oldest First</option>
                            <option value="amount-high">Sort: Amount High→Low</option>
                            <option value="amount-low">Sort: Amount Low→High</option>
                            <option value="guest-az">Sort: Guest A→Z</option>
                        </select>
                    </div>
                </div>

                <GstPrintSection />

                <div className="data-table-container">
                    <table className="data-table responsive-table payments-table">
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Guest Name</th>
                                <th>Room(s)</th>
                                <th>Check-In</th>
                                <th>Method</th>
                                <th>Room Tariff (₹)</th>
                                <th>GST 5% (₹)</th>
                                <th>Extras (₹)</th>
                                <th>Total (₹)</th>
                                <th>Advance (₹)</th>
                                <th>Balance (₹)</th>
                                <th>Status</th>
                                <th>Add Extra</th>
                                <th>Tax Bill</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTable">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={14} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No matching invoices found</td></tr>
                            ) : filtered.slice(0, visible).map(r => (
                                <tr key={r.booking.id}>
                                    <td data-label="Invoice"><strong>INV-{r.booking.id}</strong></td>
                                    <td data-label="Guest">{r.booking.guestName}</td>
                                    <td data-label="Room(s)">{r.roomDisplayName}</td>
                                    <td data-label="Check-In">{formatDate(r.booking.checkIn)}</td>
                                    <td data-label="Method">{r.paymentMethod}</td>
                                    <td data-label="Room Tariff">₹{formatNumber(r.netTariff)}</td>
                                    <td data-label="GST 5%">₹{formatNumber(r.gstAmount)}</td>
                                    <td data-label="Extras">₹{formatNumber(r.extras)}</td>
                                    <td data-label="Total"><strong>₹{formatNumber(r.total)}</strong></td>
                                    <td data-label="Advance">₹{formatNumber(r.advance)}</td>
                                    <td data-label="Balance" style={{ color: r.pendingAmount > 0 ? 'var(--warning)' : 'var(--success)' }}>₹{formatNumber(r.pendingAmount)}</td>
                                    <td data-label="Status"><span className={`status-badge ${r.statusBadge}`}>{capitalizeFirst(r.statusBadge)}</span></td>
                                    <td data-label="Add Extra" className="receptionist-cell">
                                        <button type="button" className="btn-primary receptionist-only" onClick={() => actions.extra(r.booking.id)} style={{ padding: '6px 10px', fontSize: 11 }}><i className="fas fa-plus" /> Extra</button>
                                    </td>
                                    <td data-label="Tax Bill">
                                        <button type="button" className="btn-primary" onClick={() => actions.receipt(r.booking.id)} style={{ padding: '6px 12px', fontSize: 11 }} aria-label={`Tax bill for ${r.booking.id}`}><i className="fas fa-download" /></button>
                                    </td>
                                </tr>
                            ))}
                            {visible < filtered.length && (
                                <tr className="table-load-more" ref={sentinelRef}>
                                    <td colSpan={14}><i className="fas fa-circle-notch fa-spin" /> Loading more invoices…</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
