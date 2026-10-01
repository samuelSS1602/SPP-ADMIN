import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePhotoQuality, buildBookingConfirmationMessage, buildBookingShareLink } from '../src/lib/bookingFeatureHelpers.js';
import { validateBookingIdProof, normalizeIdInputLive } from '../src/lib/idProof.js';
import { normalizePhoneForWhatsApp } from '../src/lib/whatsapp.js';
import { displayTimeToInput, toDisplayTime } from '../src/lib/format.js';

test('photo quality flags dark / low-contrast images', () => {
    const poor = analyzePhotoQuality({ width: 120, height: 120, brightness: 10, contrast: 0.02, edgeVariance: 0.04, pixelCount: 10000 });
    assert.equal(poor.isPoor, true);
    assert.ok(poor.reasons.includes('low-contrast') || poor.reasons.includes('too-dark'));
    const good = analyzePhotoQuality({ width: 800, height: 600, brightness: 140, contrast: 0.45, edgeVariance: 0.35, pixelCount: 480000 });
    assert.equal(good.isPoor, false);
});

test('confirmation message and share link', () => {
    const message = buildBookingConfirmationMessage({
        id: 'BK001', guestName: 'Ravi', guestPhone: '9876543210', roomName: 'F1-102',
        checkIn: '2026-08-01', checkInTime: '12:00 PM', checkOut: '2026-08-02', checkOutTime: '11:00 AM',
        roomRate: 2500, advance: 1000, extras: 200, extraBed: 0, paymentMethod: 'Cash', bookingSource: 'Walk-in',
        rooms: [{ roomName: 'F1-102', floor: 1 }]
    }, 'https://example.test/receipt?bookingId=BK001');
    assert.ok(message.includes('Booking Confirmed'));
    assert.ok(message.includes('BK001'));
    assert.ok(message.includes('https://example.test/receipt?bookingId=BK001'));
    assert.equal(buildBookingShareLink('https://example.test/app', 'BK001'), 'https://example.test/app?bookingId=BK001&view=receipt');
});

test('ID proof validation', () => {
    assert.deepEqual(validateBookingIdProof('Aadhar Card', '1234 5678 9012'), { valid: true, normalized: '1234 5678 9012' });
    assert.equal(validateBookingIdProof('Aadhar Card', '1234').valid, false);
    assert.deepEqual(validateBookingIdProof('Passport', 'a1234567'), { valid: true, normalized: 'A1234567' });
    assert.equal(validateBookingIdProof('Voter ID', 'AB1234567').valid, false);
    assert.equal(validateBookingIdProof('', 'X').valid, false);
    assert.equal(normalizeIdInputLive('Aadhar Card', '123456789012999'), '1234 5678 9012');
});

test('phone and time helpers', () => {
    assert.equal(normalizePhoneForWhatsApp('98765 43210'), '919876543210');
    assert.equal(normalizePhoneForWhatsApp('123'), '');
    assert.equal(toDisplayTime('14:05'), '2:05 PM');
    assert.equal(toDisplayTime('00:30'), '12:30 AM');
    assert.equal(displayTimeToInput('2:05 PM'), '14:05');
    assert.equal(displayTimeToInput('12:10 AM'), '00:10');
    assert.equal(displayTimeToInput('N/A'), '');
});
