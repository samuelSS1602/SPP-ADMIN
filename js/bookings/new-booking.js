
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
        createdAt: new Date().toISOString(),
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
