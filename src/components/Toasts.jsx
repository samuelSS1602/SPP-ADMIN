import { useEffect, useState } from 'react';
import { onToast } from '../services/toast.js';

const ICONS = {
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark',
    info: 'fa-bell',
    reminder: 'fa-clock'
};

function Toast({ toast, onDone }) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setClosing(true), toast.duration);
        return () => clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (!closing) return undefined;
        const timer = setTimeout(() => onDone(toast.id), 180);
        return () => clearTimeout(timer);
    }, [closing, onDone, toast.id]);

    const isReminder = toast.variant === 'reminder';
    const closeButton = (
        <button className="app-toast-close" type="button" aria-label="Close notification" onClick={() => setClosing(true)}>
            <i className="fas fa-times" />
        </button>
    );

    return (
        <div className={`app-toast ${toast.type} ${isReminder ? 'reminder' : ''} ${closing ? 'closing' : ''}`.trim()}>
            <div className="app-toast-icon"><i className={`fas ${isReminder ? ICONS.reminder : (ICONS[toast.type] || ICONS.info)}`} /></div>
            {isReminder ? (
                <>
                    <div className="app-toast-content">
                        <div className="app-toast-meta">Checkout due soon</div>
                        <div className="app-toast-title">{toast.title}</div>
                        <div className="app-toast-message">{toast.message}</div>
                        <div className="app-toast-badge">Action needed</div>
                    </div>
                    {closeButton}
                </>
            ) : (
                <div className="app-toast-content">
                    <div className="app-toast-header">
                        <span className="app-toast-title">{toast.title}</span>
                        {closeButton}
                    </div>
                    <div className="app-toast-message">{toast.message}</div>
                </div>
            )}
        </div>
    );
}

export default function Toasts() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => onToast(toast => setToasts(current => [...current, toast])), []);

    const remove = id => setToasts(current => current.filter(t => t.id !== id));

    return (
        <div id="appToastContainer" className="app-toast-container" aria-live="polite" aria-atomic="true">
            {toasts.map(toast => <Toast key={toast.id} toast={toast} onDone={remove} />)}
        </div>
    );
}
