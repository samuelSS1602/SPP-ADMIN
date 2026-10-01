import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { data, findBooking, useStoreVersion } from '../store/store.js';
import Modal, { ModalHeader } from '../components/Modal.jsx';
import { useUI } from '../ui/UIContext.jsx';
import { capitalizeFirst, formatDate } from '../lib/format.js';
import {
    assignPhotoToBooking, fetchAllPhotos, fetchOrphanedPhotos, loadBookingPhotos, loadGuestStayPhotos, readImageFile, replaceBookingPhoto
} from '../services/photos.js';
import { isCloudReady } from '../firebase/client.js';

// ---------- Full-screen photo (pinch-zoom friendly) ----------
export function ExpandPhotoModal({ src, title, onClose }) {
    const [state, setState] = useState('loading');
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div id="expandPhotoModal" className="expand-photo-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="expand-photo-stage" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
                {state === 'loading' && <div className="expand-photo-loader"><i className="fas fa-spinner fa-spin" style={{ fontSize: 48 }} /></div>}
                {state === 'error' && (
                    <div className="expand-photo-loader" style={{ textAlign: 'center' }}>
                        <i className="fas fa-exclamation-circle" style={{ fontSize: 48, marginBottom: 10, display: 'block' }} /><p>Failed to load image</p>
                    </div>
                )}
                <img src={src} alt={title} onLoad={() => setState('ready')} onError={() => setState('error')} style={{ display: state === 'ready' ? 'block' : 'none' }} />
            </div>
            <div className="expand-photo-title">{title}</div>
            <button type="button" className="expand-photo-close" onClick={onClose} aria-label="Close photo"><i className="fas fa-times" /></button>
        </div>,
        document.body
    );
}

// ---------- One booking's photos, with replace ----------
export function PhotoViewerModal({ bookingId, onClose }) {
    useStoreVersion();
    const { openModal } = useUI();
    const booking = findBooking(bookingId);
    const [photos, setPhotos] = useState(null);
    const customerInput = useRef(null);
    const idInput = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setPhotos(null);
        loadBookingPhotos(bookingId).then(result => { if (!cancelled) setPhotos(result); });
        return () => { cancelled = true; };
    }, [bookingId]);

    if (!booking) return null;

    const replace = async (kind, file) => {
        try {
            const image = await readImageFile(file);
            setPhotos(p => ({ ...p, [kind === 'customer' ? 'customerPhoto' : 'idProofPhoto']: image }));
            await replaceBookingPhoto(booking.id, kind, image);
        } catch (e) { /* message already shown */ }
    };

    const panel = (heading, kind, src, buttonLabel, inputRef) => (
        <div style={{ flex: 1, minWidth: 260 }}>
            <h4 style={{ marginBottom: 10, fontSize: 13 }}>{heading}</h4>
            {src
                ? <img src={src} alt={heading} className="photo-viewer-img" onClick={() => openModal('expandPhoto', { src, title: `${heading} - ${booking.id}` })}
                    style={{ width: '100%', height: 320, objectFit: 'contain', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', cursor: 'zoom-in' }} />
                : <p style={{ color: 'var(--text-light)', fontStyle: 'italic', marginTop: 10 }}>{photos ? 'Not Available' : 'Loading photos...'}</p>}
            <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()} style={{ marginTop: 12, fontSize: 11, background: 'var(--warning)', width: '100%', justifyContent: 'center' }}>
                <i className="fas fa-camera" /> {buttonLabel}
            </button>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { replace(kind, e.target.files[0]); e.target.value = ''; }} />
        </div>
    );

    return (
        <Modal id="photoViewerModal" onClose={onClose} contentClassName="customer-modal-large" contentStyle={{ maxWidth: 800, textAlign: 'center' }}>
            <ModalHeader onClose={onClose}><h3 id="photoViewerTitle">Booking {booking.id} - {booking.guestName} Photos</h3></ModalHeader>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 15 }}>
                {panel('Customer Photo Portrait', 'customer', photos?.customerPhoto, 'Update Photo', customerInput)}
                {panel('ID Proof Card Scan', 'idProof', photos?.idProofPhoto, 'Update Photo ID', idInput)}
            </div>
            <div style={{ marginTop: 20 }}>
                <button type="button" className="btn-primary" onClick={onClose} style={{ width: 150, justifyContent: 'center' }}>Close Gallery</button>
            </div>
        </Modal>
    );
}

