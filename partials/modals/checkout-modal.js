/* Checkout confirmation modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="checkoutModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="checkoutModalTitle">
        <div class="modal-content checkout-modal-content">
            <div class="modal-header">
                <div>
                    <span class="eyebrow">Front desk action</span>
                    <h3 id="checkoutModalTitle">Confirm check-out</h3>
                </div>
                <button class="close-btn" type="button" onclick="closeCheckoutModal()" aria-label="Close checkout dialog">&times;</button>
            </div>
            <div id="checkoutModalBody"></div>
            <div class="checkout-confirmation"><i class="fas fa-circle-info"></i> Confirming checkout preserves this guest's stay history and releases the room for the next reservation.</div>
            <div class="modal-actions checkout-modal-actions">
                <button class="btn-secondary" type="button" onclick="closeCheckoutModal()">Cancel</button>
                <button class="btn-primary checkout-confirm-btn" type="button" onclick="confirmCheckout()"><i class="fas fa-check"></i> Confirm check-out</button>
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
