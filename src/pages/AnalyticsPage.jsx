import { useMemo, useState } from 'react';
import { data, useStoreVersion } from '../store/store.js';
import { getBookingTotal } from '../lib/bookingCalc.js';
import { formatNumber, MONTH_NAMES_FULL } from '../lib/format.js';
import { computePerformanceSummary, getLast6MonthsRevenueData } from '../services/metrics.js';
import { downloadDailyRevenue, downloadMonthlyRevenue, downloadYearlyRevenue } from '../services/reports.js';
import ChartCanvas from '../components/ChartCanvas.jsx';

// Trading-style heatmap of daily check-in revenue for one month
function SalesCalendar() {
    useStoreVersion();
    const [cursor, setCursor] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
    const [openDay, setOpenDay] = useState(null);
    const { year, month } = cursor;

    const changeMonth = offset => {
        setOpenDay(null);
        setCursor(({ year: y, month: m }) => {
            let nm = m + offset;
            let ny = y;
            if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
            return { year: ny, month: nm };
        });
    };

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    let maxSales = 1000; // normalization floor
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const bookings = data.bookings.filter(b => b.checkIn === dateString);
        const sales = bookings.reduce((sum, b) => sum + getBookingTotal(b), 0);
        if (sales > maxSales) maxSales = sales;
        days.push({ day, sales, bookings });
    }

    const navBtnStyle = { padding: '6px 12px', fontSize: 12, background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-dark)' };

    return (
        <div className="card owner-only" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3><i className="fas fa-calendar-alt" style={{ color: 'var(--secondary)' }} /> Trading-Style Daily Sales Heatmap</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="btn-primary" style={navBtnStyle} onClick={() => changeMonth(-1)} aria-label="Previous month"><i className="fas fa-chevron-left" /></button>
                    <strong id="salesCalendarMonthLabel" style={{ fontSize: 14, minWidth: 120, textAlign: 'center' }}>{MONTH_NAMES_FULL[month]} {year}</strong>
                    <button type="button" className="btn-primary" style={navBtnStyle} onClick={() => changeMonth(1)} aria-label="Next month"><i className="fas fa-chevron-right" /></button>
                </div>
            </div>
            <div style={{ padding: 15 }}>
                <div className="revenue-calendar-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: 11, color: 'var(--text-light)', marginBottom: 8 }}>
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div id="salesCalendarGrid" className="revenue-calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                    {Array.from({ length: firstDayIndex }, (_, i) => <div key={`pad-${i}`} className="revenue-calendar-day empty-day" />)}
                    {days.map(({ day, sales, bookings }) => {
                        const hasSales = sales > 0;
                        const intensity = hasSales ? 0.15 + (sales / maxSales) * 0.75 : 0;
                        const cellStyle = hasSales ? {
                            background: `rgba(37, 99, 235, ${intensity})`,
                            color: intensity > 0.6 ? '#ffffff' : 'var(--text-dark)',
                            ...(intensity > 0.6 ? { '--text-light': 'rgba(255,255,255,0.7)' } : {})
                        } : undefined;
                        return (
                            <div key={day} className={`revenue-calendar-day ${hasSales ? 'has-sales' : ''} ${openDay === day ? 'tooltip-open' : ''}`} style={cellStyle}
                                onClick={() => setOpenDay(d => (d === day ? null : day))}>
                                <div className="revenue-calendar-day-num">{day}</div>
                                <div className="revenue-calendar-day-sales" style={hasSales && sales / maxSales > 0.6 ? { color: '#ffffff' } : undefined}>
                                    {hasSales ? `₹${formatNumber(sales)}` : ''}
                                </div>
                                <div className="revenue-calendar-tooltip">
                                    <strong>{day} {MONTH_NAMES_FULL[month]} {year}</strong><br />
                                    Daily Sales: <strong>₹{formatNumber(sales)}</strong>
                                    {bookings.length > 0 ? (
                                        <>
                                            <hr style={{ margin: '6px 0', border: 0, borderTop: '1px solid rgba(255,255,255,0.25)' }} />
                                            {bookings.map((b, i) => (
                                                <span key={b.id}>
                                                    {i > 0 && <br />}• {b.guestName} ({b.rooms ? b.rooms.map(r => r.roomName).join(', ') : (b.roomName || 'Room')}): ₹{formatNumber(getBookingTotal(b))}
                                                </span>
                                            ))}
                                        </>
                                    ) : (
                                        <><br /><span style={{ opacity: 0.6, fontSize: 10 }}>No check-ins on this day</span></>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 15, color: 'var(--text-light)' }}>
                    <span>No Sales</span>
                    {['var(--border-light)', 'rgba(37, 99, 235, 0.2)', 'rgba(37, 99, 235, 0.45)', 'rgba(37, 99, 235, 0.7)', 'var(--secondary)'].map(bg => (
                        <div key={bg} style={{ width: 12, height: 12, background: bg, borderRadius: 2 }} />
                    ))}
                    <span>Highest Sales</span>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const version = useStoreVersion();
    const summary = computePerformanceSummary();

    const monthlyConfig = useMemo(() => {
        const monthly = getLast6MonthsRevenueData();
        return {
            type: 'bar',
            data: { labels: monthly.labels, datasets: [{ label: 'Monthly Revenue', data: monthly.values, backgroundColor: ['#1B4D3E', '#2D7A6F', '#4DB8A8', '#D4AF37', '#4DB8A8', '#2D7A6F'], borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        };
    }, [version]);

    const rows = [
        ['Occupancy Rate Average:', 'repOccupancyRate', `${summary.avgOccRate}%`],
        ['Average Guest Duration:', 'repAvgDuration', `${summary.avgDuration} Nights`],
        ['Average Daily Rate (ADR):', 'repAdr', `₹${formatNumber(Math.round(summary.adr))}`],
        ['RevPAR (per Available Room):', 'repRevPar', `₹${formatNumber(Math.round(summary.revpar))}`],
        ['Total Discounts Given:', 'repTotalDiscounts', `₹${formatNumber(summary.totalDiscounts)}`],
        ['CGST Collected (2.5%):', 'repCgstCollected', `₹${formatNumber(Math.round(summary.cgst))}`],
        ['SGST Collected (2.5%):', 'repSgstCollected', `₹${formatNumber(Math.round(summary.sgst))}`],
        ['Total GST Revenue (5%):', 'repGstCollected', `₹${formatNumber(Math.round(summary.gstTotal))}`]
    ];

    return (
        <div id="analytics" className="page-content owner-only active">
            <div className="page-header">
                <h2>Analytics &amp; Reports Center</h2>
                <div className="analytics-buttons">
                    <button type="button" className="btn-primary" onClick={downloadDailyRevenue}><i className="fas fa-file-excel" /> Export Daily Revenue Excel</button>
                    <button type="button" className="btn-primary" onClick={downloadMonthlyRevenue}><i className="fas fa-file-excel" /> Export Monthly Revenue Excel</button>
                    <button type="button" className="btn-primary" onClick={downloadYearlyRevenue}><i className="fas fa-file-excel" /> Export Yearly Revenue Excel</button>
                </div>
            </div>
            <SalesCalendar />
            <div className="analytics-grid">
                <div className="card">
                    <div className="card-header"><h3>Occupancy Report Trend</h3></div>
                    <div style={{ position: 'relative', height: 260 }}>
                        <ChartCanvas id="monthlyChart" config={monthlyConfig} />
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Lodge Performance Summary</h3></div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                        {rows.map(([label, id, value], i) => (
                            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : undefined }}>
                                <span>{label}</span><strong id={id}>{value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
