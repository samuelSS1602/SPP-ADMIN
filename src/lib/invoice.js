import { escapeHtml, formatDateTime, getRoomsDisplay, MONTH_NAMES_SHORT } from './format.js';

export const LODGE_GST_NUMBER = '33ANCPP8116B1ZF';

function logoUrl() {
    // Absolute so the logo also resolves inside about:blank print windows
    return typeof window !== 'undefined' ? `${window.location.origin}/logo.jpeg` : '/logo.jpeg';
}

// Every figure printed on a tax invoice. Room tariff is GST-inclusive, so GST is reverse calculated at 5%.
export function computeInvoice(booking, customerRecord = {}) {
    const discountGross = booking.discount || 0;
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    let checkOutDateObj = booking.checkOut ? new Date(booking.checkOut) : new Date();
    if (booking.actualCheckOutDate) checkOutDateObj = new Date(booking.actualCheckOutDate);

    const msPerDay = 1000 * 60 * 60 * 24;
    let days = Math.ceil(Math.abs(checkOutDateObj - checkInDate) / msPerDay);
    if (days < 1 || Number.isNaN(days)) days = 1;

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

    let guestAddress = customerRecord.address || '';
    if (!guestAddress) guestAddress = booking.idProofType ? `${booking.idProofType} provided` : '';

    // "16-Mar-26"
    const billDate = `${('0' + checkOutDateObj.getDate()).slice(-2)}-${MONTH_NAMES_SHORT[checkOutDateObj.getMonth()]}-${checkOutDateObj.getFullYear().toString().slice(2)}`;
    // Invoice number YYMMDDXXXX (e.g. 2603220001)
    const invYY = checkOutDateObj.getFullYear().toString().slice(2);
    const invMM = ('0' + (checkOutDateObj.getMonth() + 1)).slice(-2);
    const invDD = ('0' + checkOutDateObj.getDate()).slice(-2);
    const invId = (booking.id || '').toString().replace(/[^0-9]/g, '').padStart(4, '0');

    const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
    const fCount = booking.femaleCount || 0;
    const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);

    return {
        days, totalRate, extras, extraBed, discountGross, totalGrossRoom, totalAmount,
        grossBaseTariff, baseDiscount, cgst, sgst,
        guestName: booking.guestName || '',
        guestPhone: booking.guestPhone || customerRecord.mobile || customerRecord.phone || '',
        guestAddress,
        guestGST: booking.guestGST || '',
        billDate,
        invoiceNumber: `${invYY}${invMM}${invDD}${invId}`,
        arrivalText: formatDateTime(booking.checkIn, booking.checkInTime).replace(',', ''),
        depText: formatDateTime(booking.checkOut, booking.checkOutTime).replace(',', ''),
        mCount, fCount, cCount,
        guestSubLine: `Male : ${mCount} Female : ${fCount} Child : ${cCount}`,
        roomsDisplay: getRoomsDisplay(booking) || ''
    };
}

