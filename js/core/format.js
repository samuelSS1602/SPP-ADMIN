
    // Formatters are expensive to construct, so build them once and reuse them for every call
    const INR_NUMBER_FORMAT = new Intl.NumberFormat('en-IN');
    const DISPLAY_DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    function formatNumber(num) {
        return INR_NUMBER_FORMAT.format(num);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        // toLocaleDateString returned "Invalid Date" here; Intl.DateTimeFormat would throw instead
        if (Number.isNaN(date.getTime())) return 'Invalid Date';
        return DISPLAY_DATE_FORMAT.format(date);
    }

    function formatDateTime(dateString, timeString) {
        const datePart = formatDate(dateString);
        const timePart = timeString || 'N/A';
        return `${datePart}, ${timePart}`;
    }

    function toDisplayTime(timeValue) {
        if (!timeValue) return 'N/A';

        const [hoursText, minutes] = timeValue.split(':');
        let hours = parseInt(hoursText, 10);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${suffix}`;
    }


function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
