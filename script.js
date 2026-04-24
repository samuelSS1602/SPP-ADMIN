// Data storage starts clean and is populated from real usage/storage.
const data = {
    rooms: [
        { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, price: 2500, status: 'available', emoji: '🧑' },
        { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' }
    ],
    bookings: [],
    customers: [],
    guests: [],
    diary: {}
};

let charts = {};
let currentPriceRoom = null;
let currentRoomDetailsRoomId = null;
let liveClockTimer = null;
let firebaseEnabled = false;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let checkoutReminderTimer = null;
const LODGE_GST_NUMBER = '33ANCPP8116B1ZF';

// Role-based access control
let currentUserRole = 'receptionist';
let currentUserName = 'Receptionist';
const OWNER_EMAIL = 'sppowner@gmail.com';
const OWNER_WHATSAPP_PHONE = '919842816621';

// Multi-room booking support
let multiRoomBookingSelection = [];  // Array to store {roomId, roomName, floor, price} objects

document.addEventListener('DOMContentLoaded', function () {
    initFirebaseServices();
    hydrateDataFromStorage();
    purgeLegacySeedData();
    enforceRequestedRoomSetup();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('newBookingForm').addEventListener('submit', handleNewBooking);
    startLiveClock();
});

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.btn-login');
    const originalBtnHtml = loginBtn.innerHTML;

    if (firebaseEnabled && firebaseAuth) {
        try {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            loginBtn.disabled = true;
            loginBtn.style.cursor = 'not-allowed';
            loginBtn.style.opacity = '0.7';

            await firebaseAuth.signInWithEmailAndPassword(email, password);

            // First, securely pull all cloud data to populate empty devices
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching Data...';
            await fetchAllDataFromFirebase();

            // Detect user role from email
            const loggedInEmail = firebaseAuth.currentUser.email.toLowerCase();
            if (loggedInEmail === OWNER_EMAIL) {
                currentUserRole = 'owner';
                currentUserName = 'Owner';
            } else {
                currentUserRole = 'receptionist';
                currentUserName = 'Receptionist';
            }

            showDashboard();
            applyRoleRestrictions();
            syncAllBookingsToFirebase();

            // Reset button state just in case it's shown again after logout
            loginBtn.innerHTML = originalBtnHtml;
            loginBtn.disabled = false;
            loginBtn.style.cursor = 'pointer';
            loginBtn.style.opacity = '1';

            return;
        } catch (error) {
            loginBtn.innerHTML = originalBtnHtml;
            loginBtn.disabled = false;
            loginBtn.style.cursor = 'pointer';
            loginBtn.style.opacity = '1';
            alert(getFirebaseLoginErrorMessage(error));
            return;
        }
    }

    alert('Realtime login requires Firebase Authentication. Please use your Firebase user credentials.');
}

function getFirebaseLoginErrorMessage(error) {
    const code = (error && error.code) ? String(error.code) : '';

    if (code === 'auth/invalid-credential') {
        return 'Login failed: invalid credential. Check email/password and verify Email/Password sign-in is enabled in Firebase Console > Authentication > Sign-in method. Also confirm this app is using the same Firebase project where the user account exists.';
    }

    if (code === 'auth/user-not-found') {
        return 'Login failed: this user does not exist in Firebase Authentication for the configured project.';
    }

    if (code === 'auth/wrong-password') {
        return 'Login failed: password is incorrect.';
    }

    if (code === 'auth/invalid-email') {
        return 'Login failed: email address format is invalid.';
    }

    if (code === 'auth/too-many-requests') {
        return 'Login temporarily blocked due to too many attempts. Please wait and try again.';
    }

    if (code === 'auth/network-request-failed') {
        return 'Login failed due to a network error. Check internet connection and try again.';
    }

    return `Firebase login failed: ${(error && error.message) ? error.message : 'Unknown error'}`;
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'grid';
    startCheckoutReminderService();

    setTimeout(() => {
        loadDashboard();
        createCharts();
    }, 100);
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (firebaseEnabled && firebaseAuth) {
            try {
                await firebaseAuth.signOut();
            } catch (error) {
                console.warn('Firebase sign out failed:', error);
            }
        }

        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('dashboardPage').style.display = 'none';
        document.getElementById('loginForm').reset();
        destroyCharts();
        stopCheckoutReminderService();

        // Reset role state
        currentUserRole = 'receptionist';
        currentUserName = 'Receptionist';
        document.body.classList.remove('owner-view');
    }
}

// ===== MULTI-ROOM BOOKING FUNCTIONS =====
function setupMultiRoomBookingListeners() {
    const roomSelect = document.getElementById('bookingRoomId');
    if (!roomSelect) return;

    roomSelect.addEventListener('change', function () {
        const selectedRoomId = parseInt(this.value, 10);
        if (!selectedRoomId) {
            multiRoomBookingSelection = [];
            updateSelectedRoomsDisplay();
            return;
        }

        const room = data.rooms.find(r => r.id === selectedRoomId);
        if (!room) return;

        // Check if room already selected
        if (multiRoomBookingSelection.some(r => r.roomId === selectedRoomId)) {
            alert('This room is already selected');
            return;
        }

        // Add first/primary room to selection
        multiRoomBookingSelection = [{
            roomId: room.id,
            roomName: room.name,
            floor: room.floor,
            price: room.price
        }];

        updateSelectedRoomsDisplay();
    });
}

function addExtraRoomToBooking() {
    if (multiRoomBookingSelection.length === 0) {
        alert('Please select a primary room first');
        return;
    }

    const availableRooms = data.rooms.filter(room =>
        room.status === 'available' &&
        !multiRoomBookingSelection.some(r => r.roomId === room.id)
    );

    if (availableRooms.length === 0) {
        alert('No additional available rooms to add');
        return;
    }

    // Show a simple modal or dropdown to select extra room
    let roomOptions = availableRooms.map(room =>
        `<option value="${room.id}">${room.name} - Floor ${room.floor} - ₹${formatNumber(room.price)}</option>`
    ).join('');

    const html = `
        <div style="padding: 15px;">
            <h4>Select Additional Room for Same Guest</h4>
            <p style="font-size: 13px; color: var(--text-light);">These rooms are currently selected:</p>
            <div style="background: #f0f4f8; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                ${multiRoomBookingSelection.map((r, idx) =>
        `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd;">
                        <span><strong>${r.roomName}</strong> (Floor ${r.floor})</span>
                        <span>₹${formatNumber(r.price)}${idx > 0 ? ` <button style="padding: 2px 6px; color: red;" onclick="removeRoomFromSelection(${r.roomId})">Remove</button>` : ''}</span>
                    </div>`
    ).join('')}
            </div>
            <select id="extraRoomSelect" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                <option value="">-- Select room to add --</option>
                ${roomOptions}
            </select>
            <div style="display: flex; gap: 8px;">
                <button class="btn-primary" onclick="confirmAddExtraRoom()" style="flex:1;">Add Room</button>
                <button class="btn-primary" style="flex:1; background: #95A5A6;" onclick="closeExtraRoomModal()">Cancel</button>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'extraRoomModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    modal.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">${html}</div>`;
    document.body.appendChild(modal);
}

