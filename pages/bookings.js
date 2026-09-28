/* Bookings page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="bookings" class="page-content">
                    <div class="page-header">
                        <h2>Booking Management</h2>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-primary receptionist-only" onclick="openNewBookingPage()">
                                <i class="fas fa-plus"></i> New Booking
                            </button>
                            <button class="btn-primary owner-only" onclick="viewAllPhotosInDatabase()" style="background: var(--secondary);">
                                <i class="fas fa-images"></i> View Photo Archive
                            </button>
                            <button class="btn-primary owner-only" onclick="openRecoverPhotosModal()" style="background: var(--danger);">
                                <i class="fas fa-life-ring"></i> Recover Missing Photos
                            </button>
                        </div>
                    </div>
                    <div class="booking-filter-toolbar" id="bookingFilterToolbar">
                        <div class="filter-row-top">
                            <div class="filter-year-nav">
                                <button class="year-nav-btn" onclick="changeBookingYear(-1)" title="Previous Year"><i class="fas fa-chevron-left"></i></button>
                                <span class="year-label" id="bookingYearLabel">2026</span>
                                <button class="year-nav-btn" onclick="changeBookingYear(1)" title="Next Year"><i class="fas fa-chevron-right"></i></button>
                            </div>
                            <div class="filter-status-select">
                                <select id="bookingStatusFilter" onchange="loadBookings()">
                                    <option value="all">All Booking Statuses</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="completed">Checked Out</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <button class="filter-reset-btn" onclick="resetBookingFilters()"><i class="fas fa-undo"></i> Reset Filters</button>
                            <button class="filter-reset-btn owner-only" onclick="renumberAllBookings()" style="background: var(--danger); color: white; border: none;"><i class="fas fa-sort-numeric-down"></i> Renumber IDs</button>
                        </div>
                        <div class="filter-month-pills" id="bookingMonthPills">
                            <button class="month-pill active" data-month="all" onclick="selectBookingMonth('all', this)">All Months</button>
                            <button class="month-pill" data-month="0" onclick="selectBookingMonth(0, this)">Jan</button>
                            <button class="month-pill" data-month="1" onclick="selectBookingMonth(1, this)">Feb</button>
                            <button class="month-pill" data-month="2" onclick="selectBookingMonth(2, this)">Mar</button>
                            <button class="month-pill" data-month="3" onclick="selectBookingMonth(3, this)">Apr</button>
                            <button class="month-pill" data-month="4" onclick="selectBookingMonth(4, this)">May</button>
                            <button class="month-pill" data-month="5" onclick="selectBookingMonth(5, this)">Jun</button>
                            <button class="month-pill" data-month="6" onclick="selectBookingMonth(6, this)">Jul</button>
                            <button class="month-pill" data-month="7" onclick="selectBookingMonth(7, this)">Aug</button>
                            <button class="month-pill" data-month="8" onclick="selectBookingMonth(8, this)">Sep</button>
                            <button class="month-pill" data-month="9" onclick="selectBookingMonth(9, this)">Oct</button>
                            <button class="month-pill" data-month="10" onclick="selectBookingMonth(10, this)">Nov</button>
                            <button class="month-pill" data-month="11" onclick="selectBookingMonth(11, this)">Dec</button>
                        </div>
                    </div>
                    <div id="bookingsMonthContainer"></div>
                </div>
`);
    loader.remove();
})();
