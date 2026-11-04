import { useEffect, useRef } from 'react';
import { useUI } from '../ui/UIContext.jsx';
import { usePointerTilt } from './hooks.js';
import Sidebar from './Sidebar.jsx';
import TopHeader from './TopHeader.jsx';
import BottomNav from './BottomNav.jsx';
import ModalHost from '../modals/ModalHost.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import BookingsPage from '../pages/BookingsPage.jsx';
import NewBookingPage from '../pages/NewBookingPage.jsx';
import DiaryPage from '../pages/DiaryPage.jsx';
import RoomsPage from '../pages/RoomsPage.jsx';
import PricingPage from '../pages/PricingPage.jsx';
import GuestsPage from '../pages/GuestsPage.jsx';
import AuditLogsPage from '../pages/AuditLogsPage.jsx';
import PaymentsPage from '../pages/PaymentsPage.jsx';
import AnalyticsPage from '../pages/AnalyticsPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';

const PAGES = {
    dashboard: DashboardPage,
    bookings: BookingsPage,
    'new-booking': NewBookingPage,
    diary: DiaryPage,
    rooms: RoomsPage,
    pricing: PricingPage,
    guests: GuestsPage,
    'audit-logs-tab': AuditLogsPage,
    payments: PaymentsPage,
    analytics: AnalyticsPage,
    'settings-tab': SettingsPage
};

// Swipe right from the screen's left edge opens the menu; swipe left closes it
function useSidebarSwipe(sidebarOpen, setSidebarOpen) {
    const start = useRef(null);
    useEffect(() => {
        const onStart = e => {
            const t = e.touches[0];
            start.current = { x: t.clientX, y: t.clientY, fromEdge: t.clientX < 28 };
        };
        const onEnd = e => {
            if (!start.current || window.innerWidth > 900) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.current.x;
            const dy = Math.abs(t.clientY - start.current.y);
            if (dy < 60) {
                if (!sidebarOpen && start.current.fromEdge && dx > 60) setSidebarOpen(true);
                if (sidebarOpen && dx < -60) setSidebarOpen(false);
            }
            start.current = null;
        };
        document.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchend', onEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', onStart);
            document.removeEventListener('touchend', onEnd);
        };
    }, [sidebarOpen, setSidebarOpen]);
}

// Slowly drifting colour behind the glass panels; follows the mouse a little on desktop
function GlassBackdrop() {
    const ref = useRef(null);
    useEffect(() => {
        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0;
        let x = 0;
        let y = 0;
        const flush = () => {
            frame = 0;
            ref.current?.style.setProperty('--mx', x.toFixed(3));
            ref.current?.style.setProperty('--my', y.toFixed(3));
        };
        const onMove = e => {
            if (!finePointer.matches || reduceMotion.matches) return;
            x = e.clientX / window.innerWidth - 0.5;
            y = e.clientY / window.innerHeight - 0.5;
            if (!frame) frame = requestAnimationFrame(flush);
        };
        document.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            document.removeEventListener('pointermove', onMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div className="glass-backdrop" ref={ref} aria-hidden="true">
            <span className="glass-blob b1"><i /></span>
            <span className="glass-blob b2"><i /></span>
            <span className="glass-blob b3"><i /></span>
        </div>
    );
}

export default function Shell() {
    const { page, sidebarOpen, setSidebarOpen, contentRef } = useUI();
    const ActivePage = PAGES[page] || DashboardPage;
    useSidebarSwipe(sidebarOpen, setSidebarOpen);
    usePointerTilt();

    return (
        <div id="dashboardPage" className="dashboard-container" style={{ display: 'grid' }}>
            <GlassBackdrop />
            <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} id="sidebarOverlay" onClick={() => setSidebarOpen(false)} />
            <Sidebar />
            <main className="main-content">
                <TopHeader />
                <div className="content-area" ref={contentRef}>
                    <ActivePage key={page} />
                </div>
            </main>
            <BottomNav />
            <ModalHost />
        </div>
    );
}
