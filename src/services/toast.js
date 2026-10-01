// Tiny event bus so services can raise toasts without importing React components
const toastListeners = new Set();
let toastSeq = 0;

export function onToast(listener) {
    toastListeners.add(listener);
    return () => toastListeners.delete(listener);
}

export function showToast({ title, message, type = 'info', duration = 3200, variant = 'default' }) {
    const toast = { id: ++toastSeq, title, message, type, duration, variant };
    toastListeners.forEach(listener => listener(toast));
}
