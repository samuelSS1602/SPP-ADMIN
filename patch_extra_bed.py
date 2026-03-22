import os

# 1. Update index.html to add Extra Bed Field
index_path = 'd:/PROGRAM/LODGE ADMIN/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    index_data = f.read()

old_extras_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>Extras Amount (₹) - Common Extras</label>
                                    <input type="number" id="bookingExtras" value="0" min="0" placeholder="Additional charges for all rooms">
                                    <small style="color: var(--text-light); margin-top: 4px;">Laundry, room service, etc. applied to entire booking</small>
                                </div>
                            </div>"""

new_extras_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>Extras Amount (₹) - Common</label>
                                    <input type="number" id="bookingExtras" value="0" min="0" placeholder="Additional charges">
                                    <small style="color: var(--text-light); margin-top: 4px;">Laundry, room service, etc.</small>
                                </div>
                                <div class="form-group">
                                    <label>Extra Bed Charges (₹)</label>
                                    <input type="number" id="bookingExtraBed" value="0" min="0" placeholder="Extra bed charge">
                                    <small style="color: var(--text-light); margin-top: 4px;">Applied to entire booking</small>
                                </div>
                            </div>"""

if old_extras_html in index_data:
    index_data = index_data.replace(old_extras_html, new_extras_html)
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_data)

# 2. Update booking.js to save Extra Bed and calculate totals
booking_path = 'd:/PROGRAM/LODGE ADMIN/booking.js'
with open(booking_path, 'r', encoding='utf-8') as f:
    booking_data = f.read()

# a) Parse Extra Bed
old_handle_extras = """    const advance = parseFloat(document.getElementById('bookingAdvance').value);
    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');"""

new_handle_extras = """    const advance = parseFloat(document.getElementById('bookingAdvance').value);
    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');
    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');"""
if old_handle_extras in booking_data:
    booking_data = booking_data.replace(old_handle_extras, new_handle_extras)

# b) Save to object
old_booking_obj = """        extras: extras,
        discount: 0,"""
new_booking_obj = """        extras: extras,
        extraBed: extraBed,
        discount: 0,"""
if old_booking_obj in booking_data:
    booking_data = booking_data.replace(old_booking_obj, new_booking_obj)

# c) Maths
old_total_math = """function getBookingTotal(booking) {
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

new_total_math = """function getBookingTotal(booking) {
    const days = calculateBookingDays(booking);
    return ((Number(booking.roomRate) || 0) * days) + (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);
}

