import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { fb, isCloudReady } from './client.js';

// Booking documents and their photos live in separate collections:
//   bookings/{id}        — booking fields only (photos stripped, hasCustomerPhoto/hasIdProofPhoto flags)
//   booking_photos/{id}  — base64 customerPhoto / idProofPhoto
export async function syncBookingToFirebase(booking) {
    if (!isCloudReady() || !booking || !booking.id) return;

    if ((booking.customerPhoto && String(booking.customerPhoto).startsWith('data:image')) ||
        (booking.idProofPhoto && String(booking.idProofPhoto).startsWith('data:image'))) {
        setDoc(doc(fb.db, 'booking_photos', String(booking.id)), {
            customerPhoto: booking.customerPhoto || null,
            idProofPhoto: booking.idProofPhoto || null,
            updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => console.warn('Photo sync failed:', err));
    }

    const cloudBooking = {};
    for (const key in booking) {
        if (key === 'customerPhoto' || key === 'idProofPhoto') continue;
        // customerPhotoUrl / idProofPhotoUrl hold a locally cached copy of the booking_photos image.
        // Writing it here made every booking document hundreds of KB, too big for the app to download.
        if ((key === 'customerPhotoUrl' || key === 'idProofPhotoUrl') && String(booking[key]).startsWith('data:')) continue;
        if (booking[key] !== undefined) cloudBooking[key] = booking[key];
    }
    if (booking.customerPhoto || booking.customerPhotoUrl) cloudBooking.hasCustomerPhoto = true;
    if (booking.idProofPhoto || booking.idProofPhotoUrl) cloudBooking.hasIdProofPhoto = true;
    cloudBooking.updatedAt = serverTimestamp();

    return setDoc(doc(fb.db, 'bookings', String(booking.id)), cloudBooking, { merge: true })
        .catch(error => console.warn(`Failed to sync booking ${booking.id} to Firebase:`, error));
}

export function roomCloudDoc(room) {
    return {
        id: room.id,
        name: room.name,
        floor: room.floor,
        type: room.type,
        capacity: room.capacity,
        price: room.price,
        status: room.status,
        updatedAt: new Date().toISOString()
    };
}

export function syncRoomToFirebase(room) {
    if (!isCloudReady()) return Promise.resolve();
    return setDoc(doc(fb.db, 'rooms', String(room.id)), roomCloudDoc(room), { merge: true });
}

export function syncDiaryEntryToFirebase(date, roomId, guestName) {
    if (!isCloudReady()) return;
    setDoc(doc(fb.db, 'diaryReminder', `${date}_${roomId}`), {
        date,
        roomId,
        guestName,
        updatedAt: new Date().toISOString()
    }, { merge: true }).catch(e => console.warn('Could not sync diary reminder to Firebase:', e));
}

export async function getBookingPhotosDoc(bookingId) {
    if (!isCloudReady()) return null;
    const snap = await getDoc(doc(fb.db, 'booking_photos', String(bookingId)));
    return snap.exists() ? snap.data() : null;
}

export async function getAllBookingPhotoDocs() {
    const snap = await getDocs(collection(fb.db, 'booking_photos'));
    return snap.docs.map(item => ({ id: item.id, data: item.data() }));
}

export function setBookingPhotosDoc(bookingId, photoData, options) {
    return setDoc(doc(fb.db, 'booking_photos', String(bookingId)), photoData, options || {});
}

export function deleteBookingPhotosDoc(bookingId) {
    return deleteDoc(doc(fb.db, 'booking_photos', String(bookingId)));
}

export function deleteBookingDoc(bookingId) {
    return deleteDoc(doc(fb.db, 'bookings', String(bookingId)));
}
