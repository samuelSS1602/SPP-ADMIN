
// --- DYNAMIC SURCHARGE CONFIGURATIONS ---
function loadSurchargeSettings() {
    const settings = data.settings || {};
    document.getElementById('setWeekendSurcharge').value = settings.weekendSurcharge || 0;
    const active = !!settings.holidaySurgeActive;
    document.getElementById('setHolidaySurgeActive').checked = active;
    document.getElementById('holidaySurgeLabel').textContent = active ? 'Active' : 'Inactive';
    document.getElementById('holidaySurgeLabel').style.color = active ? 'var(--success)' : 'var(--text-light)';
    document.getElementById('setHolidaySurgeRate').value = settings.holidaySurgeRate || 0;
}

function toggleHolidaySurgeLabel(checkbox) {
    const active = checkbox.checked;
    const label = document.getElementById('holidaySurgeLabel');
    if (label) {
        label.textContent = active ? 'Active' : 'Inactive';
        label.style.color = active ? 'var(--success)' : 'var(--text-light)';
    }
}

function saveSurchargeSettings(e) {
    e.preventDefault();
    if (!data.settings) data.settings = {};
    
    data.settings.weekendSurcharge = parseFloat(document.getElementById('setWeekendSurcharge').value || '0');
    data.settings.holidaySurgeActive = document.getElementById('setHolidaySurgeActive').checked;
    data.settings.holidaySurgeRate = parseFloat(document.getElementById('setHolidaySurgeRate').value || '0');
    
    saveDataToStorage();
    alert('Dynamic surge rules saved successfully!');
    addAuditLog('System Settings', `Dynamic tariff surcharges modified (Weekend: ${data.settings.weekendSurcharge}%, Holiday: ${data.settings.holidaySurgeActive ? 'ON (' + data.settings.holidaySurgeRate + '%)' : 'OFF'})`);
}
