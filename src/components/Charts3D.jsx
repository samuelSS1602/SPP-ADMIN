import { formatNumber } from '../lib/format.js';

// CSS 3D charts for the dashboard (styles in theme/depth3d.css)

/** Revenue bars; the last value is today. `replayKey` restarts the grow animation. */
export function RevenueBars3D({ labels, values, replayKey }) {
    const max = Math.max(1, ...values);
    const lastIndex = values.length - 1;
    return (
        <div className="bars-3d" key={replayKey} role="img"
            aria-label={`Revenue: ${values.map((value, index) => `${labels[index]} ₹${formatNumber(value)}`).join(', ')}`}>
            {values.map((value, index) => (
                <div className="bar-3d-col" key={`${labels[index]}-${index}`}>
                    <div className={`bar-3d ${index === lastIndex ? 'today' : ''}`}
                        style={{ '--h': `${Math.max(2, Math.round((value / max) * 82))}%`, '--i': index }}>
                        <span className="bar-3d-value">₹{formatNumber(value)}</span>
                    </div>
                    <span className="bar-3d-label">{index === lastIndex ? 'Today' : labels[index]}</span>
                </div>
            ))}
        </div>
    );
}

/** Tilted donut. segments: [{ label, value, color }] */
export function OccupancyRing3D({ segments, occupied, total }) {
    const circumference = 2 * Math.PI * 48;
    const sum = segments.reduce((acc, segment) => acc + segment.value, 0) || 1;
    let offset = 0;
    return (
        <div className="ring-3d-box">
            <div className="ring-3d" role="img" aria-label={segments.map(segment => `${segment.label} ${segment.value}`).join(', ')}>
                <svg viewBox="0 0 120 120">
                    <circle className="ring-3d-track" r="48" cx="60" cy="60" />
                    {segments.map(segment => {
                        const length = (segment.value / sum) * circumference;
                        const arc = segment.value > 0 && (
                            <circle key={segment.label} className="ring-3d-seg" r="48" cx="60" cy="60"
                                style={{ '--len': Math.max(0, length - 2.5), '--off': -offset, stroke: segment.color }} />
                        );
                        offset += length;
                        return arc;
                    })}
                </svg>
            </div>
            <div className="ring-3d-center"><b>{occupied}/{total}</b><span>occupied</span></div>
            <div className="ring-3d-legend">
                {segments.map(segment => (
                    <span key={segment.label}><i style={{ background: segment.color }} />{segment.label} {segment.value}</span>
                ))}
            </div>
        </div>
    );
}
