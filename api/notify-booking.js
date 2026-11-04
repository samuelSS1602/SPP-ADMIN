import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// POST /api/notify-booking  { bookingId }   Authorization: Bearer <Firebase ID token>
//
// Sends the owner a "new booking" push notification (Firebase Cloud Messaging) on every phone
// registered in `owner_devices`. Called by the web console and the mobile app right after a
// receptionist creates a booking. Runs free on Vercel; FCM is free on the Spark plan.
//
// Needs the env var FIREBASE_SERVICE_ACCOUNT = the service-account key JSON of the adminlodge
// project (Firebase Console > Project settings > Service accounts > Generate new private key).

const MAX_BOOKING_AGE_MS = 15 * 60 * 1000;
const STALE_TOKEN_ERRORS = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument'
]);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function firebaseApp() {
    if (getApps().length) return getApps()[0];
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    return initializeApp({ credential: cert(JSON.parse(raw)) });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function shortDate(iso) {
    const [year, month, day] = String(iso || '').split('-').map(Number);
    if (!year || !month || !day) return '';
    return `${day} ${MONTHS[month - 1]}`;
}

function roomsLabel(booking) {
    if (Array.isArray(booking.rooms) && booking.rooms.length) return booking.rooms.map(room => room.roomName).join(', ');
    return booking.roomName || '';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Use POST.' });
    }

    const app = firebaseApp();
    if (!app) return res.status(500).json({ error: 'Push is not configured (FIREBASE_SERVICE_ACCOUNT missing).' });

    // Only signed-in console staff may trigger a notification.
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    try {
        if (!idToken) throw new Error('missing token');
        await getAuth(app).verifyIdToken(idToken);
    } catch {
        return res.status(401).json({ error: 'Sign in required.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const bookingId = String(body.bookingId || '').trim();
    if (!bookingId || bookingId.includes('/')) return res.status(400).json({ error: 'bookingId is required.' });

    // The text comes from the stored booking, never from the caller. The write may still be landing, so retry briefly.
    const db = getFirestore(app);
    let booking = null;
    for (let attempt = 0; attempt < 4 && !booking; attempt++) {
        if (attempt > 0) await sleep(750);
        const snap = await db.collection('bookings').doc(bookingId).get();
        if (snap.exists) booking = snap.data();
    }
    if (!booking) return res.status(404).json({ error: `Booking ${bookingId} not found.` });

    // Only fresh bookings: replaying an old request can't spam the owner.
    const createdAt = Date.parse(booking.createdAt);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > MAX_BOOKING_AGE_MS) {
        return res.status(200).json({ sent: 0, skipped: 'not a new booking' });
    }

    // One push per booking even if both apps (or a retry) ask. Booking ids are reused after a
    // delete and renumber, so the creation time is part of the key.
    try {
        await db.collection('push_log').doc(`${bookingId}|${booking.createdAt}`).create({ bookingId, sentAt: new Date().toISOString() });
    } catch (error) {
        if (error.code === 6 /* ALREADY_EXISTS */) return res.status(200).json({ sent: 0, skipped: 'already sent' });
        throw error;
    }

    const devices = await db.collection('owner_devices').get();
    const tokens = devices.docs.map(doc => doc.id);
    if (!tokens.length) return res.status(200).json({ sent: 0, skipped: 'no owner devices registered' });

    const rooms = roomsLabel(booking);
    const checkIn = shortDate(booking.checkIn);
    const result = await getMessaging(app).sendEachForMulticast({
        tokens,
        notification: {
            title: `New booking ${bookingId}`,
            body: [booking.guestName, rooms && `Room ${rooms}`, checkIn && `Check-in ${checkIn}`].filter(Boolean).join(' · ')
        },
        data: { bookingId },
        android: {
            priority: 'high',
            // Same channel and tag the app uses for its own alert, so the phone shows the booking once.
            notification: { channelId: 'new_bookings', tag: `booking-${bookingId}`, icon: 'ic_stat_booking', color: '#0F3B33' }
        }
    });

    // Forget phones that uninstalled the app or whose token expired.
    const stale = result.responses
        .map((response, index) => (!response.success && STALE_TOKEN_ERRORS.has(response.error?.code) ? tokens[index] : null))
        .filter(Boolean);
    await Promise.all(stale.map(token => db.collection('owner_devices').doc(token).delete().catch(() => {})));

    return res.status(200).json({ sent: result.successCount, failed: result.failureCount });
}
