import Panel from './Panel';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { useTranslation } from 'react-i18next';
import { useMethods } from '../contexts/ForecastsContext.jsx';
import { useForecastSession } from '../contexts/ForecastsContext.jsx';
import { useEffect, useState } from 'react';
import { getAnalogDates, getAnalogyCriteria } from '../services/api.js';

export default function PanelAnalogDates(props) {
    const { t } = useTranslation();
    const { selectedMethodConfig } = useMethods();
    const { workspace, activeForecastDate } = useForecastSession();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const columns = [
        { field: 'rank', headerName: t('analog.columns.rank'), flex: 0.12, minWidth: 60 },
        { field: 'date', headerName: t('analog.columns.date'), flex: 0.6, minWidth: 120, sortable: false },
        { field: 'criteria', headerName: t('analog.columns.criteria'), flex: 0.28, minWidth: 100 },
    ];

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
            setLoading(true);
            try {
                // Fetch analog dates (array of ISO strings) and criteria (parallel)
                const [datesResp, criteriaResp] = await Promise.allSettled([
                    getAnalogDates(workspace, activeForecastDate, methodId, configId, 0),
                    getAnalogyCriteria(workspace, activeForecastDate, methodId, configId, 0)
                ]);

                if (cancelled) return;

                // Normalize dates
                const dates = (datesResp.status === 'fulfilled') ? (function(){
                    const dr = datesResp.value;
                    if (!dr) return [];
                    if (Array.isArray(dr)) return dr;
                    if (Array.isArray(dr.analog_dates)) return dr.analog_dates;
                    if (Array.isArray(dr.series_values?.target_dates)) return dr.series_values.target_dates;
                    return [];
                })() : [];

                // Normalize criteria
                const criteria = (criteriaResp.status === 'fulfilled') ? (function(){
                    const cr = criteriaResp.value;
                    if (!cr) return [];
                    if (Array.isArray(cr)) return cr;
                    if (Array.isArray(cr.criteria)) return cr.criteria;
                    if (Array.isArray(cr.analog_criteria)) return cr.analog_criteria;
                    if (Array.isArray(cr.analogs) && cr.analogs.length && cr.analogs[0] && cr.analogs[0].criteria != null) return cr.analogs.map(a => a.criteria);
                    return [];
                })() : [];

                // Helper: format ISO date -> DD.MM.YYYY
                const formatIsoToDDMMYYYY = (s) => {
                    if (!s) return '';
                    try {
                        const D = new Date(s);
                        if (isNaN(D)) return String(s);
                        const dd = String(D.getDate()).padStart(2, '0');
                        const mm = String(D.getMonth() + 1).padStart(2, '0');
                        const yyyy = D.getFullYear();
                        return `${dd}.${mm}.${yyyy}`;
                    } catch (e) {
                        return String(s);
                    }
                };

                // Build rows: rank = index+1, pre-format date to DD.MM.YYYY, criteria from matching index when available
                const mapped = (dates || []).map((d, idx) => ({
                    id: idx + 1,
                    rank: idx + 1,
                    date: formatIsoToDDMMYYYY(d),
                    criteria: (criteria && criteria.length > idx) ? criteria[idx] : null
                }));

                setRows(mapped);
            } catch (e) {
                setRows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [configId, methodId, workspace, activeForecastDate]);

    // Don't render the panel at all if there's no selected configuration
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