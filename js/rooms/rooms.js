
let activeRoomFilter = 'all';

function loadRooms() {
    renderRoomBoard();
}

function setRoomFilter(filter, button) {
    activeRoomFilter = filter;
    document.querySelectorAll('.room-filter-pill').forEach(item => item.classList.remove('active'));
    if (button) button.classList.add('active');
    renderRoomBoard();
}

function getRoomBooking(roomId) {
    return getActiveBookingForRoom(roomId);
}

function getRoomGuestName(booking) {
    return booking?.guestName || 'Ready for arrival';
}

function renderRoomBoard() {
    const search = (document.getElementById('roomSearchInput')?.value || '').trim().toLowerCase();
    const sortBy = document.getElementById('roomSortSelect')?.value || 'number';
    const counts = { all: data.rooms.length, available: 0, occupied: 0, reserved: 0, cleaning: 0, maintenance: 0 };
    data.rooms.forEach(room => { if (counts[room.status] !== undefined) counts[room.status] += 1; });
    Object.keys(counts).forEach(status => {
        const countElement = document.getElementById(`roomFilterCount${status.charAt(0).toUpperCase()}${status.slice(1)}`);
        if (countElement) countElement.textContent = counts[status];
    });

    const filteredRooms = data.rooms.filter(room => {
        const booking = getRoomBooking(room.id);
        const searchable = `${room.name} ${room.id} ${room.type} ${getRoomGuestName(booking)}`.toLowerCase();
        return (activeRoomFilter === 'all' || room.status === activeRoomFilter) && (!search || searchable.includes(search));
    }).sort((first, second) => {
        if (sortBy === 'price') return Number(second.price || 0) - Number(first.price || 0);
        if (sortBy === 'status') return String(first.status).localeCompare(String(second.status));
        if (sortBy === 'checkin') return new Date(getRoomBooking(second.id)?.checkIn || 0) - new Date(getRoomBooking(first.id)?.checkIn || 0);
        if (sortBy === 'checkout') return new Date(getRoomBooking(first.id)?.checkOut || 0) - new Date(getRoomBooking(second.id)?.checkOut || 0);
        return Number(first.id) - Number(second.id);
    });

    const renderFloor = floor => {
        const rooms = filteredRooms.filter(room => room.floor === floor);
        const empty = `<div class="empty-state room-empty">No rooms match this view.</div>`;
        return rooms.length ? rooms.map(room => {
            const booking = getRoomBooking(room.id);
            const guest = booking ? getGuestProfile(booking) : null;
            const nights = booking && typeof calculateBookingDays === 'function' ? calculateBookingDays(booking) : 0;
            const photo = booking?.customerPhotoUrl || booking?.customerPhoto;
            const initials = (getRoomGuestName(booking).split(' ').map(part => part[0]).join('').slice(0, 2) || 'SP').toUpperCase();
            const statusLabel = room.status === 'occupied' && booking ? 'Occupied' : capitalizeFirst(room.status || 'available');
            return `<article class="room-card premium-room-card ${room.status}" onclick="showRoomDetails(${room.id})" tabindex="0" onkeydown="if(event.key==='Enter')showRoomDetails(${room.id})">
                <div class="room-card-top"><div><span class="room-number">${room.name}</span><span class="room-type">${capitalizeFirst(room.type)} room</span></div><span class="room-status ${room.status}"><i class="fas fa-circle"></i>${statusLabel}</span></div>
                <div class="room-card-guest">${photo ? `<img src="${photo}" alt="${getRoomGuestName(booking)}" class="guest-avatar">` : `<span class="guest-avatar avatar-placeholder">${initials}</span>`}<div><span class="room-guest-label">${booking ? 'Current guest' : 'Next available'}</span><strong>${getRoomGuestName(booking)}</strong></div><button class="room-menu" type="button" onclick="event.stopPropagation(); showRoomDetails(${room.id})" aria-label="Open room actions"><i class="fas fa-ellipsis"></i></button></div>
                <div class="room-stay-grid"><div><span>Check-in</span><strong>${booking ? formatDate(booking.checkIn) : '--'}</strong></div><div><span>Check-out</span><strong>${booking ? formatDate(booking.checkOut) : '--'}</strong></div></div>
                <div class="room-card-footer"><span><i class="fas fa-moon"></i> ${booking ? `${nights} night${nights === 1 ? '' : 's'}` : 'Ready'}</span><strong>₹${formatNumber(booking?.roomRate || room.price)}<small> / night</small></strong></div>
            </article>`;
        }).join('') : empty;
    };
    const floor1 = document.getElementById('floor1Rooms');
    const floor2 = document.getElementById('floor2Rooms');
    if (floor1) floor1.innerHTML = renderFloor(1);
    if (floor2) floor2.innerHTML = renderFloor(2);
}

