
// --- NOTIFICATION CENTER FEEDS ---
function addNotification(type, title, message) {
    const notifId = `NT${String(data.notifications.length + 1).padStart(3, '0')}`;
    const newNotif = {
        id: notifId,
        type,
        title,
        message,
        time: new Date().toISOString(),
        read: false
    };
    data.notifications.unshift(newNotif);
    if (data.notifications.length > 30) data.notifications.pop(); // Max 30 alerts
    
    saveDataToStorage();
    renderNotifications();
}

function renderNotifications() {
    const dropdown = document.getElementById('notifDropdownBody');
    const badge = document.getElementById('notifBadgeCount');
    if (!dropdown) return;
    
    const unreadCount = data.notifications.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    if (data.notifications.length === 0) {
        dropdown.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); font-size: 12px;">No alerts.</div>`;
        return;
    }
    
    let html = '';
    data.notifications.forEach(n => {
        let iconClass = 'fa-bell';
        if (n.type === 'new-booking') iconClass = 'fa-calendar-check';
        else if (n.type === 'checkout') iconClass = 'fa-sign-out-alt';
        else if (n.type === 'payment') iconClass = 'fa-credit-card';
        else if (n.type === 'staff') iconClass = 'fa-users';
        
        const unreadClass = n.read ? '' : 'unread';
        const formattedTime = new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="notif-dropdown-item ${unreadClass} ${n.type}" onclick="markNotificationRead('${n.id}')">
                <div class="activity-icon ${n.type}" style="width: 28px; height: 28px;"><i class="fas ${iconClass}"></i></div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 700; font-size: 12px; color: var(--text-dark);">${n.title}</div>
                    <div style="color: var(--text-light); font-size: 11px; margin-top: 2px;">${n.message}</div>
                    <small style="color: var(--text-light); font-size: 9px; display: block; margin-top: 4px;">${formattedTime}</small>
                </div>
            </div>
        `;
    });
    dropdown.innerHTML = html;
}

function markNotificationRead(notifId) {
    const notif = data.notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveDataToStorage();
        renderNotifications();
    }
}

function clearAllNotifications() {
    data.notifications = [];
    saveDataToStorage();
    renderNotifications();
}
