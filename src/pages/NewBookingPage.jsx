import { useCallback, useEffect, useRef, useState } from 'react';
import { data, findRoom, useStoreVersion } from '../store/store.js';
import { useUI } from '../ui/UIContext.jsx';
import { capitalizeFirst, formatNumber, getCurrentTimeValue, getLocalISODate, toDisplayTime } from '../lib/format.js';
import { calculateSurchargedRate } from '../lib/bookingCalc.js';
import { getIdProofInputRules, normalizeIdInputLive, validateBookingIdProof } from '../lib/idProof.js';
import { createBooking } from '../services/bookings.js';
import { MAX_UPLOAD_BYTES, readImageFile } from '../services/photos.js';
import CameraCapture from '../components/CameraCapture.jsx';
import LodgeView from '../components/LodgeView.jsx';

const EMPTY_FORM = {
    guestName: '', guestPhone: '', guestEmail: '',
    maleCount: '1', femaleCount: '0', childrenCount: '0',
    checkIn: '', checkOut: '',
    checkInTimeMode: 'manual', checkInTime: '', checkOutTimeMode: 'manual', checkOutTime: '',
    idProofType: '', idProofNumber: '',
    vehicleNumber: '', companyName: '', guestGST: '',
    paymentMethod: '', bookingSource: '', roomRate: '', advance: '0', recommendedBy: '',
    extras: '0', extraBed: '0'
};

// Typed details survive navigating away and back (room selection and photos are reset, as before)
let draft = { ...EMPTY_FORM };

function initialForm() {
    const form = { ...draft };
    const today = getLocalISODate();
    if (!form.checkIn) form.checkIn = today;
    if (!form.checkOut) form.checkOut = today;
    form.checkInTime = form.checkInTimeMode === 'current' ? getCurrentTimeValue() : (form.checkInTime || '12:00');
    form.checkOutTime = form.checkOutTimeMode === 'current' ? getCurrentTimeValue() : (form.checkOutTime || '10:00');
    return form;
}

const toSelection = room => ({ roomId: room.id, roomName: room.name, floor: room.floor, price: room.price });
const byRoomName = (first, second) => String(first.name).localeCompare(String(second.name), undefined, { numeric: true });

