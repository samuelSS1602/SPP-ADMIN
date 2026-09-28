
function navigateTo(page, navElement) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const contentArea = document.querySelector('.content-area');
    if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(page);
    if (targetPage) targetPage.classList.add('active');
    activePage = page;

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (navElement) {
        navElement.classList.add('active');
    } else {
        // Fallback to find navigation item by onclick contents
        const matchingBtn = document.querySelector(`.nav-item[onclick*="${page}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard Overview', bookings: 'Booking Management Logs', rooms: 'Room Control Console',
        pricing: 'Room Pricing & Surcharges', guests: 'Guests CRM Database',
        payments: 'Payments & GST Ledger', analytics: 'Reports & Analytics Center', 'new-booking': 'Create New Booking',
        diary: 'Room Reservation Diary', 'audit-logs-tab': 'Audit Trails & Security Logs',
        'settings-tab': 'Console System Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'Admin Console';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'bookings': loadBookings(); break;
        case 'new-booking': loadNewBookingPage(); break;
        case 'rooms': loadRooms(); break;
        case 'pricing': 
            loadPricingPage(); 
            loadSurchargeSettings();
            break;
        case 'guests': loadGuests(); break;
        case 'payments': loadPayments(); break;
        case 'analytics': 
            setTimeout(() => {
                if (typeof createAnalyticsChart === 'function') createAnalyticsChart();
                initSalesCalendar();
            }, 100); 
            break;
        case 'diary': initDiary(); break;
        case 'audit-logs-tab': initAuditLogsExplorer(); break;
        case 'settings-tab': initSettings(); break;
    }

    if (window.innerWidth <= 900) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }
}

function loadDashboard() {
    loadBookings();
    loadRooms();
    updateRealtimeDashboardMetrics();
    loadPayments();
}
