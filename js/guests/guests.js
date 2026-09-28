

function loadGuests() {
    const cards = [];
    const search = (document.getElementById('guestSearchInput')?.value || '').trim().toLowerCase();
    // Lookup tables built once per render (the loop used to rescan every booking per guest and per sort comparison)
    const ACTIVE_STATUSES = ['confirmed', 'pending', 'paid'];
    const activeGuestNames = new Set(data.bookings.filter(b => ACTIVE_STATUSES.includes(b.status)).map(b => b.guestName));
    const existingBookingIds = new Set(data.bookings.map(b => b.id));
    const bookingIndexesBy = key => {
        const index = new Map();
        data.bookings.forEach((booking, i) => {
            const value = booking[key];
            if (!index.has(value)) index.set(value, []);
            index.get(value).push(i);
        });
        return index;
    };
    const indexesByName = bookingIndexesBy('guestName');
    const indexesByPhone = bookingIndexesBy('guestPhone');
    // Same result and order as data.bookings.filter(b => b.guestName === name || b.guestPhone === phone)
    const bookingsForGuest = guest => {
        const indexes = new Set([...(indexesByName.get(guest.name) || []), ...(indexesByPhone.get(guest.phone) || [])]);
        return [...indexes].sort((a, b) => a - b).map(i => data.bookings[i]);
    };
    const lastVisitTime = guest => new Date(guest.lastVisit || 0).getTime();

    [...data.guests].sort((first, second) => {
        const firstActive = activeGuestNames.has(first.name);
        const secondActive = activeGuestNames.has(second.name);
        return Number(secondActive) - Number(firstActive) || lastVisitTime(second) - lastVisitTime(first);
    }).forEach(guest => {
        const guestBookings = bookingsForGuest(guest);

        // Verify if lastBookingId actually exists in data.bookings
        let currentBookingId = guest.lastBookingId;
        const bookingExists = existingBookingIds.has(currentBookingId);

        // If broken reference, repair it with the guest's most recent booking
        if (currentBookingId && !bookingExists) {
            const actualLastBooking = guestBookings[guestBookings.length - 1];

            if (actualLastBooking) {
                guest.lastBookingId = actualLastBooking.id;
                currentBookingId = actualLastBooking.id;
            } else {
                guest.lastBookingId = null;
                currentBookingId = null;
            }
        }

        const activeBooking = guestBookings.find(booking => ['confirmed', 'pending', 'paid'].includes(booking.status));
        const latestBooking = activeBooking || guestBookings[guestBookings.length - 1];
        const searchable = `${guest.name} ${guest.phone} ${guest.email}`.toLowerCase();
        if (search && !searchable.includes(search)) return;
        const hasPhoto = Boolean(latestBooking?.customerPhotoUrl || latestBooking?.customerPhoto);
        const initials = (guest.name || 'Guest').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
        const totalSpend = guestBookings.reduce((sum, booking) => sum + Number(getBookingTotal(booking) || 0), 0);
        const roomName = latestBooking ? ((latestBooking.rooms?.[0]?.roomName || latestBooking.roomName || latestBooking.roomId || 'Assigned')) : 'No active room';
        const status = activeBooking ? 'Active stay' : 'History';
        const photoAction = guestBookings.length > 0 ? `<button class="guest-icon-action" type="button" onclick='event.stopPropagation(); viewGuestBookingPhotos(${JSON.stringify(guest.name)}, ${JSON.stringify(guest.phone)})' title="View verification photos"><i class="fas fa-camera"></i></button>` : '';
        const primaryAction = activeBooking ? `<button class="btn-primary compact-action" type="button" onclick="event.stopPropagation(); checkoutBooking('${activeBooking.id}')"><i class="fas fa-right-from-bracket"></i> Check out</button>` : `<button class="btn-secondary compact-action" type="button" onclick="event.stopPropagation(); openNewBookingPage()"><i class="fas fa-calendar-plus"></i> New reservation</button>`;
        cards.push(`<article class="guest-card" onclick="showGuestDetails(${JSON.stringify(guest.name)})" tabindex="0" onkeydown="if(event.key==='Enter')showGuestDetails(${JSON.stringify(guest.name)})">
            <div class="guest-card-head"><div class="guest-avatar guest-avatar-large">${hasPhoto ? `<img data-photo-booking="${latestBooking.id}" alt="${guest.name}" decoding="async">` : `<span>${initials}</span>`}</div><div class="guest-card-title"><div><h3>${guest.name}</h3><span class="guest-status ${activeBooking ? 'active' : 'history'}"><i class="fas fa-circle"></i> ${status}</span></div><span class="guest-contact"><i class="fas fa-phone"></i> ${guest.phone || 'No phone'}</span><span class="guest-contact"><i class="fas fa-envelope"></i> ${guest.email || 'No email'}</span></div><button class="guest-more" type="button" onclick="event.stopPropagation(); showGuestDetails(${JSON.stringify(guest.name)})" aria-label="View guest profile"><i class="fas fa-arrow-up-right-from-square"></i></button></div>
            <div class="guest-stay-strip"><span><small>Room</small><strong>${roomName}</strong></span><span><small>Stay period</small><strong>${latestBooking ? `${formatDate(latestBooking.checkIn)} - ${formatDate(latestBooking.checkOut)}` : formatDate(guest.lastVisit)}</strong></span></div>
            <div class="guest-card-stats"><div><small>Visits</small><strong>${guest.visits || guestBookings.length}</strong></div><div><small>Total spend</small><strong>₹${formatNumber(totalSpend)}</strong></div><div><small>Payment</small><strong class="${latestBooking && getBookingBalance(latestBooking) > 0 ? 'payment-due' : 'payment-clear'}">${latestBooking && getBookingBalance(latestBooking) > 0 ? `₹${formatNumber(getBookingBalance(latestBooking))} due` : 'Settled'}</strong></div></div>
            <div class="guest-card-actions">${primaryAction}<button class="btn-secondary compact-action" type="button" onclick="event.stopPropagation(); showGuestDetails(${JSON.stringify(guest.name)})"><i class="fas fa-user"></i> View profile</button>${photoAction}</div>
        </article>`);
    });
    const container = document.getElementById('guestsTable');
    if (!container) return;
    const renderToken = ++guestListRenderToken;
    if (cards.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No guests found</h3><p>Try a different name, phone number or email.</p></div>';
        return;
    }

    // First cards paint immediately; the rest stream in over the next frames so typing in search stays smooth
    container.innerHTML = cards.slice(0, GUEST_CARDS_FIRST_PAINT).join('');
    hydrateBookingPhotos(container);
    let next = GUEST_CARDS_FIRST_PAINT;
    const appendChunk = () => {
        if (renderToken !== guestListRenderToken || next >= cards.length || !container.isConnected) return;
        const temp = document.createElement('div');
        temp.innerHTML = cards.slice(next, next + GUEST_CARDS_PER_FRAME).join('');
        next += GUEST_CARDS_PER_FRAME;
        temp.querySelectorAll('.guest-card').forEach(card => card.classList.add('no-enter-animation'));
        hydrateBookingPhotos(temp);
        container.append(...temp.children);
        requestAnimationFrame(appendChunk);
    };
    requestAnimationFrame(appendChunk);
}

