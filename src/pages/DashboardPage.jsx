import { useMemo, useState } from 'react';
import { data, useStoreVersion } from '../store/store.js';
import { useUI } from '../ui/UIContext.jsx';
import { formatNumber, getLocalISODate } from '../lib/format.js';
import { getBookingTotal } from '../lib/bookingCalc.js';
import { computeDashboardMetrics, getLast7DaysRevenueData } from '../services/metrics.js';
import { addAuditLog, sortedAuditLogs } from '../services/audit.js';
import { bookingsInCheckInRange, downloadAllBookingData, downloadPresetRange } from '../services/reports.js';
import ChartCanvas from '../components/ChartCanvas.jsx';
import Sparkline from '../components/Sparkline.jsx';

function MetricCard({ label, icon, iconColor, value, valueId, info, infoId, infoColor, className = '', children }) {
    return (
        <div className={`metric-card ${className}`.trim()}>
            <div className="metric-header">
                <span className="metric-label">{label}</span>
                <i className={`fas ${icon} metric-icon`} style={iconColor ? { color: iconColor } : undefined} />
            </div>
            <div className="metric-value" id={valueId}>{value}</div>
            <div className="metric-change" id={infoId} style={infoColor ? { color: infoColor } : undefined}>{info}</div>
            {children}
        </div>
    );
}

function activityStyle(action) {
    if (action.includes('Booking')) return ['fa-calendar-check', 'booking'];
    if (action.includes('Payment') || action.includes('Tariff')) return ['fa-credit-card', 'payment'];
    if (action.includes('Room') || action.includes('Clean')) return ['fa-door-open', 'warning'];
    return ['fa-history', 'booking'];
}

