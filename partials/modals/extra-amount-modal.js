/* Extra amount modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="extraAmountModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Add Extra Miscellaneous Tariff</h3>
                <span class="close-btn" onclick="closeExtraAmountModal()">&times;</span>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Invoice: <strong id="extraInvoiceDisplay"></strong></label>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Current Extras: <strong id="currentExtraDisplay"></strong></label>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Extra Amount to Add (₹)</label>
                <input type="number" id="extraAmountInput" placeholder="Enter amount to add" min="1">
            </div>
            <button class="btn-primary" onclick="updateExtraAmount()" style="width: 100%; margin-top: 15px;">Confirm Extra Charge</button>
        </div>
    </div>
`);
    loader.remove();
})();
