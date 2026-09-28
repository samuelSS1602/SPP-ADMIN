/* Guests CRM page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="guests" class="page-content">
                    <div class="page-header">
                        <h2>Guests Database CRM</h2>
                        <span class="page-kicker"><i class="fas fa-users"></i> Guest relationships</span>
                    </div>
                    <div class="operations-toolbar guest-toolbar">
                        <label class="inline-search guest-search"><i class="fas fa-search"></i><input id="guestSearchInput" type="search" placeholder="Search guests by name, phone or email" oninput="loadGuests()"></label>
                        <span class="toolbar-note"><i class="fas fa-clock"></i> Active stays appear first</span>
                    </div>
                    <div class="guest-card-grid" id="guestsTable">
                        <div class="empty-state">Loading guest records...</div>
                    </div>
                </div>
`);
    loader.remove();
})();
