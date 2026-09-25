/**
 * @fileoverview Tests for the forecast details window: its three tabs, their status messages and
 * the export formats each tab offers.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

const {details, selectorOptions, exportAnalogsCSV, app, selectorValue, chartProps, TREE} = vi.hoisted(() => ({
  TREE: [
    {id: 'm1', children: [{id: 'c1'}, {id: 'c2'}]},
    {id: 'm2', children: [{id: 'c3'}]}
  ],
  details: {current: null},
  selectorOptions: {current: null},
  exportAnalogsCSV: vi.fn(),
  app: {methodConfig: null, entityId: null, setMethodConfig: null, setEntityId: null},
  chartProps: {current: null},
  selectorValue: {current: null}
}));

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useForecastSession: vi.fn(() => ({workspace: 'ws', activeForecastDate: '2024-01-01'})),
  useMethods: vi.fn(() => ({
    selectedMethodConfig: app.methodConfig,
    methodConfigTree: TREE,
    setSelectedMethodConfig: app.setMethodConfig
  })),
  useSelectedEntity: vi.fn(() => ({selectedEntityId: app.entityId, setSelectedEntityId: app.setEntityId}))
}));

vi.mock('@/components/modals/hooks/useForecastDetailsData.js', () => ({
  useForecastDetailsData: vi.fn(() => details.current)
}));

// The option lists the window loads for the selector. Empty by default, with the relevance known,
// which is the settled state: nothing is being resolved any more.
vi.mock('@/components/modals/hooks/useMethodConfigOptions.js', () => ({
  useMethodConfigOptions: vi.fn(() => selectorOptions.current)
}));
vi.mock('@/components/modals/common/analogRows.js', async (importOriginal) => ({
  ...(await importOriginal()),
  exportAnalogsCSV
}));

// The selector renders its children (the chart options) like the real one does, and records the
// selection it is given.
vi.mock('@/components/modals/common/MethodConfigSelector.jsx', () => ({
  default: ({value, children}) => {
    selectorValue.current = value;
    return <div data-testid="method-config-selector">{children}</div>;
  }
}));
vi.mock('@/components/modals/common/ExportMenu.jsx', () => ({
  default: ({formats}) => (
    <div data-testid="export-menu">
      {formats.map(f => (
        <button key={f.label} disabled={!!f.disabled} onClick={f.onExport}>{`export ${f.label}`}</button>
      ))}
    </div>
  )
}));
vi.mock('@/components/modals/charts/PrecipitationDistributionChart.jsx', () => ({
  default: (props) => {
    chartProps.current = props;
    return <div data-testid="precip-chart"/>;
  }
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
    ...overrides
  };
}

const exportLabels = () => screen.getAllByRole('button', {name: /^export /}).map(b => b.textContent);
const exportDisabled = () => screen.getAllByRole('button', {name: /^export /}).map(b => b.disabled);

/** Option lists with nothing left to resolve: loaded (here, empty) and relevance known. */
function settledOptions(overrides = {}) {
  return {
    methodOptions: [], configsForSelectedMethod: [], stations: [], leads: [],
    methodsLoading: false, stationsLoading: false, leadsLoading: false,
    methodsError: null, stationsError: null, leadsError: null,
    relevance: new Map(), relevantConfigIds: new Map(),
    ...overrides
  };
}

