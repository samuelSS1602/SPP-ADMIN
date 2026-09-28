
// ═══════════════════════════════════════════════════
// GST BILL PRINTOUT — Filter & Print Functions
// ═══════════════════════════════════════════════════

let _gstPrintMethodFilter = 'all';

function setGSTPrintFilter(filter) {
    _gstPrintMethodFilter = filter;
    // Update active pill UI
    const pills = document.querySelectorAll('#gstFilterPills .gst-pill');
    pills.forEach(p => {
        p.classList.toggle('active', p.dataset.filter === filter);
    });
    updateGSTPrintCount();
}

function setGSTPrintPreset(preset) {
    const today = new Date();
    const fromEl = document.getElementById('gstPrintFromDate');
    const toEl = document.getElementById('gstPrintToDate');
    if (!fromEl || !toEl) return;

    const fmt = d => d.toISOString().split('T')[0];

    switch (preset) {
        case 'today':
            fromEl.value = fmt(today);
            toEl.value = fmt(today);
            break;
        case 'week': {
            const dow = today.getDay();
            const start = new Date(today);
            start.setDate(today.getDate() - dow);
            fromEl.value = fmt(start);
            toEl.value = fmt(today);
            break;
        }
        case 'month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            fromEl.value = fmt(start);
            toEl.value = fmt(today);
            break;
        }
        case 'all':
            fromEl.value = '';
            toEl.value = '';
            break;
    }
    updateGSTPrintCount();
}

function getGSTFilteredBookings() {
    const fromVal = document.getElementById('gstPrintFromDate')?.value || '';
    const toVal = document.getElementById('gstPrintToDate')?.value || '';

    return data.bookings.filter(b => {
        // Payment method filter
        const method = b.paymentMethod || 'Cash';
        if (_gstPrintMethodFilter === 'except-online') {
            if (method === 'Online') return false;
        } else if (_gstPrintMethodFilter !== 'all') {
            if (method !== _gstPrintMethodFilter) return false;
        }

        // Date range filter (based on check-in date)
        if (fromVal && b.checkIn && b.checkIn < fromVal) return false;
        if (toVal && b.checkIn && b.checkIn > toVal) return false;

        return true;
    });
}

function updateGSTPrintCount() {
    const filtered = getGSTFilteredBookings();
    const el = document.getElementById('gstPrintRecordCount');
    if (el) {
        el.innerHTML = `<i class="fas fa-file-invoice" style="color: #16a34a;"></i> <span><strong>${filtered.length}</strong> bill${filtered.length !== 1 ? 's' : ''} matched</span>`;
    }
}

