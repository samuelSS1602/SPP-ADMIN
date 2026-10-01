import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal shell using the existing .modal / .modal-content styles.
 * closeOnBackdrop also enables Escape — kept off for forms where an accidental close would lose input.
 */
export default function Modal({ id, onClose, closeOnBackdrop = true, className = '', contentClassName = '', contentStyle, children, role = 'dialog', labelledBy }) {
    useEffect(() => {
        if (!closeOnBackdrop) return undefined;
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [closeOnBackdrop, onClose]);

    return createPortal(
        <div
            id={id}
            className={`modal active ${className}`.trim()}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            onMouseDown={e => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
        >
            <div className={`modal-content ${contentClassName}`.trim()} style={contentStyle}>
                {children}
            </div>
        </div>,
        document.body
    );
}

export function ModalHeader({ title, onClose, titleId, children }) {
    return (
        <div className="modal-header">
            {children || <h3 id={titleId}>{title}</h3>}
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>
    );
}
