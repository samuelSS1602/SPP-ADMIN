
// ==========================================
// REDESIGN ENTERPRISE LOGIC & INITIALIZERS
// ==========================================

function initAppRedesign() {
    // 1. Seed defaults if empty
    if (!data.staff || data.staff.length === 0) {
        data.staff = [
            { id: 'ST001', name: 'John Doe', role: 'Manager', phone: '9842816621', email: 'john@sripadmavati.com', status: 'Active', shift: 'Morning' },
            { id: 'ST002', name: 'Jane Smith', role: 'Receptionist', phone: '6369216621', email: 'jane@sripadmavati.com', status: 'Active', shift: 'Evening' },
            { id: 'ST003', name: 'Kumar Swami', role: 'Housekeeping', phone: '9488886101', email: 'kumar@sripadmavati.com', status: 'Active', shift: 'Morning' }
        ];
    }
    if (!data.housekeepingTasks || data.housekeepingTasks.length === 0) {
        data.housekeepingTasks = [
            { id: 'HK001', roomId: 101, roomName: 'F1-102', staffName: 'Kumar Swami', priority: 'Normal', status: 'todo', notes: 'Change linen and vacuum floor' },
            { id: 'HK002', roomId: 105, roomName: 'F1-101', staffName: 'Kumar Swami', priority: 'High', status: 'progress', notes: 'Technical cleaning before check-in' }
        ];
    }
    if (!data.notifications || data.notifications.length === 0) {
        data.notifications = [
            { id: 'NT001', type: 'new-booking', title: 'System Online', message: 'Lodge admin console loaded successfully.', time: new Date().toISOString(), read: false }
        ];
    }
    if (!data.auditLogs || data.auditLogs.length === 0) {
        data.auditLogs = [
            { id: 'LOG001', time: new Date().toISOString(), action: 'System Init', description: 'Redesigned administration panel initialized.' }
        ];
    }
    if (!data.settings) {
        data.settings = {
            lodgeName: 'Sri Padmavati Pleasants',
            gstNumber: '33ANCPP8116B1ZF',
            taxes: { cgst: 2.5, sgst: 2.5 },
            roomCategories: ['Single', 'Double', 'Family', 'Suite'],
            backupSchedule: 'Weekly',
            weekendSurcharge: 10,
            holidaySurgeActive: false,
            holidaySurgeRate: 20
        };
    } else {
        if (data.settings.weekendSurcharge === undefined) data.settings.weekendSurcharge = 10;
        if (data.settings.holidaySurgeActive === undefined) data.settings.holidaySurgeActive = false;
        if (data.settings.holidaySurgeRate === undefined) data.settings.holidaySurgeRate = 20;
    }

    // 2. Apply saved Dark Mode preference
    const isDark = localStorage.getItem('darkModePreference') === 'true';
    if (isDark) {
        document.body.classList.add('dark-theme');
        const toggleIcon = document.querySelector('#darkModeToggle i');
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-moon');
            toggleIcon.classList.add('fa-sun');
        }
    }

    // 3. Setup global listeners
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearchInput');
            if (searchInput) searchInput.focus();
        }
    });

    // 4. Render Notifications count & feed
    renderNotifications();
    
    // 5. Render Audit Logs
    renderAuditLogs();

    // 6. Draw Dashboard metrics sparklines
    setTimeout(drawSparklines, 500);
}

// --- DARK MODE TOGGLE ---
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkModePreference', isDark);
    const toggleIcon = document.querySelector('#darkModeToggle i');
    if (toggleIcon) {
        if (isDark) {
            toggleIcon.classList.remove('fa-moon');
            toggleIcon.classList.add('fa-sun');
            addAuditLog('System Style', 'Switched console layout style to Dark Mode.');
        } else {
            toggleIcon.classList.remove('fa-sun');
            toggleIcon.classList.add('fa-moon');
            addAuditLog('System Style', 'Switched console layout style to Light Mode.');
        }
    }
}

// --- DROPDOWNS MANAGEMENT ---
function toggleDropdown(dropdownId) {
    const target = document.getElementById(dropdownId);
    const isActive = target && target.classList.contains('active');
    hideAllDropdowns();
    if (target && !isActive) {
        target.classList.add('active');
    }
}

function hideAllDropdowns() {
    document.querySelectorAll('.user-dropdown, .notif-dropdown').forEach(d => d.classList.remove('active'));
}

// --- GLOBAL SEARCH ENGINE ---
function handleGlobalSearch(query) {
    const q = query.trim().toLowerCase();
    
    // 1. If searching on bookings page
    if (activePage === 'bookings') {
        const sections = document.querySelectorAll('.month-booking-section');
        sections.forEach(sec => {
            const rows = sec.querySelectorAll('tbody tr');
            let visibleRowsInSec = 0;
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                if (text.includes(q)) {
                    row.style.display = '';
                    visibleRowsInSec++;
                } else {
                    row.style.display = 'none';
                }
            });
            if (visibleRowsInSec > 0 || q === '') {
                sec.style.display = '';
            } else {
                sec.style.display = 'none';
            }
        });
    }
    
    // 2. If searching on guests CRM page
    else if (activePage === 'guests') {
        const rows = document.querySelectorAll('#guestsTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 3. If searching on payments billing page
    else if (activePage === 'payments') {
        const rows = document.querySelectorAll('#paymentsTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 4. If searching on room control page
    else if (activePage === 'rooms') {
        const cards = document.querySelectorAll('.room-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(q) ? '' : 'none';
        });
    }

    // 5. If searching on pricing list page
    else if (activePage === 'pricing') {
        const rows = document.querySelectorAll('#pricingTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }
}
