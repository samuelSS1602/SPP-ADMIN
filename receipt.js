let currentReceiptBookingId = null;

function showReceipt(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    currentReceiptBookingId = bookingId;

    let discountGross = booking.discount || 0;

    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
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
    const extraBed = booking.extraBed || 0;
    const totalGrossRoom = Math.max(0, totalRate - discountGross);
    const totalAmount = totalGrossRoom + extraBed + extras;

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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;

    // Generate new Dynamic Invoice Number: YYMMDDXXXX (e.g. 2603220001)
    const invYY = checkOutDateObj.getFullYear().toString().slice(2);
    const invMM = ('0' + (checkOutDateObj.getMonth() + 1)).slice(-2);
    const invDD = ('0' + checkOutDateObj.getDate()).slice(-2);
    const invId = (booking.id || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');
    const invoiceNumber = `${invYY}${invMM}${invDD}${invId}`;

    const arrivalText = formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '');
    const depText = formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '');

    const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
    const fCount = booking.femaleCount || 0;
    const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);
    const guestSubLine = `Male : ${mCount} Female : ${fCount} Child : ${cCount}`;

    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';

    // Convert newlines in address to <br> if exist
    guestAddress = guestAddress.replace(/\n/g, '<br>');

    let isFullyPaid = false;
    if (typeof getBookingBalance === 'function') {
        isFullyPaid = getBookingBalance(booking) <= 0 || booking.status === 'paid' || booking.status === 'completed';
    }
    
    const paidBtnStyle = isFullyPaid 
        ? "padding:6px 14px; background:#95a5a6; color:#fff; border:none; border-radius:6px; cursor:not-allowed; font-weight:600; font-family:'Inter',sans-serif; margin-left:10px;" 
        : "padding:6px 14px; background:#27AE60; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif; box-shadow:0 4px 6px rgba(39, 174, 96, 0.2); transition:all 0.2s; margin-left:10px;";
    const paidBtnText = isFullyPaid ? `<i class="fas fa-check"></i> Already Paid` : `<i class="fas fa-check-circle"></i> Mark as Paid`;

    // Display all rooms for multi-room bookings
    const roomsDisplay = (booking.rooms && booking.rooms.length > 1)
        ? booking.rooms.map(r => r.roomName).join(', ')
        : (booking.rooms && booking.rooms.length === 1
            ? booking.rooms[0].roomName
            : booking.roomName);

    const receiptHTML = `
        <!-- Invoice Editor UI -->
        <div class="no-print" style="background:#f8fafc; padding:15px; text-align:center; border-bottom:1px solid #e2e8f0; margin-bottom:20px; border-radius:8px;">
            <div style="display:inline-flex; gap:15px; align-items:center; flex-wrap:wrap; justify-content:center; margin-bottom:10px;">
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Discount (₹): </label>
                    <input type="number" id="inlineDiscountInput" value="${discountGross}" style="padding:4px 8px; width:70px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Extra Bed (₹): </label>
                    <input type="number" id="inlineExtraBedInput" value="${extraBed}" style="padding:4px 8px; width:70px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Extras (₹): </label>
                    <input type="number" id="inlineExtrasInput" value="${extras}" style="padding:4px 8px; width:70px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
            </div>
            <div style="display:inline-flex; gap:15px; align-items:center; flex-wrap:wrap; justify-content:center; margin-bottom:10px; border-top: 1px dashed #cbd5e1; padding-top:10px; width:100%;">
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Male: </label>
                    <input type="number" id="inlineMaleInput" value="${mCount}" style="padding:4px 8px; width:50px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Female: </label>
                    <input type="number" id="inlineFemaleInput" value="${fCount}" style="padding:4px 8px; width:50px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:12px;">Child: </label>
                    <input type="number" id="inlineChildInput" value="${cCount}" style="padding:4px 8px; width:50px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600;">
                </div>
                <button onclick="applyDiscountToReceipt()" style="padding:6px 14px; background:var(--primary-brand); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif; box-shadow:0 4px 6px rgba(79, 70, 229, 0.2); transition:all 0.2s; margin-left:10px;">↻ Update Invoice</button>
                <button onclick="markReceiptAsPaid()" style="${paidBtnStyle}" id="markPaidBtn" ${isFullyPaid ? 'disabled' : ''}>${paidBtnText}</button>
            </div>
            <p style="margin:0; font-size:11px; color:#64748b;">Adjust any charges or guest counts and click Update.</p>
        </div>
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height: 1.4;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <!-- Hardcoded matching SRC for the logo to appear like Sri Jawahar Logo, using the user's existing logo or just text -->
                   <img src="logo - Copy.jpeg" style="width:120px; height:auto; margin-bottom:5px;" alt="Logo" onerror="this.style.display='none';">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family: 'Times New Roman', serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">RESIDENCY</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 6369216621<br>
                    Website : www.sripadmavatipleasants.com<br>
                    GSTN: ${printGst}
                </div>
            </div>
            
            <!-- Title Bar -->
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:20px;">
                Tax Invoice
            </div>
            
            <!-- Info Grid -->
            <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${guestName.toUpperCase()}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        <tr><td style="vertical-align:top;">Address</td><td>${guestAddress}</td></tr>
                        <tr><td>Vehicle No.</td><td><strong>${booking.vehicleNumber || ''}</strong></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>
                    </table>
                </div>
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:100px;">Bill No.</td><td><strong>${invoiceNumber}</strong></td></tr>
                        <tr><td>Room No</td><td><strong>${roomsDisplay}</strong></td></tr>
                        <tr><td>Bill Date</td><td><strong>${billDate}</strong></td></tr>
                        <tr><td>SAC Code</td><td>996311</td></tr>
                        <tr><td>Arrival</td><td>${arrivalText}</td></tr>
                        <tr><td>Departure</td><td>${depText}</td></tr>
                        <tr><td>Days</td><td>${days}</td></tr>
                        <tr><td colspan="2" style="font-size:11px; padding-top:15px; color:#555;">${guestSubLine}</td></tr>
                    </table>
                </div>
            </div>
            
            <!-- Main Table -->
            <table style="width:100%; border-collapse:collapse; border-top:1.5px solid #ccc; border-bottom:1.5px solid #ccc; text-align:right; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #ccc;">
                        <th style="text-align:center; padding:10px 4px; font-weight:bold; color:#000;">Date</th>
                        <th style="text-align:center; padding:10px 4px; font-weight:bold; color:#000;">Room</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">Tariff</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">E.Bed</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">Disc</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">CGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">SGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">FnB</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">Oths</th>
                        <th style="padding:10px 4px; font-weight:bold; color:#000;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align:center; padding:12px 4px;">${billDate}</td>
                        <td style="text-align:center; padding:12px 4px;">${roomsDisplay}</td>
                        <td style="padding:12px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                    <tr style="height:80px;"><td colspan="10"></td></tr>
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:12px 4px;">Total</td>
                        <td style="padding:12px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <!-- Receipt Footer -->
            <div style="margin-top: 20px; font-size: 11px; display: flex; justify-content: space-between;">
                <div style="width: 48%;">
                    <p style="margin: 0 0 5px 0;">Certified that the particulars given above are true and correct.</p>
                    <p style="margin: 0; font-weight: bold; font-size: 13px;">For SRI PADMAVATI PLEASANTS</p>
                </div>
                <div style="width: 48%; color: #555;">
                    <p style="margin: 0 0 3px 0;">*Regardless of the billing instruction, I agree to be held personally liable for the payment of the total amount of bill for my stay in the hotel.</p>
                    <p style="margin: 0;">*All disputes subject to PALANI Jurisdiction.</p>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 24px; color: #d4af37; margin-bottom: 5px;">🔑</div>
                <p style="margin: 0; font-size: 14px; color: #333;">We Request You To Return The Room Key Card</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; margin-bottom: 20px;">
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; font-family: 'Times New Roman', serif;">bookings@sripadmavatipleasants.com</p>
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">Receptionist Sign</p>
                </div>
                <div>
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">Guest Sign</p>
                </div>
            </div>

            <div style="background: #eef2f6; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top:10px;">
                <div style="width: 30%; color: #555;">www.sripadmavatipleasants.com</div>
                <div style="width: 40%; text-align: center; font-weight: bold; font-size: 13px;">Thank You, Visit Again</div>
                <div style="width: 30%; text-align: right; color: #555;">E.&.O.E.</div>
            </div>
        </div>
    `;

    document.getElementById('receiptBody').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
}

