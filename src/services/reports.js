import { data } from '../store/store.js';
import { calculateBookingDays, getBookingBalance, getBookingTotal } from '../lib/bookingCalc.js';
import { formatDate, getLocalISODate, MONTH_NAMES_FULL, toISODateFromDate } from '../lib/format.js';
import { buildBulkInvoiceHtml, buildGstInvoiceHtml, openPrintWindow } from '../lib/invoice.js';
import { getBookingPhotosDoc } from '../firebase/sync.js';
import { isCloudReady } from '../firebase/client.js';
import { getCustomerRecordForBooking } from './guests.js';

function netRoomTariff(booking) {
    const totalRoom = (Number(booking.roomRate) || 0) * calculateBookingDays(booking);
    return Math.max(0, totalRoom - (Number(booking.discount) || 0));
}

const extrasOf = booking => (Number(booking.extras) || 0) + (Number(booking.extraBed) || 0);

async function writeWorkbook(rows, sheetName, fileName) {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
}

export async function downloadDailyRevenue() {
    const today = getLocalISODate();
    const todaysBookings = data.bookings.filter(booking => booking.checkIn === today);
    const rows = [
        ['Sri Padmavati Pleasants - Daily Revenue Report'],
        ['Date: ' + formatDate(today)],
        [],
        ['Check-in Time', 'Room', 'Guest', 'Room Rate', 'Advance', 'Extras', 'Total']
    ];
    if (!todaysBookings.length) {
        rows.push(['No records', '-', '-', 0, 0, 0, 0]);
    } else {
        todaysBookings.forEach(booking => rows.push([
            booking.checkInTime || 'N/A',
            booking.roomName || '-',
            booking.guestName || '-',
            netRoomTariff(booking),
            Number(booking.advance) || 0,
            extrasOf(booking),
            getBookingTotal(booking)
        ]));
    }
    rows.push([]);
    rows.push(['DAILY TOTAL', '', '', '', '', '', todaysBookings.reduce((sum, b) => sum + getBookingTotal(b), 0)]);

    await writeWorkbook(rows, 'Daily Revenue', `Daily_Revenue_${today}.xlsx`);
    alert('Daily Revenue report downloaded!');
}

export async function downloadMonthlyRevenue() {
    const currentYear = new Date().getFullYear();
    const monthlySummary = MONTH_NAMES_FULL.map((month, monthIndex) => {
        const monthBookings = data.bookings.filter(booking => {
            const date = new Date(booking.checkIn);
            return date.getFullYear() === currentYear && date.getMonth() === monthIndex;
        });
        return [
            `${month} ${currentYear}`,
            monthBookings.length,
            monthBookings.reduce((sum, b) => sum + (Number(b.advance) || 0), 0),
            monthBookings.reduce((sum, b) => sum + getBookingBalance(b), 0),
            monthBookings.reduce((sum, b) => sum + extrasOf(b), 0),
            monthBookings.reduce((sum, b) => sum + getBookingTotal(b), 0)
        ];
    });
    await writeWorkbook([
        ['Sri Padmavati Pleasants - Monthly Revenue Report'],
        [],
        ['Month', 'Room Bookings', 'Advance Received', 'Balance Received', 'Extras', 'Total Revenue'],
        ...monthlySummary
    ], 'Monthly Revenue', 'Monthly_Revenue_Report.xlsx');
    alert('Monthly Revenue report downloaded!');
}

export async function downloadYearlyRevenue() {
    const emptyYear = () => ({ bookings: 0, roomRateRevenue: 0, advanceCollected: 0, balanceCollected: 0, extrasRevenue: 0, totalRevenue: 0 });
    const yearlyMap = new Map();
    data.bookings.forEach(booking => {
        const date = new Date(booking.checkIn);
        if (Number.isNaN(date.getTime())) return;
        const year = date.getFullYear();
        if (!yearlyMap.has(year)) yearlyMap.set(year, emptyYear());
        const s = yearlyMap.get(year);
        s.bookings += 1;
        s.roomRateRevenue += netRoomTariff(booking);
        s.advanceCollected += Number(booking.advance) || 0;
        s.balanceCollected += getBookingBalance(booking);
        s.extrasRevenue += extrasOf(booking);
        s.totalRevenue += getBookingTotal(booking);
    });
    if (!yearlyMap.size) yearlyMap.set(new Date().getFullYear(), emptyYear());

    const rows = Array.from(yearlyMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, s]) => [String(year), s.bookings, s.roomRateRevenue, s.advanceCollected, s.balanceCollected, s.extrasRevenue, s.totalRevenue]);
    await writeWorkbook([
        ['Sri Padmavati Pleasants - Yearly Revenue Report'],
        [],
        ['Year', 'Total Bookings', 'Room Rate Revenue', 'Advance Collected', 'Balance Collected', 'Extras Revenue', 'Total Revenue'],
        ...rows
    ], 'Yearly Revenue', 'Yearly_Revenue_Report.xlsx');
    alert('Yearly Revenue report downloaded!');
}

