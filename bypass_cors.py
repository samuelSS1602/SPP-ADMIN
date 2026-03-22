with open('d:/PROGRAM/LODGE ADMIN/script.js', 'r', encoding='utf-8') as f:
    script_content = f.read()

# Replace the syncing logic to use a secondary Firestore collection instead of Firebase Storage
old_sync = """async function syncBookingToFirebase(booking) {
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

new_sync = """async function syncBookingToFirebase(booking) {
    if (!firebaseEnabled || !firebaseDb || !booking || !booking.id) return;

    // To avoid CORS issues with Firebase Storage on localhost, 
    // we save massive base64 image strings into a separate Firestore collection.
    if ((booking.customerPhoto && booking.customerPhoto.startsWith('data:image')) || 
        (booking.idProofPhoto && booking.idProofPhoto.startsWith('data:image'))) {
        
        firebaseDb.collection('booking_photos').doc(String(booking.id)).set({
            customerPhoto: booking.customerPhoto || null,
            idProofPhoto: booking.idProofPhoto || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(err => console.warn('Photo sync failed:', err));
    }

    const cloudBooking = {};
    for (const key in booking) {
        if (key === 'customerPhoto' || key === 'idProofPhoto') continue;
        if (booking[key] !== undefined) {
            cloudBooking[key] = booking[key];
        }
    }
    
    if (booking.customerPhoto || booking.customerPhotoUrl) {
        cloudBooking.hasCustomerPhoto = true;
    }
    if (booking.idProofPhoto || booking.idProofPhotoUrl) {
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

# Booking.js logic for photo viewing
with open('d:/PROGRAM/LODGE ADMIN/booking.js', 'r', encoding='utf-8') as f:
    booking_content = f.read()

old_photo_logic = """function viewBookingPhotos(bookingId) {
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
}"""

new_photo_logic = """async function viewBookingPhotos(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('photoViewerModal');
    const customerImg = document.getElementById('viewerCustomerPhoto');
    const idProofImg = document.getElementById('viewerIdProofPhoto');
    const customerStatus = document.getElementById('viewerCustomerPhotoStatus');
    const idProofStatus = document.getElementById('viewerIdProofPhotoStatus');

    modal.style.display = 'flex';
    customerStatus.textContent = "Loading cloud photos...";
    idProofStatus.textContent = "Loading cloud photos...";
    
    let localCustomer = booking.customerPhotoUrl || booking.customerPhoto;
    let localIdProof = booking.idProofPhotoUrl || booking.idProofPhoto;

    // Fetch from Firestore collection if not cached locally
    if (!localCustomer || !localIdProof) {
        try {
            if (typeof firebaseDb !== 'undefined' && firebaseDb) {
                const doc = await firebaseDb.collection('booking_photos').doc(String(bookingId)).get();
                if (doc.exists) {
                    const picData = doc.data();
                    if (picData.customerPhoto && !localCustomer) localCustomer = picData.customerPhoto;
                    if (picData.idProofPhoto && !localIdProof) localIdProof = picData.idProofPhoto;
                }
            }
        } catch(e) {
            console.warn("Could not fetch remote photos: ", e);
        }
    }

    if (localCustomer) {
        customerImg.src = localCustomer;
        customerImg.style.display = 'block';
        customerStatus.style.display = 'none';
    } else {
        customerImg.src = '';
        customerImg.style.display = 'none';
        customerStatus.textContent = "Not Available";
        customerStatus.style.display = 'block';
    }

    if (localIdProof) {
        idProofImg.src = localIdProof;
        idProofImg.style.display = 'block';
        idProofStatus.style.display = 'none';
    } else {
        idProofImg.src = '';
        idProofImg.style.display = 'none';
        idProofStatus.textContent = "Not Available";
        idProofStatus.style.display = 'block';
    }
}"""

booking_content = booking_content.replace(old_photo_logic, new_photo_logic)

with open('d:/PROGRAM/LODGE ADMIN/booking.js', 'w', encoding='utf-8') as f:
    f.write(booking_content)

print("Applied Firestore-based photo storage hack to bypass Localhost CORS.")
