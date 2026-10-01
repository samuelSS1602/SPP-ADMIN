import { useStoreVersion } from '../store/store.js';
import { usePersistentState } from '../ui/UIContext.jsx';
import { clearAuditLogs, exportAuditLogsToCSV, getAuditCategory, sortedAuditLogs } from '../services/audit.js';

const CATEGORY_BADGES = {
    booking: ['var(--secondary)', 'Booking'],
    payment: ['var(--success)', 'Payment'],
    room: ['var(--warning)', 'Room Setup'],
    system: ['var(--danger)', 'System Settings'],
    general: ['var(--text-light)', 'General']
};

export default function AuditLogsPage() {
    useStoreVersion();
    const [search, setSearch] = usePersistentState('audit.search', '');
    const [category, setCategory] = usePersistentState('audit.category', 'all');
    const query = search.toLowerCase();

    const logs = sortedAuditLogs().filter(log => {
        if (query && !(String(log.action).toLowerCase().includes(query) || String(log.description).toLowerCase().includes(query))) return false;
        return category === 'all' || getAuditCategory(log) === category;
    });

    const fieldStyle = { width: '100%', height: 40, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-dark)' };

    return (
        <div id="audit-logs-tab" className="page-content owner-only active">
            <div className="page-header">
                <h2>Audit Trails &amp; Security Logs</h2>
                <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn-primary" onClick={exportAuditLogsToCSV} style={{ background: 'var(--secondary)' }}>
                        <i className="fas fa-file-csv" /> Export Logs (CSV)
                    </button>
                    <button type="button" className="btn-primary" onClick={clearAuditLogs} style={{ background: 'var(--danger)' }}>
                        <i className="fas fa-trash-alt" /> Clear Audit History
                    </button>
                </div>
            </div>
            <div className="card">
                <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flexGrow: 1, minWidth: 200, marginBottom: 0 }}>
                        <input type="search" id="auditSearchInput" placeholder="Search logs by action or description..." style={fieldStyle}
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="form-group audit-category-group" style={{ width: 200, marginBottom: 0 }}>
                        <select id="auditCategoryFilter" style={fieldStyle} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
                            <option value="all">All Categories</option>
                            <option value="booking">Bookings Activity</option>
                            <option value="payment">Payments &amp; Tariffs</option>
                            <option value="room">Rooms &amp; Settings</option>
                            <option value="system">System Updates</option>
                        </select>
                    </div>
                </div>
                <div className="data-table-container">
                    <table className="data-table responsive-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action Category</th>
                                <th>Detailed Description</th>
                            </tr>
                        </thead>
                        <tbody id="auditLogsExplorerTable">
                            {logs.length === 0 ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-light)', padding: 20 }}>No audit records match the filters.</td></tr>
                            ) : logs.map(log => {
                                const [color, name] = CATEGORY_BADGES[getAuditCategory(log)];
                                return (
                                    <tr key={log.id + log.time}>
                                        <td data-label="Time" style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-light)' }}>
                                            {new Date(log.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </td>
                                        <td data-label="Action">
                                            <span className="status-badge" style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}>{name}</span> <strong>{log.action}</strong>
                                        </td>
                                        <td data-label="Details" style={{ fontSize: 13 }}>{log.description}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
