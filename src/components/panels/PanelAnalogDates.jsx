import Panel from './Panel.jsx';
import * as React from 'react';
import {useMemo} from 'react';
import {DataGrid} from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import {useTranslation} from 'react-i18next';
import {useForecastSession, useMethods} from '@/contexts/ForecastsContext.jsx';
import {getAnalogDates, getAnalogyCriteria} from '@/services/api.js';
import {useSynthesis} from '@/contexts/SynthesisContext.jsx';
import {computeLeadHours} from '@/utils/targetDateUtils.js';
import {formatCriteria, formatDateDDMMYYYY} from '@/utils/formattingUtils.js';
import {normalizeAnalogCriteriaArray, normalizeAnalogDatesArray} from '@/utils/apiNormalization.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';

export default function PanelAnalogDates(props) {
  const {t} = useTranslation();
  const {selectedMethodConfig} = useMethods();
  const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
  const {selectedLead, leadResolution, dailyLeads, subDailyLeads, selectedTargetDate} = useSynthesis();

  const columns = useMemo(() => ([
    {field: 'rank', headerName: t('analog.columns.rank'), flex: 0.12, minWidth: 60},
    {
      field: 'date',
      headerName: t('analog.columns.date'),
      flex: 0.6,
      minWidth: 120,
      sortable: false,
      valueFormatter: (params) => formatDateDDMMYYYY(params.value)
    },
    {
      field: 'criteria',
      headerName: t('analog.columns.criteria'),
      flex: 0.28,
      minWidth: 100,
      valueFormatter: (params) => formatCriteria(params.value)
    },
  ]), [t]);

  const paginationModel = {page: 0, pageSize: 10};

  // Hide panel if no config selected
  const configId = selectedMethodConfig?.config?.id ?? null;
  const methodId = selectedMethodConfig?.method?.id ?? null;

  const leadHours = computeLeadHours(
    forecastBaseDate,
    selectedTargetDate,
    leadResolution,
    selectedLead,
    dailyLeads,
    subDailyLeads
  );

  const enabled = !!configId && !!methodId && !!workspace && !!activeForecastDate;
  const cacheKey = enabled ? `analog_datescrit|${workspace}|${activeForecastDate}|${methodId}|${configId}|${leadHours}` : null;

  const {data: rows, loading} = useCachedRequest(
    cacheKey,
    async () => {
      const [datesResp, criteriaResp] = await Promise.all([
        getAnalogDates(workspace, activeForecastDate, methodId, configId, leadHours),
        getAnalogyCriteria(workspace, activeForecastDate, methodId, configId, leadHours)
      ]);
      const dates = normalizeAnalogDatesArray(datesResp);
      const criteria = normalizeAnalogCriteriaArray(criteriaResp);
      return (dates || []).map((d, idx) => ({
        id: idx + 1,
        rank: idx + 1,
        date: d,
        criteria: (criteria && criteria.length > idx) ? criteria[idx] : null
      }));
    },
    [workspace, activeForecastDate, methodId, configId, leadHours],
    {enabled, initialData: [], ttlMs: SHORT_TTL}
  );

  if (!configId) return null;

  return (
    <Panel title={t('panel.analogDates')} defaultOpen={props.defaultOpen}>
      <Paper sx={{height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0}}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{pagination: {paginationModel}}}
          disableColumnMenu={true}
          rowHeight={30}
          pageSizeOptions={[5, 10]}
          sx={{border: 0, flex: 1, minHeight: 0}}
        />
      </Paper>
    </Panel>
  );
}
