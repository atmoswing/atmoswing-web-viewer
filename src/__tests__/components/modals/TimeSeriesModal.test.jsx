/**
 * @fileoverview Tests for TimeSeriesModal: rendering, and handing over to the forecast details
 * window on the lead of a picked date.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

const {app, openForecastDetails, chartProps, seriesData} = vi.hoisted(() => ({
  app: {entityId: 1, setSelectedEntityId: null, methodConfig: null, targetDate: null},
  openForecastDetails: vi.fn(),
  chartProps: {current: null},
  seriesData: {current: null}
}));

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useSelectedEntity: () => ({selectedEntityId: app.entityId, setSelectedEntityId: app.setSelectedEntityId}),
  useEntities: () => ({entities: [{id: 1, name: 'Entity 1'}]}),
  useMethods: () => ({selectedMethodConfig: app.methodConfig}),
  useForecastSession: () => ({
    workspace: 'test',
    activeForecastDate: '2024-01-01T00',
    forecastBaseDate: new Date(2024, 0, 1, 0)
  }),
  useSynthesis: () => ({selectedTargetDate: app.targetDate})
}));

vi.mock('@/contexts/ForecastDetailsContext.jsx', () => ({
  useForecastDetails: () => ({openForecastDetails})
}));

vi.mock('@/components/modals/hooks/useTimeSeriesData.js', () => ({
  useTimeSeriesData: () => ({
    series: seriesData.current,
    referenceValues: null,
    bestAnalogs: null,
    pastForecasts: null,
    loading: false,
    error: null,
    resolvedConfigId: 'c1',
    resolvingConfig: false
  })
}));

vi.mock('@/components/modals/charts/TimeSeriesChart.jsx', () => ({
  default: (props) => {
    chartProps.current = props;
    return <div data-testid="timeseries-chart">Chart</div>;
  }
}));

vi.mock('@/components/modals/common/ExportMenu.jsx', () => ({
  default: () => <button data-testid="export-menu">Export</button>
}));

import TimeSeriesModal from '@/components/modals/TimeSeriesModal.jsx';

const DATES = [new Date(2024, 0, 1), new Date(2024, 0, 2), new Date(2024, 0, 3)];

describe('TimeSeriesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    app.entityId = 1;
    app.setSelectedEntityId = vi.fn();
    app.methodConfig = {method: {id: 'm1'}, config: null};
    app.targetDate = null;
    seriesData.current = {dates: DATES, percentiles: {50: [1, 2, 3]}, pctList: [50]};
    chartProps.current = null;
  });

  it('renders nothing while no entity is selected', () => {
    app.entityId = null;
    render(<TimeSeriesModal/>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the chart and its options for the selected entity', () => {
    render(<TimeSeriesModal/>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('seriesModal.close')).toBeInTheDocument();
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('opens the details on the lead of a date picked in the chart, and closes itself', () => {
    render(<TimeSeriesModal/>);

    chartProps.current.onPickDate(DATES[2]);

    expect(openForecastDetails).toHaveBeenCalledWith({methodId: 'm1', entityId: 1, lead: 48});
    expect(app.setSelectedEntityId).toHaveBeenCalledWith(null);
  });

  it('leaves the configuration to the details window', () => {
    app.methodConfig = {method: {id: 'm1'}, config: {id: 'c9'}};
    render(<TimeSeriesModal/>);

    chartProps.current.onPickDate(DATES[0]);

    expect(openForecastDetails.mock.calls[0][0]).not.toHaveProperty('configId');
  });

  it('opens the details on the date shown on the map from the title bar', async () => {
    app.targetDate = new Date(2024, 0, 2, 5); // nearest series date: 2 January
    const user = userEvent.setup();
    render(<TimeSeriesModal/>);

    await user.click(screen.getByRole('button', {name: 'seriesModal.openDetails'}));

    expect(openForecastDetails).toHaveBeenCalledWith({methodId: 'm1', entityId: 1, lead: 24});
  });

  it('falls back to the first date of the series when the map shows none', async () => {
    const user = userEvent.setup();
    render(<TimeSeriesModal/>);

    await user.click(screen.getByRole('button', {name: 'seriesModal.openDetails'}));

    expect(openForecastDetails).toHaveBeenCalledWith({methodId: 'm1', entityId: 1, lead: 0});
  });

  it('still opens the details, on their default lead, before the series has loaded', async () => {
    seriesData.current = null;
    const user = userEvent.setup();
    render(<TimeSeriesModal/>);

    await user.click(screen.getByRole('button', {name: 'seriesModal.openDetails'}));

    expect(openForecastDetails).toHaveBeenCalledWith({methodId: 'm1', entityId: 1, lead: null});
  });
});
