let bookingCameraStream = null;
let bookingCameraInitialized = false;
let bookingTimeModeInitialized = false;
let bookingFilterYear = new Date().getFullYear();
let bookingFilterMonth = 'all'; // 'all' or 0-11

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Utility function to capitalize all text
function capitalizeAllText(str) {
    if (!str) return str;
    return str.toString().toUpperCase();
}

function loadBookings() {
    const container = document.getElementById('bookingsMonthContainer');
    if (!container) return;

    // Update year label
    const yearLabel = document.getElementById('bookingYearLabel');
    if (yearLabel) yearLabel.textContent = bookingFilterYear;

    // Get status filter
    const statusFilter = document.getElementById('bookingStatusFilter');
    const statusValue = statusFilter ? statusFilter.value : 'all';

    // Filter bookings by year, month, status
    let filtered = data.bookings.filter(booking => {
        const d = new Date(booking.checkIn);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== bookingFilterYear) return false;
        if (bookingFilterMonth !== 'all' && d.getMonth() !== bookingFilterMonth) return false;
        if (statusValue !== 'all' && booking.status !== statusValue) return false;
        return true;
    });

    // Group by month
    const grouped = {};
    filtered.forEach(booking => {
        const d = new Date(booking.checkIn);
        const monthIdx = d.getMonth();
        if (!grouped[monthIdx]) grouped[monthIdx] = [];
        grouped[monthIdx].push(booking);
    });

    // Sort months descending (most recent first)
    const sortedMonths = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    if (sortedMonths.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-calendar-times" style="font-size: 48px; color: var(--text-light); margin-bottom: 16px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 8px;">No bookings found</h3>
                <p style="color: var(--text-light); font-size: 14px;">No bookings match the selected filters for ${bookingFilterYear}.</p>
            </div>`;
        return;
    }

    let html = '';
    sortedMonths.forEach(monthIdx => {
        const bookings = grouped[monthIdx];
        const monthRevenue = bookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
        const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
        const completedCount = bookings.filter(b => b.status === 'completed').length;
        const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

        html += `<div class="month-booking-section">`;
        html += `<div class="month-section-header" onclick="toggleMonthSection(this)">
            <div class="month-header-left">
                <i class="fas fa-chevron-down month-toggle-icon"></i>
                <h3><i class="fas fa-calendar-alt"></i> ${MONTH_NAMES_FULL[monthIdx]} ${bookingFilterYear}</h3>
                <span class="month-booking-count">${bookings.length} booking${bookings.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="month-header-right">
                <div class="month-stats-chips">
                    ${confirmedCount > 0 ? `<span class="month-chip confirmed"><i class="fas fa-check-circle"></i> ${confirmedCount}</span>` : ''}
                    ${completedCount > 0 ? `<span class="month-chip completed"><i class="fas fa-door-open"></i> ${completedCount}</span>` : ''}
                    ${cancelledCount > 0 ? `<span class="month-chip cancelled"><i class="fas fa-ban"></i> ${cancelledCount}</span>` : ''}
                </div>
                <span class="month-revenue owner-only">₹${formatNumber(monthRevenue)}</span>
            </div>
        </div>`;

        html += `<div class="month-section-body">
        <div class="card" style="margin-bottom: 0; border-radius: 0 0 16px 16px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Guest Name</th>
                        <th>Room</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Receipt</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;

        bookings.forEach(booking => {
            const total = getBookingTotal(booking);
            const isCheckedOut = booking.status === 'completed';
            let actionsHtml = `<div style="display:flex; gap:5px;">`;
            if (booking.status === 'cancelled') {
                actionsHtml += '<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #EF4444; cursor: default;" disabled><i class="fas fa-ban"></i> Cancelled</button>';
                actionsHtml += `<button class="btn-primary owner-only" style="padding: 6px 10px; font-size: 11px; background: #7F1D1D;" onclick="deleteBooking('${booking.id}')" title="Delete"><i class="fas fa-trash"></i></button>`;
            } else if (isCheckedOut) {
                actionsHtml += '<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #27AE60; cursor: default;" disabled><i class="fas fa-check"></i> Checked Out</button>';
                actionsHtml += `<button class="btn-primary owner-only" style="padding: 6px 10px; font-size: 11px; background: #F59E0B;" onclick="openEditBookingModal('${booking.id}')" title="Edit"><i class="fas fa-edit"></i></button>`;
                actionsHtml += `<button class="btn-primary owner-only" style="padding: 6px 10px; font-size: 11px; background: #7F1D1D;" onclick="deleteBooking('${booking.id}')" title="Delete"><i class="fas fa-trash"></i></button>`;
            } else {
                actionsHtml += `<button class="btn-primary receptionist-only" style="padding: 6px 10px; font-size: 11px; background: #27AE60;" onclick="checkoutBooking('${booking.id}')" title="Checkout"><i class="fas fa-sign-out-alt"></i></button>`;
                actionsHtml += `<button class="btn-primary owner-only" style="padding: 6px 10px; font-size: 11px; background: #F59E0B;" onclick="openEditBookingModal('${booking.id}')" title="Edit"><i class="fas fa-edit"></i></button>`;
                actionsHtml += `<button class="btn-primary receptionist-only" style="padding: 6px 10px; font-size: 11px; background: #EF4444;" onclick="cancelBooking('${booking.id}')" title="Cancel"><i class="fas fa-times"></i></button>`;
            }
            actionsHtml += `</div>`;

            const roomDisplayText = booking.rooms && booking.rooms.length > 1
                ? `${booking.rooms.map(r => r.roomName).join(', ')} (${booking.rooms.length} rooms)`
                : (booking.rooms && booking.rooms.length === 1 
                    ? booking.rooms[0].roomName
                    : booking.roomName);

            html += `<tr><td><strong>${booking.id}</strong></td><td>${booking.guestName}</td><td>${roomDisplayText}</td><td>${formatDate(booking.checkIn)}</td><td>${formatDate(booking.checkOut)}</td><td>₹${formatNumber(total)}</td><td><span class="status-badge ${booking.status}">${capitalizeFirst(booking.status)}</span></td><td>
                <button class="btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="showReceipt('${booking.id}')" title="Receipt"><i class="fas fa-receipt"></i></button>
                ${(booking.customerPhoto || booking.customerPhotoUrl) ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 11px; background:#4F46E5; margin-left:4px;" onclick="viewBookingPhotos('${booking.id}')" title="Photos"><i class="fas fa-camera"></i></button>` : ''}
            </td>
            <td>${actionsHtml}</td></tr>`;
        });

        html += `</tbody></table></div></div></div>`;
    });

    container.innerHTML = html;
}

function changeBookingYear(delta) {
    bookingFilterYear += delta;
    loadBookings();
}

function selectBookingMonth(month, btn) {
    bookingFilterMonth = month;
    document.querySelectorAll('#bookingMonthPills .month-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadBookings();
}

function resetBookingFilters() {
    bookingFilterYear = new Date().getFullYear();
    bookingFilterMonth = 'all';
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) statusFilter.value = 'all';
    document.querySelectorAll('#bookingMonthPills .month-pill').forEach(p => p.classList.remove('active'));
    const allPill = document.querySelector('#bookingMonthPills .month-pill[data-month="all"]');
    if (allPill) allPill.classList.add('active');
    loadBookings();
}

function toggleMonthSection(headerEl) {
    const section = headerEl.closest('.month-booking-section');
    if (!section) return;
    section.classList.toggle('collapsed');
}

function checkoutBooking(bookingId) {
    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    if (booking.status === 'completed') {
        alert('This booking is already checked out');
        return;
    }

    // Display all rooms in the checkout confirmation
    const roomsDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(r => r.roomName).join(', ')
        : booking.roomName;

    const shouldCheckout = confirm(`Checkout guest ${booking.guestName} from room(s): ${roomsDisplay}?`);
    if (!shouldCheckout) return;

    booking.status = 'completed';
    booking.actualCheckOutDate = getLocalISODate();
    booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());

    // Free all rooms in the booking
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(roomData => {
            const room = data.rooms.find(item => item.id === roomData.roomId);
            if (room) {
                room.status = 'available';
            }
        });
    } else {
        // Fallback for old single-room bookings
        const room = data.rooms.find(item => item.id === booking.roomId);
        if (room) {
            room.status = 'available';
        }
    }

    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Checkout', `Guest ${booking.guestName} checked out from room(s) ${roomsDisplay}.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('checkout', 'Guest Checked Out', `${booking.guestName} departed Room ${roomsDisplay}.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    if (currentRoomDetailsRoomId) {
        const room = data.rooms.find(r => r.id === currentRoomDetailsRoomId);
        if (room) {
            showRoomDetails(room.id);
        }
    }

    alert(`Checkout successful. ${roomsDisplay} is now free.`);
}

function openNewBookingPage() {
    navigateTo('new-booking');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const bookingsNav = document.querySelector('.nav-item[onclick*="bookings"]');
    if (bookingsNav) {
        bookingsNav.classList.add('active');
    }
}

function openBookingsPage() {
    navigateTo('bookings');
    stopBookingCameraStream();

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const bookingsNav = document.querySelector('.nav-item[onclick*="bookings"]');
    if (bookingsNav) {
        bookingsNav.classList.add('active');
    }
}

function loadNewBookingPage() {
    // Reset multi-room selection for new booking
    multiRoomBookingSelection = [];
    
    initBookingCameraSection();
    initBookingTimeModeSection();
    initBookingIdProofValidation();
    resetBookingCaptureSection();

    const roomSelect = document.getElementById('bookingRoomId');
    if (!roomSelect) return;

    const availableRooms = data.rooms.filter(room => room.status === 'available');
    roomSelect.innerHTML = availableRooms.length
        ? '<option value="">Select available room</option>' + availableRooms.map(room => `<option value="${room.id}">${room.name} - Floor ${room.floor} - ${capitalizeFirst(room.type)} - ₹${formatNumber(room.price)}</option>`).join('')
        : '<option value="">No rooms available</option>';

    const today = new Date().toISOString().split('T')[0];
    const checkInInput = document.getElementById('bookingCheckIn');
    const checkOutInput = document.getElementById('bookingCheckOut');
    const checkInTimeInput = document.getElementById('bookingCheckInTime');
    const checkOutTimeInput = document.getElementById('bookingCheckOutTime');
    const checkInTimeMode = document.getElementById('bookingCheckInTimeMode');
    const checkOutTimeMode = document.getElementById('bookingCheckOutTimeMode');

    if (checkInInput && !checkInInput.value) checkInInput.value = today;
    if (checkOutInput && !checkOutInput.value) checkOutInput.value = today;

    if (checkInTimeMode) {
        if (!checkInTimeMode.value) checkInTimeMode.value = 'manual';
        applyTimeModeToInput(checkInTimeMode, checkInTimeInput, '12:00');
    }

    if (checkOutTimeMode) {
        if (!checkOutTimeMode.value) checkOutTimeMode.value = 'manual';
        applyTimeModeToInput(checkOutTimeMode, checkOutTimeInput, '10:00');
    }

    // Setup multi-room booking listeners  
    setupMultiRoomBookingListeners();

    // Setup payment method listener for online booking source
    const paymentMethodSelect = document.getElementById('bookingPaymentMethod');
    const onlineSourceGroup = document.getElementById('onlineBookingSourceGroup');
    const bookingSourceSelect = document.getElementById('bookingSource');

    if (paymentMethodSelect && onlineSourceGroup) {
        paymentMethodSelect.addEventListener('change', function() {
            if (this.value === 'Online') {
                onlineSourceGroup.style.display = 'block';
                if (bookingSourceSelect) bookingSourceSelect.required = true;
            } else {
                onlineSourceGroup.style.display = 'none';
                if (bookingSourceSelect) {
                    bookingSourceSelect.required = false;
                    bookingSourceSelect.value = '';
                }
            }
        });
        // Initial state
        onlineSourceGroup.style.display = 'none';
    }
    
    // Update selected rooms display
    updateSelectedRoomsDisplay();
}

function handleNewBooking(e) {
    e.preventDefault();

    syncTimeFieldsFromMode();

    const guestName = document.getElementById('bookingGuestName').value.trim();
    const guestPhone = document.getElementById('bookingGuestPhone').value.trim();
    const guestEmail = document.getElementById('bookingGuestEmail').value.trim();
    const idProofType = document.getElementById('bookingIdProofType').value;
    const idProofNumberRaw = document.getElementById('bookingIdProofNumber').value.trim();
    const checkIn = document.getElementById('bookingCheckIn').value;
    const checkInTime = toDisplayTime(document.getElementById('bookingCheckInTime').value);
    const checkOut = document.getElementById('bookingCheckOut').value;
    const checkOutTime = toDisplayTime(document.getElementById('bookingCheckOutTime').value);
    const paymentMethod = document.getElementById('bookingPaymentMethod').value;
    const advance = parseFloat(document.getElementById('bookingAdvance').value || '0');
    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');
    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const manualRoomRate = parseFloat(document.getElementById('bookingRoomRate').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;
    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);
    const vehicleNumber = document.getElementById('bookingVehicleNumber') ? document.getElementById('bookingVehicleNumber').value.trim() : '';
    const companyName = document.getElementById('bookingCompanyName') ? document.getElementById('bookingCompanyName').value.trim() : '';
    const guestGST = document.getElementById('bookingGuestGST') ? document.getElementById('bookingGuestGST').value.trim().toUpperCase() : '';
    const bookingSource = paymentMethod === 'Online' && document.getElementById('bookingSource') ? document.getElementById('bookingSource').value : '';
    const recommendedBy = document.getElementById('bookingRecommendedBy') ? document.getElementById('bookingRecommendedBy').value.trim() : '';

    // Validate multi-room selection
    if (!multiRoomBookingSelection || multiRoomBookingSelection.length === 0) {
        alert('Please select at least one room');
        return;
    }

    if (!guestName || !guestPhone || !idProofType || !idProofNumberRaw || !checkIn || !checkOut || !paymentMethod) {
        alert('Please fill in all required booking details');
        return;
    }

    if (!manualRoomRate || manualRoomRate <= 0) {
        alert('Please enter the Room Fare / Rate. This field is required.');
        document.getElementById('bookingRoomRate').focus();
        return;
    }

    const idProofValidation = validateBookingIdProof(idProofType, idProofNumberRaw);
    if (!idProofValidation.valid) {
        alert(idProofValidation.message);
        return;
    }

    if (!customerPhotoData || !idProofPhotoData) {
        alert('Please capture both customer photo and ID proof photo before creating booking');
        return;
    }

    if (new Date(checkOut) < new Date(checkIn)) {
        alert('Check-out date cannot be before check-in date');
        return;
    }

    // Validate all selected rooms are still available
    const selectedRoomIds = multiRoomBookingSelection.map(r => r.roomId);
    const roomsToBook = selectedRoomIds.map(roomId => data.rooms.find(r => r.id === roomId)).filter(Boolean);
    
    const unavailableRooms = roomsToBook.filter(room => room.status !== 'available');
    if (unavailableRooms.length > 0) {
        alert(`The following rooms are no longer available: ${unavailableRooms.map(r => r.name).join(', ')}`);
        loadNewBookingPage();
        return;
    }

    const bookingNumber = data.bookings.length + 1;
    const bookingId = `BK${String(bookingNumber).padStart(3, '0')}`;

    // Calculate total room rate (sum of all selected rooms)
    const totalRoomRate = multiRoomBookingSelection.reduce((sum, room) => sum + room.price, 0);

    // Create booking with rooms array - Capitalize all guest information
    data.bookings.push({
        id: bookingId,
        guestName: capitalizeAllText(guestName),
        guestPhone,
        guestEmail: capitalizeAllText(guestEmail),
        idProofType,
        idProofNumber: idProofValidation.normalized,
        rooms: multiRoomBookingSelection,  // Array of rooms instead of single room
        checkIn,
        checkInTime,
        checkOut,
        checkOutTime,
        paymentMethod,
        status: 'confirmed',
        roomRate: manualRoomRate,  // Use manually entered room rate
        advance,
        extras,
        extraBed,
        maleCount,
        femaleCount,
        childrenCount,
        vehicleNumber: capitalizeAllText(vehicleNumber),
        companyName: capitalizeAllText(companyName),
        guestGST,
        discount: 0,
        customerPhoto: customerPhotoData,
        idProofPhoto: idProofPhotoData,
        bookingSource: bookingSource,
        recommendedBy: capitalizeAllText(recommendedBy),
        checkInWhatsAppSent: false,
        checkoutReminderSent: false
    });

    // Mark all selected rooms as occupied
    roomsToBook.forEach(room => {
        room.status = 'occupied';
    });

    // Save room info for alert BEFORE resetting
    const createdBooking = data.bookings[data.bookings.length - 1];
    
    // Set legacy fields for rooms for compatibility with existing code
    createdBooking.roomId = selectedRoomIds[0];
    createdBooking.roomName = multiRoomBookingSelection[0].roomName;
    createdBooking.floor = multiRoomBookingSelection[0].floor;

    const bookedRoomNames = createdBooking.rooms.map(r => r.roomName);
    const bookedRoomCount = bookedRoomNames.length;
    
    sendCheckInWhatsAppMessage(createdBooking);

    upsertGuestRecord(createdBooking.guestName, guestPhone, createdBooking.guestEmail, checkOut, createdBooking.id);

    // Save photos to IndexedDB (local disk) and Firebase (cloud)
    savePhotoToLocal(createdBooking.id, customerPhotoData, idProofPhotoData)
        .then(() => console.log(`Photos for ${createdBooking.id} saved to IndexedDB`))
        .catch(err => console.warn('IndexedDB photo save failed:', err));

    saveDataToStorage();
    syncBookingToFirebase(createdBooking);

    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('New Booking', `Booking ${bookingId} created for guest ${createdBooking.guestName} in room(s) ${bookedRoomNames.join(', ')}.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('new-booking', 'New Booking Created', `Guest ${createdBooking.guestName} reserved Room ${bookedRoomNames.join(', ')}.`);
    }

    document.getElementById('newBookingForm').reset();
    resetBookingCaptureSection();
    multiRoomBookingSelection = [];
    loadNewBookingPage();
    loadBookings();
    loadPayments();
    loadRooms();
    
    const roomsList = bookedRoomCount > 1 
        ? `${bookedRoomNames[0]} + ${bookedRoomCount - 1} more`
        : bookedRoomNames[0];
    
    alert(`Booking ${bookingId} created successfully for ${bookedRoomCount} room(s): ${roomsList}`);
    openBookingsPage();
}
function calculateBookingDays(booking) {
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const checkOutDateStr = booking.actualCheckOutDate || booking.checkOut;
    const checkOutDate = checkOutDateStr ? new Date(checkOutDateStr) : new Date();
    
    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDate - checkInDate) / msPerDay);
    if (days < 1 || isNaN(days)) days = 1;
    return days;
}

