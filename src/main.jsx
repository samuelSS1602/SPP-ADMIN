import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Existing design system, in the original cascade order
import './styles/legacy/base/variables.css';
import './styles/legacy/base/reset.css';
import './styles/legacy/pages/login.css';
import './styles/legacy/layout/sidebar.css';
import './styles/legacy/layout/header.css';
import './styles/legacy/components/cards.css';
import './styles/legacy/pages/rooms.css';
import './styles/legacy/components/tables-buttons.css';
import './styles/legacy/components/modals.css';
import './styles/legacy/components/kanban.css';
import './styles/legacy/pages/settings.css';
import './styles/legacy/components/dropdowns-toasts.css';
import './styles/legacy/base/roles.css';
import './styles/legacy/responsive/base-responsive.css';
import './styles/legacy/components/widgets.css';
import './styles/legacy/pages/bookings.css';
import './styles/legacy/pages/new-booking.css';
import './styles/legacy/components/sections-diary-forms.css';
import './styles/legacy/pages/payments.css';
import './styles/legacy/responsive/final-tuning.css';
import './styles/legacy/pages/gst-print.css';
import './styles/legacy/theme/premium.css';
import './styles/legacy/theme/motion.css';
// Touch/phone layer added with the React version
import './styles/mobile.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
