import { useUI } from '../ui/UIContext.jsx';

// Phone-only tab bar (hidden above 900px by mobile.css); "More" opens the full sidebar
const TABS = [
    { page: 'dashboard', icon: 'fa-chart-pie', label: 'Home' },
    { page: 'bookings', icon: 'fa-calendar-alt', label: 'Bookings' },
    { page: 'new-booking', icon: 'fa-plus', label: 'New', className: 'receptionist-only', primary: true },
    { page: 'rooms', icon: 'fa-door-open', label: 'Rooms' }
];

export default function BottomNav() {
    const { page, navigate, sidebarOpen, setSidebarOpen } = useUI();
    return (
        <nav className="bottom-nav" aria-label="Quick navigation">
            {TABS.map(tab => (
                <button
                    key={tab.page}
                    type="button"
                    className={`bottom-nav-item ${tab.className || ''} ${tab.primary ? 'primary' : ''} ${page === tab.page ? 'active' : ''}`}
                    onClick={() => navigate(tab.page)}
                    aria-current={page === tab.page ? 'page' : undefined}
                >
                    <i className={`fas ${tab.icon}`} />
                    <span>{tab.label}</span>
                </button>
            ))}
            <button type="button" className={`bottom-nav-item ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(open => !open)} aria-label="More pages">
                <i className="fas fa-bars" />
                <span>More</span>
            </button>
        </nav>
    );
}
