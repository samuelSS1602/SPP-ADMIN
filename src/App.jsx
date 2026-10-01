import { useEffect } from 'react';
import { session, useStoreVersion } from './store/store.js';
import { bootstrapApp } from './services/auth.js';
import { applySavedTheme } from './ui/theme.js';
import { UIProvider } from './ui/UIContext.jsx';
import Toasts from './components/Toasts.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Shell from './components/Shell.jsx';

bootstrapApp();
applySavedTheme();

export default function App() {
    useStoreVersion();
    const isOwner = session.loggedIn && session.role === 'owner';

    // Role-based visibility uses the existing .owner-only / .receptionist-only CSS
    useEffect(() => {
        document.body.classList.toggle('owner-view', isOwner);
    }, [isOwner]);

    return (
        // Re-keyed on login/logout so open modals and filters never carry over to the next user
        <UIProvider key={session.loggedIn ? 'in' : 'out'}>
            {session.loggedIn ? <Shell /> : <LoginPage />}
            <Toasts />
        </UIProvider>
    );
}
