const assert = require('assert');
const path = require('path');

const helpersPath = path.join(__dirname, '..', 'bookingFeatureHelpers.js');
const { analyzePhotoQuality, buildBookingConfirmationMessage, buildBookingShareLink } = require(helpersPath);

const poorQuality = analyzePhotoQuality({
  width: 120,
  height: 120,
  brightness: 10,
  contrast: 0.02,
  edgeVariance: 0.04,
  pixelCount: 10000
});

assert.strictEqual(poorQuality.isPoor, true, 'Very dark/low-contrast images should be flagged as poor quality');
assert.ok(poorQuality.reasons.includes('low-contrast') || poorQuality.reasons.includes('too-dark'), 'The reason list should mention the detected quality issue');

const goodQuality = analyzePhotoQuality({
  width: 800,
  height: 600,
  brightness: 140,
  contrast: 0.45,
  edgeVariance: 0.35,
  pixelCount: 480000
});

assert.strictEqual(goodQuality.isPoor, false, 'Normal images should not be flagged as poor quality');

const message = buildBookingConfirmationMessage({
  id: 'BK001',
  guestName: 'Ravi',
  guestPhone: '9876543210',
  roomName: 'F1-102',
  checkIn: '2026-08-01',
  checkInTime: '12:00 PM',
  checkOut: '2026-08-02',
  checkOutTime: '11:00 AM',
  roomRate: 2500,
  advance: 1000,
  extras: 200,
  extraBed: 0,
  paymentMethod: 'Cash',
  bookingSource: 'Walk-in',
  rooms: [{ roomName: 'F1-102', floor: 1 }]
}, 'https://example.test/receipt?bookingId=BK001');

assert.ok(message.includes('Booking Confirmed'), 'The message should include a confirmation header');
assert.ok(message.includes('BK001'), 'The message should include the booking ID');
assert.ok(message.includes('https://example.test/receipt?bookingId=BK001'), 'The message should include the booking link');

const shareLink = buildBookingShareLink('https://example.test/app', 'BK001');
assert.strictEqual(shareLink, 'https://example.test/app?bookingId=BK001&view=receipt', 'The booking share link should include the booking ID and receipt view');

console.log('bookingFeatureHelpers tests passed');
