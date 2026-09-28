let currentEditBookingRooms = [];

function renderEditBookingRooms() {
    const list = document.getElementById('editRoomsList');
    if (!list) return;
    if (currentEditBookingRooms.length === 0) {
        list.innerHTML = '<small style="color: var(--text-light);">No rooms assigned.</small>';
        return;
    }
    let html = '';
    currentEditBookingRooms.forEach((r, idx) => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
                <span><strong>${r.roomName}</strong> <small>(Floor ${r.floor})</small></span>
                <button type="button" class="btn-primary" style="padding: 2px 6px; font-size: 10px; background: #ef4444;" onclick="removeRoomFromEditBooking(${r.roomId})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.removeRoomFromEditBooking = function(roomId) {
    if (currentEditBookingRooms.length <= 1) {
        alert('Cannot remove the last room. A booking must have at least one room.');
        return;
    }
    const roomToRemove = currentEditBookingRooms.find(r => r.roomId === roomId);
    if (roomToRemove) {
        const rateInput = document.getElementById('editRoomRate');
        let currentRate = parseFloat(rateInput.value) || 0;
        currentRate = Math.max(0, currentRate - roomToRemove.price);
        rateInput.value = currentRate;
    }
    currentEditBookingRooms = currentEditBookingRooms.filter(r => r.roomId !== roomId);
    renderEditBookingRooms();
};

window.openEditAddRoomModal = function() {
    const select = document.getElementById('editAddRoomSelect');
    select.innerHTML = '<option value="">-- Select a room --</option>';
    
    const availableRooms = data.rooms.filter(room => 
        (room.status === 'available' || room.status === 'cleaning') && 
        !currentEditBookingRooms.some(r => r.roomId === room.id)
    );
    
    if (availableRooms.length === 0) {
        alert('No additional rooms available.');
        return;
    }
    
    availableRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = `${room.name} (${room.type}) - Floor ${room.floor} - ₹${room.price}`;
        select.appendChild(option);
    });
    
    document.getElementById('editAddRoomModal').classList.add('active');
};

window.closeEditAddRoomModal = function() {
    document.getElementById('editAddRoomModal').classList.remove('active');
};

window.confirmEditAddRoom = function() {
    const select = document.getElementById('editAddRoomSelect');
    const roomId = parseInt(select.value);
    if (!roomId) {
        alert('Please select a room.');
        return;
    }
    
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
        currentEditBookingRooms.push({
            roomId: room.id,
            roomName: room.name,
            floor: room.floor,
            price: room.price
        });
        
        const rateInput = document.getElementById('editRoomRate');
        const currentRate = parseFloat(rateInput.value) || 0;
        rateInput.value = currentRate + room.price;
        
        renderEditBookingRooms();
        closeEditAddRoomModal();
    }
};

window.openEditBookingModal = function(bookingId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    currentEditBookingRooms = [];
    if (booking.rooms && booking.rooms.length > 0) {
        currentEditBookingRooms = JSON.parse(JSON.stringify(booking.rooms));
    } else if (booking.roomId) {
        currentEditBookingRooms.push({
            roomId: booking.roomId,
            roomName: booking.roomName,
            floor: booking.floor,
            price: booking.roomRate || 0
        });
    }
    renderEditBookingRooms();

    document.getElementById('editBookingId').value = booking.id;
    document.getElementById('editGuestName').value = booking.guestName || '';
    document.getElementById('editGuestPhone').value = booking.guestPhone || '';
    document.getElementById('editGuestEmail').value = booking.guestEmail || '';
    document.getElementById('editAdvanceAmount').value = booking.advance || 0;
    document.getElementById('editRoomRate').value = booking.roomRate || 0;
    document.getElementById('editExtras').value = booking.extras || 0;
    document.getElementById('editExtraBed').value = booking.extraBed || 0;
    
    document.getElementById('editMaleCount').value = booking.maleCount !== undefined ? booking.maleCount : (booking.adultsCount || 1);
    document.getElementById('editFemaleCount').value = booking.femaleCount || 0;
    document.getElementById('editChildrenCount').value = booking.childrenCount !== undefined ? booking.childrenCount : 0;
    
    document.getElementById('editVehicleNumber').value = booking.vehicleNumber || '';
    document.getElementById('editCompanyName').value = booking.companyName || '';
    document.getElementById('editGuestGST').value = booking.guestGST || '';
    document.getElementById('editRecommendedBy').value = booking.recommendedBy || '';

    // Populate Payment Method
    const editPayMethodSelect = document.getElementById('editPaymentMethod');
    if (editPayMethodSelect) {
        editPayMethodSelect.value = booking.paymentMethod || 'Cash';
    }
    const editBookingSourceSelect = document.getElementById('editBookingSource');
    if (editBookingSourceSelect) {
        editBookingSourceSelect.value = booking.bookingSource || '';
    }
    toggleEditBookingSource();

    document.getElementById('editCheckInDate').value = booking.checkIn || '';
    populateTimeToInput(booking.checkInTime, 'editCheckInTime');

    document.getElementById('editCheckOutDate').value = booking.checkOut || '';
    populateTimeToInput(booking.checkOutTime, 'editCheckOutTime');

    document.getElementById('editBookingModal').classList.add('active');
};

