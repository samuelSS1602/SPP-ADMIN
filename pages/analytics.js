/* Reports center page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="analytics" class="page-content owner-only">
                    <div class="page-header">
                        <h2>Analytics & Reports Center</h2>
                        <div class="analytics-buttons">
                            <button class="btn-primary" onclick="downloadDailyRevenue()">
                                <i class="fas fa-file-excel"></i> Export Daily Revenue Excel
                            </button>
                            <button class="btn-primary" onclick="downloadMonthlyRevenue()">
                                <i class="fas fa-file-excel"></i> Export Monthly Revenue Excel
                            </button>
                            <button class="btn-primary" onclick="downloadYearlyRevenue()">
                                <i class="fas fa-file-excel"></i> Export Yearly Revenue Excel
                            </button>
                        </div>
                    </div>
                    <div class="card owner-only" style="margin-bottom: 24px;">
                        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <h3><i class="fas fa-calendar-alt" style="color: var(--secondary);"></i> Trading-Style Daily Sales Heatmap</h3>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: var(--bg-main); border: 1px solid var(--border-light); color: var(--text-dark);" onclick="changeSalesCalendarMonth(-1)">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <strong id="salesCalendarMonthLabel" style="font-size: 14px; min-width: 120px; text-align: center;">June 2026</strong>
                                <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: var(--bg-main); border: 1px solid var(--border-light); color: var(--text-dark);" onclick="changeSalesCalendarMonth(1)">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div style="padding: 15px;">
                            <div class="revenue-calendar-weekdays" style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: bold; font-size: 11px; color: var(--text-light); margin-bottom: 8px;">
                                <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                            </div>
                            <div id="salesCalendarGrid" class="revenue-calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
                            </div>
                            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 11px; margin-top: 15px; color: var(--text-light);">
                                <span>No Sales</span>
                                <div style="width: 12px; height: 12px; background: var(--border-light); border-radius: 2px;"></div>
                                <div style="width: 12px; height: 12px; background: rgba(37, 99, 235, 0.2); border-radius: 2px;"></div>
                                <div style="width: 12px; height: 12px; background: rgba(37, 99, 235, 0.45); border-radius: 2px;"></div>
                                <div style="width: 12px; height: 12px; background: rgba(37, 99, 235, 0.7); border-radius: 2px;"></div>
                                <div style="width: 12px; height: 12px; background: var(--secondary); border-radius: 2px;"></div>
                                <span>Highest Sales</span>
                            </div>
                        </div>
                    </div>
                    <div class="analytics-grid">
                        <div class="card">
                            <div class="card-header">
                                <h3>Occupancy Report Trend</h3>
                            </div>
                            <div style="position: relative; height: 260px;">
                                <canvas id="monthlyChart"></canvas>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>Lodge Performance Summary</h3>
                            </div>
                            <div style="font-size: 13px; line-height: 1.8;">
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>Occupancy Rate Average:</span><strong id="repOccupancyRate">0%</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>Average Guest Duration:</span><strong id="repAvgDuration">1.2 Nights</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>Average Daily Rate (ADR):</span><strong id="repAdr">₹0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>RevPAR (per Available Room):</span><strong id="repRevPar">₹0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>Total Discounts Given:</span><strong id="repTotalDiscounts">₹0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>CGST Collected (2.5%):</span><strong id="repCgstCollected">₹0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border-light)">
                                    <span>SGST Collected (2.5%):</span><strong id="repSgstCollected">₹0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding: 6px 0;">
                                    <span>Total GST Revenue (5%):</span><strong id="repGstCollected">₹0</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
