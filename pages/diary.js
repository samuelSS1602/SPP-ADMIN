/* Room diary page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="diary" class="page-content">
                    <div class="page-header">
                        <h2>Room Diary & Reservations</h2>
                        <div class="diary-date-picker">
                            <i class="fas fa-calendar-day" style="color: var(--secondary);"></i>
                            <label style="font-weight: 700; font-size: 12px; text-transform: uppercase;">Selected Date</label>
                            <input type="date" id="diaryDate" onchange="loadDiary(this.value)">
                        </div>
                    </div>
                    <div class="card" style="margin-bottom: 20px;">
                        <div class="diary-instructions">
                            <p><i class="fas fa-info-circle"></i> Quick reservation book. Type occupant names on specific room inputs below. Changes are saved automatically when clicking outside input fields.</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="diary-grid">
                            <div class="diary-floor-section">
                                <h3><i class="fas fa-building" style="color: var(--secondary);"></i> Floor 1</h3>
                                <div class="diary-rooms-grid">
                                    <div class="diary-room-item">
                                        <label>Room 101 (F1-102)</label>
                                        <input type="text" id="diary-101" placeholder="Occupant full name" onblur="saveDiaryRoom(101, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 102 (F1-103)</label>
                                        <input type="text" id="diary-102" placeholder="Occupant full name" onblur="saveDiaryRoom(102, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 103 (F1-104)</label>
                                        <input type="text" id="diary-103" placeholder="Occupant full name" onblur="saveDiaryRoom(103, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 104 (F1-105)</label>
                                        <input type="text" id="diary-104" placeholder="Occupant full name" onblur="saveDiaryRoom(104, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 105 (F1-101)</label>
                                        <input type="text" id="diary-105" placeholder="Occupant full name" onblur="saveDiaryRoom(105, this.value)">
                                    </div>
                                </div>
                            </div>
                            <div class="diary-floor-section">
                                <h3><i class="fas fa-building" style="color: var(--secondary);"></i> Floor 2</h3>
                                <div class="diary-rooms-grid">
                                    <div class="diary-room-item">
                                        <label>Room 201 (F2-201)</label>
                                        <input type="text" id="diary-201" placeholder="Occupant full name" onblur="saveDiaryRoom(201, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 202 (F2-202)</label>
                                        <input type="text" id="diary-202" placeholder="Occupant full name" onblur="saveDiaryRoom(202, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 203 (F2-203)</label>
                                        <input type="text" id="diary-203" placeholder="Occupant full name" onblur="saveDiaryRoom(203, this.value)">
                                    </div>
                                    <div class="diary-room-item">
                                        <label>Room 204 (F2-204)</label>
                                        <input type="text" id="diary-204" placeholder="Occupant full name" onblur="saveDiaryRoom(204, this.value)">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
