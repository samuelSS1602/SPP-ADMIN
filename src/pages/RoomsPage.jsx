import { data, useStoreVersion } from '../store/store.js';
import { usePersistentState, useUI } from '../ui/UIContext.jsx';
import { calculateBookingDays } from '../lib/bookingCalc.js';
import { capitalizeFirst, formatDate, formatNumber, getInitials } from '../lib/format.js';
import { getActiveBookingForRoom } from '../services/rooms.js';

const FILTERS = [
    ['all', 'All rooms'], ['available', 'Available'], ['occupied', 'Occupied'],
    ['reserved', 'Reserved'], ['cleaning', 'Cleaning'], ['maintenance', 'Maintenance']
];

const guestNameOf = booking => booking?.guestName || 'Ready for arrival';

function RoomCard({ room, onOpen }) {
    const booking = getActiveBookingForRoom(room.id);
    const nights = booking ? calculateBookingDays(booking) : 0;
    const photo = booking?.customerPhotoUrl || booking?.customerPhoto;
    const guestName = guestNameOf(booking);
    const initials = getInitials(guestName, 'SP') || 'SP';
    const statusLabel = room.status === 'occupied' && booking ? 'Occupied' : capitalizeFirst(room.status || 'available');

    return (
        <article className={`room-card premium-room-card ${room.status}`} onClick={() => onOpen(room.id)} tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') onOpen(room.id); }}>
            <div className="room-card-top">
                <div><span className="room-number">{room.name}</span><span className="room-type">{capitalizeFirst(room.type)} room</span></div>
                <span className={`room-status ${room.status}`}><i className="fas fa-circle" />{statusLabel}</span>
            </div>
            <div className="room-card-guest">
                {photo ? <img src={photo} alt={guestName} className="guest-avatar" /> : <span className="guest-avatar avatar-placeholder">{initials}</span>}
                <div><span className="room-guest-label">{booking ? 'Current guest' : 'Next available'}</span><strong>{guestName}</strong></div>
                <button className="room-menu" type="button" onClick={e => { e.stopPropagation(); onOpen(room.id); }} aria-label="Open room actions"><i className="fas fa-ellipsis" /></button>
            </div>
            <div className="room-stay-grid">
                <div><span>Check-in</span><strong>{booking ? formatDate(booking.checkIn) : '--'}</strong></div>
                <div><span>Check-out</span><strong>{booking ? formatDate(booking.checkOut) : '--'}</strong></div>
            </div>
            <div className="room-card-footer">
                <span><i className="fas fa-moon" /> {booking ? `${nights} night${nights === 1 ? '' : 's'}` : 'Ready'}</span>
                <strong>₹{formatNumber(booking?.roomRate || room.price)}<small> / night</small></strong>
            </div>
        </article>
    );
}

export default function RoomsPage() {
    useStoreVersion();
    const { openModal, globalSearch } = useUI();
    const [filter, setFilter] = usePersistentState('rooms.filter', 'all');
    const [search, setSearch] = usePersistentState('rooms.search', '');
    const [sortBy, setSortBy] = usePersistentState('rooms.sort', 'number');

    const counts = { all: data.rooms.length, available: 0, occupied: 0, reserved: 0, cleaning: 0, maintenance: 0 };
    data.rooms.forEach(room => { if (counts[room.status] !== undefined) counts[room.status] += 1; });

    const query = search.trim().toLowerCase();
    const headerQuery = globalSearch.trim().toLowerCase();
    const filteredRooms = data.rooms.filter(room => {
        const booking = getActiveBookingForRoom(room.id);
        const searchable = `${room.name} ${room.id} ${room.type} ${guestNameOf(booking)} ${room.status}`.toLowerCase();
        return (filter === 'all' || room.status === filter) && (!query || searchable.includes(query)) && (!headerQuery || searchable.includes(headerQuery));
    }).sort((first, second) => {
        if (sortBy === 'price') return Number(second.price || 0) - Number(first.price || 0);
        if (sortBy === 'status') return String(first.status).localeCompare(String(second.status));
        if (sortBy === 'checkin') return new Date(getActiveBookingForRoom(second.id)?.checkIn || 0) - new Date(getActiveBookingForRoom(first.id)?.checkIn || 0);
        if (sortBy === 'checkout') return new Date(getActiveBookingForRoom(first.id)?.checkOut || 0) - new Date(getActiveBookingForRoom(second.id)?.checkOut || 0);
        return Number(first.id) - Number(second.id);
    });

    const openRoom = roomId => openModal('roomDetails', { roomId });

    const renderFloor = floor => {
        const rooms = filteredRooms.filter(room => room.floor === floor);
        return rooms.length
            ? rooms.map(room => <RoomCard key={room.id} room={room} onOpen={openRoom} />)
            : <div className="empty-state room-empty">No rooms match this view.</div>;
    };

    return (
        <div id="rooms" className="page-content active">
            <div className="page-header">
                <h2>Room Control Panel</h2>
                <span className="page-kicker"><i className="fas fa-signal" /> Live room board</span>
            </div>
            <div className="operations-toolbar">
                <div className="room-filter-pills" role="group" aria-label="Room status filters">
                    {FILTERS.map(([key, label]) => (
                        <button key={key} type="button" className={`room-filter-pill ${filter === key ? 'active' : ''}`} data-room-filter={key} onClick={() => setFilter(key)}>
                            {label} <span>{counts[key]}</span>
                        </button>
                    ))}
                </div>
                <div className="room-filter-inputs">
                    <label className="inline-search"><i className="fas fa-search" />
                        <input id="roomSearchInput" type="search" placeholder="Search room or guest" value={search} onChange={e => setSearch(e.target.value)} />
                    </label>
                    <select id="roomSortSelect" value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort rooms">
                        <option value="number">Room number</option>
                        <option value="status">Status</option>
                        <option value="checkin">Check-in</option>
                        <option value="checkout">Check-out</option>
                        <option value="price">Price</option>
                    </select>
                </div>
            </div>
            <div className="floor-section">
                <h3 className="floor-title"><i className="fas fa-building" /> Floor F1 (5 Rooms)</h3>
                <div className="rooms-grid" id="floor1Rooms">{renderFloor(1)}</div>
            </div>
            <div className="floor-section">
                <h3 className="floor-title"><i className="fas fa-building" /> Floor F2 (4 Rooms)</h3>
                <div className="rooms-grid" id="floor2Rooms">{renderFloor(2)}</div>
            </div>
            <div className="card">
                <div className="room-legend">
                    <h4>Room Status Legend</h4>
                    <div className="legend-items" style={{ marginTop: 10 }}>
                        {[
                            ['var(--success)', 'Available (Clean & ready)'],
                            ['var(--danger)', 'Occupied (Guest residing)'],
                            ['var(--warning)', 'Cleaning (Housekeeping active)'],
                            ['var(--text-light)', 'Maintenance (Technical work)']
                        ].map(([color, label]) => (
                            <div className="legend-item" key={label}>
                                <span className="legend-color" style={{ background: color }} />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
