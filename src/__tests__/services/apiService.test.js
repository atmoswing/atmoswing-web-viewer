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
      headers: {
        forEach: (cb) => {
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