function printReceipt() {
    const printWindow = window.open('', '', 'height=800,width=900');
    const receiptContent = document.getElementById('receiptBody').innerHTML;
    printWindow.document.write(`
        <html>
        <head>
            <title>Receipt - Tax Invoice</title>
            <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; width: 210mm; }
                    .receipt-a4-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    /* Force background colors and exact table styles to print */
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 500);">${receiptContent}</body>
        </html>
    `);
    printWindow.document.close();
}

function downloadReceiptPDF() {
    printReceipt(); // Since format relies on HTML table, best approach is native print to PDF
}

function isCashPayment(paymentMethod) {
    if (!paymentMethod) return false;
    return paymentMethod.toLowerCase().trim() === 'cash';
}

window.applyDiscountToReceipt = function () {
    const disc = parseFloat(document.getElementById('inlineDiscountInput').value) || 0;
    const bed = parseFloat(document.getElementById('inlineExtraBedInput').value) || 0;
    const ext = parseFloat(document.getElementById('inlineExtrasInput').value) || 0;
    const booking = data.bookings.find(b => b.id === currentReceiptBookingId);
    if (booking) {
        booking.discount = disc;
        booking.extraBed = bed;
        booking.extras = ext;
        if (typeof saveDataToStorage === 'function') saveDataToStorage();
        if (typeof syncBookingToFirebase === 'function') syncBookingToFirebase(booking);
        
        if (typeof loadPayments === 'function') loadPayments();
        if (typeof updateRealtimeDashboardMetrics === 'function') updateRealtimeDashboardMetrics();
        if (typeof loadBookings === 'function') loadBookings();
        
        showReceipt(currentReceiptBookingId);
    }
};

window.markReceiptAsPaid = function () {
    const booking = data.bookings.find(b => b.id === currentReceiptBookingId);
    if (booking) {
        if (booking.status !== 'completed' && booking.status !== 'paid') {
            booking.status = 'paid';
        }
        
        if (typeof getBookingTotal === 'function') {
            booking.advance = getBookingTotal(booking);
        }

        if (typeof saveDataToStorage === 'function') saveDataToStorage();
        if (typeof syncBookingToFirebase === 'function') syncBookingToFirebase(booking);
        
        if (typeof loadPayments === 'function') loadPayments();
        if (typeof updateRealtimeDashboardMetrics === 'function') updateRealtimeDashboardMetrics();
        if (typeof loadBookings === 'function') loadBookings();
        
        alert(`Booking ${booking.id} marked as fully paid!`);
        showReceipt(currentReceiptBookingId);
    }
};
