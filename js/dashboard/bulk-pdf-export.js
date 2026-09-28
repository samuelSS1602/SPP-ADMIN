
// ===== DOWNLOAD ALL BOOKING DATA (OWNER ONLY) =====

function setDownloadPreset(preset) {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');
    if (!fromInput || !toInput) return;

    const today = new Date();
    const todayISO = getLocalISODate();

    // Remove active class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    const buttons = document.querySelectorAll('.preset-btn');
    const presetIndex = { today: 0, week: 1, month: 2, all: 3 };
    if (buttons[presetIndex[preset]]) {
        buttons[presetIndex[preset]].classList.add('active');
    }

    switch (preset) {
        case 'today':
            fromInput.value = todayISO;
            toInput.value = todayISO;
            break;
        case 'week': {
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(today);
            monday.setDate(today.getDate() + mondayOffset);
            const sundayEnd = new Date(monday);
            sundayEnd.setDate(monday.getDate() + 6);
            fromInput.value = toISODateFromDate(monday);
            toInput.value = toISODateFromDate(sundayEnd);
            break;
        }
        case 'month': {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            fromInput.value = toISODateFromDate(firstDay);
            toInput.value = toISODateFromDate(lastDay);
            break;
        }
        case 'all':
            fromInput.value = '2020-01-01';
            toInput.value = todayISO;
            break;
    }

    updateDownloadRecordCount();
}

function updateDownloadRecordCount() {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');
    const countEl = document.getElementById('downloadRecordCount');
    if (!fromInput || !toInput || !countEl) return;

    const fromDate = fromInput.value;
    const toDate = toInput.value;

    if (!fromDate || !toDate) {
        countEl.className = 'download-record-count';
        countEl.innerHTML = '<i class="fas fa-database"></i> <span>Select a date range to preview</span>';
        return;
    }

    const filtered = data.bookings.filter(booking => {
        const checkInDate = booking.checkIn;
        if (!checkInDate) return false;
        return checkInDate >= fromDate && checkInDate <= toDate;
    });

    if (filtered.length === 0) {
        countEl.className = 'download-record-count';
        countEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>No records found in this range</span>';
    } else {
        countEl.className = 'download-record-count has-records';
        countEl.innerHTML = `<i class="fas fa-check-circle"></i> <span>${filtered.length} booking${filtered.length !== 1 ? 's' : ''} found</span>`;
    }
}

