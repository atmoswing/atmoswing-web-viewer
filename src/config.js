function normalizeBase(url) {
    return (url || '').replace(/\/+$/,'');
}

const config = {
    API_BASE_URL: normalizeBase(import.meta.env.VITE_API_BASE_URL),
    ENTITIES_SOURCE_EPSG: import.meta.env.ENTITIES_SOURCE_EPSG,
    API_DEBUG: (import.meta.env.VITE_API_DEBUG === '1' || import.meta.env.VITE_API_DEBUG === 'true')
};

export default config;