function showRoomDetails(roomId) {
    const room = data.rooms.find(item => item.id === roomId);
    if (!room) return;

    currentRoomDetailsRoomId = roomId;

    const booking = getActiveBookingForRoom(roomId);
    const guestProfile = booking ? getGuestProfile(booking) : null;
    const total = booking ? (typeof getBookingTotal === 'function' ? getBookingTotal(booking) : (Number(booking.roomRate || 0) + Number(booking.extras || 0))) : room.price;
    const balance = booking ? (typeof getBookingBalance === 'function' ? getBookingBalance(booking) : Math.max((Number(booking.roomRate || 0) - Number(booking.advance || 0) + Number(booking.extras || 0)), 0)) : 0;

    let content = `
        <div class="customer-detail-header">
            <div class="customer-photo">
                <div class="customer-photo-frame">${room.name}</div>
                <div class="customer-photo-label">Room ${room.id}</div>
            </div>
            <div class="customer-info-header">
                <h2>${room.name}</h2>
                <div>
                    <span class="customer-id-badge">Floor ${room.floor}</span>
                    <span class="customer-status-tag ${room.status === 'occupied' ? 'previous' : 'new'}">${capitalizeFirst(room.status)}</span>
                </div>
                <div class="customer-quick-info">
                    <div class="info-item">
                        <div class="info-icon"><i class="fas fa-bed"></i></div>
                        <div class="info-content">
                            <h4>Room Type</h4>
                            <p>${capitalizeFirst(room.type)}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon"><i class="fas fa-users"></i></div>
                        <div class="info-content">
                            <h4>Capacity</h4>
                            <p>${room.capacity} Guests</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon"><i class="fas fa-tag"></i></div>
                        <div class="info-content">
                            <h4>Room Rate</h4>
                            <p>₹${formatNumber(room.price)}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon"><i class="fas fa-circle"></i></div>
                        <div class="info-content">
                            <h4>Current Status</h4>
                            <p>${capitalizeFirst(room.status)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!booking) {
        content += `
            <div class="detail-section">
                <h4><i class="fas fa-door-open"></i> Occupancy Details</h4>
                <div class="detail-item">
                    <div class="detail-label-text">Current Occupant</div>
                    <div class="detail-text">No guest is currently assigned to this room.</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-magic"></i> Manage Room Status</h4>
                <div class="modal-actions receptionist-only" style="margin-top: 10px; padding-top: 0; border-top: none; gap: 10px; display: flex; flex-wrap: wrap;">
                    <button class="btn-primary" style="background: #27AE60; flex: 1;" onclick="updateRoomStatus(${roomId}, 'available')">
                        <i class="fas fa-check-circle"></i> Available
                    </button>
                    <button class="btn-primary" style="background: #E74C3C; flex: 1;" onclick="updateRoomStatus(${roomId}, 'occupied')">
                        <i class="fas fa-bed"></i> Occupied
                    </button>
                    <button class="btn-primary" style="background: #F39C12; flex: 1;" onclick="updateRoomStatus(${roomId}, 'cleaning')">
                        <i class="fas fa-broom"></i> Cleaning
                    </button>
                    <button class="btn-primary" style="background: #95A5A6; flex: 1;" onclick="updateRoomStatus(${roomId}, 'maintenance')">
                        <i class="fas fa-tools"></i> Maintenance
                    </button>
                </div>
            </div>
        `;
    } else {
        content += `
            <div class="detail-section">
                <h4><i class="fas fa-bolt"></i> Quick Actions</h4>
                <div class="modal-actions" style="margin-top: 0; padding-top: 0; border-top: none;">
                    <button class="btn-primary receptionist-only" onclick="openExtraAmountModal('${booking.id}', ${room.id})">
                        <i class="fas fa-plus"></i> Add Extra Amount
                    </button>
                    <button class="btn-primary" onclick="showReceipt('${booking.id}')">
                        <i class="fas fa-receipt"></i> View Bill
                    </button>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Occupant Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label-text">Guest Name</div>
                        <div class="detail-text highlight">${booking.guestName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Booking ID</div>
                        <div class="detail-text">${booking.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Mobile</div>
                        <div class="detail-text">${guestProfile.phone}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Email</div>
                        <div class="detail-text">${guestProfile.email}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Address</div>
                        <div class="detail-text">${guestProfile.address}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Payment Method</div>
                        <div class="detail-text">${booking.paymentMethod || 'Not specified'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Check-in</div>
                        <div class="detail-text">${formatDateTime(booking.checkIn, booking.checkInTime)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Check-out</div>
                        <div class="detail-text">${formatDateTime(booking.checkOut, booking.checkOutTime)}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-money-bill-wave"></i> Billing Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label-text">Room Amount</div>
                        <div class="detail-text highlight">₹${formatNumber(booking.roomRate)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Advance Paid</div>
                        <div class="detail-text">₹${formatNumber(booking.advance)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Extra Amount</div>
                        <div class="detail-text">₹${formatNumber(booking.extras || 0)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Balance Due</div>
                        <div class="detail-text">₹${formatNumber(balance)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Total Amount</div>
                        <div class="detail-text highlight">₹${formatNumber(total)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label-text">Booking Status</div>
                        <div class="detail-text">${capitalizeFirst(booking.status)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    document.getElementById('roomDetailsContent').innerHTML = content;
    document.getElementById('roomDetailsModal').classList.add('active');
}

function closeRoomDetailsModal() {
    document.getElementById('roomDetailsModal').classList.remove('active');
}

window.updateRoomStatus = function (roomId, status) {
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) return;

    room.status = status;
    saveDataToStorage();

    // Sync room status to Firebase
    if (firebaseEnabled && firebaseDb) {
        try {
            firebaseDb.collection('rooms').doc(String(roomId)).set({
                id: room.id,
                name: room.name,
                floor: room.floor,
                type: room.type,
                capacity: room.capacity,
                price: room.price,
                status: room.status,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.warn('Could not sync room status to Firebase:', e);
        }
    }

    // Refresh the rooms grid and the modal
    loadRooms();
    showRoomDetails(roomId);
    updateRealtimeDashboardMetrics();
};

function getActiveBookingForRoom(roomId) {
    const numericRoomId = parseInt(roomId, 10);
    const activeStatuses = ['confirmed', 'pending', 'paid'];
    return [...data.bookings]
        .filter(booking => {
            const hasRoom = parseInt(booking.roomId, 10) === numericRoomId ||
                (booking.rooms && booking.rooms.some(r => parseInt(r.roomId, 10) === numericRoomId));
            return hasRoom && activeStatuses.includes(booking.status);
        })
        .sort((first, second) => new Date(second.checkIn) - new Date(first.checkIn))[0] || null;
}

function getGuestProfile(booking) {
    const customer = data.customers.find(item => item.name === booking.guestName || item.mobile === booking.guestPhone || item.email === booking.guestEmail);
    if (customer) {
        return {
            phone: customer.mobile || customer.phone || 'N/A',
            email: customer.email || 'N/A',
            address: customer.address || 'N/A'
        };
    }

    const guest = data.guests.find(item => item.name === booking.guestName);
    return {
        phone: guest?.phone || 'N/A',
        email: guest?.email || 'N/A',
        address: 'N/A'
    };
}

function loadPricingPage() {
    let html = '';
    data.rooms.forEach(room => {
        html += `<tr><td><strong>${room.name}</strong></td><td>Floor ${room.floor}</td><td>${capitalizeFirst(room.type)}</td><td>₹${formatNumber(room.price)}</td><td><input type="number" class="price-input owner-only" id="price-input-${room.id}" placeholder="Enter new price" min="100"></td><td><button class="btn-primary owner-only" onclick="openPriceModal(${room.id}, '${room.name}', ${room.price})" style="padding: 8px 12px; font-size: 12px;"><i class="fas fa-edit"></i> Update</button></td></tr>`;
    });
    const tableBody = document.getElementById('pricingTable');
    if (tableBody) tableBody.innerHTML = html;
}
