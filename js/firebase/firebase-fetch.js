
async function fetchAllDataFromFirebase() {
    if (!firebaseEnabled || !firebaseDb) return;

    try {
        console.log("Fetching cloud data...");
        // 1. Fetch Customers
        const custSnap = await firebaseDb.collection('customers').get();
        const firebaseCustomers = [];
        custSnap.forEach(doc => {
            const cData = doc.data();
            if (cData.id) firebaseCustomers.push(cData);
        });

        // Merge Customers
        const localCustIds = new Set(data.customers.map(c => c.id));
        firebaseCustomers.forEach(fc => {
            if (!localCustIds.has(fc.id)) {
                data.customers.push(fc);
            } else {
                const idx = data.customers.findIndex(c => c.id === fc.id);
                data.customers[idx] = { ...data.customers[idx], ...fc }; // Cloud overrides local
            }
        });

        // 2. Fetch Bookings
        const bookSnap = await firebaseDb.collection('bookings').get();
        const firebaseBookings = [];
        bookSnap.forEach(doc => {
            const bData = doc.data();
            if (bData.id) firebaseBookings.push(bData);
        });

        // Merge Bookings
        const localBookIds = new Set(data.bookings.map(b => b.id));
        firebaseBookings.forEach(fb => {
            if (!localBookIds.has(fb.id)) {
                data.bookings.push(fb);
            } else {
                const idx = data.bookings.findIndex(b => b.id === fb.id);
                data.bookings[idx] = { ...data.bookings[idx], ...fb }; // Cloud overrides local
            }
        });

        const roomSnap = await firebaseDb.collection('rooms').get();
        roomSnap.forEach(doc => {
            const cloudRoom = doc.data();
            const room = data.rooms.find(item => String(item.id) === String(cloudRoom.id || doc.id));
            if (room) {
                Object.assign(room, cloudRoom);
            }
        });

        const auditSnap = await firebaseDb.collection('audit_logs').get();
        const auditById = new Map((data.auditLogs || []).map(log => [log.id, log]));
        auditSnap.forEach(doc => {
            const cloudLog = doc.data();
            if (cloudLog.id) auditById.set(cloudLog.id, cloudLog);
        });
        data.auditLogs = [...auditById.values()];

        correctMistakenBookingStatuses();

        updateRoomStatusesFromBookings();


        // 3. Fetch Room Diary (Reminders)
        const diarySnap = await firebaseDb.collection('diaryReminder').get();
        if (!data.diary) data.diary = {};
        diarySnap.forEach(doc => {
            const dData = doc.data();
            if (dData.date && dData.roomId) {
                if (!data.diary[dData.date]) data.diary[dData.date] = {};
                data.diary[dData.date][dData.roomId] = dData.guestName;
            }
        });


        data.guests = [];
        data.bookings.forEach(booking => {
            if (booking.guestName && (booking.guestPhone || booking.guestEmail)) {
                upsertGuestRecord(
                    booking.guestName,
                    booking.guestPhone || 'N/A',
                    booking.guestEmail || '',
                    booking.checkOut || booking.checkIn || new Date().toISOString().split('T')[0],
                    booking.id
                );
            }
        });

        saveDataToStorage();

        // If UI is already loaded, gently refresh the arrays
        if (typeof loadBookings === 'function') loadBookings();
        if (typeof loadRooms === 'function') loadRooms();
        if (typeof loadGuests === 'function') loadGuests();
        if (typeof loadPayments === 'function') loadPayments();
        if (typeof updateRealtimeDashboardMetrics === 'function') updateRealtimeDashboardMetrics();

        // Refresh Diary UI if currently on that page
        const diaryDateInput = document.getElementById('diaryDate');
        if (typeof loadDiary === 'function' && diaryDateInput && diaryDateInput.value) {
            loadDiary(diaryDateInput.value);
        }

        console.log("Cloud sync complete!");
    } catch (error) {
        console.error("Could not fetch remote data:", error);
    }
}
