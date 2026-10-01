import { useState } from 'react';
import { login } from '../services/auth.js';

const STAGE_LABELS = {
    'signing-in': 'Signing In...',
    fetching: 'Fetching Data...'
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [stage, setStage] = useState(null);

    const handleSubmit = async e => {
        e.preventDefault();
        const ok = await login(email, password, setStage);
        if (!ok) setStage(null);
    };

    return (
        <div id="loginPage" className="login-container" role="main">
            <div className="login-wrapper">
                <div className="login-content">
                    <div className="login-header">
                        <img src="/brand-mark.jpeg" alt="Sri Padmavati Pleasants" className="login-logo" width="62" height="61" />
                        <h1>Sri Padmavati Pleasants</h1>
                        <p>Enterprise Management Console</p>
                    </div>
                    <form className="login-form" id="loginForm" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input type="email" id="email" placeholder="Enter your email" required autoComplete="username" inputMode="email"
                                value={email} onChange={e => setEmail(e.target.value)} />
                            <span className="form-icon"><i className="fas fa-envelope" /></span>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" placeholder="Enter your password" required autoComplete="current-password"
                                value={password} onChange={e => setPassword(e.target.value)} />
                            <span className="form-icon"><i className="fas fa-lock" /></span>
                        </div>
                        <button type="submit" className="btn-login" disabled={Boolean(stage)}
                            style={stage ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}>
                            {stage ? <><i className="fas fa-spinner fa-spin" /> {STAGE_LABELS[stage]}</> : 'Sign In'}
                        </button>
                    </form>
                </div>
                <div className="login-side">
                    <div className="side-content">
                        <h2>Sri Padmavati Pleasants</h2>
                        <p>Redesigned enterprise dashboard providing front-desk operations, room controls, real-time sync, and financial analytics.</p>
                        <div className="side-features">
                            {[
                                ['fa-chart-line', 'Enterprise Reports & GST Billing'],
                                ['fa-bed', 'Housekeeping Kanban System'],
                                ['fa-users-cog', 'Staff Management & Rosters'],
                                ['fa-camera', 'Webcam ID & Verification']
                            ].map(([icon, label]) => (
                                <div key={label}>
                                    <i className={`fas ${icon}`} style={{ color: 'var(--warning)', marginRight: 10 }} />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
