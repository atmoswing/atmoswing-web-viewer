import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: {language: 'en'} })
}));

import CriteriaDistributionChart from '@/components/modals/charts/CriteriaDistributionChart.jsx';

function makeSizedRef(width = 700, height = 360) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { get: () => width });
  Object.defineProperty(div, 'clientHeight', { get: () => height });
  // document.body.appendChild(div); // avoid appending in tests
  return { current: div };
}

describe('CriteriaDistributionChart (smoke)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders without crashing and mounts an SVG when given minimal criteria data', () => {
    const ref = makeSizedRef();
    const criteria = [{ value: 2 }];

    render(
      <CriteriaDistributionChart
        ref={ref}
        criteriaValues={criteria}
        analogValues={[]}
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
