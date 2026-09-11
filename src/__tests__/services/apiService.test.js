import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import * as api from '@/services/api.js';

function mockFetchSequence(responses) {
  global.fetch = vi.fn();
  responses.forEach(r => {
    global.fetch.mockResolvedValueOnce({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: r.statusText || (r.status === 200 ? 'OK' : 'ERR'),
      json: async () => r.jsonData,
      // A real Response always has text() and headers.get(); the provider now reads the body
      // as text so it can report what arrived when it is not JSON.
      text: async () => (r.textData !== undefined ? r.textData : JSON.stringify(r.jsonData ?? null)),
      headers: {
        get: name => (name.toLowerCase() === 'content-type' ? (r.contentType ?? 'application/json') : null),
        forEach: () => {
        }
      },
      clone: () => ({text: async () => JSON.stringify(r.jsonData || {})})
    });
  });
}

function mockFetchOnce(status, jsonData) {
  mockFetchSequence([{status, jsonData}]);
}

describe('api service endpoint builders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('getConfig requests correct endpoint', async () => {
    mockFetchOnce(200, {value: 'ok'});
    const data = await api.getConfig();
    expect(fetch).toHaveBeenCalledWith('/meta/show-config', {cache: 'no-store'});
    expect(data.value).toBe('ok');
  });

  it('getAnalogDates builds path with lead', async () => {
    mockFetchOnce(200, ['2020-01-01']);
    const arr = await api.getAnalogDates('reg', '2020-01-01', 1, 2, 3);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/forecasts/reg/2020-01-01/1/2/3/analog-dates');
    expect(arr[0]).toBe('2020-01-01');
  });

  it('getEntitiesValuesPercentile appends normalize query', async () => {
    mockFetchOnce(200, {a: 1});
    await api.getEntitiesValuesPercentile('r', '2020-01-01', 'm', 'c', 0, 50, true);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('entities-values-percentile/50?normalize=true');
  });

  it('getAnalogValuesPercentiles builds percentiles query', async () => {
    mockFetchOnce(200, {values: []});
    await api.getAnalogValuesPercentiles('r', '2020-01-01', 'm', 'c', 'e', 4, [10, 50, 90]);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('analog-values-percentiles');
    expect(url).toContain('percentiles=10');
    expect(url).toContain('percentiles=90');
  });

  it('getAggregatedEntitiesValues adds normalize query', async () => {
    mockFetchOnce(200, {ok: true});
    await api.getAggregatedEntitiesValues('r', '2020-01-01', 'm', 12, 75, false);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/aggregations/r/2020-01-01/m/12/entities-values-percentile/75');
    expect(url.endsWith('?normalize=false')).toBe(true);
  });

  it('getSynthesisTotal adds normalize query', async () => {
    mockFetchOnce(200, {ok: true});
    await api.getSynthesisTotal('r', '2020-01-01', 90, true);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/aggregations/r/2020-01-01/series-synthesis-total/90');
    expect(url.endsWith('?normalize=true')).toBe(true);
  });

  it('retries up to max on 500 then succeeds', async () => {
    // Provide 2 failing (500) then a success
    mockFetchSequence([
      {status: 500},
      {status: 500},
      {status: 200, jsonData: {done: true}}
    ]);
    const p = api.getConfig();
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(400);
    const data = await p;
    expect(data.done).toBe(true);
    expect(fetch.mock.calls.length).toBe(3);
  });
});

/**
 * Every endpoint builder, with the exact URL it must produce.
 * A path typo here is a silent 404 at runtime, so the URLs are asserted literally.
 */
