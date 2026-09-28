let bookingCameraStream = null;
let bookingCameraInitialized = false;
let bookingTimeModeInitialized = false;
let bookingFilterYear = new Date().getFullYear();
let bookingFilterMonth = 'all'; // 'all' or 0-11

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Utility function to capitalize all text
function capitalizeAllText(str) {
    if (!str) return str;
    return str.toString().toUpperCase();
}
