import config from "../config";

const BASE = config.API_BASE_URL;

async function request(endpoint) {
    const res = await fetch(`${BASE}${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return await res.json();
}

// --- Metadata ---
export const getConfig = () => request("/meta/show-config");
export const getLastForecastDate = region => request(`/meta/${region}/last-forecast-date`);
export const getAvailableMethods = (region, date) => request(`/meta/${region}/${date}/methods`);
export const getMethodsAndConfigs = (region, date) => request(`/meta/${region}/${date}/methods-and-configs`);
export const getEntities = (region, date, method, config) => request(`/meta/${region}/${date}/${method}/${config}/entities`);
export const getRelevantEntities = (region, date, method, config) => request(`/meta/${region}/${date}/${method}/${config}/relevant-entities`);

// --- Forecast Data ---
export const getAnalogDates = (region, date, method, config, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${lead}/analog-dates`);
export const getAnalogyCriteria = (region, date, method, config, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${lead}/analogy-criteria`);
export const getEntitiesValuesPercentile = (region, date, method, config, lead, perc) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${lead}/entities-values-percentile/${perc}`);
export const getReferenceValues = (region, date, method, config, entity) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/reference-values`);
export const getSeriesBestAnalogs = (region, date, method, config, entity) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/series-values-best-analogs`);
export const getSeriesValuesPercentiles = (region, date, method, config, entity) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/series-values-percentiles`);
export const getSeriesValuesPercentilesHistory = (region, date, method, config, entity) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/series-values-percentiles-history`);
export const getAnalogs = (region, date, method, config, entity, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/${lead}/analogs`);
export const getAnalogValues = (region, date, method, config, entity, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/${lead}/analog-values`);
export const getAnalogValuesPercentiles = (region, date, method, config, entity, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/${lead}/analog-values-percentiles`);
export const getAnalogValuesBest = (region, date, method, config, entity, lead) =>
    request(`/forecasts/${region}/${date}/${method}/${config}/${entity}/${lead}/analog-values-best`);

// --- Aggregations ---
export const getAggregatedEntitiesValues = (region, date, method, lead, perc) =>
    request(`/aggregations/${region}/${date}/${method}/${lead}/entities-values-percentile/${perc}`);
export const getSynthesisPerMethod = (region, date, perc) =>
    request(`/aggregations/${region}/${date}/series-synthesis-per-method/${perc}`);
export const getSynthesisTotal = (region, date, perc) =>
    request(`/aggregations/${region}/${date}/series-synthesis-total/${perc}`);