// Tap-to-pick room tiles grouped by floor; only available rooms can be picked
function RoomTiles({ selection, onToggle }) {
    const floors = [...new Set(data.rooms.map(room => room.floor))].sort((a, b) => a - b);
    return (
        <div className="room-tile-floors" id="bookingRoomTiles">
            {floors.map(floor => (
                <div className="room-tile-floor" key={floor}>
                    <span className="room-tile-floor-label">Floor {floor}</span>
                    <div className="room-tiles">
                        {data.rooms.filter(room => room.floor === floor).sort(byRoomName).map(room => {
                            const selected = selection.some(r => r.roomId === room.id);
                            const free = room.status === 'available';
                            return (
                                <button key={room.id} type="button" className={`room-tile ${room.status} ${selected ? 'selected' : ''}`}
                                    disabled={!free && !selected} aria-pressed={selected} onClick={() => onToggle(room.id)}>
                                    <span className="room-tile-check"><i className="fas fa-check" /></span>
                                    <span><strong>{room.name}</strong><small>{capitalizeFirst(room.type)} · {room.capacity} <i className="fas fa-user" /></small></span>
                                    <span className="room-tile-price">{free ? `₹${formatNumber(room.price)}` : capitalizeFirst(room.status)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CaptureCard({ title, kind, photo, emptyIcon, emptyText, captureIcon, onCapture, onUpload }) {
    const fileRef = useRef(null);
    return (
        <div className="capture-card">
            <h5>{title}</h5>
            <div className="capture-preview" id={`${kind}PhotoPreviewWrap`} style={{ height: 120, borderRadius: 'var(--radius-sm)' }}>
                {photo
                    ? <img id={`${kind}PhotoPreview`} src={photo} alt={title} style={{ display: 'block' }} />
                    : <span id={`${kind}PhotoEmpty`}><i className={`fas ${emptyIcon}`} /> {emptyText}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" className="btn-primary capture-btn" onClick={onCapture} style={{ flex: 1 }}>
                    <i className={`fas ${captureIcon}`} /> Capture
                </button>
                <button type="button" className="btn-primary capture-btn" style={{ flex: 1, background: 'var(--info, #3B82F6)' }} onClick={() => fileRef.current?.click()}>
                    <i className="fas fa-upload" /> Upload
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { onUpload(e.target.files[0]); e.target.value = ''; }} />
            </div>
        </div>
    );
}

export default function NewBookingPage() {
    useStoreVersion();
    const { navigate } = useUI();
    const [form, setForm] = useState(initialForm);
    const [selection, setSelection] = useState([]);
    const [photos, setPhotos] = useState({ customer: '', idProof: '' });
    const cameraRef = useRef(null);
    const rateInputRef = useRef(null);

    useEffect(() => { draft = form; }, [form]);

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const bind = key => ({ value: form[key], onChange: e => set(key, e.target.value) });

    const hasAvailableRoom = data.rooms.some(room => room.status === 'available');
    const idRules = getIdProofInputRules(form.idProofType);
    const totalRate = selection.reduce((sum, room) => sum + room.price, 0);
    const { roundedRate, surchargeInfo } = calculateSurchargedRate(totalRate, form.checkIn, data.settings || {});

    // Selecting rooms (or changing the check-in day) fills the room rate including surcharges
    useEffect(() => {
        if (selection.length === 0) return;
        setForm(f => ({ ...f, roomRate: String(roundedRate) }));
    }, [selection, form.checkIn, roundedRate]);

    const setTimeMode = (modeKey, timeKey, manualDefault, mode) => {
        setForm(f => ({
            ...f,
            [modeKey]: mode,
            [timeKey]: mode === 'current' ? getCurrentTimeValue() : (f[timeKey] || manualDefault)
        }));
    };

    const removeRoom = roomId => setSelection(current => current.filter(r => r.roomId !== roomId));

    // The first room picked is the primary room; tapping a picked room again removes it
    const toggleRoom = roomId => {
        const id = parseInt(roomId, 10);
        if (selection.some(r => r.roomId === id)) {
            removeRoom(id);
            return;
        }
        const room = findRoom(id);
        if (!room || room.status !== 'available') {
            alert('Selected room is no longer available');
            return;
        }
        setSelection(current => [...current, toSelection(room)]);
    };

    const onCameraReady = useCallback(api => { cameraRef.current = api; }, []);

    const capturePhoto = kind => {
        const image = cameraRef.current?.capture();
        if (!image) return;
        setPhotos(p => ({ ...p, [kind]: image }));
        alert(kind === 'customer' ? 'Customer photo captured successfully' : 'ID proof photo captured successfully');
    };

    const uploadPhoto = async (kind, file) => {
        try {
            const image = await readImageFile(file, { maxBytes: MAX_UPLOAD_BYTES });
            setPhotos(p => ({ ...p, [kind]: image }));
            alert(kind === 'customer' ? 'Customer photo uploaded successfully' : 'ID proof photo uploaded successfully');
        } catch (e) { /* message already shown */ }
    };

    const handleSubmit = e => {
        e.preventDefault();
        const f = { ...form };
        if (f.checkInTimeMode === 'current') f.checkInTime = getCurrentTimeValue();
        if (f.checkOutTimeMode === 'current') f.checkOutTime = getCurrentTimeValue();

        const guestName = f.guestName.trim();
        const guestPhone = f.guestPhone.trim();
        const idProofNumberRaw = f.idProofNumber.trim();
        const manualRoomRate = parseFloat(f.roomRate || '0');

        if (selection.length === 0) {
            alert('Please select at least one room');
            return;
        }
        if (!guestName || !guestPhone || !f.idProofType || !idProofNumberRaw || !f.checkIn || !f.checkOut || !f.paymentMethod) {
            alert('Please fill in all required booking details');
            return;
        }
        if (!manualRoomRate || manualRoomRate <= 0) {
            alert('Please enter the Room Fare / Rate. This field is required.');
            rateInputRef.current?.focus();
            return;
        }
        const idProof = validateBookingIdProof(f.idProofType, idProofNumberRaw);
        if (!idProof.valid) {
            alert(idProof.message);
            return;
        }
        if (!photos.customer || !photos.idProof) {
            alert('Please capture both customer photo and ID proof photo before creating booking');
            return;
        }
        if (new Date(f.checkOut) < new Date(f.checkIn)) {
            alert('Check-out date cannot be before check-in date');
            return;
        }

        const booking = createBooking({
            guestName,
            guestPhone,
            guestEmail: f.guestEmail.trim(),
            idProofType: f.idProofType,
            checkIn: f.checkIn,
            checkInTime: toDisplayTime(f.checkInTime),
            checkOut: f.checkOut,
            checkOutTime: toDisplayTime(f.checkOutTime),
            paymentMethod: f.paymentMethod,
            roomRate: manualRoomRate,
            advance: parseFloat(f.advance || '0'),
            extras: parseFloat(f.extras || '0'),
            extraBed: parseFloat(f.extraBed || '0'),
            maleCount: parseInt(f.maleCount || '1', 10),
            femaleCount: parseInt(f.femaleCount || '0', 10),
            childrenCount: parseInt(f.childrenCount || '0', 10),
            vehicleNumber: f.vehicleNumber.trim(),
            companyName: f.companyName.trim(),
            guestGST: f.guestGST.trim().toUpperCase(),
            bookingSource: f.paymentMethod === 'Online' ? f.bookingSource : '',
            recommendedBy: f.recommendedBy.trim(),
            customerPhoto: photos.customer,
            idProofPhoto: photos.idProof
        }, selection, idProof.normalized);

        if (!booking) {
            // Rooms were taken meanwhile: refresh the selection as the page reload did before
            setSelection([]);
            return;
        }

        const names = booking.rooms.map(r => r.roomName);
        const roomsList = names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0];
        draft = { ...EMPTY_FORM };
        cameraRef.current?.stop();
        alert(`Booking ${booking.id} created successfully for ${names.length} room(s): ${roomsList}`);
        navigate('bookings');
    };

    const goBack = () => {
        cameraRef.current?.stop();
        navigate('bookings');
    };

    return (
        <div id="new-booking" className="page-content active">
            <div className="page-header">
                <h2>Create New Booking</h2>
                <button type="button" className="btn-primary" onClick={goBack}>
                    <i className="fas fa-arrow-left" /> Back to Logs
                </button>
            </div>
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="pricing-info" style={{ marginBottom: 0 }}>
                    <h4>Stay Profiling Instructions</h4>
                    <p>Only rooms currently marked as <strong>Available</strong> can be booked. Multiple rooms can be reserved under a single guest profile.</p>
                </div>
            </div>
            <div className="card">
                <form id="newBookingForm" onSubmit={handleSubmit}>
                    <div className="detail-section">
                        <h4><i className="fas fa-user-circle" /> Guest Profiling</h4>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingGuestName">Guest Name *</label>
                                <input type="text" id="bookingGuestName" required placeholder="Full Name" autoComplete="off" autoCapitalize="characters" {...bind('guestName')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingGuestPhone">Mobile Number *</label>
                                <input type="tel" id="bookingGuestPhone" required placeholder="10-digit mobile phone number" inputMode="tel" autoComplete="off" {...bind('guestPhone')} />
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingGuestEmail">Email Address</label>
                                <input type="email" id="bookingGuestEmail" placeholder="guest@email.com" inputMode="email" autoComplete="off" {...bind('guestEmail')} />
                            </div>
                            <div className="form-group guest-count-group" style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="bookingMaleCount">Male Adults *</label>
                                    <input type="number" id="bookingMaleCount" min="0" required inputMode="numeric" {...bind('maleCount')} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="bookingFemaleCount">Female Adults *</label>
                                    <input type="number" id="bookingFemaleCount" min="0" required inputMode="numeric" {...bind('femaleCount')} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="bookingChildrenCount">Children</label>
                                    <input type="number" id="bookingChildrenCount" min="0" inputMode="numeric" {...bind('childrenCount')} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4><i className="fas fa-bed" /> Room Scheduling &amp; Details</h4>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingCheckIn">Check-in Date *</label>
                                <input type="date" id="bookingCheckIn" required {...bind('checkIn')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingCheckOut">Check-out Date *</label>
                                <input type="date" id="bookingCheckOut" required {...bind('checkOut')} />
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            {[
                                ['Check-in Time *', 'checkInTimeMode', 'checkInTime', '12:00', 'bookingCheckInTime'],
                                ['Check-out Time *', 'checkOutTimeMode', 'checkOutTime', '10:00', 'bookingCheckOutTime']
                            ].map(([label, modeKey, timeKey, manualDefault, inputId]) => (
                                <div className="form-group" key={timeKey}>
                                    <label htmlFor={inputId}>{label}</label>
                                    <select id={`${inputId}Mode`} style={{ marginBottom: 6 }} value={form[modeKey]}
                                        onChange={e => setTimeMode(modeKey, timeKey, manualDefault, e.target.value)}>
                                        <option value="manual">Enter manually</option>
                                        <option value="current">Current local time</option>
                                    </select>
                                    <input type="time" id={inputId} required readOnly={form[modeKey] === 'current'}
                                        style={form[modeKey] === 'current' ? { backgroundColor: '#eef7f5' } : undefined}
                                        {...bind(timeKey)} />
                                </div>
                            ))}
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Tap Available Rooms *</label>
                            <LodgeView className="booking-lodge" mode="select" activeIds={selection.map(r => r.roomId)} onPick={toggleRoom} />
                            <RoomTiles selection={selection} onToggle={toggleRoom} />
                            {!hasAvailableRoom && selection.length === 0 && (
                                <small style={{ display: 'block', color: 'var(--danger)', fontWeight: 700, marginBottom: 12 }}>No rooms available</small>
                            )}
                            <div style={{ background: 'var(--surface-muted)', padding: 15, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Assigned Rooms Selection</span>
                                    {selection.length > 1 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary)' }}>{selection.length} rooms</span>}
                                </div>
                                <div id="selectedRoomsDisplay">
                                    {selection.length === 0 ? (
                                        <small style={{ color: 'var(--text-light)' }}>Tap a room above to add it. Tap more rooms to book them for the same guest.</small>
                                    ) : (
                                        <>
                                            {selection.map((room, idx) => (
                                                <div key={room.roomId} className="selected-room-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'var(--bg-card)', marginBottom: 6, borderRadius: 4, borderLeft: '3px solid var(--secondary)' }}>
                                                    <div>
                                                        <strong>{room.roomName}</strong>{' '}
                                                        <span style={{ color: 'var(--text-light)', fontSize: 11 }}>(Floor {room.floor})</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>₹{formatNumber(room.price)}</div>
                                                        {idx > 0 ? (
                                                            <button type="button" className="btn-primary" style={{ padding: '2px 6px', fontSize: 10, background: '#E74C3C', marginTop: 2 }} onClick={() => removeRoom(room.roomId)}>
                                                                <i className="fas fa-trash" /> Remove
                                                            </button>
                                                        ) : <small style={{ color: 'var(--text-light)' }}>Primary</small>}
                                                    </div>
                                                </div>
                                            ))}
                                            <div style={{ padding: 8, background: 'var(--bg-card)', borderRadius: 4, borderTop: '2px solid var(--secondary)', marginTop: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                    <span><strong>Base Rate:</strong></span>
                                                    <span style={{ fontWeight: 600 }}>₹{formatNumber(totalRate)}</span>
                                                </div>
                                                {surchargeInfo.length > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>
                                                        <span>Surcharges:</span>
                                                        <span>+ ₹{formatNumber(roundedRate - totalRate)}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', marginTop: 4, paddingTop: 4, fontSize: 14 }}>
                                                    <span><strong>Final Rate:</strong></span>
                                                    <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>₹{formatNumber(roundedRate)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4><i className="fas fa-id-card" /> Identity Documentation</h4>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingIdProofType">ID Proof Type *</label>
                                <select id="bookingIdProofType" required value={form.idProofType}
                                    onChange={e => set('idProofType', e.target.value)}>
                                    <option value="">Choose verification document</option>
                                    <option value="Aadhar Card">Aadhar Card</option>
                                    <option value="Driving License">Driving License</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Voter ID">Voter ID</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingIdProofNumber">ID Card Number *</label>
                                <input type="text" id="bookingIdProofNumber" required autoComplete="off"
                                    placeholder={idRules.placeholder || 'Verification document number'} maxLength={idRules.maxLength}
                                    inputMode={form.idProofType === 'Aadhar Card' ? 'numeric' : 'text'}
                                    value={form.idProofNumber} onChange={e => set('idProofNumber', normalizeIdInputLive(form.idProofType, e.target.value))} />
                                <small id="bookingIdProofHint" style={{ color: 'var(--text-light)', fontSize: 11, display: 'block', marginTop: 4 }}>{idRules.hint}</small>
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingVehicleNumber">Vehicle License Plate</label>
                                <input type="text" id="bookingVehicleNumber" placeholder="e.g., TN-43-A-1234" autoCapitalize="characters" {...bind('vehicleNumber')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingCompanyName">Business / Company Name</label>
                                <input type="text" id="bookingCompanyName" placeholder="Corporate billing reference" {...bind('companyName')} />
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingGuestGST">Guest GST Number (Optional)</label>
                                <input type="text" id="bookingGuestGST" placeholder="15-character GSTIN format" maxLength={15} autoCapitalize="characters" {...bind('guestGST')} />
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4><i className="fas fa-wallet" /> Payments &amp; Tariffs</h4>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingPaymentMethod">Payment Method *</label>
                                <select id="bookingPaymentMethod" required value={form.paymentMethod}
                                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value, bookingSource: e.target.value === 'Online' ? f.bookingSource : '' }))}>
                                    <option value="">Select payment method</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Credit/Debit Card</option>
                                    <option value="UPI">UPI Payment</option>
                                    <option value="Net Banking">Net Banking</option>
                                    <option value="Online">Online OTA Booking</option>
                                </select>
                            </div>
                            {form.paymentMethod === 'Online' && (
                                <div className="form-group" id="onlineBookingSourceGroup">
                                    <label htmlFor="bookingSource">Booking Channel *</label>
                                    <select id="bookingSource" required {...bind('bookingSource')}>
                                        <option value="">Select Booking Platform</option>
                                        <option value="MMT">MakeMyTrip</option>
                                        <option value="Goibibo">Goibibo</option>
                                        <option value="Booking.com">Booking.com</option>
                                        <option value="Agoda">Agoda</option>
                                        <option value="Other">Other Channel</option>
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label htmlFor="bookingRoomRate">Room Rate / Fare per night (₹) *</label>
                                <input ref={rateInputRef} type="number" id="bookingRoomRate" min="0" required placeholder="Enter tariff amount" inputMode="decimal" {...bind('roomRate')} />
                                {selection.length > 0 && surchargeInfo.length > 0 && (
                                    <small id="bookingSurgeNotice" style={{ display: 'block', color: 'var(--warning)', fontWeight: 'bold', marginTop: 4 }}>
                                        ⚡ Surcharges applied: {surchargeInfo.join(' & ')}
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingAdvance">Advance Payment Collected (₹)</label>
                                <input type="number" id="bookingAdvance" min="0" inputMode="decimal" {...bind('advance')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingRecommendedBy">Recommended By</label>
                                <input type="text" id="bookingRecommendedBy" placeholder="e.g. Friend, Agent name, Website" {...bind('recommendedBy')} />
                            </div>
                        </div>
                        <div className="form-row" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label htmlFor="bookingExtras">Extras Tariff (₹)</label>
                                <input type="number" id="bookingExtras" min="0" inputMode="decimal" {...bind('extras')} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bookingExtraBed">Extra Bed Tariff (₹)</label>
                                <input type="number" id="bookingExtraBed" min="0" inputMode="decimal" {...bind('extraBed')} />
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4><i className="fas fa-camera" /> Live Photo Verification Feed</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>Webcam integration is required to record photo verification details of both the guest profile and physical ID document.</p>
                        <div className="camera-verification-grid">
                            <CameraCapture onReady={onCameraReady} />
                            <div className="camera-cards-grid">
                                <CaptureCard title="Guest Portrait Profile" kind="customer" photo={photos.customer} emptyIcon="fa-user-tag" emptyText="Profile empty"
                                    captureIcon="fa-camera" onCapture={() => capturePhoto('customer')} onUpload={file => uploadPhoto('customer', file)} />
                                <CaptureCard title="ID Proof Scan" kind="idProof" photo={photos.idProof} emptyIcon="fa-id-card-clip" emptyText="ID proof empty"
                                    captureIcon="fa-id-card" onCapture={() => capturePhoto('idProof')} onUpload={file => uploadPhoto('idProof', file)} />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="btn-login" style={{ width: '100%', marginTop: 20, padding: 15, fontSize: 15 }}>Book Stay and Check-In</button>
                </form>
            </div>
        </div>
    );
}
