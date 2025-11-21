import config from "../config";
import {appendQuery, buildNormalizeQuery, buildPercentilesQuery} from "./apiHelpers";

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
        // ignore snippet errors
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
  const base = config.API_BASE_URL || '';
  if (!base && config.API_DEBUG) {
    console.warn('[API] Empty API_BASE_URL; requests are relative to current origin');
  }
  return `${base}${endpoint}`;
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
export const hasForecastDate = (region, date) => request(`/meta/${region}/${encodeURIComponent(date)}/has-forecasts`);
export const getAvailableMethods = (region, date) => request(`/meta/${region}/${encodeURIComponent(date)}/methods`);
export const getMethodsAndConfigs = (region, date) => request(`/meta/${region}/${encodeURIComponent(date)}/methods-and-configs`);
export const getEntities = (region, date, methodId, configId) => request(`/meta/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/entities`);
export const getRelevantEntities = (region, date, methodId, configId) => request(`/meta/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/relevant-entities`);

// --- Forecast Data ---

/**
 * Gets analog dates for a specific forecast lead time.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {number} lead - Lead time index
 * @returns {Promise<Array>} Array of analog date strings
 */
export const getAnalogDates = (region, date, methodId, configId, lead) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${lead}/analog-dates`);

/**
 * Retrieves analogy criteria values for a forecast lead time.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {number} lead - Lead time index
 * @returns {Promise<Array>} Array of criteria values
 */
export const getAnalogyCriteria = (region, date, methodId, configId, lead) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${lead}/analogy-criteria`);

/**
 * Gets forecast values at a specific percentile for all entities.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {number} lead - Lead time index
 * @param {number} perc - Percentile value (0-100)
 * @param {boolean} normalize - Whether to normalize values
 * @returns {Promise<Object>} Object mapping entity IDs to values
 */
export const getEntitiesValuesPercentile = (region, date, methodId, configId, lead, perc, normalize) => {
  const path = `/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${lead}/entities-values-percentile/${perc}`;
  return request(appendQuery(path, buildNormalizeQuery(normalize)));
};

/**
 * Fetches reference (climatology) values for an entity.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @returns {Promise<Array>} Array of reference values
 */
export const getReferenceValues = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/reference-values`);

/**
 * Gets time series values for the best analog dates.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @returns {Promise<Object>} Time series data for best analogs
 */
export const getSeriesBestAnalogs = (region, date, methodId, configId, entity) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/series-values-best-analogs`);

/**
 * Retrieves time series values at specified percentiles.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @param {Array<number>} percentiles - Array of percentile values
 * @returns {Promise<Object>} Time series percentile data
 */
export const getSeriesValuesPercentiles = (region, date, methodId, configId, entity, percentiles) => {
  const path = `/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/series-values-percentiles`;
  return request(appendQuery(path, buildPercentilesQuery(percentiles)));
};

/**
 * Gets historical time series percentile values.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @param {number} number - Number of historical forecasts to retrieve (default: 3)
 * @returns {Promise<Object>} Historical time series data
 */
export const getSeriesValuesPercentilesHistory = (region, date, methodId, configId, entity, number = 3) => {
  const qs = number ? `number=${encodeURIComponent(number)}` : '';
  const path = `/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/series-values-percentiles-history`;
  return request(appendQuery(path, qs));
};

/**
 * Fetches analog information for a specific entity and lead time.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @param {number} lead - Lead time index
 * @returns {Promise<Array>} Array of analog objects
 */
export const getAnalogs = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/${lead}/analogs`);

/**
 * Gets precipitation values for analog dates.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @param {number} lead - Lead time index
 * @returns {Promise<Array>} Array of analog precipitation values
 */
export const getAnalogValues = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/${lead}/analog-values`);

/**
 * Retrieves analog values at specified percentiles.
 * @param {string} region - The region/workspace identifier
 * @param {string} date - ISO date string
 * @param {string|number} methodId - Method identifier
 * @param {string|number} configId - Configuration identifier
 * @param {string|number} entity - Entity identifier
 * @param {number} lead - Lead time index
 * @param {Array<number>} percentiles - Array of percentile values
 * @returns {Promise<Object>} Analog values at percentiles
 */
export const getAnalogValuesPercentiles = (region, date, methodId, configId, entity, lead, percentiles) => {
  const path = `/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/${lead}/analog-values-percentiles`;
  return request(appendQuery(path, buildPercentilesQuery(percentiles)));
};
export const getAnalogValuesBest = (region, date, methodId, configId, entity, lead) => request(`/forecasts/${region}/${encodeURIComponent(date)}/${methodId}/${configId}/${entity}/${lead}/analog-values-best`);

// --- Aggregations ---
export const getAggregatedEntitiesValues = (region, date, methodId, lead, perc, normalize) => {
  const path = `/aggregations/${region}/${encodeURIComponent(date)}/${methodId}/${lead}/entities-values-percentile/${perc}`;
  return request(appendQuery(path, buildNormalizeQuery(normalize)));
};
export const getSynthesisPerMethod = (region, date, perc) => request(`/aggregations/${region}/${encodeURIComponent(date)}/series-synthesis-per-method/${perc}`);
export const getSynthesisTotal = (region, date, perc, normalize) => {
  const path = `/aggregations/${region}/${encodeURIComponent(date)}/series-synthesis-total/${perc}`;
  return request(appendQuery(path, buildNormalizeQuery(normalize)));
};