function confirmAddExtraRoom() {
    const select = document.getElementById('extraRoomSelect');
    const selectedRoomId = parseInt(select.value, 10);

    if (!selectedRoomId) {
        alert('Please select a room');
        return;
    }

    const room = data.rooms.find(r => r.id === selectedRoomId);
    if (!room || room.status !== 'available') {
        alert('Selected room is no longer available');
        closeExtraRoomModal();
        return;
    }

    multiRoomBookingSelection.push({
        roomId: room.id,
        roomName: room.name,
        floor: room.floor,
        price: room.price
    });

    updateSelectedRoomsDisplay();
    closeExtraRoomModal();
}

function closeExtraRoomModal() {
    const modal = document.getElementById('extraRoomModal');
    if (modal) modal.remove();
}

function removeRoomFromSelection(roomId) {
    multiRoomBookingSelection = multiRoomBookingSelection.filter(r => r.roomId !== roomId);
    updateSelectedRoomsDisplay();
}

function updateSelectedRoomsDisplay() {
    const displayDiv = document.getElementById('selectedRoomsDisplay');
    if (!displayDiv) return;

    if (multiRoomBookingSelection.length === 0) {
        displayDiv.innerHTML = '<small style="color: var(--text-light);">First room will be added when you select it above</small>';
        return;
    }

    let totalRate = 0;
    let html = '';

    multiRoomBookingSelection.forEach((room, idx) => {
        totalRate += room.price;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid var(--primary-gold);">
                <div>
                    <strong>${room.roomName}</strong> 
                    <span style="color: var(--text-light); font-size: 11px;">(Floor ${room.floor})</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--primary-gold);">₹${formatNumber(room.price)}</div>
                    ${idx > 0 ? `<button type="button" class="btn-primary" style="padding: 2px 6px; font-size: 10px; background: #E74C3C; margin-top: 2px;" onclick="removeRoomFromSelection(${room.roomId})"><i class="fas fa-trash"></i> Remove</button>` : '<small style="color: var(--text-light);">Primary</small>'}
                </div>
            </div>
        `;
    });

    html += `
        <div style="padding: 8px; background: #e8f4f8; border-radius: 4px; border-top: 2px solid var(--primary-gold); margin-top: 8px;">
                <div style="display: flex; justify-content: space-between;">
                <span><strong>Total Rate (per night):</strong></span>
                <span style="color: var(--primary-gold); font-weight: 700;">₹${formatNumber(totalRate)}</span>
            </div>
        </div>
    `;

    displayDiv.innerHTML = html;
}

function navigateTo(page, navElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (navElement) {
        navElement.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard', bookings: 'Booking Management', rooms: 'Room Management',
        pricing: 'Room Pricing', guests: 'Guest Management',
        payments: 'Payment & Billing', analytics: 'Analytics & Reports', 'new-booking': 'Create New Booking',
        diary: 'Room Diary'
    };
    document.getElementById('pageTitle').textContent = titles[page];

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'bookings': loadBookings(); break;
        case 'new-booking': loadNewBookingPage(); break;
        case 'rooms': loadRooms(); break;
        case 'pricing': loadPricingPage(); break;
        case 'guests': loadGuests(); break;
        case 'payments': loadPayments(); break;
        case 'analytics': setTimeout(createAnalyticsChart, 100); break;
        case 'diary': initDiary(); break;
    }

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }
}

function loadDashboard() {
    loadBookings();
    loadRooms();
    updateRealtimeDashboardMetrics();
    loadPayments();
}


function upsertGuestRecord(name, phone, email, lastVisit, lastBookingId) {
    const existingGuest = data.guests.find(guest => guest.phone === phone || guest.name === name);

    if (existingGuest) {
        existingGuest.name = name;
        existingGuest.phone = phone;
        existingGuest.email = email || existingGuest.email;
        existingGuest.visits += 1;
        existingGuest.lastVisit = lastVisit;
        if (lastBookingId) existingGuest.lastBookingId = lastBookingId;
        return;
    }

    data.guests.push({
        name,
        email: email || 'N/A',
        phone,
        visits: 1,
        lastVisit,
        lastBookingId: lastBookingId || null
    });
}

function loadRooms() {
    const floor1 = data.rooms.filter(r => r.floor === 1);
    const floor2 = data.rooms.filter(r => r.floor === 2);
    loadFloorRooms(floor1, 'floor1Rooms');
    loadFloorRooms(floor2, 'floor2Rooms');
}

function loadFloorRooms(rooms, elementId) {
    let html = '';
    rooms.forEach(room => {
        html += `<div class="room-card ${room.status}" onclick="showRoomDetails(${room.id})"><div class="room-image">${room.emoji}<span class="room-status ${room.status}">${capitalizeFirst(room.status)}</span></div><div class="room-info"><div class="room-name">${room.name}</div><div class="room-details"><div><div class="detail-label">Type</div><div class="detail-value">${capitalizeFirst(room.type)}</div></div><div><div class="detail-label">Capacity</div><div class="detail-value">${room.capacity}</div></div></div><div class="room-rate">Rate: <strong>₹${formatNumber(room.price)}</strong></div></div></div>`;
    });
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html;
}

function showRoomDetails(roomId) {
    const room = data.rooms.find(item => item.id === roomId);
    if (!room) return;

    currentRoomDetailsRoomId = roomId;

    const booking = getActiveBookingForRoom(roomId);
    const guestProfile = booking ? getGuestProfile(booking) : null;
    const total = booking ? booking.roomRate + booking.extras : room.price;
    const balance = booking ? Math.max(booking.roomRate - booking.advance + booking.extras, 0) : 0;

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
        html += `<tr><td><strong>${room.name}</strong></td><td>Floor ${room.floor}</td><td>${capitalizeFirst(room.type)}</td><td>₹${formatNumber(room.price)}</td><td><input type="number" class="price-input" id="price-input-${room.id}" placeholder="Enter new price" min="100"></td><td><button class="btn-primary receptionist-only" onclick="openPriceModal(${room.id}, '${room.name}', ${room.price})" style="padding: 8px 12px; font-size: 12px;"><i class="fas fa-edit"></i> Update</button></td></tr>`;
    });
    const tableBody = document.getElementById('pricingTable');
    if (tableBody) tableBody.innerHTML = html;
}


function loadGuests() {
    let html = '';
    data.guests.forEach(guest => {
        // Verify if lastBookingId actually exists in data.bookings
        let currentBookingId = guest.lastBookingId;
        const bookingExists = data.bookings.some(b => b.id === currentBookingId);

        // If broken reference, try to repair it by searching bookings
        if (currentBookingId && !bookingExists) {
            const actualLastBooking = [...data.bookings]
                .reverse()
                .find(b => b.guestName === guest.name || b.guestPhone === guest.phone);

            if (actualLastBooking) {
                guest.lastBookingId = actualLastBooking.id;
                currentBookingId = actualLastBooking.id;
            } else {
                guest.lastBookingId = null;
                currentBookingId = null;
            }
        }

        const photoBtn = currentBookingId
            ? `<button class="btn-primary" onclick="viewBookingPhotos('${currentBookingId}')" style="padding: 6px 10px; font-size: 11px; background: #4F46E5;"><i class="fas fa-camera"></i> View</button>`
            : '<span style="color: #94A3B8; font-size: 11px;">No Photo</span>';

        html += `<tr><td><strong>${guest.name}</strong></td><td>${guest.email}</td><td>${guest.phone}</td><td>${guest.visits}</td><td>${formatDate(guest.lastVisit)}</td><td>${photoBtn}</td></tr>`;
    });
    const tableBody = document.getElementById('guestsTable');
    if (tableBody) tableBody.innerHTML = html;
}

function loadPayments() {
    let html = '';
    let totalRevenue = 0;
    let totalPending = 0;
    let totalReceived = 0;

    data.bookings.forEach(booking => {
        const total = getBookingTotal(booking);
        const balance = getBookingBalance(booking);
        const isFullyPaid = balance <= 0 || booking.status === 'paid' || booking.status === 'completed';
        const statusBadge = isFullyPaid ? 'paid' : 'pending';
        const pendingAmount = isFullyPaid ? 0 : balance;
        const receivedAmount = total - pendingAmount;

        totalRevenue += total;
        totalPending += pendingAmount;
        totalReceived += receivedAmount;

        // Use rooms array for multi-room display, fallback to roomName
        const roomDisplayName = (booking.rooms && booking.rooms.length > 0)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.roomName || 'N/A');

        html += `<tr><td><strong>INV-${booking.id}</strong></td><td>${booking.guestName}</td><td>${roomDisplayName}</td><td>${formatDate(booking.checkIn)}</td><td>₹${formatNumber(booking.advance)}</td><td>₹${formatNumber(pendingAmount)}</td><td>₹${formatNumber(booking.extras)}</td><td><span class="status-badge ${statusBadge}">${capitalizeFirst(statusBadge)}</span></td><td><button class="btn-primary receptionist-only" onclick="openExtraAmountModal('${booking.id}')" style="padding: 6px 10px; font-size: 11px;"><i class="fas fa-plus"></i> Extra</button></td><td><button class="btn-primary" onclick="showReceipt('${booking.id}')" style="padding: 6px 12px; font-size: 11px;"><i class="fas fa-download"></i></button></td></tr>`;
    });

    const tableBody = document.getElementById('paymentsTable');
    if (tableBody) tableBody.innerHTML = html;

    const paymentTotalRevenue = document.getElementById('paymentTotalRevenue');
    const paymentPendingBalance = document.getElementById('paymentPendingBalance');
    const paymentReceivedAmount = document.getElementById('paymentReceivedAmount');

    if (paymentTotalRevenue) paymentTotalRevenue.textContent = `₹${formatNumber(totalRevenue)}`;
    if (paymentPendingBalance) paymentPendingBalance.textContent = `₹${formatNumber(totalPending)}`;
    if (paymentReceivedAmount) paymentReceivedAmount.textContent = `₹${formatNumber(totalReceived)}`;
}

function openExtraAmountModal(bookingId, roomId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (roomId) {
        currentRoomDetailsRoomId = roomId;
    }

    document.getElementById('extraInvoiceDisplay').textContent = `INV-${booking.id}`;
    document.getElementById('currentExtraDisplay').textContent = `₹${formatNumber(booking.extras || 0)}`;
    document.getElementById('extraAmountInput').value = '';
    document.getElementById('extraAmountInput').dataset.bookingId = bookingId;
    document.getElementById('extraAmountModal').classList.add('active');
}

function closeExtraAmountModal() {
    document.getElementById('extraAmountModal').classList.remove('active');
}

function updateExtraAmount() {
    const input = document.getElementById('extraAmountInput');
    const bookingId = input.dataset.bookingId;
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid extra amount');
        return;
    }

    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    booking.extras = (booking.extras || 0) + amount;
    saveDataToStorage();
    syncBookingToFirebase(booking);
    closeExtraAmountModal();
    loadPayments();
    loadRooms();
    updateRealtimeDashboardMetrics();
    if (currentRoomDetailsRoomId) {
        showRoomDetails(currentRoomDetailsRoomId);
    }
    alert(`Extra amount ₹${formatNumber(amount)} added to INV-${booking.id}`);
}


function openPriceModal(roomId, roomName, currentPrice) {
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) return;
    document.getElementById('roomNameDisplay').textContent = roomName;
    document.getElementById('currentPriceDisplay').textContent = '₹' + formatNumber(currentPrice);
    document.getElementById('newPriceInput').value = '';
    document.getElementById('newPriceInput').dataset.roomId = roomId;
    document.getElementById('priceModal').classList.add('active');
}

function closePriceModal() {
    document.getElementById('priceModal').classList.remove('active');
}

function updateRoomPrice() {
    const newPrice = parseFloat(document.getElementById('newPriceInput').value);
    const roomId = parseInt(document.getElementById('newPriceInput').dataset.roomId);

    if (!newPrice || newPrice < 100) {
        alert('Please enter a valid price (minimum ₹100)');
        return;
    }

    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
        const oldPrice = room.price;
        room.price = newPrice;
        saveDataToStorage();
        alert(`Room ${room.name} price updated from ₹${formatNumber(oldPrice)} to ₹${formatNumber(newPrice)}`);
        closePriceModal();
        loadPricingPage();
        updateRealtimeDashboardMetrics();
    }
}

function updateRealtimeDashboardMetrics() {
    const totalBookings = data.bookings.length;
    const totalRooms = data.rooms.length;
    const availableRooms = data.rooms.filter(room => room.status === 'available').length;
    const occupiedRooms = data.rooms.filter(room => room.status === 'occupied').length;
    const maintenanceRooms = data.rooms.filter(room => room.status === 'maintenance').length;
    const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const today = getLocalISODate();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const checkInsToday = data.bookings.filter(booking => booking.checkIn === today).length;
    const checkOutsToday = data.bookings.filter(booking => booking.checkOut === today).length;

    const revenueToday = data.bookings
        .filter(booking => booking.checkIn === today)
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    const monthlyRevenue = data.bookings
        .filter(booking => {
            const checkInDate = new Date(booking.checkIn);
            return checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear;
        })
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    setTextById('metricTotalBookings', String(totalBookings));
    setTextById('metricTotalBookingsInfo', 'Updated from current bookings');
    setTextById('metricOccupancyRate', `${occupancyRate}%`);
    setTextById('metricOccupancyInfo', `${occupiedRooms} occupied of ${totalRooms} rooms`);
    setTextById('metricRevenueToday', `₹${formatNumber(revenueToday)}`);
    setTextById('metricRevenueTodayInfo', `Check-ins on ${formatDate(today)}`);
    setTextById('metricAvailableRooms', String(availableRooms));
    setTextById('metricAvailableRoomsInfo', `Out of ${totalRooms} rooms`);

    setTextById('statCheckinsToday', String(checkInsToday));
    setTextById('statCheckoutsToday', String(checkOutsToday));
    setTextById('statMaintenance', String(maintenanceRooms));
    setTextById('statMonthlyRevenue', `₹${formatNumber(monthlyRevenue)}`);
}

function startLiveClock() {
    const renderClock = function () {
        const node = document.getElementById('liveDateTime');
        if (!node) return;
        node.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    renderClock();

    if (liveClockTimer) {
        clearInterval(liveClockTimer);
    }

    liveClockTimer = setInterval(renderClock, 1000);
}

function getLocalISODate() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
}

function setTextById(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function getCustomerRecordForBooking(booking) {
    return data.customers.find(customer =>
        customer.name === booking.guestName ||
        customer.mobile === booking.guestPhone ||
        customer.phone === booking.guestPhone ||
        customer.email === booking.guestEmail
    ) || null;
}

function updateRoomStatusesFromBookings() {
    if (!data.rooms || !data.bookings) return;

    const activeStatuses = ['confirmed', 'pending', 'paid'];
    const activeBookings = data.bookings.filter(b => activeStatuses.includes(b.status));

    // Collect all occupied room IDs based on valid bookings
    const occupiedRoomIds = new Set();
    activeBookings.forEach(booking => {
        if (booking.rooms && booking.rooms.length > 0) {
            booking.rooms.forEach(br => occupiedRoomIds.add(parseInt(br.roomId, 10)));
        } else if (booking.roomId) {
            occupiedRoomIds.add(parseInt(booking.roomId, 10));
        }
    });

    // Update rooms array
    data.rooms.forEach(room => {
        if (occupiedRoomIds.has(room.id)) {
            room.status = 'occupied';
        } else if (room.status === 'occupied') {
            room.status = 'available'; // Only revert if it was occupied but has no booking
        }
    });
}

function hydrateDataFromStorage() {
    try {
        const storedRaw = localStorage.getItem('lodgeAdminData');
        if (!storedRaw) return;

        const sData = JSON.parse(storedRaw);
        if (!sData || typeof sData !== 'object') return;

        if (Array.isArray(sData.rooms)) data.rooms = sData.rooms;
        if (Array.isArray(sData.bookings)) data.bookings = sData.bookings;
        if (Array.isArray(sData.customers)) data.customers = sData.customers;
        data.guests = sData.guests || [];
        data.diary = sData.diary || {};
    } catch (e) {
        console.error('Failed to parse stored data:', e);
        localStorage.removeItem('lodgeAdminData');
    }
}

function purgeLegacySeedData() {
    const legacyBookingIds = new Set(['BK001', 'BK002', 'BK003', 'BK004', 'BK005', 'BK006']);
    const legacyCustomerIds = new Set(['CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005', 'CUST006']);

    const hasLegacyBookings = data.bookings.some(booking => legacyBookingIds.has(String(booking.id || '').toUpperCase()));
    const hasLegacyCustomers = data.customers.some(customer => legacyCustomerIds.has(String(customer.id || '').toUpperCase()));

    if (!hasLegacyBookings && !hasLegacyCustomers) return;

    data.bookings = [];
    data.customers = [];
    data.guests = [];

    data.rooms = data.rooms.map(room => ({ ...room, status: 'available' }));
    saveDataToStorage();
}

function enforceRequestedRoomSetup() {
    const roomTemplate = [
        { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, emoji: '🧑', defaultStatus: 'available' },
        { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' }
    ];

    const roomIdToName = {
        101: 'F1-102',
        102: 'F1-103',
        103: 'F1-104',
        104: 'F1-105',
        105: 'F1-101',
        201: 'F2-201',
        202: 'F2-202',
        203: 'F2-203',
        204: 'F2-204'
    };

    const existingRoomById = new Map(data.rooms.map(room => [room.id, room]));
    data.rooms = roomTemplate.map(template => {
        const existing = existingRoomById.get(template.id);
        return {
            id: template.id,
            name: template.name,
            floor: template.floor,
            type: template.type,
            capacity: template.capacity,
            price: existing?.price || 2500,
            status: existing?.status || template.defaultStatus,
            emoji: template.emoji
        };
    });

    const activeRoomIds = new Set();

    // Collect room IDs from both new multi-room bookings and legacy single-room bookings
    data.bookings
        .filter(booking => booking.status !== 'completed')
        .forEach(booking => {
            if (booking.rooms && Array.isArray(booking.rooms)) {
                // Multi-room booking
                booking.rooms.forEach(room => activeRoomIds.add(parseInt(room.roomId, 10)));
            } else if (booking.roomId) {
                // Legacy single-room booking
                activeRoomIds.add(parseInt(booking.roomId, 10));
            }
        });

    data.rooms = data.rooms.map(room => {
        // If there is an active booking on this room, forcefully mark it as occupied
        if (activeRoomIds.has(parseInt(room.id, 10))) {
            return { ...room, status: 'occupied' };
        }

        // Otherwise, respect whatever status it currently has (so manual overrides stick)
        return room;
    });

    data.bookings.forEach(booking => {
        if ([201, 202, 203, 204].includes(booking.roomId)) booking.floor = 2;

        const mappedName = roomIdToName[booking.roomId];
        if (mappedName) {
            booking.roomName = mappedName;
        }
    });

    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;

        customer.bookingHistory.forEach(historyItem => {
            if (typeof historyItem.room !== 'string') return;

            historyItem.room = historyItem.room
                .replace('floor1-101', 'F1-102')
                .replace('floor1-102', 'F1-103')
                .replace('floor1-103', 'F1-104')
                .replace('floor1-104', 'F1-105')
                .replace('floor1-105', 'F1-101')
                .replace('floor2-201', 'F2-201')
                .replace('floor2-202', 'F2-202')
                .replace('floor2-203', 'F2-203')
                .replace('floor2-204', 'F2-204')
                .replace('F1-R1', 'F1-102')
                .replace('F1-R2', 'F1-103')
                .replace('F1-R3', 'F1-104')
                .replace('F1-R4', 'F1-105')
                .replace('F1-R5', 'F1-101')
                .replace('F2-R1', 'F2-201')
                .replace('F2-R2', 'F2-202')
                .replace('F2-R3', 'F2-203')
                .replace('F2-R4', 'F2-204');
        });
    });

    saveDataToStorage();
}

function saveDataToStorage() {
    try {
        const storageData = {
            rooms: data.rooms,
            bookings: data.bookings,
            customers: data.customers,
            guests: data.guests,
            diary: data.diary
        };
        localStorage.setItem('lodgeAdminData', JSON.stringify(storageData));
    } catch (error) {
        console.warn('Could not save data:', error);
    }
}

function sendCheckInWhatsAppMessage(booking) {
    if (!booking || booking.checkInWhatsAppSent) return;

    const phone = normalizePhoneForWhatsApp(booking.guestPhone || '');

    // Send guest check-in message
    if (phone) {
        const message = buildCheckInWhatsAppMessage(booking);
        const shouldSend = confirm(`Send WhatsApp check-in message to ${booking.guestName}?`);
        if (shouldSend) {
            openWhatsAppMessage(phone, message);
        }
    }

    booking.checkInWhatsAppSent = true;

    // Send owner notification (only when receptionist creates booking)
    // Use a longer delay so the first WhatsApp tab fully opens before triggering the second
    if (currentUserRole === 'receptionist') {
        setTimeout(() => {
            sendOwnerCheckinNotification(booking);
        }, 2000);
    }
}

function sendOwnerCheckinNotification(booking) {
    if (!booking || !OWNER_WHATSAPP_PHONE) return;

    const message = buildOwnerCheckinMessage(booking);

    const shouldSend = confirm('Send check-in notification to Owner via WhatsApp?');
    if (shouldSend) {
        const url = `https://wa.me/${OWNER_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
        const win = window.open(url, '_blank');

        // If popup was blocked, provide a fallback
        if (!win || win.closed || typeof win.closed === 'undefined') {
            // Try to copy the message and show URL
            try {
                navigator.clipboard.writeText(message);
                alert('Popup was blocked! The owner notification message has been copied to your clipboard.\n\nPlease open WhatsApp manually and paste the message to the owner.');
            } catch (e) {
                alert('Popup was blocked! Please allow popups for this site, or manually send the following to the Owner:\n\n' + message);
            }
        }
    }
}

