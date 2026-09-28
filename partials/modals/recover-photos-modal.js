/* Recover missing photos modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="recoverPhotosModal" class="modal">
        <div class="modal-content customer-modal-large" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Recover Orphaned Verification Images</h3>
                <span class="close-btn" onclick="closeRecoverPhotosModal()">&times;</span>
            </div>
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 15px;">Scanning database for orphaned photos belonging to deleted or renumbered booking records. You can link them back to active bookings below.</p>
            <div id="recoverPhotosStatus" style="padding: 15px; background: var(--surface-muted); border-radius: var(--radius-md); text-align: center; margin-bottom: 20px;">
                <i class="fas fa-spinner fa-spin"></i> Scanning cloud databases...
            </div>
            <div id="recoverPhotosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 15px; max-height: 400px; overflow-y: auto;">
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