// ---------- All stays of one guest ----------
export function GuestPhotoHistoryModal({ guestName, guestPhone, onClose }) {
    useStoreVersion();
    const { openModal } = useUI();
    const [loaded, setLoaded] = useState(false);
    const guestBookings = data.bookings
        .filter(b => b.guestName === guestName || b.guestPhone === guestPhone)
        .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

    useEffect(() => {
        let cancelled = false;
        const list = data.bookings.filter(b => b.guestName === guestName || b.guestPhone === guestPhone);
        loadGuestStayPhotos(list).then(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, [guestName, guestPhone]);

    const photoBox = (src, label, emptyText, bookingId) => (
        <div style={{ background: 'var(--surface-muted)', borderRadius: 10, padding: 14 }}>
            <p style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 700, color: 'var(--text-dark)' }}>{label}</p>
            {src
                ? <img src={src} alt={label} onClick={() => openModal('expandPhoto', { src, title: `${label} - ${bookingId}` })}
                    style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border-light)', cursor: 'zoom-in' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: 10 }}>{emptyText}</div>}
        </div>
    );

    return (
        <Modal id="guestPhotoHistoryModal" onClose={onClose} contentClassName="customer-modal-large" contentStyle={{ maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                <h3 id="guestPhotoHistoryTitle" style={{ color: 'var(--primary-brand, var(--primary))', margin: 0, fontSize: 20 }}><i className="fas fa-history" /> {guestName} - Stayed Photo History</h3>
                <button type="button" className="close-btn" onClick={onClose} style={{ fontSize: 28 }} aria-label="Close">&times;</button>
            </div>
            <div id="guestPhotoHistoryContent" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {guestBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No stayed bookings found for this guest.</div>
                ) : !loaded ? (
                    <div style={{ textAlign: 'center', padding: 30 }}><i className="fas fa-spinner fa-spin" /> Loading guest stays...</div>
                ) : (
                    <div style={{ display: 'grid', gap: 22 }}>
                        {guestBookings.map(booking => (
                            <div key={booking.id} style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 18, background: 'var(--bg-card)', boxShadow: '0 1px 6px rgba(15, 23, 42, 0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                                    <div>
                                        <p style={{ margin: '0 0 5px 0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Booking Number</p>
                                        <h4 style={{ margin: 0, fontSize: 18, color: '#dc2626' }}>{booking.id}</h4>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '0 0 5px 0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Stay Dates</p>
                                        <p style={{ margin: 0, color: 'var(--text-dark)', fontWeight: 600 }}>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                                    </div>
                                    <span className={`status-badge ${booking.status}`} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700 }}>{capitalizeFirst(booking.status)}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                                    {photoBox(booking.customerPhotoUrl || booking.customerPhoto, 'Guest Photo', 'No Customer Photo', booking.id)}
                                    {photoBox(booking.idProofPhotoUrl || booking.idProofPhoto, 'ID Proof', 'No ID Proof', booking.id)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 15, width: '100%', padding: 12, fontSize: 14, justifyContent: 'center' }}>Close</button>
        </Modal>
    );
}

function StatusBar({ children }) {
    return (
        <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 15, padding: 10, background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--secondary)' }}>
            {children}
        </div>
    );
}

// ---------- Every photo stored in the cloud ----------
function ArchivePhoto({ src, title }) {
    const { openModal } = useUI();
    const [state, setState] = useState('loading');
    return (
        <div style={{ padding: 8, background: 'var(--surface-muted)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, position: 'relative', overflow: 'hidden' }}>
            {state !== 'ready' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    {state === 'loading'
                        ? <i className="fas fa-spinner fa-spin" style={{ color: '#94a3b8', fontSize: 24 }} />
                        : <div style={{ textAlign: 'center', color: '#94a3b8' }}><i className="fas fa-exclamation-circle" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} /><span style={{ fontSize: 11 }}>Failed to load</span></div>}
                </div>
            )}
            <img src={src} alt={title} title="Click to expand" loading="lazy" onLoad={() => setState('ready')} onError={() => setState('error')}
                onClick={e => { e.stopPropagation(); openModal('expandPhoto', { src, title }); }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', position: 'relative', zIndex: 2 }} />
        </div>
    );
}

export function AllPhotosModal({ onClose }) {
    const [state, setState] = useState({ status: 'loading', items: [] });

    useEffect(() => {
        if (!isCloudReady()) {
            setState({ status: 'offline', items: [] });
            return;
        }
        let cancelled = false;
        fetchAllPhotos().then(docs => {
            if (cancelled) return;
            const items = [];
            docs.forEach(({ id, data: photoDoc }) => {
                const booking = data.bookings.find(b => b.id === id);
                const guestName = booking ? booking.guestName : 'Unknown Guest';
                if (photoDoc.customerPhoto) items.push({ key: `c-${id}`, bookingId: id, guestName, src: photoDoc.customerPhoto, kind: 'customer' });
                if (photoDoc.idProofPhoto) items.push({ key: `i-${id}`, bookingId: id, guestName, src: photoDoc.idProofPhoto, kind: 'id' });
            });
            setState({ status: 'done', items });
        }).catch(err => {
            console.error('Error fetching all photos:', err);
            if (!cancelled) setState({ status: 'error', items: [] });
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <Modal id="allPhotosModal" onClose={onClose} contentClassName="customer-modal-large" contentStyle={{ maxWidth: 1200 }}>
            <ModalHeader title="Verification Photo Gallery Archive" onClose={onClose} />
            <StatusBar>
                {state.status === 'loading' && <><i className="fas fa-spinner fa-spin" /> Loading all photos from database...</>}
                {state.status === 'offline' && <><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }} /> Database connection not available.</>}
                {state.status === 'error' && <><i className="fas fa-times-circle" style={{ color: '#ef4444' }} /> Failed to fetch photos from database. See console for details.</>}
                {state.status === 'done' && (state.items.length === 0
                    ? <><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> No photos found in the database.</>
                    : <><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> Found <strong>{state.items.length}</strong> photo(s) in the database.</>)}
            </StatusBar>
            <div id="allPhotosGrid" className="photo-archive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, maxHeight: 500, overflowY: 'auto', padding: 5 }}>
                {state.items.map(item => (
                    <div key={item.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '8px 10px', background: item.kind === 'id' ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-muted)', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: item.kind === 'id' ? '#e74c3c' : 'var(--primary-brand, var(--primary))', wordBreak: 'break-word' }}>
                                <i className={`fas ${item.kind === 'id' ? 'fa-passport' : 'fa-id-card'}`} /> {item.bookingId}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, wordBreak: 'break-word' }}>{item.guestName}</div>
                        </div>
                        <ArchivePhoto src={item.src} title={`${item.kind === 'id' ? 'ID Proof' : 'Customer'} - ${item.bookingId}`} />
                        <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: 'var(--text-light)', borderTop: '1px solid var(--border-light)' }}>
                            {item.kind === 'id' ? 'ID Proof' : 'Guest Photo'}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

// ---------- Photos left behind by deleted / renumbered bookings ----------
function OrphanCard({ item, onAssigned }) {
    const [target, setTarget] = useState('');
    const recentBookings = [...data.bookings]
        .sort((a, b) => new Date(b.createdAt || b.checkIn || 0).getTime() - new Date(a.createdAt || a.checkIn || 0).getTime())
        .slice(0, 30);

    const assign = async () => {
        if (await assignPhotoToBooking(item.id, target)) onAssigned();
    };

    const thumb = (src, title) => src && <img src={src} title={title} alt={title} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />;

    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 10, background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-light)', fontWeight: 600, fontSize: 13 }}>Found ID: {item.id}</div>
            <div style={{ padding: 15, flex: 1, display: 'flex', gap: 10, justifyContent: 'center' }}>
                {thumb(item.data.customerPhoto, 'Customer Photo')}
                {thumb(item.data.idProofPhoto, 'ID Proof')}
            </div>
            <div style={{ padding: 15, borderTop: '1px solid var(--border-light)' }}>
                <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 10, fontSize: 12 }} aria-label="Assign to booking">
                    <option value="">Select booking to assign...</option>
                    {recentBookings.map(b => <option key={b.id} value={b.id}>{b.id} - {b.guestName} (Room {b.roomName})</option>)}
                </select>
                <button type="button" className="btn-primary" onClick={assign} style={{ width: '100%', fontSize: 12, padding: 8, justifyContent: 'center' }}>
                    <i className="fas fa-link" /> Assign to Booking
                </button>
            </div>
        </div>
    );
}

export function RecoverPhotosModal({ onClose }) {
    const [state, setState] = useState({ status: 'loading', items: [] });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!isCloudReady()) {
            setState({ status: 'offline', items: [] });
            return;
        }
        let cancelled = false;
        setState({ status: 'loading', items: [] });
        fetchOrphanedPhotos()
            .then(items => { if (!cancelled) setState({ status: 'done', items }); })
            .catch(err => {
                console.error('Error fetching orphaned photos:', err);
                if (!cancelled) setState({ status: 'error', items: [] });
            });
        return () => { cancelled = true; };
    }, [reloadKey]);

    const statusBoxStyle = { padding: 15, background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 20 };

    return (
        <Modal id="recoverPhotosModal" onClose={onClose} contentClassName="customer-modal-large" contentStyle={{ maxWidth: 800 }}>
            <ModalHeader title="Recover Orphaned Verification Images" onClose={onClose} />
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 15 }}>Scanning database for orphaned photos belonging to deleted or renumbered booking records. You can link them back to active bookings below.</p>
            <div id="recoverPhotosStatus" style={statusBoxStyle}>
                {state.status === 'loading' && <><i className="fas fa-spinner fa-spin" /> Scanning cloud database for orphaned photos...</>}
                {state.status === 'offline' && <><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }} /> Database connection not available.</>}
                {state.status === 'error' && <><i className="fas fa-times-circle" style={{ color: '#ef4444' }} /> Failed to fetch photos from cloud database. See console for details.</>}
                {state.status === 'done' && (state.items.length === 0
                    ? <><i className="fas fa-check-circle" style={{ color: '#10b981' }} /> No orphaned photos found in the database. All existing photos are properly linked.</>
                    : <><i className="fas fa-exclamation-circle" style={{ color: '#f59e0b' }} /> Found {state.items.length} photo record(s) not linked to any active booking.</>)}
            </div>
            <div id="recoverPhotosGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 15, maxHeight: 400, overflowY: 'auto' }}>
                {state.items.map(item => <OrphanCard key={item.id} item={item} onAssigned={() => setReloadKey(k => k + 1)} />)}
            </div>
        </Modal>
    );
}
