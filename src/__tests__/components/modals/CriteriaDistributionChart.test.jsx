import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render} from '@testing-library/react';

import {setupI18nMock} from '../../testUtils.js';
import CriteriaDistributionChart from '@/components/modals/charts/CriteriaDistributionChart.jsx';

setupI18nMock();

function makeSizedRef(width = 700, height = 360) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', {get: () => width});
  Object.defineProperty(div, 'clientHeight', {get: () => height});
  // document.body.appendChild(div); // avoid appending in tests
  return {current: div};
}

describe('CriteriaDistributionChart (smoke)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders without crashing and mounts an SVG when given minimal criteria data', () => {
    const ref = makeSizedRef();
    const criteria = [{value: 2}];

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

  it('falls back to analogValues when criteriaValues empty and builds title with leads and forecast date', () => {
    const ref = makeSizedRef();
    const analogs = [{criteria: 1}, {criteria: 3}, {criteria: 2}];
    const leads = [{lead: 6, date: new Date('2024-02-01')}];

    render(
      <CriteriaDistributionChart
        ref={ref}
        criteriaValues={[]}
        analogValues={analogs}
        selectedMethodId={'m1'}
        selectedConfigId={'c1'}
        selectedLead={6}
        leads={leads}
        activeForecastDate={'2024-02-02'}
        stationName={'Station X'}
        t={(k, opts) => (typeof opts === 'object' && opts.date ? String(opts.date) : k)}
        renderTick={1}
      />
    );

    const svg = ref.current.querySelector('svg');
    expect(svg).toBeTruthy();

    // Title text should include station, method and config and the lead/forecast info
    const txt = svg.textContent || '';
    expect(txt).toContain('Station X');
    expect(txt).toContain('m1');
    expect(txt).toContain('c1');
    // forecastOf translation uses date provided via t, so ensure forecast date string is present
    expect(txt).toContain('2024-02-02');
  });
});
