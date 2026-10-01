import { useState } from 'react';
import { data, useStoreVersion } from '../store/store.js';
import { useUI } from '../ui/UIContext.jsx';
import { capitalizeFirst, formatNumber } from '../lib/format.js';
import { saveSurchargeSettings } from '../services/settings.js';

function SurchargeForm() {
    const settings = data.settings || {};
    const [weekend, setWeekend] = useState(String(settings.weekendSurcharge || 0));
    const [holidayActive, setHolidayActive] = useState(Boolean(settings.holidaySurgeActive));
    const [holidayRate, setHolidayRate] = useState(String(settings.holidaySurgeRate || 0));

    const submit = e => {
        e.preventDefault();
        saveSurchargeSettings({
            weekendSurcharge: parseFloat(weekend || '0'),
            holidaySurgeActive: holidayActive,
            holidaySurgeRate: parseFloat(holidayRate || '0')
        });
    };

    return (
        <form id="surchargePricingForm" onSubmit={submit} style={{ padding: 15 }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 15 }}>
                Configure automatic pricing multipliers for high-occupancy or seasonal booking days. Surcharges are automatically calculated and applied when processing check-ins.
            </p>
            <div className="form-row surcharge-form-row" style={{ marginBottom: 15 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="setWeekendSurcharge">Weekend Surcharge Percentage (%)</label>
                    <input type="number" step="0.1" min="0" max="100" id="setWeekendSurcharge" placeholder="e.g. 10 for +10% on Fri-Sun" inputMode="decimal"
                        value={weekend} onChange={e => setWeekend(e.target.value)} />
                    <small style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 4, display: 'block' }}>Applies automatically if check-in falls on Fri, Sat, or Sun.</small>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Global Holiday Surge Status</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                        <label className="switch-container">
                            <input type="checkbox" id="setHolidaySurgeActive" checked={holidayActive} onChange={e => setHolidayActive(e.target.checked)} />
                            <span className="slider" />
                        </label>
                        <span id="holidaySurgeLabel" style={{ fontSize: 13, fontWeight: 'bold', color: holidayActive ? 'var(--success)' : 'var(--text-light)' }}>
                            {holidayActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="setHolidaySurgeRate">Global Holiday Surge Percentage (%)</label>
                    <input type="number" step="0.1" min="0" max="100" id="setHolidaySurgeRate" placeholder="e.g. 20 for +20% global markup" inputMode="decimal"
                        value={holidayRate} onChange={e => setHolidayRate(e.target.value)} />
                    <small style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 4, display: 'block' }}>Applies globally to all rooms when active.</small>
                </div>
            </div>
            <button type="submit" className="btn-primary" style={{ background: 'var(--secondary)' }}><i className="fas fa-save" /> Save Surcharge Rules</button>
        </form>
    );
}

export default function PricingPage() {
    useStoreVersion();
    const { openModal, globalSearch } = useUI();
    const [typedPrices, setTypedPrices] = useState({});
    const query = globalSearch.trim().toLowerCase();

    const rooms = data.rooms.filter(room => !query ||
        `${room.name} floor ${room.floor} ${room.type} ₹${formatNumber(room.price)}`.toLowerCase().includes(query));

    return (
        <div id="pricing" className="page-content active">
            <div className="page-header">
                <h2>Room Pricing &amp; Tariff Structure</h2>
            </div>
            <div className="card owner-only" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h3><i className="fas fa-crown" style={{ color: 'var(--warning)' }} /> Dynamic Surge Pricing &amp; Surcharge Rules</h3>
                </div>
                <SurchargeForm />
            </div>

            <div className="card">
                <div className="pricing-info">
                    <h4>Current General Tariff Rules</h4>
                    <p><strong>General Base Rate:</strong> ₹2,500 per night (configurable for each room below).</p>
                    <p><strong>General Advance Target:</strong> ₹1,000 on Check-in.</p>
                    <p><strong>Final Checkout Balance formula:</strong> [Rate per day * Stayed nights] - Advance + Extras + Extra Bed.</p>
                </div>
                <div className="data-table-container">
                    <table className="data-table responsive-table">
                        <thead>
                            <tr>
                                <th>Room ID</th>
                                <th>Floor</th>
                                <th>Room Category</th>
                                <th>Current Tariff (₹)</th>
                                <th>Update Rate Input</th>
                                <th>Confirm Change</th>
                            </tr>
                        </thead>
                        <tbody id="pricingTable">
                            {rooms.map(room => (
                                <tr key={room.id}>
                                    <td data-label="Room ID"><strong>{room.name}</strong></td>
                                    <td data-label="Floor">Floor {room.floor}</td>
                                    <td data-label="Category">{capitalizeFirst(room.type)}</td>
                                    <td data-label="Current Tariff">₹{formatNumber(room.price)}</td>
                                    <td data-label="New Rate" className="owner-cell">
                                        <input type="number" className="price-input owner-only" id={`price-input-${room.id}`} placeholder="Enter new price" min="100" inputMode="numeric"
                                            value={typedPrices[room.id] || ''} onChange={e => setTypedPrices(p => ({ ...p, [room.id]: e.target.value }))} />
                                    </td>
                                    <td data-label="Confirm" className="owner-cell">
                                        <button type="button" className="btn-primary owner-only" style={{ padding: '8px 12px', fontSize: 12 }}
                                            onClick={() => openModal('price', { roomId: room.id, initialPrice: typedPrices[room.id] || '' })}>
                                            <i className="fas fa-edit" /> Update
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
