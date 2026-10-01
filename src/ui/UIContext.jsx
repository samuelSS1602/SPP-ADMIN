import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const PAGE_TITLES = {
    dashboard: 'Dashboard Overview',
    bookings: 'Booking Management Logs',
    rooms: 'Room Control Console',
    pricing: 'Room Pricing & Surcharges',
    guests: 'Guests CRM Database',
    payments: 'Payments & GST Ledger',
    analytics: 'Reports & Analytics Center',
    'new-booking': 'Create New Booking',
    diary: 'Room Reservation Diary',
    'audit-logs-tab': 'Audit Trails & Security Logs',
    'settings-tab': 'Console System Settings'
};

function pageFromHash() {
    const page = window.location.hash.replace(/^#\/?/, '');
    return PAGE_TITLES[page] ? page : 'dashboard';
}

const UIContext = createContext(null);

export function UIProvider({ children }) {
    const [page, setPage] = useState(pageFromHash);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modals, setModals] = useState([]); // [{ type, props }], last one on top
    const [globalSearch, setGlobalSearch] = useState('');
    const contentRef = useRef(null);

    // Pages live in the URL hash so the phone/browser back button moves between them
    useEffect(() => {
        const onHashChange = () => setPage(pageFromHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback(target => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        setSidebarOpen(false);
        setGlobalSearch('');
        if (window.location.hash !== `#/${target}`) window.location.hash = `/${target}`;
        setPage(target);
    }, []);

    const openModal = useCallback((type, props = {}) => {
        setModals(current => [...current.filter(m => m.type !== type), { type, props }]);
    }, []);

    const closeModal = useCallback(type => {
        setModals(current => current.filter(m => m.type !== type));
    }, []);

    const isModalOpen = useCallback(type => modals.some(m => m.type === type), [modals]);

    // Lock page scroll behind open modals (stops the background scrolling on phones)
    useEffect(() => {
        document.body.classList.toggle('modal-open', modals.length > 0);
    }, [modals.length]);

    const value = useMemo(() => ({
        page, navigate,
        sidebarOpen, setSidebarOpen,
        modals, openModal, closeModal, isModalOpen,
        globalSearch, setGlobalSearch,
        contentRef
    }), [page, navigate, sidebarOpen, modals, openModal, closeModal, isModalOpen, globalSearch]);

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
    return useContext(UIContext);
}

// Filter state that survives leaving and re-opening a page (the old pages kept theirs in the DOM)
const persisted = new Map();
export function usePersistentState(key, initial) {
    const [value, setValue] = useState(() => (persisted.has(key) ? persisted.get(key) : (typeof initial === 'function' ? initial() : initial)));
    useEffect(() => { persisted.set(key, value); }, [key, value]);
    return [value, setValue];
}
