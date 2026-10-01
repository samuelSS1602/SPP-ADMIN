import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_TITLES, useUI } from '../ui/UIContext.jsx';
import { data, session, useStoreVersion } from '../store/store.js';
import { useDarkMode } from '../ui/theme.js';
import { useOutsideClose } from './hooks.js';
import { clearAllNotifications, markNotificationRead } from '../services/notifications.js';
import { logout } from '../services/auth.js';
import { exportFullSystemBackup } from '../services/settings.js';

const SEARCHABLE_PAGES = new Set(['bookings', 'guests', 'payments', 'rooms', 'pricing']);
const NOTIF_ICONS = { 'new-booking': 'fa-calendar-check', checkout: 'fa-sign-out-alt', payment: 'fa-credit-card', staff: 'fa-users' };

function LiveClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <small id="liveDateTime" style={{ color: 'var(--text-light)', fontWeight: 600 }}>
            {now.toLocaleString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </small>
    );
}

export default function TopHeader() {
    useStoreVersion();
    const { page, navigate, setSidebarOpen, globalSearch, setGlobalSearch, openModal } = useUI();
    const [isDark, toggleDark] = useDarkMode();
    const [openDropdown, setOpenDropdown] = useState(null);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchRef = useRef(null);
    const mobileSearchRef = useRef(null);

    const hideAll = useCallback(() => setOpenDropdown(null), []);
    const headerRightRef = useOutsideClose(Boolean(openDropdown), hideAll);
    const toggle = name => setOpenDropdown(current => (current === name ? null : name));

    // Ctrl/Cmd + K focuses quick search
    useEffect(() => {
        const onKey = e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (window.matchMedia('(max-width: 900px)').matches) setMobileSearchOpen(true);
                else searchRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => { if (mobileSearchOpen) mobileSearchRef.current?.focus(); }, [mobileSearchOpen]);
    useEffect(() => { setMobileSearchOpen(false); }, [page]);

    const unreadCount = data.notifications.filter(n => !n.read).length;
    const isOwner = session.role === 'owner';
    const canSearch = SEARCHABLE_PAGES.has(page);

    return (
        <div className="top-header">
            <div className="header-left">
                <button className="mobile-menu-btn" type="button" onClick={() => setSidebarOpen(open => !open)} aria-label="Open navigation menu"
                    style={{ display: 'none', background: 'none', border: 'none', fontSize: 20, color: 'var(--text-dark)', cursor: 'pointer' }}>
                    <i className="fas fa-bars" />
                </button>
                <div>
                    <h2 id="pageTitle" style={{ margin: 0 }}>{PAGE_TITLES[page] || 'Admin Console'}</h2>
                    <LiveClock />
                </div>
            </div>
            <div className="header-right" ref={headerRightRef}>
                <div className="global-search-container">
                    <input ref={searchRef} type="text" id="globalSearchInput" aria-label="Quick search" placeholder="Quick Search (Ctrl + K)"
                        value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
                    <i className="fas fa-search" />
                </div>
                {canSearch && (
                    <button type="button" className="header-notif-btn mobile-search-btn" onClick={() => setMobileSearchOpen(o => !o)} aria-label="Search this page" title="Search">
                        <i className="fas fa-search" />
                    </button>
                )}
                <div className="quick-add-wrap" style={{ position: 'relative' }}>
                    <button type="button" className="quick-add-btn" onClick={() => toggle('quickAdd')}>
                        <i className="fas fa-plus" /> <span>Quick Add</span> <i className="fas fa-chevron-down" style={{ fontSize: 10 }} />
                    </button>
                    <div id="quickAddDropdown" className={`user-dropdown ${openDropdown === 'quickAdd' ? 'active' : ''}`} style={{ top: 40, right: 0 }}>
                        <div className="user-dropdown-item receptionist-only" onClick={() => { navigate('new-booking'); hideAll(); }}><i className="fas fa-calendar-plus" /> New Booking</div>
                        <div className="user-dropdown-item owner-only" onClick={() => { navigate('pricing'); hideAll(); }}><i className="fas fa-tag" /> Modify Pricing</div>
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <button type="button" id="headerNotifBtn" className="header-notif-btn" onClick={() => toggle('notif')} aria-label="Notifications" title="Notifications">
                        <i className="fas fa-bell" />
                        <span className="header-notif-badge" id="notifBadgeCount" style={{ display: unreadCount > 0 ? 'flex' : 'none' }}>{unreadCount}</span>
                    </button>
                    <div id="notifDropdown" className={`notif-dropdown ${openDropdown === 'notif' ? 'active' : ''}`}>
                        <div className="notif-dropdown-header">
                            <span>Recent Notifications</span>
                            <button type="button" onClick={clearAllNotifications} style={{ fontSize: 11, color: 'var(--secondary)', textDecoration: 'none', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>Clear all</button>
                        </div>
                        <div className="notif-dropdown-body" id="notifDropdownBody">
                            {data.notifications.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', fontSize: 12 }}>No alerts.</div>
                            ) : data.notifications.map(n => (
                                <div key={n.id} className={`notif-dropdown-item ${n.read ? '' : 'unread'} ${n.type}`} onClick={() => markNotificationRead(n.id)}>
                                    <div className={`activity-icon ${n.type}`} style={{ width: 28, height: 28 }}><i className={`fas ${NOTIF_ICONS[n.type] || 'fa-bell'}`} /></div>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-dark)' }}>{n.title}</div>
                                        <div style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 2 }}>{n.message}</div>
                                        <small style={{ color: 'var(--text-light)', fontSize: 9, display: 'block', marginTop: 4 }}>
                                            {new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <button type="button" className="dark-mode-toggle" id="darkModeToggle" onClick={toggleDark} title="Toggle Dark/Light Mode" aria-label="Toggle dark or light mode">
                    <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
                </button>
                <div style={{ position: 'relative' }}>
                    <div className="user-profile" onClick={() => toggle('profile')} role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') toggle('profile'); }}>
                        <div className="profile-pic">{isOwner ? 'O' : 'R'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 700, fontSize: 12 }} id="profileRoleName">{session.userName}</div>
                            <small style={{ color: 'var(--text-light)', fontSize: 9 }} id="profileEmail">{session.email || 'admin@sripadmavati.com'}</small>
                            <div id="roleBadge" className={`role-badge ${session.role}`}>{isOwner ? '👑 Owner' : '🛎️ Receptionist'}</div>
                        </div>
                    </div>
                    <div id="userProfileDropdown" className={`user-dropdown ${openDropdown === 'profile' ? 'active' : ''}`} style={{ top: 45, right: 0 }}>
                        <div className="user-dropdown-header">
                            <h4 id="userDropdownName">{session.userName}</h4>
                            <p id="userDropdownEmail">{session.email || 'admin@sripadmavati.com'}</p>
                        </div>
                        <div className="user-dropdown-item" onClick={() => { openModal('changePassword'); hideAll(); }}><i className="fas fa-key" /> Change Password</div>
                        <div className="user-dropdown-item owner-only" onClick={() => { exportFullSystemBackup(); hideAll(); }}><i className="fas fa-cloud-download-alt" /> System Backup</div>
                        <div className="user-dropdown-item" onClick={() => { hideAll(); logout(); }}><i className="fas fa-sign-out-alt" /> Logout</div>
                    </div>
                </div>
            </div>
            {mobileSearchOpen && canSearch && (
                <div className="mobile-search-bar">
                    <i className="fas fa-search" />
                    <input ref={mobileSearchRef} type="search" aria-label="Search this page" placeholder={`Search ${(PAGE_TITLES[page] || '').toLowerCase()}...`}
                        value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
                    <button type="button" onClick={() => { setGlobalSearch(''); setMobileSearchOpen(false); }} aria-label="Close search"><i className="fas fa-times" /></button>
                </div>
            )}
        </div>
    );
}