function headerHtml(withLogo) {
    return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="width:250px; text-align:center;">
                   ${withLogo ? `<img src="${logoUrl()}" style="width:120px; height:auto; margin-bottom:5px;" alt="Logo" onerror="this.style.display='none';">` : ''}
                   <br><span style="font-size:16px; font-weight:bold; letter-spacing:1px; font-family: 'Times New Roman', serif;">SRI PADMAVATI</span><br><span style="font-size:10px;">PLEASANTS</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <strong style="font-size:16px;">SRI PADMAVATI PLEASANTS</strong><br>
                    Palani, Tamil Nadu - 624601<br>
                    Phone : 6369216621<br>
                    Website : www.sripadmavatipleasants.com<br>
                    GSTN: ${LODGE_GST_NUMBER}
                </div>
            </div>`;
}

function rightInfoTable(inv, pad = 15) {
    return `
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:100px;">Bill No.</td><td><strong>${inv.invoiceNumber}</strong></td></tr>
                        <tr><td>Room No</td><td><strong>${escapeHtml(inv.roomsDisplay)}</strong></td></tr>
                        <tr><td>Bill Date</td><td><strong>${inv.billDate}</strong></td></tr>
                        <tr><td>SAC Code</td><td>996311</td></tr>
                        <tr><td>Arrival</td><td>${escapeHtml(inv.arrivalText)}</td></tr>
                        <tr><td>Departure</td><td>${escapeHtml(inv.depText)}</td></tr>
                        <tr><td>Days</td><td>${inv.days}</td></tr>
                        <tr><td colspan="2" style="font-size:11px; padding-top:${pad}px; color:#555;">${inv.guestSubLine}</td></tr>
                    </table>`;
}

function chargesTable(inv, { withFnb, cellPad, spacerRow }) {
    const cols = [
        inv.grossBaseTariff.toFixed(2), Number(inv.extraBed).toFixed(2), inv.baseDiscount.toFixed(2),
        inv.cgst.toFixed(2), inv.sgst.toFixed(2), ...(withFnb ? ['0.00'] : []), Number(inv.extras).toFixed(2), inv.totalAmount.toFixed(2)
    ];
    const td = value => `<td style="padding:${cellPad};">${value}</td>`;
    const th = (label, center) => `<th style="${center ? 'text-align:center; ' : ''}padding:${cellPad === '12px 4px' ? '10px 4px' : cellPad}; font-weight:bold; color:#000;">${label}</th>`;
    return `
            <table style="width:100%; border-collapse:collapse; border-top:1.5px solid #ccc; border-bottom:1.5px solid #ccc; text-align:right; font-size:12px;">
                <thead>
                    <tr style="border-bottom:1.5px solid #ccc;">
                        ${th('Date', true)}${th('Room', true)}${th('Tariff')}${th('E.Bed')}${th('Disc')}${th('CGST<br>2.50%')}${th('SGST<br>2.50%')}${withFnb ? th('FnB') : ''}${th('Oths')}${th('Total')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align:center; padding:${cellPad};">${inv.billDate}</td>
                        <td style="text-align:center; padding:${cellPad};">${escapeHtml(inv.roomsDisplay)}</td>
                        ${cols.map(td).join('')}
                    </tr>
                    ${spacerRow ? `<tr style="height:80px;"><td colspan="${withFnb ? 10 : 9}"></td></tr>` : ''}
                </tbody>
                <tfoot>
                    <tr style="border-top:1.5px solid #ccc; font-weight:bold;">
                        <td colspan="2" style="text-align:left; padding:${cellPad};">Total</td>
                        ${cols.map(td).join('')}
                    </tr>
                </tfoot>
            </table>`;
}

function footerHtml({ withQr, booking, inv }) {
    return `
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
            ${withQr ? `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px auto; max-width: 140px; text-align: center;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('ID:' + booking.id + '|GUEST:' + booking.guestName + '|ROOM:' + inv.roomsDisplay + '|AMT:INR' + inv.totalAmount.toFixed(2))}" alt="Booking Verification QR" style="width: 100px; height: 100px;">
                <span style="font-size: 8px; font-weight: 700; color: #64748b; margin-top: 5px; display: block; text-transform: uppercase;">Scan stay verification</span>
            </div>
            <div style="text-align: center; margin: 20px 0;">
                <div style="font-size: 24px; color: #d4af37; margin-bottom: 5px;">🔑</div>
                <p style="margin: 0; font-size: 14px; color: #333;">We Request You To Return The Room Key Card</p>
            </div>` : ''}
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
                <div style="width: 30%; text-align: right; color: #555;">E.&amp;O.E.</div>
            </div>`;
}

// Single invoice shown in the receipt modal and printed from it
export function buildReceiptInvoiceHtml(booking, customerRecord) {
    const inv = computeInvoice(booking, customerRecord);
    return `
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height: 1.4;">
            ${headerHtml(true)}
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:20px;">Tax Invoice</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${escapeHtml(inv.guestName.toUpperCase())}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${escapeHtml(booking.companyName || '')}</strong></td></tr>
                        ${inv.guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${escapeHtml(inv.guestGST)}</strong></td></tr>` : ''}
                        <tr><td style="vertical-align:top;">Address</td><td>${escapeHtml(inv.guestAddress).replace(/\n/g, '<br>')}</td></tr>
                        <tr><td>Vehicle No.</td><td><strong>${escapeHtml(booking.vehicleNumber || '')}</strong></td></tr>
                        <tr><td>Mobile</td><td>${escapeHtml(inv.guestPhone)}</td></tr>
                    </table>
                </div>
                <div style="width:48%;">${rightInfoTable(inv)}</div>
            </div>
            ${chargesTable(inv, { withFnb: true, cellPad: '12px 4px', spacerRow: true })}
            ${footerHtml({ withQr: true, booking, inv })}
        </div>`;
}

// One page per bill for GST filing (adds payment method, no address or QR)
export function buildGstInvoiceHtml(booking) {
    const inv = computeInvoice(booking);
    return `
        <div class="invoice-page" style="page-break-after: always; background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height:1.4;">
            ${headerHtml(true)}
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:20px;">Tax Invoice</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height:1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${escapeHtml(inv.guestName.toUpperCase())}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${escapeHtml(booking.companyName || '')}</strong></td></tr>
                        ${inv.guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${escapeHtml(inv.guestGST)}</strong></td></tr>` : ''}
                        <tr><td>Vehicle No.</td><td><strong>${escapeHtml(booking.vehicleNumber || '')}</strong></td></tr>
                        <tr><td>Mobile</td><td>${escapeHtml(booking.guestPhone || '')}</td></tr>
                        <tr><td>Payment</td><td><strong>${escapeHtml(booking.paymentMethod || 'Cash')}</strong></td></tr>
                    </table>
                </div>
                <div style="width:48%;">${rightInfoTable(inv)}</div>
            </div>
            ${chargesTable(inv, { withFnb: true, cellPad: '12px 4px', spacerRow: true })}
            ${footerHtml({ withQr: false, booking, inv })}
        </div>`;
}

// Bulk PDF export page: status in the title and the verification photos, compact table
export function buildBulkInvoiceHtml(booking, customerRecord, photos = {}) {
    const inv = computeInvoice(booking, customerRecord);
    const custImg = photos.customerPhoto
        ? `<img src="${photos.customerPhoto}" style="width:120px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">`
        : '<div style="width:120px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No Photo</div>';
    const idImg = photos.idProofPhoto
        ? `<img src="${photos.idProofPhoto}" style="width:160px; height:120px; object-fit:cover; border:2px solid #ccc; border-radius:8px;">`
        : '<div style="width:160px; height:120px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; color:#999; border-radius:8px;">No ID Proof</div>';

    return `
        <div class="receipt-a4-container" style="background:#fff; color:#000; font-family:Arial,sans-serif; font-size:12px; width:100%; max-width:790px; margin:0 auto; padding:15px; box-sizing:border-box; line-height: 1.4; page-break-after: always; position:relative;">
            ${headerHtml(false)}
            <div style="background:#f4f4f4; border-top:1px solid #ddd; border-bottom:1px solid #ddd; text-align:center; padding:5px; font-weight:bold; font-size:14px; margin-bottom:15px;">
                Tax Invoice - ${escapeHtml(String(booking.status || '').toUpperCase())}
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <div style="width:48%;">
                    <table style="width:100%; font-size:12px; line-height: 1.6;">
                        <tr><td style="width:110px;">Name</td><td><strong>MR. ${escapeHtml(inv.guestName.toUpperCase())}</strong></td></tr>
                        <tr><td>Company Name</td><td><strong>${escapeHtml(booking.companyName || '')}</strong></td></tr>
                        ${inv.guestGST ? `<tr><td>Guest GSTIN</td><td><strong>${escapeHtml(inv.guestGST)}</strong></td></tr>` : ''}
                        <tr><td style="vertical-align:top;">Address</td><td>${escapeHtml(inv.guestAddress).replace(/\n/g, '<br>')}</td></tr>
                        <tr><td>Vehicle No.</td><td><strong>${escapeHtml(booking.vehicleNumber || '')}</strong></td></tr>
                        <tr><td>Mobile</td><td>${escapeHtml(inv.guestPhone)}</td></tr>
                    </table>
                </div>
                <div style="width:48%;">${rightInfoTable(inv, 10)}</div>
            </div>
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
            ${chargesTable(inv, { withFnb: false, cellPad: '8px 4px', spacerRow: false })}
        </div>`;
}

// Opens a print window with the given body and prints it once loaded
export function openPrintWindow({ title, bodyHtml, style, printDelay = 500, size = 'height=800,width=900', existingWindow = null }) {
    const printWindow = existingWindow || window.open('', '', size);
    if (!printWindow) {
        alert('Please allow popups for this site to print.');
        return null;
    }
    printWindow.document.open();
    printWindow.document.write(`
        <html>
        <head>
            <title>${escapeHtml(title)}</title>
            <style>${style}</style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, ${printDelay});">${bodyHtml}</body>
        </html>
    `);
    printWindow.document.close();
    return printWindow;
}
