import { useRef, useState } from 'react';
import { data } from '../store/store.js';
import { usePersistentState } from '../ui/UIContext.jsx';
import { exportFullSystemBackup, importSystemBackup, saveLodgeSettings, savePricingSettings } from '../services/settings.js';

const PANELS = [
    ['settingsLodge', 'Lodge Profile'],
    ['settingsPricing', 'Pricing & Tax Rules'],
    ['settingsPermissions', 'User Permissions'],
    ['settingsBackups', 'System Backup & Restore']
];

function LodgeProfileForm() {
    const s = data.settings || {};
    const [form, setForm] = useState({
        lodgeName: s.lodgeName || 'Sri Padmavati Pleasants',
        address: s.address || 'Palani, Tamil Nadu - 624601',
        phone: s.phone || '6369216621',
        gstNumber: s.gstNumber || '33ANCPP8116B1ZF'
    });
    const bind = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

    const submit = e => {
        e.preventDefault();
        saveLodgeSettings({
            lodgeName: form.lodgeName.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
            gstNumber: form.gstNumber.trim()
        });
    };

    return (
        <form id="settingsLodgeForm" onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="setLodgeName">Lodge / Hotel Name *</label>
                <input type="text" id="setLodgeName" required {...bind('lodgeName')} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="setLodgeAddress">Address Details</label>
                <textarea id="setLodgeAddress" placeholder="Lodge Address" {...bind('address')} />
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                    <label htmlFor="setLodgePhone">Support Phone number</label>
                    <input type="tel" id="setLodgePhone" inputMode="tel" {...bind('phone')} />
                </div>
                <div className="form-group">
                    <label htmlFor="setLodgeGst">Hotel GSTIN *</label>
                    <input type="text" id="setLodgeGst" required {...bind('gstNumber')} />
                </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>Save Profile Settings</button>
        </form>
    );
}

function PricingTaxForm() {
    const s = data.settings || {};
    const [form, setForm] = useState({
        cgst: String(s.taxes ? s.taxes.cgst : 2.5),
        sgst: String(s.taxes ? s.taxes.sgst : 2.5),
        defaultAdvance: String(s.defaultAdvance || 1000)
    });
    const bind = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

    const submit = e => {
        e.preventDefault();
        savePricingSettings({
            cgst: parseFloat(form.cgst || '2.5'),
            sgst: parseFloat(form.sgst || '2.5'),
            defaultAdvance: parseFloat(form.defaultAdvance || '1000')
        });
    };

    return (
        <form id="settingsPricingForm" onSubmit={submit}>
            <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                    <label htmlFor="setCGSTRate">CGST Rate Percentage (%)</label>
                    <input type="number" step="0.01" id="setCGSTRate" inputMode="decimal" {...bind('cgst')} />
                </div>
                <div className="form-group">
                    <label htmlFor="setSGSTRate">SGST Rate Percentage (%)</label>
                    <input type="number" step="0.01" id="setSGSTRate" inputMode="decimal" {...bind('sgst')} />
                </div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label htmlFor="setDefaultAdvance">Default Room Advance Tariff (₹)</label>
                <input type="number" id="setDefaultAdvance" inputMode="numeric" {...bind('defaultAdvance')} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>Save Pricing Configurations</button>
        </form>
    );
}

export default function SettingsPage() {
    const [panel, setPanel] = usePersistentState('settings.panel', 'settingsLodge');
    const fileRef = useRef(null);

    return (
        <div id="settings-tab" className="page-content active">
            <div className="page-header">
                <h2>Console System Settings</h2>
            </div>
            <div className="settings-container">
                <nav className="settings-nav">
                    {PANELS.map(([id, label]) => (
                        <button key={id} type="button" className={`settings-nav-item ${panel === id ? 'active' : ''}`} onClick={() => setPanel(id)}>{label}</button>
                    ))}
                </nav>
                <div className="settings-content">
                    {panel === 'settingsLodge' && (
                        <div id="settingsLodge" className="settings-panel active">
                            <h3>Lodge General Information</h3>
                            <LodgeProfileForm />
                        </div>
                    )}
                    {panel === 'settingsPricing' && (
                        <div id="settingsPricing" className="settings-panel active">
                            <h3>Pricing Configuration</h3>
                            <PricingTaxForm />
                        </div>
                    )}
                    {panel === 'settingsPermissions' && (
                        <div id="settingsPermissions" className="settings-panel active">
                            <h3>User Roles &amp; Permissions (Mock)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                <div style={{ padding: 10, background: 'var(--surface-muted)', borderRadius: 6 }}>
                                    <strong>👑 Owner Account (sppowner@gmail.com)</strong>
                                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Unrestricted console capabilities: delete records, modify pricing, audit logs, financials, analytics access.</p>
                                </div>
                                <div style={{ padding: 10, background: 'var(--surface-muted)', borderRadius: 6 }}>
                                    <strong>🛎️ Receptionist Account (Default)</strong>
                                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Restricted capabilities: cannot delete bookings, cannot view revenue totals, cannot edit base pricing variables.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {panel === 'settingsBackups' && (
                        <div id="settingsBackups" className="settings-panel active">
                            <h3>System Caching &amp; Recovery</h3>
                            <div className="pricing-info" style={{ marginBottom: 20 }}>
                                <p>Your database caches local copies in browser memory. In addition, if Firebase is connected, bookings automatically synchronize with the cloud database.</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button type="button" className="btn-primary" onClick={exportFullSystemBackup}><i className="fas fa-file-export" /> Download Backup JSON</button>
                                <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} style={{ background: 'var(--warning)' }}><i className="fas fa-file-import" /> Upload Backup JSON</button>
                                <input ref={fileRef} type="file" id="backupFileInput" accept="application/json,.json" style={{ display: 'none' }}
                                    onChange={e => { importSystemBackup(e.target.files[0]); e.target.value = ''; }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
