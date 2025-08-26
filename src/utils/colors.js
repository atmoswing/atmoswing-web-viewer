// Color utilities shared across components
// valueToColor returns an [r,g,b] array based on normalized value scaling (0..maxValue)
export function valueToColor(value, maxValue) {
    if (value == null || isNaN(value)) return [150, 150, 150];
    if (value === 0) return [255, 255, 255];
    const m = maxValue > 0 ? maxValue : 1;
    if (value / m <= 0.5) {
        const baseVal = 200;
        const ratio = value / (0.5 * m); // 0..1
        let valColour = Math.round(ratio * baseVal);
        let valColourCompl = Math.round(ratio * (255 - baseVal));
        if (valColour > baseVal) valColour = baseVal;
        if (valColourCompl + baseVal > 255) valColourCompl = 255 - baseVal;
        return [baseVal + valColourCompl, 255, baseVal - valColour];
    } else {
        let valColour = Math.round(((value - 0.5 * m) / (0.5 * m)) * 255);
        if (valColour > 255) valColour = 255;
        return [255, 255 - valColour, 0];
    }
}

// Convenience helper to get CSS rgb() string
export function valueToColorCSS(value, maxValue) {
    const [r,g,b] = valueToColor(value, maxValue);
    return `rgb(${r},${g},${b})`;
}