function getBookingTotal(booking) {
    const days = calculateBookingDays(booking);
    const totalRoom = (Number(booking.roomRate) || 0) * days;
    const discount = Number(booking.discount) || 0;
    const totalGrossRoom = Math.max(0, totalRoom - discount);
    return totalGrossRoom + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
}

function getBookingBalance(booking) {
    const advance = Number(booking.advance) || 0;
    return Math.max(getBookingTotal(booking) - advance, 0);
}

// Export for unit testing (Node.js environment)
if (typeof module !== 'undefined') {
    module.exports = {
        calculateBookingDays,
        getBookingTotal,
        getBookingBalance
    };
}
function initBookingCameraSection() {
    if (bookingCameraInitialized) return;

    const startBtn = document.getElementById('startBookingCameraBtn');
    const stopBtn = document.getElementById('stopBookingCameraBtn');
    const captureCustomerBtn = document.getElementById('captureCustomerPhotoBtn');
    const captureIdBtn = document.getElementById('captureIdProofPhotoBtn');

    if (!startBtn || !stopBtn || !captureCustomerBtn || !captureIdBtn) return;

    startBtn.addEventListener('click', startBookingCamera);
    stopBtn.addEventListener('click', stopBookingCameraStream);
    captureCustomerBtn.addEventListener('click', function() {
        captureBookingPhoto('customer');
    });
    captureIdBtn.addEventListener('click', function() {
        captureBookingPhoto('idProof');
    });

    bookingCameraInitialized = true;
}

