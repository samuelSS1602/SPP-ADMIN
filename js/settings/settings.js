
// --- SETTINGS FORM MODULE ---
function initSettings() {
    // Populate form values
    const settings = data.settings || { lodgeName: 'Sri Padmavati Pleasants', gstNumber: '33ANCPP8116B1ZF', taxes: { cgst: 2.5, sgst: 2.5 } };
    document.getElementById('setLodgeName').value = settings.lodgeName || 'Sri Padmavati Pleasants';
    document.getElementById('setLodgeAddress').value = settings.address || 'Palani, Tamil Nadu - 624601';
    document.getElementById('setLodgePhone').value = settings.phone || '6369216621';
    document.getElementById('setLodgeGst').value = settings.gstNumber || '33ANCPP8116B1ZF';
    
    document.getElementById('setCGSTRate').value = settings.taxes ? settings.taxes.cgst : 2.5;
    document.getElementById('setSGSTRate').value = settings.taxes ? settings.taxes.sgst : 2.5;
    document.getElementById('setDefaultAdvance').value = settings.defaultAdvance || 1000;
}

function showSettingsPanel(panelId, btn) {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    
    document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function saveLodgeSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    data.settings.lodgeName = document.getElementById('setLodgeName').value.trim();
    data.settings.address = document.getElementById('setLodgeAddress').value.trim();
    data.settings.phone = document.getElementById('setLodgePhone').value.trim();
    data.settings.gstNumber = document.getElementById('setLodgeGst').value.trim();
    
    saveDataToStorage();
    alert('Lodge Profile Settings saved successfully!');
    addAuditLog('System Settings', 'Lodge Profile parameters modified.');
}

function savePricingSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    data.settings.taxes = {
        cgst: parseFloat(document.getElementById('setCGSTRate').value || '2.5'),
        sgst: parseFloat(document.getElementById('setSGSTRate').value || '2.5')
    };
    data.settings.defaultAdvance = parseFloat(document.getElementById('setDefaultAdvance').value || '1000');
    
    saveDataToStorage();
    alert('Pricing and Tax Rates saved successfully!');
    addAuditLog('System Settings', 'Pricing & Tax configurations modified.');
}

// --- SYSTEM BACKUP & RESTORE ---
function exportFullSystemBackup() {
    const backupStr = JSON.stringify(data, null, 2);
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SriPadmavatiPleasants_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAuditLog('System Settings', 'Full system database backup downloaded.');
}

function triggerImportBackup() {
    document.getElementById('backupFileInput').click();
}

function importSystemBackup(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported || typeof imported !== 'object') throw new Error('Invalid JSON format');
            
            // Validate basic structure
            if (!Array.isArray(imported.rooms) || !Array.isArray(imported.bookings)) {
                throw new Error('Incompatible backup format. Missing rooms or bookings tables.');
            }
            
            if (confirm('Are you sure you want to restore? This will replace your local database cache with the backup data!')) {
                data.rooms = imported.rooms;
                data.bookings = imported.bookings;
                data.customers = imported.customers || [];
                data.guests = imported.guests || [];
                data.diary = imported.diary || {};
                data.staff = imported.staff || [];
                data.housekeepingTasks = imported.housekeepingTasks || [];
                data.settings = imported.settings || data.settings;
                data.notifications = imported.notifications || [];
                data.auditLogs = imported.auditLogs || [];
                
                saveDataToStorage();
                alert('Database restore completed successfully! Reloading...');
                location.reload();
            }
        } catch(err) {
            alert('Restore failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}
