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
    diary: {},
    staff: [],
    housekeepingTasks: [],
    notifications: [],
    settings: {
        lodgeName: 'Sri Padmavati Pleasants',
        gstNumber: '33ANCPP8116B1ZF',
        taxes: { cgst: 2.5, sgst: 2.5 },
        roomCategories: ['Single', 'Double', 'Family', 'Suite'],
        backupSchedule: 'Weekly'
    },
    auditLogs: []
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
let activePage = 'dashboard';

// ===== INDEXEDDB PHOTO STORAGE =====
// Provides persistent local storage for booking photos (avoids localStorage 5MB limit)
const PHOTO_DB_NAME = 'LodgeAdminPhotos';
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE_NAME = 'booking_photos';

function openPhotoDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
                db.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'bookingId' });
            }
        };
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            console.warn('IndexedDB open failed:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function savePhotoToLocal(bookingId, customerPhoto, idProofPhoto) {
    try {
        const db = await openPhotoDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
            const store = tx.objectStore(PHOTO_STORE_NAME);
            const record = {
                bookingId: String(bookingId),
                customerPhoto: customerPhoto || null,
                idProofPhoto: idProofPhoto || null,
                updatedAt: new Date().toISOString()
            };
            const request = store.put(record);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => {
                console.warn('IndexedDB save failed:', e.target.error);
                reject(e.target.error);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('savePhotoToLocal error:', err);
        return false;
    }
}

async function getPhotoFromLocal(bookingId) {
    try {
        const db = await openPhotoDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
            const store = tx.objectStore(PHOTO_STORE_NAME);
            const request = store.get(String(bookingId));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => {
                console.warn('IndexedDB get failed:', e.target.error);
                resolve(null);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('getPhotoFromLocal error:', err);
        return null;
    }
}

async function deletePhotoFromLocal(bookingId) {
    try {
        const db = await openPhotoDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
            const store = tx.objectStore(PHOTO_STORE_NAME);
            const request = store.delete(String(bookingId));
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => {
                console.warn('IndexedDB delete failed:', e.target.error);
                resolve(false);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('deletePhotoFromLocal error:', err);
        return false;
    }
}

async function migratePhotoInLocal(oldBookingId, newBookingId) {
    try {
        const existing = await getPhotoFromLocal(oldBookingId);
        if (existing) {
            await savePhotoToLocal(newBookingId, existing.customerPhoto, existing.idProofPhoto);
            await deletePhotoFromLocal(oldBookingId);
        }
    } catch (err) {
        console.warn(`migratePhotoInLocal(${oldBookingId} → ${newBookingId}) error:`, err);
    }
}
// ===== END INDEXEDDB PHOTO STORAGE =====

document.addEventListener('DOMContentLoaded', function () {
    initFirebaseServices();
    hydrateDataFromStorage();
    purgeLegacySeedData();
    enforceRequestedRoomSetup();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('newBookingForm').addEventListener('submit', handleNewBooking);
    startLiveClock();
    
    // Initialize Redesign features
    initAppRedesign();
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

// Quick fix function for booking status changes (for admin use)
window.fixBookingStatus = function(bookingId, newStatus) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) {
        alert(`Booking ${bookingId} not found!`);
        return false;
    }
    
    const oldStatus = booking.status;
    booking.status = newStatus;
    
    // If changing to completed, set checkout date/time
    if (newStatus === 'completed' && !booking.actualCheckOutDate) {
        booking.actualCheckOutDate = getLocalISODate();
        booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());
    }
    
    saveDataToStorage();
    syncBookingToFirebase(booking);
    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();
    
    alert(`✓ Booking ${bookingId} status changed from "${oldStatus}" to "${newStatus}"`);
    console.log(`Fixed booking ${bookingId}: ${oldStatus} → ${newStatus}`);
    return true;
};

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

    const checkInInput = document.getElementById('bookingCheckIn');
    if (checkInInput) {
        checkInInput.addEventListener('change', function () {
            updateSelectedRoomsDisplay();
        });
    }
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
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid var(--secondary);">
                <div>
                    <strong>${room.roomName}</strong> 
                    <span style="color: var(--text-light); font-size: 11px;">(Floor ${room.floor})</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--secondary);">₹${formatNumber(room.price)}</div>
                    ${idx > 0 ? `<button type="button" class="btn-primary" style="padding: 2px 6px; font-size: 10px; background: #E74C3C; margin-top: 2px;" onclick="removeRoomFromSelection(${room.roomId})"><i class="fas fa-trash"></i> Remove</button>` : '<small style="color: var(--text-light);">Primary</small>'}
                </div>
            </div>
        `;
    });

    // Auto-calculate dynamic surcharges
    let finalRate = totalRate;
    let surchargeInfo = [];
    const checkInDateVal = document.getElementById('bookingCheckIn') ? document.getElementById('bookingCheckIn').value : '';
    const settings = data.settings || {};

    if (checkInDateVal && settings.weekendSurcharge > 0) {
        // Use local day of week (Sunday is 0, Friday is 5, Saturday is 6)
        const dayOfWeek = new Date(checkInDateVal).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            const amt = totalRate * (settings.weekendSurcharge / 100);
            finalRate += amt;
            surchargeInfo.push(`Weekend Surge (+${settings.weekendSurcharge}%)`);
        }
    }

    if (settings.holidaySurgeActive && settings.holidaySurgeRate > 0) {
        const amt = totalRate * (settings.holidaySurgeRate / 100);
        finalRate += amt;
        surchargeInfo.push(`Holiday Surge (+${settings.holidaySurgeRate}%)`);
    }

    const roundedRate = Math.round(finalRate);

    // Auto fill Room Rate in the booking form
    const rateInput = document.getElementById('bookingRoomRate');
    if (rateInput) {
        rateInput.value = roundedRate;
        
        let surgeNotice = document.getElementById('bookingSurgeNotice');
        if (!surgeNotice) {
            surgeNotice = document.createElement('small');
            surgeNotice.id = 'bookingSurgeNotice';
            surgeNotice.style.cssText = 'display: block; color: var(--warning); font-weight: bold; margin-top: 4px;';
            rateInput.parentNode.appendChild(surgeNotice);
        }
        
        if (surchargeInfo.length > 0) {
            surgeNotice.textContent = `⚡ Surcharges applied: ${surchargeInfo.join(' & ')}`;
        } else {
            surgeNotice.textContent = '';
        }
    }

    html += `
        <div style="padding: 8px; background: #e8f4f8; border-radius: 4px; border-top: 2px solid var(--secondary); margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span><strong>Base Rate:</strong></span>
                <span style="font-weight: 600;">₹${formatNumber(totalRate)}</span>
            </div>
            ${surchargeInfo.length > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--warning); margin-top: 2px;">
                <span>Surcharges:</span>
                <span>+ ₹${formatNumber(roundedRate - totalRate)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); margin-top: 4px; padding-top: 4px; font-size: 14px;">
                <span><strong>Final Rate:</strong></span>
                <span style="color: var(--secondary); font-weight: 700;">₹${formatNumber(roundedRate)}</span>
            </div>
        </div>
    `;

    displayDiv.innerHTML = html;
}

function navigateTo(page, navElement) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const contentArea = document.querySelector('.content-area');
    if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(page);
    if (targetPage) targetPage.classList.add('active');
    activePage = page;

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (navElement) {
        navElement.classList.add('active');
    } else {
        // Fallback to find navigation item by onclick contents
        const matchingBtn = document.querySelector(`.nav-item[onclick*="${page}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard Overview', bookings: 'Booking Management Logs', rooms: 'Room Control Console',
        pricing: 'Room Pricing & Surcharges', guests: 'Guests CRM Database',
        payments: 'Payments & GST Ledger', analytics: 'Reports & Analytics Center', 'new-booking': 'Create New Booking',
        diary: 'Room Reservation Diary', 'audit-logs-tab': 'Audit Trails & Security Logs',
        'settings-tab': 'Console System Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'Admin Console';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'bookings': loadBookings(); break;
        case 'new-booking': loadNewBookingPage(); break;
        case 'rooms': loadRooms(); break;
        case 'pricing': 
            loadPricingPage(); 
            loadSurchargeSettings();
            break;
        case 'guests': loadGuests(); break;
        case 'payments': loadPayments(); break;
        case 'analytics': 
            setTimeout(() => {
                if (typeof createAnalyticsChart === 'function') createAnalyticsChart();
                initSalesCalendar();
            }, 100); 
            break;
        case 'diary': initDiary(); break;
        case 'audit-logs-tab': initAuditLogsExplorer(); break;
        case 'settings-tab': initSettings(); break;
    }

    if (window.innerWidth <= 900) {
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

        const bookingNumber = currentBookingId ? currentBookingId : 'N/A';
        const guestBookings = data.bookings.filter(b => b.guestName === guest.name || b.guestPhone === guest.phone);
        const photoBtn = guestBookings.length > 0
            ? `<button class="btn-primary" onclick='viewGuestBookingPhotos(${JSON.stringify(guest.name)}, ${JSON.stringify(guest.phone)})' style="padding: 6px 10px; font-size: 11px; background: #4F46E5;"><i class="fas fa-camera"></i> View All Stays</button>`
            : '<span style="color: #94A3B8; font-size: 11px;">No Photos</span>';

        html += `<tr><td><strong>${guest.name}</strong></td><td>${guest.email}</td><td>${guest.phone}</td><td>${bookingNumber}</td><td>${guest.visits}</td><td>${formatDate(guest.lastVisit)}</td><td>${photoBtn}</td></tr>`;
    });
    const tableBody = document.getElementById('guestsTable');
    if (tableBody) tableBody.innerHTML = html;
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

