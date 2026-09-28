/* Room price modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="priceModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Change Room Price</h3>
                <span class="close-btn" onclick="closePriceModal()">&times;</span>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Selected Room: <strong id="roomNameDisplay"></strong></label>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Current Price: <strong id="currentPriceDisplay"></strong></label>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>New Price (₹)</label>
                <input type="number" id="newPriceInput" placeholder="Enter new price" min="100">
            </div>
            <button class="btn-primary" onclick="updateRoomPrice()" style="width: 100%; margin-top: 15px;">Update Price</button>
        </div>
    </div>
`);
    loader.remove();
})();
