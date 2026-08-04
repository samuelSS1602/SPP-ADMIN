const assert = require('assert');
const path = require('path');

const calcPath = path.join(__dirname, '..', 'bookingCalculations.js');
const { calculateBookingDays, getBookingTotal, getBookingBalance } = require(calcPath);

// Multi-day booking should calculate days correctly (2 nights from 2026-08-01 to 2026-08-03)
const booking = {
  checkIn: '2026-08-01',
  checkOut: '2026-08-03',
  roomRate: 2500,
  extras: 100,
  extraBed: 0,
  discount: 0,
  advance: 1000
};

const days = calculateBookingDays(booking);
assert.strictEqual(days, 2, 'Expected 2 days for 2026-08-01 -> 2026-08-03');

const total = getBookingTotal(booking);
assert.strictEqual(total, 2500 * 2 + 100, 'Total should be roomRate * days + extras');

const balance = getBookingBalance(booking);
assert.strictEqual(balance, total - booking.advance, 'Balance should equal total minus advance');

// Re-running total shouldn't double anything
const total2 = getBookingTotal(booking);
assert.strictEqual(total2, total, 'Repeated total calculation must not change the result');

console.log('bookingTotals tests passed');
