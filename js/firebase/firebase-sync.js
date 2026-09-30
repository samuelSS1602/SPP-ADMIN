
function initFirebaseServices() {
    if (typeof firebase === 'undefined') {
        return;
    }

    if (!window.firebaseConfig || !window.firebaseConfig.apiKey) {
        console.info('Firebase config not provided. Running in local mode.');
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }

        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        if (typeof firebase.storage !== 'undefined') {
            firebaseStorage = firebase.storage();
        }
        firebaseEnabled = true;
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        firebaseEnabled = false;
    }
}

async function syncBookingToFirebase(booking) {
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
}