async function downloadAllBookingData() {
    const fromInput = document.getElementById('downloadFromDate');
    const toInput = document.getElementById('downloadToDate');

    if (!fromInput || !toInput) {
        alert('Date range inputs not found');
        return;
    }

    const fromDate = fromInput.value;
    const toDate = toInput.value;

    if (!fromDate || !toDate) {
        alert('Please select both From and To dates before downloading.');
        return;
    }

    if (fromDate > toDate) {
        alert('From date cannot be after To date.');
        return;
    }

    // Filter bookings by created/check-in date range
    const filtered = data.bookings.filter(booking => {
        const bookingDate = booking.checkIn;
        if (!bookingDate) return false;
        return bookingDate >= fromDate && bookingDate <= toDate;
    });

    if (filtered.length === 0) {
        alert('No bookings found in the selected date range.');
        return;
    }

    const countEl = document.getElementById('downloadRecordCount');
    if (countEl) {
        countEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Preparing PDF...</span>';
    }

    const printWindow = window.open('', '', 'height=800,width=900');
    if (!printWindow) {
        alert('Please allow popups for this site to generate the PDF bills.');
        if (countEl) updateDownloadRecordCount();
        return;
    }
    printWindow.document.write('<html><head><title>Loading...</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f4f4f4;}h2{color:#333;}</style></head><body><h2>Preparing PDF Bills... This may take a moment.</h2></body></html>');

    // Attempt to fetch photos from Firebase for all bookings in range
    const photoMap = {};
    if (firebaseEnabled && firebaseDb) {
        try {
            for (const booking of filtered) {
                const localCustomer = booking.customerPhoto || booking.customerPhotoUrl;
                const localIdProof = booking.idProofPhoto || booking.idProofPhotoUrl;

                if (!localCustomer || !localIdProof) {
                    try {
                        const doc = await firebaseDb.collection('booking_photos').doc(String(booking.id)).get();
                        if (doc.exists) {
                            const picData = doc.data();
                            photoMap[booking.id] = {
                                customerPhoto: localCustomer || picData.customerPhoto || null,
                                idProofPhoto: localIdProof || picData.idProofPhoto || null
                            };
                        } else {
                            photoMap[booking.id] = {
                                customerPhoto: localCustomer || null,
                                idProofPhoto: localIdProof || null
                            };
                        }
                    } catch (e) {
                        photoMap[booking.id] = {
                            customerPhoto: localCustomer || null,
                            idProofPhoto: localIdProof || null
                        };
                    }
                } else {
                    photoMap[booking.id] = {
                        customerPhoto: localCustomer,
                        idProofPhoto: localIdProof
                    };
                }
            }
        } catch (e) {
            console.warn('Could not fetch photos from Firebase:', e);
        }
    } else {
        // Use local data only
        filtered.forEach(booking => {
            photoMap[booking.id] = {
                customerPhoto: booking.customerPhoto || booking.customerPhotoUrl || null,
                idProofPhoto: booking.idProofPhoto || booking.idProofPhotoUrl || null
            };
        });
    }

    let allBillsHTML = '';
    const printGst = typeof LODGE_GST_NUMBER !== 'undefined' ? LODGE_GST_NUMBER : '33AMHPM8819J2ZN';

    for (let i = 0; i < filtered.length; i++) {
        const booking = filtered[i];
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

        const grossBaseTariff = totalRate / 1.05;
        const baseDiscount = discountGross / 1.05;
        const netBaseTariff = totalGrossRoom / 1.05;

        const cgst = netBaseTariff * 0.025;
        const sgst = netBaseTariff * 0.025;

        let customerRecord = {};
        if (typeof getCustomerRecordForBooking === 'function') {
             customerRecord = getCustomerRecordForBooking(booking) || {};
        }

        const guestPhone = booking.guestPhone || customerRecord.mobile || customerRecord.phone || '';
        const guestName = booking.guestName || '';
        let guestAddress = customerRecord.address || '';
        if (!guestAddress) {
            guestAddress = (booking.idProofType ? booking.idProofType + ' provided' : '');
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${months[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;

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

        const guestGST = booking.guestGST || '';
        guestAddress = guestAddress.replace(/\n/g, '<br>');

        const roomsDisplay = (booking.rooms && booking.rooms.length > 1)
            ? booking.rooms.map(r => r.roomName).join(', ')
            : (booking.rooms && booking.rooms.length === 1
                ? booking.rooms[0].roomName
                : booking.roomName);
                
        const photos = photoMap[booking.id] || {};
        const custImg = photos.customerPhoto ? `<img src="${photos.customerPhoto}" style="width:120px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">` : '<div style="width:120px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No Photo</div>';
        const idImg = photos.idProofPhoto ? `<img src="${photos.idProofPhoto}" style="width:160px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">` : '<div style="width:160px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No ID Proof</div>';

        allBillsHTML += `
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height: 1.4; page-break-after: always; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family: 'Times New Roman', serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 6369216621<br>
                    Website : www.sripadmavatipleasants.com<br>
                    GSTN: ${printGst}
                </div>
            </div>
            
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:15px;">
                Tax Invoice - ${booking.status.toUpperCase()}
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${guestName.toUpperCase()}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        ${guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${guestGST}</strong></td></tr>` : ''}
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
                        <tr><td colspan="2" style="font-size:11px; padding-top:10px; color:#555;">${guestSubLine}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Photos -->
            <div style="display:flex; gap:20px; margin-bottom:15px; border:1px solid #eee; padding:10px; border-radius:8px; background:#fafafa;">
                <div>
                    <div style="font-size:10px; color:#666; margin-bottom:4px; font-weight:bold;">GUEST PHOTO</div>
                    ${custImg}
                </div>
                <div>
                    <div style="font-size:10px; color:#666; margin-bottom:4px; font-weight:bold;">ID PROOF</div>
                    ${idImg}
                </div>
            </div>
            
            <table style="width:100%; border-collapse:collapse; border-top:1.5px solid #ccc; border-bottom:1.5px solid #ccc; text-align:right; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #ccc;">
                        <th style="text-align:center; padding:8px 4px; font-weight:bold;">Date</th>
                        <th style="text-align:center; padding:8px 4px; font-weight:bold;">Room</th>
                        <th style="padding:8px 4px; font-weight:bold;">Tariff</th>
                        <th style="padding:8px 4px; font-weight:bold;">E.Bed</th>
                        <th style="padding:8px 4px; font-weight:bold;">Disc</th>
                        <th style="padding:8px 4px; font-weight:bold;">CGST<br>2.50%</th>
                        <th style="padding:8px 4px; font-weight:bold;">SGST<br>2.50%</th>
                        <th style="padding:8px 4px; font-weight:bold;">Oths</th>
                        <th style="padding:8px 4px; font-weight:bold;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align:center; padding:8px 4px;">${billDate}</td>
                        <td style="text-align:center; padding:8px 4px;">${roomsDisplay}</td>
                        <td style="padding:8px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:8px 4px;">Total</td>
                        <td style="padding:8px 4px;">${grossBaseTariff.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${baseDiscount.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${cgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${sgst.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${extras.toFixed(2)}</td>
                        <td style="padding:8px 4px;">${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        `;
    }

    if(updateDownloadRecordCount) updateDownloadRecordCount();

    printWindow.document.open();
    printWindow.document.write(`
        <html>
        <head>
            <title>Booking Data - All Bills</title>
            <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background:#ccc;}
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; background: #fff;}
                    .receipt-a4-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow:none !important; border:none !important; }
                    /* Force background colors and exact table styles to print */
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
                @media screen {
                    .receipt-a4-container { margin: 20px auto !important; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                }
            </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 1500);">${allBillsHTML}</body>
        </html>
    `);
    printWindow.document.close();
}

// Initialize date range listeners
document.addEventListener('DOMContentLoaded', function() {
    const fromDateInput = document.getElementById('downloadFromDate');
    const toDateInput = document.getElementById('downloadToDate');

    if (fromDateInput) {
        fromDateInput.addEventListener('change', function() {
            // Remove active class from preset buttons when manually changing dates
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
            updateDownloadRecordCount();
        });
    }
    if (toDateInput) {
        toDateInput.addEventListener('change', function() {
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
            updateDownloadRecordCount();
        });
    }
});