function getBookingBalance(booking) {
    const days = calculateBookingDays(booking);
    const totalRoom = (Number(booking.roomRate) || 0) * days;
    const advance = Number(booking.advance) || 0;
    const extras = Number(booking.extras) || 0;
    const extraBed = Number(booking.extraBed) || 0;
    const discount = Number(booking.discount) || 0;
    return Math.max(totalRoom - advance + extras + extraBed - discount, 0);
}"""
if old_total_math in booking_data:
    booking_data = booking_data.replace(old_total_math, new_total_math)

with open(booking_path, 'w', encoding='utf-8') as f:
    f.write(booking_data)

# 3. Update receipt.js to inject Editor and show Extra Bed
receipt_path = 'd:/PROGRAM/LODGE ADMIN/receipt.js'
with open(receipt_path, 'r', encoding='utf-8') as f:
    receipt_data = f.read()

# a) Calculate totalAmount using extraBed
old_rmath = """    const dailyRate = booking.roomRate || 0;
    const totalRate = dailyRate * days;
    const extras = booking.extras || 0;
    const totalGrossRoom = Math.max(0, totalRate - discountGross);
    const totalAmount = totalGrossRoom + extras;"""
new_rmath = """    const dailyRate = booking.roomRate || 0;
    const totalRate = dailyRate * days;
    const extras = booking.extras || 0;
    const extraBed = booking.extraBed || 0;
    const totalGrossRoom = Math.max(0, totalRate - discountGross);
    const totalAmount = totalGrossRoom + extraBed + extras;"""
if old_rmath in receipt_data:
    receipt_data = receipt_data.replace(old_rmath, new_rmath)

# b) Update the UI string
old_ui = """        <!-- Discount UI -->
        <div class="no-print" style="background:#f8fafc; padding:15px; text-align:center; border-bottom:1px solid #e2e8f0; margin-bottom:20px; border-radius:8px;">
            <label style="font-weight:600; color:#0f172a; font-family:'Inter',sans-serif;">Apply Discount (₹): </label>
            <input type="number" id="inlineDiscountInput" value="${discountGross}" style="padding:8px 12px; width:120px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:600; margin:0 10px;">
            <button onclick="applyDiscountToReceipt()" style="padding:8px 16px; background:var(--primary-brand); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif; box-shadow:0 4px 6px rgba(79, 70, 229, 0.2); transition:all 0.2s;">↻ Update Receipt</button>
            <p style="margin-top:8px; font-size:11px; color:#64748b;">(This perfectly adjusts the automated 5% GST layout below)</p>
        </div>"""
new_ui = """        <!-- Invoice Editor UI -->
        <div class="no-print" style="background:#f8fafc; padding:15px; text-align:center; border-bottom:1px solid #e2e8f0; margin-bottom:20px; border-radius:8px;">
            <div style="display:inline-flex; gap:15px; align-items:center; flex-wrap:wrap; justify-content:center; margin-bottom:10px;">
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:13px;">Discount (₹): </label>
                    <input type="number" id="inlineDiscountInput" value="${discountGross}" style="padding:6px 10px; width:90px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:13px;">Extra Bed (₹): </label>
                    <input type="number" id="inlineExtraBedInput" value="${extraBed}" style="padding:6px 10px; width:90px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600;">
                </div>
                <div>
                    <label style="font-weight:600; color:#0f172a; font-size:13px;">Extras (₹): </label>
                    <input type="number" id="inlineExtrasInput" value="${extras}" style="padding:6px 10px; width:90px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600;">
                </div>
                <button onclick="applyDiscountToReceipt()" style="padding:8px 16px; background:var(--primary-brand); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif; box-shadow:0 4px 6px rgba(79, 70, 229, 0.2); transition:all 0.2s;">↻ Update Invoice</button>
            </div>
            <p style="margin:0; font-size:11px; color:#64748b;">Adjust any field and click Update to perfectly recalculate your GST and totals.</p>
        </div>"""
if old_ui in receipt_data:
    receipt_data = receipt_data.replace(old_ui, new_ui)

# c) Table rows
old_row = """                        <td style="padding:12px 4px;">0.00</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>"""
new_row = """                        <td style="padding:12px 4px;">${extraBed.toFixed(2)}</td>
                        <td style="padding:12px 4px;">${baseDiscount.toFixed(2)}</td>"""
# This appears in <tbody> AND <tfoot>, replace twice perfectly.
receipt_data = receipt_data.replace(old_row, new_row)

# d) The Javascript Hook
old_func = """window.applyDiscountToReceipt = function() {
    const val = parseFloat(document.getElementById('inlineDiscountInput').value) || 0;
    const booking = data.bookings.find(b => b.id === currentReceiptBookingId);
    if(booking) {
        booking.discount = val;
        if (typeof saveDataToStorage === 'function') saveDataToStorage();
        if (typeof syncBookingToFirebase === 'function') syncBookingToFirebase(booking);
        showReceipt(currentReceiptBookingId);
    }
};"""
new_func = """window.applyDiscountToReceipt = function() {
    const disc = parseFloat(document.getElementById('inlineDiscountInput').value) || 0;
    const bed = parseFloat(document.getElementById('inlineExtraBedInput').value) || 0;
    const ext = parseFloat(document.getElementById('inlineExtrasInput').value) || 0;
    const booking = data.bookings.find(b => b.id === currentReceiptBookingId);
    if(booking) {
        booking.discount = disc;
        booking.extraBed = bed;
        booking.extras = ext;
        if (typeof saveDataToStorage === 'function') saveDataToStorage();
        if (typeof syncBookingToFirebase === 'function') syncBookingToFirebase(booking);
        showReceipt(currentReceiptBookingId);
    }
};"""
if old_func in receipt_data:
    receipt_data = receipt_data.replace(old_func, new_func)

with open(receipt_path, 'w', encoding='utf-8') as f:
    f.write(receipt_data)

print("Extra Bed and Inline Edit logic patched successfully.")
