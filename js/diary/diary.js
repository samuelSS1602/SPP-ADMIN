
// Room Diary (Quick Reservation)
function initDiary() {
    const today = getLocalISODate();
    const dateInput = document.getElementById('diaryDate');
    if (dateInput) {
        dateInput.value = today;
        loadDiary(today);
    }
}

function loadDiary(date) {
    if (!date) return;

    // Clear all diary inputs first
    const diaryInputs = document.querySelectorAll('.diary-room-item input');
    diaryInputs.forEach(input => {
        input.value = '';
    });

    // Load from data.diary[date]
    if (data.diary && data.diary[date]) {
        for (const roomId in data.diary[date]) {
            const input = document.getElementById(`diary-${roomId}`);
            if (input) {
                input.value = data.diary[date][roomId];
            }
        }
    }
}

window.saveDiaryRoom = function (roomId, guestName) {
    const dateInput = document.getElementById('diaryDate');
    if (!dateInput) return;
    const date = dateInput.value;
    if (!date) return;

    if (!data.diary) data.diary = {};
    if (!data.diary[date]) data.diary[date] = {};

    data.diary[date][roomId] = guestName;
    saveDataToStorage();

    // Optional: Sync to Firebase if enabled
    if (firebaseEnabled && firebaseDb) {
        try {
            firebaseDb.collection('diaryReminder').doc(`${date}_${roomId}`).set({
                date: date,
                roomId: roomId,
                guestName: guestName,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.warn('Could not sync diary reminder to Firebase:', e);
        }
    }
};
