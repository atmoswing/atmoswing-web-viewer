import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';

import { setupI18nMock } from '../../testUtils.js';
setupI18nMock();

import PrecipitationDistributionChart from '@/components/modals/charts/PrecipitationDistributionChart.jsx';

function makeSizedRef(width = 700, height = 360) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { get: () => width });
  Object.defineProperty(div, 'clientHeight', { get: () => height });
  // document.body.appendChild(div); // avoid appending in tests
  return { current: div };
}

describe('PrecipitationDistributionChart (smoke)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders without crashing and mounts an SVG when given minimal analog data', () => {
    const ref = makeSizedRef();
    const analogs = [{ value: 1 }];

    render(
      <PrecipitationDistributionChart
        ref={ref}
        analogValues={analogs}
        bestAnalogsData={[]}
        percentileMarkers={{}}
        referenceValues={{ axis: [], values: [] }}
        options={{ tenYearReturn: false, allReturnPeriods: false, bestAnalogs: false }}
        selectedMethodId={null}
        selectedConfigId={null}
        selectedLead={null}
        leads={[]}
        activeForecastDate={'2024-01-01'}
        stationName={''}
        t={(k) => k}
        renderTick={0}
      />
    );

    expect(ref.current.querySelector('svg')).toBeTruthy();

    // rely on testing-library cleanup to remove appended container
  });

  it('renders percentile markers and reference overlays and bestAnalogs overlay', () => {
    const ref = makeSizedRef();
    const analogs = [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }];
    const best = [{ value: 2 }, { value: 3 }];
    const referenceValues = { axis: [10, 20, 50], values: [0.5, 1.5, 2.5] };

    render(
      <PrecipitationDistributionChart
        ref={ref}
        analogValues={analogs}
        bestAnalogsData={best}
        percentileMarkers={{20: 1, 60: 2, 90: 3}}
        referenceValues={referenceValues}
        options={{ tenYearReturn: true, allReturnPeriods: true, bestAnalogs: true }}
        selectedMethodId={'m1'}
        selectedConfigId={'c1'}
        selectedLead={null}
        leads={[]}
        activeForecastDate={'2024-03-03'}
        stationName={'Station Y'}
        t={(k) => k}
        renderTick={2}
      />
    );

    const svg = ref.current.querySelector('svg');
    expect(svg).toBeTruthy();

    // Should contain percentile marker labels like 'q20' and 'q60'
    const txt = svg.textContent || '';
    expect(txt).toContain('q20');
    expect(txt).toContain('q60');
    // Should contain P10 label (tenYearReturn) when axis contains 10
    expect(txt).toContain('P10');
    // Should contain station name
    expect(txt).toContain('Station Y');
  });
});