function loadPayments() {
    let totalRevenue = 0;
    let totalPending = 0;
    let totalReceived = 0;
    let totalTariff = 0;
    let totalGST = 0;

    // Build enriched payment data for sorting/filtering
    window._paymentRows = data.bookings.map(booking => {
        const days = typeof calculateBookingDays === 'function' ? calculateBookingDays(booking) : 1;
        const roomRate = Number(booking.roomRate) || 0;
        const roomTariff = roomRate * days;
        const discount = Number(booking.discount) || 0;
        const netTariff = Math.max(0, roomTariff - discount);
        const gstAmount = Math.round(netTariff * 0.05);  // 5% GST (2.5% CGST + 2.5% SGST)
        const extras = Number(booking.extras) || 0;
        const extraBed = Number(booking.extraBed) || 0;
        const total = getBookingTotal(booking);
        const balance = getBookingBalance(booking);
        const isFullyPaid = balance <= 0 || booking.status === 'paid' || booking.status === 'completed';
        const statusBadge = isFullyPaid ? 'paid' : 'pending';
        const pendingAmount = isFullyPaid ? 0 : balance;
        const receivedAmount = total - pendingAmount;

        totalRevenue += total;
        totalPending += pendingAmount;
        totalReceived += receivedAmount;
        totalTariff += netTariff;
        totalGST += gstAmount;

        const roomDisplayName = (booking.rooms && booking.rooms.length > 0)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.roomName || 'N/A');

        return {
            booking,
            roomDisplayName,
            netTariff,
            gstAmount,
            extras,
            total,
            advance: Number(booking.advance) || 0,
            pendingAmount,
            statusBadge,
            paymentMethod: booking.paymentMethod || 'Cash'
        };
    });

    // Update summary cards
    const el = id => document.getElementById(id);
    if (el('paymentTotalRevenue')) el('paymentTotalRevenue').textContent = `₹${formatNumber(totalRevenue)}`;
    if (el('paymentPendingBalance')) el('paymentPendingBalance').textContent = `₹${formatNumber(totalPending)}`;
    if (el('paymentReceivedAmount')) el('paymentReceivedAmount').textContent = `₹${formatNumber(totalReceived)}`;
    if (el('paymentTotalTariff')) el('paymentTotalTariff').textContent = `₹${formatNumber(totalTariff)}`;
    if (el('paymentTotalGST')) el('paymentTotalGST').textContent = `₹${formatNumber(totalGST)}`;

    filterPaymentsTable();
}

function filterPaymentsTable() {
    const rows = window._paymentRows || [];
    const searchVal = (document.getElementById('paymentSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || 'all';
    const methodFilter = document.getElementById('paymentMethodFilter')?.value || 'all';
    const sortBy = document.getElementById('paymentSortBy')?.value || 'newest';

    // Filter
    let filtered = rows.filter(r => {
        const matchSearch = !searchVal || 
            r.booking.guestName.toLowerCase().includes(searchVal) || 
            r.booking.id.toLowerCase().includes(searchVal);
        const matchStatus = statusFilter === 'all' || r.statusBadge === statusFilter;
        const matchMethod = methodFilter === 'all' || r.paymentMethod === methodFilter;
        return matchSearch && matchStatus && matchMethod;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'newest': return (b.booking.checkIn || '').localeCompare(a.booking.checkIn || '');
            case 'oldest': return (a.booking.checkIn || '').localeCompare(b.booking.checkIn || '');
            case 'amount-high': return b.total - a.total;
            case 'amount-low': return a.total - b.total;
            case 'guest-az': return a.booking.guestName.localeCompare(b.booking.guestName);
            default: return 0;
        }
    });

    // Render
    let html = '';
    filtered.forEach(r => {
        html += `<tr>
            <td><strong>INV-${r.booking.id}</strong></td>
            <td>${r.booking.guestName}</td>
            <td>${r.roomDisplayName}</td>
            <td>${formatDate(r.booking.checkIn)}</td>
            <td>${r.paymentMethod}</td>
            <td>₹${formatNumber(r.netTariff)}</td>
            <td>₹${formatNumber(r.gstAmount)}</td>
            <td>₹${formatNumber(r.extras)}</td>
            <td><strong>₹${formatNumber(r.total)}</strong></td>
            <td>₹${formatNumber(r.advance)}</td>
            <td style="color: ${r.pendingAmount > 0 ? 'var(--warning)' : 'var(--success)'}">₹${formatNumber(r.pendingAmount)}</td>
            <td><span class="status-badge ${r.statusBadge}">${capitalizeFirst(r.statusBadge)}</span></td>
            <td><button class="btn-primary receptionist-only" onclick="openExtraAmountModal('${r.booking.id}')" style="padding: 6px 10px; font-size: 11px;"><i class="fas fa-plus"></i> Extra</button></td>
            <td><button class="btn-primary" onclick="showReceipt('${r.booking.id}')" style="padding: 6px 12px; font-size: 11px;"><i class="fas fa-download"></i></button></td>
        </tr>`;
    });

    if (filtered.length === 0) {
        html = '<tr><td colspan="14" style="text-align: center; padding: 24px; color: var(--text-light);">No matching invoices found</td></tr>';
    }

    const tableBody = document.getElementById('paymentsTable');
    if (tableBody) tableBody.innerHTML = html;
}

// ═══════════════════════════════════════════════════
// GST BILL PRINTOUT — Filter & Print Functions
// ═══════════════════════════════════════════════════

let _gstPrintMethodFilter = 'all';

function setGSTPrintFilter(filter) {
    _gstPrintMethodFilter = filter;
    // Update active pill UI
    const pills = document.querySelectorAll('#gstFilterPills .gst-pill');
    pills.forEach(p => {
        p.classList.toggle('active', p.dataset.filter === filter);
    });
    updateGSTPrintCount();
}

function setGSTPrintPreset(preset) {
    const today = new Date();
    const fromEl = document.getElementById('gstPrintFromDate');
    const toEl = document.getElementById('gstPrintToDate');
    if (!fromEl || !toEl) return;

    const fmt = d => d.toISOString().split('T')[0];

    switch (preset) {
        case 'today':
            fromEl.value = fmt(today);
            toEl.value = fmt(today);
            break;
        case 'week': {
            const dow = today.getDay();
            const start = new Date(today);
            start.setDate(today.getDate() - dow);
            fromEl.value = fmt(start);
            toEl.value = fmt(today);
            break;
        }
        case 'month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            fromEl.value = fmt(start);
            toEl.value = fmt(today);
            break;
        }
        case 'all':
            fromEl.value = '';
            toEl.value = '';
            break;
    }
    updateGSTPrintCount();
}

function getGSTFilteredBookings() {
    const fromVal = document.getElementById('gstPrintFromDate')?.value || '';
    const toVal = document.getElementById('gstPrintToDate')?.value || '';

    return data.bookings.filter(b => {
        // Payment method filter
        const method = b.paymentMethod || 'Cash';
        if (_gstPrintMethodFilter === 'except-online') {
            if (method === 'Online') return false;
        } else if (_gstPrintMethodFilter !== 'all') {
            if (method !== _gstPrintMethodFilter) return false;
        }

        // Date range filter (based on check-in date)
        if (fromVal && b.checkIn && b.checkIn < fromVal) return false;
        if (toVal && b.checkIn && b.checkIn > toVal) return false;

        return true;
    });
}

