/* Edit booking modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div class="modal" id="editBookingModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Booking Specifications</h3>
                <span class="close-btn" onclick="closeEditBookingModal()"><i class="fas fa-times"></i></span>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <input type="hidden" id="editBookingId">
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Guest Name</label>
                        <input type="text" id="editGuestName">
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" id="editGuestPhone">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="editGuestEmail">
                    </div>
                    <div class="form-group">
                        <label>Advance Amount (₹)</label>
                        <input type="number" id="editAdvanceAmount" min="0">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label style="margin: 0;">Assigned Room(s)</label>
                        <button type="button" class="btn-primary" onclick="openEditAddRoomModal()" style="padding: 3px 6px; font-size: 10px;">
                            <i class="fas fa-plus"></i> Add Room
                        </button>
                    </div>
                    <div id="editRoomsList" style="background: var(--surface-muted); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Total Room Rate (₹)</label>
                        <input type="number" id="editRoomRate" min="0">
                    </div>
                    <div class="form-group">
                        <label>Extra Amount (₹)</label>
                        <input type="number" id="editExtras" min="0">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group" style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Male Adults</label>
                            <input type="number" id="editMaleCount" min="0" value="1">
                        </div>
                        <div style="flex: 1;">
                            <label>Female Adults</label>
                            <input type="number" id="editFemaleCount" min="0" value="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Children</label>
                        <input type="number" id="editChildrenCount" min="0" value="0">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Extra Bed Charges (₹)</label>
                        <input type="number" id="editExtraBed" min="0" value="0">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Vehicle Number</label>
                        <input type="text" id="editVehicleNumber">
                    </div>
                    <div class="form-group">
                        <label>Company Name</label>
                        <input type="text" id="editCompanyName">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Guest GST Number</label>
                    <input type="text" id="editGuestGST" maxlength="15">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Recommended By</label>
                    <input type="text" id="editRecommendedBy" placeholder="e.g. Friend, Agent name, Website">
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="editPaymentMethod" onchange="toggleEditBookingSource()">
                            <option value="Cash">Cash</option>
                            <option value="Card">Credit/Debit Card</option>
                            <option value="UPI">UPI Payment</option>
                            <option value="Net Banking">Net Banking</option>
                            <option value="Online">Online OTA Booking</option>
                        </select>
                    </div>
                    <div class="form-group" id="editOnlineBookingSourceGroup" style="display: none;">
                        <label>Booking Channel</label>
                        <select id="editBookingSource">
                            <option value="">Select Platform</option>
                            <option value="MMT">MakeMyTrip</option>
                            <option value="Goibibo">Goibibo</option>
                            <option value="Booking.com">Booking.com</option>
                            <option value="Agoda">Agoda</option>
                            <option value="Other">Other Channel</option>
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Check-in Date</label>
                        <input type="date" id="editCheckInDate">
                    </div>
                    <div class="form-group">
                        <label>Check-in Time</label>
                        <input type="time" id="editCheckInTime">
                    </div>
                </div>
                <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group">
                        <label>Check-out Date</label>
                        <input type="date" id="editCheckOutDate">
                    </div>
                    <div class="form-group">
                        <label>Check-out Time</label>
                        <input type="time" id="editCheckOutTime">
                    </div>
                </div>
                <button class="btn-primary" onclick="saveEditedBooking()" style="width: 100%; justify-content: center; margin-top: 10px; padding: 12px;">Save Booking Specifications</button>
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
