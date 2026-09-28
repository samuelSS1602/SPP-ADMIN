/* New booking page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="new-booking" class="page-content">
                    <div class="page-header">
                        <h2>Create New Booking</h2>
                        <button class="btn-primary" onclick="openBookingsPage()">
                            <i class="fas fa-arrow-left"></i> Back to Logs
                        </button>
                    </div>
                    <div class="card" style="margin-bottom: 20px;">
                        <div class="pricing-info" style="margin-bottom: 0;">
                            <h4>Stay Profiling Instructions</h4>
                            <p>Only rooms currently marked as <strong>Available</strong> can be booked. Multiple rooms can be reserved under a single guest profile.</p>
                        </div>
                    </div>
                    <div class="card">
                        <form id="newBookingForm">
                            <div class="detail-section">
                                <h4><i class="fas fa-user-circle"></i> Guest Profiling</h4>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Guest Name *</label>
                                        <input type="text" id="bookingGuestName" required placeholder="Full Name">
                                    </div>
                                    <div class="form-group">
                                        <label>Mobile Number *</label>
                                        <input type="tel" id="bookingGuestPhone" required placeholder="10-digit mobile phone number">
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Email Address</label>
                                        <input type="email" id="bookingGuestEmail" placeholder="guest@email.com">
                                    </div>
                                    <div class="form-group" style="display: flex; gap: 10px;">
                                        <div style="flex: 1;">
                                            <label>Male Adults *</label>
                                            <input type="number" id="bookingMaleCount" value="1" min="0" required>
                                        </div>
                                        <div style="flex: 1;">
                                            <label>Female Adults *</label>
                                            <input type="number" id="bookingFemaleCount" value="0" min="0" required>
                                        </div>
                                        <div style="flex: 1;">
                                            <label>Children</label>
                                            <input type="number" id="bookingChildrenCount" value="0" min="0">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4><i class="fas fa-bed"></i> Room Scheduling & Details</h4>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Check-in Date *</label>
                                        <input type="date" id="bookingCheckIn" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Check-out Date *</label>
                                        <input type="date" id="bookingCheckOut" required>
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Check-in Time *</label>
                                        <select id="bookingCheckInTimeMode" style="margin-bottom: 6px;">
                                            <option value="manual">Enter manually</option>
                                            <option value="current">Current local time</option>
                                        </select>
                                        <input type="time" id="bookingCheckInTime" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Check-out Time *</label>
                                        <select id="bookingCheckOutTimeMode" style="margin-bottom: 6px;">
                                            <option value="manual">Enter manually</option>
                                            <option value="current">Current local time</option>
                                        </select>
                                        <input type="time" id="bookingCheckOutTime" required>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-top: 15px;">
                                    <label>Select Available Room *</label>
                                    <select id="bookingRoomId" required style="margin-bottom: 12px;"></select>
                                    <div style="background: var(--surface-muted); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <span style="font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase;">Assigned Rooms Selection</span>
                                            <button type="button" class="btn-primary" onclick="addExtraRoomToBooking()" style="font-size: 10px; padding: 4px 10px;">
                                                <i class="fas fa-plus"></i> Add Extra Room
                                            </button>
                                        </div>
                                        <div id="selectedRoomsDisplay">
                                            <small style="color: var(--text-light);">Select a room above to initialize selection list.</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4><i class="fas fa-id-card"></i> Identity Documentation</h4>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>ID Proof Type *</label>
                                        <select id="bookingIdProofType" required>
                                            <option value="">Choose verification document</option>
                                            <option value="Aadhar Card">Aadhar Card</option>
                                            <option value="Driving License">Driving License</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Voter ID">Voter ID</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>ID Card Number *</label>
                                        <input type="text" id="bookingIdProofNumber" required placeholder="Verification document number">
                                        <small id="bookingIdProofHint" style="color: var(--text-light); font-size: 11px; display: block; margin-top: 4px;">Choose ID type.</small>
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Vehicle License Plate</label>
                                        <input type="text" id="bookingVehicleNumber" placeholder="e.g., TN-43-A-1234">
                                    </div>
                                    <div class="form-group">
                                        <label>Business / Company Name</label>
                                        <input type="text" id="bookingCompanyName" placeholder="Corporate billing reference">
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Guest GST Number (Optional)</label>
                                        <input type="text" id="bookingGuestGST" placeholder="15-character GSTIN format" maxlength="15">
                                    </div>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4><i class="fas fa-wallet"></i> Payments & Tariffs</h4>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Payment Method *</label>
                                        <select id="bookingPaymentMethod" required>
                                            <option value="">Select payment method</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Credit/Debit Card</option>
                                            <option value="UPI">UPI Payment</option>
                                            <option value="Net Banking">Net Banking</option>
                                            <option value="Online">Online OTA Booking</option>
                                        </select>
                                    </div>
                                    <div class="form-group" id="onlineBookingSourceGroup" style="display: none;">
                                        <label>Booking Channel *</label>
                                        <select id="bookingSource">
                                            <option value="">Select Booking Platform</option>
                                            <option value="MMT">MakeMyTrip</option>
                                            <option value="Goibibo">Goibibo</option>
                                            <option value="Booking.com">Booking.com</option>
                                            <option value="Agoda">Agoda</option>
                                            <option value="Other">Other Channel</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Room Rate / Fare per night (₹) *</label>
                                        <input type="number" id="bookingRoomRate" min="0" required placeholder="Enter tariff amount">
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Advance Payment Collected (₹)</label>
                                        <input type="number" id="bookingAdvance" value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Recommended By</label>
                                        <input type="text" id="bookingRecommendedBy" placeholder="e.g. Friend, Agent name, Website">
                                    </div>
                                </div>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>Extras Tariff (₹)</label>
                                        <input type="number" id="bookingExtras" value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Extra Bed Tariff (₹)</label>
                                        <input type="number" id="bookingExtraBed" value="0" min="0">
                                    </div>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4><i class="fas fa-camera"></i> Live Photo Verification Feed</h4>
                                <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">Webcam integration is required to record photo verification details of both the guest profile and physical ID document.</p>
                                
                                <input type="hidden" id="bookingCustomerPhotoData">
                                <input type="hidden" id="bookingIdProofPhotoData">
                                <div class="camera-verification-grid">
                                    <div>
                                        <div class="camera-live-box" style="border: 2px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; background: #000; position: relative;">
                                            <video id="bookingCameraPreview" autoplay playsinline muted style="width: 100%; height: 200px; object-fit: cover; display: none;"></video>
                                            <div class="camera-placeholder" id="bookingCameraPlaceholder" style="height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white;">
                                                <i class="fas fa-video-slash" style="font-size: 32px; margin-bottom: 10px;"></i>
                                                <span style="font-size: 12px; font-weight: 700;">Webcam feed inactive</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                                            <button type="button" class="btn-primary" id="startBookingCameraBtn" style="flex: 1; background: var(--secondary); justify-content: center;">
                                                <i class="fas fa-play"></i> Start Feed
                                            </button>
                                            <button type="button" class="btn-primary" id="stopBookingCameraBtn" style="flex: 1; background: var(--danger); justify-content: center; display: none;">
                                                <i class="fas fa-stop"></i> Stop Feed
                                            </button>
                                        </div>
                                    </div>
                                    <div class="camera-cards-grid">
                                        <div class="capture-card">
                                            <h5>Guest Portrait Profile</h5>
                                            <div class="capture-preview" id="customerPhotoPreviewWrap" style="height: 120px; border-radius: var(--radius-sm);">
                                                <img id="customerPhotoPreview" alt="Customer Profile Portrait" style="display: none;">
                                                <span id="customerPhotoEmpty"><i class="fas fa-user-tag"></i> Profile empty</span>
                                            </div>
                                            <div style="display: flex; gap: 6px; margin-top: 6px;">
                                                <button type="button" class="btn-primary capture-btn" id="captureCustomerPhotoBtn" style="flex: 1;">
                                                    <i class="fas fa-camera"></i> Capture
                                                </button>
                                                <button type="button" class="btn-primary capture-btn" id="uploadCustomerPhotoBtn" style="flex: 1; background: var(--info, #3B82F6);" onclick="document.getElementById('uploadCustomerPhotoInput').click();">
                                                    <i class="fas fa-upload"></i> Upload
                                                </button>
                                                <input type="file" id="uploadCustomerPhotoInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(this, 'customer')">
                                            </div>
                                        </div>
                                        <div class="capture-card">
                                            <h5>ID Proof Scan</h5>
                                            <div class="capture-preview" id="idProofPhotoPreviewWrap" style="height: 120px; border-radius: var(--radius-sm);">
                                                <img id="idProofPhotoPreview" alt="ID Document Proof Photo" style="display: none;">
                                                <span id="idProofPhotoEmpty"><i class="fas fa-id-card-clip"></i> ID proof empty</span>
                                            </div>
                                            <div style="display: flex; gap: 6px; margin-top: 6px;">
                                                <button type="button" class="btn-primary capture-btn" id="captureIdProofPhotoBtn" style="flex: 1;">
                                                    <i class="fas fa-id-card"></i> Capture
                                                </button>
                                                <button type="button" class="btn-primary capture-btn" id="uploadIdProofPhotoBtn" style="flex: 1; background: var(--info, #3B82F6);" onclick="document.getElementById('uploadIdProofPhotoInput').click();">
                                                    <i class="fas fa-upload"></i> Upload
                                                </button>
                                                <input type="file" id="uploadIdProofPhotoInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(this, 'idProof')">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="btn-login" style="width: 100%; margin-top: 20px; padding: 15px; font-size: 15px;">Book Stay and Check-In</button>
                        </form>
                    </div>
                </div>
`);
    loader.remove();
})();
