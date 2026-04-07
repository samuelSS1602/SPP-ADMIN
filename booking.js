let bookingCameraStream = null;
let bookingCameraInitialized = false;
let bookingTimeModeInitialized = false;
let bookingFilterYear = new Date().getFullYear();
let bookingFilterMonth = 'all'; // 'all' or 0-11

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
                <span class="month-revenue">₹${formatNumber(monthRevenue)}</span>
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
            } else if (isCheckedOut) {
                actionsHtml += '<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #27AE60; cursor: default;" disabled><i class="fas fa-check"></i> Checked Out</button>';
            } else {
                actionsHtml += `<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #27AE60;" onclick="checkoutBooking('${booking.id}')" title="Checkout"><i class="fas fa-sign-out-alt"></i></button>`;
                actionsHtml += `<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #F59E0B;" onclick="openEditBookingModal('${booking.id}')" title="Edit"><i class="fas fa-edit"></i></button>`;
                actionsHtml += `<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #EF4444;" onclick="cancelBooking('${booking.id}')" title="Cancel"><i class="fas fa-times"></i></button>`;
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
    const advance = parseFloat(document.getElementById('bookingAdvance').value);
    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');
    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;
    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);
    const vehicleNumber = document.getElementById('bookingVehicleNumber') ? document.getElementById('bookingVehicleNumber').value.trim() : '';
    const companyName = document.getElementById('bookingCompanyName') ? document.getElementById('bookingCompanyName').value.trim() : '';
    const guestGST = document.getElementById('bookingGuestGST') ? document.getElementById('bookingGuestGST').value.trim().toUpperCase() : '';
    const bookingSource = paymentMethod === 'Online' && document.getElementById('bookingSource') ? document.getElementById('bookingSource').value : '';

    // Validate multi-room selection
    if (!multiRoomBookingSelection || multiRoomBookingSelection.length === 0) {
        alert('Please select at least one room');
        return;
    }

    if (!guestName || !guestPhone || !idProofType || !idProofNumberRaw || !checkIn || !checkOut || !paymentMethod || Number.isNaN(advance) || Number.isNaN(extras)) {
        alert('Please fill in all required booking details');
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

    // Create booking with rooms array
    data.bookings.push({
        id: bookingId,
        guestName,
        guestPhone,
        guestEmail,
        idProofType,
        idProofNumber: idProofValidation.normalized,
        rooms: multiRoomBookingSelection,  // Array of rooms instead of single room
        checkIn,
        checkInTime,
        checkOut,
        checkOutTime,
        paymentMethod,
        status: 'confirmed',
        roomRate: totalRoomRate,  // Total of all rooms
        advance,
        extras,
        extraBed,
        maleCount,
        femaleCount,
        childrenCount,
        vehicleNumber,
        companyName,
        guestGST,
        discount: 0,
        customerPhoto: customerPhotoData,
        idProofPhoto: idProofPhotoData,
        bookingSource: bookingSource,
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

    upsertGuestRecord(guestName, guestPhone, guestEmail, checkOut, createdBooking.id);
    saveDataToStorage();
    syncBookingToFirebase(createdBooking);

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
            idNumberInput.placeholder = 'TN0120231234567';
            idNumberInput.maxLength = 17;
            hint.textContent = 'Driving License format: 2 letters + 2 digits + 11 to 13 digits';
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
        if (!/^[A-Z]{2}[0-9]{2}[0-9]{11,13}$/.test(normalizedUpper)) {
            return { valid: false, message: 'Invalid Driving License number. Use format like TN0120231234567.' };
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

window.openEditBookingModal = function(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

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

    document.getElementById('editCheckInDate').value = booking.checkIn || '';
    populateTimeToInput(booking.checkInTime, 'editCheckInTime');

    document.getElementById('editCheckOutDate').value = booking.checkOut || '';
    populateTimeToInput(booking.checkOutTime, 'editCheckOutTime');

    document.getElementById('editBookingModal').classList.add('active');
};

window.closeEditBookingModal = function() {
    document.getElementById('editBookingModal').classList.remove('active');
};

window.saveEditedBooking = function() {
    const bookingId = document.getElementById('editBookingId').value;
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    booking.guestName = document.getElementById('editGuestName').value.trim();
    booking.guestPhone = document.getElementById('editGuestPhone').value.trim();
    booking.guestEmail = document.getElementById('editGuestEmail').value.trim();
    booking.advance = parseFloat(document.getElementById('editAdvanceAmount').value) || 0;
    booking.roomRate = parseFloat(document.getElementById('editRoomRate').value) || 0;
    booking.extras = parseFloat(document.getElementById('editExtras').value) || 0;
    booking.extraBed = parseFloat(document.getElementById('editExtraBed').value) || 0;
    
    booking.maleCount = parseInt(document.getElementById('editMaleCount').value) || 0;
    booking.femaleCount = parseInt(document.getElementById('editFemaleCount').value) || 0;
    booking.childrenCount = parseInt(document.getElementById('editChildrenCount').value) || 0;
    
    // Maintain legacy field for compatibility
    booking.adultsCount = booking.maleCount + booking.femaleCount;
    
    booking.vehicleNumber = document.getElementById('editVehicleNumber').value.trim();
    booking.companyName = document.getElementById('editCompanyName').value.trim();
    booking.guestGST = document.getElementById('editGuestGST').value.trim().toUpperCase();

    booking.checkIn = document.getElementById('editCheckInDate').value;
    booking.checkInTime = toDisplayTime(document.getElementById('editCheckInTime').value);

    booking.checkOut = document.getElementById('editCheckOutDate').value;
    booking.checkOutTime = toDisplayTime(document.getElementById('editCheckOutTime').value);

    closeEditBookingModal();
    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    loadBookings();
    loadPayments();
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
    
    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Booking ${bookingId} has been cancelled.`);
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
    const customerImg = document.getElementById('viewerCustomerPhoto');
    const idProofImg = document.getElementById('viewerIdProofPhoto');
    const customerStatus = document.getElementById('viewerCustomerPhotoStatus');
    const idProofStatus = document.getElementById('viewerIdProofPhotoStatus');

    modal.style.display = 'flex';
    customerStatus.textContent = "Loading cloud photos...";
    idProofStatus.textContent = "Loading cloud photos...";
    
    let localCustomer = booking.customerPhotoUrl || booking.customerPhoto;
    let localIdProof = booking.idProofPhotoUrl || booking.idProofPhoto;

    // Fetch from Firestore collection if not cached locally
    if (!localCustomer || !localIdProof) {
        try {
            if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                const doc = await firebaseDb.collection('booking_photos').doc(String(bookingId)).get();
                if (doc.exists) {
                    const picData = doc.data();
                    if (picData.customerPhoto && !localCustomer) localCustomer = picData.customerPhoto;
                    if (picData.idProofPhoto && !localIdProof) localIdProof = picData.idProofPhoto;
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
