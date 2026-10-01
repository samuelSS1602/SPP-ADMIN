// Formatters are expensive to construct, so build them once and reuse them for every call
const INR_NUMBER_FORMAT = new Intl.NumberFormat('en-IN');
const DISPLAY_DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

export const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatNumber(num) {
    return INR_NUMBER_FORMAT.format(num);
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    return DISPLAY_DATE_FORMAT.format(date);
}

export function formatDateTime(dateString, timeString) {
    return `${formatDate(dateString)}, ${timeString || 'N/A'}`;
}

// "14:05" -> "2:05 PM"
export function toDisplayTime(timeValue) {
    if (!timeValue) return 'N/A';
    const [hoursText, minutes] = timeValue.split(':');
    let hours = parseInt(hoursText, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${suffix}`;
}

// "2:05 PM" (or "14:05") -> "14:05" for <input type="time">
export function displayTimeToInput(timeString) {
    if (!timeString) return '';
    let hours = 12;
    let mins = '00';
    try {
        const timeMatch = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)$/i.exec(timeString.trim());
        if (timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            mins = timeMatch[2];
            if (timeMatch[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
        } else {
            [hours, mins] = timeString.split(':');
        }
    } catch (e) { /* keep defaults */ }
    if (mins === undefined || Number.isNaN(parseInt(hours, 10))) return '';
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function parseBookingDateTime(dateValue, displayTime) {
    if (!dateValue || !displayTime) return null;
    const timeMatch = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)$/i.exec(displayTime.trim());
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

export function capitalizeFirst(str) {
    const text = String(str ?? '');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function capitalizeAllText(str) {
    if (!str) return str;
    return str.toString().toUpperCase();
}

export function toISODateFromDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
}

export function getLocalISODate() {
    return toISODateFromDate(new Date());
}

export function getCurrentTimeValue() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getInitials(name, fallback = 'G') {
    return (name || fallback).split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function getRoomsDisplay(booking, { withCount = false } = {}) {
    if (booking.rooms && booking.rooms.length > 1) {
        const names = booking.rooms.map(r => r.roomName).join(', ');
        return withCount ? `${names} (${booking.rooms.length} rooms)` : names;
    }
    if (booking.rooms && booking.rooms.length === 1) return booking.rooms[0].roomName;
    return booking.roomName;
}