function initBookingTimeModeSection() {
    if (bookingTimeModeInitialized) return;

    const checkInMode = document.getElementById('bookingCheckInTimeMode');
    const checkOutMode = document.getElementById('bookingCheckOutTimeMode');
    const checkInTimeInput = document.getElementById('bookingCheckInTime');
    const checkOutTimeInput = document.getElementById('bookingCheckOutTime');

    if (!checkInMode || !checkOutMode || !checkInTimeInput || !checkOutTimeInput) return;

    checkInMode.addEventListener('change', function() {
        applyTimeModeToInput(checkInMode, checkInTimeInput, '12:00');
    });

    checkOutMode.addEventListener('change', function() {
        applyTimeModeToInput(checkOutMode, checkOutTimeInput, '10:00');
    });

    bookingTimeModeInitialized = true;
}

function applyTimeModeToInput(modeSelect, timeInput, manualDefaultTime) {
    if (!modeSelect || !timeInput) return;

    if (modeSelect.value === 'current') {
        timeInput.value = getCurrentTimeValue();
        timeInput.readOnly = true;
        timeInput.style.backgroundColor = '#eef7f5';
        return;
    }

    if (!timeInput.value) {
        timeInput.value = manualDefaultTime;
    }
    timeInput.readOnly = false;
    timeInput.style.backgroundColor = '';
}

function syncTimeFieldsFromMode() {
    const checkInMode = document.getElementById('bookingCheckInTimeMode');
    const checkOutMode = document.getElementById('bookingCheckOutTimeMode');
    const checkInTimeInput = document.getElementById('bookingCheckInTime');
    const checkOutTimeInput = document.getElementById('bookingCheckOutTime');

    if (checkInMode && checkInTimeInput && checkInMode.value === 'current') {
        checkInTimeInput.value = getCurrentTimeValue();
    }

    if (checkOutMode && checkOutTimeInput && checkOutMode.value === 'current') {
        checkOutTimeInput.value = getCurrentTimeValue();
    }
}

function initBookingIdProofValidation() {
    const idTypeSelect = document.getElementById('bookingIdProofType');
    const idNumberInput = document.getElementById('bookingIdProofNumber');
    const hint = document.getElementById('bookingIdProofHint');

    if (!idTypeSelect || !idNumberInput || !hint) return;

    if (!idTypeSelect.dataset.bound) {
        idTypeSelect.addEventListener('change', function() {
            applyBookingIdProofInputRules();
        });
        idTypeSelect.dataset.bound = 'true';
    }

    if (!idNumberInput.dataset.bound) {
        idNumberInput.addEventListener('input', function() {
            normalizeBookingIdInputLive();
        });
        idNumberInput.dataset.bound = 'true';
    }

    applyBookingIdProofInputRules();
}

function applyBookingIdProofInputRules() {
    const idTypeSelect = document.getElementById('bookingIdProofType');
    const idNumberInput = document.getElementById('bookingIdProofNumber');
    const hint = document.getElementById('bookingIdProofHint');

    if (!idTypeSelect || !idNumberInput || !hint) return;

    const selectedType = idTypeSelect.value;

    switch (selectedType) {
        case 'Aadhar Card':
            idNumberInput.placeholder = '1234 5678 9012';
            idNumberInput.maxLength = 14;
            hint.textContent = 'Aadhar format: exactly 12 digits';
            break;
        case 'Driving License':
            idNumberInput.placeholder = 'e.g. TN0120231234567';
            idNumberInput.maxLength = 40;
            hint.textContent = 'Enter Driving License number';
            break;
        case 'Passport':
            idNumberInput.placeholder = 'A1234567';
            idNumberInput.maxLength = 8;
            hint.textContent = 'Passport format: 1 letter + 7 digits';
            break;
        case 'Voter ID':
            idNumberInput.placeholder = 'ABC1234567';
            idNumberInput.maxLength = 10;
            hint.textContent = 'Voter ID format: 3 letters + 7 digits';
            break;
        default:
            idNumberInput.placeholder = '';
            idNumberInput.maxLength = 40;
            hint.textContent = 'Select ID type to see required format';
            break;
    }
}

function normalizeBookingIdInputLive() {
    const idTypeSelect = document.getElementById('bookingIdProofType');
    const idNumberInput = document.getElementById('bookingIdProofNumber');

    if (!idTypeSelect || !idNumberInput) return;

    const selectedType = idTypeSelect.value;
    let value = idNumberInput.value;

    if (selectedType === 'Aadhar Card') {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
        idNumberInput.value = grouped;
        return;
    }

    idNumberInput.value = value.toUpperCase().replace(/\s+/g, '');
}