function BulkPdfExporter() {
    useStoreVersion();
    const [range, setRange] = useState({ from: '', to: '' });
    const [preset, setPreset] = useState(null);
    const [preparing, setPreparing] = useState(false);

    const applyPreset = name => {
        setPreset(name);
        setRange(downloadPresetRange(name));
    };
    const setDate = (key, value) => {
        setPreset(null);
        setRange(r => ({ ...r, [key]: value }));
    };

    let countClass = 'download-record-count';
    let countContent = <><i className="fas fa-database" /> <span>Select date range</span></>;
    if (preparing) {
        countContent = <><i className="fas fa-spinner fa-spin" /> <span>Preparing PDF...</span></>;
    } else if (range.from && range.to) {
        const count = bookingsInCheckInRange(range.from, range.to).length;
        if (count === 0) {
            countContent = <><i className="fas fa-exclamation-circle" /> <span>No records found in this range</span></>;
        } else {
            countClass += ' has-records';
            countContent = <><i className="fas fa-check-circle" /> <span>{count} booking{count !== 1 ? 's' : ''} found</span></>;
        }
    } else if (range.from || range.to) {
        countContent = <><i className="fas fa-database" /> <span>Select a date range to preview</span></>;
    }

    const download = async () => {
        setPreparing(true);
        try {
            await downloadAllBookingData(range.from, range.to);
        } finally {
            setPreparing(false);
        }
    };

    return (
        <div className="card owner-only" id="downloadAllDataCard" style={{ marginBottom: 24 }}>
            <div className="card-header">
                <h3><i className="fas fa-cloud-download-alt" style={{ color: 'var(--secondary)' }} /> Bulk PDF Bill Exporter</h3>
            </div>
            <div className="download-data-section">
                <div className="download-data-info">
                    <p><i className="fas fa-info-circle" /> Filter bookings by check-in range below and download tax invoices with photos in a formatted PDF print package.</p>
                </div>
                <div className="download-data-controls">
                    <div className="date-range-group">
                        <div className="date-range-item">
                            <label htmlFor="downloadFromDate">From Date</label>
                            <input type="date" id="downloadFromDate" value={range.from} onChange={e => setDate('from', e.target.value)} />
                        </div>
                        <div className="date-range-separator"><i className="fas fa-arrow-right" /></div>
                        <div className="date-range-item">
                            <label htmlFor="downloadToDate">To Date</label>
                            <input type="date" id="downloadToDate" value={range.to} onChange={e => setDate('to', e.target.value)} />
                        </div>
                    </div>
                    <div className="download-quick-presets">
                        {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([key, label]) => (
                            <button key={key} type="button" className={`preset-btn ${preset === key ? 'active' : ''}`} onClick={() => applyPreset(key)}>{label}</button>
                        ))}
                    </div>
                    <div className="download-actions-row">
                        <div className={countClass} id="downloadRecordCount">{countContent}</div>
                        <button type="button" className="btn-download-all" onClick={download} disabled={preparing}>
                            <i className="fas fa-file-pdf" /> Download PDF Bills
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const version = useStoreVersion();
    const { navigate } = useUI();
    const [chartInterval, setChartInterval] = useState('day');
    const m = computeDashboardMetrics();

    const revenueConfig = useMemo(() => {
        const weekly = getLast7DaysRevenueData();
        return {
            type: 'line',
            data: { labels: weekly.labels, datasets: [{ label: 'Daily Revenue', data: weekly.values, borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#D4AF37' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        };
    }, [version]);

    const occupancyConfig = useMemo(() => ({
        type: 'doughnut',
        data: { labels: ['Occupied', 'Available', 'Cleaning'], datasets: [{ data: [m.occupiedRooms, m.availableRooms, m.cleaningRooms], backgroundColor: ['#E74C3C', '#27AE60', '#F39C12'], borderColor: '#fff', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [version]);

    const today = getLocalISODate();
    const revenueToday = data.bookings.filter(b => b.checkIn === today).reduce((sum, b) => sum + getBookingTotal(b), 0);
    const activity = sortedAuditLogs().slice(0, 10);

    const changeInterval = interval => {
        setChartInterval(interval);
        addAuditLog('System Reports', `Revenue trend chart updated range to ${interval}.`);
    };

    return (
        <div id="dashboard" className="page-content active">
            <div className="metrics-grid">
                <MetricCard label="Total Rooms" icon="fa-door-closed" valueId="metricTotalRooms" value={String(m.totalRooms)}
                    info={`${m.totalRooms} configured rooms`} infoColor="var(--secondary)" />
                <MetricCard label="Occupied Rooms" icon="fa-bed" iconColor="var(--danger)" valueId="metricOccupiedRooms" value={String(m.occupiedRooms)}
                    infoId="metricOccupiedRoomsInfo" info={`${m.occupiedRooms} of ${m.totalRooms} rooms occupied`} infoColor="var(--danger)" />
                <MetricCard label="Available Rooms" icon="fa-door-open" iconColor="var(--success)" valueId="metricAvailableRooms" value={String(m.availableRooms)}
                    infoId="metricAvailableRoomsInfo" info={`${m.availableRooms} of ${m.totalRooms} available`} infoColor="var(--success)" />
                <MetricCard label="Total Bookings" icon="fa-calendar-check" iconColor="var(--secondary)" valueId="metricTotalBookings" value={String(m.totalBookings)}
                    infoId="metricTotalBookingsInfo" info="Total bookings on record" />
                <MetricCard label="Today's Check-ins" icon="fa-sign-in-alt" iconColor="var(--secondary)" valueId="statCheckinsToday" value={String(m.checkInsToday)}
                    info="Arrivals scheduled today" infoColor="var(--secondary)" />
                <MetricCard label="Today's Check-outs" icon="fa-sign-out-alt" iconColor="var(--warning)" valueId="statCheckoutsToday" value={String(m.checkOutsToday)}
                    info="Departures scheduled today" infoColor="var(--warning)" />
                <MetricCard className="owner-only" label="Monthly Revenue" icon="fa-chart-line" iconColor="var(--success)" valueId="statMonthlyRevenue"
                    value={`₹${formatNumber(m.monthlyRevenue)}`} info="This calendar month" infoColor="var(--success)">
                    <Sparkline id="sparkRevenue" values={[12000, 15000, 8000, 24000, 19000, 22000, revenueToday]} color="var(--success)" />
                </MetricCard>
                <MetricCard className="owner-only" label="Pending Payments" icon="fa-wallet" iconColor="var(--warning)" valueId="metricPendingPayments"
                    value={`₹${formatNumber(m.pendingPayments)}`} infoId="metricPendingPaymentsInfo" info="Outstanding frontdesk balance" infoColor="var(--warning)" />
            </div>

            <div className="stats-row" style={{ display: 'none' }}>
                <div className="stat-box checkin"><div className="stat-icon"><i className="fas fa-sign-in-alt" /></div><div><div className="stat-label">Check-ins Today</div><div className="stat-number">{m.checkInsToday}</div></div></div>
                <div className="stat-box checkout"><div className="stat-icon"><i className="fas fa-sign-out-alt" /></div><div><div className="stat-label">Check-outs Today</div><div className="stat-number">{m.checkOutsToday}</div></div></div>
                <div className="stat-box maintenance"><div className="stat-icon"><i className="fas fa-wrench" /></div><div><div className="stat-label">Maintenance</div><div className="stat-number" id="statMaintenance">{m.maintenanceRooms}</div></div></div>
                <div className="stat-box monthly owner-only"><div className="stat-icon"><i className="fas fa-calendar-day" /></div><div><div className="stat-label">Revenue Today</div><div className="stat-number" id="metricRevenueToday">₹{formatNumber(m.revenueToday)}</div></div></div>
            </div>

            <div className="dashboard-grid">
                <div className="card owner-only">
                    <div className="card-header">
                        <h3><i className="fas fa-chart-line" style={{ color: 'var(--secondary)' }} /> Revenue Trend Overview</h3>
                        <div className="chart-controls">
                            {[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([key, label]) => (
                                <button key={key} type="button" className={`btn-control ${chartInterval === key ? 'active' : ''}`} onClick={() => changeInterval(key)}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ position: 'relative', height: 280 }}>
                        <ChartCanvas id="revenueChart" config={revenueConfig} redrawKey={chartInterval} />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">
                        <h3><i className="fas fa-chart-pie" style={{ color: 'var(--secondary)' }} /> Room Occupancy Status</h3>
                    </div>
                    <div style={{ position: 'relative', height: 280 }}>
                        <ChartCanvas id="occupancyChart" config={occupancyConfig} />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h3><i className="fas fa-bolt" style={{ color: 'var(--warning)' }} /> Frontdesk Quick Actions</h3>
                </div>
                <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                    <button type="button" className="btn-primary receptionist-only" onClick={() => navigate('new-booking')}
                        style={{ height: 60, justifyContent: 'center', background: 'linear-gradient(135deg, var(--secondary), var(--accent))' }}>
                        <i className="fas fa-plus-circle" style={{ fontSize: 16 }} /> <span>New Booking</span>
                    </button>
                    <button type="button" className="btn-primary" onClick={() => navigate('diary')}
                        style={{ height: 60, justifyContent: 'center', background: 'linear-gradient(135deg, var(--warning), #fbbf24)' }}>
                        <i className="fas fa-book-open" style={{ fontSize: 16 }} /> <span>Room Diary</span>
                    </button>
                    <button type="button" className="btn-primary" onClick={() => navigate('rooms')}
                        style={{ height: 60, justifyContent: 'center', background: 'linear-gradient(135deg, var(--success), #34d399)' }}>
                        <i className="fas fa-door-open" style={{ fontSize: 16 }} /> <span>Room Control</span>
                    </button>
                </div>
            </div>

            <BulkPdfExporter />

            <div className="card">
                <div className="card-header">
                    <h3><i className="fas fa-history" style={{ color: 'var(--text-light)' }} /> Real-Time Audit Activity Timeline</h3>
                </div>
                <div className="activity-list" id="activityLogsContainer">
                    {activity.length === 0 ? (
                        <div style={{ padding: 10, fontSize: 12, color: 'var(--text-light)', textAlign: 'center' }}>No activity logged.</div>
                    ) : activity.map(log => {
                        const [iconClass, badgeType] = activityStyle(String(log.action || ''));
                        return (
                            <div className="activity-item" key={log.id + log.time}>
                                <div className={`activity-icon ${badgeType}`}><i className={`fas ${iconClass}`} /></div>
                                <div style={{ flexGrow: 1 }}>
                                    <div className="activity-title">{log.action}</div>
                                    <div className="activity-description">{log.description}</div>
                                    <small style={{ color: 'var(--text-light)', fontSize: 10 }}>
                                        {new Date(log.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
