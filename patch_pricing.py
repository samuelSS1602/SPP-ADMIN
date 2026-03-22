import os

# 1. Update receipt.js
receipt_path = 'd:/PROGRAM/LODGE ADMIN/receipt.js'
with open(receipt_path, 'r', encoding='utf-8') as f:
    receipt_data = f.read()

# We need to move the days calculation BEFORE we calculate total gross
old_receipt_math = """    const totalRate = booking.roomRate || 0;
    const extras = booking.extras || 0;
    const totalGrossRoom = Math.max(0, totalRate - discountGross);
    const totalAmount = totalGrossRoom + extras;
    
    // Reverse calculate 5% GST on net room rate
    const grossBaseTariff = totalRate / 1.05;
    const baseDiscount = discountGross / 1.05;
    const netBaseTariff = totalGrossRoom / 1.05;

    const cgst = netBaseTariff * 0.025;
    const sgst = netBaseTariff * 0.025;
    
    const customerRecord = getCustomerRecordForBooking(booking) || {};
    const guestPhone = booking.guestPhone || customerRecord.mobile || customerRecord.phone || '';
    const guestName = booking.guestName || '';
    let guestAddress = customerRecord.address || '';
    if (!guestAddress) {
        guestAddress = (booking.idProofType ? booking.idProofType + ' provided' : '');
    }
    
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const checkOutDate = booking.checkOut ? new Date(booking.checkOut) : new Date();
    
    // Format "16-Mar-26"
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const billDate = `${('0'+checkOutDate.getDate()).slice(-2)}-${months[checkOutDate.getMonth()]}-${checkOutDate.getFullYear().toString().slice(2)}`;
    
    const arrivalText = formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '');
    const depText = formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '');
    
    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil((checkOutDate - checkInDate) / msPerDay);
    if (days < 1 || isNaN(days)) days = 1;"""

new_receipt_math = """    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    let checkOutDateObj = booking.checkOut ? new Date(booking.checkOut) : new Date();
    if (booking.actualCheckOutDate) {
        checkOutDateObj = new Date(booking.actualCheckOutDate);
    }
    
    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDateObj - checkInDate) / msPerDay);
    if (days < 1 || isNaN(days)) days = 1;

    const dailyRate = booking.roomRate || 0;
    const totalRate = dailyRate * days;
    const extras = booking.extras || 0;
    const totalGrossRoom = Math.max(0, totalRate - discountGross);
    const totalAmount = totalGrossRoom + extras;
    
    // Reverse calculate 5% GST on net room rate
    const grossBaseTariff = totalRate / 1.05;
    const baseDiscount = discountGross / 1.05;
    const netBaseTariff = totalGrossRoom / 1.05;

    const cgst = netBaseTariff * 0.025;
    const sgst = netBaseTariff * 0.025;
    
    const customerRecord = getCustomerRecordForBooking(booking) || {};
    const guestPhone = booking.guestPhone || customerRecord.mobile || customerRecord.phone || '';
    const guestName = booking.guestName || '';
    let guestAddress = customerRecord.address || '';
    if (!guestAddress) {
        guestAddress = (booking.idProofType ? booking.idProofType + ' provided' : '');
    }
    
    // Format "16-Mar-26"
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const billDate = `${('0'+checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;
    
    const arrivalText = formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '');
    const depText = formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '');"""

receipt_data = receipt_data.replace(old_receipt_math, new_receipt_math)
with open(receipt_path, 'w', encoding='utf-8') as f:
    f.write(receipt_data)

# 2. Update booking.js
booking_path = 'd:/PROGRAM/LODGE ADMIN/booking.js'
with open(booking_path, 'r', encoding='utf-8') as f:
    booking_data = f.read()

old_load = """    data.bookings.forEach(booking => {
        const total = booking.roomRate + booking.extras;"""

new_load = """    data.bookings.forEach(booking => {
        const total = getBookingTotal(booking);"""

booking_data = booking_data.replace(old_load, new_load)

old_getters = """function getBookingTotal(booking) {
    return (Number(booking.roomRate) || 0) + (Number(booking.extras) || 0);
}

function getBookingBalance(booking) {
    const roomRate = Number(booking.roomRate) || 0;
    const advance = Number(booking.advance) || 0;
    const extras = Number(booking.extras) || 0;
    return Math.max(roomRate - advance + extras, 0);
}"""

new_getters = """function calculateBookingDays(booking) {
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const checkOutDateStr = booking.actualCheckOutDate || booking.checkOut;
    const checkOutDate = checkOutDateStr ? new Date(checkOutDateStr) : new Date();
    
    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDate - checkInDate) / msPerDay);
    if (days < 1 || isNaN(days)) days = 1;
    return days;
}

function getBookingTotal(booking) {
    const days = calculateBookingDays(booking);
    // Note: discounts are mostly applied during receipt generation, but we could deduct it here if global dashboard balance requires it.
    // For now, mirroring original behavior where total = (Rate * Days) + Extras
    return ((Number(booking.roomRate) || 0) * days) + (Number(booking.extras) || 0);
}

function getBookingBalance(booking) {
    const days = calculateBookingDays(booking);
    const totalRoom = (Number(booking.roomRate) || 0) * days;
    const advance = Number(booking.advance) || 0;
    const extras = Number(booking.extras) || 0;
    const discount = Number(booking.discount) || 0;
    return Math.max(totalRoom - advance + extras - discount, 0);
}"""

booking_data = booking_data.replace(old_getters, new_getters)
with open(booking_path, 'w', encoding='utf-8') as f:
    f.write(booking_data)

print("Dynamic pricing applied!")
