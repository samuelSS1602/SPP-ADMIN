import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBookingDays, calculateSurchargedRate, getBookingBalance, getBookingTotal } from '../src/lib/bookingCalc.js';

const booking = { checkIn: '2026-08-01', checkOut: '2026-08-03', roomRate: 2500, extras: 100, extraBed: 0, discount: 0, advance: 1000 };

test('multi-day booking counts nights', () => {
    assert.equal(calculateBookingDays(booking), 2);
});

test('total is rate * nights + extras, balance subtracts advance', () => {
    const total = getBookingTotal(booking);
    assert.equal(total, 2500 * 2 + 100);
    assert.equal(getBookingBalance(booking), total - booking.advance);
    assert.equal(getBookingTotal(booking), total, 'repeated calculation is stable');
});

test('actual check-out date overrides the planned one', () => {
    assert.equal(calculateBookingDays({ ...booking, actualCheckOutDate: '2026-08-02' }), 1);
});

test('weekend and holiday surcharges', () => {
    // 2026-08-01 is a Saturday
    const result = calculateSurchargedRate(2000, '2026-08-01', { weekendSurcharge: 10, holidaySurgeActive: true, holidaySurgeRate: 20 });
    assert.equal(result.roundedRate, 2600);
    assert.equal(result.surchargeInfo.length, 2);
    assert.equal(calculateSurchargedRate(2000, '2026-08-04', { weekendSurcharge: 10 }).roundedRate, 2000);
});
