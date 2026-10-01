import { formatDateTime, formatNumber } from './format.js';
import { getBookingBalance, getBookingTotal } from './bookingCalc.js';

export const OWNER_WHATSAPP_PHONE = '919842816621';

export function normalizePhoneForWhatsApp(phoneNumber) {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return digits;
    return '';
}

export function openWhatsAppMessage(phone, message) {
    return window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

export function buildCheckInWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    const ciDateTime = booking.checkIn ? formatDateTime(booking.checkIn, booking.checkInTime || '12:00 PM') : 'N/A';
    const coDateTime = booking.checkOut ? formatDateTime(booking.checkOut, booking.checkOutTime || '11:00 AM') : 'N/A';

    return `Welcome to Sri Padmavati Pleasants, Palani 🙏
Guest Name: ${guestName}
Room: ${booking.roomName}
Check-In: ${ciDateTime}
Check-Out: ${coDateTime}

We wish you a comfortable stay. Need help? Call Reception.

ஸ்ரீ பத்மாவதி பிளஸன்ட்ஸ், பழனிக்கு வரவேற்கிறோம் 🙏
பயணிகள் பெயர்: ${guestName}
அறை: ${booking.roomName}
செக்-இன்: ${ciDateTime}
செக்-அவுட்: ${coDateTime}

உங்கள் வருகைக்கு நன்றி. உதவிக்கு ரிசப்ஷனைத் தொடர்புகொள்ளவும்.`;
}

export function buildCheckoutReminderWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    return `Hello ${guestName} from Sri Padmavati Pleasants 🙏
A gentle reminder: your check-out time is approaching. Please ensure all your belongings are packed.

வணக்கம் ${guestName} 🙏
உங்கள் செக்-அவுட் நேரம் நெருங்குகிறது. தயவுசெய்து உங்கள் உடைமைகளை எடுத்துக்கொள்ளவும்.`;
}

export function buildCheckoutWhatsAppMessage(booking) {
    const guestName = booking.guestName || '';
    return `Thank you ${guestName} for staying at Sri Padmavati Pleasants, Palani 🙏
We hope you enjoyed your stay. Have a safe journey!

ஸ்ரீ பத்மாவதி பிளஸன்ட்ஸ்-ல் தங்கியதற்கு நன்றி ${guestName} 🙏
உங்கள் பயணம் இனியதாக அமைய வாழ்த்துக்கள்!`;
}

export function buildOwnerCheckinMessage(booking) {
    const roomDisplay = (booking.rooms && booking.rooms.length > 0)
        ? booking.rooms.map(r => `${r.roomName} (Floor ${r.floor})`).join(', ')
        : `${booking.roomName || 'N/A'}`;

    const ciDateTime = booking.checkIn ? formatDateTime(booking.checkIn, booking.checkInTime || '12:00 PM') : 'N/A';
    const coDateTime = booking.checkOut ? formatDateTime(booking.checkOut, booking.checkOutTime || '11:00 AM') : 'N/A';
    const extras = (booking.extras || 0) + (booking.extraBed || 0);
    const guests = `${booking.maleCount || 0}M + ${booking.femaleCount || 0}F + ${booking.childrenCount || 0}C`;

    return `🏨 *New Check-In Alert*
Sri Padmavati Pleasants

👤 Guest: ${booking.guestName}
📱 Phone: ${booking.guestPhone || 'N/A'}
👥 Guests: ${guests}
🛏️ Room: ${roomDisplay}
📅 Check-in: ${ciDateTime}
📅 Check-out: ${coDateTime}
💳 Payment: ${booking.paymentMethod || 'N/A'}${booking.bookingSource ? ' (' + booking.bookingSource + ')' : ''}

💰 Room Rate: ₹${formatNumber(booking.roomRate || 0)}
💵 Advance Received: ₹${formatNumber(booking.advance || 0)}
➕ Extras: ₹${formatNumber(extras)}
🧾 Total Billing: ₹${formatNumber(getBookingTotal(booking))}
⚖️ Balance Due: ₹${formatNumber(getBookingBalance(booking))}

📋 Booking ID: ${booking.id}`;
}