function validateBookingIdProof(idProofType, rawIdNumber) {
    const normalizedUpper = rawIdNumber.toUpperCase().replace(/\s+/g, '');

    if (idProofType === 'Aadhar Card') {
        const digits = rawIdNumber.replace(/\D/g, '');
        if (!/^\d{12}$/.test(digits)) {
            return { valid: false, message: 'Invalid Aadhar number. It must contain exactly 12 digits.' };
        }
        const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
        return { valid: true, normalized: formatted };
    }

    if (idProofType === 'Driving License') {
        if (!normalizedUpper || normalizedUpper.length < 2) {
            return { valid: false, message: 'Please enter a valid Driving License number.' };
        }
        return { valid: true, normalized: normalizedUpper };
    }

    if (idProofType === 'Passport') {
        if (!/^[A-Z][0-9]{7}$/.test(normalizedUpper)) {
            return { valid: false, message: 'Invalid Passport number. Use format like A1234567.' };
        }
        return { valid: true, normalized: normalizedUpper };
    }

    if (idProofType === 'Voter ID') {
        if (!/^[A-Z]{3}[0-9]{7}$/.test(normalizedUpper)) {
            return { valid: false, message: 'Invalid Voter ID number. Use format like ABC1234567.' };
        }
        return { valid: true, normalized: normalizedUpper };
    }

    return { valid: false, message: 'Please select a valid ID proof type.' };
}

function getCurrentTimeValue() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

async function populateDateToInput(dateString, inputId) {
    const input = document.getElementById(inputId);
    if (input && dateString) {
        input.value = dateString;
    }
}
function populateTimeToInput(timeString, inputId) {
    const input = document.getElementById(inputId);
    if (input && timeString) {
        // Convert display time (12:00 PM) to input time (12:00)
        let hours = 12;
        let mins = '00';
        try {
            const timeMatch = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)$/i.exec(timeString.trim());
            if (timeMatch) {
                hours = parseInt(timeMatch[1], 10);
                mins = timeMatch[2];
                if (timeMatch[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
            } else {
                [hours, mins] = timeString.split(':');
            }
        } catch(e) {}
        input.value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
}
let currentEditBookingRooms = [];

function renderEditBookingRooms() {
    const list = document.getElementById('editRoomsList');
    if (!list) return;
    if (currentEditBookingRooms.length === 0) {
        list.innerHTML = '<small style="color: var(--text-light);">No rooms assigned.</small>';
        return;
    }
    let html = '';
    currentEditBookingRooms.forEach((r, idx) => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
                <span><strong>${r.roomName}</strong> <small>(Floor ${r.floor})</small></span>
                <button type="button" class="btn-primary" style="padding: 2px 6px; font-size: 10px; background: #ef4444;" onclick="removeRoomFromEditBooking(${r.roomId})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.removeRoomFromEditBooking = function(roomId) {
    if (currentEditBookingRooms.length <= 1) {
        alert('Cannot remove the last room. A booking must have at least one room.');
        return;
    }
    const roomToRemove = currentEditBookingRooms.find(r => r.roomId === roomId);
    if (roomToRemove) {
        const rateInput = document.getElementById('editRoomRate');
        let currentRate = parseFloat(rateInput.value) || 0;
        currentRate = Math.max(0, currentRate - roomToRemove.price);
        rateInput.value = currentRate;
    }
    currentEditBookingRooms = currentEditBookingRooms.filter(r => r.roomId !== roomId);
    renderEditBookingRooms();
};

window.openEditAddRoomModal = function() {
    const select = document.getElementById('editAddRoomSelect');
    select.innerHTML = '<option value="">-- Select a room --</option>';
    
    const availableRooms = data.rooms.filter(room => 
        (room.status === 'available' || room.status === 'cleaning') && 
        !currentEditBookingRooms.some(r => r.roomId === room.id)
    );
    
    if (availableRooms.length === 0) {
        alert('No additional rooms available.');
        return;
    }
    
    availableRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = `${room.name} (${room.type}) - Floor ${room.floor} - ₹${room.price}`;
        select.appendChild(option);
    });
    
    document.getElementById('editAddRoomModal').classList.add('active');
};

window.closeEditAddRoomModal = function() {
    document.getElementById('editAddRoomModal').classList.remove('active');
};

window.confirmEditAddRoom = function() {
    const select = document.getElementById('editAddRoomSelect');
    const roomId = parseInt(select.value);
    if (!roomId) {
        alert('Please select a room.');
        return;
    }
    
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
        currentEditBookingRooms.push({
            roomId: room.id,
            roomName: room.name,
            floor: room.floor,
            price: room.price
        });
        
        const rateInput = document.getElementById('editRoomRate');
        const currentRate = parseFloat(rateInput.value) || 0;
        rateInput.value = currentRate + room.price;
        
        renderEditBookingRooms();
        closeEditAddRoomModal();
    }
};

window.openEditBookingModal = function(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    currentEditBookingRooms = [];
    if (booking.rooms && booking.rooms.length > 0) {
        currentEditBookingRooms = JSON.parse(JSON.stringify(booking.rooms));
    } else if (booking.roomId) {
        currentEditBookingRooms.push({
            roomId: booking.roomId,
            roomName: booking.roomName,
            floor: booking.floor,
            price: booking.roomRate || 0
        });
    }
    renderEditBookingRooms();

    document.getElementById('editBookingId').value = booking.id;
    document.getElementById('editGuestName').value = booking.guestName || '';
    document.getElementById('editGuestPhone').value = booking.guestPhone || '';
    document.getElementById('editGuestEmail').value = booking.guestEmail || '';
    document.getElementById('editAdvanceAmount').value = booking.advance || 0;
    document.getElementById('editRoomRate').value = booking.roomRate || 0;
    document.getElementById('editExtras').value = booking.extras || 0;
    document.getElementById('editExtraBed').value = booking.extraBed || 0;
    
    document.getElementById('editMaleCount').value = booking.maleCount !== undefined ? booking.maleCount : (booking.adultsCount || 1);
    document.getElementById('editFemaleCount').value = booking.femaleCount || 0;
    document.getElementById('editChildrenCount').value = booking.childrenCount !== undefined ? booking.childrenCount : 0;
    
    document.getElementById('editVehicleNumber').value = booking.vehicleNumber || '';
    document.getElementById('editCompanyName').value = booking.companyName || '';
    document.getElementById('editGuestGST').value = booking.guestGST || '';
    document.getElementById('editRecommendedBy').value = booking.recommendedBy || '';

    // Populate Payment Method
    const editPayMethodSelect = document.getElementById('editPaymentMethod');
    if (editPayMethodSelect) {
        editPayMethodSelect.value = booking.paymentMethod || 'Cash';
    }
    const editBookingSourceSelect = document.getElementById('editBookingSource');
    if (editBookingSourceSelect) {
        editBookingSourceSelect.value = booking.bookingSource || '';
    }
    toggleEditBookingSource();

    document.getElementById('editCheckInDate').value = booking.checkIn || '';
    populateTimeToInput(booking.checkInTime, 'editCheckInTime');

    document.getElementById('editCheckOutDate').value = booking.checkOut || '';
    populateTimeToInput(booking.checkOutTime, 'editCheckOutTime');

    document.getElementById('editBookingModal').classList.add('active');
};

window.closeEditBookingModal = function() {
    document.getElementById('editBookingModal').classList.remove('active');
};

window.toggleEditBookingSource = function() {
    const method = document.getElementById('editPaymentMethod')?.value;
    const sourceGroup = document.getElementById('editOnlineBookingSourceGroup');
    if (sourceGroup) {
        sourceGroup.style.display = method === 'Online' ? '' : 'none';
    }
};

