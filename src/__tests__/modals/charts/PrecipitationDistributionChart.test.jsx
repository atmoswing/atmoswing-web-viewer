import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: {language: 'en'} })
}));

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
});
