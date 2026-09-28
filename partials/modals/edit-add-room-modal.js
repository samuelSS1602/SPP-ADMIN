/* Add room to booking modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="editAddRoomModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Assign Additional Room</h3>
                <span class="close-btn" onclick="closeEditAddRoomModal()">&times;</span>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Available Rooms</label>
                <select id="editAddRoomSelect">
                    <option value="">-- Select Room ID --</option>
                </select>
            </div>
            <button class="btn-primary" onclick="confirmEditAddRoom()" style="width: 100%; margin-top: 15px;">Confirm Room Assignment</button>
        </div>
    </div>
`);
    loader.remove();
})();