function buildOwnerCheckinMessage(booking) {
    const roomDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(r => `${r.roomName} (Floor ${r.floor})`).join(', ')
        : `${booking.roomName || 'N/A'}`;

    const ciTime = booking.checkInTime || '12:00 PM';
    const ciDateTime = booking.checkIn ? formatDateTime(booking.checkIn, ciTime) : 'N/A';
    const coTime = booking.checkOutTime || '11:00 AM';
    const coDateTime = booking.checkOut ? formatDateTime(booking.checkOut, coTime) : 'N/A';

    const totalRate = booking.roomRate || 0;
    const advance = booking.advance || 0;
    const extras = (booking.extras || 0) + (booking.extraBed || 0);
    const total = getBookingTotal(booking);
    const balance = getBookingBalance(booking);
    const guests = `${booking.maleCount || 0}M + ${booking.femaleCount || 0}F + ${booking.childrenCount || 0}C`;

    return `🏨 *New Check-In Alert*
Sri Padmavati Pleasants

👤 Guest: ${booking.guestName}
📱 Phone: ${booking.guestPhone || 'N/A'}
👥 Guests: ${guests}
🛏️ Room: ${roomDisplay}
📅 Check-in: ${ciDateTime}
📅 Check-out: ${coDateTime}
💳 Payment: ${booking.paymentMethod || 'N/A'}${booking.bookingSource ? ' (' + booking.bookingSource + ')' : ''}

💰 Room Rate: ₹${formatNumber(totalRate)}
💵 Advance Received: ₹${formatNumber(advance)}
➕ Extras: ₹${formatNumber(extras)}
🧾 Total Billing: ₹${formatNumber(total)}
⚖️ Balance Due: ₹${formatNumber(balance)}

📋 Booking ID: ${booking.id}`;
}

