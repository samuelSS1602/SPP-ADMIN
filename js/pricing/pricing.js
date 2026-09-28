
// ═══════════════════════════════════════════════════

function openExtraAmountModal(bookingId, roomId) {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (roomId) {
        currentRoomDetailsRoomId = roomId;
    }

    document.getElementById('extraInvoiceDisplay').textContent = `INV-${booking.id}`;
    document.getElementById('currentExtraDisplay').textContent = `₹${formatNumber(booking.extras || 0)}`;
    document.getElementById('extraAmountInput').value = '';
    document.getElementById('extraAmountInput').dataset.bookingId = bookingId;
    document.getElementById('extraAmountModal').classList.add('active');
}

function closeExtraAmountModal() {
    document.getElementById('extraAmountModal').classList.remove('active');
}

function updateExtraAmount() {
    const input = document.getElementById('extraAmountInput');
    const bookingId = input.dataset.bookingId;
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid extra amount');
        return;
    }

    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    booking.extras = (booking.extras || 0) + amount;
    saveDataToStorage();
    syncBookingToFirebase(booking);
    closeExtraAmountModal();
    loadPayments();
    loadRooms();
    updateRealtimeDashboardMetrics();
    if (currentRoomDetailsRoomId) {
        showRoomDetails(currentRoomDetailsRoomId);
    }
    alert(`Extra amount ₹${formatNumber(amount)} added to INV-${booking.id}`);
}


function openPriceModal(roomId, roomName, currentPrice) {
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) return;
    document.getElementById('roomNameDisplay').textContent = roomName;
    document.getElementById('currentPriceDisplay').textContent = '₹' + formatNumber(currentPrice);
    document.getElementById('newPriceInput').value = '';
    document.getElementById('newPriceInput').dataset.roomId = roomId;
    document.getElementById('priceModal').classList.add('active');
}

function closePriceModal() {
    document.getElementById('priceModal').classList.remove('active');
}

async function updateRoomPrice() {
    if (currentUserRole !== 'owner') {
        alert('Only the Owner can update room prices.');
        return;
    }

    const newPrice = parseFloat(document.getElementById('newPriceInput').value);
    const roomId = parseInt(document.getElementById('newPriceInput').dataset.roomId);

    if (!newPrice || newPrice < 100) {
        alert('Please enter a valid price (minimum ₹100)');
        return;
    }

    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
        const oldPrice = room.price;
        room.price = newPrice;

        try {
            if (firebaseEnabled && firebaseDb) {
                await firebaseDb.collection('rooms').doc(String(room.id)).set({
                    id: room.id,
                    name: room.name,
                    floor: room.floor,
                    type: room.type,
                    capacity: room.capacity,
                    price: room.price,
                    status: room.status,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
            saveDataToStorage();
        } catch (error) {
            room.price = oldPrice;
            saveDataToStorage();
            console.warn('Could not sync room price to Firebase:', error);
            alert('Price update failed and was reverted. Please try again.');
            return;
        }

        addAuditLog('PRICE_UPDATED', `Room ${room.name} | ₹${formatNumber(oldPrice)} → ₹${formatNumber(newPrice)} | Updated by ${currentUserName}`);
        alert(`Room ${room.name} price updated from ₹${formatNumber(oldPrice)} to ₹${formatNumber(newPrice)}`);
        closePriceModal();
        loadPricingPage();
        loadRooms();
        updateRealtimeDashboardMetrics();
    }
}