function updateGSTPrintCount() {
    const filtered = getGSTFilteredBookings();
    const el = document.getElementById('gstPrintRecordCount');
    if (el) {
        el.innerHTML = `<i class="fas fa-file-invoice" style="color: #16a34a;"></i> <span><strong>${filtered.length}</strong> bill${filtered.length !== 1 ? 's' : ''} matched</span>`;
    }
}

function printGSTBills() {
    const bookings = getGSTFilteredBookings();
    if (bookings.length === 0) {
        alert('No bills match the selected filters. Please adjust your filters and try again.');
        return;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';

    let invoicesHTML = '';

    bookings.forEach((booking, idx) => {
        const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
        let checkOutDateObj = booking.checkOut ? new Date(booking.checkOut) : new Date();
        if (booking.actualCheckOutDate) checkOutDateObj = new Date(booking.actualCheckOutDate);

        const msPerDay = 1000 * 60 * 60 * 24;
        let days = Math.ceil(Math.abs(checkOutDateObj - checkInDate) / msPerDay);
        if (days < 1 || isNaN(days)) days = 1;

        const dailyRate = booking.roomRate || 0;
        const totalRate = dailyRate * days;
        const discountGross = booking.discount || 0;
        const extras = booking.extras || 0;
        const extraBed = booking.extraBed || 0;
        const totalGrossRoom = Math.max(0, totalRate - discountGross);
        const totalAmount = totalGrossRoom + extraBed + extras;

        const grossBaseTariff = totalRate / 1.05;
        const baseDiscount = discountGross / 1.05;
        const netBaseTariff = totalGrossRoom / 1.05;
        const cgst = netBaseTariff * 0.025;
        const sgst = netBaseTariff * 0.025;

        const guestName = booking.guestName || '';
        const guestPhone = booking.guestPhone || '';
        const guestGST = booking.guestGST || '';

        const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;

        const invYY = checkOutDateObj.getFullYear().toString().slice(2);
        const invMM = ('0' + (checkOutDateObj.getMonth() + 1)).slice(-2);
        const invDD = ('0' + checkOutDateObj.getDate()).slice(-2);
        const invId = (booking.id || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');
        const invoiceNumber = `${invYY}${invMM}${invDD}${invId}`;

        const arrivalText = typeof formatDateTime === 'function' ? formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '') : (booking.checkIn || '');
        const depText = typeof formatDateTime === 'function' ? formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '') : (booking.checkOut || '');

        const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
        const fCount = booking.femaleCount || 0;
        const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);
        const guestSubLine = `Male : ${mCount} Female : ${fCount} Child : ${cCount}`;

        const roomsDisplay = (booking.rooms && booking.rooms.length > 1)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.rooms && booking.rooms.length === 1 ? booking.rooms[0].roomName : booking.roomName);

        const payMethod = booking.paymentMethod || 'Cash';

        invoicesHTML += `
        <div class="invoice-page" style="page-break-after: always; background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height:1.4;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <img src="logo - Copy.jpeg" style="width:120px; height:auto; margin-bottom:5px;" alt="Logo" onerror="this.style.display='none';">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family:'Times New Roman',serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 6369216621<br>
                    Website : www.sripadmavatipleasants.com<br>
                    GSTN: ${printGst}
                </div>
            </div>

            <!-- Title Bar -->
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:20px;">
                Tax Invoice
            </div>

            <!-- Info Grid -->
            <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height:1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${guestName.toUpperCase()}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        ${guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${guestGST}</strong></td></tr>` : ''}
                        <tr><td>Vehicle No.</td><td><strong>${booking.vehicleNumber || ''}</strong></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>
                        <tr><td>Payment</td><td><strong>${payMethod}</strong></td></tr>
                    </table>
                </div>
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height:1.6;">
                        <tr><td style="width:100px;">Bill No.</td><td><strong>${invoiceNumber}</strong></td></tr>
                        <tr><td>Room No</td><td><strong>${roomsDisplay}</strong></td></tr>
                        <tr><td>Bill Date</td><td><strong>${billDate}</strong></td></tr>
                        <tr><td>SAC Code</td><td>996311</td></tr>
                        <tr><td>Arrival</td><td>${arrivalText}</td></tr>
                        <tr><td>Departure</td><td>${depText}</td></tr>
                        <tr><td>Days</td><td>${days}</td></tr>
                        <tr><td colspan="2" style="font-size:11px; padding-top:15px; color:#555;">${guestSubLine}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Main Table -->
            <table style="width:100%; border-collapse:collapse; border-top:1.5px solid #ccc; border-bottom:1.5px solid #ccc; text-align:right; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #ccc;">
                        <th style="text-align:center; padding:10px 4px; font-weight:bold;">Date</th>
                        <th style="text-align:center; padding:10px 4px; font-weight:bold;">Room</th>
                        <th style="padding:10px 4px; font-weight:bold;">Tariff</th>
                        <th style="padding:10px 4px; font-weight:bold;">E.Bed</th>
                        <th style="padding:10px 4px; font-weight:bold;">Disc</th>
                        <th style="padding:10px 4px; font-weight:bold;">CGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold;">SGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold;">FnB</th>
                        <th style="padding:10px 4px; font-weight:bold;">Oths</th>
                        <th style="padding:10px 4px; font-weight:bold;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align:center; padding:12px 4px;">${billDate}</td>
                        <td style="text-align:center; padding:12px 4px;">${roomsDisplay}</td>
                        <td style="padding:12px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                    <tr style="height:80px;"><td colspan="10"></td></tr>
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:12px 4px;">Total</td>
                        <td style="padding:12px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Footer -->
            <div style="margin-top:20px; font-size:11px; display:flex; justify-content:space-between;">
                <div style="width:48%;">
                    <p style="margin:0 0 5px 0;">Certified that the particulars given above are true and correct.</p>
                    <p style="margin:0; font-weight:bold; font-size:13px;">For SRI PADMAVATI PLEASANTS</p>
                </div>
                <div style="width:48%; color:#555;">
                    <p style="margin:0 0 3px 0;">*Regardless of the billing instruction, I agree to be held personally liable for the payment of the total amount of bill for my stay in the hotel.</p>
                    <p style="margin:0;">*All disputes subject to PALANI Jurisdiction.</p>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:50px; margin-bottom:20px;">
                <div>
                    <p style="margin:0 0 5px 0; font-size:12px; font-family:'Times New Roman',serif;">bookings@sripadmavatipleasants.com</p>
                    <p style="margin:0; font-weight:bold; font-size:14px;">Receptionist Sign</p>
                </div>
                <div>
                    <p style="margin:0; font-weight:bold; font-size:14px;">Guest Sign</p>
                </div>
            </div>

            <div style="background:#eef2f6; padding:8px 15px; display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:10px;">
                <div style="width:30%; color:#555;">www.sripadmavatipleasants.com</div>
                <div style="width:40%; text-align:center; font-weight:bold; font-size:13px;">Thank You, Visit Again</div>
                <div style="width:30%; text-align:right; color:#555;">E.&O.E.</div>
            </div>
        </div>
        `;
    });

    // Open print window
    const printWindow = window.open('', '', 'height=900,width=950');
    printWindow.document.write(`
        <html>
        <head>
            <title>GST Bills - Bulk Print (${bookings.length} invoice${bookings.length !== 1 ? 's' : ''})</title>
            <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .invoice-page { padding: 15px; }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; width: 210mm; }
                    .invoice-page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10px !important; page-break-after: always; }
                    .invoice-page:last-child { page-break-after: avoid; }
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 600);">
            ${invoicesHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ═══════════════════════════════════════════════════

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

    // Sum balances of active (non-completed/non-cancelled) bookings
    const activeStatuses = ['confirmed', 'pending', 'paid'];
    const pendingPayments = data.bookings
        .filter(booking => activeStatuses.includes(booking.status))
        .reduce((sum, booking) => sum + getBookingBalance(booking), 0);

    setTextById('metricTotalRooms', String(totalRooms));
    
    setTextById('metricOccupiedRooms', String(occupiedRooms));
    setTextById('metricOccupiedRoomsInfo', `${occupiedRooms} of ${totalRooms} rooms occupied`);
    
    setTextById('metricAvailableRooms', String(availableRooms));
    setTextById('metricAvailableRoomsInfo', `${availableRooms} of ${totalRooms} available`);
    
    setTextById('metricTotalBookings', String(totalBookings));
    setTextById('metricTotalBookingsInfo', 'Total bookings on record');
    
    setTextById('statCheckinsToday', String(checkInsToday));
    setTextById('statCheckoutsToday', String(checkOutsToday));
    setTextById('statMaintenance', String(maintenanceRooms));
    
    setTextById('statMonthlyRevenue', `₹${formatNumber(monthlyRevenue)}`);
    
    setTextById('metricPendingPayments', `₹${formatNumber(pendingPayments)}`);
    setTextById('metricPendingPaymentsInfo', `Outstanding frontdesk balance`);

    setTextById('metricRevenueToday', `₹${formatNumber(revenueToday)}`);
    
    // Enhanced owner financials and reports calculations
    const activeBookingsToday = data.bookings.filter(b => b.checkIn <= today && b.checkOut >= today && b.status !== 'cancelled');
    let roomsBookedToday = 0;
    activeBookingsToday.forEach(b => {
        if (b.rooms && Array.isArray(b.rooms)) {
            roomsBookedToday += b.rooms.length;
        } else if (b.roomId) {
            roomsBookedToday += 1;
        }
    });
    const avgOccRate = Math.min(100, Math.round((roomsBookedToday / 9) * 100));
    
    let totalDays = 0;
    let validBookingsCount = 0;
    let totalDiscounts = 0;
    let totalNetRoomRevenue = 0;
    let totalRoomNights = 0;
    
    data.bookings.forEach(b => {
        if (b.status !== 'cancelled') {
            const days = calculateBookingDays(b);
            totalDays += days;
            validBookingsCount++;
            
            const discount = Number(b.discount) || 0;
            totalDiscounts += discount;
            
            const totalRoom = (Number(b.roomRate) || 0) * days;
            totalNetRoomRevenue += Math.max(0, totalRoom - discount);
            
            if (b.rooms && Array.isArray(b.rooms)) {
                totalRoomNights += b.rooms.length * days;
            } else {
                totalRoomNights += days;
            }
        }
    });
    
    const avgDuration = validBookingsCount > 0 ? (totalDays / validBookingsCount).toFixed(1) : '1.2';
    const adr = totalRoomNights > 0 ? (totalNetRoomRevenue / totalRoomNights) : 0;
    const revpar = adr * (avgOccRate / 100);
    
    const cgst = totalNetRoomRevenue * 0.025;
    const sgst = totalNetRoomRevenue * 0.025;
    const gstTotal = cgst + sgst;
    
    setTextById('repOccupancyRate', `${avgOccRate}%`);
    setTextById('repAvgDuration', `${avgDuration} Nights`);
    setTextById('repAdr', `₹${formatNumber(Math.round(adr))}`);
    setTextById('repRevPar', `₹${formatNumber(Math.round(revpar))}`);
    setTextById('repTotalDiscounts', `₹${formatNumber(totalDiscounts)}`);
    setTextById('repCgstCollected', `₹${formatNumber(Math.round(cgst))}`);
    setTextById('repSgstCollected', `₹${formatNumber(Math.round(sgst))}`);
    setTextById('repGstCollected', `₹${formatNumber(Math.round(gstTotal))}`);
    
    // Trigger sparkline draws
    if (typeof drawSparklines === 'function') {
        drawSparklines();
    }
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
        
        // Extended Redesign arrays
        data.staff = sData.staff || [];
        data.housekeepingTasks = sData.housekeepingTasks || [];
        data.notifications = sData.notifications || [];
        data.settings = sData.settings || {
            lodgeName: 'Sri Padmavati Pleasants',
            gstNumber: '33ANCPP8116B1ZF',
            taxes: { cgst: 2.5, sgst: 2.5 },
            roomCategories: ['Single', 'Double', 'Family', 'Suite'],
            backupSchedule: 'Weekly'
        };
        data.auditLogs = sData.auditLogs || [];
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
        // Strip base64 photo data from bookings to prevent localStorage quota issues.
        // Photos are persisted separately in IndexedDB (local) and Firebase (cloud).
        const strippedBookings = data.bookings.map(booking => {
            const copy = Object.assign({}, booking);
            delete copy.customerPhoto;
            delete copy.idProofPhoto;
            return copy;
        });

        const storageData = {
            rooms: data.rooms,
            bookings: strippedBookings,
            customers: data.customers,
            guests: data.guests,
            diary: data.diary,
            staff: data.staff,
            housekeepingTasks: data.housekeepingTasks,
            notifications: data.notifications,
            settings: data.settings,
            auditLogs: data.auditLogs
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
}

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

// ===== DOWNLOAD ALL BOOKING DATA (OWNER ONLY) =====

function setDownloadPreset(preset) {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');
    if (!fromInput || !toInput) return;

    const today = new Date();
    const todayISO = getLocalISODate();

    // Remove active class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    const buttons = document.querySelectorAll('.preset-btn');
    const presetIndex = { today: 0, week: 1, month: 2, all: 3 };
    if (buttons[presetIndex[preset]]) {
        buttons[presetIndex[preset]].classList.add('active');
    }

    switch (preset) {
        case 'today':
            fromInput.value = todayISO;
            toInput.value = todayISO;
            break;
        case 'week': {
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(today);
            monday.setDate(today.getDate() + mondayOffset);
            const sundayEnd = new Date(monday);
            sundayEnd.setDate(monday.getDate() + 6);
            fromInput.value = toISODateFromDate(monday);
            toInput.value = toISODateFromDate(sundayEnd);
            break;
        }
        case 'month': {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            fromInput.value = toISODateFromDate(firstDay);
            toInput.value = toISODateFromDate(lastDay);
            break;
        }
        case 'all':
            fromInput.value = '2020-01-01';
            toInput.value = todayISO;
            break;
    }

    updateDownloadRecordCount();
}

function updateDownloadRecordCount() {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');
    const countEl = document.getElementById('downloadRecordCount');
    if (!fromInput || !toInput || !countEl) return;

    const fromDate = fromInput.value;
    const toDate = toInput.value;

    if (!fromDate || !toDate) {
        countEl.className = 'download-record-count';
        countEl.innerHTML = '<i class="fas fa-database"></i> <span>Select a date range to preview</span>';
        return;
    }

    const filtered = data.bookings.filter(booking => {
        const checkInDate = booking.checkIn;
        if (!checkInDate) return false;
        return checkInDate >= fromDate && checkInDate <= toDate;
    });

    if (filtered.length === 0) {
        countEl.className = 'download-record-count';
        countEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>No records found in this range</span>';
    } else {
        countEl.className = 'download-record-count has-records';
        countEl.innerHTML = `<i class="fas fa-check-circle"></i> <span>${filtered.length} booking${filtered.length !== 1 ? 's' : ''} found</span>`;
    }
}

async function downloadAllBookingData() {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');

    if (!fromInput || !toInput) {
        alert('Date range inputs not found');
        return;
    }

    const fromDate = fromInput.value;
    const toDate = toInput.value;

    if (!fromDate || !toDate) {
        alert('Please select both From and To dates before downloading.');
        return;
    }

    if (fromDate > toDate) {
        alert('From date cannot be after To date.');
        return;
    }

    // Filter bookings by created/check-in date range
    const filtered = data.bookings.filter(booking => {
        const bookingDate = booking.checkIn;
        if (!bookingDate) return false;
        return bookingDate >= fromDate && bookingDate <= toDate;
    });

    if (filtered.length === 0) {
        alert('No bookings found in the selected date range.');
        return;
    }

    const countEl = document.getElementById('downloadRecordCount');
    if (countEl) {
        countEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Preparing PDF...</span>';
    }

    const printWindow = window.open('', '', 'height=800,width=900');
    if (!printWindow) {
        alert('Please allow popups for this site to generate the PDF bills.');
        if (countEl) updateDownloadRecordCount();
        return;
    }
    printWindow.document.write('<html><head><title>Loading...</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f4f4f4;}h2{color:#333;}</style></head><body><h2>Preparing PDF Bills... This may take a moment.</h2></body></html>');

    // Attempt to fetch photos from Firebase for all bookings in range
    const photoMap = {};
    if (firebaseEnabled && firebaseDb) {
        try {
            for (const booking of filtered) {
                const localCustomer = booking.customerPhoto || booking.customerPhotoUrl;
                const localIdProof = booking.idProofPhoto || booking.idProofPhotoUrl;

                if (!localCustomer || !localIdProof) {
                    try {
                        const doc = await firebaseDb.collection('booking_photos').doc(String(booking.id)).get();
                        if (doc.exists) {
                            const picData = doc.data();
                            photoMap[booking.id] = {
                                customerPhoto: localCustomer || picData.customerPhoto || null,
                                idProofPhoto: localIdProof || picData.idProofPhoto || null
                            };
                        } else {
                            photoMap[booking.id] = {
                                customerPhoto: localCustomer || null,
                                idProofPhoto: localIdProof || null
                            };
                        }
                    } catch (e) {
                        photoMap[booking.id] = {
                            customerPhoto: localCustomer || null,
                            idProofPhoto: localIdProof || null
                        };
                    }
                } else {
                    photoMap[booking.id] = {
                        customerPhoto: localCustomer,
                        idProofPhoto: localIdProof
                    };
                }
            }
        } catch (e) {
            console.warn('Could not fetch photos from Firebase:', e);
        }
    } else {
        // Use local data only
        filtered.forEach(booking => {
            photoMap[booking.id] = {
                customerPhoto: booking.customerPhoto || booking.customerPhotoUrl || null,
                idProofPhoto: booking.idProofPhoto || booking.idProofPhotoUrl || null
            };
        });
    }

    let allBillsHTML = '';
    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';

    for (let i = 0; i < filtered.length; i++) {
        const booking = filtered[i];
        let discountGross = booking.discount || 0;

        const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
        let checkOutDateObj = booking.checkOut ? new Date(booking.checkOut) : new Date();
        if (booking.actualCheckOutDate) {
            checkOutDateObj = new Date(booking.actualCheckOutDate);
        }

        const msPerDay = 1000 * 60 * 60 * 24;
        let days = Math.ceil(Math.abs(checkOutDateObj - checkInDate) / msPerDay);
        if (days < 1 || isNaN(days)) days = 1;

        const dailyRate = booking.roomRate || 0;
        const totalRate = dailyRate * days;
        const extras = booking.extras || 0;
        const extraBed = booking.extraBed || 0;
        const totalGrossRoom = Math.max(0, totalRate - discountGross);
        const totalAmount = totalGrossRoom + extraBed + extras;

        const grossBaseTariff = totalRate / 1.05;
        const baseDiscount = discountGross / 1.05;
        const netBaseTariff = totalGrossRoom / 1.05;

        const cgst = netBaseTariff * 0.025;
        const sgst = netBaseTariff * 0.025;

        let customerRecord = {};
        if (typeof getCustomerRecordForBooking === 'function') {
             customerRecord = getCustomerRecordForBooking(booking) || {};
        }

        const guestPhone = booking.guestPhone || customerRecord.mobile || customerRecord.phone || '';
        const guestName = booking.guestName || '';
        let guestAddress = customerRecord.address || '';
        if (!guestAddress) {
            guestAddress = (booking.idProofType ? booking.idProofType + ' provided' : '');
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;

        const invYY = checkOutDateObj.getFullYear().toString().slice(2);
        const invMM = ('0' + (checkOutDateObj.getMonth() + 1)).slice(-2);
        const invDD = ('0' + checkOutDateObj.getDate()).slice(-2);
        const invId = (booking.id || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');
        const invoiceNumber = `${invYY}${invMM}${invDD}${invId}`;

        const arrivalText = formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '');
        const depText = formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '');

        const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
        const fCount = booking.femaleCount || 0;
        const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);
        const guestSubLine = `Male : ${mCount} Female : ${fCount} Child : ${cCount}`;

        const guestGST = booking.guestGST || '';
        guestAddress = guestAddress.replace(/\n/g, '<br>');

        const roomsDisplay = (booking.rooms && booking.rooms.length > 1)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.rooms && booking.rooms.length === 1
                ? booking.rooms[0].roomName
                : booking.roomName);
                
        const photos = photoMap[booking.id] || {};
        const custImg = photos.customerPhoto ? `<img src="${photos.customerPhoto}" style="width:120px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">` : '<div style="width:120px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No Photo</div>';
        const idImg = photos.idProofPhoto ? `<img src="${photos.idProofPhoto}" style="width:160px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">` : '<div style="width:160px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No ID Proof</div>';

        allBillsHTML += `
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height: 1.4; page-break-after: always; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family: 'Times New Roman', serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 6369216621<br>
                    Website : www.sripadmavatipleasants.com<br>
                    GSTN: ${printGst}
                </div>
            </div>
            
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:15px;">
                Tax Invoice - ${booking.status.toUpperCase()}
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${guestName.toUpperCase()}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        ${guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${guestGST}</strong></td></tr>` : ''}
                        <tr><td style="vertical-align:top;">Address</td><td>${guestAddress}</td></tr>
                        <tr><td>Vehicle No.</td><td><strong>${booking.vehicleNumber || ''}</strong></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>
                    </table>
                </div>
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:100px;">Bill No.</td><td><strong>${invoiceNumber}</strong></td></tr>
                        <tr><td>Room No</td><td><strong>${roomsDisplay}</strong></td></tr>
                        <tr><td>Bill Date</td><td><strong>${billDate}</strong></td></tr>
                        <tr><td>SAC Code</td><td>996311</td></tr>
                        <tr><td>Arrival</td><td>${arrivalText}</td></tr>
                        <tr><td>Departure</td><td>${depText}</td></tr>
                        <tr><td>Days</td><td>${days}</td></tr>
                        <tr><td colspan="2" style="font-size:11px; padding-top:10px; color:#555;">${guestSubLine}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Photos -->
            <div style="display:flex; gap:20px; margin-bottom:15px; border:1px solid #eee; padding:10px; border-radius:8px; background:#fafafa;">
                <div>
                    <div style="font-size:10px; color:#666; margin-bottom:4px; font-weight:bold;">GUEST PHOTO</div>
                    ${custImg}
                </div>
                <div>
                    <div style="font-size:10px; color:#666; margin-bottom:4px; font-weight:bold;">ID PROOF</div>
                    ${idImg}
                </div>
            </div>
            
            <table style="width:100%; border-collapse:collapse; border-top:1.5px solid #ccc; border-bottom:1.5px solid #ccc; text-align:right; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #ccc;">
                        <th style="text-align:center; padding:8px 4px; font-weight:bold;">Date</th>
                        <th style="text-align:center; padding:8px 4px; font-weight:bold;">Room</th>
                        <th style="padding:8px 4px; font-weight:bold;">Tariff</th>
                        <th style="padding:8px 4px; font-weight:bold;">E.Bed</th>
                        <th style="padding:8px 4px; font-weight:bold;">Disc</th>
                        <th style="padding:8px 4px; font-weight:bold;">CGST<br>2.50%</th>
                        <th style="padding:8px 4px; font-weight:bold;">SGST<br>2.50%</th>
                        <th style="padding:8px 4px; font-weight:bold;">Oths</th>
                        <th style="padding:8px 4px; font-weight:bold;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align:center; padding:8px 4px;">${billDate}</td>
                        <td style="text-align:center; padding:8px 4px;">${roomsDisplay}</td>
                        <td style="padding:8px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:8px 4px;">Total</td>
                        <td style="padding:8px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        `;
    }

    if(updateDownloadRecordCount) updateDownloadRecordCount();

    printWindow.document.open();
    printWindow.document.write(`
        <html>
        <head>
            <title>Booking Data - All Bills</title>
            <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background:#ccc;}
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; background: #fff;}
                    .receipt-a4-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow:none !important; border:none !important; }
                    /* Force background colors and exact table styles to print */
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
                @media screen {
                    .receipt-a4-container { margin: 20px auto !important; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                }
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 1500);">${allBillsHTML}</body>
        </html>
    `);
    printWindow.document.close();
}

