/**
 * @fileoverview Tests for the forecast details window: its three tabs, their status messages and
 * the export formats each tab offers.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

vi.mock('@/contexts/forecast/ForecastSessionContext.jsx', () => ({
  useForecastSession: vi.fn(() => ({workspace: 'ws', activeForecastDate: '2024-01-01'}))
}));

const {details, exportAnalogsCSV} = vi.hoisted(() => ({
  details: {current: null},
  exportAnalogsCSV: vi.fn()
}));

vi.mock('@/components/modals/hooks/useForecastDetailsData.js', () => ({
  useForecastDetailsData: vi.fn(() => details.current)
}));
vi.mock('@/components/modals/common/analogRows.js', async (importOriginal) => ({
  ...(await importOriginal()),
  exportAnalogsCSV
}));

// The selector renders its children (the chart options) like the real one does.
vi.mock('@/components/modals/common/MethodConfigSelector.jsx', () => ({
  default: ({children}) => <div data-testid="method-config-selector">{children}</div>
}));
vi.mock('@/components/modals/common/ExportMenu.jsx', () => ({
  default: ({formats}) => (
    <div data-testid="export-menu">
      {formats.map(f => <button key={f.label} onClick={f.onExport}>{`export ${f.label}`}</button>)}
    </div>
  )
}));
vi.mock('@/components/modals/charts/PrecipitationDistributionChart.jsx', () => ({
  default: () => <div data-testid="precip-chart"/>
}));
vi.mock('@/components/modals/charts/CriteriaDistributionChart.jsx', () => ({
  default: () => <div data-testid="criteria-chart"/>
}));

import ForecastDetailsModal from '@/components/modals/ForecastDetailsModal.jsx';

const ANALOGS = [
  {rank: 1, date: '1990-09-04T00:00:00', value: 0.3, criteria: 50.33},
  {rank: 2, date: '2019-09-03T00:00:00', value: 12.4, criteria: 54.35}
];

function loaded(overrides = {}) {
  return {
    analogs: ANALOGS,
    analogValues: ANALOGS,
    analogsLoading: false,
    analogsError: null,
    criteriaValues: [{index: 1, value: 50.33}, {index: 2, value: 54.35}],
    bestAnalogsData: null,
    percentileMarkers: null,
    referenceValues: null,
    stationName: 'Station A',
    resolvedMethodId: 'm1',
    resolvedConfigId: 'c1',
    resolvedEntityId: 1,
    ...overrides
  };
}

const exportLabels = () => screen.getAllByRole('button', {name: /^export /}).map(b => b.textContent);

describe('ForecastDetailsModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    details.current = loaded();
  });

  it('renders nothing while closed', () => {
    render(<ForecastDetailsModal open={false} onClose={onClose}/>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the distribution tab, with its options', () => {
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('forecastDetails.title')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      'forecastDetails.tab.distribution', 'forecastDetails.tab.criteria', 'forecastDetails.tab.analogs'
    ]);
    expect(screen.getByRole('tab', {selected: true})).toHaveTextContent('forecastDetails.tab.distribution');
    expect(screen.getByTestId('precip-chart')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(exportLabels()).toEqual(['export PNG', 'export SVG', 'export PDF']);
  });

  it('shows the criteria chart, without the distribution options, on the criteria tab', async () => {
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.criteria'}));

    expect(screen.getByTestId('criteria-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('precip-chart')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(exportLabels()).toEqual(['export PNG', 'export SVG', 'export PDF']);
  });

  it('lists the analogs on the analogs tab and exports them as CSV', async () => {
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.analogs'}));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two analogs
    expect(exportLabels()).toEqual(['export CSV']);

    await user.click(screen.getByRole('button', {name: 'export CSV'}));
    expect(exportAnalogsCSV).toHaveBeenCalledWith(ANALOGS, expect.stringMatching(/Station_A.*_analogs$/));
  });

  it('shows the loading message instead of the table while the analogs load', async () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null, analogsLoading: true});
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('detailsAnalogsModal.loadingAnalogs')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.analogs'}));
    expect(screen.getByText('detailsAnalogsModal.loadingAnalogs')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a failed request on every tab', async () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null, analogsError: new Error('x')});
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    for (const name of ['distribution', 'criteria', 'analogs']) {
      await user.click(screen.getByRole('tab', {name: `forecastDetails.tab.${name}`}));
      expect(screen.getByText('detailsAnalogsModal.errorLoadingAnalogs')).toBeInTheDocument();
    }
  });

  it('says when there is nothing to show', async () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null});
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('distributionPlots.noAnalogs')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.criteria'}));
    expect(screen.getByText('distributionPlots.noCriteria')).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    await user.click(screen.getByLabelText('detailsAnalogsModal.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
