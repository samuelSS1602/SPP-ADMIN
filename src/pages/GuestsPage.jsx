import { data, useStoreVersion } from '../store/store.js';
import { usePersistentState, useUI } from '../ui/UIContext.jsx';
import { useBookingActions } from '../ui/useBookingActions.js';
import { ACTIVE_STATUSES, getBookingBalance, getBookingTotal } from '../lib/bookingCalc.js';
import { formatDate, formatNumber, getInitials } from '../lib/format.js';
import LazyPhoto from '../components/LazyPhoto.jsx';
import { useProgressiveCount } from '../components/hooks.js';

const FIRST_PAINT = 24;

// Guests with their bookings, active stays first then most recent visit
function buildGuestRows(search) {
    const activeGuestNames = new Set(data.bookings.filter(b => ACTIVE_STATUSES.includes(b.status)).map(b => b.guestName));
    const existingBookingIds = new Set(data.bookings.map(b => b.id));
    const indexBy = key => {
        const index = new Map();
        data.bookings.forEach((booking, i) => {
            const value = booking[key];
            if (!index.has(value)) index.set(value, []);
            index.get(value).push(i);
        });
        return index;
    };
    const byName = indexBy('guestName');
    const byPhone = indexBy('guestPhone');
    const bookingsForGuest = guest => {
        const indexes = new Set([...(byName.get(guest.name) || []), ...(byPhone.get(guest.phone) || [])]);
        return [...indexes].sort((a, b) => a - b).map(i => data.bookings[i]);
    };
    const lastVisitTime = guest => new Date(guest.lastVisit || 0).getTime();

    const rows = [];
    [...data.guests].sort((first, second) => {
        const firstActive = activeGuestNames.has(first.name);
        const secondActive = activeGuestNames.has(second.name);
        return Number(secondActive) - Number(firstActive) || lastVisitTime(second) - lastVisitTime(first);
    }).forEach(guest => {
        const guestBookings = bookingsForGuest(guest);
        // Repair a lastBookingId that points at a deleted/renumbered booking
        if (guest.lastBookingId && !existingBookingIds.has(guest.lastBookingId)) {
            guest.lastBookingId = guestBookings[guestBookings.length - 1]?.id || null;
        }
        const searchable = `${guest.name} ${guest.phone} ${guest.email}`.toLowerCase();
        if (search && !searchable.includes(search)) return;
        const activeBooking = guestBookings.find(b => ACTIVE_STATUSES.includes(b.status));
        rows.push({ guest, guestBookings, activeBooking, latestBooking: activeBooking || guestBookings[guestBookings.length - 1] });
    });
    return rows;
}