// Initialize date range listeners
document.addEventListener('DOMContentLoaded', function() {
    const fromDateInput = document.getElementById('downloadFromDate');
    const toDateInput = document.getElementById('downloadToDate');

    if (fromDateInput) {
        fromDateInput.addEventListener('change', function() {
            // Remove active class from preset buttons when manually changing dates
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
            updateDownloadRecordCount();
        });
    }
    if (toDateInput) {
        toDateInput.addEventListener('change', function() {
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
            updateDownloadRecordCount();
        });
    }
});


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
    const changePasswordModal = document.getElementById('changePasswordModal');
    const guestPhotoHistoryModal = document.getElementById('guestPhotoHistoryModal');

    if (event.target == receiptModal) closeReceiptModal();
    if (event.target == priceModal) closePriceModal();
    if (event.target == extraAmountModal) closeExtraAmountModal();
    if (event.target == roomDetailsModal) closeRoomDetailsModal();
    if (event.target == changePasswordModal) closeChangePasswordModal();
    if (event.target == guestPhotoHistoryModal) closeGuestPhotoHistoryModal();
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

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('active');
}

async function handlePasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match!");
        return;
    }

    if (!firebaseEnabled || !firebaseAuth) {
        alert("Authentication service is unavailable.");
        return;
    }

    const user = firebaseAuth.currentUser;
    if (!user) {
        alert("No user is currently signed in.");
        return;
    }

    const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Updating...";
    submitBtn.disabled = true;

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        alert("Password updated successfully!");
        closeChangePasswordModal();
    } catch (error) {
        console.error("Error changing password:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("The current password you entered is incorrect.");
        } else if (error.code === 'auth/weak-password') {
            alert("The new password is too weak. Please use at least 6 characters.");
        } else {
            alert("Failed to update password: " + error.message);
        }
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// ==========================================
// REDESIGN ENTERPRISE LOGIC & INITIALIZERS
// ==========================================

function initAppRedesign() {
    // 1. Seed defaults if empty
    if (!data.staff || data.staff.length === 0) {
        data.staff = [
            { id: 'ST001', name: 'John Doe', role: 'Manager', phone: '9842816621', email: 'john@sripadmavati.com', status: 'Active', shift: 'Morning' },
            { id: 'ST002', name: 'Jane Smith', role: 'Receptionist', phone: '6369216621', email: 'jane@sripadmavati.com', status: 'Active', shift: 'Evening' },
            { id: 'ST003', name: 'Kumar Swami', role: 'Housekeeping', phone: '9488886101', email: 'kumar@sripadmavati.com', status: 'Active', shift: 'Morning' }
        ];
    }
    if (!data.housekeepingTasks || data.housekeepingTasks.length === 0) {
        data.housekeepingTasks = [
            { id: 'HK001', roomId: 101, roomName: 'F1-102', staffName: 'Kumar Swami', priority: 'Normal', status: 'todo', notes: 'Change linen and vacuum floor' },
            { id: 'HK002', roomId: 105, roomName: 'F1-101', staffName: 'Kumar Swami', priority: 'High', status: 'progress', notes: 'Technical cleaning before check-in' }
        ];
    }
    if (!data.notifications || data.notifications.length === 0) {
        data.notifications = [
            { id: 'NT001', type: 'new-booking', title: 'System Online', message: 'Lodge admin console loaded successfully.', time: new Date().toISOString(), read: false }
        ];
    }
    if (!data.auditLogs || data.auditLogs.length === 0) {
        data.auditLogs = [
            { id: 'LOG001', time: new Date().toISOString(), action: 'System Init', description: 'Redesigned administration panel initialized.' }
        ];
    }
    if (!data.settings) {
        data.settings = {
            lodgeName: 'Sri Padmavati Pleasants',
            gstNumber: '33ANCPP8116B1ZF',
            taxes: { cgst: 2.5, sgst: 2.5 },
            roomCategories: ['Single', 'Double', 'Family', 'Suite'],
            backupSchedule: 'Weekly',
            weekendSurcharge: 10,
            holidaySurgeActive: false,
            holidaySurgeRate: 20
        };
    } else {
        if (data.settings.weekendSurcharge === undefined) data.settings.weekendSurcharge = 10;
        if (data.settings.holidaySurgeActive === undefined) data.settings.holidaySurgeActive = false;
        if (data.settings.holidaySurgeRate === undefined) data.settings.holidaySurgeRate = 20;
    }

    // 2. Apply saved Dark Mode preference
    const isDark = localStorage.getItem('darkModePreference') === 'true';
    if (isDark) {
        document.body.classList.add('dark-theme');
        const toggleIcon = document.querySelector('#darkModeToggle i');
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-moon');
            toggleIcon.classList.add('fa-sun');
        }
    }

    // 3. Setup global listeners
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearchInput');
            if (searchInput) searchInput.focus();
        }
    });

    // 4. Render Notifications count & feed
    renderNotifications();
    
    // 5. Render Audit Logs
    renderAuditLogs();

    // 6. Draw Dashboard metrics sparklines
    setTimeout(drawSparklines, 500);
}

