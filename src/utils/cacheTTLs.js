// filepath: d:\Development\atmoswing-web-viewer\src\utils\cacheTTLs.js
// Central TTL presets for cached requests (milliseconds)
// Tune these if backend freshness guarantees change
export const SHORT_TTL = 120000;   // 2 minutes: exploratory/high-churn (analogs, leads)
export const DEFAULT_TTL = 300000; // 5 minutes: typical API data (methods, entities, synthesis)
export const LONG_TTL = 900000;    // 15 minutes: very static data (rarely used yet)