window.saveEditedBooking = function() {
    const bookingId = document.getElementById('editBookingId').value;
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (currentEditBookingRooms.length === 0) {
        alert('A booking must have at least one assigned room.');
        return;
    }

    const oldRoomIds = [];
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(r => oldRoomIds.push(r.roomId));
    } else if (booking.roomId) {
        oldRoomIds.push(booking.roomId);
    }

    const newRoomIds = currentEditBookingRooms.map(r => r.roomId);

    // Free removed rooms
    oldRoomIds.forEach(id => {
        if (!newRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if(r) r.status = 'available';
        }
    });

    // Occupy added rooms
    newRoomIds.forEach(id => {
        if (!oldRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if(r) r.status = 'occupied';
        }
    });

    booking.rooms = JSON.parse(JSON.stringify(currentEditBookingRooms));
    booking.roomId = currentEditBookingRooms[0].roomId;
    booking.roomName = currentEditBookingRooms[0].roomName;
    booking.floor = currentEditBookingRooms[0].floor;

    booking.guestName = document.getElementById('editGuestName').value.trim();
    booking.guestPhone = document.getElementById('editGuestPhone').value.trim();
    booking.guestEmail = document.getElementById('editGuestEmail').value.trim();
    // Sanitize numeric inputs (allow formatted numbers with commas)
    function parseNumberInput(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        let v = el.value;
        if (typeof v === 'string') v = v.replace(/,/g, '').trim();
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }

    booking.advance = parseNumberInput('editAdvanceAmount');
    booking.roomRate = parseNumberInput('editRoomRate');
    booking.extras = parseNumberInput('editExtras');
    booking.extraBed = parseNumberInput('editExtraBed');
    
    booking.maleCount = parseInt(document.getElementById('editMaleCount').value) || 0;
    booking.femaleCount = parseInt(document.getElementById('editFemaleCount').value) || 0;
    booking.childrenCount = parseInt(document.getElementById('editChildrenCount').value) || 0;
    
    // Maintain legacy field for compatibility
    booking.adultsCount = booking.maleCount + booking.femaleCount;
    
    booking.vehicleNumber = document.getElementById('editVehicleNumber').value.trim();
    booking.companyName = document.getElementById('editCompanyName').value.trim();
    booking.guestGST = document.getElementById('editGuestGST').value.trim().toUpperCase();
    booking.recommendedBy = document.getElementById('editRecommendedBy').value.trim();

    // Save Payment Method
    const editPayMethodSelect = document.getElementById('editPaymentMethod');
    if (editPayMethodSelect) {
        booking.paymentMethod = editPayMethodSelect.value;
    }
    if (booking.paymentMethod === 'Online') {
        const editBookingSourceSelect = document.getElementById('editBookingSource');
        if (editBookingSourceSelect) {
            booking.bookingSource = editBookingSourceSelect.value;
        }
    } else {
        booking.bookingSource = '';
    }

    booking.checkIn = document.getElementById('editCheckInDate').value;
    booking.checkInTime = toDisplayTime(document.getElementById('editCheckInTime').value);

    booking.checkOut = document.getElementById('editCheckOutDate').value;
    booking.checkOutTime = toDisplayTime(document.getElementById('editCheckOutTime').value);

    closeEditBookingModal();
    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    loadBookings();
    loadPayments();
    if (typeof loadRooms === 'function') loadRooms();
    updateRealtimeDashboardMetrics();
    alert(`Booking ${bookingId} details updated.`);
};

window.cancelBooking = function(bookingId) {
    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    if (booking.status === 'completed' || booking.status === 'cancelled') {
        alert(`This booking is already ${booking.status}.`);
        return;
    }

    const shouldCancel = confirm(`Are you sure you want to CANCEL booking ${booking.id} for ${booking.guestName}?`);
    if (!shouldCancel) return;

    booking.status = 'cancelled';
    
    // Free all rooms in the booking
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(roomData => {
            const room = data.rooms.find(item => item.id === roomData.roomId);
            if (room) {
                room.status = 'available';
            }
        });
    } else if (booking.roomId) {
        // Fallback for old single-room bookings
        const room = data.rooms.find(item => item.id == booking.roomId);
        if (room) {
            room.status = 'available';
        }
    }

    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Cancelled', `Booking ${booking.id} for guest ${booking.guestName} was CANCELLED.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('alert', 'Booking Cancelled', `Stay ${booking.id} (${booking.guestName}) has been cancelled.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Booking ${bookingId} has been cancelled.`);
};

window.deleteBooking = async function(bookingId) {
    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    const shouldDelete = confirm(`⚠️ PERMANENTLY DELETE booking ${booking.id} for ${booking.guestName}?\n\nThis will remove the booking and renumber all remaining bookings sequentially.\n\nThis action CANNOT be undone!`);
    if (!shouldDelete) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(`Are you ABSOLUTELY sure? This will delete ${booking.id} and renumber all bookings.`);
    if (!doubleConfirm) return;

    // Store old IDs for Firebase cleanup
    const oldIds = data.bookings.map(b => b.id);

    // Remove the booking from the array
    const index = data.bookings.findIndex(item => item.id === bookingId);
    if (index === -1) return;
    data.bookings.splice(index, 1);

    // Delete the old booking document from Firebase and IndexedDB
    deletePhotoFromLocal(bookingId).catch(err => console.warn('Failed to delete IndexedDB photo:', err));
    if (firebaseEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('bookings').doc(String(bookingId)).delete();
            await firebaseDb.collection('booking_photos').doc(String(bookingId)).delete();
        } catch (err) {
            console.warn('Failed to delete old Firebase doc:', err);
        }
    }

    // Renumber all remaining bookings sequentially: BK001, BK002, BK003...
    const renameMap = []; // { oldId, newId }
    for (let i = 0; i < data.bookings.length; i++) {
        const newId = `BK${String(i + 1).padStart(3, '0')}`;
        const oldId = data.bookings[i].id;
        if (oldId !== newId) {
            renameMap.push({ oldId, newId });
        }
        data.bookings[i].id = newId;
    }

    // Update Firebase and IndexedDB: move docs and sync new ones for renamed bookings
    for (const { oldId, newId } of renameMap) {
        migratePhotoInLocal(oldId, newId).catch(err => console.warn(`IndexedDB migrate ${oldId}→${newId} failed:`, err));
    }
    if (firebaseEnabled && firebaseDb && renameMap.length > 0) {
        for (const { oldId, newId } of renameMap) {
            try {
                // Migrate photos document if it exists
                const photoDoc = await firebaseDb.collection('booking_photos').doc(String(oldId)).get();
                if (photoDoc.exists) {
                    await firebaseDb.collection('booking_photos').doc(String(newId)).set(photoDoc.data());
                    await firebaseDb.collection('booking_photos').doc(String(oldId)).delete();
                }

                // Delete old document
                await firebaseDb.collection('bookings').doc(String(oldId)).delete();
            } catch (err) {
                console.warn(`Failed to migrate Firebase docs from ${oldId} to ${newId}:`, err);
            }
        }
        // Re-sync all bookings with new IDs to Firebase
        for (const booking of data.bookings) {
            syncBookingToFirebase(booking);
        }
    }

    // Also update customer booking history references
    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            const renamed = renameMap.find(r => r.oldId === historyItem.bookingId);
            if (renamed) {
                historyItem.bookingId = renamed.newId;
            }
        });
    });

    // Also update guest lastBookingId references
    data.guests.forEach(guest => {
        if (guest.lastBookingId) {
            const renamed = renameMap.find(r => r.oldId === guest.lastBookingId);
            if (renamed) {
                guest.lastBookingId = renamed.newId;
            }
        }
    });

    saveDataToStorage();
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Deleted', `Booking ${bookingId} was PERMANENTLY DELETED. System reindexed other bookings.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('alert', 'Booking Permanently Deleted', `Booking ID ${bookingId} has been deleted by Owner.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Booking ${bookingId} has been deleted. All bookings have been renumbered sequentially.`);
};

