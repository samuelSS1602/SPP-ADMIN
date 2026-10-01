import { useUI } from '../ui/UIContext.jsx';
import { logout } from '../services/auth.js';

export const NAV_ITEMS = [
    { page: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { page: 'bookings', icon: 'fa-calendar-alt', label: 'Bookings' },
    { page: 'new-booking', icon: 'fa-plus-circle', label: 'New Booking', className: 'receptionist-only' },
    { page: 'diary', icon: 'fa-book-open', label: 'Room Diary' },
    { page: 'rooms', icon: 'fa-door-open', label: 'Room Control' },
    { page: 'pricing', icon: 'fa-tag', label: 'Room Pricing' },
    { page: 'guests', icon: 'fa-users', label: 'Guests CRM' },
    { page: 'audit-logs-tab', icon: 'fa-history', label: 'Audit Logs', className: 'owner-only' },
    { page: 'payments', icon: 'fa-credit-card', label: 'Payments & GST', className: 'owner-only' },
    { page: 'analytics', icon: 'fa-chart-bar', label: 'Reports Center', className: 'owner-only' },
    { page: 'settings-tab', icon: 'fa-cog', label: 'Settings' }
];

export default function Sidebar() {
    const { page, navigate, sidebarOpen } = useUI();

    return (
        <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`} id="sidebar">
            <div>
                <div className="sidebar-header">
                    <div className="brand-logo">
                        <img src="/logo.jpeg" alt="Logo" className="sidebar-logo" width="62" height="61" />
                        <div className="brand-text">
                            <h3>Sri Padmavati</h3>
                            <p>Pleasants</p>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav" aria-label="Main navigation">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.page}
                            type="button"
                            className={`nav-item ${item.className || ''} ${page === item.page ? 'active' : ''}`}
                            onClick={() => navigate(item.page)}
                            aria-current={page === item.page ? 'page' : undefined}
                        >
                            <i className={`fas ${item.icon}`} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div>
                <button type="button" className="logout-btn" onClick={logout}>
                    <i className="fas fa-sign-out-alt" />
                    <span>Logout</span>
                </button>
                <div className="footer-credit">
                    <small>Developed by</small><br />
                    ⚡ CodeCrafters
                </div>
            </div>
        </aside>
    );
}
