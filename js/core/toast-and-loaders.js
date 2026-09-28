
function showToast({ title, message, type = 'info', duration = 3200, variant = 'default' }) {
    const container = document.getElementById('appToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const iconMap = {
        success: 'fa-circle-check',
        warning: 'fa-triangle-exclamation',
        error: 'fa-circle-xmark',
        info: 'fa-bell',
        reminder: 'fa-clock'
    };

    toast.className = `app-toast ${type} ${variant === 'reminder' ? 'reminder' : ''}`.trim();

    if (variant === 'reminder') {
        toast.innerHTML = `
            <div class="app-toast-icon"><i class="fas ${iconMap.reminder}"></i></div>
            <div class="app-toast-content">
                <div class="app-toast-meta">Checkout due soon</div>
                <div class="app-toast-title">${title}</div>
                <div class="app-toast-message">${message}</div>
                <div class="app-toast-badge">Action needed</div>
            </div>
            <button class="app-toast-close" type="button" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
    } else {
        toast.innerHTML = `
            <div class="app-toast-icon"><i class="fas ${iconMap[type] || iconMap.info}"></i></div>
            <div class="app-toast-content">
                <div class="app-toast-header">
                    <span class="app-toast-title">${title}</span>
                    <button class="app-toast-close" type="button" aria-label="Close notification">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="app-toast-message">${message}</div>
            </div>
        `;
    }

    const closeBtn = toast.querySelector('.app-toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 180);
    });

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 180);
    }, duration);
}

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

function ensureXlsxLoaded() {
    return window.XLSX
        ? Promise.resolve()
        : loadExternalScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
}

function ensureChartJsLoaded() {
    return window.Chart
        ? Promise.resolve()
        : loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js');
}
