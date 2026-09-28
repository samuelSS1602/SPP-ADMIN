// --- RENDER PERFORMANCE HELPERS ---

// Every page re-renders when it is opened (navigateTo calls its loader),
// so heavy list pages can skip rebuilding while they are hidden.
function isPageVisible(pageId) {
    const page = document.getElementById(pageId);
    return Boolean(page && page.classList.contains('active'));
}

// Booking photos are large base64 strings. Writing them into card HTML made innerHTML
// parse tens of megabytes, so cards render <img data-photo-booking="ID"> placeholders
// and the real photo is attached only when the card scrolls near the viewport.
function hydrateBookingPhotos(container) {
    if (!container) return;
    const images = container.querySelectorAll('img[data-photo-booking]');
    if (images.length === 0) return;

    const bookingsById = new Map(data.bookings.map(booking => [String(booking.id), booking]));
    const attachPhoto = img => {
        const booking = bookingsById.get(img.dataset.photoBooking);
        const src = booking && (booking.customerPhotoUrl || booking.customerPhoto);
        img.removeAttribute('data-photo-booking');
        if (!src) return;
        img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
        img.src = src;
    };

    if (!('IntersectionObserver' in window)) {
        images.forEach(attachPhoto);
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            attachPhoto(entry.target);
        });
    }, { rootMargin: '600px 0px' });
    images.forEach(img => observer.observe(img));
}
