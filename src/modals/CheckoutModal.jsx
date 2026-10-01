import { useState } from 'react';
import { findBooking, useStoreVersion } from '../store/store.js';
import Modal from '../components/Modal.jsx';
import { formatDateTime, formatNumber, getInitials } from '../lib/format.js';
import { confirmCheckout, getCheckoutSummary } from '../services/bookings.js';

export default function CheckoutModal({ bookingId, onClose }) {
    useStoreVersion();
    const booking = findBooking(bookingId);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    if (!booking) return null;

    const s = getCheckoutSummary(booking);
    const roomsDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(room => room.roomName).join(', ')
        : (booking.roomName || booking.roomId || 'Unassigned');

    const confirm = () => {
        confirmCheckout(booking.id, paymentMethod);
        onClose();
    };

    return (
        <Modal id="checkoutModal" onClose={onClose} closeOnBackdrop={false} contentClassName="checkout-modal-content" labelledBy="checkoutModalTitle">
            <div className="modal-header">
                <div>
                    <span className="eyebrow">Front desk action</span>
                    <h3 id="checkoutModalTitle">Confirm check-out</h3>
                </div>
                <button className="close-btn" type="button" onClick={onClose} aria-label="Close checkout dialog">&times;</button>
            </div>
            <div id="checkoutModalBody">
                <div className="checkout-guest-summary">
                    <div className="checkout-guest-avatar">{getInitials(booking.guestName)}</div>
                    <div><span className="eyebrow">Guest</span><h4>{booking.guestName}</h4><p>{roomsDisplay} · {booking.id}</p></div>
                </div>
                <div className="checkout-facts">
                    <div><small>Check-in</small><strong>{formatDateTime(booking.checkIn, booking.checkInTime)}</strong></div>
                    <div><small>Expected check-out</small><strong>{formatDateTime(booking.checkOut, booking.checkOutTime)}</strong></div>
                    <div><small>Total nights</small><strong>{s.nights}</strong></div>
                </div>
                <div className="checkout-line-items">
                    <div><span>Room charges</span><strong>₹{formatNumber(s.roomCharges)}</strong></div>
                    <div><span>Additional charges</span><strong>₹{formatNumber(s.additionalCharges)}</strong></div>
                    <div><span>Discount</span><strong>- ₹{formatNumber(s.discount)}</strong></div>
                    <div><span>Tax / GST</span><strong>₹{formatNumber(s.tax)}</strong></div>
                    <div className="checkout-total"><span>Grand total</span><strong>₹{formatNumber(s.grandTotal)}</strong></div>
                    <div className="checkout-paid"><span>Paid</span><strong>₹{formatNumber(s.paid)}</strong></div>
                    <div className="checkout-balance"><span>Balance due</span><strong>₹{formatNumber(s.balance)}</strong></div>
                </div>
                <label className="checkout-payment-select">Payment method
                    <select id="checkoutPaymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                    </select>
                </label>
            </div>
            <div className="checkout-confirmation"><i className="fas fa-circle-info" /> Confirming checkout preserves this guest&apos;s stay history and releases the room for the next reservation.</div>
            <div className="modal-actions checkout-modal-actions">
                <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                <button className="btn-primary checkout-confirm-btn" type="button" onClick={confirm}><i className="fas fa-check" /> Confirm check-out</button>
            </div>
        </Modal>
    );
}