const GUEST_CARDS_FIRST_PAINT = 24;
const GUEST_CARDS_PER_FRAME = 60;
let guestListRenderToken = 0;

function showGuestDetails(guestName) {
    const guest = data.guests.find(item => item.name === guestName);
    if (!guest) return;
    const bookings = data.bookings.filter(booking => booking.guestName === guest.name || booking.guestPhone === guest.phone).sort((first, second) => new Date(second.checkIn || 0) - new Date(first.checkIn || 0));
    const activeBooking = bookings.find(booking => ['confirmed', 'pending', 'paid'].includes(booking.status));
    const latestPhoto = bookings.find(booking => booking.customerPhotoUrl || booking.customerPhoto);
    const photo = latestPhoto?.customerPhotoUrl || latestPhoto?.customerPhoto;
    const initials = (guest.name || 'Guest').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
    const history = bookings.slice(0, 5).map(booking => `<div class="guest-timeline-item"><span class="timeline-dot"></span><div><strong>${booking.status === 'completed' ? 'Checked out' : 'Stay recorded'} ${booking.roomName || booking.roomId || ''}</strong><small>${formatDate(booking.actualCheckOutDate || booking.checkOut || booking.checkIn)} · ₹${formatNumber(getBookingTotal(booking))}</small></div></div>`).join('');
    const panel = `<div class="profile-drawer-hero"><div class="guest-avatar guest-avatar-xl">${photo ? `<img src="${photo}" alt="${guest.name}">` : `<span>${initials}</span>`}</div><div><span class="eyebrow">Guest profile</span><h2>${guest.name}</h2><span class="guest-status ${activeBooking ? 'active' : 'history'}"><i class="fas fa-circle"></i> ${activeBooking ? 'Active stay' : 'Returning guest'}</span></div></div><div class="profile-contact-grid"><div><small>Phone</small><strong>${guest.phone || 'Not recorded'}</strong></div><div><small>Email</small><strong>${guest.email || 'Not recorded'}</strong></div><div><small>Visits</small><strong>${guest.visits || bookings.length}</strong></div><div><small>Total spend</small><strong>₹${formatNumber(bookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0))}</strong></div></div>${activeBooking ? `<div class="drawer-callout"><span>Current room</span><strong>${activeBooking.roomName || activeBooking.roomId}</strong><small>${formatDateTime(activeBooking.checkIn, activeBooking.checkInTime)} → ${formatDateTime(activeBooking.checkOut, activeBooking.checkOutTime)}</small></div>` : ''}<section class="profile-drawer-section"><div class="section-heading"><h3>Stay history</h3><span>${bookings.length} record${bookings.length === 1 ? '' : 's'}</span></div><div class="guest-timeline">${history || '<div class="empty-state">No stay history recorded.</div>'}</div></section><div class="drawer-actions">${activeBooking ? `<button class="btn-primary" onclick="closeGuestDetails(); checkoutBooking('${activeBooking.id}')"><i class="fas fa-right-from-bracket"></i> Check out</button>` : '<button class="btn-primary" onclick="closeGuestDetails(); openNewBookingPage()"><i class="fas fa-calendar-plus"></i> New reservation</button>'}<button class="btn-secondary" onclick="closeGuestDetails(); viewGuestBookingPhotos(${JSON.stringify(guest.name)}, ${JSON.stringify(guest.phone)})"><i class="fas fa-camera"></i> View documents</button></div>`;
    let modal = document.getElementById('guestDetailsModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'guestDetailsModal'; modal.className = 'modal drawer-modal'; modal.innerHTML = '<div class="modal-content guest-drawer"><div class="modal-header"><span></span><button class="close-btn" onclick="closeGuestDetails()" aria-label="Close guest profile">&times;</button></div><div id="guestDetailsContent"></div></div>'; document.body.appendChild(modal); }
    document.getElementById('guestDetailsContent').innerHTML = panel;
    modal.classList.add('active');
}

function closeGuestDetails() {
    document.getElementById('guestDetailsModal')?.classList.remove('active');
}

async function viewGuestBookingPhotos(guestName, guestPhone) {
    const guestBookings = data.bookings
        .filter(b => b.guestName === guestName || b.guestPhone === guestPhone)
        .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

    const modal = document.getElementById('guestPhotoHistoryModal');
    const title = document.getElementById('guestPhotoHistoryTitle');
    const content = document.getElementById('guestPhotoHistoryContent');

    title.textContent = `${guestName} - Stayed Photo History`;
    content.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin"></i> Loading guest stays...</div>';
    modal.style.display = 'flex';

    if (guestBookings.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">No stayed bookings found for this guest.</div>';
        return;
    }

    for (let booking of guestBookings) {
        if ((!booking.customerPhotoUrl && !booking.customerPhoto) || (!booking.idProofPhotoUrl && !booking.idProofPhoto)) {
            try {
                if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                    const doc = await firebaseDb.collection('booking_photos').doc(String(booking.id)).get();
                    if (doc.exists) {
                        const picData = doc.data();
                        if (picData.customerPhoto && !booking.customerPhotoUrl && !booking.customerPhoto) {
                            booking.customerPhotoUrl = picData.customerPhoto;
                        }
                        if (picData.idProofPhoto && !booking.idProofPhotoUrl && !booking.idProofPhoto) {
                            booking.idProofPhotoUrl = picData.idProofPhoto;
                        }
                    }
                }
            } catch (e) {
                console.warn(`Could not fetch photos for booking ${booking.id}:`, e);
            }
        }
    }

    let html = '<div style="display: grid; gap: 22px;">';

    guestBookings.forEach(booking => {
        const customerPhoto = booking.customerPhotoUrl || booking.customerPhoto;
        const idProofPhoto = booking.idProofPhotoUrl || booking.idProofPhoto;

        html += `
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; background: #ffffff; box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">Booking Number</p>
                        <h4 style="margin: 0; font-size: 18px; color: #dc2626;">${booking.id}</h4>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">Stay Dates</p>
                        <p style="margin: 0; color: #1e3a8a; font-weight: 600;">${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}</p>
                    </div>
                    <span class="status-badge ${booking.status}" style="padding: 6px 12px; font-size: 11px; font-weight: 700;">${capitalizeFirst(booking.status)}</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
                    <div style="background: #f8fafc; border-radius: 10px; padding: 14px;">
                        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #0f172a;">Guest Photo</p>
                        ${customerPhoto ? `<img src="${customerPhoto}" alt="Customer Photo" style="width: 100%; height: 320px; object-fit: contain; border-radius: 10px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="expandPhoto(this)">` : '<div style="display:flex; align-items:center; justify-content:center; height:320px; color:#94a3b8; border:1px dashed #cbd5e1; border-radius:10px;">No Customer Photo</div>'}
                    </div>
                    <div style="background: #f8fafc; border-radius: 10px; padding: 14px;">
                        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #0f172a;">ID Proof</p>
                        ${idProofPhoto ? `<img src="${idProofPhoto}" alt="ID Proof" style="width: 100%; height: 320px; object-fit: contain; border-radius: 10px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="expandPhoto(this)">` : '<div style="display:flex; align-items:center; justify-content:center; height:320px; color:#94a3b8; border:1px dashed #cbd5e1; border-radius:10px;">No ID Proof</div>'}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
}

function closeGuestPhotoHistoryModal() {
    const modal = document.getElementById('guestPhotoHistoryModal');
    if (modal) modal.style.display = 'none';
}
