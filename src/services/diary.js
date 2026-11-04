import { data, ROOM_TEMPLATE } from '../store/store.js';
import { commit } from '../store/persistence.js';
import { syncDiaryEntryToFirebase } from '../firebase/sync.js';

// Floors and labels exactly as on the paper diary (template order)
export const DIARY_FLOORS = [1, 2].map(floor => ({
    title: `Floor ${floor}`,
    rooms: ROOM_TEMPLATE.filter(room => room.floor === floor).map(room => [room.id, room.name])
}));

export function getDiaryEntries(date) {
    return (data.diary && data.diary[date]) || {};
}

export function saveDiaryRoom(date, roomId, guestName) {
    if (!date) return;
    if (!data.diary) data.diary = {};
    if (!data.diary[date]) data.diary[date] = {};
    // Blur fires even when nothing changed; skip those writes
    if ((data.diary[date][roomId] || '') === guestName) return;
    data.diary[date][roomId] = guestName;
    commit();
    syncDiaryEntryToFirebase(date, roomId, guestName);
}
