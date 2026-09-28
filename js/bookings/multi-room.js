
// ===== MULTI-ROOM BOOKING FUNCTIONS =====
function setupMultiRoomBookingListeners() {
    const roomSelect = document.getElementById('bookingRoomId');
    if (!roomSelect) return;

    roomSelect.addEventListener('change', function () {
        const selectedRoomId = parseInt(this.value, 10);
        if (!selectedRoomId) {
            multiRoomBookingSelection = [];
            updateSelectedRoomsDisplay();
            return;
        }

        const room = data.rooms.find(r => r.id === selectedRoomId);
        if (!room) return;

        // Check if room already selected
        if (multiRoomBookingSelection.some(r => r.roomId === selectedRoomId)) {
            alert('This room is already selected');
            return;
        }

        // Add first/primary room to selection
        multiRoomBookingSelection = [{
            roomId: room.id,
            roomName: room.name,
            floor: room.floor,
            price: room.price
        }];

        updateSelectedRoomsDisplay();
    });

    const checkInInput = document.getElementById('bookingCheckIn');
    if (checkInInput) {
        checkInInput.addEventListener('change', function () {
            updateSelectedRoomsDisplay();
        });
    }
}

function addExtraRoomToBooking() {
    if (multiRoomBookingSelection.length === 0) {
        alert('Please select a primary room first');
        return;
    }

    const availableRooms = data.rooms.filter(room =>
        room.status === 'available' &&
        !multiRoomBookingSelection.some(r => r.roomId === room.id)
    );

    if (availableRooms.length === 0) {
        alert('No additional available rooms to add');
        return;
    }

    // Show a simple modal or dropdown to select extra room
    let roomOptions = availableRooms.map(room =>
        `<option value="${room.id}">${room.name} - Floor ${room.floor} - ₹${formatNumber(room.price)}</option>`
    ).join('');

    const html = `
        <div style="padding: 15px;">
            <h4>Select Additional Room for Same Guest</h4>
            <p style="font-size: 13px; color: var(--text-light);">These rooms are currently selected:</p>
            <div style="background: #f0f4f8; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                ${multiRoomBookingSelection.map((r, idx) =>
        `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd;">
                        <span><strong>${r.roomName}</strong> (Floor ${r.floor})</span>
                        <span>₹${formatNumber(r.price)}${idx > 0 ? ` <button style="padding: 2px 6px; color: red;" onclick="removeRoomFromSelection(${r.roomId})">Remove</button>` : ''}</span>
                    </div>`
    ).join('')}
            </div>
            <select id="extraRoomSelect" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                <option value="">-- Select room to add --</option>
                ${roomOptions}
            </select>
            <div style="display: flex; gap: 8px;">
                <button class="btn-primary" onclick="confirmAddExtraRoom()" style="flex:1;">Add Room</button>
                <button class="btn-primary" style="flex:1; background: #95A5A6;" onclick="closeExtraRoomModal()">Cancel</button>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'extraRoomModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    modal.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">${html}</div>`;
    document.body.appendChild(modal);
}

function confirmAddExtraRoom() {
    const select = document.getElementById('extraRoomSelect');
    const selectedRoomId = parseInt(select.value, 10);

    if (!selectedRoomId) {
        alert('Please select a room');
        return;
    }

    const room = data.rooms.find(r => r.id === selectedRoomId);
    if (!room || room.status !== 'available') {
        alert('Selected room is no longer available');
        closeExtraRoomModal();
        return;
    }

    multiRoomBookingSelection.push({
        roomId: room.id,
        roomName: room.name,
        floor: room.floor,
        price: room.price
    });

    updateSelectedRoomsDisplay();
    closeExtraRoomModal();
}

function closeExtraRoomModal() {
    const modal = document.getElementById('extraRoomModal');
    if (modal) modal.remove();
}

function removeRoomFromSelection(roomId) {
    multiRoomBookingSelection = multiRoomBookingSelection.filter(r => r.roomId !== roomId);
    updateSelectedRoomsDisplay();
}

function updateSelectedRoomsDisplay() {
    const displayDiv = document.getElementById('selectedRoomsDisplay');
    if (!displayDiv) return;

    if (multiRoomBookingSelection.length === 0) {
        displayDiv.innerHTML = '<small style="color: var(--text-light);">First room will be added when you select it above</small>';
        return;
    }

    let totalRate = 0;
    let html = '';

    multiRoomBookingSelection.forEach((room, idx) => {
        totalRate += room.price;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid var(--secondary);">
                <div>
                    <strong>${room.roomName}</strong> 
                    <span style="color: var(--text-light); font-size: 11px;">(Floor ${room.floor})</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--secondary);">₹${formatNumber(room.price)}</div>
                    ${idx > 0 ? `<button type="button" class="btn-primary" style="padding: 2px 6px; font-size: 10px; background: #E74C3C; margin-top: 2px;" onclick="removeRoomFromSelection(${room.roomId})"><i class="fas fa-trash"></i> Remove</button>` : '<small style="color: var(--text-light);">Primary</small>'}
                </div>
            </div>
        `;
    });

    // Auto-calculate dynamic surcharges
    let finalRate = totalRate;
    let surchargeInfo = [];
    const checkInDateVal = document.getElementById('bookingCheckIn') ? document.getElementById('bookingCheckIn').value : '';
    const settings = data.settings || {};

    if (checkInDateVal && settings.weekendSurcharge > 0) {
        // Use local day of week (Sunday is 0, Friday is 5, Saturday is 6)
        const dayOfWeek = new Date(checkInDateVal).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            const amt = totalRate * (settings.weekendSurcharge / 100);
            finalRate += amt;
            surchargeInfo.push(`Weekend Surge (+${settings.weekendSurcharge}%)`);
        }
    }

    if (settings.holidaySurgeActive && settings.holidaySurgeRate > 0) {
        const amt = totalRate * (settings.holidaySurgeRate / 100);
        finalRate += amt;
        surchargeInfo.push(`Holiday Surge (+${settings.holidaySurgeRate}%)`);
    }

    const roundedRate = Math.round(finalRate);

    // Auto fill Room Rate in the booking form
    const rateInput = document.getElementById('bookingRoomRate');
    if (rateInput) {
        rateInput.value = roundedRate;
        
        let surgeNotice = document.getElementById('bookingSurgeNotice');
        if (!surgeNotice) {
            surgeNotice = document.createElement('small');
            surgeNotice.id = 'bookingSurgeNotice';
            surgeNotice.style.cssText = 'display: block; color: var(--warning); font-weight: bold; margin-top: 4px;';
            rateInput.parentNode.appendChild(surgeNotice);
        }
        
        if (surchargeInfo.length > 0) {
            surgeNotice.textContent = `⚡ Surcharges applied: ${surchargeInfo.join(' & ')}`;
        } else {
            surgeNotice.textContent = '';
        }
    }

    html += `
        <div style="padding: 8px; background: #e8f4f8; border-radius: 4px; border-top: 2px solid var(--secondary); margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span><strong>Base Rate:</strong></span>
                <span style="font-weight: 600;">₹${formatNumber(totalRate)}</span>
            </div>
            ${surchargeInfo.length > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--warning); margin-top: 2px;">
                <span>Surcharges:</span>
                <span>+ ₹${formatNumber(roundedRate - totalRate)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); margin-top: 4px; padding-top: 4px; font-size: 14px;">
                <span><strong>Final Rate:</strong></span>
                <span style="color: var(--secondary); font-weight: 700;">₹${formatNumber(roundedRate)}</span>
            </div>
        </div>
    `;

    displayDiv.innerHTML = html;
}
