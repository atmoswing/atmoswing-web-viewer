/**
 * @module components/modals/ForecastDetailsModal
 * @description Forecast details window for a selected method/config/entity/lead, with three tabs:
 * the precipitation distribution of the analogs, the distribution of their analogy criteria, and
 * the sortable list of the analogs. Each tab exports its own content.
 */

import React, {useEffect, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {Box, Button, CircularProgress, Tab, Tabs, Typography} from '@mui/material';
import {useForecastSession, useMethods, useSelectedEntity} from '@/contexts/forecast/ForecastsContext.jsx';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';
import {useForecastDetailsData} from './hooks/useForecastDetailsData.js';
import ExportMenu from './common/ExportMenu.jsx';
import ModalTitleBar from './common/ModalTitleBar.jsx';
import ChartOptionsGroup from './common/ChartOptionsGroup.jsx';
import AnalogsTable from './common/AnalogsTable.jsx';
import {exportAnalogsCSV} from './common/analogRows.js';
import {useChartOptions} from './hooks/useChartOptions.js';
import {useChartExport} from './hooks/useChartExport.js';
import {formatExportDatePart, safeForFilename} from './common/chartExport.js';
import PrecipitationDistributionChart from './charts/PrecipitationDistributionChart.jsx';
import CriteriaDistributionChart from './charts/CriteriaDistributionChart.jsx';
import MethodConfigSelector from './common/MethodConfigSelector.jsx';

/** Display options offered on the distribution tab, in the order they are listed. */
const DISTRIBUTION_OPTION_KEYS = ['bestAnalogs', 'tenYearReturn', 'allReturnPeriods'];

/** Tabs in display order; the name is used in the tab label key and the export filename. */
const TABS = ['distribution', 'criteria', 'analogs'];
const DISTRIBUTION_TAB = 0;
const CRITERIA_TAB = 1;
const ANALOGS_TAB = 2;

const EMPTY_SELECTION = {methodId: null, configId: null, configPinned: false, entityId: null, lead: null};

/** Stands for "no opening request" when the window is used without one. */
const NO_REQUEST = {selection: null};

/**
 * The selection the window opens on. Each field comes from the requested selection when given,
 * otherwise from the app: its method, its configuration when one is chosen explicitly, and its
 * selected entity. A configuration from either source is pinned (kept as is); whatever is still
 * missing is filled in by the selector, which picks the configuration the entity is relevant to.
 *
 * @private
 * @param {Object|null} requested - Requested selection `{ methodId, configId, entityId, lead }`, all optional
 * @param {Object|null} selectedMethodConfig - The app's method/config selection
 * @param {string|number|null} selectedEntityId - The app's selected entity
 * @returns {Object} Initial selection
 */
function initialSelection(requested, selectedMethodConfig, selectedEntityId) {
  const pick = (key, fallback) => requested?.[key] ?? fallback ?? null;
  const methodId = pick('methodId', selectedMethodConfig?.method?.id);
  // The app's configuration belongs to the app's method; it does not carry over to another one.
  const appConfigId = methodId === selectedMethodConfig?.method?.id ? selectedMethodConfig?.config?.id : null;
  const configId = pick('configId', appConfigId);
  return {
    methodId,
    configId,
    configPinned: configId != null,
    entityId: pick('entityId', selectedEntityId),
    lead: pick('lead', null)
  };
}

/**
 * The app's method/config selection the time series needs to show what this window shows, or
 * null when the app's current one already does.
 *
 * The time series follows the app's selection: its configuration when one is pinned, otherwise
 * the one the entity is relevant to, which is also what an unpinned configuration here is. So the
 * app only changes when this window shows another method, or a configuration picked by hand.
 *
 * @private
 * @param {Object} selection - This window's selection
 * @param {Object|null} selectedMethodConfig - The app's method/config selection
 * @param {Array} methodConfigTree - The app's methods, each with its configurations as `children`
 * @returns {Object|null} `{ method, config }` to select in the app, or null to leave it as is
 */
function appSelectionForSeries(selection, selectedMethodConfig, methodConfigTree) {
  const {methodId, configId, configPinned} = selection;
  const appConfigId = selectedMethodConfig?.config?.id ?? null;
  if (selectedMethodConfig?.method?.id === methodId && (appConfigId === configId || (appConfigId == null && !configPinned))) {
    return null;
  }
  const method = (methodConfigTree || []).find(m => m.id === methodId);
  if (!method) return null;
  const config = configPinned ? (method.children || []).find(c => c.id === configId) ?? null : null;
  return {method, config};
}

/**
 * ForecastDetailsModal component.
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Close callback
 * @param {Object} [props.request] - The opening request `{ selection }`, a new object for each
 *   opening; `selection` (all fields optional) overrides the app's current selection
 * @returns {React.ReactElement}
 */
export default function ForecastDetailsModal({open, onClose, request}) {
  const {activeForecastDate} = useForecastSession();
  const {selectedMethodConfig, methodConfigTree, setSelectedMethodConfig} = useMethods();
  const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
  const {t} = useTranslation();

  // One selection shared by the three tabs, seeded on each opening request (from the request,
  // then the app). Seeding during render rather than in an effect means the selector never sees
  // an empty selection first and races to fill it with its own defaults.
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [seededFor, setSeededFor] = useState(null);
  const currentRequest = request ?? NO_REQUEST;
  if (open && seededFor !== currentRequest) {
    setSeededFor(currentRequest);
    setSelection(initialSelection(currentRequest.selection, selectedMethodConfig, selectedEntityId));
  } else if (!open && seededFor !== null) {
    setSeededFor(null);
  }
  const [tabIndex, setTabIndex] = useState(DISTRIBUTION_TAB);
  const {options, handleOptionChange} = useChartOptions({
    bestAnalogs: false,
    tenYearReturn: true,
    allReturnPeriods: false
  });
  // Bumped to force a chart redraw on window resize.
  const [renderTick, setRenderTick] = useState(0);

  const precipRef = useRef(null);
  const critRef = useRef(null);

  const {
    analogs,
    analogValues,
    analogsLoading,
    analogsError,
    criteriaValues,
    bestAnalogsData,
    percentileMarkers,
    referenceValues,
    stationName
  } = useForecastDetailsData({open, selection, options});

  // Redraw on window resize (debounced).
  useEffect(() => {
    let timer = null;

    function handler() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setRenderTick(t => t + 1), 120);
    }

    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Cleanup on close: the request keys go null with `open`, so only the chart DOM
  // and the local selection need resetting.
  useEffect(() => {
    if (!open) {
      [precipRef, critRef].forEach(ref => {
        try {
          if (ref.current) d3.select(ref.current).selectAll('*').remove();
        } catch { /* container already detached; nothing to clean up */
        }
      });
      setSelection(EMPTY_SELECTION);
    }
  }, [open]);

  const buildExportFilenamePrefix = () => {
    const datePart = formatExportDatePart(activeForecastDate);
    const entityPart = safeForFilename(stationName || 'entity');
    const safeMethod = safeForFilename(selection.methodId || 'method');
    const leadPart = (selection.lead != null) ? `L${selection.lead}` : '';
    const tabPart = TABS[tabIndex];
    return [datePart, entityPart, safeMethod, leadPart, tabPart].filter(Boolean).join('_') || tabPart;
  };

  const findCurrentChartSVG = () => {
    const el = tabIndex === DISTRIBUTION_TAB ? precipRef.current : critRef.current;
    return el ? el.querySelector('svg') : null;
  };

  const {formats: chartFormats} = useChartExport({
    getSVG: findCurrentChartSVG,
    getBaseName: buildExportFilenamePrefix
  });
  const exportFormats = tabIndex === ANALOGS_TAB
    ? [{label: 'CSV', onExport: () => exportAnalogsCSV(analogs, buildExportFilenamePrefix())}]
    : chartFormats;

  const status = {loading: analogsLoading, error: analogsError, t};

  // Back to the time series of this window's entity, bringing the app's method/config along when
  // the series would otherwise show another forecast.
  const openSeries = () => {
    const appSelection = appSelectionForSeries(selection, selectedMethodConfig, methodConfigTree);
    onClose();
    if (appSelection) setSelectedMethodConfig(appSelection);
    setSelectedEntityId(selection.entityId);
  };

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="lg"
            sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '1100px'}}}>
      <ModalTitleBar
        title={t('forecastDetails.title')}
        onClose={onClose}
        closeLabel={t('detailsAnalogsModal.close')}
      >
        <ExportMenu t={t} formats={exportFormats} sx={{marginLeft: 5}}/>
        <Button variant="outlined" size="small" onClick={openSeries} sx={{marginLeft: 1}}
                disabled={selection.entityId == null}>
          {t('forecastDetails.openSeries')}
        </Button>
      </ModalTitleBar>
      <DialogContent dividers>
        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
          <MethodConfigSelector
            open={open}
            value={selection}
            onChange={setSelection}
          >
            {tabIndex === DISTRIBUTION_TAB && (
              <ChartOptionsGroup
                optionKeys={DISTRIBUTION_OPTION_KEYS}
                options={options}
                onOptionChange={handleOptionChange}
              />
            )}
          </MethodConfigSelector>
          <Box sx={{borderLeft: '1px dashed #e0e0e0', pl: 2, minHeight: 360}}>
            <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
              {TABS.map(name => <Tab key={name} label={t(`forecastDetails.tab.${name}`)}/>)}
            </Tabs>
            <TabPanel value={tabIndex} index={DISTRIBUTION_TAB}>
              <DetailsStatus {...status} empty={!analogValues} emptyLabel={t('distributionPlots.noAnalogs')}/>
              <PrecipitationDistributionChart
                ref={precipRef}
                analogValues={analogValues}
                bestAnalogsData={bestAnalogsData}
                percentileMarkers={percentileMarkers}
                referenceValues={referenceValues}
                options={options}
                selectedMethodId={selection.methodId}
                selectedConfigId={selection.configId}
                selectedLead={selection.lead}
                leads={[]}
                activeForecastDate={activeForecastDate}
                stationName={stationName}
                t={t}
                renderTick={renderTick}
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={CRITERIA_TAB}>
              <DetailsStatus {...status} empty={!criteriaValues} emptyLabel={t('distributionPlots.noCriteria')}/>
              <CriteriaDistributionChart
                ref={critRef}
                criteriaValues={criteriaValues}
                analogValues={analogValues}
                selectedMethodId={selection.methodId}
                selectedConfigId={selection.configId}
                selectedLead={selection.lead}
                leads={[]}
                activeForecastDate={activeForecastDate}
                stationName={stationName}
                t={t}
                renderTick={renderTick}
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={ANALOGS_TAB}>
              <DetailsStatus {...status} empty={!analogs.length} emptyLabel={t('distributionPlots.noAnalogs')}/>
              {!analogsLoading && analogs.length > 0 && <AnalogsTable analogs={analogs} t={t}/>}
            </TabPanel>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading, error or empty message shown above a tab's content.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether the analogs are loading
 * @param {Error|null} props.error - Error from the analogs request
 * @param {boolean} props.empty - Whether the tab has nothing to show
 * @param {string} props.emptyLabel - Message shown when the tab is empty
 * @param {Function} props.t - Translation function
 * @returns {React.ReactElement|null}
 */
function DetailsStatus({loading, error, empty, emptyLabel, t}) {
  if (loading) {
    return (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
        <CircularProgress size={20}/>
        <Typography variant="caption">{t('detailsAnalogsModal.loadingAnalogs')}</Typography>
      </Box>
    );
  }
  if (error) {
    return <Typography variant="caption" sx={{color: '#b00020'}}>{t('detailsAnalogsModal.errorLoadingAnalogs')}</Typography>;
  }
  if (empty) {
    return <Typography variant="caption" sx={{color: '#666'}}>{emptyLabel}</Typography>;
  }
  return null;
}

/**
 * Shows its children only while its tab is the active one.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Tab contents
 * @param {number} props.value - Index of the active tab
 * @param {number} props.index - Index of this tab
 * @returns {React.ReactElement}
 */
function TabPanel({children, value, index, ...other}) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{pt: 1, mt: 1}}>{children}</Box>
      )}
    </div>
  );
}
