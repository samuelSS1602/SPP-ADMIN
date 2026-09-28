/* Booking photo viewer modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="photoViewerModal" class="modal">
        <div class="modal-content customer-modal-large" style="max-width: 800px; text-align: center;">
            <div class="modal-header">
                <h3 id="photoViewerTitle">Guest Photos Proof</h3>
                <span class="close-btn" onclick="document.getElementById('photoViewerModal').style.display='none'">&times;</span>
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                <div style="flex: 1; min-width: 300px;">
                    <h4 style="margin-bottom: 10px; font-size: 13px;">Customer Photo Portrait</h4>
                    <img id="viewerCustomerPhoto" src="" alt="Customer Photo" style="width: 100%; height: 320px; object-fit: contain; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                    <p id="viewerCustomerPhotoStatus" style="color: var(--text-light); font-style: italic; display: none; margin-top:10px;">Not Recorded</p>
                    <button class="btn-primary" id="updateCustomerPhotoBtn" onclick="triggerUpdateCustomerPhoto()" style="margin-top: 12px; font-size: 11px; background: var(--warning); width: 100%;">
                        <i class="fas fa-camera"></i> Update Photo
                    </button>
                    <input type="file" id="updateCustomerPhotoInput" accept="image/*" style="display: none;" onchange="handleUpdateCustomerPhoto(this)">
                </div>
                <div style="flex: 1; min-width: 300px;">
                    <h4 style="margin-bottom: 10px; font-size: 13px;">ID Proof Card Scan</h4>
                    <img id="viewerIdProofPhoto" src="" alt="ID Proof Scan" style="width: 100%; height: 320px; object-fit: contain; background: var(--surface-muted); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                    <p id="viewerIdProofPhotoStatus" style="color: var(--text-light); font-style: italic; display: none; margin-top:10px;">Not Recorded</p>
                    <button class="btn-primary" id="updateIdProofPhotoBtn" onclick="triggerUpdateIdProofPhoto()" style="margin-top: 12px; font-size: 11px; background: var(--warning); width: 100%;">
                        <i class="fas fa-camera"></i> Update Photo ID
                    </button>
                    <input type="file" id="updateIdProofPhotoInput" accept="image/*" style="display: none;" onchange="handleUpdateIdProofPhoto(this)">
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="document.getElementById('photoViewerModal').style.display='none'" style="width: 150px; justify-content: center;">Close Gallery</button>
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
