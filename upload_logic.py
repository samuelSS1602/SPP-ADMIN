with open('d:/PROGRAM/LODGE ADMIN/script.js', 'r', encoding='utf-8') as f:
    script_content = f.read()

# 1. Add firebaseStorage global
if 'let firebaseStorage = null;' not in script_content:
    script_content = script_content.replace('let firebaseDb = null;', 'let firebaseDb = null;\nlet firebaseStorage = null;')

# 2. Init firebaseStorage
if 'firebaseStorage = firebase.storage();' not in script_content:
    script_content = script_content.replace('firebaseDb = firebase.firestore();', 'firebaseDb = firebase.firestore();\n        if (typeof firebase.storage !== \'undefined\') {\n            firebaseStorage = firebase.storage();\n        }')

# 3. Add uploadBase64ToStorage helper
if 'async function uploadBase64ToStorage' not in script_content:
    helper = """
async function uploadBase64ToStorage(base64Data, path) {
    if (!firebaseEnabled || !firebaseStorage || !base64Data) return null;
    try {
        const fetchResponse = await fetch(base64Data);
        const blob = await fetchResponse.blob();
        const storageRef = firebaseStorage.ref().child(path);
        await storageRef.put(blob);
        return await storageRef.getDownloadURL();
    } catch(err) {
        console.error("Storage upload failed for", path, err);
        return null;
    }
}
"""
    script_content = script_content + helper

# 4. Rewrite syncBookingToFirebase
old_sync = """function syncBookingToFirebase(booking) {
    if (!firebaseEnabled || !firebaseDb || !booking || !booking.id) return;

    const cloudBooking = {};
    for (const key in booking) {
        if (booking[key] !== undefined) {
            cloudBooking[key] = booking[key];
        }
    }
    
    if (cloudBooking.customerPhoto !== undefined) {
        cloudBooking.hasCustomerPhoto = Boolean(cloudBooking.customerPhoto);
    }
    if (cloudBooking.idProofPhoto !== undefined) {
        cloudBooking.hasIdProofPhoto = Boolean(cloudBooking.idProofPhoto);
    }
    
    cloudBooking.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    firebaseDb
        .collection('bookings')
        .doc(String(booking.id))
        .set(cloudBooking, { merge: true })
        .catch(error => {
            console.warn(`Failed to sync booking ${booking.id} to Firebase:`, error);
        });
}"""

new_sync = """async function syncBookingToFirebase(booking) {
    if (!firebaseEnabled || !firebaseDb || !booking || !booking.id) return;

    let needsLocalSave = false;

    if (booking.customerPhoto && booking.customerPhoto.startsWith('data:image')) {
        if (!booking.customerPhotoUrl) {
            const url = await uploadBase64ToStorage(booking.customerPhoto, `bookings/${booking.id}/customer.jpg`);
            if (url) {
                booking.customerPhotoUrl = url;
                needsLocalSave = true;
            }
        }
    }

    if (booking.idProofPhoto && booking.idProofPhoto.startsWith('data:image')) {
        if (!booking.idProofPhotoUrl) {
            const url = await uploadBase64ToStorage(booking.idProofPhoto, `bookings/${booking.id}/idproof.jpg`);
            if (url) {
                booking.idProofPhotoUrl = url;
                needsLocalSave = true;
            }
        }
    }

    if (needsLocalSave) {
        saveDataToStorage();
    }

    const cloudBooking = {};
    for (const key in booking) {
        if (key === 'customerPhoto' || key === 'idProofPhoto') continue;
        if (booking[key] !== undefined) {
            cloudBooking[key] = booking[key];
        }
    }
    
    if (booking.customerPhotoUrl || booking.customerPhoto) {
        cloudBooking.hasCustomerPhoto = true;
    }
    if (booking.idProofPhotoUrl || booking.idProofPhoto) {
        cloudBooking.hasIdProofPhoto = true;
    }
    
    cloudBooking.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    firebaseDb
        .collection('bookings')
        .doc(String(booking.id))
        .set(cloudBooking, { merge: true })
        .catch(error => {
            console.warn(`Failed to sync booking ${booking.id} to Firebase:`, error);
        });
}"""

script_content = script_content.replace(old_sync, new_sync)

with open('d:/PROGRAM/LODGE ADMIN/script.js', 'w', encoding='utf-8') as f:
    f.write(script_content)

# ----------------- BOOKING.JS -----------------
with open('d:/PROGRAM/LODGE ADMIN/booking.js', 'r', encoding='utf-8') as f:
    booking_content = f.read()

# 1. Update loadBookings table row
old_td = """<td><button class="btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="showReceipt('${booking.id}')"><i class="fas fa-receipt"></i></button></td><td>${checkoutButton}</td>"""
new_td = """<td>
            <button class="btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="showReceipt('${booking.id}')" title="Receipt"><i class="fas fa-receipt"></i></button>
            ${(booking.customerPhoto || booking.customerPhotoUrl) ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 11px; background:#4F46E5; margin-left:4px;" onclick="viewBookingPhotos('${booking.id}')" title="Photos"><i class="fas fa-camera"></i></button>` : ''}
        </td>
        <td>${checkoutButton}</td>"""

booking_content = booking_content.replace(old_td, new_td)

# 2. Add viewBookingPhotos
if 'function viewBookingPhotos' not in booking_content:
    photo_logic = """
function viewBookingPhotos(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('photoViewerModal');
    const customerImg = document.getElementById('viewerCustomerPhoto');
    const idProofImg = document.getElementById('viewerIdProofPhoto');
    const customerStatus = document.getElementById('viewerCustomerPhotoStatus');
    const idProofStatus = document.getElementById('viewerIdProofPhotoStatus');

    modal.style.display = 'flex';

    if (booking.customerPhotoUrl || booking.customerPhoto) {
        customerImg.src = booking.customerPhotoUrl || booking.customerPhoto;
        customerImg.style.display = 'block';
        customerStatus.style.display = 'none';
    } else {
        customerImg.src = '';
        customerImg.style.display = 'none';
        customerStatus.style.display = 'block';
    }

    if (booking.idProofPhotoUrl || booking.idProofPhoto) {
        idProofImg.src = booking.idProofPhotoUrl || booking.idProofPhoto;
        idProofImg.style.display = 'block';
        idProofStatus.style.display = 'none';
    } else {
        idProofImg.src = '';
        idProofImg.style.display = 'none';
        idProofStatus.style.display = 'block';
    }
}
"""
    booking_content = booking_content + photo_logic

with open('d:/PROGRAM/LODGE ADMIN/booking.js', 'w', encoding='utf-8') as f:
    f.write(booking_content)

print("Successfully injected Storage logic.")
