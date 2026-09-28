

function upsertGuestRecord(name, phone, email, lastVisit, lastBookingId) {
    const existingGuest = data.guests.find(guest => guest.phone === phone || guest.name === name);

    if (existingGuest) {
        existingGuest.name = name;
        existingGuest.phone = phone;
        existingGuest.email = email || existingGuest.email;
        existingGuest.visits += 1;
        existingGuest.lastVisit = lastVisit;
        if (lastBookingId) existingGuest.lastBookingId = lastBookingId;
        return;
    }

    data.guests.push({
        name,
        email: email || 'N/A',
        phone,
        visits: 1,
        lastVisit,
        lastBookingId: lastBookingId || null
    });
}
