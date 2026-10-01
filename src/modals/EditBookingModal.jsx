import { useState } from 'react';
import { data, findBooking, findRoom } from '../store/store.js';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { displayTimeToInput, toDisplayTime } from '../lib/format.js';
import { saveEditedBooking } from '../services/bookings.js';

function AddRoomModal({ rooms, onConfirm, onClose }) {
    const [roomId, setRoomId] = useState('');
    const availableRooms = data.rooms.filter(room =>
        (room.status === 'available' || room.status === 'cleaning') && !rooms.some(r => r.roomId === room.id));

    const confirm = () => {
        const id = parseInt(roomId, 10);
        if (!id) {
            alert('Please select a room.');
            return;
        }
        const room = findRoom(id);
        if (room) {
            onConfirm({ roomId: room.id, roomName: room.name, floor: room.floor, price: room.price });
            onClose();
        }
    };

    return (
        <Modal id="editAddRoomModal" onClose={onClose} closeOnBackdrop={false} contentStyle={{ maxWidth: 400 }}>
            <ModalHeader title="Assign Additional Room" onClose={onClose} />
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="editAddRoomSelect">Available Rooms</label>
                <select id="editAddRoomSelect" value={roomId} onChange={e => setRoomId(e.target.value)}>
                    <option value="">-- Select a room --</option>
                    {availableRooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name} ({room.type}) - Floor {room.floor} - ₹{room.price}</option>
                    ))}
                </select>
            </div>
            <button type="button" className="btn-primary" onClick={confirm} style={{ width: '100%', marginTop: 15, justifyContent: 'center' }}>Confirm Room Assignment</button>
        </Modal>
    );
}

function initialValues(booking) {
    return {
        guestName: booking.guestName || '',
        guestPhone: booking.guestPhone || '',
        guestEmail: booking.guestEmail || '',
        advance: String(booking.advance || 0),
        roomRate: String(booking.roomRate || 0),
        extras: String(booking.extras || 0),
        extraBed: String(booking.extraBed || 0),
        maleCount: String(booking.maleCount !== undefined ? booking.maleCount : (booking.adultsCount || 1)),
        femaleCount: String(booking.femaleCount || 0),
        childrenCount: String(booking.childrenCount !== undefined ? booking.childrenCount : 0),
        vehicleNumber: booking.vehicleNumber || '',
        companyName: booking.companyName || '',
        guestGST: booking.guestGST || '',
        recommendedBy: booking.recommendedBy || '',
        paymentMethod: booking.paymentMethod || 'Cash',
        bookingSource: booking.bookingSource || '',
        checkIn: booking.checkIn || '',
        checkInTime: displayTimeToInput(booking.checkInTime),
        checkOut: booking.checkOut || '',
        checkOutTime: displayTimeToInput(booking.checkOutTime)
    };
}

function initialRooms(booking) {
    if (booking.rooms && booking.rooms.length > 0) return JSON.parse(JSON.stringify(booking.rooms));
    if (booking.roomId) return [{ roomId: booking.roomId, roomName: booking.roomName, floor: booking.floor, price: booking.roomRate || 0 }];
    return [];
}

// Numbers may be typed with thousands separators
function parseNumberInput(value) {
    const n = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isNaN(n) ? 0 : n;
}

