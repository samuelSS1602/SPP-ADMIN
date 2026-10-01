import { capitalizeFirst, formatDate, formatNumber, getInitials, getRoomsDisplay } from '../lib/format.js';
import { getBookingBalance, getBookingTotal } from '../lib/bookingCalc.js';
import LazyPhoto from './LazyPhoto.jsx';

export function bookingSearchText(booking) {
    return [
        booking.guestName, booking.id, booking.guestPhone, booking.status,
        getRoomsDisplay(booking, { withCount: true }), formatDate(booking.checkIn), formatDate(booking.checkOut),
        booking.checkInTime, booking.checkOutTime, `₹${formatNumber(getBookingTotal(booking))}`
    ].join(' ').toLowerCase();
}

// One booking as a CRM-style card. Actions and their role classes match the original exactly.
export default function BookingCard({ booking, actions, noAnimation }) {
    const id = booking.id;
    const total = getBookingTotal(booking);
    const balance = getBookingBalance(booking);
    const advance = Number(booking.advance) || 0;
    const photo = booking.customerPhoto || booking.customerPhotoUrl;
    const guestName = booking.guestName || 'Guest';
    const due = balance > 0 && booking.status !== 'cancelled';
    const stop = handler => e => { e.stopPropagation(); handler(); };

    let stateActions;
    if (booking.status === 'cancelled') {
        stateActions = (
            <>
                <button className="btn-secondary compact-action booking-state-pill cancelled" type="button" disabled><i className="fas fa-ban" /> Cancelled</button>
                <button className="guest-icon-action booking-danger-action owner-only" type="button" onClick={stop(() => actions.remove(id))} title="Delete booking" aria-label="Delete booking"><i className="fas fa-trash" /></button>
            </>
        );
    } else if (booking.status === 'completed') {
        stateActions = (
            <>
                <button className="btn-secondary compact-action booking-state-pill completed" type="button" disabled><i className="fas fa-check" /> Checked out</button>
                <button className="btn-secondary compact-action owner-only" type="button" onClick={stop(() => actions.edit(id))} title="Edit booking"><i className="fas fa-edit" /> Edit</button>
                <button className="guest-icon-action booking-danger-action owner-only" type="button" onClick={stop(() => actions.remove(id))} title="Delete booking" aria-label="Delete booking"><i className="fas fa-trash" /></button>
            </>
        );
    } else {
        stateActions = (
            <>
                <button className="btn-primary compact-action checkout-action receptionist-only" type="button" onClick={stop(() => actions.checkout(id))} title="Checkout"><i className="fas fa-sign-out-alt" /> Check out</button>
                <button className="btn-secondary compact-action owner-only" type="button" onClick={stop(() => actions.edit(id))} title="Edit booking"><i className="fas fa-edit" /> Edit</button>
                <button className="guest-icon-action booking-danger-action receptionist-only" type="button" onClick={stop(() => actions.cancel(id))} title="Cancel booking" aria-label="Cancel booking"><i className="fas fa-times" /></button>
            </>
        );
    }

    return (
        <article
            className={`guest-card booking-card status-${booking.status} ${noAnimation ? 'no-enter-animation' : ''}`}
            onClick={() => actions.receipt(id)}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') actions.receipt(id); }}
            aria-label={`Booking ${id} for ${guestName}`}
        >
            <div className="guest-card-head">
                <div className="guest-avatar guest-avatar-large">{photo ? <LazyPhoto src={photo} alt={guestName} /> : <span>{getInitials(guestName)}</span>}</div>
                <div className="guest-card-title">
                    <div><h3>{guestName}</h3><span className={`status-badge ${booking.status}`}>{capitalizeFirst(booking.status || '')}</span></div>
                    <span className="guest-contact"><i className="fas fa-hashtag" /> {id}</span>
                    <span className="guest-contact"><i className="fas fa-phone" /> {booking.guestPhone ? <a href={`tel:${booking.guestPhone}`} onClick={e => e.stopPropagation()}>{booking.guestPhone}</a> : 'No phone'}</span>
                </div>
                <button className="guest-more" type="button" onClick={stop(() => actions.receipt(id))} title="Receipt" aria-label="Open receipt"><i className="fas fa-receipt" /></button>
            </div>
            <div className="guest-stay-strip booking-stay-strip">
                <span><small>Room</small><strong>{getRoomsDisplay(booking, { withCount: true })}</strong></span>
                <span><small>Check-in</small><strong>{formatDate(booking.checkIn)}</strong>{booking.checkInTime && <small>{booking.checkInTime}</small>}</span>
                <span><small>Check-out</small><strong>{formatDate(booking.checkOut)}</strong>{booking.checkOutTime && <small>{booking.checkOutTime}</small>}</span>
            </div>
            <div className="guest-card-stats">
                <div><small>Total</small><strong>₹{formatNumber(total)}</strong></div>
                <div><small>Advance</small><strong>₹{formatNumber(advance)}</strong></div>
                <div><small>Payment</small><strong className={due ? 'payment-due' : 'payment-clear'}>{due ? `₹${formatNumber(balance)} due` : 'Settled'}</strong></div>
            </div>
            <div className="guest-card-actions">
                {stateActions}
                <button className="btn-secondary compact-action" type="button" onClick={stop(() => actions.receipt(id))} title="Receipt"><i className="fas fa-receipt" /> Receipt</button>
                {photo && <button className="guest-icon-action" type="button" onClick={stop(() => actions.photos(id))} title="Photos" aria-label="View photos"><i className="fas fa-camera" /></button>}
            </div>
        </article>
    );
}


