import { useEffect, useState } from 'react';
import { findBooking, useStoreVersion } from '../store/store.js';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { buildReceiptInvoiceHtml, computeInvoice, openPrintWindow } from '../lib/invoice.js';
import { isBookingFullyPaid } from '../lib/bookingCalc.js';
import { getCustomerRecordForBooking } from '../services/guests.js';
import { applyReceiptAdjustments, markReceiptAsPaid } from '../services/bookings.js';

const inputStyle = { padding: '4px 8px', width: 70, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 600 };
const labelStyle = { fontWeight: 600, color: '#0f172a', fontSize: 12 };

export default function ReceiptModal({ bookingId, onClose }) {
    useStoreVersion();
    const booking = findBooking(bookingId);
    const inv = booking ? computeInvoice(booking, getCustomerRecordForBooking(booking) || {}) : null;
    const [edit, setEdit] = useState(null);

    // Editor starts from the saved values (and follows them after an update)
    const savedKey = inv ? [booking.discount || 0, inv.extraBed, inv.extras, inv.mCount, inv.fCount, inv.cCount].join('|') : '';
    useEffect(() => {
        if (!inv) return;
        setEdit({ discount: booking.discount || 0, extraBed: inv.extraBed, extras: inv.extras, male: inv.mCount, female: inv.fCount, child: inv.cCount });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedKey]);

    if (!booking || !edit) return null;

    const invoiceHtml = buildReceiptInvoiceHtml(booking, getCustomerRecordForBooking(booking) || {});
    const isFullyPaid = isBookingFullyPaid(booking);
    const bind = key => ({ value: edit[key], onChange: e => setEdit(v => ({ ...v, [key]: e.target.value })) });

    const update = () => {
        const num = key => parseFloat(edit[key]) || 0;
        const int = key => parseInt(edit[key], 10) || 0;
        applyReceiptAdjustments(booking.id, {
            discount: num('discount'),
            extraBed: num('extraBed'),
            extras: num('extras'),
            maleCount: int('male'),
            femaleCount: int('female'),
            childrenCount: int('child')
        });
    };

    const print = () => openPrintWindow({
        title: 'Receipt - Tax Invoice',
        bodyHtml: invoiceHtml,
        style: `
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { padding: 0; margin: 0; width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .receipt-a4-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                }`
    });

    return (
        <Modal id="receiptModal" onClose={onClose}>
            <ModalHeader title="Tax Invoice Billing Statement" onClose={onClose} />
            <div id="receiptBody" className="receipt-body">
                <div className="no-print receipt-editor" style={{ background: '#f8fafc', padding: 15, textAlign: 'center', borderBottom: '1px solid #e2e8f0', marginBottom: 20, borderRadius: 8 }}>
                    <div style={{ display: 'inline-flex', gap: 15, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
                        <div><label style={labelStyle}>Discount (₹): </label><input type="number" id="inlineDiscountInput" inputMode="decimal" style={inputStyle} {...bind('discount')} /></div>
                        <div><label style={labelStyle}>Extra Bed (₹): </label><input type="number" id="inlineExtraBedInput" inputMode="decimal" style={inputStyle} {...bind('extraBed')} /></div>
                        <div><label style={labelStyle}>Extras (₹): </label><input type="number" id="inlineExtrasInput" inputMode="decimal" style={inputStyle} {...bind('extras')} /></div>
                    </div>
                    <div style={{ display: 'inline-flex', gap: 15, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10, borderTop: '1px dashed #cbd5e1', paddingTop: 10, width: '100%' }}>
                        <div><label style={labelStyle}>Male: </label><input type="number" id="inlineMaleInput" inputMode="numeric" style={{ ...inputStyle, width: 50 }} {...bind('male')} /></div>
                        <div><label style={labelStyle}>Female: </label><input type="number" id="inlineFemaleInput" inputMode="numeric" style={{ ...inputStyle, width: 50 }} {...bind('female')} /></div>
                        <div><label style={labelStyle}>Child: </label><input type="number" id="inlineChildInput" inputMode="numeric" style={{ ...inputStyle, width: 50 }} {...bind('child')} /></div>
                        <button type="button" onClick={update}
                            style={{ padding: '6px 14px', background: 'var(--primary-brand, var(--primary))', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)', marginLeft: 10 }}>
                            ↻ Update Invoice
                        </button>
                        <button type="button" id="markPaidBtn" disabled={isFullyPaid} onClick={() => markReceiptAsPaid(booking.id)}
                            style={isFullyPaid
                                ? { padding: '6px 14px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'not-allowed', fontWeight: 600, marginLeft: 10 }
                                : { padding: '6px 14px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px rgba(39, 174, 96, 0.2)', marginLeft: 10 }}>
                            {isFullyPaid ? <><i className="fas fa-check" /> Already Paid</> : <><i className="fas fa-check-circle" /> Mark as Paid</>}
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Adjust any charges or guest counts and click Update.</p>
                </div>
                <div className="receipt-scroll" dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
            </div>
            <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={print}><i className="fas fa-print" /> Print Invoice</button>
                <button type="button" className="btn-primary" onClick={print}><i className="fas fa-download" /> Download Invoice PDF</button>
            </div>
        </Modal>
    );
}
