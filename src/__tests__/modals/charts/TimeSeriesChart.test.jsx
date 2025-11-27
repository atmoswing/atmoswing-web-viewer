import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts && opts.date ? String(opts.date) : key),
    i18n: {language: 'en'}
  })
}));

import TimeSeriesChart from '@/components/modals/charts/TimeSeriesChart.jsx';

function makeSizedRef(width = 700, height = 360) {
  const div = document.createElement('div');
  // define as getters to avoid read-only in some envs
  Object.defineProperty(div, 'clientWidth', { get: () => width });
  Object.defineProperty(div, 'clientHeight', { get: () => height });
  // Do not append to document.body to avoid consumer cleanup races in test env
  // document.body.appendChild(div);
  return { current: div };
}

describe('TimeSeriesChart (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing and mounts an SVG into the container', () => {
    const ref = makeSizedRef();
    const series = {
      dates: [new Date('2024-01-01'), new Date('2024-01-02'), new Date('2024-01-03')],
      pctList: [20, 50, 60],
      percentiles: { 20: [0.5, 0.6, 0.7], 50: [1, 1.1, 1.2], 60: [1.5, 1.6, 1.7] }
    };

    render(
      <TimeSeriesChart
        containerRef={ref}
        t={(k) => k}
        series={series}
        bestAnalogs={{ items: [{ values: [1,1.1,1.2], label: 'A' }], dates: series.dates }}
        referenceValues={{ axis: [10], values: [2] }}
        pastForecasts={[{ dates: series.dates, percentiles: {20: [0.4,0.5,0.6]}, forecastDate: +new Date('2024-01-01') }]}
        options={{ mainQuantiles: true, previousForecasts: true, bestAnalogs: true, tenYearReturn: true, allReturnPeriods: true }}
        activeForecastDate={'2024-01-02'}
        selectedMethodConfig={{ method: { id: 'm1', name: 'Method 1' } }}
        stationName={'Station Z'}
        onHoverShow={() => {}}
        onHoverHide={() => {}}
      />
    );

    const svg = ref.current.querySelector('svg');
    expect(svg).toBeTruthy();

    const txt = svg.textContent || '';
    expect(txt).toContain('Station Z');
    expect(txt).toContain('Method 1');
    // median label may be present in legend
    expect(txt).toContain('seriesModal.median');

    // There should be path elements for the main quantiles and past forecasts and lines
    const paths = ref.current.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