window.renumberAllBookings = async function() {
    if (data.bookings.length === 0) {
        alert('No bookings to renumber.');
        return;
    }

    // Check if renumbering is even needed
    let needsRenumber = false;
    for (let i = 0; i < data.bookings.length; i++) {
        const expectedId = `BK${String(i + 1).padStart(3, '0')}`;
        if (data.bookings[i].id !== expectedId) {
            needsRenumber = true;
            break;
        }
    }

    if (!needsRenumber) {
        alert('All booking IDs are already sequential. No renumbering needed.');
        return;
    }

    const shouldRenumber = confirm(`⚠️ RENUMBER ALL BOOKINGS?\n\nThis will reassign all booking IDs to be sequential (BK001, BK002, BK003...) with no gaps.\n\nAll Firebase records will be updated.\n\nContinue?`);
    if (!shouldRenumber) return;

    // Store old IDs for Firebase cleanup
    const renameMap = [];
    for (let i = 0; i < data.bookings.length; i++) {
        const newId = `BK${String(i + 1).padStart(3, '0')}`;
        const oldId = data.bookings[i].id;
        if (oldId !== newId) {
            renameMap.push({ oldId, newId });
        }
        data.bookings[i].id = newId;
        
        // Clear cached photo URLs so they're fetched fresh from Firebase with new ID
        if (data.bookings[i].customerPhotoUrl) {
            delete data.bookings[i].customerPhotoUrl;
        }
        if (data.bookings[i].idProofPhotoUrl) {
            delete data.bookings[i].idProofPhotoUrl;
        }
    }

    // Update Firebase and IndexedDB: move docs and re-sync with new IDs
    for (const { oldId, newId } of renameMap) {
        migratePhotoInLocal(oldId, newId).catch(err => console.warn(`IndexedDB migrate ${oldId}→${newId} failed:`, err));
    }
    if (firebaseEnabled && firebaseDb && renameMap.length > 0) {
        for (const { oldId, newId } of renameMap) {
            try {
                // Migrate photos document if it exists
                const photoDoc = await firebaseDb.collection('booking_photos').doc(String(oldId)).get();
                if (photoDoc.exists) {
                    const photoData = photoDoc.data();
                    // Update the booking reference in the photo document to the new ID
                    photoData.bookingId = newId;
                    await firebaseDb.collection('booking_photos').doc(String(newId)).set(photoData);
                    await firebaseDb.collection('booking_photos').doc(String(oldId)).delete();
                }
                
                // Delete old booking document (it will be recreated with new ID by syncBookingToFirebase)
                await firebaseDb.collection('bookings').doc(String(oldId)).delete();
            } catch (err) {
                console.warn(`Failed to migrate Firebase docs from ${oldId} to ${newId}:`, err);
            }
        }
        // Re-sync all bookings with new IDs
        for (const booking of data.bookings) {
            syncBookingToFirebase(booking);
        }
    }

    // Update customer booking history references
    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            const renamed = renameMap.find(r => r.oldId === historyItem.bookingId);
            if (renamed) {
                historyItem.bookingId = renamed.newId;
            }
        });
    });

    // Update guest lastBookingId references
    data.guests.forEach(guest => {
        if (guest.lastBookingId) {
            const renamed = renameMap.find(r => r.oldId === guest.lastBookingId);
            if (renamed) {
                guest.lastBookingId = renamed.newId;
            }
        }
    });

    saveDataToStorage();
    loadBookings();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Done! ${renameMap.length} booking(s) have been renumbered sequentially.`);
};
async function startBookingCamera() {
    const video = document.getElementById('bookingCameraPreview');
    const placeholder = document.getElementById('bookingCameraPlaceholder');
    const startBtn = document.getElementById('startBookingCameraBtn');
    const stopBtn = document.getElementById('stopBookingCameraBtn');

    if (!video || !placeholder || !startBtn || !stopBtn) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Webcam is not supported in this browser');
        return;
    }

    try {
        if (bookingCameraStream) {
            stopBookingCameraStream();
        }

        bookingCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = bookingCameraStream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
    } catch (error) {
        alert('Unable to access webcam. Please allow camera permission and try again.');
    }
}

function stopBookingCameraStream() {
    if (bookingCameraStream) {
        bookingCameraStream.getTracks().forEach(track => track.stop());
        bookingCameraStream = null;
    }

    const video = document.getElementById('bookingCameraPreview');
    const placeholder = document.getElementById('bookingCameraPlaceholder');
    const startBtn = document.getElementById('startBookingCameraBtn');
    const stopBtn = document.getElementById('stopBookingCameraBtn');

    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
}

function captureBookingPhoto(captureType) {
    const video = document.getElementById('bookingCameraPreview');

    if (!bookingCameraStream || !video || video.style.display === 'none' || video.videoWidth === 0) {
        alert('Please start camera first');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.92);

    if (captureType === 'customer') {
        const input = document.getElementById('bookingCustomerPhotoData');
        const previewImg = document.getElementById('customerPhotoPreview');
        const emptyText = document.getElementById('customerPhotoEmpty');

        if (input) input.value = imageData;
        if (previewImg) {
            previewImg.src = imageData;
            previewImg.style.display = 'block';
        }
        if (emptyText) emptyText.style.display = 'none';
        alert('Customer photo captured successfully');
        return;
    }

    const input = document.getElementById('bookingIdProofPhotoData');
    const previewImg = document.getElementById('idProofPhotoPreview');
    const emptyText = document.getElementById('idProofPhotoEmpty');

    if (input) input.value = imageData;
    if (previewImg) {
        previewImg.src = imageData;
        previewImg.style.display = 'block';
    }
    if (emptyText) emptyText.style.display = 'none';
    alert('ID proof photo captured successfully');
}

function resetBookingCaptureSection() {
    const customerInput = document.getElementById('bookingCustomerPhotoData');
    const idInput = document.getElementById('bookingIdProofPhotoData');
    const customerPreview = document.getElementById('customerPhotoPreview');
    const idPreview = document.getElementById('idProofPhotoPreview');
    const customerEmpty = document.getElementById('customerPhotoEmpty');
    const idEmpty = document.getElementById('idProofPhotoEmpty');

    if (customerInput) customerInput.value = '';
    if (idInput) idInput.value = '';

    if (customerPreview) {
        customerPreview.src = '';
        customerPreview.style.display = 'none';
    }

    if (idPreview) {
        idPreview.src = '';
        idPreview.style.display = 'none';
    }

    if (customerEmpty) customerEmpty.style.display = 'block';
    if (idEmpty) idEmpty.style.display = 'block';

    stopBookingCameraStream();
}

async function viewBookingPhotos(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('photoViewerModal');
    const photoTitle = document.getElementById('photoViewerTitle');
    const customerImg = document.getElementById('viewerCustomerPhoto');
    const idProofImg = document.getElementById('viewerIdProofPhoto');
    const customerStatus = document.getElementById('viewerCustomerPhotoStatus');
    const idProofStatus = document.getElementById('viewerIdProofPhotoStatus');

    // Update title with booking ID and guest name
    if (photoTitle) {
        photoTitle.textContent = `Booking ${booking.id} - ${booking.guestName} Photos`;
    }

    modal.style.display = 'flex';
    customerStatus.textContent = "Loading photos...";
    idProofStatus.textContent = "Loading photos...";
    
    // Priority: in-memory → IndexedDB (local disk) → Firebase (cloud)
    let localCustomer = booking.customerPhotoUrl || booking.customerPhoto;
    let localIdProof = booking.idProofPhotoUrl || booking.idProofPhoto;

    // Try IndexedDB if not in memory
    if (!localCustomer || !localIdProof) {
        try {
            const localPhotos = await getPhotoFromLocal(bookingId);
            if (localPhotos) {
                if (localPhotos.customerPhoto && !localCustomer) localCustomer = localPhotos.customerPhoto;
                if (localPhotos.idProofPhoto && !localIdProof) localIdProof = localPhotos.idProofPhoto;
            }
        } catch(e) {
            console.warn('Could not fetch photos from IndexedDB:', e);
        }
    }

    // Fetch from Firestore collection if still missing
    if (!localCustomer || !localIdProof) {
        try {
            if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                const doc = await firebaseDb.collection('booking_photos').doc(String(bookingId)).get();
                if (doc.exists) {
                    const picData = doc.data();
                    if (picData.customerPhoto && !localCustomer) localCustomer = picData.customerPhoto;
                    if (picData.idProofPhoto && !localIdProof) localIdProof = picData.idProofPhoto;

                    // Cache cloud photos to IndexedDB for next time
                    savePhotoToLocal(bookingId, 
                        localCustomer || null, 
                        localIdProof || null
                    ).catch(err => console.warn('Failed to cache cloud photos to IndexedDB:', err));
                }
            }
        } catch(e) {
            console.warn("Could not fetch remote photos: ", e);
        }
    }

    if (localCustomer) {
        customerImg.src = localCustomer;
        customerImg.style.display = 'block';
        customerStatus.style.display = 'none';
    } else {
        customerImg.src = '';
        customerImg.style.display = 'none';
        customerStatus.textContent = "Not Available";
        customerStatus.style.display = 'block';
    }

    if (localIdProof) {
        idProofImg.src = localIdProof;
        idProofImg.style.display = 'block';
        idProofStatus.style.display = 'none';
    } else {
        idProofImg.src = '';
        idProofImg.style.display = 'none';
        idProofStatus.textContent = "Not Available";
        idProofStatus.style.display = 'block';
    }
}

function handlePhotoUpload(inputElement, captureType) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please select a file under 5MB.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        if (captureType === 'customer') {
            const hiddenInput = document.getElementById('bookingCustomerPhotoData');
            const previewImg = document.getElementById('customerPhotoPreview');
            const emptyText = document.getElementById('customerPhotoEmpty');

            if (hiddenInput) hiddenInput.value = imageData;
            if (previewImg) {
                previewImg.src = imageData;
                previewImg.style.display = 'block';
            }
            if (emptyText) emptyText.style.display = 'none';
            alert('Customer photo uploaded successfully');
        } else {
            const hiddenInput = document.getElementById('bookingIdProofPhotoData');
            const previewImg = document.getElementById('idProofPhotoPreview');
            const emptyText = document.getElementById('idProofPhotoEmpty');

            if (hiddenInput) hiddenInput.value = imageData;
            if (previewImg) {
                previewImg.src = imageData;
                previewImg.style.display = 'block';
            }
            if (emptyText) emptyText.style.display = 'none';
            alert('ID proof photo uploaded successfully');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
}

// ===== UPDATE CUSTOMER PHOTO (ADMIN ONLY) =====

window.triggerUpdateCustomerPhoto = function() {
    const fileInput = document.getElementById('updateCustomerPhotoInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleUpdateCustomerPhoto = function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        const viewerCustomerPhoto = document.getElementById('viewerCustomerPhoto');
        const photoViewerTitle = document.getElementById('photoViewerTitle');
        
        // Extract booking ID from title (format: "Booking BK### - Name Photos")
        const titleText = photoViewerTitle.textContent;
        const bookingIdMatch = titleText.match(/Booking (BK\d+)/);
        const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        
        if (!bookingId) {
            alert('Could not identify booking. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Find booking in data
        const booking = data.bookings.find(b => b.id === bookingId);
        if (!booking) {
            alert('Booking not found. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Update the image preview immediately
        viewerCustomerPhoto.src = imageData;
        viewerCustomerPhoto.style.display = 'block';
        
        // Update booking locally
        booking.customerPhoto = imageData;
        booking.customerPhotoUrl = imageData;
        
        // Save to IndexedDB (local disk)
        getPhotoFromLocal(bookingId).then(existing => {
            savePhotoToLocal(bookingId, imageData, existing ? existing.idProofPhoto : (booking.idProofPhoto || null))
                .then(() => console.log('Customer photo saved to IndexedDB'))
                .catch(err => console.warn('IndexedDB save failed:', err));
        });
        
        // Sync to Firebase (cloud)
        if (typeof firebaseDb !== 'undefined' && firebaseDb) {
            syncBookingToFirebase(booking)
                .then(() => {
                    console.log('Customer photo synced to Firebase');
                    alert('Customer photo updated successfully!');
                })
                .catch(err => {
                    console.error('Error uploading photo:', err);
                    alert('Photo updated but sync to cloud failed.');
                });
        } else {
            console.log('Firebase not available, update saved locally');
            alert('Customer photo updated successfully!');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
};

// ===== UPDATE ID PROOF PHOTO (ADMIN) =====

window.triggerUpdateIdProofPhoto = function() {
    const fileInput = document.getElementById('updateIdProofPhotoInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.handleUpdateIdProofPhoto = function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        const viewerIdProofPhoto = document.getElementById('viewerIdProofPhoto');
        const photoViewerTitle = document.getElementById('photoViewerTitle');
        
        // Extract booking ID from title (format: "Booking BK### - Name Photos")
        const titleText = photoViewerTitle.textContent;
        const bookingIdMatch = titleText.match(/Booking (BK\d+)/);
        const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
        
        if (!bookingId) {
            alert('Could not identify booking. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Find booking in data
        const booking = data.bookings.find(b => b.id === bookingId);
        if (!booking) {
            alert('Booking not found. Please refresh and try again.');
            inputElement.value = '';
            return;
        }
        
        // Update the image preview immediately
        viewerIdProofPhoto.src = imageData;
        viewerIdProofPhoto.style.display = 'block';
        
        // Update booking locally
        booking.idProofPhoto = imageData;
        booking.idProofPhotoUrl = imageData;
        
        // Save to IndexedDB (local disk)
        getPhotoFromLocal(bookingId).then(existing => {
            savePhotoToLocal(bookingId, existing ? existing.customerPhoto : (booking.customerPhoto || null), imageData)
                .then(() => console.log('ID proof photo saved to IndexedDB'))
                .catch(err => console.warn('IndexedDB save failed:', err));
        });
        
        // Sync to Firebase (cloud)
        if (typeof firebaseDb !== 'undefined' && firebaseDb) {
            syncBookingToFirebase(booking)
                .then(() => {
                    console.log('ID proof photo synced to Firebase');
                    alert('ID proof photo updated successfully!');
                })
                .catch(err => {
                    console.error('Error uploading photo:', err);
                    alert('Photo updated but sync to cloud failed.');
                });
        } else {
            console.log('Firebase not available, update saved locally');
            alert('ID proof photo updated successfully!');
        }
    };

    reader.readAsDataURL(file);
    // Reset file input so the same file can be re-selected
    inputElement.value = '';
};

// ===== RECOVER MISSING PHOTOS =====

window.openRecoverPhotosModal = function() {
    const modal = document.getElementById('recoverPhotosModal');
    if (modal) {
        modal.style.display = 'flex';
        fetchOrphanedPhotos();
    }
};

window.closeRecoverPhotosModal = function() {
    const modal = document.getElementById('recoverPhotosModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

async function fetchOrphanedPhotos() {
    const statusEl = document.getElementById('recoverPhotosStatus');
    const gridEl = document.getElementById('recoverPhotosGrid');
    
    if (!firebaseEnabled || !firebaseDb) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Database connection not available.';
        return;
    }
    
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning cloud database for orphaned photos...';
    gridEl.innerHTML = '';
    
    try {
        const snapshot = await firebaseDb.collection('booking_photos').get();
        const orphaned = [];
        
        // Find documents in booking_photos that do NOT have a corresponding active booking
        snapshot.forEach(doc => {
            const photoId = doc.id; // e.g. "BK003"
            const bookingExists = data.bookings.some(b => b.id === photoId);
            
            if (!bookingExists) {
                const docData = doc.data();
                if (docData.customerPhoto || docData.idProofPhoto) {
                    orphaned.push({
                        id: photoId,
                        data: docData
                    });
                }
            }
        });
        
        if (orphaned.length === 0) {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> No orphaned photos found in the database. All existing photos are properly linked.';
            return;
        }
        
        statusEl.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i> Found ${orphaned.length} photo record(s) not linked to any active booking.`;
        
        // Render orphaned photos
        orphaned.forEach(item => {
            const hasCust = item.data.customerPhoto ? 'Yes' : 'No';
            const hasId = item.data.idProofPhoto ? 'Yes' : 'No';
            
            // Build options for current bookings (last 20 to avoid massive lists)
            const recentBookings = [...data.bookings].sort((a,b) => b.id.localeCompare(a.id)).slice(0, 30);
            let optionsHtml = '<option value="">Select booking to assign...</option>';
            recentBookings.forEach(b => {
                optionsHtml += `<option value="${b.id}">${b.id} - ${b.guestName} (Room ${b.roomName})</option>`;
            });
            
            const cardHtml = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 10px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 13px;">
                        Found ID: ${item.id}
                    </div>
                    <div style="padding: 15px; flex: 1; display: flex; gap: 10px; justify-content: center; background: #f8fafc;">
                        ${item.data.customerPhoto ? `<img src="${item.data.customerPhoto}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" title="Customer Photo">` : ''}
                        ${item.data.idProofPhoto ? `<img src="${item.data.idProofPhoto}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" title="ID Proof">` : ''}
                    </div>
                    <div style="padding: 15px; border-top: 1px solid #e2e8f0;">
                        <select id="assign-target-${item.id}" style="width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px;">
                            ${optionsHtml}
                        </select>
                        <button class="btn-primary" onclick="assignPhotoToBooking('${item.id}')" style="width: 100%; font-size: 12px; padding: 8px;">
                            <i class="fas fa-link"></i> Assign to Booking
                        </button>
                    </div>
                </div>
            `;
            gridEl.insertAdjacentHTML('beforeend', cardHtml);
        });
        
    } catch (err) {
        console.error("Error fetching orphaned photos:", err);
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Failed to fetch photos from cloud database. See console for details.';
    }
}

window.assignPhotoToBooking = async function(orphanedId) {
    const selectEl = document.getElementById(`assign-target-${orphanedId}`);
    if (!selectEl) return;
    
    const targetBookingId = selectEl.value;
    if (!targetBookingId) {
        alert("Please select a booking to assign the photos to.");
        return;
    }
    
    const targetBooking = data.bookings.find(b => b.id === targetBookingId);
    if (!targetBooking) {
        alert("Selected booking not found.");
        return;
    }
    
    const confirmAssign = confirm(`Assign photos from ${orphanedId} to booking ${targetBooking.id} (${targetBooking.guestName})?`);
    if (!confirmAssign) return;
    
    try {
        // Fetch orphaned document data
        const orphanedDoc = await firebaseDb.collection('booking_photos').doc(String(orphanedId)).get();
        if (!orphanedDoc.exists) {
            alert("Orphaned photo no longer exists in database.");
            return;
        }
        
        const photoData = orphanedDoc.data();
        
        // Merge into target booking
        await firebaseDb.collection('booking_photos').doc(String(targetBookingId)).set(photoData, { merge: true });
        
        // Delete orphaned document
        await firebaseDb.collection('booking_photos').doc(String(orphanedId)).delete();
        
        // Update local booking flags
        if (photoData.customerPhoto) {
            targetBooking.hasCustomerPhoto = true;
            targetBooking.customerPhotoUrl = photoData.customerPhoto; // Cache locally
        }
        if (photoData.idProofPhoto) {
            targetBooking.hasIdProofPhoto = true;
            targetBooking.idProofPhotoUrl = photoData.idProofPhoto; // Cache locally
        }
        
        // Save assigned photos to IndexedDB (local disk)
        savePhotoToLocal(targetBookingId, photoData.customerPhoto || null, photoData.idProofPhoto || null)
            .then(() => console.log(`Assigned photos saved to IndexedDB for ${targetBookingId}`))
            .catch(err => console.warn('IndexedDB save after assignment failed:', err));
        
        saveDataToStorage();
        syncBookingToFirebase(targetBooking); // Resync
        loadBookings(); // Refresh UI
        
        alert(`Successfully assigned photos to ${targetBooking.id}!`);
        
        // Refresh the orphaned photos list
        fetchOrphanedPhotos();
        
    } catch (err) {
        console.error("Failed to assign photos:", err);
        alert("An error occurred while assigning photos. Please try again.");
    }
};

// View All Photos in Database Gallery
window.viewAllPhotosInDatabase = async function() {
    const modal = document.getElementById('allPhotosModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    const statusEl = document.getElementById('allPhotosStatus');
    const gridEl = document.getElementById('allPhotosGrid');
    
    if (!firebaseEnabled || !firebaseDb) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Database connection not available.';
        gridEl.innerHTML = '';
        return;
    }
    
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading all photos from database...';
    gridEl.innerHTML = '';
    
    try {
        const snapshot = await firebaseDb.collection('booking_photos').get();
        let photoCount = 0;
        const photoCards = [];
        
        snapshot.forEach(doc => {
            const bookingId = doc.id;
            const docData = doc.data();
            const booking = data.bookings.find(b => b.id === bookingId);
            const guestName = booking ? booking.guestName : 'Unknown Guest';
            
            if (docData.customerPhoto) {
                photoCount++;
                const photoSrc = docData.customerPhoto;
                const safePhotoId = `photo-cust-${bookingId}-${photoCount}`;
                
                const card = `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 8px 10px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                            <div style="font-weight: 600; font-size: 12px; color: var(--primary-brand); word-break: break-word;">
                                <i class="fas fa-id-card"></i> ${bookingId}
                            </div>
                            <div style="font-size: 11px; color: var(--text-light); margin-top: 2px; word-break: break-word;">
                                ${guestName}
                            </div>
                        </div>
                        <div style="padding: 8px; background: #f8fafc; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 180px; position: relative; overflow: hidden;">
                            <div id="load-${safePhotoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f4f8; z-index: 1;">
                                <i class="fas fa-spinner fa-spin" style="color: #94a3b8; font-size: 24px;"></i>
                            </div>
                            <img id="${safePhotoId}" src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; position: relative; z-index: 2;" data-title="Customer - ${bookingId}" title="Click to expand" 
                                onload="const loader = document.getElementById('load-${safePhotoId}'); if(loader) loader.style.display='none';" 
                                onerror="document.getElementById('load-${safePhotoId}').innerHTML='<div style=\"text-align:center;color:#94a3b8;\"><i class=\"fas fa-exclamation-circle\" style=\"font-size:24px;margin-bottom:8px;display:block;\"></i><span style=\"font-size:11px;\">Failed to load</span></div>';"> 
                        </div>
                        <div style="padding: 6px 10px; background: white; font-size: 10px; font-weight: 600; color: var(--text-light); border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                            Guest Photo
                        </div>
                    </div>
                `;
                photoCards.push(card);
            }
            
            if (docData.idProofPhoto) {
                photoCount++;
                const photoSrc = docData.idProofPhoto;
                const safePhotoId = `photo-id-${bookingId}-${photoCount}`;
                
                const card = `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 8px 10px; background: #fff5f5; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                            <div style="font-weight: 600; font-size: 12px; color: #e74c3c; word-break: break-word;">
                                <i class="fas fa-passport"></i> ${bookingId}
                            </div>
                            <div style="font-size: 11px; color: var(--text-light); margin-top: 2px; word-break: break-word;">
                                ${guestName}
                            </div>
                        </div>
                        <div style="padding: 8px; background: #f8fafc; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 180px; position: relative; overflow: hidden;">
                            <div id="load-${safePhotoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f4f8; z-index: 1;">
                                <i class="fas fa-spinner fa-spin" style="color: #94a3b8; font-size: 24px;"></i>
                            </div>
                            <img id="${safePhotoId}" src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; position: relative; z-index: 2;" data-title="ID Proof - ${bookingId}" title="Click to expand"
                                onload="const loader = document.getElementById('load-${safePhotoId}'); if(loader) loader.style.display='none';" 
                                onerror="document.getElementById('load-${safePhotoId}').innerHTML='<div style=\"text-align:center;color:#94a3b8;\"><i class=\"fas fa-exclamation-circle\" style=\"font-size:24px;margin-bottom:8px;display:block;\"></i><span style=\"font-size:11px;\">Failed to load</span></div>';">
                        </div>
                        <div style="padding: 6px 10px; background: white; font-size: 10px; font-weight: 600; color: var(--text-light); border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                            ID Proof
                        </div>
                    </div>
                `;
                photoCards.push(card);
            }
        });
        
        // Add all cards to grid
        photoCards.forEach(card => {
            gridEl.insertAdjacentHTML('beforeend', card);
        });
        
        // Attach click handlers to all images
        setTimeout(() => {
            const allImages = gridEl.querySelectorAll('img');
            allImages.forEach(img => {
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    expandPhoto(this);
                }, false);
            });
        }, 100);
        
        if (photoCount === 0) {
            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> No photos found in the database.';
        } else {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Found <strong>${photoCount}</strong> photo(s) in the database.`;
        }
        
    } catch (err) {
        console.error("Error fetching all photos:", err);
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Failed to fetch photos from database. See console for details.';
        gridEl.innerHTML = '';
    }
};

