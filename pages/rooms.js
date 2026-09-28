/* Room control page markup. Inserted in place while index.html is parsed, so it exists before any app script runs.
   Kept as a script (not a .html fragment) so the app still works when index.html is opened straight from disk. */
(function () {
    const loader = document.currentScript;
    loader.insertAdjacentHTML('beforebegin', String.raw`
                <div id="rooms" class="page-content">
                    <div class="page-header">
                        <h2>Room Control Panel</h2>
                        <span class="page-kicker"><i class="fas fa-signal"></i> Live room board</span>
                    </div>
                    <div class="operations-toolbar">
                        <div class="room-filter-pills" role="group" aria-label="Room status filters">
                            <button class="room-filter-pill active" data-room-filter="all" onclick="setRoomFilter('all', this)">All rooms <span id="roomFilterCountAll">0</span></button>
                            <button class="room-filter-pill" data-room-filter="available" onclick="setRoomFilter('available', this)">Available <span id="roomFilterCountAvailable">0</span></button>
                            <button class="room-filter-pill" data-room-filter="occupied" onclick="setRoomFilter('occupied', this)">Occupied <span id="roomFilterCountOccupied">0</span></button>
                            <button class="room-filter-pill" data-room-filter="reserved" onclick="setRoomFilter('reserved', this)">Reserved <span id="roomFilterCountReserved">0</span></button>
                            <button class="room-filter-pill" data-room-filter="cleaning" onclick="setRoomFilter('cleaning', this)">Cleaning <span id="roomFilterCountCleaning">0</span></button>
                            <button class="room-filter-pill" data-room-filter="maintenance" onclick="setRoomFilter('maintenance', this)">Maintenance <span id="roomFilterCountMaintenance">0</span></button>
                        </div>
                        <div class="room-filter-inputs">
                            <label class="inline-search"><i class="fas fa-search"></i><input id="roomSearchInput" type="search" placeholder="Search room or guest" oninput="renderRoomBoard()"></label>
                            <select id="roomSortSelect" onchange="renderRoomBoard()" aria-label="Sort rooms">
                                <option value="number">Room number</option>
                                <option value="status">Status</option>
                                <option value="checkin">Check-in</option>
                                <option value="checkout">Check-out</option>
                                <option value="price">Price</option>
                            </select>
                        </div>
                    </div>
                    <div class="floor-section">
                        <h3 class="floor-title"><i class="fas fa-building"></i> Floor F1 (5 Rooms)</h3>
                        <div class="rooms-grid" id="floor1Rooms"></div>
                    </div>
                    <div class="floor-section">
                        <h3 class="floor-title"><i class="fas fa-building"></i> Floor F2 (4 Rooms)</h3>
                        <div class="rooms-grid" id="floor2Rooms"></div>
                    </div>
                    <div class="card">
                        <div class="room-legend">
                            <h4>Room Status Legend</h4>
                            <div class="legend-items" style="margin-top: 10px;">
                                <div class="legend-item">
                                    <span class="legend-color" style="background: var(--success);"></span>
                                    <span>Available (Clean & ready)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color" style="background: var(--danger);"></span>
                                    <span>Occupied (Guest residing)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color" style="background: var(--warning);"></span>
                                    <span>Cleaning (Housekeeping active)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color" style="background: var(--text-light);"></span>
                                    <span>Maintenance (Technical work)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
`);
    loader.remove();
})();
