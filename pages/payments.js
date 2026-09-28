/* Payments & GST page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="payments" class="page-content owner-only">
                    <div class="page-header">
                        <h2>Payments & GST Ledger</h2>
                    </div>
                    <div class="payment-summary">
                        <div class="payment-card" style="border-left-color: var(--secondary)">
                            <h4>Total Revenue (Gross)</h4>
                            <p class="payment-amount" id="paymentTotalRevenue">₹0</p>
                        </div>
                        <div class="payment-card" style="border-left-color: var(--warning)">
                            <h4>Pending Balance Due</h4>
                            <p class="payment-amount" style="color: var(--warning);" id="paymentPendingBalance">₹0</p>
                        </div>
                        <div class="payment-card" style="border-left-color: var(--success)">
                            <h4>Total Cash / Received</h4>
                            <p class="payment-amount" style="color: var(--success);" id="paymentReceivedAmount">₹0</p>
                        </div>
                        <div class="payment-card" style="border-left-color: #8B5CF6">
                            <h4>Total Room Tariff</h4>
                            <p class="payment-amount" style="color: #8B5CF6;" id="paymentTotalTariff">₹0</p>
                        </div>
                        <div class="payment-card" style="border-left-color: #F59E0B">
                            <h4>Total GST Collected (5%)</h4>
                            <p class="payment-amount" style="color: #F59E0B;" id="paymentTotalGST">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3>Lodge Guest Invoices & Billing Records</h3>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                            <div class="form-group" style="flex: 1; min-width: 180px; margin-bottom: 0;">
                                <input type="text" id="paymentSearchInput" placeholder="Search by guest name or invoice..." oninput="filterPaymentsTable()" style="height: 40px; padding: 0 12px;">
                            </div>
                            <div class="form-group" style="width: 160px; margin-bottom: 0;">
                                <select id="paymentStatusFilter" onchange="filterPaymentsTable()" style="height: 40px; padding: 0 12px;">
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            <div class="form-group" style="width: 180px; margin-bottom: 0;">
                                <select id="paymentMethodFilter" onchange="filterPaymentsTable()" style="height: 40px; padding: 0 12px;">
                                    <option value="all">All Methods</option>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Net Banking">Net Banking</option>
                                    <option value="Online">Online (OTA)</option>
                                </select>
                            </div>
                            <div class="form-group" style="width: 180px; margin-bottom: 0;">
                                <select id="paymentSortBy" onchange="filterPaymentsTable()" style="height: 40px; padding: 0 12px;">
                                    <option value="newest">Sort: Newest First</option>
                                    <option value="oldest">Sort: Oldest First</option>
                                    <option value="amount-high">Sort: Amount High→Low</option>
                                    <option value="amount-low">Sort: Amount Low→High</option>
                                    <option value="guest-az">Sort: Guest A→Z</option>
                                </select>
                            </div>
                        </div>
                        <div class="gst-print-section" style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                                <i class="fas fa-print" style="font-size: 20px; color: #16a34a;"></i>
                                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #14532d;">GST Bill Printout</h4>
                                <span style="font-size: 11px; color: #6b7280; margin-left: auto;">Filter & print invoices for GST filing</span>
                            </div>
                            <div style="margin-bottom: 14px;">
                                <label style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 8px; display: block;">Filter by Payment Method</label>
                                <div class="gst-filter-pills" id="gstFilterPills">
                                    <button class="gst-pill active" data-filter="all" onclick="setGSTPrintFilter('all')"><i class="fas fa-layer-group"></i> All Methods</button>
                                    <button class="gst-pill" data-filter="Online" onclick="setGSTPrintFilter('Online')"><i class="fas fa-globe"></i> Online Only</button>
                                    <button class="gst-pill" data-filter="UPI" onclick="setGSTPrintFilter('UPI')"><i class="fas fa-mobile-alt"></i> UPI Only</button>
                                    <button class="gst-pill" data-filter="Cash" onclick="setGSTPrintFilter('Cash')"><i class="fas fa-money-bill-wave"></i> Cash Only</button>
                                    <button class="gst-pill" data-filter="except-online" onclick="setGSTPrintFilter('except-online')"><i class="fas fa-ban"></i> Except Online</button>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 14px;">
                                <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                                    <label style="font-size: 11px; font-weight: 600;">From Date</label>
                                    <input type="date" id="gstPrintFromDate" onchange="updateGSTPrintCount()" style="height: 38px; padding: 0 10px;">
                                </div>
                                <div style="display: flex; align-items: center; padding-bottom: 4px;"><i class="fas fa-arrow-right" style="color: #9ca3af;"></i></div>
                                <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                                    <label style="font-size: 11px; font-weight: 600;">To Date</label>
                                    <input type="date" id="gstPrintToDate" onchange="updateGSTPrintCount()" style="height: 38px; padding: 0 10px;">
                                </div>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap; padding-bottom: 2px;">
                                    <button class="preset-btn" onclick="setGSTPrintPreset('today')" style="font-size: 10px; padding: 6px 10px;">Today</button>
                                    <button class="preset-btn" onclick="setGSTPrintPreset('week')" style="font-size: 10px; padding: 6px 10px;">This Week</button>
                                    <button class="preset-btn" onclick="setGSTPrintPreset('month')" style="font-size: 10px; padding: 6px 10px;">This Month</button>
                                    <button class="preset-btn" onclick="setGSTPrintPreset('all')" style="font-size: 10px; padding: 6px 10px;">All Time</button>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed #bbf7d0;">
                                <div id="gstPrintRecordCount" style="font-size: 13px; font-weight: 600; color: #374151;">
                                    <i class="fas fa-file-invoice" style="color: #16a34a;"></i> <span>Select filters to see matching bills</span>
                                </div>
                                <button class="btn-primary" onclick="printGSTBills()" style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 10px 20px; font-size: 13px; gap: 8px;">
                                    <i class="fas fa-print"></i> Print GST Bills
                                </button>
                            </div>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Invoice ID</th>
                                        <th>Guest Name</th>
                                        <th>Room(s)</th>
                                        <th>Check-In</th>
                                        <th>Method</th>
                                        <th>Room Tariff (₹)</th>
                                        <th>GST 5% (₹)</th>
                                        <th>Extras (₹)</th>
                                        <th>Total (₹)</th>
                                        <th>Advance (₹)</th>
                                        <th>Balance (₹)</th>
                                        <th>Status</th>
                                        <th>Add Extra</th>
                                        <th>Tax Bill</th>
                                    </tr>
                                </thead>
                                <tbody id="paymentsTable"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
