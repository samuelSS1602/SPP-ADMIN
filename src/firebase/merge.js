// Pure merge rules for live cloud updates (kept free of Firebase/React so they can be unit tested).

export const LOCAL_PHOTO_FIELDS = ['customerPhoto', 'idProofPhoto', 'customerPhotoUrl', 'idProofPhotoUrl'];

export function bookingSortNumber(id) {
    const number = parseInt(String(id || '').replace(/\D/g, ''), 10);
    return Number.isNaN(number) ? 0 : number;
}

// Same guest and stay? Booking ids are reused after a renumber, so an id alone is not enough.
export function isSameStay(first, second) {
    return String(first.guestName || '') === String(second.guestName || '') &&
        String(first.createdAt || first.checkIn || '') === String(second.createdAt || second.checkIn || '');
}

/**
 * The cloud list replaces the local one. Photos cached in this browser are kept only while the id
 * still belongs to the same stay.
 * @returns {{ bookings: object[], localOnly: object[], reusedIds: string[] }}
 */
export function mergeCloudBookings(localBookings, cloudBookings) {
    const localById = new Map(localBookings.map(booking => [String(booking.id), booking]));
    const cloudIds = new Set();
    const reusedIds = [];
    const next = [];

    cloudBookings.forEach(cloud => {
        if (!cloud || !cloud.id) return;
        const id = String(cloud.id);
        cloudIds.add(id);
        const merged = { ...cloud };
        const local = localById.get(id);
        if (local && isSameStay(local, cloud)) {
            // Photos are kept in booking_photos, not in the booking document; keep this browser's copy.
            LOCAL_PHOTO_FIELDS.forEach(key => {
                if (local[key] && merged[key] === undefined) merged[key] = local[key];
            });
        } else if (local) {
            // This id now belongs to a different stay (renumbered on another device): drop its cached photos.
            reusedIds.push(id);
        }
        next.push(merged);
    });

    const localOnly = localBookings.filter(booking => booking.id && !cloudIds.has(String(booking.id)));
    next.sort((first, second) => bookingSortNumber(first.id) - bookingSortNumber(second.id) || String(first.id).localeCompare(String(second.id)));
    return { bookings: next, localOnly, reusedIds };
}

// Only rooms changed in the cloud are applied, so local check-out updates are not overwritten.
export function applyRoomChanges(rooms, changes) {
    changes.forEach(change => {
        if (change.type === 'removed') return;
        const cloudRoom = change.data;
        const room = rooms.find(item => String(item.id) === String(cloudRoom.id || change.id));
        if (!room) return;
        if (cloudRoom.price !== undefined) room.price = Number(cloudRoom.price) || room.price;
        if (cloudRoom.status) room.status = cloudRoom.status;
    });
}

export function applyDiaryChanges(diary, changes) {
    changes.forEach(change => {
        const entry = change.data;
        if (!entry.date || !entry.roomId) return;
        if (change.type === 'removed') {
            if (diary[entry.date]) delete diary[entry.date][entry.roomId];
            return;
        }
        if (!diary[entry.date]) diary[entry.date] = {};
        diary[entry.date][entry.roomId] = entry.guestName;
    });
}