function GuestCard({ row, noAnimation, actions, onProfile, onPhotos, onNewBooking }) {
    const { guest, guestBookings, activeBooking, latestBooking } = row;
    const photo = latestBooking?.customerPhotoUrl || latestBooking?.customerPhoto;
    const totalSpend = guestBookings.reduce((sum, b) => sum + Number(getBookingTotal(b) || 0), 0);
    const roomName = latestBooking ? (latestBooking.rooms?.[0]?.roomName || latestBooking.roomName || latestBooking.roomId || 'Assigned') : 'No active room';
    const balance = latestBooking ? getBookingBalance(latestBooking) : 0;
    const stop = handler => e => { e.stopPropagation(); handler(); };

    return (
        <article className={`guest-card ${noAnimation ? 'no-enter-animation' : ''}`} onClick={() => onProfile(guest.name)} tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onProfile(guest.name); }}>
            <div className="guest-card-head">
                <div className="guest-avatar guest-avatar-large">{photo ? <LazyPhoto src={photo} alt={guest.name} /> : <span>{getInitials(guest.name, 'Guest')}</span>}</div>
                <div className="guest-card-title">
                    <div><h3>{guest.name}</h3><span className={`guest-status ${activeBooking ? 'active' : 'history'}`}><i className="fas fa-circle" /> {activeBooking ? 'Active stay' : 'History'}</span></div>
                    <span className="guest-contact"><i className="fas fa-phone" /> {guest.phone && guest.phone !== 'N/A' ? <a href={`tel:${guest.phone}`} onClick={e => e.stopPropagation()}>{guest.phone}</a> : (guest.phone || 'No phone')}</span>
                    <span className="guest-contact"><i className="fas fa-envelope" /> {guest.email || 'No email'}</span>
                </div>
                <button className="guest-more" type="button" onClick={stop(() => onProfile(guest.name))} aria-label="View guest profile"><i className="fas fa-arrow-up-right-from-square" /></button>
            </div>
            <div className="guest-stay-strip">
                <span><small>Room</small><strong>{roomName}</strong></span>
                <span><small>Stay period</small><strong>{latestBooking ? `${formatDate(latestBooking.checkIn)} - ${formatDate(latestBooking.checkOut)}` : formatDate(guest.lastVisit)}</strong></span>
            </div>
            <div className="guest-card-stats">
                <div><small>Visits</small><strong>{guest.visits || guestBookings.length}</strong></div>
                <div><small>Total spend</small><strong>₹{formatNumber(totalSpend)}</strong></div>
                <div><small>Payment</small><strong className={balance > 0 ? 'payment-due' : 'payment-clear'}>{balance > 0 ? `₹${formatNumber(balance)} due` : 'Settled'}</strong></div>
            </div>
            <div className="guest-card-actions">
                {activeBooking
                    ? <button className="btn-primary compact-action" type="button" onClick={stop(() => actions.checkout(activeBooking.id))}><i className="fas fa-right-from-bracket" /> Check out</button>
                    : <button className="btn-secondary compact-action" type="button" onClick={stop(onNewBooking)}><i className="fas fa-calendar-plus" /> New reservation</button>}
                <button className="btn-secondary compact-action" type="button" onClick={stop(() => onProfile(guest.name))}><i className="fas fa-user" /> View profile</button>
                {guestBookings.length > 0 && (
                    <button className="guest-icon-action" type="button" onClick={stop(() => onPhotos(guest.name, guest.phone))} title="View verification photos" aria-label="View verification photos"><i className="fas fa-camera" /></button>
                )}
            </div>
        </article>
    );
}

export default function GuestsPage() {
    useStoreVersion();
    const { navigate, openModal, globalSearch } = useUI();
    const actions = useBookingActions();
    const [search, setSearch] = usePersistentState('guests.search', '');
    const query = (search || globalSearch).trim().toLowerCase();
    const rows = buildGuestRows(query);
    const visible = useProgressiveCount(rows.length, { first: FIRST_PAINT, step: 60, resetKey: query });

    const onProfile = name => openModal('guestDetails', { guestName: name });
    const onPhotos = (name, phone) => openModal('guestPhotoHistory', { guestName: name, guestPhone: phone });

    return (
        <div id="guests" className="page-content active">
            <div className="page-header">
                <h2>Guests Database CRM</h2>
                <span className="page-kicker"><i className="fas fa-users" /> Guest relationships</span>
            </div>
            <div className="operations-toolbar guest-toolbar">
                <label className="inline-search guest-search"><i className="fas fa-search" />
                    <input id="guestSearchInput" type="search" placeholder="Search guests by name, phone or email" value={search} onChange={e => setSearch(e.target.value)} />
                </label>
                <span className="toolbar-note"><i className="fas fa-clock" /> Active stays appear first</span>
            </div>
            <div className="guest-card-grid" id="guestsTable">
                {rows.length === 0 ? (
                    <div className="empty-state"><i className="fas fa-user-slash" /><h3>No guests found</h3><p>Try a different name, phone number or email.</p></div>
                ) : rows.slice(0, visible).map((row, i) => (
                    <GuestCard key={`${row.guest.name}|${row.guest.phone}|${i}`} row={row} noAnimation={i >= FIRST_PAINT} actions={actions}
                        onProfile={onProfile} onPhotos={onPhotos} onNewBooking={() => navigate('new-booking')} />
                ))}
            </div>
        </div>
    );
}
