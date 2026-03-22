with open('d:/PROGRAM/LODGE ADMIN/script.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_hook = "function openWhatsAppMessage(pfunction syncBookingToFirebase(booking) {"
end_hook = "function downloadDailyRevenue() {"

start_idx = text.find(start_hook)
end_idx = text.find(end_hook)

if start_idx != -1 and end_idx != -1:
    correct_block = """function openWhatsAppMessage(phone, message) {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function parseBookingDateTime(dateValue, displayTime) {
    if (!dateValue || !displayTime) return null;

    const timeMatch = /^([0-9]{1,2}):([0-9]{2})\\s?(AM|PM)$/i.exec(displayTime.trim());
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const bookingDate = new Date(dateValue);
    if (Number.isNaN(bookingDate.getTime())) return null;

    bookingDate.setHours(hours, minutes, 0, 0);
    return bookingDate;
}

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
        firebaseEnabled = true;
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        firebaseEnabled = false;
    }
}

function syncAllBookingsToFirebase() {
    if (!firebaseEnabled || !firebaseDb) return;

    data.bookings.forEach(booking => {
        syncBookingToFirebase(booking);
    });
}

function syncBookingToFirebase(booking) {
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
}

function syncAllCustomersToFirebase() {
    if (!firebaseEnabled || !firebaseDb) return;
    data.customers.forEach(customer => {
        syncCustomerToFirebase(customer);
    });
}

function syncCustomerToFirebase(customer) {
    if (!firebaseEnabled || !firebaseDb || !customer || !customer.id) return;

    const cloudCustomer = {};
    for (const key in customer) {
        if (customer[key] !== undefined) {
            cloudCustomer[key] = customer[key];
        }
    }
    
    cloudCustomer.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    firebaseDb
        .collection('customers')
        .doc(String(customer.id))
        .set(cloudCustomer, { merge: true })
        .catch(error => {
            console.warn(`Failed to sync customer ${customer.id} to Firebase:`, error);
        });
}

"""
    text = text[:start_idx] + correct_block + text[end_idx:]
    with open('d:/PROGRAM/LODGE ADMIN/script.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Script successfully rewritten.")
else:
    print("Hooks not found. Start:", start_idx, "End:", end_idx)