window.closeEditBookingModal = function() {
    document.getElementById('editBookingModal').classList.remove('active');
};

window.toggleEditBookingSource = function() {
    const method = document.getElementById('editPaymentMethod')?.value;
    const sourceGroup = document.getElementById('editOnlineBookingSourceGroup');
    if (sourceGroup) {
        sourceGroup.style.display = method === 'Online' ? '' : 'none';
    }
};

window.saveEditedBooking = function() {
    const bookingId = document.getElementById('editBookingId').value;
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (currentEditBookingRooms.length === 0) {
        alert('A booking must have at least one assigned room.');
        return;
    }

    const oldRoomIds = [];
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(r => oldRoomIds.push(r.roomId));
    } else if (booking.roomId) {
        oldRoomIds.push(booking.roomId);
    }

    const newRoomIds = currentEditBookingRooms.map(r => r.roomId);

    // Free removed rooms
    oldRoomIds.forEach(id => {
        if (!newRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if(r) r.status = 'available';
        }
    });

    // Occupy added rooms
    newRoomIds.forEach(id => {
        if (!oldRoomIds.includes(id)) {
            const r = data.rooms.find(x => x.id == id);
            if(r) r.status = 'occupied';
        }
    });

    booking.rooms = JSON.parse(JSON.stringify(currentEditBookingRooms));
    booking.roomId = currentEditBookingRooms[0].roomId;
    booking.roomName = currentEditBookingRooms[0].roomName;
    booking.floor = currentEditBookingRooms[0].floor;

    booking.guestName = document.getElementById('editGuestName').value.trim();
    booking.guestPhone = document.getElementById('editGuestPhone').value.trim();
    booking.guestEmail = document.getElementById('editGuestEmail').value.trim();
    // Sanitize numeric inputs (allow formatted numbers with commas)
    function parseNumberInput(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        let v = el.value;
        if (typeof v === 'string') v = v.replace(/,/g, '').trim();
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }

    booking.advance = parseNumberInput('editAdvanceAmount');
    booking.roomRate = parseNumberInput('editRoomRate');
    booking.extras = parseNumberInput('editExtras');
    booking.extraBed = parseNumberInput('editExtraBed');
    
    booking.maleCount = parseInt(document.getElementById('editMaleCount').value) || 0;
    booking.femaleCount = parseInt(document.getElementById('editFemaleCount').value) || 0;
    booking.childrenCount = parseInt(document.getElementById('editChildrenCount').value) || 0;
    
    // Maintain legacy field for compatibility
    booking.adultsCount = booking.maleCount + booking.femaleCount;
    
    booking.vehicleNumber = document.getElementById('editVehicleNumber').value.trim();
    booking.companyName = document.getElementById('editCompanyName').value.trim();
    booking.guestGST = document.getElementById('editGuestGST').value.trim().toUpperCase();
    booking.recommendedBy = document.getElementById('editRecommendedBy').value.trim();

    // Save Payment Method
    const editPayMethodSelect = document.getElementById('editPaymentMethod');
    if (editPayMethodSelect) {
        booking.paymentMethod = editPayMethodSelect.value;
    }
    if (booking.paymentMethod === 'Online') {
        const editBookingSourceSelect = document.getElementById('editBookingSource');
        if (editBookingSourceSelect) {
            booking.bookingSource = editBookingSourceSelect.value;
        }
    } else {
        booking.bookingSource = '';
    }

    booking.checkIn = document.getElementById('editCheckInDate').value;
    booking.checkInTime = toDisplayTime(document.getElementById('editCheckInTime').value);

    booking.checkOut = document.getElementById('editCheckOutDate').value;
    booking.checkOutTime = toDisplayTime(document.getElementById('editCheckOutTime').value);

    closeEditBookingModal();
    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    loadBookings();
    loadPayments();
    if (typeof loadRooms === 'function') loadRooms();
    updateRealtimeDashboardMetrics();
    alert(`Booking ${bookingId} details updated.`);
};

