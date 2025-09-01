// Date parsing/formatting helpers extracted from ForecastsContext
export function parseForecastDate(str) {
    if (!str) return null;
    const mHourOnly = str?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
    if (mHourOnly) {
        const [, y, mo, d, h] = mHourOnly;
        const dt = new Date(+y, +mo - 1, +d, +h, 0, 0);
        if (!isNaN(dt)) return dt;
    }
    let dt = new Date(str);
    if (!isNaN(dt)) return dt;
    if (/^\d{4}-\d{2}-\d{2}[ _]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
        dt = new Date(str.replace(/[ _]/, 'T') + (str.length === 16 ? ':00' : '') + 'Z');
        if (!isNaN(dt)) return dt;
    }
    if (/^\d{10}(\d{2})?$/.test(str)) {
        const year = str.slice(0, 4), mo = str.slice(4, 6), d = str.slice(6, 8), h = str.slice(8, 10),
            mi = str.length >= 12 ? str.slice(10, 12) : '00';
        dt = new Date(`${year}-${mo}-${d}T${h}:${mi}:00Z`);
        if (!isNaN(dt)) return dt;
    }
    return null;
}

export function formatForecastDateForApi(dateObj, reference) {
    if (!dateObj || isNaN(dateObj)) return null;
    const pad = n => String(n).padStart(2, '0');
    if (reference && /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(reference)) {
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(reference || '')) {
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:00`;
    }
    if (!reference) return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    return dateObj.toISOString();
}