function applyRoleRestrictions() {
    // Update profile display
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) profilePic.textContent = currentUserRole === 'owner' ? 'O' : 'R';

    const userProfileDiv = document.querySelector('.user-profile');
    if (userProfileDiv) {
        const innerDiv = userProfileDiv.querySelector('div:last-child');
        if (innerDiv) {
            const nameEl = innerDiv.querySelector('div');
            const emailEl = innerDiv.querySelector('small');
            if (nameEl) nameEl.textContent = currentUserName;
            if (emailEl && firebaseAuth && firebaseAuth.currentUser) {
                emailEl.textContent = firebaseAuth.currentUser.email;
            }

            // Add or update role badge
            let roleBadge = document.getElementById('roleBadge');
            if (!roleBadge) {
                roleBadge = document.createElement('div');
                roleBadge.id = 'roleBadge';
                innerDiv.appendChild(roleBadge);
            }
            roleBadge.className = `role-badge ${currentUserRole}`;
            roleBadge.textContent = currentUserRole === 'owner' ? '👑 Owner' : '🛎️ Receptionist';
        }
    }

    // Toggle body class for CSS-based hiding
    if (currentUserRole === 'owner') {
        document.body.classList.add('owner-view');
    } else {
        document.body.classList.remove('owner-view');
    }
}

