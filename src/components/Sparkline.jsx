import { useEffect, useRef } from 'react';

function resolveCSSVariable(colorStr) {
    if (!colorStr) return '#2563eb';
    if (!colorStr.includes('var(')) return colorStr;
    const varMatch = colorStr.match(/var\s*\(\s*--([^,)]+)\s*\)/);
    if (!varMatch) return '#2563eb';
    return getComputedStyle(document.documentElement).getPropertyValue('--' + varMatch[1]).trim() || '#2563eb';
}

function hexToRgba(hex, opacity = 1) {
    if (hex.includes('rgba(') || hex.includes('rgb(')) return hex;
    const s = hex.replace('#', '');
    let r; let g; let b;
    if (s.length === 3) {
        r = parseInt(s[0] + s[0], 16); g = parseInt(s[1] + s[1], 16); b = parseInt(s[2] + s[2], 16);
    } else if (s.length === 6) {
        r = parseInt(s.substring(0, 2), 16); g = parseInt(s.substring(2, 4), 16); b = parseInt(s.substring(4, 6), 16);
    } else {
        return `rgba(37, 99, 235, ${opacity})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function draw(canvas, values, color) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, width, height);
    if (values.length < 2) return;

    const resolvedColor = resolveCSSVariable(color);
    ctx.beginPath();
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min;
    const getX = i => (i / (values.length - 1)) * width;
    const getY = v => height - 6 - ((v - min) / range) * (height - 12);

    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) ctx.lineTo(getX(i), getY(values[i]));
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hexToRgba(resolvedColor, 0.12));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Small trend line drawn on a canvas inside a metric card; redrawn on resize
export default function Sparkline({ id, values, color }) {
    const ref = useRef(null);
    const key = values.join(',');

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const render = () => draw(canvas, values, color);
        const frame = requestAnimationFrame(render);
        window.addEventListener('resize', render);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', render);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, color]);

    return <canvas className="metric-sparkline" id={id} ref={ref} />;
}
