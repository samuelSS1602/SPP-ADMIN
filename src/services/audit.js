import { collection, doc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { data, notify, session } from '../store/store.js';
import { saveDataToStorage } from '../store/persistence.js';
import { fb, isCloudReady } from '../firebase/client.js';

export function addAuditLog(action, description) {
    const logId = `LOG${Date.now()}`;
    const newLog = {
        id: logId,
        time: new Date().toISOString(),
        action,
        description,
        userId: fb.auth?.currentUser?.uid || null,
        userName: session.userName
    };
    data.auditLogs.unshift(newLog);
    if (data.auditLogs.length > 50) data.auditLogs.pop(); // Cap at 50 logs

    saveDataToStorage();
    notify();

    // Sync to Firestore only for a signed-in user (Firestore rules reject anonymous writes)
    if (isCloudReady() && fb.auth?.currentUser) {
        setDoc(doc(fb.db, 'audit_logs', logId), { ...newLog, updatedAt: serverTimestamp() }, { merge: true })
            .catch(e => console.warn('Could not sync audit log to Firebase:', e));
    }
}

export function getAuditCategory(log) {
    const action = String(log.action || '').toLowerCase();
    const desc = String(log.description || '').toLowerCase();
    if (action.includes('booking') || desc.includes('booking') || action.includes('check')) return 'booking';
    if (action.includes('payment') || desc.includes('payment') || action.includes('tariff') || action.includes('invoice') || desc.includes('billing')) return 'payment';
    if (action.includes('room') || desc.includes('room') || action.includes('clean') || desc.includes('clean')) return 'room';
    if (action.includes('system') || desc.includes('system') || action.includes('settings') || desc.includes('setting')) return 'system';
    return 'general';
}

export function sortedAuditLogs() {
    return [...(data.auditLogs || [])].sort((first, second) => new Date(second.time || 0) - new Date(first.time || 0));
}

export function exportAuditLogsToCSV() {
    if (data.auditLogs.length === 0) {
        alert('No audit logs to export.');
        return;
    }
    let csvContent = 'Timestamp,Action,Description\n';
    data.auditLogs.forEach(log => {
        csvContent += [
            `"${new Date(log.time).toISOString()}"`,
            `"${String(log.action).replace(/"/g, '""')}"`,
            `"${String(log.description).replace(/"/g, '""')}"`
        ].join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lodge_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog('System Settings', 'Exported audit logs database to CSV.');
}

export function clearAuditLogs() {
    if (session.role !== 'owner') {
        alert('Only the Owner is authorized to purge security records.');
        return;
    }
    if (!confirm('⚠️ WARNING: This will permanently delete all security activity logs in the database. Are you sure you want to clear audit records?')) return;

    data.auditLogs = [{ id: 'LOG001', time: new Date().toISOString(), action: 'Logs Purged', description: 'Audit logs cleared by Owner.' }];
    saveDataToStorage();
    notify();

    if (isCloudReady()) {
        getDocs(collection(fb.db, 'audit_logs')).then(snapshot => {
            const batch = writeBatch(fb.db);
            snapshot.docs.forEach(item => batch.delete(item.ref));
            return batch.commit();
        }).catch(e => console.warn('Could not clear logs on cloud:', e));
    }
    alert('System logs cleared.');
}
