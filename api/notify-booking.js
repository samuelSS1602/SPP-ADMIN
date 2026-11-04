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

// The testing login's bookings live in the sandbox (src/firebase/dataScope.js); keep these in step.
const TESTER_EMAILS = ['spp1@gmail.com'];
const SANDBOX_ROOT = 'sandbox/test/';

class ConfigError extends Error {}

/** Reads the service-account key from the env var, tolerating the usual copy-paste variations. */
function serviceAccountFromEnv() {
    let raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').replace(/^﻿/, '').trim();
    if (!raw) throw new ConfigError('FIREBASE_SERVICE_ACCOUNT is not set on Vercel.');
    let account;
    try {
        account = JSON.parse(raw);
        if (typeof account === 'string') account = JSON.parse(account); // pasted with extra quotes
    } catch {
        // Never echo the value: it contains the private key.
        throw new ConfigError('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole downloaded key file, from { to }.');
    }
    const missing = ['project_id', 'client_email', 'private_key'].filter(key => !account || !account[key]);
    if (missing.length) throw new ConfigError(`FIREBASE_SERVICE_ACCOUNT is missing: ${missing.join(', ')}.`);
    account.private_key = account.private_key.replace(/\\n/g, '\n');
    return account;
}

function firebaseApp() {
    if (getApps().length) return getApps()[0];
    const account = serviceAccountFromEnv();
    try {
        return initializeApp({ credential: cert(account) });
    } catch (error) {
        throw new ConfigError(`The service-account key was rejected: ${error.message}`);
    }
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
    try {
        return await notifyOwner(req, res);
    } catch (error) {
        if (error instanceof ConfigError) return res.status(500).json({ error: error.message });
        console.error('notify-booking failed:', error);
        return res.status(500).json({ error: `Push failed: ${error.message || error}` });
    }
}

async function notifyOwner(req, res) {
    const app = firebaseApp();

    // Only signed-in console staff may trigger a notification.
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    let caller;
    try {
        if (!idToken) throw new Error('missing token');
        caller = await getAuth(app).verifyIdToken(idToken);
    } catch {
        return res.status(401).json({ error: 'Sign in required.' });
    }
    // A booking made by the testing login lives in the sandbox and is announced as a test.
    const isTest = TESTER_EMAILS.includes(String(caller.email || '').toLowerCase());
    const bookings = (isTest ? SANDBOX_ROOT : '') + 'bookings';

    let body = req.body || {};
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body || '{}');
        } catch {
            return res.status(400).json({ error: 'Body must be JSON.' });
        }
    }
    const bookingId = String(body.bookingId || '').trim();
    if (!bookingId || bookingId.includes('/')) return res.status(400).json({ error: 'bookingId is required.' });

    // The text comes from the stored booking, never from the caller. The write may still be landing, so retry briefly.
    const db = getFirestore(app);
    let booking = null;
    for (let attempt = 0; attempt < 4 && !booking; attempt++) {
        if (attempt > 0) await sleep(750);
        const snap = await db.collection(bookings).doc(bookingId).get();
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
        await db.collection('push_log').doc(`${isTest ? 'test|' : ''}${bookingId}|${booking.createdAt}`).create({ bookingId, test: isTest, sentAt: new Date().toISOString() });
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
            title: `${isTest ? '🧪 TEST booking' : 'New booking'} ${bookingId}`,
            body: [booking.guestName, rooms && `Room ${rooms}`, checkIn && `Check-in ${checkIn}`].filter(Boolean).join(' · ')
        },
        data: { bookingId, test: String(isTest) },
        android: {
            priority: 'high',
            // Same channel and tag the app uses for its own alert, so the phone shows the booking once.
            // Test and live bookings can share an id, so their tags differ.
            notification: { channelId: 'new_bookings', tag: `booking-${isTest ? 'test-' : ''}${bookingId}`, icon: 'ic_stat_booking', color: '#0F3B33' }
        }
    });

    // Forget phones that uninstalled the app or whose token expired.
    const stale = result.responses
        .map((response, index) => (!response.success && STALE_TOKEN_ERRORS.has(response.error?.code) ? tokens[index] : null))
        .filter(Boolean);
    await Promise.all(stale.map(token => db.collection('owner_devices').doc(token).delete().catch(() => {})));

    return res.status(200).json({ sent: result.successCount, failed: result.failureCount });
}