describe('ForecastDetailsModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    details.current = loaded();
    app.methodConfig = null;
    app.entityId = null;
    app.setMethodConfig = vi.fn();
    app.setEntityId = vi.fn();
    selectorOptions.current = settledOptions();
    selectorValue.current = null;
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
    expect(exportAnalogsCSV).toHaveBeenCalledWith(
      ANALOGS,
      expect.stringMatching(/Station_A.*_analogs$/),
      // The table's own column labels, translated.
      ['detailsAnalogsModal.colRank', 'detailsAnalogsModal.colDate',
        'detailsAnalogsModal.colPrecipitation', 'detailsAnalogsModal.colCriteria']
    );
  });

  it('offers no export for a tab with nothing on it', async () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null});
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(exportDisabled()).toEqual([true, true, true]); // the three chart formats
    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.analogs'}));
    expect(exportDisabled()).toEqual([true]); // CSV

    details.current = loaded();
    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.distribution'}));
    expect(exportDisabled()).toEqual([false, false, false]);
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

  it('says it is still working while the option lists load, rather than "no data"', () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null});
    selectorOptions.current = settledOptions({methodsLoading: true});
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('detailsAnalogsModal.loadingAnalogs')).toBeInTheDocument();
    expect(screen.queryByText('distributionPlots.noAnalogs')).not.toBeInTheDocument();
  });

  it('says it is still working until the relevance decides the configuration', () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null});
    selectorOptions.current = settledOptions({relevance: null});
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('detailsAnalogsModal.loadingAnalogs')).toBeInTheDocument();
  });

  it('says when there is nothing to show', async () => {
    details.current = loaded({analogs: [], analogValues: null, criteriaValues: null});
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(screen.getByText('distributionPlots.noAnalogs')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', {name: 'forecastDetails.tab.criteria'}));
    expect(screen.getByText('distributionPlots.noCriteria')).toBeInTheDocument();
  });

  it('opens on the method selected in the app, leaving the configuration to follow the entity', () => {
    app.methodConfig = {method: {id: 'm2'}, config: null};
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(selectorValue.current).toEqual({
      methodId: 'm2', configId: null, configPinned: false, entityId: null, lead: null
    });
  });

  it('keeps a configuration chosen in the app, and the selected entity', () => {
    app.methodConfig = {method: {id: 'm2'}, config: {id: 'c5'}};
    app.entityId = 7;
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    expect(selectorValue.current).toEqual({
      methodId: 'm2', configId: 'c5', configPinned: true, entityId: 7, lead: null
    });
  });

  it('seeds again from the app on every opening', () => {
    app.methodConfig = {method: {id: 'm1'}, config: null};
    const {rerender} = render(<ForecastDetailsModal open={true} onClose={onClose}/>);
    rerender(<ForecastDetailsModal open={false} onClose={onClose}/>);

    app.methodConfig = {method: {id: 'm3'}, config: null};
    rerender(<ForecastDetailsModal open={true} onClose={onClose}/>);
    expect(selectorValue.current.methodId).toBe('m3');
  });

  it('opens on a requested selection, pinning its configuration', () => {
    app.methodConfig = {method: {id: 'm1'}, config: null};
    app.entityId = 7;
    const request = {selection: {methodId: 'm2', configId: 'c3', entityId: 9, lead: 48}};
    render(<ForecastDetailsModal open={true} onClose={onClose} request={request}/>);

    expect(selectorValue.current).toEqual({
      methodId: 'm2', configId: 'c3', configPinned: true, entityId: 9, lead: 48
    });
  });

  it('fills what a request leaves out from the app', () => {
    app.methodConfig = {method: {id: 'm1'}, config: {id: 'c1'}};
    render(<ForecastDetailsModal open={true} onClose={onClose} request={{selection: {entityId: 9, lead: 24}}}/>);

    expect(selectorValue.current).toEqual({
      methodId: 'm1', configId: 'c1', configPinned: true, entityId: 9, lead: 24
    });
  });

  it('does not carry the app configuration over to another requested method', () => {
    app.methodConfig = {method: {id: 'm1'}, config: {id: 'c1'}};
    render(<ForecastDetailsModal open={true} onClose={onClose} request={{selection: {methodId: 'm2', entityId: 9}}}/>);

    expect(selectorValue.current).toMatchObject({methodId: 'm2', configId: null, configPinned: false, entityId: 9});
  });

  it('re-seeds on a new request while open', () => {
    const {rerender} = render(
      <ForecastDetailsModal open={true} onClose={onClose} request={{selection: {methodId: 'm1', entityId: 1, lead: 0}}}/>
    );
    rerender(<ForecastDetailsModal open={true} onClose={onClose} request={{selection: {methodId: 'm1', entityId: 2, lead: 24}}}/>);

    expect(selectorValue.current).toMatchObject({entityId: 2, lead: 24});
  });

  describe('back to the time series', () => {
    const openSeries = async (request) => {
      const user = userEvent.setup();
      render(<ForecastDetailsModal open={true} onClose={onClose} request={request}/>);
      await user.click(screen.getByRole('button', {name: 'forecastDetails.openSeries'}));
    };

    it('shows the series of this entity, leaving the app selection when it already matches', async () => {
      app.methodConfig = {method: TREE[0], config: null};
      await openSeries({selection: {entityId: 9}});

      expect(onClose).toHaveBeenCalled();
      expect(app.setEntityId).toHaveBeenCalledWith(9);
      expect(app.setMethodConfig).not.toHaveBeenCalled();
    });

    it('keeps a configuration the app already pins', async () => {
      app.methodConfig = {method: TREE[0], config: TREE[0].children[1]};
      await openSeries({selection: {entityId: 9}});

      expect(app.setMethodConfig).not.toHaveBeenCalled();
    });

    it('brings another method along, leaving its configuration to follow the entity', async () => {
      app.methodConfig = {method: TREE[0], config: null};
      await openSeries({selection: {methodId: 'm2', entityId: 9}});

      expect(app.setMethodConfig).toHaveBeenCalledWith({method: TREE[1], config: null});
      expect(app.setEntityId).toHaveBeenCalledWith(9);
    });

    it('brings a configuration picked here along', async () => {
      app.methodConfig = {method: TREE[0], config: null};
      await openSeries({selection: {methodId: 'm1', configId: 'c2', entityId: 9}});

      expect(app.setMethodConfig).toHaveBeenCalledWith({method: TREE[0], config: TREE[0].children[1]});
    });

    it('is unavailable until an entity is selected', () => {
      render(<ForecastDetailsModal open={true} onClose={onClose}/>);
      expect(screen.getByRole('button', {name: 'forecastDetails.openSeries'})).toBeDisabled();
    });
  });

  it('hands the chart the same lead list on every render, so it is not redrawn for nothing', async () => {
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);
    const firstLeads = chartProps.current.leads;

    await user.click(screen.getAllByRole('checkbox')[0]);

    expect(chartProps.current.leads).toBe(firstLeads);
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    render(<ForecastDetailsModal open={true} onClose={onClose}/>);

    await user.click(screen.getByLabelText('detailsAnalogsModal.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
