/* Receipt modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="receiptModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Tax Invoice Billing Statement</h3>
                <span class="close-btn" onclick="closeReceiptModal()">&times;</span>
            </div>
            <div id="receiptBody" class="receipt-body"></div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="printReceipt()"><i class="fas fa-print"></i> Print Invoice</button>
                <button class="btn-primary" onclick="downloadReceiptPDF()"><i class="fas fa-download"></i> Download Invoice PDF</button>
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
