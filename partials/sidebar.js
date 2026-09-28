/* Sidebar navigation markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
        <aside class="sidebar" id="sidebar">
            <div>
                <div class="sidebar-header">
                    <div class="brand-logo">
                        <img src="logo - Copy.jpeg" alt="Logo" class="sidebar-logo" width="62" height="61">
                        <div class="brand-text">
                            <h3>Sri Padmavati</h3>
                            <p>Pleasants</p>
                        </div>
                    </div>
                </div>
                <nav class="sidebar-nav" aria-label="Main navigation">
                    <button class="nav-item active" onclick="navigateTo('dashboard', this)">
                        <i class="fas fa-chart-pie"></i>
                        <span>Dashboard</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('bookings', this)">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Bookings</span>
                    </button>
                    <button class="nav-item receptionist-only" onclick="navigateTo('new-booking', this)">
                        <i class="fas fa-plus-circle"></i>
                        <span>New Booking</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('diary', this)">
                        <i class="fas fa-book-open"></i>
                        <span>Room Diary</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('rooms', this)">
                        <i class="fas fa-door-open"></i>
                        <span>Room Control</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('pricing', this)">
                        <i class="fas fa-tag"></i>
                        <span>Room Pricing</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('guests', this)">
                        <i class="fas fa-users"></i>
                        <span>Guests CRM</span>
                    </button>
                    <button class="nav-item owner-only" onclick="navigateTo('audit-logs-tab', this)">
                        <i class="fas fa-history"></i>
                        <span>Audit Logs</span>
                    </button>
                    <button class="nav-item owner-only" onclick="navigateTo('payments', this)">
                        <i class="fas fa-credit-card"></i>
                        <span>Payments & GST</span>
                    </button>
                    <button class="nav-item owner-only" onclick="navigateTo('analytics', this)">
                        <i class="fas fa-chart-bar"></i>
                        <span>Reports Center</span>
                    </button>
                    <button class="nav-item" onclick="navigateTo('settings-tab', this)">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </button>
                </nav>
            </div>
            <div>
                <button class="logout-btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </button>
                <div class="footer-credit">
                    <small>Developed by</small><br>
                    ⚡ CodeCrafters
                </div>
            </div>
        </aside>
`);
    loader.remove();
})();
