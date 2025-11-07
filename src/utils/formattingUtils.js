// Generic formatting helpers

/**
 * Format a Date or date-like value to DD.MM.YYYY (e.g., 05.11.2025).
 * Returns empty string on invalid input.
 * @param {Date|string|number} dateLike
 * @returns {string}
 */
export function formatDateDDMMYYYY(dateLike) {
    if (!dateLike && dateLike !== 0) return '';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (!(d instanceof Date) || isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