describe('api service endpoint URLs', () => {
  // Contains a colon, so any missing encodeURIComponent shows up in the expected URL.
  const DATE = '2025-01-01T06:00';
  const ENC = '2025-01-01T06%3A00';

  const cases = [
    ['getConfig', () => api.getConfig(), '/meta/show-config'],
    ['getLastForecastDate', () => api.getLastForecastDate('r'), '/meta/r/last-forecast-date'],
    ['hasForecastDate', () => api.hasForecastDate('r', DATE), `/meta/r/${ENC}/has-forecasts`],
    ['getMethodsAndConfigs', () => api.getMethodsAndConfigs('r', DATE), `/meta/r/${ENC}/methods-and-configs`],
    ['getEntities', () => api.getEntities('r', DATE, 'm', 'c'), `/meta/r/${ENC}/m/c/entities`],
    ['getRelevantEntities', () => api.getRelevantEntities('r', DATE, 'm', 'c'), `/meta/r/${ENC}/m/c/relevant-entities`],

    ['getAnalogDates', () => api.getAnalogDates('r', DATE, 'm', 'c', 24), `/forecasts/r/${ENC}/m/c/24/analog-dates`],
    ['getAnalogyCriteria', () => api.getAnalogyCriteria('r', DATE, 'm', 'c', 24), `/forecasts/r/${ENC}/m/c/24/analogy-criteria`],
    ['getReferenceValues', () => api.getReferenceValues('r', DATE, 'm', 'c', 7), `/forecasts/r/${ENC}/m/c/7/reference-values`],
    ['getSeriesBestAnalogs', () => api.getSeriesBestAnalogs('r', DATE, 'm', 'c', 7), `/forecasts/r/${ENC}/m/c/7/series-values-best-analogs`],
    ['getAnalogs', () => api.getAnalogs('r', DATE, 'm', 'c', 7, 24), `/forecasts/r/${ENC}/m/c/7/24/analogs`],
    ['getAnalogValues', () => api.getAnalogValues('r', DATE, 'm', 'c', 7, 24), `/forecasts/r/${ENC}/m/c/7/24/analog-values`],

    ['getSynthesisPerMethod', () => api.getSynthesisPerMethod('r', DATE, 90), `/aggregations/r/${ENC}/series-synthesis-per-method/90`],
  ];

  it.each(cases)('%s builds the right URL', async (_name, call, expected) => {
    mockFetchOnce(200, {});
    await call();
    expect(fetch).toHaveBeenCalledWith(expected, {cache: 'no-store'});
  });

  it('getSeriesValuesPercentiles appends a repeated percentiles parameter', async () => {
    mockFetchOnce(200, {});
    await api.getSeriesValuesPercentiles('r', DATE, 'm', 'c', 7, [20, 60, 90]);
    expect(fetch).toHaveBeenCalledWith(
      `/forecasts/r/${ENC}/m/c/7/series-values-percentiles?percentiles=20&percentiles=60&percentiles=90`,
      {cache: 'no-store'}
    );
  });

  it('getSeriesValuesPercentiles omits the query when no percentiles are given', async () => {
    mockFetchOnce(200, {});
    await api.getSeriesValuesPercentiles('r', DATE, 'm', 'c', 7, []);
    expect(fetch).toHaveBeenCalledWith(`/forecasts/r/${ENC}/m/c/7/series-values-percentiles`, {cache: 'no-store'});
  });

  it('getSeriesValuesPercentilesHistory defaults to three previous runs', async () => {
    mockFetchOnce(200, {});
    await api.getSeriesValuesPercentilesHistory('r', DATE, 'm', 'c', 7);
    expect(fetch).toHaveBeenCalledWith(
      `/forecasts/r/${ENC}/m/c/7/series-values-percentiles-history?number=3`,
      {cache: 'no-store'}
    );
  });

  it('getSeriesValuesPercentilesHistory honours an explicit count', async () => {
    mockFetchOnce(200, {});
    await api.getSeriesValuesPercentilesHistory('r', DATE, 'm', 'c', 7, 5);
    expect(fetch).toHaveBeenCalledWith(
      `/forecasts/r/${ENC}/m/c/7/series-values-percentiles-history?number=5`,
      {cache: 'no-store'}
    );
  });

  it('getAnalogValuesPercentiles appends the percentiles parameter', async () => {
    mockFetchOnce(200, {});
    await api.getAnalogValuesPercentiles('r', DATE, 'm', 'c', 7, 24, [20, 90]);
    expect(fetch).toHaveBeenCalledWith(
      `/forecasts/r/${ENC}/m/c/7/24/analog-values-percentiles?percentiles=20&percentiles=90`,
      {cache: 'no-store'}
    );
  });

  it('getEntitiesValuesPercentile omits the normalize query when it is null', async () => {
    mockFetchOnce(200, {});
    await api.getEntitiesValuesPercentile('r', DATE, 'm', 'c', 24, 90, null);
    expect(fetch).toHaveBeenCalledWith(
      `/forecasts/r/${ENC}/m/c/24/entities-values-percentile/90`,
      {cache: 'no-store'}
    );
  });

  it('getAggregatedEntitiesValues targets the aggregations route', async () => {
    mockFetchOnce(200, {});
    await api.getAggregatedEntitiesValues('r', DATE, 'm', 24, 90, 10);
    expect(fetch).toHaveBeenCalledWith(
      `/aggregations/r/${ENC}/m/24/entities-values-percentile/90?normalize=10`,
      {cache: 'no-store'}
    );
  });
});

describe('api service response parsing', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('explains an HTML page returned with 200 instead of JSON', async () => {
    // What the SPA fallback serves when a request lands on the viewer's own origin.
    mockFetchSequence([{
      status: 200,
      textData: '<!doctype html><html lang="fr"><head>',
      contentType: 'text/html'
    }]);

    const err = await api.getLastForecastDate('rhone').catch(e => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('/meta/rhone/last-forecast-date');
    expect(err.message).toContain('text/html');
    expect(err.message).toContain('API_BASE_URL');
    expect(err.cause).toBeInstanceOf(SyntaxError);
  });

  it('reports other invalid JSON without the HTML hint', async () => {
    mockFetchSequence([{status: 200, textData: 'not json', contentType: 'text/plain'}]);

    const err = await api.getLastForecastDate('rhone').catch(e => e);

    expect(err.message).toContain('invalid JSON');
    expect(err.message).not.toContain('API_BASE_URL');
  });

  it('does not retry an unparseable body', async () => {
    mockFetchSequence([
      {status: 200, textData: '<html>', contentType: 'text/html'},
      {status: 200, jsonData: {ok: true}}
    ]);

    await api.getLastForecastDate('rhone').catch(() => {
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('still parses a normal JSON body', async () => {
    mockFetchOnce(200, {last_forecast_date: '2025-01-01T06:00'});

    await expect(api.getLastForecastDate('rhone'))
      .resolves.toEqual({last_forecast_date: '2025-01-01T06:00'});
  });
});
