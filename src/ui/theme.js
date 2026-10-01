import { useEffect, useState } from 'react';
import { addAuditLog } from '../services/audit.js';

const KEY = 'darkModePreference';

function readPreference() {
    try {
        return localStorage.getItem(KEY) === 'true';
    } catch (e) {
        return false;
    }
}

export function applySavedTheme() {
    document.body.classList.toggle('dark-theme', readPreference());
}

export function useDarkMode() {
    const [isDark, setIsDark] = useState(readPreference);

    useEffect(() => {
        document.body.classList.toggle('dark-theme', isDark);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', isDark ? '#0b0f19' : '#173f3a');
    }, [isDark]);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        try { localStorage.setItem(KEY, String(next)); } catch (e) { /* private mode */ }
        addAuditLog('System Style', `Switched console layout style to ${next ? 'Dark' : 'Light'} Mode.`);
    };

    return [isDark, toggle];
}
