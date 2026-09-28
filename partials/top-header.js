/* Top header bar (search, quick add, notifications, profile) markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
            <div class="top-header">
                <div class="header-left">
                    <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Open navigation menu" style="display: none; background: none; border: none; font-size: 20px; color: var(--text-dark); cursor: pointer;">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div>
                        <h2 id="pageTitle" style="margin: 0;">Dashboard</h2>
                        <small id="liveDateTime" style="color: var(--text-light); font-weight: 600;"></small>
                    </div>
                </div>
                <div class="header-right">
                    <div class="global-search-container">
                        <input type="text" id="globalSearchInput" aria-label="Quick search" placeholder="Quick Search (Ctrl + K)" oninput="handleGlobalSearch(this.value)">
                        <i class="fas fa-search"></i>
                    </div>
                    <div style="position: relative;">
                        <button class="quick-add-btn" onclick="toggleDropdown('quickAddDropdown')">
                            <i class="fas fa-plus"></i> <span>Quick Add</span> <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                        </button>
                        <div id="quickAddDropdown" class="user-dropdown" style="top: 40px; right: 0;">
                            <div class="user-dropdown-item receptionist-only" onclick="openNewBookingPage(); hideAllDropdowns()"><i class="fas fa-calendar-plus"></i> New Booking</div>
                            <div class="user-dropdown-item owner-only" onclick="navigateTo('pricing'); hideAllDropdowns()"><i class="fas fa-tag"></i> Modify Pricing</div>
                        </div>
                    </div>
                    <div style="position: relative;">
                        <button id="headerNotifBtn" class="header-notif-btn" onclick="toggleDropdown('notifDropdown')" aria-label="Notifications" title="Notifications">
                            <i class="fas fa-bell"></i>
                            <span class="header-notif-badge" id="notifBadgeCount">0</span>
                        </button>
                        <div id="notifDropdown" class="notif-dropdown">
                            <div class="notif-dropdown-header">
                                <span>Recent Notifications</span>
                                <button type="button" onclick="clearAllNotifications()" style="font-size: 11px; color: var(--secondary); text-decoration: none; background: none; border: 0; padding: 0; cursor: pointer;">Clear all</button>
                            </div>
                            <div class="notif-dropdown-body" id="notifDropdownBody">
                                <div style="padding: 20px; text-align: center; color: var(--text-light); font-size: 12px;">No new alerts.</div>
                            </div>
                        </div>
                    </div>
                    <button class="dark-mode-toggle" id="darkModeToggle" onclick="toggleDarkMode()" title="Toggle Dark/Light Mode" aria-label="Toggle dark or light mode">
                        <i class="fas fa-moon"></i>
                    </button>
                    <div style="position: relative;">
                        <div class="user-profile" onclick="toggleDropdown('userProfileDropdown')">
                            <div class="profile-pic">A</div>
                            <div style="display: flex; flex-direction: column;">
                                <div style="font-weight: 700; font-size: 12px;" id="profileRoleName">Admin User</div>
                                <small style="color: var(--text-light); font-size: 9px;" id="profileEmail">admin@sripadmavati.com</small>
                            </div>
                        </div>
                        <div id="userProfileDropdown" class="user-dropdown" style="top: 45px; right: 0;">
                            <div class="user-dropdown-header">
                                <h4 id="userDropdownName">Admin User</h4>
                                <p id="userDropdownEmail">admin@sripadmavati.com</p>
                            </div>
                            <div class="user-dropdown-item" onclick="openChangePasswordModal(); hideAllDropdowns()"><i class="fas fa-key"></i> Change Password</div>
                            <div class="user-dropdown-item owner-only" onclick="exportFullSystemBackup(); hideAllDropdowns()"><i class="fas fa-cloud-download-alt"></i> System Backup</div>
                            <div class="user-dropdown-item" onclick="logout(); hideAllDropdowns()"><i class="fas fa-sign-out-alt"></i> Logout</div>
                        </div>
                    </div>
                </div>
            </div>
`);
    loader.remove();
})();
