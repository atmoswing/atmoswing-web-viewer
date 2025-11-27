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
      dates: [new Date('2024-01-01'), new Date('2024-01-02')],
      pctList: [50],
      percentiles: { 50: [1, 2] }
    };

    render(
      <TimeSeriesChart
        containerRef={ref}
        t={(k) => k}
        series={series}
        bestAnalogs={{ items: [] }}
        referenceValues={{ axis: [], values: [] }}
        pastForecasts={[]}
        options={{ mainQuantiles: false, previousForecasts: false, bestAnalogs: false, tenYearReturn: false, allReturnPeriods: false }}
        activeForecastDate={'2024-01-01'}
        selectedMethodConfig={null}
        stationName={''}
        onHoverShow={() => {}}
        onHoverHide={() => {}}
      />
    );

    expect(ref.current.querySelector('svg')).toBeTruthy();

    // rely on testing-library cleanup to remove appended container
  });
});
