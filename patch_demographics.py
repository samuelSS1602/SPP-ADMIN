import os

# 1. Update index.html
index_path = 'd:/PROGRAM/LODGE ADMIN/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    index_data = f.read()

target_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="bookingGuestEmail">
                                </div>
                                <div class="form-group">
                                    <label>Select First Room *</label>
                                    <select id="bookingRoomId" required></select>
                                </div>
                            </div>"""

replacement_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="bookingGuestEmail">
                                </div>
                                <div class="form-group">
                                    <label>Select First Room *</label>
                                    <select id="bookingRoomId" required></select>
                                </div>
                            </div>
                            
                            <!-- Guest Demographics -->
                            <div class="form-row" style="margin-bottom: 20px;">
                                <div class="form-group" style="flex: 1;">
                                    <label>Male Adults *</label>
                                    <input type="number" id="bookingMaleCount" value="1" min="0" required>
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label>Female Adults *</label>
                                    <input type="number" id="bookingFemaleCount" value="0" min="0" required>
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label>Children</label>
                                    <input type="number" id="bookingChildrenCount" value="0" min="0">
                                </div>
                            </div>"""

if target_html in index_data:
    index_data = index_data.replace(target_html, replacement_html)
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_data)


# 2. Update booking.js
booking_path = 'd:/PROGRAM/LODGE ADMIN/booking.js'
with open(booking_path, 'r', encoding='utf-8') as f:
    booking_data = f.read()

# extraction
old_extract = """    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;
    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;"""

new_extract = """    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;
    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);"""

if old_extract in booking_data:
    booking_data = booking_data.replace(old_extract, new_extract)
else:
    # fallback if extraBed script wasn't fully matched
    old_extract_fallback = """    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');
    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;"""
    new_extract_fallback = """    const extras = parseFloat(document.getElementById('bookingExtras').value || '0');
    const extraBed = parseFloat(document.getElementById('bookingExtraBed').value || '0');
    const customerPhotoData = document.getElementById('bookingCustomerPhotoData').value;
    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);"""
    if old_extract_fallback in booking_data:
        booking_data = booking_data.replace(old_extract_fallback, new_extract_fallback)

# creation
old_create = """        paymentMethod: paymentMethod,
        advance: advance,
        extras: extras,"""
new_create = """        paymentMethod: paymentMethod,
        advance: advance,
        extras: extras,
        maleCount: maleCount,
        femaleCount: femaleCount,
        childrenCount: childrenCount,"""

if old_create in booking_data:
    booking_data = booking_data.replace(old_create, new_create)

with open(booking_path, 'w', encoding='utf-8') as f:
    f.write(booking_data)


# 3. Update receipt.js
receipt_path = 'd:/PROGRAM/LODGE ADMIN/receipt.js'
with open(receipt_path, 'r', encoding='utf-8') as f:
    receipt_data = f.read()

old_subline = """    const adultCount = booking.adults || 1;
    const childrenCount = booking.children || 0;
    const guestSubLine = `Male : ${adultCount} FeMale :0 Child : ${childrenCount}`;"""
    
new_subline = """    const mCount = booking.maleCount !== undefined ? booking.maleCount : (booking.adults || 1);
    const fCount = booking.femaleCount || 0;
    const cCount = booking.childrenCount !== undefined ? booking.childrenCount : (booking.children || 0);
    const guestSubLine = `Male : ${mCount} Female : ${fCount} Child : ${cCount}`;"""

if old_subline in receipt_data:
    receipt_data = receipt_data.replace(old_subline, new_subline)

with open(receipt_path, 'w', encoding='utf-8') as f:
    f.write(receipt_data)

print("Demographics injected!")
