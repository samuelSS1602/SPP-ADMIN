import { useEffect, useRef, useState } from 'react';

/**
 * Renders long lists in steps so the page never freezes: `first` items immediately, then `step` more
 * each animation frame. Restarts from `first` whenever `resetKey` changes (new filter, new data).
 */
export function useProgressiveCount(total, { first = 24, step = 40, resetKey } = {}) {
    const [count, setCount] = useState(first);

    useEffect(() => { setCount(first); }, [resetKey, first]);

    useEffect(() => {
        if (count >= total) return undefined;
        const frame = requestAnimationFrame(() => setCount(c => c + step));
        return () => cancelAnimationFrame(frame);
    }, [count, total, step]);

    return Math.min(count, total);
}

/**
 * Like useProgressiveCount but grows only when the returned sentinel ref scrolls near the viewport
 * (used by the 14-column payments table).
 */
export function useScrollRevealCount(total, { first = 50, step = 100, resetKey } = {}) {
    const [count, setCount] = useState(first);
    const sentinelRef = useRef(null);

    useEffect(() => { setCount(first); }, [resetKey, first]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || count >= total) return undefined;
        if (typeof IntersectionObserver === 'undefined') {
            setCount(total);
            return undefined;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) setCount(c => c + step);
        }, { rootMargin: '800px 0px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [count, total, step]);

    return [Math.min(count, total), sentinelRef];
}

// Closes a popover when tapping/clicking outside it
export function useOutsideClose(open, onClose) {
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open, onClose]);
    return ref;
}

export function useIsMobile(breakpoint = 900) {
    const query = `(max-width: ${breakpoint}px)`;
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
}
