let bookingCameraStream = null;
let bookingCameraInitialized = false;
let bookingTimeModeInitialized = false;
function loadBookings() {
    let html = '';
    data.bookings.forEach(booking => {
        const total = getBookingTotal(booking);
        const isCheckedOut = booking.status === 'completed';
        const checkoutButton = isCheckedOut
            ? '<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #27AE60; cursor: default;" disabled><i class="fas fa-check"></i> Checked Out</button>'
            : `<button class="btn-primary" style="padding: 6px 10px; font-size: 11px; background: #27AE60;" onclick="checkoutBooking('${booking.id}')"><i class="fas fa-sign-out-alt"></i> Checkout</button>`;

        // Display all rooms for multi-room bookings
        const roomDisplayText = booking.rooms && booking.rooms.length > 1
            ? `${booking.rooms.map(r => r.roomName).join(', ')} (${booking.rooms.length} rooms)`
            : (booking.rooms && booking.rooms.length === 1 
                ? booking.rooms[0].roomName
                : booking.roomName);  // Fallback for bookings created before multi-room support

        html += `<tr><td><strong>${booking.id}</strong></td><td>${booking.guestName}</td><td>${roomDisplayText}</td><td>${formatDate(booking.checkIn)}</td><td>${formatDate(booking.checkOut)}</td><td>₹${formatNumber(total)}</td><td><span class="status-badge ${booking.status}">${capitalizeFirst(booking.status)}</span></td><td>
            <button class="btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="showReceipt('${booking.id}')" title="Receipt"><i class="fas fa-receipt"></i></button>
            ${(booking.customerPhoto || booking.customerPhotoUrl) ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 11px; background:#4F46E5; margin-left:4px;" onclick="viewBookingPhotos('${booking.id}')" title="Photos"><i class="fas fa-camera"></i></button>` : ''}
        </td>
        <td>${checkoutButton}</td></tr>`;
    });
    const tableBody = document.getElementById('bookingsTable');
    if (tableBody) tableBody.innerHTML = html;
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
        discount: 0,
        customerPhoto: customerPhotoData,
        idProofPhoto: idProofPhotoData,
        checkInWhatsAppSent: false,
        checkoutReminderSent: false
    });

    // Mark all selected rooms as occupied
    roomsToBook.forEach(room => {
        room.status = 'occupied';
    });

    const createdBooking = data.bookings[data.bookings.length - 1];
    
    // Set legacy fields for rooms for compatibility with existing code
    createdBooking.roomId = selectedRoomIds[0];
    createdBooking.roomName = multiRoomBookingSelection[0].roomName;
    createdBooking.floor = multiRoomBookingSelection[0].floor;
    
    sendCheckInWhatsAppMessage(createdBooking);

    upsertGuestRecord(guestName, guestPhone, guestEmail, checkOut);
    saveDataToStorage();
    syncBookingToFirebase(createdBooking);

    document.getElementById('newBookingForm').reset();
    resetBookingCaptureSection();
    multiRoomBookingSelection = [];
    loadNewBookingPage();
    loadBookings();
    loadPayments();
    loadRooms();
    
    const roomsList = multiRoomBookingSelection.length > 1 
        ? `${multiRoomBookingSelection[0].roomName} + ${multiRoomBookingSelection.length - 1} more`
        : multiRoomBookingSelection[0].roomName;
    
    alert(`Booking ${bookingId} created successfully for ${multiRoomBookingSelection.length} room(s): ${roomsList}`);
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
