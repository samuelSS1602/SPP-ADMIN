// ===== END INDEXEDDB PHOTO STORAGE =====

document.addEventListener('DOMContentLoaded', function () {
    initFirebaseServices();
    hydrateDataFromStorage();
    hydrateFullDataFromIndexedDB().then(() => {
        if (document.getElementById('dashboardPage')?.style.display !== 'none') {
            loadDashboard();
        }
    });
    correctMistakenBookingStatuses();
    purgeLegacySeedData();
    enforceRequestedRoomSetup();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('newBookingForm').addEventListener('submit', handleNewBooking);
    startLiveClock();
    
    // Initialize Redesign features
    initAppRedesign();
});
