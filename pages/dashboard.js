/* Dashboard page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="dashboard" class="page-content active">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Total Rooms</span>
                                <i class="fas fa-door-closed metric-icon"></i>
                            </div>
                            <div class="metric-value" id="metricTotalRooms">9</div>
                            <div class="metric-change" style="color: var(--secondary)">9 configured rooms</div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Occupied Rooms</span>
                                <i class="fas fa-bed metric-icon" style="color: var(--danger)"></i>
                            </div>
                            <div class="metric-value" id="metricOccupiedRooms">0</div>
                            <div class="metric-change" id="metricOccupiedRoomsInfo" style="color: var(--danger)">0 of 9 occupied</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Available Rooms</span>
                                <i class="fas fa-door-open metric-icon" style="color: var(--success)"></i>
                            </div>
                            <div class="metric-value" id="metricAvailableRooms">0</div>
                            <div class="metric-change" id="metricAvailableRoomsInfo" style="color: var(--success)">0 of 9 available</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Total Bookings</span>
                                <i class="fas fa-calendar-check metric-icon" style="color: var(--secondary)"></i>
                            </div>
                            <div class="metric-value" id="metricTotalBookings">0</div>
                            <div class="metric-change" id="metricTotalBookingsInfo">All time bookings count</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Today's Check-ins</span>
                                <i class="fas fa-sign-in-alt metric-icon" style="color: var(--secondary)"></i>
                            </div>
                            <div class="metric-value" id="statCheckinsToday">0</div>
                            <div class="metric-change" style="color: var(--secondary)">Arrivals scheduled today</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-header">
                                <span class="metric-label">Today's Check-outs</span>
                                <i class="fas fa-sign-out-alt metric-icon" style="color: var(--warning)"></i>
                            </div>
                            <div class="metric-value" id="statCheckoutsToday">0</div>
                            <div class="metric-change" style="color: var(--warning)">Departures scheduled today</div>
                        </div>
                        <div class="metric-card owner-only">
                            <div class="metric-header">
                                <span class="metric-label">Monthly Revenue</span>
                                <i class="fas fa-chart-line metric-icon" style="color: var(--success)"></i>
                            </div>
                            <div class="metric-value" id="statMonthlyRevenue">₹0</div>
                            <div class="metric-change" style="color: var(--success)">This calendar month</div>
                            <canvas class="metric-sparkline" id="sparkRevenue"></canvas>
                        </div>
                        <div class="metric-card owner-only">
                            <div class="metric-header">
                                <span class="metric-label">Pending Payments</span>
                                <i class="fas fa-wallet metric-icon" style="color: var(--warning)"></i>
                            </div>
                            <div class="metric-value" id="metricPendingPayments">₹0</div>
                            <div class="metric-change" id="metricPendingPaymentsInfo" style="color: var(--warning)">Total outstanding balances</div>
                        </div>
                    </div>
                    <div class="stats-row" style="display: none;">
                        <div class="stat-box checkin">
                            <div class="stat-icon"><i class="fas fa-sign-in-alt"></i></div>
                            <div>
                                <div class="stat-label">Check-ins Today</div>
                                <div class="stat-number">0</div>
                            </div>
                        </div>
                        <div class="stat-box checkout">
                            <div class="stat-icon"><i class="fas fa-sign-out-alt"></i></div>
                            <div>
                                <div class="stat-label">Check-outs Today</div>
                                <div class="stat-number">0</div>
                            </div>
                        </div>
                        <div class="stat-box maintenance">
                            <div class="stat-icon"><i class="fas fa-wrench"></i></div>
                            <div>
                                <div class="stat-label">Maintenance</div>
                                <div class="stat-number" id="statMaintenance">0</div>
                            </div>
                        </div>
                        <div class="stat-box monthly owner-only">
                            <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
                            <div>
                                <div class="stat-label">Revenue Today</div>
                                <div class="stat-number" id="metricRevenueToday">₹0</div>
                            </div>
                        </div>
                    </div>
                    <div class="dashboard-grid">
                        <div class="card owner-only">
                            <div class="card-header">
                                <h3><i class="fas fa-chart-line" style="color: var(--secondary);"></i> Revenue Trend Overview</h3>
                                <div class="chart-controls">
                                    <button class="btn-control active" onclick="setChartInterval('day', this)">Day</button>
                                    <button class="btn-control" onclick="setChartInterval('week', this)">Week</button>
                                    <button class="btn-control" onclick="setChartInterval('month', this)">Month</button>
                                </div>
                            </div>
                            <div style="position: relative; height: 280px;">
                                <canvas id="revenueChart"></canvas>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3><i class="fas fa-chart-pie" style="color: var(--secondary);"></i> Room Occupancy Status</h3>
                            </div>
                            <div style="position: relative; height: 280px;">
                                <canvas id="occupancyChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="card" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt" style="color: var(--warning)"></i> Frontdesk Quick Actions</h3>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
                            <button class="btn-primary receptionist-only" onclick="openNewBookingPage()" style="height: 60px; justify-content: center; background: linear-gradient(135deg, var(--secondary), var(--accent));">
                                <i class="fas fa-plus-circle" style="font-size: 16px;"></i> <span>New Booking</span>
                            </button>
                            <button class="btn-primary" onclick="navigateTo('diary')" style="height: 60px; justify-content: center; background: linear-gradient(135deg, var(--warning), #fbbf24);">
                                <i class="fas fa-book-open" style="font-size: 16px;"></i> <span>Room Diary</span>
                            </button>
                            <button class="btn-primary" onclick="navigateTo('rooms')" style="height: 60px; justify-content: center; background: linear-gradient(135deg, var(--success), #34d399);">
                                <i class="fas fa-door-open" style="font-size: 16px;"></i> <span>Room Control</span>
                            </button>
                        </div>
                    </div>
                    <div class="card owner-only" id="downloadAllDataCard" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-cloud-download-alt" style="color: var(--secondary);"></i> Bulk PDF Bill Exporter</h3>
                        </div>
                        <div class="download-data-section">
                            <div class="download-data-info">
                                <p><i class="fas fa-info-circle"></i> Filter bookings by check-in range below and download tax invoices with photos in a formatted PDF print package.</p>
                            </div>
                            <div class="download-data-controls">
                                <div class="date-range-group">
                                    <div class="date-range-item">
                                        <label for="downloadFromDate">From Date</label>
                                        <input type="date" id="downloadFromDate">
                                    </div>
                                    <div class="date-range-separator">
                                        <i class="fas fa-arrow-right"></i>
                                    </div>
                                    <div class="date-range-item">
                                        <label for="downloadToDate">To Date</label>
                                        <input type="date" id="downloadToDate">
                                    </div>
                                </div>
                                <div class="download-quick-presets">
                                    <button class="preset-btn" onclick="setDownloadPreset('today')">Today</button>
                                    <button class="preset-btn" onclick="setDownloadPreset('week')">This Week</button>
                                    <button class="preset-btn" onclick="setDownloadPreset('month')">This Month</button>
                                    <button class="preset-btn" onclick="setDownloadPreset('all')">All Time</button>
                                </div>
                                <div class="download-actions-row">
                                    <div class="download-record-count" id="downloadRecordCount">
                                        <i class="fas fa-database"></i> <span>Select date range</span>
                                    </div>
                                    <button class="btn-download-all" onclick="downloadAllBookingData()">
                                        <i class="fas fa-file-pdf"></i> Download PDF Bills
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-history" style="color: var(--text-light);"></i> Real-Time Audit Activity Timeline</h3>
                        </div>
                        <div class="activity-list" id="activityLogsContainer">
                            <div class="activity-item">
                                <div class="activity-icon booking"><i class="fas fa-calendar-check"></i></div>
                                <div>
                                    <div class="activity-title">Console Online</div>
                                    <div class="activity-description">Dashboard loaded. Connecting to services...</div>
                                    <small style="color: var(--text-light); font-size: 10px;">Instant logs ready</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
