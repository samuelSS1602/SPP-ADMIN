import { useState } from 'react';
import { session, useStoreVersion } from '../store/store.js';
import { dataScope } from '../firebase/dataScope.js';
import { setOwnerTestView } from '../services/testMode.js';

// Orange strip on every page while test (sandbox) data is shown, so nobody mistakes it for live.
export default function TestModeBanner() {
    useStoreVersion();
    const [busy, setBusy] = useState(false);
    if (!dataScope.test) return null;

    const backToLive = async () => {
        setBusy(true);
        try {
            await setOwnerTestView(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div role="status" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10,
            padding: '8px 14px', background: 'var(--warning, #d98a06)', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center'
        }}>
            <span>🧪 TEST MODE — practice data only, not the live lodge.</span>
            {session.role === 'owner' && (
                <button type="button" onClick={backToLive} disabled={busy} style={{
                    background: '#fff', color: '#7a4b00', border: 'none', borderRadius: 999, padding: '4px 12px', fontWeight: 800, fontSize: 12, cursor: 'pointer'
                }}>{busy ? 'Switching…' : 'Back to live data'}</button>
            )}
        </div>
    );
}
