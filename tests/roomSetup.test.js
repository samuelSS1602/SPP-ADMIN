import test from 'node:test';
import assert from 'node:assert/strict';
import { data, ROOM_TEMPLATE } from '../src/store/store.js';
import { enforceRequestedRoomSetup } from '../src/store/migrations.js';
import { DIARY_FLOORS } from '../src/services/diary.js';

test('the lodge has exactly nine rooms: five on floor 1, four on floor 2', () => {
    assert.equal(ROOM_TEMPLATE.length, 9);
    assert.equal(new Set(ROOM_TEMPLATE.map(room => room.id)).size, 9);
    assert.equal(new Set(ROOM_TEMPLATE.map(room => room.name)).size, 9);
    assert.equal(ROOM_TEMPLATE.filter(room => room.floor === 1).length, 5);
    assert.equal(ROOM_TEMPLATE.filter(room => room.floor === 2).length, 4);
});

test('the room diary lists the same nine rooms', () => {
    const diaryRooms = DIARY_FLOORS.flatMap(floor => floor.rooms);
    assert.deepEqual(diaryRooms, ROOM_TEMPLATE.map(room => [room.id, room.name]));
});

test('rooms from an old cache or backup are trimmed to the nine, keeping price and status', () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
        data.bookings = [];
        data.customers = [];
        data.rooms = [
            ...ROOM_TEMPLATE.map(room => ({ ...room, name: 'old-name', price: 2500, status: 'available' })),
            { id: 205, name: 'F2-205', floor: 2, type: 'family', capacity: 3, price: 3000, status: 'available' }
        ];
        data.rooms[0].price = 1800;
        data.rooms[1].status = 'maintenance';

        enforceRequestedRoomSetup();

        assert.deepEqual(data.rooms.map(room => room.id), ROOM_TEMPLATE.map(room => room.id));
        assert.deepEqual(data.rooms.map(room => room.name), ROOM_TEMPLATE.map(room => room.name));
        assert.equal(data.rooms[0].price, 1800);
        assert.equal(data.rooms[1].status, 'maintenance');
    } finally {
        console.warn = warn;
    }
});
