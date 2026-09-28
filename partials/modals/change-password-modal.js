/* Change password modal markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="changePasswordModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Change Access Credentials</h3>
                <span class="close-btn" onclick="closeChangePasswordModal()">&times;</span>
            </div>
            <form id="changePasswordForm" onsubmit="handlePasswordChange(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Current Password</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>New Password (min 6 char)</label>
                    <input type="password" id="newPassword" required minlength="6">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Confirm New Password</label>
                    <input type="password" id="confirmNewPassword" required minlength="6">
                </div>
                <button type="submit" class="btn-primary" style="width: 100%;">Update Credentials</button>
            </form>
        </div>
    </div>
`);
    loader.remove();
})();
