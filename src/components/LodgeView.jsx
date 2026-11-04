import { Component, lazy, Suspense, useMemo } from 'react';
import { data } from '../store/store.js';

// three.js is downloaded the first time a 3D view is shown, not with the rest of the app
const Lodge3D = lazy(() => import('./Lodge3D.jsx'));

const Message = ({ icon, children }) => <div className="lodge-3d-msg"><i className={`fas ${icon}`} /> {children}</div>;

// A failed download (offline, new deploy) shows a note instead of breaking the page
class LodgeErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.warn('3D lodge view could not load:', error);
    }

    render() {
        return this.state.failed ? <Message icon="fa-cube">3D view could not load. Check the internet connection.</Message> : this.props.children;
    }
}

/** 3D model of the lodge built from the current rooms. Props are passed on to Lodge3D. */
export default function LodgeView({ className = '', ...props }) {
    const roomsKey = data.rooms.map(room => `${room.id}:${room.name}:${room.floor}:${room.status}`).join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const rooms = useMemo(() => data.rooms.map(({ id, name, floor, status }) => ({ id, name, floor, status })), [roomsKey]);

    return (
        <div className={`lodge-3d ${className}`.trim()}>
            <LodgeErrorBoundary>
                <Suspense fallback={<Message icon="fa-cube fa-spin">Loading 3D lodge…</Message>}>
                    <Lodge3D rooms={rooms} {...props} />
                </Suspense>
            </LodgeErrorBoundary>
        </div>
    );
}
