/* Guest photo history modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="guestPhotoHistoryModal" class="modal">
        <div class="modal-content customer-modal-large" style="max-width: 1100px; max-height: 90vh; overflow-y: auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 id="guestPhotoHistoryTitle" style="color: var(--primary-brand); margin: 0; font-size: 22px;"><i class="fas fa-history"></i> Guest Photo History</h3>
                <span class="close-btn" onclick="closeGuestPhotoHistoryModal()" style="font-size: 28px; cursor: pointer;">&times;</span>
            </div>
            <div id="guestPhotoHistoryContent" style="display: flex; flex-direction: column; gap: 20px;"></div>
            <button class="btn-primary" onclick="closeGuestPhotoHistoryModal()" style="margin-top: 15px; width: 100%; padding: 12px; font-size: 14px;">Close</button>
        </div>
    </div>
`);
    loader.remove();
})();
