import { data, useStoreVersion } from '../store/store.js';
import Modal from '../components/Modal.jsx';
import { useUI } from '../ui/UIContext.jsx';
import { useBookingActions } from '../ui/useBookingActions.js';
import { ACTIVE_STATUSES, getBookingTotal } from '../lib/bookingCalc.js';
import { formatDate, formatDateTime, formatNumber, getInitials } from '../lib/format.js';

// Guest profile drawer
export default function GuestDetailsModal({ guestName, onClose }) {
    useStoreVersion();
    const { navigate, openModal } = useUI();
    const actions = useBookingActions();
    const guest = data.guests.find(item => item.name === guestName);
    if (!guest) return null;

    const bookings = data.bookings
        .filter(b => b.guestName === guest.name || b.guestPhone === guest.phone)
        .sort((a, b) => new Date(b.checkIn || 0) - new Date(a.checkIn || 0));
    const activeBooking = bookings.find(b => ACTIVE_STATUSES.includes(b.status));
    const latestPhoto = bookings.find(b => b.customerPhotoUrl || b.customerPhoto);
    const photo = latestPhoto?.customerPhotoUrl || latestPhoto?.customerPhoto;
    const totalSpend = bookings.reduce((sum, b) => sum + getBookingTotal(b), 0);

    return (
        <Modal id="guestDetailsModal" onClose={onClose} className="drawer-modal" contentClassName="guest-drawer">
            <div className="modal-header"><span /><button type="button" className="close-btn" onClick={onClose} aria-label="Close guest profile">&times;</button></div>
            <div id="guestDetailsContent">
                <div className="profile-drawer-hero">
                    <div className="guest-avatar guest-avatar-xl">{photo ? <img src={photo} alt={guest.name} /> : <span>{getInitials(guest.name, 'Guest')}</span>}</div>
                    <div>
                        <span className="eyebrow">Guest profile</span>
                        <h2>{guest.name}</h2>
                        <span className={`guest-status ${activeBooking ? 'active' : 'history'}`}><i className="fas fa-circle" /> {activeBooking ? 'Active stay' : 'Returning guest'}</span>
                    </div>
                </div>
                <div className="profile-contact-grid">
                    <div><small>Phone</small><strong>{guest.phone && guest.phone !== 'N/A' ? <a href={`tel:${guest.phone}`}>{guest.phone}</a> : (guest.phone || 'Not recorded')}</strong></div>
                    <div><small>Email</small><strong>{guest.email || 'Not recorded'}</strong></div>
                    <div><small>Visits</small><strong>{guest.visits || bookings.length}</strong></div>
                    <div><small>Total spend</small><strong>₹{formatNumber(totalSpend)}</strong></div>
                </div>
                {activeBooking && (
                    <div className="drawer-callout">
                        <span>Current room</span>
                        <strong>{activeBooking.roomName || activeBooking.roomId}</strong>
                        <small>{formatDateTime(activeBooking.checkIn, activeBooking.checkInTime)} → {formatDateTime(activeBooking.checkOut, activeBooking.checkOutTime)}</small>
                    </div>
                )}
                <section className="profile-drawer-section">
                    <div className="section-heading"><h3>Stay history</h3><span>{bookings.length} record{bookings.length === 1 ? '' : 's'}</span></div>
                    <div className="guest-timeline">
                        {bookings.length === 0 ? <div className="empty-state">No stay history recorded.</div> : bookings.slice(0, 5).map(b => (
                            <div className="guest-timeline-item" key={b.id}>
                                <span className="timeline-dot" />
                                <div>
                                    <strong>{b.status === 'completed' ? 'Checked out' : 'Stay recorded'} {b.roomName || b.roomId || ''}</strong>
                                    <small>{formatDate(b.actualCheckOutDate || b.checkOut || b.checkIn)} · ₹{formatNumber(getBookingTotal(b))}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <div className="drawer-actions">
                    {activeBooking
                        ? <button type="button" className="btn-primary" onClick={() => { onClose(); actions.checkout(activeBooking.id); }}><i className="fas fa-right-from-bracket" /> Check out</button>
                        : <button type="button" className="btn-primary" onClick={() => { onClose(); navigate('new-booking'); }}><i className="fas fa-calendar-plus" /> New reservation</button>}
                    <button type="button" className="btn-secondary" onClick={() => { onClose(); openModal('guestPhotoHistory', { guestName: guest.name, guestPhone: guest.phone }); }}>
                        <i className="fas fa-camera" /> View documents
                    </button>
                </div>
            </div>
        </Modal>
    );
}
