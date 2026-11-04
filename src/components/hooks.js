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

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eases a number from its last value (0 on first show) to `value`. Jumps straight there with "reduce motion". */
export function useCountUp(value, duration = 900) {
    const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
    const shownRef = useRef(shown);

    useEffect(() => {
        if (prefersReducedMotion()) {
            shownRef.current = value;
            setShown(value);
            return undefined;
        }
        const from = shownRef.current;
        const start = performance.now();
        let frame;
        const step = now => {
            const t = Math.min(1, (now - start) / duration);
            shownRef.current = t >= 1 ? value : from + (value - from) * (1 - Math.pow(1 - t, 3));
            setShown(shownRef.current);
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);

    return shown;
}

/**
 * Tilts the [data-tilt] element under the mouse toward the pointer by setting --rx/--ry (angle) and
 * --gx/--gy (glare position). Mouse only: nothing happens on touch screens or with "reduce motion".
 */
export function usePointerTilt(maxDegrees = 7) {
    useEffect(() => {
        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let current = null;
        let rect = null;
        let frame = 0;
        let lastEvent = null;

        const reset = el => {
            el.classList.remove('tilting');
            el.style.removeProperty('--rx');
            el.style.removeProperty('--ry');
        };
        const apply = () => {
            frame = 0;
            const target = lastEvent.target instanceof Element ? lastEvent.target.closest('[data-tilt]') : null;
            if (target !== current) {
                if (current) reset(current);
                current = target;
                rect = target ? target.getBoundingClientRect() : null;
            }
            if (!target || !finePointer.matches || reduceMotion.matches) return;
            const px = (lastEvent.clientX - rect.left) / rect.width - 0.5;
            const py = (lastEvent.clientY - rect.top) / rect.height - 0.5;
            target.style.setProperty('--ry', `${(px * maxDegrees * 2).toFixed(2)}deg`);
            target.style.setProperty('--rx', `${(-py * maxDegrees * 2).toFixed(2)}deg`);
            target.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
            target.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
            target.classList.add('tilting');
        };
        const onMove = e => {
            if (e.pointerType !== 'mouse') return;
            lastEvent = e;
            if (!frame) frame = requestAnimationFrame(apply);
        };
        const release = () => {
            if (current) reset(current);
            current = null;
        };
        const onOut = e => { if (!e.relatedTarget) release(); };

        document.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('mouseout', onOut);
        // The cached rectangle is stale once the page scrolls
        document.addEventListener('scroll', release, { passive: true, capture: true });
        return () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('mouseout', onOut);
            document.removeEventListener('scroll', release, { capture: true });
            cancelAnimationFrame(frame);
            release();
        };
    }, [maxDegrees]);
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
