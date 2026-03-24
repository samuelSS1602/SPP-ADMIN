receipt_content = """let currentReceiptBookingId = null;

function showReceipt(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    currentReceiptBookingId = bookingId;

    const totalRate = booking.roomRate || 0;
    const extras = booking.extras || 0;
    const totalAmount = totalRate + extras;
    
    // Reverse calculate 5% GST on roomRate
    const baseTariff = totalRate / 1.05;
    const cgst = baseTariff * 0.025;
    const sgst = baseTariff * 0.025;
    
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
    if (days < 1 || isNaN(days)) days = 1;
    
    const adultCount = booking.adults || 1;
    const childrenCount = booking.children || 0;
    const guestSubLine = `Male : ${adultCount} FeMale :0 Child : ${childrenCount}`;

    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';
    
    // Convert newlines in address to <br> if exist
    guestAddress = guestAddress.replace(/\\n/g, '<br>');

    const receiptHTML = `
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; max-width:850px; margin:0 auto; padding:20px; line-height: 1.4;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <!-- Hardcoded matching SRC for the logo to appear like Sri Jawahar Logo, using the user's existing logo or just text -->
                   <img src="logo - Copy.jpeg" style="width:120px; height:auto; margin-bottom:5px;" alt="Logo" onerror="this.style.display='none';">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family: 'Times New Roman', serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 04545241614; +91 948 888 6101<br>
                    ${printGst}
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
                        <tr><td>Company Name</td><td></td></tr>
                        <tr><td style="vertical-align:top;">Address</td><td>${guestAddress}</td></tr>
                        <tr><td>&nbsp;</td><td></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>
                    </table>
                </div>
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:100px;">Bill No.</td><td><strong>BL${(booking.id || '').toString().padStart(4, '0')}</strong></td></tr>
                        <tr><td>Room No</td><td><strong>${booking.roomName}</strong></td></tr>
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
                        <td style="text-align:center; padding:12px 4px;">${booking.roomName}</td>
                        <td style="padding:12px 4px;">${baseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                    <tr style="height:120px;"><td colspan="10"></td></tr>
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:12px 4px;">Total</td>
                        <td style="padding:12px 4px;">${baseTariff.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
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
                    body { padding: 0; margin: 0; }
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
"""

with open('d:/PROGRAM/LODGE ADMIN/receipt.js', 'w', encoding='utf-8') as f:
    f.write(receipt_content)