window.cancelBooking = function(bookingId) {
    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    if (booking.status === 'completed' || booking.status === 'cancelled') {
        alert(`This booking is already ${booking.status}.`);
        return;
    }

    const shouldCancel = confirm(`Are you sure you want to CANCEL booking ${booking.id} for ${booking.guestName}?`);
    if (!shouldCancel) return;

    booking.status = 'cancelled';
    
    // Free all rooms in the booking
    if (booking.rooms && booking.rooms.length > 0) {
        booking.rooms.forEach(roomData => {
            const room = data.rooms.find(item => item.id === roomData.roomId);
            if (room) {
                room.status = 'available';
            }
        });
    } else if (booking.roomId) {
        // Fallback for old single-room bookings
        const room = data.rooms.find(item => item.id == booking.roomId);
        if (room) {
            room.status = 'available';
        }
    }

    saveDataToStorage();
    syncBookingToFirebase(booking);
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Cancelled', `Booking ${booking.id} for guest ${booking.guestName} was CANCELLED.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('alert', 'Booking Cancelled', `Stay ${booking.id} (${booking.guestName}) has been cancelled.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Booking ${bookingId} has been cancelled.`);
};

window.deleteBooking = async function(bookingId) {
    const booking = data.bookings.find(item => item.id === bookingId);
    if (!booking) return;

    const shouldDelete = confirm(`⚠️ PERMANENTLY DELETE booking ${booking.id} for ${booking.guestName}?\n\nThis will remove the booking and renumber all remaining bookings sequentially.\n\nThis action CANNOT be undone!`);
    if (!shouldDelete) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(`Are you ABSOLUTELY sure? This will delete ${booking.id} and renumber all bookings.`);
    if (!doubleConfirm) return;

    // Store old IDs for Firebase cleanup
    const oldIds = data.bookings.map(b => b.id);

    // Remove the booking from the array
    const index = data.bookings.findIndex(item => item.id === bookingId);
    if (index === -1) return;
    data.bookings.splice(index, 1);

    // Delete the old booking document from Firebase and IndexedDB
    deletePhotoFromLocal(bookingId).catch(err => console.warn('Failed to delete IndexedDB photo:', err));
    if (firebaseEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('bookings').doc(String(bookingId)).delete();
            await firebaseDb.collection('booking_photos').doc(String(bookingId)).delete();
        } catch (err) {
            console.warn('Failed to delete old Firebase doc:', err);
        }
    }

    // Renumber all remaining bookings sequentially: BK001, BK002, BK003...
    const renameMap = []; // { oldId, newId }
    for (let i = 0; i < data.bookings.length; i++) {
        const newId = `BK${String(i + 1).padStart(3, '0')}`;
        const oldId = data.bookings[i].id;
        if (oldId !== newId) {
            renameMap.push({ oldId, newId });
        }
        data.bookings[i].id = newId;
    }

    // Update Firebase and IndexedDB: move docs and sync new ones for renamed bookings
    for (const { oldId, newId } of renameMap) {
        migratePhotoInLocal(oldId, newId).catch(err => console.warn(`IndexedDB migrate ${oldId}→${newId} failed:`, err));
    }
    if (firebaseEnabled && firebaseDb && renameMap.length > 0) {
        for (const { oldId, newId } of renameMap) {
            try {
                // Migrate photos document if it exists
                const photoDoc = await firebaseDb.collection('booking_photos').doc(String(oldId)).get();
                if (photoDoc.exists) {
                    await firebaseDb.collection('booking_photos').doc(String(newId)).set(photoDoc.data());
                    await firebaseDb.collection('booking_photos').doc(String(oldId)).delete();
                }

                // Delete old document
                await firebaseDb.collection('bookings').doc(String(oldId)).delete();
            } catch (err) {
                console.warn(`Failed to migrate Firebase docs from ${oldId} to ${newId}:`, err);
            }
        }
        // Re-sync all bookings with new IDs to Firebase
        for (const booking of data.bookings) {
            syncBookingToFirebase(booking);
        }
    }

    // Also update customer booking history references
    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            const renamed = renameMap.find(r => r.oldId === historyItem.bookingId);
            if (renamed) {
                historyItem.bookingId = renamed.newId;
            }
        });
    });

    // Also update guest lastBookingId references
    data.guests.forEach(guest => {
        if (guest.lastBookingId) {
            const renamed = renameMap.find(r => r.oldId === guest.lastBookingId);
            if (renamed) {
                guest.lastBookingId = renamed.newId;
            }
        }
    });

    saveDataToStorage();
    
    // REDESIGN AUDITING
    if (typeof addAuditLog === 'function') {
        addAuditLog('Booking Deleted', `Booking ${bookingId} was PERMANENTLY DELETED. System reindexed other bookings.`);
    }
    if (typeof addNotification === 'function') {
        addNotification('alert', 'Booking Permanently Deleted', `Booking ID ${bookingId} has been deleted by Owner.`);
    }

    loadBookings();
    loadRooms();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Booking ${bookingId} has been deleted. All bookings have been renumbered sequentially.`);
};

window.renumberAllBookings = async function() {
    if (data.bookings.length === 0) {
        alert('No bookings to renumber.');
        return;
    }

    // Check if renumbering is even needed
    let needsRenumber = false;
    for (let i = 0; i < data.bookings.length; i++) {
        const expectedId = `BK${String(i + 1).padStart(3, '0')}`;
        if (data.bookings[i].id !== expectedId) {
            needsRenumber = true;
            break;
        }
    }

    if (!needsRenumber) {
        alert('All booking IDs are already sequential. No renumbering needed.');
        return;
    }

    const shouldRenumber = confirm(`⚠️ RENUMBER ALL BOOKINGS?\n\nThis will reassign all booking IDs to be sequential (BK001, BK002, BK003...) with no gaps.\n\nAll Firebase records will be updated.\n\nContinue?`);
    if (!shouldRenumber) return;

    // Store old IDs for Firebase cleanup
    const renameMap = [];
    for (let i = 0; i < data.bookings.length; i++) {
        const newId = `BK${String(i + 1).padStart(3, '0')}`;
        const oldId = data.bookings[i].id;
        if (oldId !== newId) {
            renameMap.push({ oldId, newId });
        }
        data.bookings[i].id = newId;
        
        // Clear cached photo URLs so they're fetched fresh from Firebase with new ID
        if (data.bookings[i].customerPhotoUrl) {
            delete data.bookings[i].customerPhotoUrl;
        }
        if (data.bookings[i].idProofPhotoUrl) {
            delete data.bookings[i].idProofPhotoUrl;
        }
    }

    // Update Firebase and IndexedDB: move docs and re-sync with new IDs
    for (const { oldId, newId } of renameMap) {
        migratePhotoInLocal(oldId, newId).catch(err => console.warn(`IndexedDB migrate ${oldId}→${newId} failed:`, err));
    }
    if (firebaseEnabled && firebaseDb && renameMap.length > 0) {
        for (const { oldId, newId } of renameMap) {
            try {
                // Migrate photos document if it exists
                const photoDoc = await firebaseDb.collection('booking_photos').doc(String(oldId)).get();
                if (photoDoc.exists) {
                    const photoData = photoDoc.data();
                    // Update the booking reference in the photo document to the new ID
                    photoData.bookingId = newId;
                    await firebaseDb.collection('booking_photos').doc(String(newId)).set(photoData);
                    await firebaseDb.collection('booking_photos').doc(String(oldId)).delete();
                }
                
                // Delete old booking document (it will be recreated with new ID by syncBookingToFirebase)
                await firebaseDb.collection('bookings').doc(String(oldId)).delete();
            } catch (err) {
                console.warn(`Failed to migrate Firebase docs from ${oldId} to ${newId}:`, err);
            }
        }
        // Re-sync all bookings with new IDs
        for (const booking of data.bookings) {
            syncBookingToFirebase(booking);
        }
    }

    // Update customer booking history references
    data.customers.forEach(customer => {
        if (!Array.isArray(customer.bookingHistory)) return;
        customer.bookingHistory.forEach(historyItem => {
            const renamed = renameMap.find(r => r.oldId === historyItem.bookingId);
            if (renamed) {
                historyItem.bookingId = renamed.newId;
            }
        });
    });

    // Update guest lastBookingId references
    data.guests.forEach(guest => {
        if (guest.lastBookingId) {
            const renamed = renameMap.find(r => r.oldId === guest.lastBookingId);
            if (renamed) {
                guest.lastBookingId = renamed.newId;
            }
        }
    });

    saveDataToStorage();
    loadBookings();
    loadPayments();
    updateRealtimeDashboardMetrics();

    alert(`Done! ${renameMap.length} booking(s) have been renumbered sequentially.`);
};
