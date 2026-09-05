// ===== APP INITIALIZATION MODULE =====
// Global data store, application state, and initialization

// Core data store
const data = {
    rooms: [
        { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, price: 2500, status: 'available', emoji: '🧑' },
        { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' }
    ],
    bookings: [],
    customers: [],
    guests: [],
    diary: {},
    staff: [],
    housekeepingTasks: [],
    notifications: [],
    settings: {
        lodgeName: 'Sri Padmavati Pleasants',
        gstNumber: '33ANCPP8116B1ZF',
        taxes: { cgst: 2.5, sgst: 2.5 },
        roomCategories: ['Single', 'Double', 'Family', 'Suite'],
        backupSchedule: 'Weekly'
    },
    auditLogs: []
};

// Global application state
let charts = {};
let currentPriceRoom = null;
let currentRoomDetailsRoomId = null;
let liveClockTimer = null;
let firebaseEnabled = false;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let checkoutReminderTimer = null;
let currentUserRole = 'receptionist';
let currentUserName = 'Receptionist';
let activePage = 'dashboard';
let multiRoomBookingSelection = [];

// Constants
const OWNER_EMAIL = 'sppowner@gmail.com';
const OWNER_WHATSAPP_PHONE = '919842816621';
const LODGE_GST_NUMBER = '33ANCPP8116B1ZF';
const PHOTO_DB_NAME = 'LodgeAdminPhotos';
const PHOTO_DB_VERSION = 2;
const PHOTO_STORE_NAME = 'booking_photos';
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Booking filter state
let bookingFilterYear = new Date().getFullYear();
let bookingFilterMonth = 'all';

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    initFirebaseServices();
    hydrateDataFromStorage();
    correctMistakenBookingStatuses();
    purgeLegacySeedData();
    enforceRequestedRoomSetup();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('newBookingForm').addEventListener('submit', handleNewBooking);
    startLiveClock();
    
    // Initialize Redesign features
    initAppRedesign();

    // Load guest photos from Firebase after a short delay (if available)
    setTimeout(() => {
        if (typeof loadGuestPhotosFromFirebase === 'function') {
            loadGuestPhotosFromFirebase().catch(e => console.warn('Could not load guest photos:', e));
        }
    }, 2000);
});

/**
 * Shows the dashboard main page
 */
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'grid';
    startCheckoutReminderService();

    setTimeout(() => {
        loadDashboard();
        createCharts();
    }, 100);
}

/**
 * Applies role-based UI restrictions
 */
function applyRoleRestrictions() {
    const isOwner = currentUserRole === 'owner';
    document.querySelectorAll('.owner-only').forEach(el => {
        el.style.display = isOwner ? '' : 'none';
    });
    document.querySelectorAll('.receptionist-only').forEach(el => {
        el.style.display = !isOwner ? '' : 'none';
    });
    if (isOwner) {
        document.body.classList.add('owner-view');
    } else {
        document.body.classList.remove('owner-view');
    }
}

/**
 * Initializes app redesign features
 */
function initAppRedesign() {
    // Initialize navigation
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', function (e) {
            e.preventDefault();
            const pageId = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (pageId) navigateTo(pageId, this);
        });
    });

    // Initialize dropdown menus
    document.querySelectorAll('[data-dropdown-toggle]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const dropdownId = this.getAttribute('data-dropdown-toggle');
            toggleDropdown(dropdownId);
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', hideAllDropdowns);

    // Initialize sidebar overlay close
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleMobileMenu);
    }

    // Search functionality
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => handleGlobalSearch(e.target.value));
    }

    // Log initialization diagnostics
    logInitializationDiagnostics();
}

/**
 * Logs initialization diagnostics for debugging
 */
function logInitializationDiagnostics() {
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
    console.log('%c  LODGE ADMIN - INITIALIZATION DIAGNOSTICS', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
    
    // Check Firebase
    console.group('🔥 Firebase Status');
    console.log('Firebase SDK loaded:', typeof firebase !== 'undefined' ? '✓' : '✗');
    console.log('Firebase apps:', firebase ? firebase.apps.length : 0);
    console.log('Firebase enabled:', firebaseEnabled ? '✓' : '✗');
    console.log('Firebase Auth ready:', firebaseAuth ? '✓' : '✗');
    console.log('Firebase DB ready:', firebaseDb ? '✓' : '✗');
    console.log('Firebase Storage ready:', firebaseStorage ? '✓' : '✗');
    console.groupEnd();

    // Check data
    console.group('📊 Application Data');
    console.log('Rooms loaded:', data.rooms.length);
    console.log('Bookings loaded:', data.bookings.length);
    console.log('Guests loaded:', data.guests.length);
    console.log('Notifications:', data.notifications.length);
    console.groupEnd();

    // Check modules
    console.group('📦 Module Functions Available');
    console.log('handleLogin:', typeof handleLogin === 'function' ? '✓' : '✗');
    console.log('loadDashboard:', typeof loadDashboard === 'function' ? '✓' : '✗');
    console.log('loadBookings:', typeof loadBookings === 'function' ? '✓' : '✗');
    console.log('loadGuests:', typeof loadGuests === 'function' ? '✓' : '✗');
    console.log('loadRooms:', typeof loadRooms === 'function' ? '✓' : '✗');
    console.log('syncAllBookingsToFirebase:', typeof syncAllBookingsToFirebase === 'function' ? '✓' : '✗');
    console.log('fetchAllDataFromFirebase:', typeof fetchAllDataFromFirebase === 'function' ? '✓' : '✗');
    console.groupEnd();

    // Check utility functions
    console.group('🛠️ Utility Functions');
    console.log('showToast:', typeof showToast === 'function' ? '✓' : '✗');
    console.log('formatDate:', typeof formatDate === 'function' ? '✓' : '✗');
    console.log('formatNumber:', typeof formatNumber === 'function' ? '✓' : '✗');
    console.log('addAuditLog:', typeof addAuditLog === 'function' ? '✓' : '✗');
    console.groupEnd();

    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
    console.log('%c  Ready for login. Use Firebase credentials.', 'color: #10b981; font-style: italic');
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-weight: bold');
}

/**
 * Chart management - creates/destroys charts for dashboard
 * These functions handle the Chart.js instances
 */
    function createCharts() {
    // This function is also defined in script.js
    // Call the one from script.js if it exists, otherwise do nothing
    if (window.createCharts && typeof window.createCharts === 'function' && window.createCharts !== createCharts) {
        console.log('Using createCharts from script.js');
        return window.createCharts();
    }
    console.log('createCharts placeholder - implementation in script.js');
}

function destroyCharts() {
    // This function is also defined in script.js
    // Call the one from script.js if it exists, otherwise do nothing
    if (window.destroyCharts && typeof window.destroyCharts === 'function' && window.destroyCharts !== destroyCharts) {
        console.log('Using destroyCharts from script.js');
        return window.destroyCharts();
    }
    console.log('destroyCharts placeholder - implementation in script.js');
}

// ===== END APP INITIALIZATION MODULE =====
