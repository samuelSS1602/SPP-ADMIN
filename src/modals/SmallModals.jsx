import { useState } from 'react';
import { findBooking, findRoom } from '../store/store.js';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { formatNumber } from '../lib/format.js';
import { addExtraAmount } from '../services/bookings.js';
import { updateRoomPrice } from '../services/rooms.js';
import { changePassword } from '../services/auth.js';

export function PriceModal({ roomId, initialPrice = '', onClose }) {
    const room = findRoom(roomId);
    const [price, setPrice] = useState(String(initialPrice));
    const [saving, setSaving] = useState(false);
    if (!room) return null;

    const submit = async () => {
        setSaving(true);
        const ok = await updateRoomPrice(room.id, parseFloat(price));
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <Modal id="priceModal" onClose={onClose} contentStyle={{ maxWidth: 400 }}>
            <ModalHeader title="Change Room Price" onClose={onClose} />
            <div className="form-group" style={{ marginBottom: 12 }}><label>Selected Room: <strong id="roomNameDisplay">{room.name}</strong></label></div>
            <div className="form-group" style={{ marginBottom: 12 }}><label>Current Price: <strong id="currentPriceDisplay">₹{formatNumber(room.price)}</strong></label></div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="newPriceInput">New Price (₹)</label>
                <input type="number" id="newPriceInput" placeholder="Enter new price" min="100" inputMode="numeric" autoFocus
                    value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            </div>
            <button type="button" className="btn-primary" onClick={submit} disabled={saving} style={{ width: '100%', marginTop: 15, justifyContent: 'center' }}>Update Price</button>
        </Modal>
    );
}

export function ExtraAmountModal({ bookingId, onClose }) {
    const booking = findBooking(bookingId);
    const [amount, setAmount] = useState('');
    if (!booking) return null;

    const submit = () => {
        if (addExtraAmount(booking.id, parseFloat(amount))) onClose();
    };

    return (
        <Modal id="extraAmountModal" onClose={onClose} contentStyle={{ maxWidth: 400 }}>
            <ModalHeader title="Add Extra Miscellaneous Tariff" onClose={onClose} />
            <div className="form-group" style={{ marginBottom: 12 }}><label>Invoice: <strong id="extraInvoiceDisplay">INV-{booking.id}</strong></label></div>
            <div className="form-group" style={{ marginBottom: 12 }}><label>Current Extras: <strong id="currentExtraDisplay">₹{formatNumber(booking.extras || 0)}</strong></label></div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="extraAmountInput">Extra Amount to Add (₹)</label>
                <input type="number" id="extraAmountInput" placeholder="Enter amount to add" min="1" inputMode="decimal" autoFocus
                    value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            </div>
            <button type="button" className="btn-primary" onClick={submit} style={{ width: '100%', marginTop: 15, justifyContent: 'center' }}>Confirm Extra Charge</button>
        </Modal>
    );
}

export function ChangePasswordModal({ onClose }) {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [busy, setBusy] = useState(false);
    const bind = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        const ok = await changePassword(form.current, form.next, form.confirm);
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal id="changePasswordModal" onClose={onClose} contentStyle={{ maxWidth: 400 }}>
            <ModalHeader title="Change Access Credentials" onClose={onClose} />
            <form id="changePasswordForm" onSubmit={submit}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label htmlFor="currentPassword">Current Password</label>
                    <input type="password" id="currentPassword" required autoComplete="current-password" {...bind('current')} />
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label htmlFor="newPassword">New Password (min 6 char)</label>
                    <input type="password" id="newPassword" required minLength={6} autoComplete="new-password" {...bind('next')} />
                </div>
                <div className="form-group" style={{ marginBottom: 15 }}>
                    <label htmlFor="confirmNewPassword">Confirm New Password</label>
                    <input type="password" id="confirmNewPassword" required minLength={6} autoComplete="new-password" {...bind('confirm')} />
                </div>
                <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Updating...' : 'Update Credentials'}</button>
            </form>
        </Modal>
    );
}
