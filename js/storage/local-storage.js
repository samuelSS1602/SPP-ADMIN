
function updateRoomStatusesFromBookings() {
    if (!data.rooms || !data.bookings) return;

    const activeStatuses = ['confirmed', 'pending', 'paid'];
    const activeBookings = data.bookings.filter(b => activeStatuses.includes(b.status));

    // Collect all occupied room IDs based on valid bookings
    const occupiedRoomIds = new Set();
    activeBookings.forEach(booking => {
        if (booking.rooms && booking.rooms.length > 0) {
            booking.rooms.forEach(br => occupiedRoomIds.add(parseInt(br.roomId, 10)));
        } else if (booking.roomId) {
            occupiedRoomIds.add(parseInt(booking.roomId, 10));
        }
    });

    // Update rooms array
    data.rooms.forEach(room => {
        if (occupiedRoomIds.has(room.id)) {
            room.status = 'occupied';
        } else if (room.status === 'occupied') {
            room.status = 'available'; // Only revert if it was occupied but has no booking
        }
    });
}

function hydrateDataFromStorage() {
    try {
        const storedRaw = localStorage.getItem('lodgeAdminData');
        if (!storedRaw) return;

        const sData = JSON.parse(storedRaw);
        if (!sData || typeof sData !== 'object') return;

        if (Array.isArray(sData.rooms)) data.rooms = sData.rooms;
        if (Array.isArray(sData.bookings)) data.bookings = sData.bookings;
        if (Array.isArray(sData.customers)) data.customers = sData.customers;
        data.guests = sData.guests || [];
        data.diary = sData.diary || {};
        
        // Extended Redesign arrays
        data.staff = sData.staff || [];
        data.housekeepingTasks = sData.housekeepingTasks || [];
        data.notifications = sData.notifications || [];
        data.settings = sData.settings || {
            lodgeName: 'Sri Padmavati Pleasants',
            gstNumber: '33ANCPP8116B1ZF',
            taxes: { cgst: 2.5, sgst: 2.5 },
            roomCategories: ['Single', 'Double', 'Family', 'Suite'],
            backupSchedule: 'Weekly'
        };
        data.auditLogs = sData.auditLogs || [];
    } catch (e) {
        console.error('Failed to parse stored data:', e);
        localStorage.removeItem('lodgeAdminData');
    }
}

function correctMistakenBookingStatuses() {
    const booking = data.bookings.find(item => String(item.id || '').toUpperCase() === 'BK243');
    if (!booking || String(booking.status || '').toLowerCase() !== 'cancelled') return false;

    booking.status = 'completed';
    if (!booking.actualCheckOutDate) booking.actualCheckOutDate = getLocalISODate();
    if (!booking.actualCheckOutTime) booking.actualCheckOutTime = toDisplayTime(getCurrentTimeValue());

    saveDataToStorage();

    if (typeof syncBookingToFirebase === 'function') {
        syncBookingToFirebase(booking);
    }

    return true;
}

function purgeLegacySeedData() {
    const legacyBookingIds = new Set(['BK001', 'BK002', 'BK003', 'BK004', 'BK005', 'BK006']);
    const legacyCustomerIds = new Set(['CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005', 'CUST006']);

    const hasLegacyBookings = data.bookings.some(booking => legacyBookingIds.has(String(booking.id || '').toUpperCase()));
    const hasLegacyCustomers = data.customers.some(customer => legacyCustomerIds.has(String(customer.id || '').toUpperCase()));

    if (!hasLegacyBookings && !hasLegacyCustomers) return;

    data.bookings = [];
    data.customers = [];
    data.guests = [];

    data.rooms = data.rooms.map(room => ({ ...room, status: 'available' }));
    saveDataToStorage();
}

