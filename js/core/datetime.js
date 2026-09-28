
function parseBookingDateTime(dateValue, displayTime) {
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
