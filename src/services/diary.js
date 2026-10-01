import { data } from '../store/store.js';
import { commit } from '../store/persistence.js';
import { syncDiaryEntryToFirebase } from '../firebase/sync.js';

// Floors and labels exactly as on the paper diary
export const DIARY_FLOORS = [
    { title: 'Floor 1', rooms: [[101, 'F1-102'], [102, 'F1-103'], [103, 'F1-104'], [104, 'F1-105'], [105, 'F1-101']] },
    { title: 'Floor 2', rooms: [[201, 'F2-201'], [202, 'F2-202'], [203, 'F2-203'], [204, 'F2-204']] }
];

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
