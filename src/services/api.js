import config from "../config";

const BASE = config.API_BASE_URL;

// In-flight request de-duplication: endpoint -> Promise
const inflight = new Map();

async function doFetch(fullUrl, endpoint) {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let res;
        let networkError = null;
        try {
            res = await fetch(fullUrl, {cache: 'no-store'});
        } catch (e) {
            networkError = e;
        }
        if (networkError) {
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 200 * (2 ** attempt)));
                continue;
            }
            throw networkError;
        }
        if (!res.ok) {
            const status = res.status;
            if ((status === 500 || status === 502 || status === 503 || status === 504) && attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 200 * (2 ** attempt)));
                continue;
            }
            let snippet = '';
            try {
                snippet = (await res.clone().text()).slice(0, 400);
            } catch {
            }
            if (config.API_DEBUG) {
                console.groupCollapsed(`[API] ERROR ${status} ${endpoint}`);
                console.log('URL:', fullUrl);
                res.headers.forEach((v, k) => console.log('Header:', k, v));
                console.log('Body snippet:', snippet);
                console.groupEnd();
            }
            throw new Error(`API error: ${status} ${res.statusText}`);
        }
        if (config.API_DEBUG) {
            console.groupCollapsed(`[API] 200 ${endpoint}`);
            res.headers.forEach((v, k) => console.log('Header:', k, v));
            console.groupEnd();
        }
        return await res.json();
    }
}

function buildUrl(endpoint) {
    return `${BASE}${endpoint}`;
}

async function request(endpoint) {
    if (inflight.has(endpoint)) return inflight.get(endpoint);
    const p = doFetch(buildUrl(endpoint), endpoint).finally(() => inflight.delete(endpoint));
    inflight.set(endpoint, p);
    return p;
}

// --- Metadata ---
export const getConfig = () => request("/meta/show-config");
export const getLastForecastDate = region => request(`/meta/${region}/last-forecast-date`);
export const getAvailableMethods = (region, date) => request(`/meta/${region}/${date}/methods`);
export const getMethodsAndConfigs = (region, date) => request(`/meta/${region}/${date}/methods-and-configs`);
export const getEntities = (region, date, methodId, configId) => request(`/meta/${region}/${date}/${methodId}/${configId}/entities`);
export const getRelevantEntities = (region, date, methodId, configId) => request(`/meta/${region}/${date}/${methodId}/${configId}/relevant-entities`);

// --- Forecast Data ---
export const getAnalogDates = (region, date, methodId, configId, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${lead}/analog-dates`);
export const getAnalogyCriteria = (region, date, methodId, configId, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${lead}/analogy-criteria`);
export const getEntitiesValuesPercentile = (region, date, methodId, configId, lead, perc, normalize) => {
    const qs = normalize ? `?normalize=${encodeURIComponent(normalize)}` : '';
    return request(`/forecasts/${region}/${date}/${methodId}/${configId}/${lead}/entities-values-percentile/${perc}${qs}`);
};
export const getReferenceValues = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/reference-values`);
export const getSeriesBestAnalogs = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/series-values-best-analogs`);
export const getSeriesValuesPercentiles = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/series-values-percentiles`);
export const getSeriesValuesPercentilesHistory = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/series-values-percentiles-history`);
export const getAnalogs = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/${lead}/analogs`);
export const getAnalogValues = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/${lead}/analog-values`);
export const getAnalogValuesPercentiles = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/${lead}/analog-values-percentiles`);
export const getAnalogValuesBest = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${date}/${methodId}/${configId}/${entity}/${lead}/analog-values-best`);

// --- Aggregations ---
export const getAggregatedEntitiesValues = (region, date, methodId, lead, perc, normalize) => {
    const qs = normalize ? `?normalize=${encodeURIComponent(normalize)}` : '';
    return request(`/aggregations/${region}/${date}/${methodId}/${lead}/entities-values-percentile/${perc}${qs}`);
};
export const getSynthesisPerMethod = (region, date, perc) => request(`/aggregations/${region}/${date}/series-synthesis-per-method/${perc}`);
export const getSynthesisTotal = (region, date, perc) => request(`/aggregations/${region}/${date}/series-synthesis-total/${perc}`);

// --- Workspace Initialization ---
export async function getWorkspaceInitData(region) {
    const date = await getLastForecastDate(region);
    const methodsAndConfigs = await getMethodsAndConfigs(region, date.last_forecast_date);
    return {date, methodsAndConfigs};
}