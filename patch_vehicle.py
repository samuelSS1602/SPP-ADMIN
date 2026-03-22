import os

# 1. Update index.html
index_path = 'd:/PROGRAM/LODGE ADMIN/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    index_data = f.read()

target_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>ID Proof Type *</label>
                                    <select id="bookingIdProofType" required>
                                        <option value="">Select ID Type</option>
                                        <option value="Aadhar Card">Aadhar Card</option>
                                        <option value="Driving License">Driving License</option>
                                        <option value="Passport">Passport</option>
                                        <option value="Voter ID">Voter ID</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>ID Proof Number *</label>
                                    <input type="text" id="bookingIdProofNumber" required>
                                    <small id="bookingIdProofHint" style="color: var(--text-light); font-size: 11px; display: block; margin-top: 6px;">Select ID type to see required format</small>
                                </div>
                            </div>"""

replacement_html = """                            <div class="form-row">
                                <div class="form-group">
                                    <label>ID Proof Type *</label>
                                    <select id="bookingIdProofType" required>
                                        <option value="">Select ID Type</option>
                                        <option value="Aadhar Card">Aadhar Card</option>
                                        <option value="Driving License">Driving License</option>
                                        <option value="Passport">Passport</option>
                                        <option value="Voter ID">Voter ID</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>ID Proof Number *</label>
                                    <input type="text" id="bookingIdProofNumber" required>
                                    <small id="bookingIdProofHint" style="color: var(--text-light); font-size: 11px; display: block; margin-top: 6px;">Select ID type to see required format</small>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Vehicle Number</label>
                                    <input type="text" id="bookingVehicleNumber" placeholder="e.g. TN-43-A-1234">
                                </div>
                                <div class="form-group">
                                    <label>Company Name (Optional)</label>
                                    <input type="text" id="bookingCompanyName" placeholder="e.g. TCS">
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
old_extract = """    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);"""

new_extract = """    const idProofPhotoData = document.getElementById('bookingIdProofPhotoData').value;
    const maleCount = parseInt(document.getElementById('bookingMaleCount') ? document.getElementById('bookingMaleCount').value : '1', 10);
    const femaleCount = parseInt(document.getElementById('bookingFemaleCount') ? document.getElementById('bookingFemaleCount').value : '0', 10);
    const childrenCount = parseInt(document.getElementById('bookingChildrenCount') ? document.getElementById('bookingChildrenCount').value : '0', 10);
    const vehicleNumber = document.getElementById('bookingVehicleNumber') ? document.getElementById('bookingVehicleNumber').value.trim() : '';
    const companyName = document.getElementById('bookingCompanyName') ? document.getElementById('bookingCompanyName').value.trim() : '';"""

if old_extract in booking_data:
    booking_data = booking_data.replace(old_extract, new_extract)

# creation payload
old_create = """        paymentMethod,
        status: 'confirmed',
        roomRate: totalRoomRate,  // Total of all rooms
        advance,
        extras,
        customerPhoto: customerPhotoData,
        idProofPhoto: idProofPhotoData,"""
new_create = """        paymentMethod,
        status: 'confirmed',
        roomRate: totalRoomRate,  // Total of all rooms
        advance,
        extras,
        extraBed,
        maleCount,
        femaleCount,
        childrenCount,
        vehicleNumber,
        companyName,
        discount: 0,
        customerPhoto: customerPhotoData,
        idProofPhoto: idProofPhotoData,"""

if old_create in booking_data:
    booking_data = booking_data.replace(old_create, new_create)

with open(booking_path, 'w', encoding='utf-8') as f:
    f.write(booking_data)


# 3. Update receipt.js
receipt_path = 'd:/PROGRAM/LODGE ADMIN/receipt.js'
with open(receipt_path, 'r', encoding='utf-8') as f:
    receipt_data = f.read()

old_table = """                        <tr><td>Company Name</td><td></td></tr>
                        <tr><td style="vertical-align:top;">Address</td><td>${guestAddress}</td></tr>
                        <tr><td>&nbsp;</td><td></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>"""
new_table = """                        <tr><td>Company Name</td><td><strong>${booking.companyName || ''}</strong></td></tr>
                        <tr><td style="vertical-align:top;">Address</td><td>${guestAddress}</td></tr>
                        <tr><td>Vehicle No.</td><td><strong>${booking.vehicleNumber || ''}</strong></td></tr>
                        <tr><td>Mobile</td><td>${guestPhone}</td></tr>"""

if old_table in receipt_data:
    receipt_data = receipt_data.replace(old_table, new_table)

with open(receipt_path, 'w', encoding='utf-8') as f:
    f.write(receipt_data)

print("Vehicle details and proper payload injection completed.")
