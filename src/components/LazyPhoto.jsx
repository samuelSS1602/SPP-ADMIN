import { useEffect, useRef, useState } from 'react';

// Booking photos are large base64 strings, so a photo is attached only when its card scrolls near the viewport.
export default function LazyPhoto({ src, alt }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (visible || !ref.current) return undefined;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '600px 0px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [visible]);

    return (
        <img
            ref={ref}
            src={visible ? src : undefined}
            alt={alt}
            decoding="async"
            className={loaded ? 'is-loaded' : undefined}
            onLoad={() => setLoaded(true)}
        />
    );
}