// --- DARK MODE TOGGLE ---
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkModePreference', isDark);
    const toggleIcon = document.querySelector('#darkModeToggle i');
    if (toggleIcon) {
        if (isDark) {
            toggleIcon.classList.remove('fa-moon');
            toggleIcon.classList.add('fa-sun');
            addAuditLog('System Style', 'Switched console layout style to Dark Mode.');
        } else {
            toggleIcon.classList.remove('fa-sun');
            toggleIcon.classList.add('fa-moon');
            addAuditLog('System Style', 'Switched console layout style to Light Mode.');
        }
    }
}

// --- DROPDOWNS MANAGEMENT ---
function toggleDropdown(dropdownId) {
    const target = document.getElementById(dropdownId);
    const isActive = target && target.classList.contains('active');
    hideAllDropdowns();
    if (target && !isActive) {
        target.classList.add('active');
    }
}

function hideAllDropdowns() {
    document.querySelectorAll('.user-dropdown, .notif-dropdown').forEach(d => d.classList.remove('active'));
}

// --- GLOBAL SEARCH ENGINE ---
function handleGlobalSearch(query) {
    const q = query.trim().toLowerCase();
    
    // 1. If searching on bookings page
    if (activePage === 'bookings') {
        const sections = document.querySelectorAll('.month-booking-section');
        sections.forEach(sec => {
            const rows = sec.querySelectorAll('tbody tr');
            let visibleRowsInSec = 0;
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                if (text.includes(q)) {
                    row.style.display = '';
                    visibleRowsInSec++;
                } else {
                    row.style.display = 'none';
                }
            });
            if (visibleRowsInSec > 0 || q === '') {
                sec.style.display = '';
            } else {
                sec.style.display = 'none';
            }
        });
    }
    
    // 2. If searching on guests CRM page
    else if (activePage === 'guests') {
        const rows = document.querySelectorAll('#guestsTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 3. If searching on payments billing page
    else if (activePage === 'payments') {
        const rows = document.querySelectorAll('#paymentsTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 4. If searching on room control page
    else if (activePage === 'rooms') {
        const cards = document.querySelectorAll('.room-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 5. If searching on pricing list page
    else if (activePage === 'pricing') {
        const rows = document.querySelectorAll('#pricingTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }
}

// --- REAL-TIME AUDIT LOGGING ---
function addAuditLog(action, description) {
    const logId = `LOG${String(data.auditLogs.length + 1).padStart(3, '0')}`;
    const newLog = {
        id: logId,
        time: new Date().toISOString(),
        action,
        description
    };
    data.auditLogs.unshift(newLog);
    if (data.auditLogs.length > 50) data.auditLogs.pop(); // Cap at 50 logs
    
    saveDataToStorage();
    renderAuditLogs();
    
    // Sync to Firestore if enabled
    if (firebaseEnabled && firebaseDb) {
        try {
            firebaseDb.collection('audit_logs').doc(logId).set({
                ...newLog,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.warn('Could not sync audit log to Firebase:', e);
        }
    }
}

function renderAuditLogs() {
    const container = document.getElementById('activityLogsContainer');
    if (!container) return;
    
    if (data.auditLogs.length === 0) {
        container.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-light); text-align: center;">No activity logged.</div>`;
        return;
    }
    
    let html = '';
    data.auditLogs.slice(0, 10).forEach(log => {
        let iconClass = 'fa-history';
        let badgeType = 'booking';
        
        if (log.action.includes('Booking')) { iconClass = 'fa-calendar-check'; badgeType = 'booking'; }
        else if (log.action.includes('Payment') || log.action.includes('Tariff')) { iconClass = 'fa-credit-card'; badgeType = 'payment'; }
        else if (log.action.includes('Room') || log.action.includes('Clean')) { iconClass = 'fa-door-open'; badgeType = 'warning'; }
        
        const logTime = new Date(log.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        html += `
            <div class="activity-item">
                <div class="activity-icon ${badgeType}"><i class="fas ${iconClass}"></i></div>
                <div style="flex-grow: 1;">
                    <div class="activity-title">${log.action}</div>
                    <div class="activity-description">${log.description}</div>
                    <small style="color: var(--text-light); font-size: 10px;">${logTime}</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// --- OWNER AUDIT LOGS EXPLORER ---
function initAuditLogsExplorer() {
    filterAuditLogs();
}

function filterAuditLogs() {
    const tableBody = document.getElementById('auditLogsExplorerTable');
    if (!tableBody) return;
    
    const searchVal = document.getElementById('auditSearchInput').value.toLowerCase();
    const catVal = document.getElementById('auditCategoryFilter').value;
    
    let filtered = data.auditLogs || [];
    
    // 1. Search Query Filter
    if (searchVal) {
        filtered = filtered.filter(log => 
            log.action.toLowerCase().includes(searchVal) || 
            log.description.toLowerCase().includes(searchVal)
        );
    }
    
    // 2. Category Filter
    if (catVal !== 'all') {
        filtered = filtered.filter(log => {
            const action = log.action.toLowerCase();
            const desc = log.description.toLowerCase();
            if (catVal === 'booking') return action.includes('booking') || desc.includes('booking') || action.includes('check');
            if (catVal === 'payment') return action.includes('payment') || desc.includes('payment') || action.includes('tariff') || action.includes('invoice') || desc.includes('billing');
            if (catVal === 'room') return action.includes('room') || desc.includes('room') || action.includes('clean') || desc.includes('clean');
            if (catVal === 'system') return action.includes('system') || desc.includes('system') || action.includes('settings') || desc.includes('setting');
            return true;
        });
    }
    
    let html = '';
    if (filtered.length === 0) {
        html = `<tr><td colspan="3" style="text-align: center; color: var(--text-light); padding: 20px;">No audit records match the filters.</td></tr>`;
    } else {
        filtered.forEach(log => {
            let catBadgeColor = 'var(--text-light)';
            const action = log.action.toLowerCase();
            const desc = log.description.toLowerCase();
            let categoryName = 'General';
            
            if (action.includes('booking') || desc.includes('booking') || action.includes('check')) {
                catBadgeColor = 'var(--secondary)';
                categoryName = 'Booking';
            } else if (action.includes('payment') || desc.includes('payment') || action.includes('tariff') || action.includes('invoice') || desc.includes('billing')) {
                catBadgeColor = 'var(--success)';
                categoryName = 'Payment';
            } else if (action.includes('room') || desc.includes('room') || action.includes('clean') || desc.includes('clean')) {
                catBadgeColor = 'var(--warning)';
                categoryName = 'Room Setup';
            } else if (action.includes('system') || desc.includes('system') || action.includes('settings') || desc.includes('setting')) {
                catBadgeColor = 'var(--danger)';
                categoryName = 'System Settings';
            }
            
            const badge = `<span class="status-badge" style="background: ${catBadgeColor}15; color: ${catBadgeColor};">${categoryName}</span>`;
            const formattedTime = new Date(log.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
            
            html += `
                <tr>
                    <td style="white-space: nowrap; font-size: 12px; color: var(--text-light);">${formattedTime}</td>
                    <td>${badge} <strong>${log.action}</strong></td>
                    <td style="font-size: 13px;">${log.description}</td>
                </tr>
            `;
        });
    }
    tableBody.innerHTML = html;
}

function exportAuditLogsToCSV() {
    if (data.auditLogs.length === 0) {
        alert("No audit logs to export.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Action,Description\n";
    
    data.auditLogs.forEach(log => {
        const row = [
            `"${new Date(log.time).toISOString()}"`,
            `"${log.action.replace(/"/g, '""')}"`,
            `"${log.description.replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lodge_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addAuditLog('System Settings', 'Exported audit logs database to CSV.');
}

function clearAuditLogs() {
    if (currentUserRole !== 'owner') {
        alert("Only the Owner is authorized to purge security records.");
        return;
    }
    
    if (confirm("⚠️ WARNING: This will permanently delete all security activity logs in the database. Are you sure you want to clear audit records?")) {
        data.auditLogs = [
            { id: 'LOG001', time: new Date().toISOString(), action: 'Logs Purged', description: `Audit logs cleared by Owner.` }
        ];
        saveDataToStorage();
        
        // Sync clear to Firebase if available
        if (firebaseEnabled && firebaseDb) {
            try {
                firebaseDb.collection('audit_logs').get().then(snapshot => {
                    const batch = firebaseDb.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    batch.commit();
                });
            } catch (e) {
                console.warn("Could not clear logs on cloud:", e);
            }
        }
        
        filterAuditLogs();
        alert("System logs cleared.");
    }
}

// --- DYNAMIC SURCHARGE CONFIGURATIONS ---
function loadSurchargeSettings() {
    const settings = data.settings || {};
    document.getElementById('setWeekendSurcharge').value = settings.weekendSurcharge || 0;
    const active = !!settings.holidaySurgeActive;
    document.getElementById('setHolidaySurgeActive').checked = active;
    document.getElementById('holidaySurgeLabel').textContent = active ? 'Active' : 'Inactive';
    document.getElementById('holidaySurgeLabel').style.color = active ? 'var(--success)' : 'var(--text-light)';
    document.getElementById('setHolidaySurgeRate').value = settings.holidaySurgeRate || 0;
}

function toggleHolidaySurgeLabel(checkbox) {
    const active = checkbox.checked;
    const label = document.getElementById('holidaySurgeLabel');
    if (label) {
        label.textContent = active ? 'Active' : 'Inactive';
        label.style.color = active ? 'var(--success)' : 'var(--text-light)';
    }
}

function saveSurchargeSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    
    data.settings.weekendSurcharge = parseFloat(document.getElementById('setWeekendSurcharge').value || '0');
    data.settings.holidaySurgeActive = document.getElementById('setHolidaySurgeActive').checked;
    data.settings.holidaySurgeRate = parseFloat(document.getElementById('setHolidaySurgeRate').value || '0');
    
    saveDataToStorage();
    alert('Dynamic surge rules saved successfully!');
    addAuditLog('System Settings', `Dynamic tariff surcharges modified (Weekend: ${data.settings.weekendSurcharge}%, Holiday: ${data.settings.holidaySurgeActive ? 'ON (' + data.settings.holidaySurgeRate + '%)' : 'OFF'})`);
}

// --- TRADING-STYLE REVENUE CALENDAR HEATMAP ---
let salesCalendarYear = new Date().getFullYear();
let salesCalendarMonth = new Date().getMonth();

function initSalesCalendar() {
    salesCalendarYear = new Date().getFullYear();
    salesCalendarMonth = new Date().getMonth();
    renderSalesCalendar();
}

function changeSalesCalendarMonth(offset) {
    salesCalendarMonth += offset;
    if (salesCalendarMonth < 0) {
        salesCalendarMonth = 11;
        salesCalendarYear--;
    } else if (salesCalendarMonth > 11) {
        salesCalendarMonth = 0;
        salesCalendarYear++;
    }
    renderSalesCalendar();
}

function renderSalesCalendar() {
    const grid = document.getElementById('salesCalendarGrid');
    const label = document.getElementById('salesCalendarMonthLabel');
    if (!grid || !label) return;
    
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    label.textContent = `${monthNames[salesCalendarMonth]} ${salesCalendarYear}`;
    
    // Clear grid
    grid.innerHTML = '';
    
    const firstDayIndex = new Date(salesCalendarYear, salesCalendarMonth, 1).getDay();
    const daysInMonth = new Date(salesCalendarYear, salesCalendarMonth + 1, 0).getDate();
    
    // Calculate daily sales for heatmap normalization
    const dailyRevenues = {};
    let maxSales = 1000; // minimum normalization floor to prevent divide-by-zero
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${salesCalendarYear}-${String(salesCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBookings = data.bookings.filter(b => b.checkIn === dateString);
        const daySales = dayBookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
        dailyRevenues[day] = { sales: daySales, bookings: dayBookings };
        if (daySales > maxSales) {
            maxSales = daySales;
        }
    }
    
    // 1. Render empty padding days
    for (let i = 0; i < firstDayIndex; i++) {
        grid.innerHTML += `<div class="revenue-calendar-day empty-day"></div>`;
    }
    
    // 2. Render actual calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayData = dailyRevenues[day];
        const hasSales = dayData.sales > 0;
        const salesText = hasSales ? `₹${formatNumber(dayData.sales)}` : '';
        
        // Heatmap cell styling
        let cellStyle = '';
        let cellClass = 'revenue-calendar-day';
        if (hasSales) {
            cellClass += ' has-sales';
            // Compute intensity from 0.15 to 0.85 opacity based on sales volume
            const intensity = 0.15 + (dayData.sales / maxSales) * 0.75;
            cellStyle = `background: rgba(37, 99, 235, ${intensity}); color: ${intensity > 0.6 ? '#ffffff' : 'var(--text-dark)'};`;
            if (intensity > 0.6) {
                cellStyle += ` --text-light: rgba(255,255,255,0.7);`;
            }
        }
        
        // Create tooltip listing guest bookings for this day
        const dateString = `${salesCalendarYear}-${String(salesCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let tooltipHtml = `<strong>${day} ${monthNames[salesCalendarMonth]} ${salesCalendarYear}</strong><br>`;
        tooltipHtml += `Daily Sales: <strong>₹${formatNumber(dayData.sales)}</strong>`;
        
        if (dayData.bookings.length > 0) {
            tooltipHtml += `<hr style="margin: 6px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.25);">`;
            tooltipHtml += dayData.bookings.map(b => {
                const roomNames = b.rooms ? b.rooms.map(r => r.name).join(', ') : (b.roomName || 'Room');
                return `• ${b.guestName} (${roomNames}): ₹${formatNumber(getBookingTotal(b))}`;
            }).join('<br>');
        } else {
            tooltipHtml += `<br><span style="opacity: 0.6; font-size: 10px;">No check-ins on this day</span>`;
        }
        
        const dayHtml = `
            <div class="${cellClass}" style="${cellStyle}">
                <div class="revenue-calendar-day-num">${day}</div>
                <div class="revenue-calendar-day-sales" style="${hasSales && parseFloat(dayData.sales/maxSales) > 0.6 ? 'color: #ffffff' : ''}">${salesText}</div>
                <div class="revenue-calendar-tooltip">${tooltipHtml}</div>
            </div>
        `;
        grid.innerHTML += dayHtml;
    }
}

// --- SETTINGS FORM MODULE ---
function initSettings() {
    // Populate form values
    const settings = data.settings || { lodgeName: 'Sri Padmavati Pleasants', gstNumber: '33ANCPP8116B1ZF', taxes: { cgst: 2.5, sgst: 2.5 } };
    document.getElementById('setLodgeName').value = settings.lodgeName || 'Sri Padmavati Pleasants';
    document.getElementById('setLodgeAddress').value = settings.address || 'Palani, Tamil Nadu - 624601';
    document.getElementById('setLodgePhone').value = settings.phone || '6369216621';
    document.getElementById('setLodgeGst').value = settings.gstNumber || '33ANCPP8116B1ZF';
    
    document.getElementById('setCGSTRate').value = settings.taxes ? settings.taxes.cgst : 2.5;
    document.getElementById('setSGSTRate').value = settings.taxes ? settings.taxes.sgst : 2.5;
    document.getElementById('setDefaultAdvance').value = settings.defaultAdvance || 1000;
}

function showSettingsPanel(panelId, btn) {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    
    document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function saveLodgeSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    data.settings.lodgeName = document.getElementById('setLodgeName').value.trim();
    data.settings.address = document.getElementById('setLodgeAddress').value.trim();
    data.settings.phone = document.getElementById('setLodgePhone').value.trim();
    data.settings.gstNumber = document.getElementById('setLodgeGst').value.trim();
    
    saveDataToStorage();
    alert('Lodge Profile Settings saved successfully!');
    addAuditLog('System Settings', 'Lodge Profile parameters modified.');
}

function savePricingSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    data.settings.taxes = {
        cgst: parseFloat(document.getElementById('setCGSTRate').value || '2.5'),
        sgst: parseFloat(document.getElementById('setSGSTRate').value || '2.5')
    };
    data.settings.defaultAdvance = parseFloat(document.getElementById('setDefaultAdvance').value || '1000');
    
    saveDataToStorage();
    alert('Pricing and Tax Rates saved successfully!');
    addAuditLog('System Settings', 'Pricing & Tax configurations modified.');
}

// --- SYSTEM BACKUP & RESTORE ---
function exportFullSystemBackup() {
    const backupStr = JSON.stringify(data, null, 2);
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SriPadmavatiPleasants_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAuditLog('System Settings', 'Full system database backup downloaded.');
}

function triggerImportBackup() {
    document.getElementById('backupFileInput').click();
}

function importSystemBackup(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported || typeof imported !== 'object') throw new Error('Invalid JSON format');
            
            // Validate basic structure
            if (!Array.isArray(imported.rooms) || !Array.isArray(imported.bookings)) {
                throw new Error('Incompatible backup format. Missing rooms or bookings tables.');
            }
            
            if (confirm('Are you sure you want to restore? This will replace your local database cache with the backup data!')) {
                data.rooms = imported.rooms;
                data.bookings = imported.bookings;
                data.customers = imported.customers || [];
                data.guests = imported.guests || [];
                data.diary = imported.diary || {};
                data.staff = imported.staff || [];
                data.housekeepingTasks = imported.housekeepingTasks || [];
                data.settings = imported.settings || data.settings;
                data.notifications = imported.notifications || [];
                data.auditLogs = imported.auditLogs || [];
                
                saveDataToStorage();
                alert('Database restore completed successfully! Reloading...');
                location.reload();
            }
        } catch(err) {
            alert('Restore failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// --- NOTIFICATION CENTER FEEDS ---
function addNotification(type, title, message) {
    const notifId = `NT${String(data.notifications.length + 1).padStart(3, '0')}`;
    const newNotif = {
        id: notifId,
        type,
        title,
        message,
        time: new Date().toISOString(),
        read: false
    };
    data.notifications.unshift(newNotif);
    if (data.notifications.length > 30) data.notifications.pop(); // Max 30 alerts
    
    saveDataToStorage();
    renderNotifications();
}

function renderNotifications() {
    const dropdown = document.getElementById('notifDropdownBody');
    const badge = document.getElementById('notifBadgeCount');
    if (!dropdown) return;
    
    const unreadCount = data.notifications.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    if (data.notifications.length === 0) {
        dropdown.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); font-size: 12px;">No alerts.</div>`;
        return;
    }
    
    let html = '';
    data.notifications.forEach(n => {
        let iconClass = 'fa-bell';
        if (n.type === 'new-booking') iconClass = 'fa-calendar-check';
        else if (n.type === 'checkout') iconClass = 'fa-sign-out-alt';
        else if (n.type === 'payment') iconClass = 'fa-credit-card';
        else if (n.type === 'staff') iconClass = 'fa-users';
        
        const unreadClass = n.read ? '' : 'unread';
        const formattedTime = new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="notif-dropdown-item ${unreadClass} ${n.type}" onclick="markNotificationRead('${n.id}')">
                <div class="activity-icon ${n.type}" style="width: 28px; height: 28px;"><i class="fas ${iconClass}"></i></div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 700; font-size: 12px; color: var(--text-dark);">${n.title}</div>
                    <div style="color: var(--text-light); font-size: 11px; margin-top: 2px;">${n.message}</div>
                    <small style="color: var(--text-light); font-size: 9px; display: block; margin-top: 4px;">${formattedTime}</small>
                </div>
            </div>
        `;
    });
    dropdown.innerHTML = html;
}

function markNotificationRead(notifId) {
    const notif = data.notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveDataToStorage();
        renderNotifications();
    }
}

function clearAllNotifications() {
    data.notifications = [];
    saveDataToStorage();
    renderNotifications();
}

// --- CANVAS-BASED SPARKLINE GRAPHS ---
function drawSparklines() {
    const occupiedCount = data.rooms.filter(r => r.status === 'occupied').length;
    const availableCount = data.rooms.filter(r => r.status === 'available').length;
    
    // Draw Sparklines with mock historical stats + live points
    drawSparkline('sparkRooms', [9, 9, 9, 9, 9, 9, 9], 'var(--secondary)');
    drawSparkline('sparkOccupied', [2, 1, 3, 2, 4, 3, occupiedCount], 'var(--danger)');
    drawSparkline('sparkAvailable', [7, 8, 6, 7, 5, 6, availableCount], 'var(--success)');
    
    // Revenue sparkline (mock trend leading to live revenue value)
    const today = getLocalISODate();
    const revenueToday = data.bookings
        .filter(booking => booking.checkIn === today)
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    drawSparkline('sparkRevenue', [12000, 15000, 8000, 24000, 19000, 22000, revenueToday], 'var(--success)');
    
    // Bookings sparkline
    drawSparkline('sparkBookings', [5, 9, 8, 12, 11, 15, data.bookings.length], 'var(--secondary)');
}

function drawSparkline(canvasId, values, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    if (values.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color || '#2563eb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min;
    
    const getX = (index) => (index / (values.length - 1)) * width;
    const getY = (value) => height - 6 - ((value - min) / range) * (height - 12);
    
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
        ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.stroke();
    
    // Draw gradient fill below sparkline
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color ? color.replace(')', ', 0.12)') : 'rgba(37, 99, 235, 0.12)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
}

// --- ANALYTICS / REPORTS INTERVAL TOGGLES ---
function setChartInterval(interval, btn) {
    document.querySelectorAll('.chart-controls .btn-control').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Redraw with different data ranges if needed
    createRevenueChart();
    addAuditLog('System Reports', `Revenue trend chart updated range to ${interval}.`);
}

