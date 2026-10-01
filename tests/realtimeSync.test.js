import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiaryChanges, applyRoomChanges, mergeCloudBookings } from '../src/firebase/merge.js';

test('cloud list replaces local list; photos only follow the same stay', () => {
    const local = [
        { id: 'BK001', guestName: 'ANU', createdAt: 'a', customerPhoto: 'data:image/jpeg;base64,AAA' },
        { id: 'BK002', guestName: 'RAVI', createdAt: 'b', customerPhoto: 'data:image/jpeg;base64,BBB' },
        { id: 'BK009', guestName: 'LOCAL ONLY', createdAt: 'z' }
    ];
    // Another device deleted BK001 and renumbered RAVI to BK001; a new stay now uses BK002.
    const { bookings, localOnly, reusedIds } = mergeCloudBookings(local, [
        { id: 'BK010', guestName: 'MEENA', createdAt: 'x', guestPhone: '1' },
        { id: 'BK002', guestName: 'KUMAR', createdAt: 'c', guestPhone: '2' },
        { id: 'BK001', guestName: 'RAVI', createdAt: 'b', guestPhone: '3' }
    ]);

    assert.equal(bookings.map(b => b.id).join(','), 'BK001,BK002,BK010', 'sorted by booking number');
    assert.equal(bookings[0].customerPhoto, undefined, 'a photo must not follow an id that now belongs to another guest');
    assert.deepEqual(reusedIds.sort(), ['BK001', 'BK002'], 'cached photos for reused ids are cleared');
    assert.deepEqual(localOnly.map(b => b.guestName), ['LOCAL ONLY'], 'browser-only bookings are kept aside, not lost');

    const next = mergeCloudBookings(
        [{ ...bookings[2], customerPhoto: 'data:image/jpeg;base64,MMM' }],
        [{ id: 'BK010', guestName: 'MEENA', createdAt: 'x', status: 'completed' }]
    );
    assert.equal(next.bookings[0].customerPhoto, 'data:image/jpeg;base64,MMM', 'photo kept when the stay is unchanged');
    assert.equal(next.bookings[0].status, 'completed', 'cloud fields win');
});

test('room changes from the cloud apply only to changed rooms', () => {
    const rooms = [{ id: 101, status: 'available', price: 2500 }, { id: 102, status: 'available', price: 2500 }];
    applyRoomChanges(rooms, [{ type: 'modified', id: '101', data: { id: 101, status: 'cleaning', price: 3000 } }]);
    assert.equal(rooms[0].status, 'cleaning');
    assert.equal(rooms[0].price, 3000);
    assert.equal(rooms[1].status, 'available');
});

test('diary changes add and remove entries', () => {
    const diary = {};
    applyDiaryChanges(diary, [{ type: 'added', data: { date: '2026-09-30', roomId: 101, guestName: 'ANU' } }]);
    assert.equal(diary['2026-09-30'][101], 'ANU');
    applyDiaryChanges(diary, [{ type: 'removed', data: { date: '2026-09-30', roomId: 101 } }]);
    assert.equal(diary['2026-09-30'][101], undefined);
});
