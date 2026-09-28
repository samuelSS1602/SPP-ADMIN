/* Login screen markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
    <div id="loginPage" class="login-container" role="main">
        <div class="login-wrapper">
            <div class="login-content">
                <div class="login-header">
                    <img src="WhatsApp Image 2026-04-16 at 2.00.16 PM.jpeg" alt="Sri Padmavati Pleasants" class="login-logo" width="62" height="61">
                    <h1>Sri Padmavati Pleasants</h1>
                    <p>Enterprise Management Console</p>
                </div>
                <form class="login-form" id="loginForm">
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" placeholder="Enter your email" required>
                        <span class="form-icon"><i class="fas fa-envelope"></i></span>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" placeholder="Enter your password" required>
                        <span class="form-icon"><i class="fas fa-lock"></i></span>
                    </div>
                    <button type="submit" class="btn-login">Sign In</button>
                </form>
            </div>
            <div class="login-side">
                <div class="side-content">
                    <h2>Sri Padmavati Pleasants</h2>
                    <p>Redesigned enterprise dashboard providing front-desk operations, room controls, real-time sync, and financial analytics.</p>
                    <div class="side-features">
                        <div>
                            <i class="fas fa-chart-line" style="color: var(--warning); margin-right: 10px;"></i>
                            <span>Enterprise Reports & GST Billing</span>
                        </div>
                        <div>
                            <i class="fas fa-bed" style="color: var(--warning); margin-right: 10px;"></i>
                            <span>Housekeeping Kanban System</span>
                        </div>
                        <div>
                            <i class="fas fa-users-cog" style="color: var(--warning); margin-right: 10px;"></i>
                            <span>Staff Management & Rosters</span>
                        </div>
                        <div>
                            <i class="fas fa-camera" style="color: var(--warning); margin-right: 10px;"></i>
                            <span>Webcam ID & Verification</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`);
    loader.remove();
})();
