import { data, DEFAULT_SETTINGS, notify } from './store.js';
import { loadFullDataFromIndexedDB, saveFullDataToIndexedDB } from './indexedDb.js';

const LOCAL_STORAGE_KEY = 'lodgeAdminData';

export function stripPhotoDataForLocalCache(record) {
    if (!record || typeof record !== 'object') return record;
    const copy = { ...record };
    Object.keys(copy).forEach(key => {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey.includes('photo') || normalizedKey.includes('image')) delete copy[key];
    });
    return copy;
}

function buildLocalStorageSnapshot() {
    return {
        rooms: data.rooms,
        bookings: data.bookings.map(stripPhotoDataForLocalCache),
        customers: data.customers.map(stripPhotoDataForLocalCache),
        guests: data.guests.map(stripPhotoDataForLocalCache),
        diary: data.diary,
        staff: data.staff,
        housekeepingTasks: data.housekeepingTasks,
        notifications: data.notifications,
        settings: data.settings,
        auditLogs: data.auditLogs
    };
}

// Only clears diary entries older than 90 days; active bookings and customers are kept.
function cleanupStorageData() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let removed = 0;
    Object.keys(data.diary).forEach(date => {
        if (date < ninetyDaysAgo) {
            delete data.diary[date];
            removed++;
        }
    });
    if (removed > 0) console.warn(`Removed ${removed} old diary entries`);
}

export function saveDataToStorage() {
    // IndexedDB stores the complete dataset, including verification photos.
    saveFullDataToIndexedDB(data);

    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(buildLocalStorageSnapshot()));
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('localStorage quota exceeded, replacing cache with compact snapshot...');
            cleanupStorageData();
            try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(buildLocalStorageSnapshot()));
            } catch (retryError) {
                console.error('Failed to save compact local cache:', retryError);
            }
        } else {
            console.warn('Could not save data:', error);
        }
    }
}

// Save locally and re-render
export function commit() {
    saveDataToStorage();
    notify();
}

export function hydrateDataFromStorage() {
    try {
        const storedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!storedRaw) return;
        const sData = JSON.parse(storedRaw);
        if (!sData || typeof sData !== 'object') return;

        if (Array.isArray(sData.rooms)) data.rooms = sData.rooms;
        if (Array.isArray(sData.bookings)) data.bookings = sData.bookings;
        if (Array.isArray(sData.customers)) data.customers = sData.customers;
        data.guests = sData.guests || [];
        data.diary = sData.diary || {};
        data.staff = sData.staff || [];
        data.housekeepingTasks = sData.housekeepingTasks || [];
        data.notifications = sData.notifications || [];
        data.settings = sData.settings || { ...DEFAULT_SETTINGS };
        data.auditLogs = sData.auditLogs || [];
    } catch (e) {
        console.error('Failed to parse stored data:', e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
}

export async function hydrateFullDataFromIndexedDB() {
    const stored = await loadFullDataFromIndexedDB();
    if (!stored) return false;
    Object.keys(data).forEach(key => {
        if (stored[key] !== undefined) data[key] = stored[key];
    });
    console.log('Full data hydrated from IndexedDB');
    return true;
}

export function keepLocalOnlyBookingsAside(localOnly) {
    try {
        localStorage.setItem('lodgeAdminLocalOnlyBookings', JSON.stringify(localOnly.map(stripPhotoDataForLocalCache)));
    } catch (error) {
        console.warn('Could not keep local-only bookings:', error);
    }
}
