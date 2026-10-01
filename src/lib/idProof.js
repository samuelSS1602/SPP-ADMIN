export const ID_PROOF_TYPES = ['Aadhar Card', 'Driving License', 'Passport', 'Voter ID'];

// Placeholder, max length and hint shown for each ID type
export function getIdProofInputRules(idType) {
    switch (idType) {
        case 'Aadhar Card':
            return { placeholder: '1234 5678 9012', maxLength: 14, hint: 'Aadhar format: exactly 12 digits' };
        case 'Driving License':
            return { placeholder: 'e.g. TN0120231234567', maxLength: 40, hint: 'Enter Driving License number' };
        case 'Passport':
            return { placeholder: 'A1234567', maxLength: 8, hint: 'Passport format: 1 letter + 7 digits' };
        case 'Voter ID':
            return { placeholder: 'ABC1234567', maxLength: 10, hint: 'Voter ID format: 3 letters + 7 digits' };
        default:
            return { placeholder: '', maxLength: 40, hint: 'Select ID type to see required format' };
    }
}

// Applied on every keystroke
export function normalizeIdInputLive(idType, value) {
    if (idType === 'Aadhar Card') {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    }
    return value.toUpperCase().replace(/\s+/g, '');
}

export function validateBookingIdProof(idProofType, rawIdNumber) {
    const normalizedUpper = rawIdNumber.toUpperCase().replace(/\s+/g, '');

    if (idProofType === 'Aadhar Card') {
        const digits = rawIdNumber.replace(/\D/g, '');
        if (!/^\d{12}$/.test(digits)) {
            return { valid: false, message: 'Invalid Aadhar number. It must contain exactly 12 digits.' };
        }
        return { valid: true, normalized: digits.replace(/(.{4})/g, '$1 ').trim() };
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
