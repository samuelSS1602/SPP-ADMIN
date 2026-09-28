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
