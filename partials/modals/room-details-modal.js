/* Room details modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="roomDetailsModal" class="modal">
        <div class="modal-content customer-modal-large">
            <div class="modal-header" style="margin-bottom: 10px;">
                <h3>Room Console Details</h3>
                <span class="close-btn" onclick="closeRoomDetailsModal()">&times;</span>
            </div>
            <div id="roomDetailsContent"></div>
        </div>
    </div>
`);
    loader.remove();
})();
