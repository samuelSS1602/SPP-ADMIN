/* Photo archive modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="allPhotosModal" class="modal">
        <div class="modal-content customer-modal-large" style="max-width: 1200px;">
            <div class="modal-header">
                <h3>Verification Photo Gallery Archive</h3>
                <span class="close-btn" onclick="closeAllPhotosModal()">&times;</span>
            </div>
            <div id="allPhotosStatus" style="font-size: 12px; color: var(--text-light); margin-bottom: 15px; padding: 10px; background: var(--surface-muted); border-radius: var(--radius-sm); border-left: 3px solid var(--secondary);">
                <i class="fas fa-spinner fa-spin"></i> Loading photos catalog...
            </div>
            <div id="allPhotosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; max-height: 500px; overflow-y: auto; padding: 5px;">
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
