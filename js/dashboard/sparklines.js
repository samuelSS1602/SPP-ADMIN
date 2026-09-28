
// --- CANVAS-BASED SPARKLINE GRAPHS ---
// Helper function to resolve CSS variables to actual RGB color values
function resolveCSSVariable(colorStr) {
    if (!colorStr) return '#2563eb';
    
    // If it's already a hex or rgb value, return as-is
    if (!colorStr.includes('var(')) {
        return colorStr;
    }
    
    // Extract CSS variable name from 'var(--name)' format
    const varMatch = colorStr.match(/var\s*\(\s*--([^,)]+)\s*\)/);
    if (!varMatch) return '#2563eb';
    
    const varName = '--' + varMatch[1];
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    
    // If we got a value, return it; otherwise return fallback
    return value || '#2563eb';
}

// Helper function to convert hex color to rgba with opacity
function hexToRgba(hex, opacity = 1) {
    // If it's already rgba, just adjust opacity if needed
    if (hex.includes('rgba(') || hex.includes('rgb(')) {
        return hex;
    }
    
    // Handle hex format: #RRGGBB or #RGB
    const sanitized = hex.replace('#', '');
    let r, g, b;
    
    if (sanitized.length === 3) {
        // Expand short form #RGB to #RRGGBB
        r = parseInt(sanitized[0] + sanitized[0], 16);
        g = parseInt(sanitized[1] + sanitized[1], 16);
        b = parseInt(sanitized[2] + sanitized[2], 16);
    } else if (sanitized.length === 6) {
        r = parseInt(sanitized.substring(0, 2), 16);
        g = parseInt(sanitized.substring(2, 4), 16);
        b = parseInt(sanitized.substring(4, 6), 16);
    } else {
        // Fallback to default color if parsing fails
        return `rgba(37, 99, 235, ${opacity})`;
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function drawSparklines() {
    const occupiedCount = data.rooms.filter(r => r.status === 'occupied').length;
    const availableCount = data.rooms.filter(r => r.status === 'available').length;
    
    // Draw Sparklines with mock historical stats + live points
    drawSparkline('sparkRooms', [9, 9, 9, 9, 9, 9, 9], 'var(--secondary)');
    drawSparkline('sparkOccupied', [2, 1, 3, 2, 4, 3, occupiedCount], 'var(--danger)');
    drawSparkline('sparkAvailable', [7, 8, 6, 7, 5, 6, availableCount], 'var(--success)');
    
    // Revenue sparkline (mock trend leading to live revenue value)
    const today = getLocalISODate();
    const revenueToday = data.bookings
        .filter(booking => booking.checkIn === today)
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    drawSparkline('sparkRevenue', [12000, 15000, 8000, 24000, 19000, 22000, revenueToday], 'var(--success)');
    
    // Bookings sparkline
    drawSparkline('sparkBookings', [5, 9, 8, 12, 11, 15, data.bookings.length], 'var(--secondary)');
}

function drawSparkline(canvasId, values, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    if (values.length < 2) return;
    
    // Resolve CSS variables to actual color values
    const resolvedColor = resolveCSSVariable(color);
    
    ctx.beginPath();
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min;
    
    const getX = (index) => (index / (values.length - 1)) * width;
    const getY = (value) => height - 6 - ((value - min) / range) * (height - 12);
    
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
        ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.stroke();
    
    // Draw gradient fill below sparkline
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    
    // Convert hex to rgba with opacity for gradient start
    const rgbaColor = hexToRgba(resolvedColor, 0.12);
    gradient.addColorStop(0, rgbaColor);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
}

// --- ANALYTICS / REPORTS INTERVAL TOGGLES ---
function setChartInterval(interval, btn) {
    document.querySelectorAll('.chart-controls .btn-control').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Redraw with different data ranges if needed
    createRevenueChart();
    addAuditLog('System Reports', `Revenue trend chart updated range to ${interval}.`);
}

