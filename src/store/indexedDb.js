// Persistent local storage for booking photos and the full dataset (avoids the localStorage 5MB limit).
// Database name, version and store names are unchanged so caches from the previous app are reused.
const PHOTO_DATABASE_NAME = 'LodgeAdminPhotos';
const PHOTO_DATABASE_VERSION = 2;
const PHOTO_OBJECT_STORE_NAME = 'booking_photos';
const APP_DATA_STORE_NAME = 'application_data';

function openPhotoDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PHOTO_DATABASE_NAME, PHOTO_DATABASE_VERSION);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PHOTO_OBJECT_STORE_NAME)) {
                db.createObjectStore(PHOTO_OBJECT_STORE_NAME, { keyPath: 'bookingId' });
            }
            if (!db.objectStoreNames.contains(APP_DATA_STORE_NAME)) {
                db.createObjectStore(APP_DATA_STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => {
            console.warn('IndexedDB open failed:', event.target.error);
            reject(event.target.error);
        };
    });
}

export async function saveFullDataToIndexedDB(snapshot) {
    try {
        const db = await openPhotoDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(APP_DATA_STORE_NAME, 'readwrite');
            tx.objectStore(APP_DATA_STORE_NAME).put({ id: 'current', data: snapshot, updatedAt: new Date().toISOString() });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (error) {
        console.warn('Full data IndexedDB save failed:', error);
    }
}

export async function loadFullDataFromIndexedDB() {
    try {
        const db = await openPhotoDB();
        const stored = await new Promise((resolve, reject) => {
            const tx = db.transaction(APP_DATA_STORE_NAME, 'readonly');
            const request = tx.objectStore(APP_DATA_STORE_NAME).get('current');
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
        db.close();
        return stored && stored.data ? stored.data : null;
    } catch (error) {
        console.warn('Full data IndexedDB hydration failed:', error);
        return null;
    }
}

export async function savePhotoToLocal(bookingId, customerPhoto, idProofPhoto) {
    try {
        const db = await openPhotoDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_OBJECT_STORE_NAME, 'readwrite');
            const request = tx.objectStore(PHOTO_OBJECT_STORE_NAME).put({
                bookingId: String(bookingId),
                customerPhoto: customerPhoto || null,
                idProofPhoto: idProofPhoto || null,
                updatedAt: new Date().toISOString()
            });
            request.onsuccess = () => resolve(true);
            request.onerror = e => {
                console.warn('IndexedDB save failed:', e.target.error);
                reject(e.target.error);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('savePhotoToLocal error:', err);
        return false;
    }
}

export async function getPhotoFromLocal(bookingId) {
    try {
        const db = await openPhotoDB();
        return new Promise(resolve => {
            const tx = db.transaction(PHOTO_OBJECT_STORE_NAME, 'readonly');
            const request = tx.objectStore(PHOTO_OBJECT_STORE_NAME).get(String(bookingId));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = e => {
                console.warn('IndexedDB get failed:', e.target.error);
                resolve(null);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('getPhotoFromLocal error:', err);
        return null;
    }
}

export async function deletePhotoFromLocal(bookingId) {
    try {
        const db = await openPhotoDB();
        return new Promise(resolve => {
            const tx = db.transaction(PHOTO_OBJECT_STORE_NAME, 'readwrite');
            const request = tx.objectStore(PHOTO_OBJECT_STORE_NAME).delete(String(bookingId));
            request.onsuccess = () => resolve(true);
            request.onerror = e => {
                console.warn('IndexedDB delete failed:', e.target.error);
                resolve(false);
            };
            tx.oncomplete = () => db.close();
        });
    } catch (err) {
        console.warn('deletePhotoFromLocal error:', err);
        return false;
    }
}

export async function migratePhotoInLocal(oldBookingId, newBookingId) {
    try {
        const existing = await getPhotoFromLocal(oldBookingId);
        if (existing) {
            await savePhotoToLocal(newBookingId, existing.customerPhoto, existing.idProofPhoto);
            await deletePhotoFromLocal(oldBookingId);
        }
    } catch (err) {
        console.warn(`migratePhotoInLocal(${oldBookingId} → ${newBookingId}) error:`, err);
    }
}