export default function EditBookingModal({ bookingId, onClose }) {
    const booking = findBooking(bookingId);
    const [form, setForm] = useState(() => (booking ? initialValues(booking) : null));
    const [rooms, setRooms] = useState(() => (booking ? initialRooms(booking) : []));
    const [addRoomOpen, setAddRoomOpen] = useState(false);
    if (!booking || !form) return null;

    const bind = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

    const removeRoom = roomId => {
        if (rooms.length <= 1) {
            alert('Cannot remove the last room. A booking must have at least one room.');
            return;
        }
        const room = rooms.find(r => r.roomId === roomId);
        if (room) setForm(f => ({ ...f, roomRate: String(Math.max(0, (parseFloat(f.roomRate) || 0) - room.price)) }));
        setRooms(rs => rs.filter(r => r.roomId !== roomId));
    };

    const openAddRoom = () => {
        const anyAvailable = data.rooms.some(room => (room.status === 'available' || room.status === 'cleaning') && !rooms.some(r => r.roomId === room.id));
        if (!anyAvailable) {
            alert('No additional rooms available.');
            return;
        }
        setAddRoomOpen(true);
    };

    const addRoom = room => {
        setRooms(rs => [...rs, room]);
        setForm(f => ({ ...f, roomRate: String((parseFloat(f.roomRate) || 0) + room.price) }));
    };

    const save = () => {
        const maleCount = parseInt(form.maleCount, 10) || 0;
        const femaleCount = parseInt(form.femaleCount, 10) || 0;
        const ok = saveEditedBooking(booking.id, rooms, {
            guestName: form.guestName.trim(),
            guestPhone: form.guestPhone.trim(),
            guestEmail: form.guestEmail.trim(),
            advance: parseNumberInput(form.advance),
            roomRate: parseNumberInput(form.roomRate),
            extras: parseNumberInput(form.extras),
            extraBed: parseNumberInput(form.extraBed),
            maleCount,
            femaleCount,
            childrenCount: parseInt(form.childrenCount, 10) || 0,
            vehicleNumber: form.vehicleNumber.trim(),
            companyName: form.companyName.trim(),
            guestGST: form.guestGST.trim().toUpperCase(),
            recommendedBy: form.recommendedBy.trim(),
            paymentMethod: form.paymentMethod,
            bookingSource: form.bookingSource,
            checkIn: form.checkIn,
            checkInTime: toDisplayTime(form.checkInTime),
            checkOut: form.checkOut,
            checkOutTime: toDisplayTime(form.checkOutTime)
        });
        if (ok) onClose();
    };

    return (
        <>
            <Modal id="editBookingModal" onClose={onClose} closeOnBackdrop={false}>
                <div className="modal-header">
                    <h3>Edit Booking Specifications</h3>
                    <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><i className="fas fa-times" /></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editGuestName">Guest Name</label><input type="text" id="editGuestName" {...bind('guestName')} /></div>
                        <div className="form-group"><label htmlFor="editGuestPhone">Phone Number</label><input type="tel" id="editGuestPhone" inputMode="tel" {...bind('guestPhone')} /></div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editGuestEmail">Email Address</label><input type="email" id="editGuestEmail" inputMode="email" {...bind('guestEmail')} /></div>
                        <div className="form-group"><label htmlFor="editAdvanceAmount">Advance Amount (₹)</label><input type="number" id="editAdvanceAmount" min="0" inputMode="decimal" {...bind('advance')} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ margin: 0 }}>Assigned Room(s)</label>
                            <button type="button" className="btn-primary" onClick={openAddRoom} style={{ padding: '3px 6px', fontSize: 10 }}>
                                <i className="fas fa-plus" /> Add Room
                            </button>
                        </div>
                        <div id="editRoomsList" style={{ background: 'var(--surface-muted)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                            {rooms.length === 0 ? <small style={{ color: 'var(--text-light)' }}>No rooms assigned.</small> : rooms.map(r => (
                                <div key={r.roomId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <span><strong>{r.roomName}</strong> <small>(Floor {r.floor})</small></span>
                                    <button type="button" className="btn-primary" style={{ padding: '2px 6px', fontSize: 10, background: '#ef4444' }} onClick={() => removeRoom(r.roomId)}>
                                        <i className="fas fa-times" /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editRoomRate">Total Room Rate (₹)</label><input type="number" id="editRoomRate" min="0" inputMode="decimal" {...bind('roomRate')} /></div>
                        <div className="form-group"><label htmlFor="editExtras">Extra Amount (₹)</label><input type="number" id="editExtras" min="0" inputMode="decimal" {...bind('extras')} /></div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group" style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}><label htmlFor="editMaleCount">Male Adults</label><input type="number" id="editMaleCount" min="0" inputMode="numeric" {...bind('maleCount')} /></div>
                            <div style={{ flex: 1 }}><label htmlFor="editFemaleCount">Female Adults</label><input type="number" id="editFemaleCount" min="0" inputMode="numeric" {...bind('femaleCount')} /></div>
                        </div>
                        <div className="form-group"><label htmlFor="editChildrenCount">Children</label><input type="number" id="editChildrenCount" min="0" inputMode="numeric" {...bind('childrenCount')} /></div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editExtraBed">Extra Bed Charges (₹)</label><input type="number" id="editExtraBed" min="0" inputMode="decimal" {...bind('extraBed')} /></div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editVehicleNumber">Vehicle Number</label><input type="text" id="editVehicleNumber" {...bind('vehicleNumber')} /></div>
                        <div className="form-group"><label htmlFor="editCompanyName">Company Name</label><input type="text" id="editCompanyName" {...bind('companyName')} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                        <label htmlFor="editGuestGST">Guest GST Number</label><input type="text" id="editGuestGST" maxLength={15} {...bind('guestGST')} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                        <label htmlFor="editRecommendedBy">Recommended By</label><input type="text" id="editRecommendedBy" placeholder="e.g. Friend, Agent name, Website" {...bind('recommendedBy')} />
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group">
                            <label htmlFor="editPaymentMethod">Payment Method</label>
                            <select id="editPaymentMethod" {...bind('paymentMethod')}>
                                <option value="Cash">Cash</option>
                                <option value="Card">Credit/Debit Card</option>
                                <option value="UPI">UPI Payment</option>
                                <option value="Net Banking">Net Banking</option>
                                <option value="Online">Online OTA Booking</option>
                            </select>
                        </div>
                        {form.paymentMethod === 'Online' && (
                            <div className="form-group" id="editOnlineBookingSourceGroup">
                                <label htmlFor="editBookingSource">Booking Channel</label>
                                <select id="editBookingSource" {...bind('bookingSource')}>
                                    <option value="">Select Platform</option>
                                    <option value="MMT">MakeMyTrip</option>
                                    <option value="Goibibo">Goibibo</option>
                                    <option value="Booking.com">Booking.com</option>
                                    <option value="Agoda">Agoda</option>
                                    <option value="Other">Other Channel</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editCheckInDate">Check-in Date</label><input type="date" id="editCheckInDate" {...bind('checkIn')} /></div>
                        <div className="form-group"><label htmlFor="editCheckInTime">Check-in Time</label><input type="time" id="editCheckInTime" {...bind('checkInTime')} /></div>
                    </div>
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <div className="form-group"><label htmlFor="editCheckOutDate">Check-out Date</label><input type="date" id="editCheckOutDate" {...bind('checkOut')} /></div>
                        <div className="form-group"><label htmlFor="editCheckOutTime">Check-out Time</label><input type="time" id="editCheckOutTime" {...bind('checkOutTime')} /></div>
                    </div>
                    <button type="button" className="btn-primary" onClick={save} style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12 }}>Save Booking Specifications</button>
                </div>
            </Modal>
            {addRoomOpen && <AddRoomModal rooms={rooms} onConfirm={addRoom} onClose={() => setAddRoomOpen(false)} />}
        </>
    );
}
