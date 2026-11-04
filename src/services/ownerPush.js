import { fb } from '../firebase/client.js';

/**
 * Asks the /api/notify-booking function (api/notify-booking.js) to push "new booking" to the
 * owner's phone, even when the mobile app is closed. Best effort: failures are only logged.
 */
export async function notifyOwnerOfBooking(bookingId) {
    try {
        const user = fb.auth && fb.auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const response = await fetch('/api/notify-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ bookingId })
        });
        if (!response.ok) console.warn('Owner push failed:', response.status, await response.text());
    } catch (error) {
        console.warn('Owner push failed:', error);
    }
}