// ---------- Date range presets ----------
// GST printout: week starts Sunday, range ends today
export function gstPresetRange(preset) {
    const today = new Date();
    switch (preset) {
        case 'today': return { from: toISODateFromDate(today), to: toISODateFromDate(today) };
        case 'week': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            return { from: toISODateFromDate(start), to: toISODateFromDate(today) };
        }
        case 'month': return { from: toISODateFromDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISODateFromDate(today) };
        default: return { from: '', to: '' };
    }
}

// Bulk PDF exporter: Monday–Sunday week, whole calendar month
export function downloadPresetRange(preset) {
    const today = new Date();
    const todayISO = getLocalISODate();
    switch (preset) {
        case 'today': return { from: todayISO, to: todayISO };
        case 'week': {
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { from: toISODateFromDate(monday), to: toISODateFromDate(sunday) };
        }
        case 'month':
            return {
                from: toISODateFromDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                to: toISODateFromDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
            };
        default: return { from: '2020-01-01', to: todayISO };
    }
}

// ---------- GST bill printout ----------
export function getGSTFilteredBookings(methodFilter, fromVal, toVal) {
    return data.bookings.filter(b => {
        const method = b.paymentMethod || 'Cash';
        if (methodFilter === 'except-online') {
            if (method === 'Online') return false;
        } else if (methodFilter !== 'all' && method !== methodFilter) {
            return false;
        }
        if (fromVal && b.checkIn && b.checkIn < fromVal) return false;
        if (toVal && b.checkIn && b.checkIn > toVal) return false;
        return true;
    });
}

export function printGSTBills(bookings) {
    if (bookings.length === 0) {
        alert('No bills match the selected filters. Please adjust your filters and try again.');
        return;
    }
    openPrintWindow({
        title: `GST Bills - Bulk Print (${bookings.length} invoice${bookings.length !== 1 ? 's' : ''})`,
        bodyHtml: bookings.map(buildGstInvoiceHtml).join(''),
        printDelay: 600,
        size: 'height=900,width=950',
        style: `
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .invoice-page { padding: 15px; }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .invoice-page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10px !important; page-break-after: always; }
                    .invoice-page:last-child { page-break-after: avoid; }
                }`
    });
}

// ---------- Bulk PDF bill exporter ----------
export function bookingsInCheckInRange(fromDate, toDate) {
    return data.bookings.filter(booking => booking.checkIn && booking.checkIn >= fromDate && booking.checkIn <= toDate);
}

export async function downloadAllBookingData(fromDate, toDate) {
    if (!fromDate || !toDate) {
        alert('Please select both From and To dates before downloading.');
        return;
    }
    if (fromDate > toDate) {
        alert('From date cannot be after To date.');
        return;
    }
    const filtered = bookingsInCheckInRange(fromDate, toDate);
    if (filtered.length === 0) {
        alert('No bookings found in the selected date range.');
        return;
    }

    // Open the window right away (inside the click) so popup blockers allow it
    const printWindow = window.open('', '', 'height=800,width=900');
    if (!printWindow) {
        alert('Please allow popups for this site to generate the PDF bills.');
        return;
    }
    printWindow.document.write('<html><head><title>Loading...</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f4f4f4;}h2{color:#333;}</style></head><body><h2>Preparing PDF Bills... This may take a moment.</h2></body></html>');

    const photoMap = {};
    for (const booking of filtered) {
        const localCustomer = booking.customerPhoto || booking.customerPhotoUrl || null;
        const localIdProof = booking.idProofPhoto || booking.idProofPhotoUrl || null;
        photoMap[booking.id] = { customerPhoto: localCustomer, idProofPhoto: localIdProof };
        if (isCloudReady() && (!localCustomer || !localIdProof)) {
            try {
                const picData = await getBookingPhotosDoc(booking.id);
                if (picData) {
                    photoMap[booking.id] = {
                        customerPhoto: localCustomer || picData.customerPhoto || null,
                        idProofPhoto: localIdProof || picData.idProofPhoto || null
                    };
                }
            } catch (e) { /* keep local photos */ }
        }
    }

    openPrintWindow({
        existingWindow: printWindow,
        title: 'Booking Data - All Bills',
        bodyHtml: filtered.map(b => buildBulkInvoiceHtml(b, getCustomerRecordForBooking(b) || {}, photoMap[b.id])).join(''),
        printDelay: 1500,
        style: `
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background:#ccc;}
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .receipt-a4-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow:none !important; border:none !important; }
                }
                @media screen {
                    .receipt-a4-container { margin: 20px auto !important; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                }`
    });
}
