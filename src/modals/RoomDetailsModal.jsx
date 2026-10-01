import { findRoom, useStoreVersion } from '../store/store.js';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { useBookingActions } from '../ui/useBookingActions.js';
import { capitalizeFirst, formatDateTime, formatNumber } from '../lib/format.js';
import { getBookingBalance, getBookingTotal } from '../lib/bookingCalc.js';
import { getActiveBookingForRoom, updateRoomStatus } from '../services/rooms.js';
import { getGuestProfile } from '../services/guests.js';

const STATUS_BUTTONS = [
    ['available', '#27AE60', 'fa-check-circle', 'Available'],
    ['occupied', '#E74C3C', 'fa-bed', 'Occupied'],
    ['cleaning', '#F39C12', 'fa-broom', 'Cleaning'],
    ['maintenance', '#95A5A6', 'fa-tools', 'Maintenance']
];

function Detail({ label, value, highlight }) {
    return (
        <div className="detail-item">
            <div className="detail-label-text">{label}</div>
            <div className={`detail-text ${highlight ? 'highlight' : ''}`}>{value}</div>
        </div>
    );
}

export default function RoomDetailsModal({ roomId, onClose }) {
    useStoreVersion();
    const actions = useBookingActions();
    const room = findRoom(roomId);
    if (!room) return null;

    const booking = getActiveBookingForRoom(room.id);
    const guestProfile = booking ? getGuestProfile(booking) : null;

    return (
        <Modal id="roomDetailsModal" onClose={onClose} contentClassName="customer-modal-large">
            <div style={{ marginBottom: 10 }}><ModalHeader title="Room Console Details" onClose={onClose} /></div>
            <div id="roomDetailsContent">
                <div className="customer-detail-header">
                    <div className="customer-photo">
                        <div className="customer-photo-frame">{room.name}</div>
                        <div className="customer-photo-label">Room {room.id}</div>
                    </div>
                    <div className="customer-info-header">
                        <h2>{room.name}</h2>
                        <div>
                            <span className="customer-id-badge">Floor {room.floor}</span>
                            <span className={`customer-status-tag ${room.status === 'occupied' ? 'previous' : 'new'}`}>{capitalizeFirst(room.status)}</span>
                        </div>
                        <div className="customer-quick-info">
                            {[
                                ['fa-bed', 'Room Type', capitalizeFirst(room.type)],
                                ['fa-users', 'Capacity', `${room.capacity} Guests`],
                                ['fa-tag', 'Room Rate', `₹${formatNumber(room.price)}`],
                                ['fa-circle', 'Current Status', capitalizeFirst(room.status)]
                            ].map(([icon, label, value]) => (
                                <div className="info-item" key={label}>
                                    <div className="info-icon"><i className={`fas ${icon}`} /></div>
                                    <div className="info-content"><h4>{label}</h4><p>{value}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {!booking ? (
                    <>
                        <div className="detail-section">
                            <h4><i className="fas fa-door-open" /> Occupancy Details</h4>
                            <Detail label="Current Occupant" value="No guest is currently assigned to this room." />
                        </div>
                        <div className="detail-section">
                            <h4><i className="fas fa-magic" /> Manage Room Status</h4>
                            <div className="modal-actions receptionist-only room-status-actions" style={{ marginTop: 10, paddingTop: 0, borderTop: 'none', gap: 10, display: 'flex', flexWrap: 'wrap' }}>
                                {STATUS_BUTTONS.map(([status, color, icon, label]) => (
                                    <button key={status} type="button" className="btn-primary" style={{ background: color, flex: 1 }} onClick={() => updateRoomStatus(room.id, status)}>
                                        <i className={`fas ${icon}`} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="detail-section">
                            <h4><i className="fas fa-bolt" /> Quick Actions</h4>
                            <div className="modal-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                                <button type="button" className="btn-primary receptionist-only" onClick={() => actions.extra(booking.id, room.id)}>
                                    <i className="fas fa-plus" /> Add Extra Amount
                                </button>
                                <button type="button" className="btn-primary" onClick={() => actions.receipt(booking.id)}>
                                    <i className="fas fa-receipt" /> View Bill
                                </button>
                            </div>
                        </div>
                        <div className="detail-section">
                            <h4><i className="fas fa-user" /> Occupant Details</h4>
                            <div className="detail-grid">
                                <Detail label="Guest Name" value={booking.guestName} highlight />
                                <Detail label="Booking ID" value={booking.id} />
                                <Detail label="Mobile" value={guestProfile.phone !== 'N/A' ? <a href={`tel:${guestProfile.phone}`}>{guestProfile.phone}</a> : guestProfile.phone} />
                                <Detail label="Email" value={guestProfile.email} />
                                <Detail label="Address" value={guestProfile.address} />
                                <Detail label="Payment Method" value={booking.paymentMethod || 'Not specified'} />
                                <Detail label="Check-in" value={formatDateTime(booking.checkIn, booking.checkInTime)} />
                                <Detail label="Check-out" value={formatDateTime(booking.checkOut, booking.checkOutTime)} />
                            </div>
                        </div>
                        <div className="detail-section">
                            <h4><i className="fas fa-money-bill-wave" /> Billing Details</h4>
                            <div className="detail-grid">
                                <Detail label="Room Amount" value={`₹${formatNumber(booking.roomRate)}`} highlight />
                                <Detail label="Advance Paid" value={`₹${formatNumber(booking.advance)}`} />
                                <Detail label="Extra Amount" value={`₹${formatNumber(booking.extras || 0)}`} />
                                <Detail label="Balance Due" value={`₹${formatNumber(getBookingBalance(booking))}`} />
                                <Detail label="Total Amount" value={`₹${formatNumber(getBookingTotal(booking))}`} highlight />
                                <Detail label="Booking Status" value={capitalizeFirst(booking.status)} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
