import { useEffect, useRef, useState } from 'react';
import { useStoreVersion } from '../store/store.js';
import { getLocalISODate } from '../lib/format.js';
import { DIARY_FLOORS, getDiaryEntries, saveDiaryRoom } from '../services/diary.js';

const ROOM_IDS = DIARY_FLOORS.flatMap(floor => floor.rooms.map(([id]) => id));

export default function DiaryPage() {
    const version = useStoreVersion();
    const [date, setDate] = useState(getLocalISODate);
    const [values, setValues] = useState({});
    const focusedRoom = useRef(null);

    // Refill from the diary (and live cloud updates) without touching the input being typed in
    useEffect(() => {
        const entries = getDiaryEntries(date);
        setValues(current => {
            const next = {};
            ROOM_IDS.forEach(id => {
                next[id] = focusedRoom.current === id ? (current[id] ?? '') : (entries[id] || '');
            });
            return next;
        });
    }, [date, version]);

    return (
        <div id="diary" className="page-content active">
            <div className="page-header">
                <h2>Room Diary &amp; Reservations</h2>
                <div className="diary-date-picker">
                    <i className="fas fa-calendar-day" style={{ color: 'var(--secondary)' }} />
                    <label htmlFor="diaryDate" style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Selected Date</label>
                    <input type="date" id="diaryDate" value={date} onChange={e => { focusedRoom.current = null; setDate(e.target.value); }} />
                </div>
            </div>
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="diary-instructions">
                    <p><i className="fas fa-info-circle" /> Quick reservation book. Type occupant names on specific room inputs below. Changes are saved automatically when clicking outside input fields.</p>
                </div>
            </div>
            <div className="card">
                <div className="diary-grid">
                    {DIARY_FLOORS.map(floor => (
                        <div className="diary-floor-section" key={floor.title}>
                            <h3><i className="fas fa-building" style={{ color: 'var(--secondary)' }} /> {floor.title}</h3>
                            <div className="diary-rooms-grid">
                                {floor.rooms.map(([roomId, roomName]) => (
                                    <div className="diary-room-item" key={roomId}>
                                        <label htmlFor={`diary-${roomId}`}>Room {roomId} ({roomName})</label>
                                        <input
                                            type="text"
                                            id={`diary-${roomId}`}
                                            placeholder="Occupant full name"
                                            enterKeyHint="done"
                                            value={values[roomId] ?? ''}
                                            onFocus={() => { focusedRoom.current = roomId; }}
                                            onChange={e => setValues(v => ({ ...v, [roomId]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            onBlur={e => {
                                                focusedRoom.current = null;
                                                saveDiaryRoom(date, roomId, e.target.value);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
