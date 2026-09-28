
// --- REAL-TIME AUDIT LOGGING ---
function addAuditLog(action, description) {
    const logId = `LOG${Date.now()}`;
    const newLog = {
        id: logId,
        time: new Date().toISOString(),
        action,
        description,
        userId: firebaseAuth?.currentUser?.uid || null,
        userName: currentUserName
    };
    data.auditLogs.unshift(newLog);
    if (data.auditLogs.length > 50) data.auditLogs.pop(); // Cap at 50 logs
    
    saveDataToStorage();
    renderAuditLogs();
    
    // Sync to Firestore only for a signed-in user (Firestore rules reject anonymous writes)
    if (firebaseEnabled && firebaseDb && firebaseAuth?.currentUser) {
        firebaseDb.collection('audit_logs').doc(logId).set({
            ...newLog,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.warn('Could not sync audit log to Firebase:', e));
    }
}

function renderAuditLogs() {
    const container = document.getElementById('activityLogsContainer');
    if (!container) return;
    
    if (data.auditLogs.length === 0) {
        container.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-light); text-align: center;">No activity logged.</div>`;
        return;
    }
    
    let html = '';
    [...data.auditLogs]
        .sort((first, second) => new Date(second.time || 0) - new Date(first.time || 0))
        .slice(0, 10)
        .forEach(log => {
        let iconClass = 'fa-history';
        let badgeType = 'booking';
        
        if (log.action.includes('Booking')) { iconClass = 'fa-calendar-check'; badgeType = 'booking'; }
        else if (log.action.includes('Payment') || log.action.includes('Tariff')) { iconClass = 'fa-credit-card'; badgeType = 'payment'; }
        else if (log.action.includes('Room') || log.action.includes('Clean')) { iconClass = 'fa-door-open'; badgeType = 'warning'; }
        
        const logTime = new Date(log.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        html += `
            <div class="activity-item">
                <div class="activity-icon ${badgeType}"><i class="fas ${iconClass}"></i></div>
                <div style="flex-grow: 1;">
                    <div class="activity-title">${log.action}</div>
                    <div class="activity-description">${log.description}</div>
                    <small style="color: var(--text-light); font-size: 10px;">${logTime}</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// --- OWNER AUDIT LOGS EXPLORER ---
function initAuditLogsExplorer() {
    filterAuditLogs();
}

function filterAuditLogs() {
    const tableBody = document.getElementById('auditLogsExplorerTable');
    if (!tableBody) return;
    
    const searchVal = document.getElementById('auditSearchInput').value.toLowerCase();
    const catVal = document.getElementById('auditCategoryFilter').value;
    
    let filtered = [...(data.auditLogs || [])].sort((first, second) => {
        return new Date(second.time || 0) - new Date(first.time || 0);
    });
    
    // 1. Search Query Filter
    if (searchVal) {
        filtered = filtered.filter(log => 
            log.action.toLowerCase().includes(searchVal) || 
            log.description.toLowerCase().includes(searchVal)
        );
    }
    
    // 2. Category Filter
    if (catVal !== 'all') {
        filtered = filtered.filter(log => {
            const action = log.action.toLowerCase();
            const desc = log.description.toLowerCase();
            if (catVal === 'booking') return action.includes('booking') || desc.includes('booking') || action.includes('check');
            if (catVal === 'payment') return action.includes('payment') || desc.includes('payment') || action.includes('tariff') || action.includes('invoice') || desc.includes('billing');
            if (catVal === 'room') return action.includes('room') || desc.includes('room') || action.includes('clean') || desc.includes('clean');
            if (catVal === 'system') return action.includes('system') || desc.includes('system') || action.includes('settings') || desc.includes('setting');
            return true;
        });
    }
    
    let html = '';
    if (filtered.length === 0) {
        html = `<tr><td colspan="3" style="text-align: center; color: var(--text-light); padding: 20px;">No audit records match the filters.</td></tr>`;
    } else {
        filtered.forEach(log => {
            let catBadgeColor = 'var(--text-light)';
            const action = log.action.toLowerCase();
            const desc = log.description.toLowerCase();
            let categoryName = 'General';
            
            if (action.includes('booking') || desc.includes('booking') || action.includes('check')) {
                catBadgeColor = 'var(--secondary)';
                categoryName = 'Booking';
            } else if (action.includes('payment') || desc.includes('payment') || action.includes('tariff') || action.includes('invoice') || desc.includes('billing')) {
                catBadgeColor = 'var(--success)';
                categoryName = 'Payment';
            } else if (action.includes('room') || desc.includes('room') || action.includes('clean') || desc.includes('clean')) {
                catBadgeColor = 'var(--warning)';
                categoryName = 'Room Setup';
            } else if (action.includes('system') || desc.includes('system') || action.includes('settings') || desc.includes('setting')) {
                catBadgeColor = 'var(--danger)';
                categoryName = 'System Settings';
            }
            
            const badge = `<span class="status-badge" style="background: ${catBadgeColor}15; color: ${catBadgeColor};">${categoryName}</span>`;
            const formattedTime = new Date(log.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
            
            html += `
                <tr>
                    <td style="white-space: nowrap; font-size: 12px; color: var(--text-light);">${formattedTime}</td>
                    <td>${badge} <strong>${log.action}</strong></td>
                    <td style="font-size: 13px;">${log.description}</td>
                </tr>
            `;
        });
    }
    tableBody.innerHTML = html;
}

function exportAuditLogsToCSV() {
    if (data.auditLogs.length === 0) {
        alert("No audit logs to export.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Action,Description\n";
    
    data.auditLogs.forEach(log => {
        const row = [
            `"${new Date(log.time).toISOString()}"`,
            `"${log.action.replace(/"/g, '""')}"`,
            `"${log.description.replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lodge_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addAuditLog('System Settings', 'Exported audit logs database to CSV.');
}

function clearAuditLogs() {
    if (currentUserRole !== 'owner') {
        alert("Only the Owner is authorized to purge security records.");
        return;
    }
    
    if (confirm("⚠️ WARNING: This will permanently delete all security activity logs in the database. Are you sure you want to clear audit records?")) {
        data.auditLogs = [
            { id: 'LOG001', time: new Date().toISOString(), action: 'Logs Purged', description: `Audit logs cleared by Owner.` }
        ];
        saveDataToStorage();
        
        // Sync clear to Firebase if available
        if (firebaseEnabled && firebaseDb) {
            try {
                firebaseDb.collection('audit_logs').get().then(snapshot => {
                    const batch = firebaseDb.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    batch.commit();
                });
            } catch (e) {
                console.warn("Could not clear logs on cloud:", e);
            }
        }
        
        filterAuditLogs();
        alert("System logs cleared.");
    }
}
