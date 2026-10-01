import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live webcam feed with capture. On phones the camera can be flipped so the rear camera
 * can scan ID cards. `onReady` receives a capture() function returning a JPEG data URL (or null).
 */
export default function CameraCapture({ onReady }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [active, setActive] = useState(false);
    const [facingMode, setFacingMode] = useState('user');

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setActive(false);
    }, []);

    const start = useCallback(async (mode = facingMode) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Webcam is not supported in this browser');
            return;
        }
        try {
            stop();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setActive(true);
        } catch (error) {
            alert('Unable to access webcam. Please allow camera permission and try again.');
        }
    }, [facingMode, stop]);

    const flip = () => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        if (active) start(next);
    };

    const capture = useCallback(() => {
        const video = videoRef.current;
        if (!streamRef.current || !video || video.videoWidth === 0) {
            alert('Please start camera first');
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.92);
    }, []);

    useEffect(() => { onReady({ capture, stop }); }, [onReady, capture, stop]);

    // Release the camera when leaving the page or closing the tab
    useEffect(() => {
        window.addEventListener('beforeunload', stop);
        return () => {
            window.removeEventListener('beforeunload', stop);
            stop();
        };
    }, [stop]);

    return (
        <div>
            <div className="camera-live-box" style={{ border: '2px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', position: 'relative' }}>
                <video id="bookingCameraPreview" ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: active ? 'block' : 'none' }} />
                {!active && (
                    <div className="camera-placeholder" id="bookingCameraPlaceholder" style={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                        <i className="fas fa-video-slash" style={{ fontSize: 32, marginBottom: 10 }} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Webcam feed inactive</span>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {!active ? (
                    <button type="button" className="btn-primary" id="startBookingCameraBtn" onClick={() => start()} style={{ flex: 1, background: 'var(--secondary)', justifyContent: 'center' }}>
                        <i className="fas fa-play" /> Start Feed
                    </button>
                ) : (
                    <button type="button" className="btn-primary" id="stopBookingCameraBtn" onClick={stop} style={{ flex: 1, background: 'var(--danger)', justifyContent: 'center', display: 'inline-flex' }}>
                        <i className="fas fa-stop" /> Stop Feed
                    </button>
                )}
                <button type="button" className="btn-primary camera-flip-btn" onClick={flip} title="Switch between front and rear camera" aria-label="Switch camera"
                    style={{ background: 'var(--primary-light)', justifyContent: 'center' }}>
                    <i className="fas fa-camera-rotate" /> <span>{facingMode === 'user' ? 'Front' : 'Rear'}</span>
                </button>
            </div>
        </div>
    );
}
