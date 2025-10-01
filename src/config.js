// Base (mutable) configuration object with defaults; overridden at runtime by config.json via ConfigContext.
// This replaces the previous app-config.js + window.__APP_CONFIG__ approach.

function normalizeBase(url) {
    return (url || '').replace(/\/+$/, '');
}

function toBool(v, def = false) {
    if (v === undefined || v === null || v === '') return def;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase();
    return ['1','true','yes','on'].includes(s);
}

const config = {
    API_BASE_URL: '',
    ENTITIES_SOURCE_EPSG: 'EPSG:4326',
    API_DEBUG: false
};

export function normalizeRuntimeConfig(raw = {}) {
    return {
        API_BASE_URL: normalizeBase(raw.API_BASE_URL || ''),
        ENTITIES_SOURCE_EPSG: raw.ENTITIES_SOURCE_EPSG || 'EPSG:4326',
        API_DEBUG: toBool(raw.API_DEBUG, false),
        workspaces: raw.workspaces || []
    };
}

export function updateConfig(partial) {
    Object.assign(config, partial);
}

export default config;
