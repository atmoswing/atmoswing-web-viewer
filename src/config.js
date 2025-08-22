const config = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
    ENTITIES_SOURCE_EPSG: import.meta.env.ENTITIES_SOURCE_EPSG,
};

export default config;
