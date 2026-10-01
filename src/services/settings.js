import { data } from '../store/store.js';
import { commit, saveDataToStorage } from '../store/persistence.js';
import { addAuditLog } from './audit.js';

const SEED_STAFF = [
    { id: 'ST001', name: 'John Doe', role: 'Manager', phone: '9842816621', email: 'john@sripadmavati.com', status: 'Active', shift: 'Morning' },
    { id: 'ST002', name: 'Jane Smith', role: 'Receptionist', phone: '6369216621', email: 'jane@sripadmavati.com', status: 'Active', shift: 'Evening' },
    { id: 'ST003', name: 'Kumar Swami', role: 'Housekeeping', phone: '9488886101', email: 'kumar@sripadmavati.com', status: 'Active', shift: 'Morning' }
];

const SEED_HOUSEKEEPING = [
    { id: 'HK001', roomId: 101, roomName: 'F1-102', staffName: 'Kumar Swami', priority: 'Normal', status: 'todo', notes: 'Change linen and vacuum floor' },
    { id: 'HK002', roomId: 105, roomName: 'F1-101', staffName: 'Kumar Swami', priority: 'High', status: 'progress', notes: 'Technical cleaning before check-in' }
];

// Defaults for records the console expects to exist
export function seedConsoleDefaults() {
    if (!data.staff || data.staff.length === 0) data.staff = SEED_STAFF.map(s => ({ ...s }));
    if (!data.housekeepingTasks || data.housekeepingTasks.length === 0) data.housekeepingTasks = SEED_HOUSEKEEPING.map(t => ({ ...t }));
    if (!data.notifications || data.notifications.length === 0) {
        data.notifications = [{ id: 'NT001', type: 'new-booking', title: 'System Online', message: 'Lodge admin console loaded successfully.', time: new Date().toISOString(), read: false }];
    }
    if (!data.auditLogs || data.auditLogs.length === 0) {
        data.auditLogs = [{ id: 'LOG001', time: new Date().toISOString(), action: 'System Init', description: 'Redesigned administration panel initialized.' }];
    }
    if (!data.settings) {
        data.settings = {
            lodgeName: 'Sri Padmavati Pleasants',
            gstNumber: '33ANCPP8116B1ZF',
            taxes: { cgst: 2.5, sgst: 2.5 },
            roomCategories: ['Single', 'Double', 'Family', 'Suite'],
            backupSchedule: 'Weekly',
            weekendSurcharge: 10,
            holidaySurgeActive: false,
            holidaySurgeRate: 20
        };
    } else {
        if (data.settings.weekendSurcharge === undefined) data.settings.weekendSurcharge = 10;
        if (data.settings.holidaySurgeActive === undefined) data.settings.holidaySurgeActive = false;
        if (data.settings.holidaySurgeRate === undefined) data.settings.holidaySurgeRate = 20;
    }
}

export function saveLodgeSettings({ lodgeName, address, phone, gstNumber }) {
    if (!data.settings) data.settings = {};
    Object.assign(data.settings, { lodgeName, address, phone, gstNumber });
    commit();
    alert('Lodge Profile Settings saved successfully!');
    addAuditLog('System Settings', 'Lodge Profile parameters modified.');
}

export function savePricingSettings({ cgst, sgst, defaultAdvance }) {
    if (!data.settings) data.settings = {};
    data.settings.taxes = { cgst, sgst };
    data.settings.defaultAdvance = defaultAdvance;
    commit();
    alert('Pricing and Tax Rates saved successfully!');
    addAuditLog('System Settings', 'Pricing & Tax configurations modified.');
}

export function saveSurchargeSettings({ weekendSurcharge, holidaySurgeActive, holidaySurgeRate }) {
    if (!data.settings) data.settings = {};
    Object.assign(data.settings, { weekendSurcharge, holidaySurgeActive, holidaySurgeRate });
    commit();
    alert('Dynamic surge rules saved successfully!');
    addAuditLog('System Settings', `Dynamic tariff surcharges modified (Weekend: ${weekendSurcharge}%, Holiday: ${holidaySurgeActive ? 'ON (' + holidaySurgeRate + '%)' : 'OFF'})`);
}

// --- SYSTEM BACKUP & RESTORE ---
export function exportFullSystemBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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

export function importSystemBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported || typeof imported !== 'object') throw new Error('Invalid JSON format');
            if (!Array.isArray(imported.rooms) || !Array.isArray(imported.bookings)) {
                throw new Error('Incompatible backup format. Missing rooms or bookings tables.');
            }
            if (!confirm('Are you sure you want to restore? This will replace your local database cache with the backup data!')) return;

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
            // Let the IndexedDB write settle before reloading
            setTimeout(() => window.location.reload(), 300);
        } catch (err) {
            alert('Restore failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}
