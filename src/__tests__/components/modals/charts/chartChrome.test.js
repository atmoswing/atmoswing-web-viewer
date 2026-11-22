/**
 * @fileoverview Tests for the chart title builders shared by the modal charts.
 */

import {describe, expect, it} from 'vitest';
import {buildDistributionTitle} from '@/components/modals/charts/draw/chartChrome.js';

const t = (key, opts) => (key === 'toolbar.forecastOf' ? `Forecast of ${opts.date}` : key);
const BASE = {
  stationName: 'Sion', selectedMethodId: 'm1', selectedConfigId: 'c1',
  activeForecastDate: '2025-11-05T00:00:00', t
};

describe('buildDistributionTitle', () => {
  it('shows the target date and the lead time', () => {
    const leads = [{lead: 48, date: new Date(2025, 10, 7)}];
    expect(buildDistributionTitle({...BASE, selectedLead: 48, leads}))
      .toBe('Sion — m1 — c1 — 2025-11-07, +48h (Forecast of 2025-11-05)');
  });

  it('adds the hour to the target date of a sub-daily lead', () => {
    const leads = [{lead: 54, date: new Date(2025, 10, 7, 6)}];
    expect(buildDistributionTitle({...BASE, selectedLead: 54, leads}))
      .toBe('Sion — m1 — c1 — 2025-11-07 06:00, +54h (Forecast of 2025-11-05)');
  });

  it('still shows the lead time when the lead list has no date for it', () => {
    expect(buildDistributionTitle({...BASE, selectedLead: 168, leads: []}))
      .toBe('Sion — m1 — c1 — +168h (Forecast of 2025-11-05)');
  });
});
