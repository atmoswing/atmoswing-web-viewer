// Utility helpers for lead time calculations and date comparisons
// Centralizes duplicated logic across contexts/components.

export const SUB_HOURS = [0, 6, 12, 18];

/**
 * Compute lead hours given either a base date + target date (preferred) or fallback indices.
 * Applies timezone offset adjustment when both dates are provided to keep consistent hour differences.
 *
 * @param {Date|null} forecastBaseDate
 * @param {Date|null} selectedTargetDate
 * @param {'daily'|'sub'} leadResolution
 * @param {number} selectedLead
 * @param {Array<{time_step:number,date:Date}>} dailyLeads
 * @param {Array<{time_step:number,date:Date}>} subDailyLeads
 * @returns {number} non-negative integer lead hours
 */
export function computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads) {
    let leadHours = 0;
    if (forecastBaseDate instanceof Date && selectedTargetDate instanceof Date && !isNaN(forecastBaseDate) && !isNaN(selectedTargetDate)) {
        leadHours = Math.max(0, Math.round((selectedTargetDate.getTime() - forecastBaseDate.getTime()) / 3600000));
        // Timezone offset difference adjustment (minutes -> hours) to maintain logical hour lead independent of TZ shifts
        const tzDiffMinutes = selectedTargetDate.getTimezoneOffset() - forecastBaseDate.getTimezoneOffset();
        if (tzDiffMinutes) leadHours -= tzDiffMinutes / 60;
        return leadHours;
    }
    // Fallback: derive from arrays & index
    if (leadResolution === 'sub') {
        const step = subDailyLeads?.[selectedLead]?.time_step || subDailyLeads?.[0]?.time_step || 0;
        leadHours = step * selectedLead;
    } else {
        const step = dailyLeads?.[selectedLead]?.time_step || dailyLeads?.[0]?.time_step || 24;
        leadHours = step * selectedLead;
    }
    return leadHours < 0 ? 0 : leadHours;
}

/** Compare two dates on calendar day only. */
export function isSameDay(a, b) {
    if (!(a instanceof Date) || !(b instanceof Date)) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Strict timestamp equality (ms). */
export function isSameInstant(a, b) {
    if (!(a instanceof Date) || !(b instanceof Date)) return false;
    return a.getTime() === b.getTime();
}

/** Determine if target date is present among leads given resolution. */
export function hasTargetDate(leadResolution, selectedTargetDate, dailyLeads, subDailyLeads) {
    if (!selectedTargetDate) return false;
    if (leadResolution === 'sub') {
        return !!subDailyLeads?.find(l => isSameInstant(l.date, selectedTargetDate));
    }
    return !!dailyLeads?.find(l => isSameDay(l.date, selectedTargetDate));
}
