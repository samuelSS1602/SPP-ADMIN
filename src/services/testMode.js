import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { fb, isCloudReady } from '../firebase/client.js';
import { cloudPath, dataScope, SANDBOX_COLLECTIONS, setTestScope } from '../firebase/dataScope.js';
import { startRealtimeSync, stopRealtimeSync } from '../firebase/realtime.js';
import { notify, resetDataToDefaults, session } from '../store/store.js';
import { hydrateDataFromStorage, hydrateFullDataFromIndexedDB, saveDataToStorage } from '../store/persistence.js';
import { clearTestPhotosFromLocal } from '../store/indexedDb.js';
import { correctMistakenBookingStatuses, enforceRequestedRoomSetup } from '../store/migrations.js';
import { seedConsoleDefaults } from './settings.js';

/** Replaces the in-memory dataset with this browser's cached copy of live or test data. */
export async function loadDataScope(test) {
    setTestScope(test);
    resetDataToDefaults();
    hydrateDataFromStorage();
    await hydrateFullDataFromIndexedDB();
    correctMistakenBookingStatuses();
    enforceRequestedRoomSetup();
    seedConsoleDefaults();
}

/** Owner only: look at the testers' sandbox (true) or go back to the live lodge (false). */
export async function setOwnerTestView(on) {
    if (session.role !== 'owner' || Boolean(on) === dataScope.test) return;
    stopRealtimeSync();
    await loadDataScope(on);
    await startRealtimeSync();
    notify();
}

/** Deletes every test booking, room status, photo, diary entry and log. Live data is never touched. */
export async function resetTestData() {
    if (!dataScope.test || !isCloudReady()) return false;
    if (!confirm('Delete ALL test bookings, photos, room statuses, diary entries and logs?\n\nLive lodge data is not affected.')) return false;

    stopRealtimeSync();
    try {
        for (const name of SANDBOX_COLLECTIONS) {
            const snapshot = await getDocs(collection(fb.db, cloudPath(name)));
            for (let start = 0; start < snapshot.docs.length; start += 400) {
                const batch = writeBatch(fb.db);
                snapshot.docs.slice(start, start + 400).forEach(item => batch.delete(item.ref));
                await batch.commit();
            }
        }
        await clearTestPhotosFromLocal();
        resetDataToDefaults();
        enforceRequestedRoomSetup();
        seedConsoleDefaults();
        saveDataToStorage();
        alert('Test data cleared. You are starting with an empty test lodge.');
        return true;
    } catch (error) {
        alert(`Could not clear all test data: ${error.message || error}`);
        return false;
    } finally {
        await startRealtimeSync();
        notify();
    }
}
