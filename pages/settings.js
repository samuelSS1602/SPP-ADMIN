/* Settings page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="settings-tab" class="page-content">
                    <div class="page-header">
                        <h2>Console System Settings</h2>
                    </div>
                    <div class="settings-container">
                        <nav class="settings-nav">
                            <button class="settings-nav-item active" onclick="showSettingsPanel('settingsLodge', this)">Lodge Profile</button>
                            <button class="settings-nav-item" onclick="showSettingsPanel('settingsPricing', this)">Pricing & Tax Rules</button>
                            <button class="settings-nav-item" onclick="showSettingsPanel('settingsPermissions', this)">User Permissions</button>
                            <button class="settings-nav-item" onclick="showSettingsPanel('settingsBackups', this)">System Backup & Restore</button>
                        </nav>
                        <div class="settings-content">
                            <div id="settingsLodge" class="settings-panel active">
                                <h3>Lodge General Information</h3>
                                <form id="settingsLodgeForm" onsubmit="saveLodgeSettings(event)">
                                    <div class="form-group" style="margin-bottom: 12px;">
                                        <label>Lodge / Hotel Name *</label>
                                        <input type="text" id="setLodgeName" value="Sri Padmavati Pleasants" required>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 12px;">
                                        <label>Address Details</label>
                                        <textarea id="setLodgeAddress" placeholder="Lodge Address">Palani, Tamil Nadu - 624601</textarea>
                                    </div>
                                    <div class="form-row" style="margin-bottom: 12px;">
                                        <div class="form-group">
                                            <label>Support Phone number</label>
                                            <input type="tel" id="setLodgePhone" value="6369216621">
                                        </div>
                                        <div class="form-group">
                                            <label>Hotel GSTIN *</label>
                                            <input type="text" id="setLodgeGst" value="33ANCPP8116B1ZF" required>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn-primary" style="margin-top: 10px;">Save Profile Settings</button>
                                </form>
                            </div>
                            <div id="settingsPricing" class="settings-panel">
                                <h3>Pricing Configuration</h3>
                                <form id="settingsPricingForm" onsubmit="savePricingSettings(event)">
                                    <div class="form-row" style="margin-bottom: 12px;">
                                        <div class="form-group">
                                            <label>CGST Rate Percentage (%)</label>
                                            <input type="number" step="0.01" id="setCGSTRate" value="2.5">
                                        </div>
                                        <div class="form-group">
                                            <label>SGST Rate Percentage (%)</label>
                                            <input type="number" step="0.01" id="setSGSTRate" value="2.5">
                                        </div>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 12px;">
                                        <label>Default Room Advance Tariff (₹)</label>
                                        <input type="number" id="setDefaultAdvance" value="1000">
                                    </div>
                                    <button type="submit" class="btn-primary" style="margin-top: 10px;">Save Pricing Configurations</button>
                                </form>
                            </div>
                            <div id="settingsPermissions" class="settings-panel">
                                <h3>User Roles & Permissions (Mock)</h3>
                                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                                    <div style="padding: 10px; background: var(--surface-muted); border-radius: 6px;">
                                        <strong>👑 Owner Account (sppowner@gmail.com)</strong>
                                        <p style="font-size: 12px; color: var(--text-light); margin-top: 4px;">Unrestricted console capabilities: delete records, modify pricing, audit logs, financials, analytics access.</p>
                                    </div>
                                    <div style="padding: 10px; background: var(--surface-muted); border-radius: 6px;">
                                        <strong>🛎️ Receptionist Account (Default)</strong>
                                        <p style="font-size: 12px; color: var(--text-light); margin-top: 4px;">Restricted capabilities: cannot delete bookings, cannot view revenue totals, cannot edit base pricing variables.</p>
                                    </div>
                                </div>
                            </div>
                            <div id="settingsBackups" class="settings-panel">
                                <h3>System Caching & Recovery</h3>
                                <div class="pricing-info" style="margin-bottom: 20px;">
                                    <p>Your database caches local copies in browser memory. In addition, if Firebase is connected, bookings automatically synchronize with the cloud database.</p>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn-primary" onclick="exportFullSystemBackup()"><i class="fas fa-file-export"></i> Download Backup JSON</button>
                                    <button class="btn-primary" onclick="triggerImportBackup()" style="background: var(--warning);"><i class="fas fa-file-import"></i> Upload Backup JSON</button>
                                    <input type="file" id="backupFileInput" style="display: none;" onchange="importSystemBackup(this)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
