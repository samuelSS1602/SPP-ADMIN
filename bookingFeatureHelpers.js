function analyzePhotoQuality(imageStats) {
  const stats = imageStats || {};
  const width = Number(stats.width) || 0;
  const height = Number(stats.height) || 0;
  const brightness = Number(stats.brightness) || 0;
  const contrast = Number(stats.contrast) || 0;
  const edgeVariance = Number(stats.edgeVariance) || 0;
  const pixelCount = Number(stats.pixelCount) || 0;

  const reasons = [];

  if (pixelCount < 12000) {
    reasons.push('too-small');
  }

  if (brightness < 12) {
    reasons.push('too-dark');
  }

  if (contrast < 0.02) {
    reasons.push('low-contrast');
  }

  if (edgeVariance < 0.03) {
    reasons.push('blurry');
  }

  if (width < 200 || height < 160) {
    reasons.push('low-resolution');
  }

  return {
    isPoor: reasons.length > 0,
    reasons,
    score: Math.max(0, 100 - (reasons.length * 18))
  };
}

function buildBookingConfirmationMessage(booking, receiptUrl) {
  const roomDisplay = (booking.rooms && booking.rooms.length > 0)
    ? booking.rooms.map(r => `${r.roomName} (Floor ${r.floor})`).join(', ')
    : (booking.roomName || 'N/A');

  const amount = Number(booking.advance || 0) || 0;
  const balance = Math.max((Number(booking.roomRate) || 0) + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0) - amount, 0);
  const checkInDate = booking.checkIn ? `${booking.checkIn} ${booking.checkInTime || ''}`.trim() : 'N/A';
  const checkOutDate = booking.checkOut ? `${booking.checkOut} ${booking.checkOutTime || ''}`.trim() : 'N/A';

  const lines = [
    'Booking Confirmed',
    `Booking ID: ${booking.id}`,
    `Guest: ${booking.guestName || 'N/A'}`,
    `Phone: ${booking.guestPhone || 'N/A'}`,
    `Room: ${roomDisplay}`,
    `Check-In: ${checkInDate}`,
    `Check-Out: ${checkOutDate}`,
    `Payment: ${booking.paymentMethod || 'N/A'}${booking.bookingSource ? ` (${booking.bookingSource})` : ''}`,
    `Advance Paid: ₹${Number(amount).toLocaleString('en-IN')}`,
    `Balance Due: ₹${Number(balance).toLocaleString('en-IN')}`,
    `Receipt: ${receiptUrl || 'N/A'}`
  ];

  return lines.join('\n');
}

function buildBookingShareLink(baseUrl, bookingId) {
  const normalizedBase = (baseUrl || '').replace(/\?.*$/, '');
  const separator = normalizedBase.includes('?') ? '&' : '?';
  return `${normalizedBase}${separator}bookingId=${encodeURIComponent(bookingId)}&view=receipt`;
}

if (typeof module !== 'undefined') {
  module.exports = {
    analyzePhotoQuality,
    buildBookingConfirmationMessage,
    buildBookingShareLink
  };
}