function startCheckoutReminderService() {
    stopCheckoutReminderService();
    processCheckoutReminders();
    checkoutReminderTimer = setInterval(processCheckoutReminders, 60000);
}

function stopCheckoutReminderService() {
    if (checkoutReminderTimer) {
        clearInterval(checkoutReminderTimer);
        checkoutReminderTimer = null;
    }
}

function processCheckoutReminders() {
    const now = new Date();

    data.bookings.forEach(booking => {
        if (!booking || booking.status === 'completed' || booking.checkoutReminderSent) return;

        const phone = normalizePhoneForWhatsApp(booking.guestPhone || '');
        if (!phone) return;

        const checkoutDateTime = parseBookingDateTime(booking.checkOut, booking.checkOutTime);
        if (!checkoutDateTime) return;

        const oneHourBeforeCheckout = new Date(checkoutDateTime.getTime() - 60 * 60 * 1000);
        if (now < oneHourBeforeCheckout) return;

        const message = buildCheckoutReminderWhatsAppMessage(booking);
        const shouldSend = confirm(`Checkout reminder is due for ${booking.guestName} (${booking.roomName}). Send WhatsApp now?`);
        if (!shouldSend) return;

        openWhatsAppMessage(phone, message);
        booking.checkoutReminderSent = true;
        saveDataToStorage();
        syncBookingToFirebase(booking);
    });
}

function buildCheckInWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    const ciTime = booking.checkInTime || '12:00 PM';
    const ciDateTime = booking.checkIn ? formatDateTime(booking.checkIn, ciTime) : 'N/A';
    const coTime = booking.checkOutTime || '11:00 AM';
    const coDateTime = booking.checkOut ? formatDateTime(booking.checkOut, coTime) : 'N/A';

    return `Welcome to Sri Padmavati Pleasants, Palani 🙏
Guest Name: ${guestName}
Room: ${booking.roomName}
Check-In: ${ciDateTime}
Check-Out: ${coDateTime}

We wish you a comfortable stay. Need help? Call Reception.

ஸ்ரீ பத்மாவதி பிளஸன்ட்ஸ், பழனிக்கு வரவேற்கிறோம் 🙏
பயணிகள் பெயர்: ${guestName}
அறை: ${booking.roomName}
செக்-இன்: ${ciDateTime}
செக்-அவுட்: ${coDateTime}

உங்கள் வருகைக்கு நன்றி. உதவிக்கு ரிசப்ஷனைத் தொடர்புகொள்ளவும்.`;
}

function buildCheckoutReminderWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    return `Hello ${guestName} from Sri Padmavati Pleasants 🙏
A gentle reminder: your check-out time is approaching. Please ensure all your belongings are packed.

வணக்கம் ${guestName} 🙏
உங்கள் செக்-அவுட் நேரம் நெருங்குகிறது. தயவுசெய்து உங்கள் உடைமைகளை எடுத்துக்கொள்ளவும்.`;
}

function buildCheckoutWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    return `Thank you ${guestName} for staying at Sri Padmavati Pleasants, Palani 🙏
We hope you enjoyed your stay. Have a safe journey!

ஸ்ரீ பத்மாவதி பிளஸன்ட்ஸ்-ல் தங்கியதற்கு நன்றி ${guestName} 🙏
உங்கள் பயணம் இனியதாக அமைய வாழ்த்துக்கள்!`;

    function normalizePhoneForWhatsApp(phoneNumber) {
        const digits = String(phoneNumber || '').replace(/\D/g, '');
        if (!digits) return '';

        if (digits.length === 10) {
            return `91${digits}`;
        }

        if (digits.length >= 11 && digits.length <= 15) {
            return digits;
        }

        return '';
    }

    function openWhatsAppMessage(phone, message) {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    function parseBookingDateTime(dateValue, displayTime) {
        if (!dateValue || !displayTime) return null;

        const timeMatch = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)$/i.exec(displayTime.trim());
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const bookingDate = new Date(dateValue);
        if (Number.isNaN(bookingDate.getTime())) return null;

        bookingDate.setHours(hours, minutes, 0, 0);
        return bookingDate;
    }

    function initFirebaseServices() {
        if (typeof firebase === 'undefined') {
            return;
        }

        if (!window.firebaseConfig || !window.firebaseConfig.apiKey) {
            console.info('Firebase config not provided. Running in local mode.');
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }

            firebaseAuth = firebase.auth();
            firebaseDb = firebase.firestore();
            if (typeof firebase.storage !== 'undefined') {
                firebaseStorage = firebase.storage();
            }
            firebaseEnabled = true;
        } catch (error) {
            console.warn('Firebase initialization failed:', error);
            firebaseEnabled = false;
        }
    }

    function syncAllBookingsToFirebase() {
        if (!firebaseEnabled || !firebaseDb) return;

        data.bookings.forEach(booking => {
            syncBookingToFirebase(booking);
        });
    }

    async function syncBookingToFirebase(booking) {
        if (!firebaseEnabled || !firebaseDb || !booking || !booking.id) return;

        // To avoid CORS issues with Firebase Storage on localhost, 
        // we save massive base64 image strings into a separate Firestore collection.
        if ((booking.customerPhoto && booking.customerPhoto.startsWith('data:image')) ||
            (booking.idProofPhoto && booking.idProofPhoto.startsWith('data:image'))) {

            firebaseDb.collection('booking_photos').doc(String(booking.id)).set({
                customerPhoto: booking.customerPhoto || null,
                idProofPhoto: booking.idProofPhoto || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(err => console.warn('Photo sync failed:', err));
        }

        const cloudBooking = {};
        for (const key in booking) {
            if (key === 'customerPhoto' || key === 'idProofPhoto') continue;
            if (booking[key] !== undefined) {
                cloudBooking[key] = booking[key];
            }
        }

        if (booking.customerPhoto || booking.customerPhotoUrl) {
            cloudBooking.hasCustomerPhoto = true;
        }
        if (booking.idProofPhoto || booking.idProofPhotoUrl) {
            cloudBooking.hasIdProofPhoto = true;
        }

        cloudBooking.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        firebaseDb
            .collection('bookings')
            .doc(String(booking.id))
            .set(cloudBooking, { merge: true })
            .catch(error => {
                console.warn(`Failed to sync booking ${booking.id} to Firebase:`, error);
            });
    }


    function downloadDailyRevenue() {
        const today = getLocalISODate();
        const todayLabel = formatDate(today);
        const todaysBookings = data.bookings.filter(booking => booking.checkIn === today);

        const data_export = [
            ['Sri Padmavati Pleasants - Daily Revenue Report'],
            ['Date: ' + todayLabel],
            [],
            ['Check-in Time', 'Room', 'Guest', 'Room Rate', 'Advance', 'Extras', 'Total']
        ];

        if (!todaysBookings.length) {
            data_export.push(['No records', '-', '-', 0, 0, 0, 0]);
        } else {
            todaysBookings.forEach(booking => {
                const days = calculateBookingDays(booking);
                const totalRoom = (Number(booking.roomRate) || 0) * days;
                const discount = Number(booking.discount) || 0;
                const totalGrossRoom = Math.max(0, totalRoom - discount);

                data_export.push([
                    booking.checkInTime || 'N/A',
                    booking.roomName || '-',
                    booking.guestName || '-',
                    totalGrossRoom,
                    Number(booking.advance) || 0,
                    (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0),
                    getBookingTotal(booking)
                ]);
            });
        }

        const dailyTotal = todaysBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);
        data_export.push([]);
        data_export.push(['DAILY TOTAL', '', '', '', '', '', dailyTotal]);

        const ws = XLSX.utils.aoa_to_sheet(data_export);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Revenue');
        XLSX.writeFile(wb, `Daily_Revenue_${today}.xlsx`);
        alert('Daily Revenue report downloaded!');
    }

    function downloadMonthlyRevenue() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentYear = new Date().getFullYear();

        const monthlySummary = monthNames.map((month, monthIndex) => {
            const monthBookings = data.bookings.filter(booking => {
                const date = new Date(booking.checkIn);
                return date.getFullYear() === currentYear && date.getMonth() === monthIndex;
            });

            const advance = monthBookings.reduce((sum, booking) => sum + (Number(booking.advance) || 0), 0);
            const balance = monthBookings.reduce((sum, booking) => sum + getBookingBalance(booking), 0);
            const extras = monthBookings.reduce((sum, booking) => sum + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0), 0);
            const total = monthBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            return [`${month} ${currentYear}`, monthBookings.length, advance, balance, extras, total];
        });

        const data_export = [
            ['Sri Padmavati Pleasants - Monthly Revenue Report'],
            [],
            ['Month', 'Room Bookings', 'Advance Received', 'Balance Received', 'Extras', 'Total Revenue'],
            ...monthlySummary
        ];

        const ws = XLSX.utils.aoa_to_sheet(data_export);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Revenue');
        XLSX.writeFile(wb, 'Monthly_Revenue_Report.xlsx');
        alert('Monthly Revenue report downloaded!');
    }

    function downloadYearlyRevenue() {
        const yearlyMap = new Map();

        data.bookings.forEach(booking => {
            const date = new Date(booking.checkIn);
            if (Number.isNaN(date.getTime())) return;

            const year = date.getFullYear();
            if (!yearlyMap.has(year)) {
                yearlyMap.set(year, {
                    bookings: 0,
                    roomRateRevenue: 0,
                    advanceCollected: 0,
                    balanceCollected: 0,
                    extrasRevenue: 0,
                    totalRevenue: 0
                });
            }

            const yearSummary = yearlyMap.get(year);
            yearSummary.bookings += 1;
            const days = calculateBookingDays(booking);
            const totalRoom = (Number(booking.roomRate) || 0) * days;
            const discount = Number(booking.discount) || 0;
            const totalGrossRoom = Math.max(0, totalRoom - discount);

            yearSummary.roomRateRevenue += totalGrossRoom;
            yearSummary.advanceCollected += Number(booking.advance) || 0;
            yearSummary.balanceCollected += getBookingBalance(booking);
            yearSummary.extrasRevenue += (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
            yearSummary.totalRevenue += getBookingTotal(booking);
        });

        if (!yearlyMap.size) {
            yearlyMap.set(new Date().getFullYear(), {
                bookings: 0,
                roomRateRevenue: 0,
                advanceCollected: 0,
                balanceCollected: 0,
                extrasRevenue: 0,
                totalRevenue: 0
            });
        }

        const rows = Array.from(yearlyMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([year, summary]) => [
                String(year),
                summary.bookings,
                summary.roomRateRevenue,
                summary.advanceCollected,
                summary.balanceCollected,
                summary.extrasRevenue,
                summary.totalRevenue
            ]);

        const data_export = [
            ['Sri Padmavati Pleasants - Yearly Revenue Report'],
            [],
            ['Year', 'Total Bookings', 'Room Rate Revenue', 'Advance Collected', 'Balance Collected', 'Extras Revenue', 'Total Revenue'],
            ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(data_export);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yearly Revenue');
        XLSX.writeFile(wb, 'Yearly_Revenue_Report.xlsx');
        alert('Yearly Revenue report downloaded!');
    }


    function createCharts() {
        createRevenueChart();
        createOccupancyChart();
    }

    function createRevenueChart() {
        if (charts.revenue) charts.revenue.destroy();
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        const weeklyRevenue = getLast7DaysRevenueData();

        charts.revenue = new Chart(ctx, {
            type: 'line',
            data: { labels: weeklyRevenue.labels, datasets: [{ label: 'Daily Revenue', data: weeklyRevenue.values, borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#D4AF37' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function createOccupancyChart() {
        if (charts.occupancy) charts.occupancy.destroy();
        const ctx = document.getElementById('occupancyChart');
        if (!ctx) return;
        const occupied = data.rooms.filter(r => r.status === 'occupied').length;
        const available = data.rooms.filter(r => r.status === 'available').length;
        const cleaning = data.rooms.filter(r => r.status === 'cleaning').length;
        charts.occupancy = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Occupied', 'Available', 'Cleaning'], datasets: [{ data: [occupied, available, cleaning], backgroundColor: ['#E74C3C', '#27AE60', '#F39C12'], borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    function createAnalyticsChart() {
        if (charts.monthly) charts.monthly.destroy();
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        const monthlyRevenue = getLast6MonthsRevenueData();

        charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: { labels: monthlyRevenue.labels, datasets: [{ label: 'Monthly Revenue', data: monthlyRevenue.values, backgroundColor: ['#1B4D3E', '#2D7A6F', '#4DB8A8', '#D4AF37', '#4DB8A8', '#2D7A6F'], borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function getLast7DaysRevenueData() {
        const labels = [];
        const values = [];
        const today = new Date();

        for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - dayOffset);

            const isoDate = toISODateFromDate(date);
            const label = date.toLocaleDateString('en-IN', { weekday: 'short' });
            const total = data.bookings
                .filter(booking => booking.checkIn === isoDate)
                .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            labels.push(label);
            values.push(total);
        }

        return { labels, values };
    }

    function getLast6MonthsRevenueData() {
        const labels = [];
        const values = [];
        const today = new Date();

        for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
            const label = monthDate.toLocaleDateString('en-IN', { month: 'short' });
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();

            const total = data.bookings
                .filter(booking => {
                    const bookingDate = new Date(booking.checkIn);
                    return !Number.isNaN(bookingDate.getTime()) && bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
                })
                .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

            labels.push(label);
            values.push(total);
        }

        return { labels, values };
    }

    function toISODateFromDate(date) {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().split('T')[0];
    }

    function destroyCharts() {
        if (charts.revenue) charts.revenue.destroy();
        if (charts.occupancy) charts.occupancy.destroy();
        if (charts.monthly) charts.monthly.destroy();
        charts = {};
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('en-IN').format(num);
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    }

    function formatDateTime(dateString, timeString) {
        const datePart = formatDate(dateString);
        const timePart = timeString || 'N/A';
        return `${datePart}, ${timePart}`;
    }

    function toDisplayTime(timeValue) {
        if (!timeValue) return 'N/A';

        const [hoursText, minutes] = timeValue.split(':');
        let hours = parseInt(hoursText, 10);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${suffix}`;
    }


    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    window.onclick = function (event) {
        const receiptModal = document.getElementById('receiptModal');
        const priceModal = document.getElementById('priceModal');
        const extraAmountModal = document.getElementById('extraAmountModal');
        const roomDetailsModal = document.getElementById('roomDetailsModal');

        if (event.target == receiptModal) closeReceiptModal();
        if (event.target == priceModal) closePriceModal();
        if (event.target == extraAmountModal) closeExtraAmountModal();
        if (event.target == roomDetailsModal) closeRoomDetailsModal();
    }

    window.addEventListener('beforeunload', function () {
        stopBookingCameraStream();
        stopCheckoutReminderService();
        if (liveClockTimer) {
            clearInterval(liveClockTimer);
            liveClockTimer = null;
        }
    });

    async function fetchAllDataFromFirebase() {
        if (!firebaseEnabled || !firebaseDb) return;

        try {
            console.log("Fetching cloud data...");
            // 1. Fetch Customers
            const custSnap = await firebaseDb.collection('customers').get();
            const firebaseCustomers = [];
            custSnap.forEach(doc => {
                const cData = doc.data();
                if (cData.id) firebaseCustomers.push(cData);
            });

            // Merge Customers
            const localCustIds = new Set(data.customers.map(c => c.id));
            firebaseCustomers.forEach(fc => {
                if (!localCustIds.has(fc.id)) {
                    data.customers.push(fc);
                } else {
                    const idx = data.customers.findIndex(c => c.id === fc.id);
                    data.customers[idx] = { ...data.customers[idx], ...fc }; // Cloud overrides local
                }
            });

            // 2. Fetch Bookings
            const bookSnap = await firebaseDb.collection('bookings').get();
            const firebaseBookings = [];
            bookSnap.forEach(doc => {
                const bData = doc.data();
                if (bData.id) firebaseBookings.push(bData);
            });

            // Merge Bookings
            const localBookIds = new Set(data.bookings.map(b => b.id));
            firebaseBookings.forEach(fb => {
                if (!localBookIds.has(fb.id)) {
                    data.bookings.push(fb);
                } else {
                    const idx = data.bookings.findIndex(b => b.id === fb.id);
                    data.bookings[idx] = { ...data.bookings[idx], ...fb }; // Cloud overrides local
                }
            });

            updateRoomStatusesFromBookings();


            // 3. Fetch Room Diary (Reminders)
            const diarySnap = await firebaseDb.collection('diaryReminder').get();
            if (!data.diary) data.diary = {};
            diarySnap.forEach(doc => {
                const dData = doc.data();
                if (dData.date && dData.roomId) {
                    if (!data.diary[dData.date]) data.diary[dData.date] = {};
                    data.diary[dData.date][dData.roomId] = dData.guestName;
                }
            });


            data.guests = [];
            data.bookings.forEach(booking => {
                if (booking.guestName && (booking.guestPhone || booking.guestEmail)) {
                    upsertGuestRecord(
                        booking.guestName,
                        booking.guestPhone || 'N/A',
                        booking.guestEmail || '',
                        booking.checkOut || booking.checkIn || new Date().toISOString().split('T')[0],
                        booking.id
                    );
                }
            });

            saveDataToStorage();

            // If UI is already loaded, gently refresh the arrays
            if (typeof loadBookings === 'function') loadBookings();
            if (typeof loadRooms === 'function') loadRooms();
            if (typeof loadGuests === 'function') loadGuests();
            if (typeof loadPayments === 'function') loadPayments();
            if (typeof updateRealtimeDashboardMetrics === 'function') updateRealtimeDashboardMetrics();

            // Refresh Diary UI if currently on that page
            const diaryDateInput = document.getElementById('diaryDate');
            if (typeof loadDiary === 'function' && diaryDateInput && diaryDateInput.value) {
                loadDiary(diaryDateInput.value);
            }

            console.log("Cloud sync complete!");
        } catch (error) {
            console.error("Could not fetch remote data:", error);
        }
    }

    // Room Diary (Quick Reservation)
    function initDiary() {
        const today = getLocalISODate();
        const dateInput = document.getElementById('diaryDate');
        if (dateInput) {
            dateInput.value = today;
            loadDiary(today);
        }
    }

    function loadDiary(date) {
        if (!date) return;

        // Clear all diary inputs first
        const diaryInputs = document.querySelectorAll('.diary-room-item input');
        diaryInputs.forEach(input => {
            input.value = '';
        });

        // Load from data.diary[date]
        if (data.diary && data.diary[date]) {
            for (const roomId in data.diary[date]) {
                const input = document.getElementById(`diary-${roomId}`);
                if (input) {
                    input.value = data.diary[date][roomId];
                }
            }
        }
    }

    window.saveDiaryRoom = function (roomId, guestName) {
        const dateInput = document.getElementById('diaryDate');
        if (!dateInput) return;
        const date = dateInput.value;
        if (!date) return;

        if (!data.diary) data.diary = {};
        if (!data.diary[date]) data.diary[date] = {};

        data.diary[date][roomId] = guestName;
        saveDataToStorage();

        // Optional: Sync to Firebase if enabled
        if (firebaseEnabled && firebaseDb) {
            try {
                firebaseDb.collection('diaryReminder').doc(`${date}_${roomId}`).set({
                    date: date,
                    roomId: roomId,
                    guestName: guestName,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.warn('Could not sync diary reminder to Firebase:', e);
            }
        }
    };
}