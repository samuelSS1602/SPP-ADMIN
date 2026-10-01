import { data, findBooking } from '../store/store.js';
import { commit } from '../store/persistence.js';
import { getPhotoFromLocal, savePhotoToLocal } from '../store/indexedDb.js';
import { isCloudReady } from '../firebase/client.js';
import {
    deleteBookingPhotosDoc, getAllBookingPhotoDocs, getBookingPhotosDoc, setBookingPhotosDoc, syncBookingToFirebase
} from '../firebase/sync.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function readImageFile(file, { maxBytes } = {}) {
    return new Promise((resolve, reject) => {
        if (!file) { reject(new Error('No file')); return; }
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            reject(new Error('Not an image'));
            return;
        }
        if (maxBytes && file.size > maxBytes) {
            alert('Image is too large. Please select a file under 5MB.');
            reject(new Error('Too large'));
            return;
        }
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Priority: in-memory → IndexedDB (this device) → Firestore booking_photos (cloud)
export async function loadBookingPhotos(bookingId) {
    const booking = findBooking(bookingId);
    if (!booking) return { customerPhoto: null, idProofPhoto: null };

    let customerPhoto = booking.customerPhotoUrl || booking.customerPhoto;
    let idProofPhoto = booking.idProofPhotoUrl || booking.idProofPhoto;

    if (!customerPhoto || !idProofPhoto) {
        try {
            const local = await getPhotoFromLocal(bookingId);
            if (local) {
                if (local.customerPhoto && !customerPhoto) customerPhoto = local.customerPhoto;
                if (local.idProofPhoto && !idProofPhoto) idProofPhoto = local.idProofPhoto;
            }
        } catch (e) {
            console.warn('Could not fetch photos from IndexedDB:', e);
        }
    }

    if (!customerPhoto || !idProofPhoto) {
        try {
            const cloud = await getBookingPhotosDoc(bookingId);
            if (cloud) {
                if (cloud.customerPhoto && !customerPhoto) customerPhoto = cloud.customerPhoto;
                if (cloud.idProofPhoto && !idProofPhoto) idProofPhoto = cloud.idProofPhoto;
                // Cache cloud photos to IndexedDB for next time
                savePhotoToLocal(bookingId, customerPhoto || null, idProofPhoto || null)
                    .catch(err => console.warn('Failed to cache cloud photos to IndexedDB:', err));
            }
        } catch (e) {
            console.warn('Could not fetch remote photos: ', e);
        }
    }
    return { customerPhoto: customerPhoto || null, idProofPhoto: idProofPhoto || null };
}

// Replaces one verification photo of a booking ('customer' or 'idProof')
export async function replaceBookingPhoto(bookingId, kind, imageData) {
    const booking = findBooking(bookingId);
    if (!booking) {
        alert('Booking not found. Please refresh and try again.');
        return;
    }
    const isCustomer = kind === 'customer';
    if (isCustomer) {
        booking.customerPhoto = imageData;
        booking.customerPhotoUrl = imageData;
    } else {
        booking.idProofPhoto = imageData;
        booking.idProofPhotoUrl = imageData;
    }

    getPhotoFromLocal(bookingId).then(existing => {
        const customer = isCustomer ? imageData : (existing ? existing.customerPhoto : (booking.customerPhoto || null));
        const idProof = isCustomer ? (existing ? existing.idProofPhoto : (booking.idProofPhoto || null)) : imageData;
        savePhotoToLocal(bookingId, customer, idProof).catch(err => console.warn('IndexedDB save failed:', err));
    });
    commit();

    const label = isCustomer ? 'Customer photo' : 'ID proof photo';
    if (isCloudReady()) {
        try {
            await syncBookingToFirebase(booking);
            alert(`${label} updated successfully!`);
        } catch (err) {
            console.error('Error uploading photo:', err);
            alert('Photo updated but sync to cloud failed.');
        }
    } else {
        alert(`${label} updated successfully!`);
    }
}

// Fills booking.customerPhotoUrl / idProofPhotoUrl from the cloud for a guest's stays
export async function loadGuestStayPhotos(guestBookings) {
    for (const booking of guestBookings) {
        if ((!booking.customerPhotoUrl && !booking.customerPhoto) || (!booking.idProofPhotoUrl && !booking.idProofPhoto)) {
            try {
                const picData = await getBookingPhotosDoc(booking.id);
                if (picData) {
                    if (picData.customerPhoto && !booking.customerPhotoUrl && !booking.customerPhoto) booking.customerPhotoUrl = picData.customerPhoto;
                    if (picData.idProofPhoto && !booking.idProofPhotoUrl && !booking.idProofPhoto) booking.idProofPhotoUrl = picData.idProofPhoto;
                }
            } catch (e) {
                console.warn(`Could not fetch photos for booking ${booking.id}:`, e);
            }
        }
    }
}

// booking_photos documents with no matching booking (deleted or renumbered records)
export async function fetchOrphanedPhotos() {
    const bookingIds = new Set(data.bookings.map(b => b.id));
    return (await getAllBookingPhotoDocs())
        .filter(item => !bookingIds.has(item.id) && (item.data.customerPhoto || item.data.idProofPhoto));
}

export async function fetchAllPhotos() {
    return getAllBookingPhotoDocs();
}

export async function assignPhotoToBooking(orphanedId, targetBookingId) {
    if (!targetBookingId) {
        alert('Please select a booking to assign the photos to.');
        return false;
    }
    const targetBooking = findBooking(targetBookingId);
    if (!targetBooking) {
        alert('Selected booking not found.');
        return false;
    }
    if (!confirm(`Assign photos from ${orphanedId} to booking ${targetBooking.id} (${targetBooking.guestName})?`)) return false;

    try {
        const photoData = await getBookingPhotosDoc(orphanedId);
        if (!photoData) {
            alert('Orphaned photo no longer exists in database.');
            return false;
        }
        await setBookingPhotosDoc(targetBookingId, photoData, { merge: true });
        await deleteBookingPhotosDoc(orphanedId);

        if (photoData.customerPhoto) {
            targetBooking.hasCustomerPhoto = true;
            targetBooking.customerPhotoUrl = photoData.customerPhoto;
        }
        if (photoData.idProofPhoto) {
            targetBooking.hasIdProofPhoto = true;
            targetBooking.idProofPhotoUrl = photoData.idProofPhoto;
        }
        savePhotoToLocal(targetBookingId, photoData.customerPhoto || null, photoData.idProofPhoto || null)
            .catch(err => console.warn('IndexedDB save after assignment failed:', err));

        commit();
        syncBookingToFirebase(targetBooking);
        alert(`Successfully assigned photos to ${targetBooking.id}!`);
        return true;
    } catch (err) {
        console.error('Failed to assign photos:', err);
        alert('An error occurred while assigning photos. Please try again.');
        return false;
    }
}