window.closeAllPhotosModal = function() {
    const modal = document.getElementById('allPhotosModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.expandPhoto = function(element) {
    if (!element || !element.src) {
        console.error('Invalid element passed to expandPhoto');
        return;
    }
    
    const photoSrc = element.src;
    const title = element.getAttribute('data-title') || 'Photo';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'expandPhotoModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 20px;';
    
    // Create container for image
    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;';
    
    // Add loading indicator
    const loader = document.createElement('div');
    loader.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff;';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>';
    container.appendChild(loader);
    
    // Create image element
    const img = document.createElement('img');
    img.src = photoSrc;
    img.style.cssText = 'max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: none;';
    
    // Handle image load
    img.onload = function() {
        loader.style.display = 'none';
        img.style.display = 'block';
    };
    
    // Handle image error
    img.onerror = function() {
        loader.innerHTML = '<div style="text-align: center; color: #fff;"><i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 10px; display: block;"></i><p>Failed to load image</p></div>';
    };
    
    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'position: absolute; top: 20px; left: 20px; color: white; font-size: 16px; font-weight: 600; background: rgba(0,0,0,0.8); padding: 12px 16px; border-radius: 6px; max-width: 300px; word-break: break-word;';
    titleDiv.textContent = title;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.95); border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 600; color: #333; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: all 0.3s;';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,1)'; };
    closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.95)'; };
    
    const closeModal = function() {
        modal.remove();
    };
    
    closeBtn.onclick = closeModal;
    
    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Close on ESC key
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Add elements to container
    container.appendChild(img);
    modal.appendChild(container);
    modal.appendChild(titleDiv);
    modal.appendChild(closeBtn);
    
    document.body.appendChild(modal);
};
