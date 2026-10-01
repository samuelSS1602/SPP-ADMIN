import { useState } from 'react';
import { data, useStoreVersion } from '../store/store.js';
import { useUI, usePersistentState } from '../ui/UIContext.jsx';
import { useBookingActions } from '../ui/useBookingActions.js';
import { formatNumber, MONTH_NAMES_FULL, MONTH_NAMES_SHORT, parseBookingDateTime } from '../lib/format.js';
import { getBookingTotal } from '../lib/bookingCalc.js';
import { renumberAllBookings } from '../services/bookings.js';
import BookingCard, { bookingSearchText } from '../components/BookingCard.jsx';
import { useProgressiveCount } from '../components/hooks.js';

const FIRST_PAINT = 24;

function bookingTimestamp(booking) {
    const parsed = parseBookingDateTime(booking.checkIn, booking.checkInTime);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : new Date(booking.createdAt || booking.checkIn || 0).getTime();
}

function MonthSection({ monthIdx, year, bookings, visibleCount, startIndex, actions }) {
    const [collapsed, setCollapsed] = useState(false);
    const monthRevenue = bookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
    const counts = status => bookings.filter(b => b.status === status).length;
    const confirmedCount = counts('confirmed');
    const completedCount = counts('completed');
    const cancelledCount = counts('cancelled');
    const shown = bookings.slice(0, Math.max(0, visibleCount - startIndex));

    return (
        <div className={`month-booking-section ${collapsed ? 'collapsed' : ''}`}>
            <div className="month-section-header" onClick={() => setCollapsed(c => !c)} role="button" tabIndex={0} aria-expanded={!collapsed}
                onKeyDown={e => { if (e.key === 'Enter') setCollapsed(c => !c); }}>
                <div className="month-header-left">
                    <i className="fas fa-chevron-down month-toggle-icon" />
                    <h3><i className="fas fa-calendar-alt" /> {MONTH_NAMES_FULL[monthIdx]} {year}</h3>
                    <span className="month-booking-count">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="month-header-right">
                    <div className="month-stats-chips">
                        {confirmedCount > 0 && <span className="month-chip confirmed"><i className="fas fa-check-circle" /> {confirmedCount}</span>}
                        {completedCount > 0 && <span className="month-chip completed"><i className="fas fa-door-open" /> {completedCount}</span>}
                        {cancelledCount > 0 && <span className="month-chip cancelled"><i className="fas fa-ban" /> {cancelledCount}</span>}
                    </div>
                    <span className="month-revenue owner-only">₹{formatNumber(monthRevenue)}</span>
                </div>
            </div>
            <div className="month-section-body">
                <div className="guest-card-grid booking-card-grid" data-month-grid={monthIdx}>
                    {shown.map((booking, i) => (
                        <BookingCard key={booking.id} booking={booking} actions={actions} noAnimation={startIndex + i >= FIRST_PAINT} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function BookingsPage() {
    useStoreVersion();
    const { navigate, openModal, globalSearch } = useUI();
    const actions = useBookingActions();
    const [year, setYear] = usePersistentState('bookings.year', () => new Date().getFullYear());
    const [month, setMonth] = usePersistentState('bookings.month', 'all');
    const [status, setStatus] = usePersistentState('bookings.status', 'all');
    const query = globalSearch.trim().toLowerCase();

    // Filter by year, month, status (and the header quick search), then group by check-in month, newest first
    const groups = (() => {
        const grouped = {};
        data.bookings.forEach(booking => {
            const d = new Date(booking.checkIn);
            if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) return;
            if (month !== 'all' && d.getMonth() !== month) return;
            if (status !== 'all' && booking.status !== status) return;
            if (query && !bookingSearchText(booking).includes(query)) return;
            (grouped[d.getMonth()] = grouped[d.getMonth()] || []).push(booking);
        });
        return Object.keys(grouped).map(Number).sort((a, b) => b - a).map(monthIdx => ({
            monthIdx,
            bookings: grouped[monthIdx]
                .map(booking => ({ booking, time: bookingTimestamp(booking) }))
                .sort((a, b) => b.time - a.time)
                .map(entry => entry.booking)
        }));
    })();

    const total = groups.reduce((sum, g) => sum + g.bookings.length, 0);
    const filterKey = `${year}|${month}|${status}|${query}`;
    const visibleCount = useProgressiveCount(total, { first: FIRST_PAINT, step: 40, resetKey: filterKey });

    const resetFilters = () => {
        setYear(new Date().getFullYear());
        setMonth('all');
        setStatus('all');
    };

    let runningIndex = 0;

    return (
        <div id="bookings" className="page-content active">
            <div className="page-header">
                <h2>Booking Management</h2>
                <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-primary receptionist-only" onClick={() => navigate('new-booking')}>
                        <i className="fas fa-plus" /> New Booking
                    </button>
                    <button type="button" className="btn-primary owner-only" onClick={() => openModal('allPhotos')} style={{ background: 'var(--secondary)' }}>
                        <i className="fas fa-images" /> View Photo Archive
                    </button>
                    <button type="button" className="btn-primary owner-only" onClick={() => openModal('recoverPhotos')} style={{ background: 'var(--danger)' }}>
                        <i className="fas fa-life-ring" /> Recover Missing Photos
                    </button>
                </div>
            </div>
            <div className="booking-filter-toolbar" id="bookingFilterToolbar">
                <div className="filter-row-top">
                    <div className="filter-year-nav">
                        <button type="button" className="year-nav-btn" onClick={() => setYear(y => y - 1)} title="Previous Year" aria-label="Previous year"><i className="fas fa-chevron-left" /></button>
                        <span className="year-label" id="bookingYearLabel">{year}</span>
                        <button type="button" className="year-nav-btn" onClick={() => setYear(y => y + 1)} title="Next Year" aria-label="Next year"><i className="fas fa-chevron-right" /></button>
                    </div>
                    <div className="filter-status-select">
                        <select id="bookingStatusFilter" value={status} onChange={e => setStatus(e.target.value)} aria-label="Booking status">
                            <option value="all">All Booking Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Checked Out</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button type="button" className="filter-reset-btn" onClick={resetFilters}><i className="fas fa-undo" /> Reset Filters</button>
                    <button type="button" className="filter-reset-btn owner-only" onClick={() => renumberAllBookings()} style={{ background: 'var(--danger)', color: 'white', border: 'none' }}>
                        <i className="fas fa-sort-numeric-down" /> Renumber IDs
                    </button>
                </div>
                <div className="filter-month-pills" id="bookingMonthPills">
                    <button type="button" className={`month-pill ${month === 'all' ? 'active' : ''}`} onClick={() => setMonth('all')}>All Months</button>
                    {MONTH_NAMES_SHORT.map((label, idx) => (
                        <button key={label} type="button" className={`month-pill ${month === idx ? 'active' : ''}`} onClick={() => setMonth(idx)}>{label}</button>
                    ))}
                </div>
            </div>
            <div id="bookingsMonthContainer">
                {groups.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <i className="fas fa-calendar-times" style={{ fontSize: 48, color: 'var(--text-light)', marginBottom: 16 }} />
                        <h3 style={{ color: 'var(--text-light)', marginBottom: 8 }}>No bookings found</h3>
                        <p style={{ color: 'var(--text-light)', fontSize: 14 }}>No bookings match the selected filters for {year}.</p>
                    </div>
                ) : groups.map(group => {
                    const startIndex = runningIndex;
                    runningIndex += group.bookings.length;
                    return (
                        <MonthSection key={`${year}-${group.monthIdx}`} monthIdx={group.monthIdx} year={year} bookings={group.bookings}
                            visibleCount={visibleCount} startIndex={startIndex} actions={actions} />
                    );
                })}
            </div>
        </div>
    );
}