function printGSTBills() {
    const bookings = getGSTFilteredBookings();
    if (bookings.length === 0) {
        alert('No bills match the selected filters. Please adjust your filters and try again.');
        return;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';

    let invoicesHTML = '';

    bookings.forEach((booking, idx) => {
        const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
        let checkOutDateObj = booking.checkOut ? new Date(booking.checkOut) : new Date();
        if (booking.actualCheckOutDate) checkOutDateObj = new Date(booking.actualCheckOutDate);

        const msPerDay = 1000 * 60 * 60 * 24;
        let days = Math.ceil(Math.abs(checkOutDateObj - checkInDate) / msPerDay);
        if (days < 1 || isNaN(days)) days = 1;

        const dailyRate = booking.roomRate || 0;
        const totalRate = dailyRate * days;
        const discountGross = booking.discount || 0;
        const extras = booking.extras || 0;
        const extraBed = booking.extraBed || 0;
        const totalGrossRoom = Math.max(0, totalRate - discountGross);
        const totalAmount = totalGrossRoom + extraBed + extras;

        const grossBaseTariff = totalRate / 1.05;
        const baseDiscount = discountGross / 1.05;
        const netBaseTariff = totalGrossRoom / 1.05;
        const cgst = netBaseTariff * 0.025;
        const sgst = netBaseTariff * 0.025;

        const guestName = booking.guestName || '';
        const guestPhone = booking.guestPhone || '';
        const guestGST = booking.guestGST || '';

        const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;

        const invYY = checkOutDateObj.getFullYear().toString().slice(2);
        const invMM = ('0' + (checkOutDateObj.getMonth() + 1)).slice(-2);
        const invDD = ('0' + checkOutDateObj.getDate()).slice(-2);
        const invId = (booking.id || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');
        const invoiceNumber = `${invYY}${invMM}${invDD}${invId}`;

        const arrivalText = typeof formatDateTime === 'function' ? formatDateTime(booking.checkIn, booking.checkInTime).replace(',', '') : (booking.checkIn || '');
        const depText = typeof formatDateTime === 'function' ? formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', '') : (booking.checkOut || '');

        const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
        const fCount = booking.femaleCount || 0;
        const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);
        const guestSubLine = `Male : ${mCount} Female : ${fCount} Child : ${cCount}`;

        const roomsDisplay = (booking.rooms && booking.rooms.length > 1)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.rooms && booking.rooms.length === 1 ? booking.rooms[0].roomName : booking.roomName);

        const payMethod = booking.paymentMethod || 'Cash';

        invoicesHTML += `
        <div class="invoice-page" style="page-break-after: always; background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height:1.4;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <img src="logo - Copy.jpeg" style="width:120px; height:auto; margin-bottom:5px;" alt="Logo" onerror="this.style.display='none';">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family:'Times New Roman',serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
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
                    <table style="width:100%; font-size:12px; line-height:1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${guestName.toUpperCase()}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        ${guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${guestGST}</strong></td></tr>` : ''}
                        <tr><td>Vehicle No.</td><td><strong>${booking.vehicleNumber || ''}</strong></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>
                        <tr><td>Payment</td><td><strong>${payMethod}</strong></td></tr>
                    </table>
                </div>
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height:1.6;">
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
                        <th style="text-align:center; padding:10px 4px; font-weight:bold;">Date</th>
                        <th style="text-align:center; padding:10px 4px; font-weight:bold;">Room</th>
                        <th style="padding:10px 4px; font-weight:bold;">Tariff</th>
                        <th style="padding:10px 4px; font-weight:bold;">E.Bed</th>
                        <th style="padding:10px 4px; font-weight:bold;">Disc</th>
                        <th style="padding:10px 4px; font-weight:bold;">CGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold;">SGST<br>2.50%</th>
                        <th style="padding:10px 4px; font-weight:bold;">FnB</th>
                        <th style="padding:10px 4px; font-weight:bold;">Oths</th>
                        <th style="padding:10px 4px; font-weight:bold;">Total</th>
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

            <!-- Footer -->
            <div style="margin-top:20px; font-size:11px; display:flex; justify-content:space-between;">
                <div style="width:48%;">
                    <p style="margin:0 0 5px 0;">Certified that the particulars given above are true and correct.</p>
                    <p style="margin:0; font-weight:bold; font-size:13px;">For SRI PADMAVATI PLEASANTS</p>
                </div>
                <div style="width:48%; color:#555;">
                    <p style="margin:0 0 3px 0;">*Regardless of the billing instruction, I agree to be held personally liable for the payment of the total amount of bill for my stay in the hotel.</p>
                    <p style="margin:0;">*All disputes subject to PALANI Jurisdiction.</p>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:50px; margin-bottom:20px;">
                <div>
                    <p style="margin:0 0 5px 0; font-size:12px; font-family:'Times New Roman',serif;">bookings@sripadmavatipleasants.com</p>
                    <p style="margin:0; font-weight:bold; font-size:14px;">Receptionist Sign</p>
                </div>
                <div>
                    <p style="margin:0; font-weight:bold; font-size:14px;">Guest Sign</p>
                </div>
            </div>

            <div style="background:#eef2f6; padding:8px 15px; display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:10px;">
                <div style="width:30%; color:#555;">www.sripadmavatipleasants.com</div>
                <div style="width:40%; text-align:center; font-weight:bold; font-size:13px;">Thank You, Visit Again</div>
                <div style="width:30%; text-align:right; color:#555;">E.&O.E.</div>
            </div>
        </div>
        `;
    });

    // Open print window
    const printWindow = window.open('', '', 'height=900,width=950');
    printWindow.document.write(`
        <html>
        <head>
            <title>GST Bills - Bulk Print (${bookings.length} invoice${bookings.length !== 1 ? 's' : ''})</title>
            <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .invoice-page { padding: 15px; }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; width: 210mm; }
                    .invoice-page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10px !important; page-break-after: always; }
                    .invoice-page:last-child { page-break-after: avoid; }
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 600);">
            ${invoicesHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
}
