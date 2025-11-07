import Panel from './Panel.jsx';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { useTranslation } from 'react-i18next';
import { useMethods } from '../../contexts/ForecastsContext.jsx';
import { useForecastSession } from '../../contexts/ForecastsContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { getAnalogDates, getAnalogyCriteria } from '../../services/api.js';
import { useSynthesis } from '../../contexts/SynthesisContext.jsx';
import { computeLeadHours } from '../../utils/targetDateUtils.js';
import { formatCriteria, formatDateDDMMYYYY } from '../../utils/formattingUtils.js';

export default function PanelAnalogDates(props) {
    const { t } = useTranslation();
    const { selectedMethodConfig } = useMethods();
    const { workspace, activeForecastDate, forecastBaseDate } = useForecastSession();
    const { selectedLead, leadResolution, dailyLeads, subDailyLeads, selectedTargetDate } = useSynthesis();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const columns = useMemo(() => ([
        { field: 'rank', headerName: t('analog.columns.rank'), flex: 0.12, minWidth: 60 },
        { field: 'date', headerName: t('analog.columns.date'), flex: 0.6, minWidth: 120, sortable: false, valueFormatter: (params) => formatDateDDMMYYYY(params.value) },
        { field: 'criteria', headerName: t('analog.columns.criteria'), flex: 0.28, minWidth: 100, valueFormatter: (params) => formatCriteria(params.value) },
    ]), [t]);

    const paginationModel = { page: 0, pageSize: 10 };

    // Hide panel if no config selected
    const configId = selectedMethodConfig?.config?.id ?? null;
    const methodId = selectedMethodConfig?.method?.id ?? null;

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!configId || !methodId || !workspace || !activeForecastDate) {
                setRows([]);
                return;
            }
            const leadHours = computeLeadHours(
                forecastBaseDate,
                selectedTargetDate,
                leadResolution,
                selectedLead,
                dailyLeads,
                subDailyLeads
            );
            setLoading(true);
            try {
                const [datesResp, criteriaResp] = await Promise.allSettled([
                    getAnalogDates(workspace, activeForecastDate, methodId, configId, leadHours),
                    getAnalogyCriteria(workspace, activeForecastDate, methodId, configId, leadHours)
                ]);

                if (cancelled) return;

                const dates = (datesResp.status === 'fulfilled') ? (function(){
                    const dr = datesResp.value;
                    if (!dr) return [];
                    if (Array.isArray(dr)) return dr;
                    if (Array.isArray(dr.analog_dates)) return dr.analog_dates;
                    if (Array.isArray(dr.series_values?.target_dates)) return dr.series_values.target_dates;
                    return [];
                })() : [];

                const criteria = (criteriaResp.status === 'fulfilled') ? (function(){
                    const cr = criteriaResp.value;
                    if (!cr) return [];
                    if (Array.isArray(cr)) return cr;
                    if (Array.isArray(cr.criteria)) return cr.criteria;
                    if (Array.isArray(cr.analog_criteria)) return cr.analog_criteria;
                    if (Array.isArray(cr.analogs) && cr.analogs.length && cr.analogs[0] && cr.analogs[0].criteria != null) return cr.analogs.map(a => a.criteria);
                    return [];
                })() : [];

                const mapped = (dates || []).map((d, idx) => ({
                    id: idx + 1,
                    rank: idx + 1,
                    date: d,
                    criteria: (criteria && criteria.length > idx) ? criteria[idx] : null
                }));

                setRows(mapped);
            } catch {
                setRows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [configId, methodId, workspace, activeForecastDate, forecastBaseDate, selectedTargetDate, selectedLead, leadResolution, dailyLeads, subDailyLeads]);

    if (!configId) return null;

    return (
        <Panel title={t('panel.analogDates')} defaultOpen={props.defaultOpen}>
            <Paper sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    initialState={{ pagination: { paginationModel } }}
                    disableColumnMenu={true}
                    rowHeight={30}
                    pageSizeOptions={[5, 10]}
                    sx={{ border: 0, flex: 1, minHeight: 0 }}
                />
            </Paper>
        </Panel>
    );
}