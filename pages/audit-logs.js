/* Audit logs page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="audit-logs-tab" class="page-content owner-only">
                    <div class="page-header">
                        <h2>Audit Trails & Security Logs</h2>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-primary" onclick="exportAuditLogsToCSV()" style="background: var(--secondary);">
                                <i class="fas fa-file-csv"></i> Export Logs (CSV)
                            </button>
                            <button class="btn-primary" onclick="clearAuditLogs()" style="background: var(--danger);">
                                <i class="fas fa-trash-alt"></i> Clear Audit History
                            </button>
                        </div>
                    </div>
                    <div class="card">
                        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                            <div class="form-group" style="flex-grow: 1; min-width: 200px; margin-bottom: 0;">
                                <input type="text" id="auditSearchInput" placeholder="Search logs by action or description..." oninput="filterAuditLogs()" style="width: 100%; height: 40px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); background: var(--bg-main); color: var(--text-dark);">
                            </div>
                            <div class="form-group" style="width: 200px; margin-bottom: 0;">
                                <select id="auditCategoryFilter" onchange="filterAuditLogs()" style="width: 100%; height: 40px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); background: var(--bg-main); color: var(--text-dark);">
                                    <option value="all">All Categories</option>
                                    <option value="booking">Bookings Activity</option>
                                    <option value="payment">Payments & Tariffs</option>
                                    <option value="room">Rooms & Settings</option>
                                    <option value="system">System Updates</option>
                                </select>
                            </div>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action Category</th>
                                        <th>Detailed Description</th>
                                    </tr>
                                </thead>
                                <tbody id="auditLogsExplorerTable">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
