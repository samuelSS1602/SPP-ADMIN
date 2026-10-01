import { data } from '../store/store.js';
import { commit } from '../store/persistence.js';

export function addNotification(type, title, message) {
    const notifId = `NT${String(data.notifications.length + 1).padStart(3, '0')}`;
    data.notifications.unshift({ id: notifId, type, title, message, time: new Date().toISOString(), read: false });
    if (data.notifications.length > 30) data.notifications.pop(); // Max 30 alerts
    commit();
}

export function markNotificationRead(notifId) {
    const notif = data.notifications.find(n => n.id === notifId);
    if (!notif) return;
    notif.read = true;
    commit();
}

export function clearAllNotifications() {
    data.notifications = [];
    commit();
}
