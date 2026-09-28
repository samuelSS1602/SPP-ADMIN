/* Room pricing page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="pricing" class="page-content">
                    <div class="page-header">
                        <h2>Room Pricing & Tariff Structure</h2>
                    </div>
                    <div class="card owner-only" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-crown" style="color: var(--warning);"></i> Dynamic Surge Pricing & Surcharge Rules</h3>
                        </div>
                        <form id="surchargePricingForm" onsubmit="saveSurchargeSettings(event)" style="padding: 15px;">
                            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 15px;">
                                Configure automatic pricing multipliers for high-occupancy or seasonal booking days. Surcharges are automatically calculated and applied when processing check-ins.
                            </p>
                            <div class="form-row surcharge-form-row" style="margin-bottom: 15px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label>Weekend Surcharge Percentage (%)</label>
                                    <input type="number" step="0.1" min="0" max="100" id="setWeekendSurcharge" value="0" placeholder="e.g. 10 for +10% on Fri-Sun">
                                    <small style="color: var(--text-light); font-size: 11px; margin-top: 4px; display: block;">Applies automatically if check-in falls on Fri, Sat, or Sun.</small>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label>Global Holiday Surge Status</label>
                                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                                        <label class="switch-container">
                                            <input type="checkbox" id="setHolidaySurgeActive" onchange="toggleHolidaySurgeLabel(this)">
                                            <span class="slider"></span>
                                        </label>
                                        <span id="holidaySurgeLabel" style="font-size: 13px; font-weight: bold; color: var(--text-light);">Inactive</span>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label>Global Holiday Surge Percentage (%)</label>
                                    <input type="number" step="0.1" min="0" max="100" id="setHolidaySurgeRate" value="0" placeholder="e.g. 20 for +20% global markup">
                                    <small style="color: var(--text-light); font-size: 11px; margin-top: 4px; display: block;">Applies globally to all rooms when active.</small>
                                </div>
                            </div>
                            <button type="submit" class="btn-primary" style="background: var(--secondary);"><i class="fas fa-save"></i> Save Surcharge Rules</button>
                        </form>
                    </div>
                    
                    <div class="card">
                        <div class="pricing-info">
                            <h4>Current General Tariff Rules</h4>
                            <p><strong>General Base Rate:</strong> ₹2,500 per night (configurable for each room below).</p>
                            <p><strong>General Advance Target:</strong> ₹1,000 on Check-in.</p>
                            <p><strong>Final Checkout Balance formula:</strong> [Rate per day * Stayed nights] - Advance + Extras + Extra Bed.</p>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Room ID</th>
                                        <th>Floor</th>
                                        <th>Room Category</th>
                                        <th>Current Tariff (₹)</th>
                                        <th>Update Rate Input</th>
                                        <th>Confirm Change</th>
                                    </tr>
                                </thead>
                                <tbody id="pricingTable"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