function enforceRequestedRoomSetup() {
    const roomTemplate = [
        { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, emoji: '🧑', defaultStatus: 'available' },
        { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' },
        { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, emoji: '👨‍👩‍👧‍👦', defaultStatus: 'available' }
    ];

    const roomIdToName = {
        101: 'F1-102',
        102: 'F1-103',
        103: 'F1-104',
        104: 'F1-105',
        105: 'F1-101',
        201: 'F2-201',
        202: 'F2-202',
        203: 'F2-203',
        204: 'F2-204'
    };

    const existingRoomById = new Map(data.rooms.map(room => [room.id, room]));
    data.rooms = roomTemplate.map(template => {
        const existing = existingRoomById.get(template.id);
        return {
            id: template.id,
            name: template.name,
            floor: template.floor,
            type: template.type,
            capacity: template.capacity,
            price: existing?.price || 2500,
            status: existing?.status || template.defaultStatus,
            emoji: template.emoji
        };
    });

    const activeRoomIds = new Set();

    // Collect room IDs from both new multi-room bookings and legacy single-room bookings
    data.bookings
        .filter(booking => booking.status !== 'completed')
        .forEach(booking => {
            if (booking.rooms && Array.isArray(booking.rooms)) {
                // Multi-room booking
                booking.rooms.forEach(room => activeRoomIds.add(parseInt(room.roomId, 10)));
            } else if (booking.roomId) {
                // Legacy single-room booking
                activeRoomIds.add(parseInt(booking.roomId, 10));
            }
        });

    data.rooms = data.rooms.map(room => {
        // If there is an active booking on this room, forcefully mark it as occupied
        if (activeRoomIds.has(parseInt(room.id, 10))) {
            return { ...room, status: 'occupied' };
        }

        // Otherwise, respect whatever status it currently has (so manual overrides stick)
        return room;
    });

    data.bookings.forEach(booking => {
        if ([201, 202, 203, 204].includes(booking.roomId)) booking.floor = 2;

        const mappedName = roomIdToName[booking.roomId];
        if (mappedName) {
            booking.roomName = mappedName;
        }
    });

    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;

        customer.bookingHistory.forEach(historyItem => {
            if (typeof historyItem.room !== 'string') return;

            historyItem.room = historyItem.room
                .replace('floor1-101', 'F1-102')
                .replace('floor1-102', 'F1-103')
                .replace('floor1-103', 'F1-104')
                .replace('floor1-104', 'F1-105')
                .replace('floor1-105', 'F1-101')
                .replace('floor2-201', 'F2-201')
                .replace('floor2-202', 'F2-202')
                .replace('floor2-203', 'F2-203')
                .replace('floor2-204', 'F2-204')
                .replace('F1-R1', 'F1-102')
                .replace('F1-R2', 'F1-103')
                .replace('F1-R3', 'F1-104')
                .replace('F1-R4', 'F1-105')
                .replace('F1-R5', 'F1-101')
                .replace('F2-R1', 'F2-201')
                .replace('F2-R2', 'F2-202')
                .replace('F2-R3', 'F2-203')
                .replace('F2-R4', 'F2-204');
        });
    });

    saveDataToStorage();
}

function stripPhotoDataForLocalCache(record) {
    if (!record || typeof record !== 'object') return record;

    const copy = { ...record };
    Object.keys(copy).forEach(key => {
        const normalizedKey = key.toLowerCase();
        const value = copy[key];
        const isPhotoField = normalizedKey.includes('photo') || normalizedKey.includes('image');
        const isLargeData = typeof value === 'string' && (value.startsWith('data:image') || value.length > 100000);

        if (isPhotoField && (isLargeData || normalizedKey.includes('photo') || normalizedKey.includes('image'))) {
            delete copy[key];
        }
    });
    return copy;
}

function buildLocalStorageSnapshot() {
    return {
        rooms: data.rooms,
        bookings: data.bookings.map(stripPhotoDataForLocalCache),
        customers: data.customers.map(stripPhotoDataForLocalCache),
        guests: data.guests.map(stripPhotoDataForLocalCache),
        diary: data.diary,
        staff: data.staff,
        housekeepingTasks: data.housekeepingTasks,
        notifications: data.notifications,
        settings: data.settings,
        auditLogs: data.auditLogs
    };
}

function saveDataToStorage() {
    // IndexedDB stores the complete dataset, including verification photos.
    saveFullDataToIndexedDB();

    try {
        localStorage.setItem('lodgeAdminData', JSON.stringify(buildLocalStorageSnapshot()));
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('localStorage quota exceeded, replacing cache with compact snapshot...');
            cleanupStorageData();

            try {
                localStorage.removeItem('lodgeAdminData');
                localStorage.setItem('lodgeAdminData', JSON.stringify(buildLocalStorageSnapshot()));
                console.warn('Compact local cache saved.');
            } catch (retryError) {
                console.error('Failed to save compact local cache:', retryError);
            }
        } else {
            console.warn('Could not save data:', error);
        }
    }
}

// Cleanup old data to free up localStorage space - MINIMAL APPROACH
// Preserves all active bookings and customers
function cleanupStorageData() {
    // Only clear old diary entries (older than 90 days)
    const ninetyDaysAgo = new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const diaryKeys = Object.keys(data.diary);
    let removedDiaryEntries = 0;
    
    diaryKeys.forEach(date => {
        if (date < ninetyDaysAgo) {
            delete data.diary[date];
            removedDiaryEntries++;
        }
    });
    
    if (removedDiaryEntries > 0) {
        console.warn(`Removed ${removedDiaryEntries} old diary entries`);
    }
}
