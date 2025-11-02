import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    ListItemText
} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {useForecastSession} from '../contexts/ForecastSessionContext.jsx';
import {
    getMethodsAndConfigs,
    getEntities,
    getRelevantEntities,
    getAnalogs,
    getSeriesValuesPercentiles
} from '../services/api.js';
import {useTranslation} from 'react-i18next';

export default function AnalogsModal({open, onClose}) {
    const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
    const {t} = useTranslation();

    const [methodsLoading, setMethodsLoading] = useState(false);
    const [methodsError, setMethodsError] = useState(null);
    const [methodsData, setMethodsData] = useState(null);

    // Local selections (do NOT touch global contexts)
    const [selectedMethodId, setSelectedMethodId] = useState(null);
    const [selectedConfigId, setSelectedConfigId] = useState(null);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [selectedLead, setSelectedLead] = useState(0);

    // Entities for the currently selected method/config
    const [stations, setStations] = useState([]);
    const [stationsLoading, setStationsLoading] = useState(false);
    const [analogs, setAnalogs] = useState(null);
    const [analogsLoading, setAnalogsLoading] = useState(false);
    const [analogsError, setAnalogsError] = useState(null);
    const [leads, setLeads] = useState([]);
    const [leadsLoading, setLeadsLoading] = useState(false);

    // Relevant config highlighting: configId -> boolean
    const relevantRef = useRef(new Map());
    const [, setRelevantMapVersion] = useState(0); // bump to re-render when relevance updated

    const methodsReqRef = useRef(0);
    const stationsReqRef = useRef(0);
    const relevanceReqRef = useRef(0);

    // Load methods & configs when modal opens (or workspace/date changes)
    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!open) return;
            if (!workspace || !activeForecastDate) return;
            const reqId = ++methodsReqRef.current;
            setMethodsLoading(true);
            setMethodsError(null);
            try {
                const data = await getMethodsAndConfigs(workspace, activeForecastDate);
                if (cancelled || reqId !== methodsReqRef.current) return;
                setMethodsData(data);
                // default select to first method and its first config
                const first = (data?.methods && data.methods[0]) ? data.methods[0] : null;
                setSelectedMethodId(first ? first.id : null);
                const firstCfg = first && first.configurations && first.configurations[0] ? first.configurations[0].id : null;
                setSelectedConfigId(firstCfg);
            } catch (e) {
                if (!cancelled && reqId === methodsReqRef.current) setMethodsError(e);
            } finally {
                if (!cancelled && reqId === methodsReqRef.current) setMethodsLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [open, workspace, activeForecastDate]);

    // If user picks a method but no explicit config, default to the first config of that method
    useEffect(() => {
        if (!methodsData || !selectedMethodId) return;
        const methodNode = methodsData.methods.find(m => m.id === selectedMethodId);
        if (!methodNode) return;
        const firstCfg = methodNode.configurations && methodNode.configurations[0] ? methodNode.configurations[0].id : null;
        if (!selectedConfigId && firstCfg) setSelectedConfigId(firstCfg);
    }, [methodsData, selectedMethodId]);

    // When method or config changes, fetch entities for that method/config (local only)
    useEffect(() => {
        let cancelled = false;

        async function run() {
            const fetchWorkspace = workspace;
            const date = activeForecastDate;
            if (!open || !fetchWorkspace || !date || !selectedMethodId) {
                setStations([]);
                return;
            }
            // Determine config to use: explicit selection or first config of method
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            if (!methodNode) {
                setStations([]);
                return;
            }
            const cfgId = selectedConfigId || (methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            const reqId = ++stationsReqRef.current;
            setStationsLoading(true);
            try {
                if (!cfgId) {
                    setStations([]);
                    return;
                }
                const resp = await getEntities(fetchWorkspace, date, selectedMethodId, cfgId);
                if (cancelled || reqId !== stationsReqRef.current) return;
                const list = resp?.entities || resp || [];
                // sort alphabetically by name (fallback to id), case-insensitive
                const sorted = Array.isArray(list) ? [...list].sort((a, b) => {
                    const aName = String(a?.name ?? a?.id ?? '').toLowerCase();
                    const bName = String(b?.name ?? b?.id ?? '').toLowerCase();
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                }) : list;
                setStations(sorted);
                // default-select first station (sorted) if none selected
                if (!selectedStationId && sorted?.length) {
                    setSelectedStationId(sorted[0].id);
                }
                // if currently selected station not in new list, clear it
                if (selectedStationId != null && !list.find(e => e.id === selectedStationId)) {
                    setSelectedStationId(null);
                }
            } catch (e) {
                if (!cancelled && reqId === stationsReqRef.current) {
                    setStations([]);
                }
            } finally {
                if (!cancelled && reqId === stationsReqRef.current) setStationsLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, methodsData]);

    // When station changes, compute which configs for the selected method are relevant to that station.
    // We'll call getRelevantEntities for each config and mark those that include the station.
    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || selectedStationId == null) {
                relevantRef.current.clear();
                setRelevantMapVersion(v => v + 1);
                return;
            }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            if (!methodNode || !methodNode.configurations || !methodNode.configurations.length) return;
            const reqId = ++relevanceReqRef.current;
            const promises = methodNode.configurations.map(async (cfg) => {
                try {
                    const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, cfg.id);
                    if (cancelled || reqId !== relevanceReqRef.current) return null;
                    let ids = [];
                    if (Array.isArray(resp)) ids = (typeof resp[0] === 'object') ? resp.map(r => r.id ?? r.entity_id).filter(v => v != null) : resp; else if (resp && typeof resp === 'object') ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
                    const setIds = new Set(ids);
                    const isRelevant = setIds.has(selectedStationId);
                    relevantRef.current.set(cfg.id, isRelevant);
                } catch (e) {
                    relevantRef.current.set(cfg.id, false);
                }
            });
            try {
                await Promise.all(promises);
                if (!cancelled && reqId === relevanceReqRef.current) setRelevantMapVersion(v => v + 1);
            } catch {
                if (!cancelled && reqId === relevanceReqRef.current) setRelevantMapVersion(v => v + 1);
            }
        }

        // debounce slightly to avoid hammering API while user navigates quickly
        const timer = setTimeout(run, 120);
        return () => {
            clearTimeout(timer);
            cancelled = true;
        };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedStationId, methodsData]);

    // Fetch analogs when selection (method, config, station, lead) changes
    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId) {
                setAnalogs(null);
                setAnalogsError(null);
                setAnalogsLoading(false);
                return;
            }
            // Resolve config to use
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) {
                setAnalogs(null);
                return;
            }
            setAnalogsLoading(true);
            setAnalogsError(null);
            // identify request by selection string when needed; no local reqId required here
            try {
                const resp = await getAnalogs(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead);
                if (cancelled) return;
                // normalize response: expect array of analogs with fields rank/index/date/value/criteria
                const items = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.analogs) ? resp.analogs : []);
                setAnalogs(items.map((it, i) => ({
                    rank: it.rank ?? it.analog ?? (i + 1),
                    date: it.date ?? it.analog_date ?? it.analog_date_str ?? it.dt ?? it.date_str ?? null,
                    value: (it.value != null) ? it.value : (it.precip_value != null ? it.precip_value : it.value_mm ?? null),
                    criteria: it.criteria ?? it.score ?? it.criterion ?? null
                })));
            } catch (e) {
                if (!cancelled) setAnalogsError(e);
                setAnalogs([]);
            } finally {
                if (!cancelled) setAnalogsLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

    // Fetch available leads by requesting series percentiles for the selected entity and extracting target_dates
    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!open) return;
            if (!workspace || !activeForecastDate || !selectedMethodId || !selectedStationId) {
                setLeads([]);
                return;
            }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) {
                setLeads([]);
                return;
            }
            setLeadsLoading(true);
            try {
                // Request series percentiles for this entity — percentiles parameter can be omitted
                const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId);
                if (cancelled) return;

                // Try to extract an array of date strings from common response shapes; prefer series_values.target_dates
                const rawDates = (function () {
                    if (!resp) return [];
                    if (resp.series_values && Array.isArray(resp.series_values.target_dates)) return resp.series_values.target_dates;
                    if (Array.isArray(resp.target_dates)) return resp.target_dates;
                    if (Array.isArray(resp.series_percentiles) && resp.series_percentiles.length && Array.isArray(resp.series_percentiles[0].target_dates)) return resp.series_percentiles[0].target_dates;
                    if (Array.isArray(resp.series) && resp.series.length && Array.isArray(resp.series[0].target_dates)) return resp.series[0].target_dates;
                    if (Array.isArray(resp)) {
                        if (resp.length && typeof resp[0] === 'string') return resp;
                        if (resp.length && resp[0] && Array.isArray(resp[0].target_dates)) return resp[0].target_dates;
                    }
                    return [];
                })();

                // Choose a base date for lead calculations: prefer forecastBaseDate, else try resp.parameters.forecast_date
                const baseDate = (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) ? forecastBaseDate : (resp && resp.parameters && resp.parameters.forecast_date ? new Date(resp.parameters.forecast_date) : null);

                const arr = rawDates.map(s => {
                    let d = null;
                    try {
                        d = s ? new Date(s) : null;
                        if (d && isNaN(d)) d = null;
                    } catch {
                        d = null;
                    }
                    const label = d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}${(d.getHours() || d.getMinutes()) ? ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''}` : String(s);
                    const leadNum = (d && baseDate && !isNaN(baseDate.getTime())) ? Math.round((d.getTime() - baseDate.getTime()) / 3600000) : null;
                    return {lead: leadNum, date: d, label};
                }).filter(x => x.lead != null && !isNaN(x.lead));

                if (!arr.length) {
                    setLeads([]);
                } else {
                    setLeads(arr);
                    if ((selectedLead == null || selectedLead === '') && arr.length) setSelectedLead(arr[0].lead);
                }
            } catch (e) {
                setLeads([]);
            } finally {
                if (!cancelled) setLeadsLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, methodsData, forecastBaseDate, selectedStationId]);

    // Reset local selections when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedMethodId(null);
            setSelectedConfigId(null);
            setSelectedStationId(null);
            setSelectedLead(0);
            setMethodsData(null);
            setStations([]);
            relevantRef.current.clear();
            setRelevantMapVersion(v => v + 1);
        }
    }, [open]);

    const methodOptions = useMemo(() => (methodsData?.methods || []), [methodsData]);

    const configsForSelectedMethod = useMemo(() => {
        const m = methodOptions.find(x => x.id === selectedMethodId);
        return m?.configurations || [];
    }, [methodOptions, selectedMethodId]);

    // Formatting helpers
    const formatPrecipitation = (v) => {
        if (v == null) return '-';
        const n = Number(v);
        if (isNaN(n)) return String(v);
        if (n === 0) return '0';
        return n.toFixed(1);
    };

    const formatCriteria = (v) => {
        if (v == null) return '-';
        const n = Number(v);
        if (isNaN(n)) return String(v);
        return n.toFixed(2);
    };

    // Render helpers
    const renderConfigLabel = (cfg) => {
        const relevant = !!relevantRef.current.get(cfg.id);
        return (
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <ListItemText primary={cfg.name || cfg.id}/>
                {relevant && <Typography variant="caption" sx={{
                    color: 'primary.main',
                    fontWeight: 600
                }}>({t('analogsModal.relevant')})</Typography>}
            </Box>
        );
    };

    return (
        <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="md"
                sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '920px'}}}>
            <DialogTitle sx={{pr: 5}}>
                {t('analogsModal.title')}
                <IconButton aria-label={t('analogsModal.close')} onClick={onClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-method-label">{t('analogsModal.method')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-method-label"
                                value={selectedMethodId ?? ''}
                                label={t('analogsModal.method')}
                                onChange={(e) => {
                                    setSelectedMethodId(e.target.value);
                                    setSelectedConfigId(null);
                                    relevantRef.current.clear();
                                    setRelevantMapVersion(v => v + 1);
                                }}
                            >
                                {methodsLoading && <MenuItem value=""><em>{t('analogsModal.loading')}</em></MenuItem>}
                                {!methodsLoading && methodOptions.length === 0 &&
                                    <MenuItem value=""><em>{t('analogsModal.noMethods')}</em></MenuItem>}
                                {methodOptions.map(m => (
                                    <MenuItem key={m.id} value={m.id}>{m.name || m.id}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-config-label">{t('analogsModal.config')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-config-label"
                                value={selectedConfigId ?? ''}
                                label={t('analogsModal.config')}
                                onChange={(e) => {
                                    setSelectedConfigId(e.target.value);
                                }}
                                renderValue={(v) => {
                                    const cfg = configsForSelectedMethod.find(c => c.id === v);
                                    return cfg ? cfg.name || cfg.id : '';
                                }}
                            >
                                {configsForSelectedMethod.length === 0 &&
                                    <MenuItem value=""><em>{t('analogsModal.noConfigs')}</em></MenuItem>}
                                {configsForSelectedMethod.map(cfg => (
                                    <MenuItem key={cfg.id} value={cfg.id}>
                                        {renderConfigLabel(cfg)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-entity-label">{t('analogsModal.entity')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-entity-label"
                                value={selectedStationId ?? ''}
                                label={t('analogsModal.entity')}
                                onChange={(e) => {
                                    setSelectedStationId(e.target.value);
                                    setRelevantMapVersion(v => v + 1);
                                }}
                                MenuProps={{PaperProps: {style: {maxHeight: 320}}}}
                            >
                                {stationsLoading &&
                                    <MenuItem value=""><em>{t('analogsModal.loadingEntities')}</em></MenuItem>}
                                {!stationsLoading && stations.length === 0 &&
                                    <MenuItem value=""><em>{t('analogsModal.noEntities')}</em></MenuItem>}
                                {stations.map(s => (
                                    <MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-lead-label">{t('analogsModal.lead')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-lead-label"
                                value={selectedLead ?? ''}
                                label={t('analogsModal.lead')}
                                onChange={(e) => setSelectedLead(e.target.value)}
                            >
                                {leadsLoading &&
                                    <MenuItem value=""><em>{t('analogsModal.loadingAnalogs')}</em></MenuItem>}
                                {!leadsLoading && leads.length === 0 && <MenuItem
                                    value=""><em>{t('analogsModal.noLeads') || 'No lead times'}</em></MenuItem>}
                                {leads.map(l => (
                                    <MenuItem key={String(l.lead) + (l.label || '')}
                                              value={l.lead}>{l.label || (l.lead != null ? `${l.lead}h` : '')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{borderLeft: '1px dashed #e0e0e0', pl: 2, minHeight: 360}}>
                        <Typography variant="subtitle1"
                                    sx={{mb: 1}}>{t('analogsModal.analogsList') || 'Analogs'}</Typography>

                        <Box sx={{mt: 2}}>
                            {methodsError && <Typography variant="caption"
                                                         sx={{color: '#b00020'}}>{t('analogsModal.errorLoadingMethods')}</Typography>}
                            {methodsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={18}/>
                                    <Typography variant="caption">{t('analogsModal.loadingMethods')}</Typography></Box>}
                            {stationsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={18}/>
                                    <Typography
                                        variant="caption">{t('analogsModal.loadingEntities')}</Typography></Box>}
                        </Box>

                        <Box sx={{mt: 2}}>
                            {analogsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/>
                                    <Typography
                                        variant="caption">{t('analogsModal.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                            {analogsError && <Typography variant="caption"
                                                         sx={{color: '#b00020'}}>{t('analogsModal.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
                            {!analogsLoading && analogs && (
                                <TableContainer component={Paper} sx={{maxHeight: 420, mt: 1}}>
                                    <Table stickyHeader size="small" sx={{tableLayout: 'fixed'}}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{width: '6%'}}>#</TableCell>
                                                <TableCell
                                                    sx={{width: '34%'}}> {t('analogsModal.colDate') || 'Date'}</TableCell>
                                                <TableCell sx={{
                                                    width: '30%',
                                                    textAlign: 'right'
                                                }}>{t('analogsModal.colPrecipitation') || t('analogsModal.precipitation') || 'Precipitation'}</TableCell>
                                                <TableCell sx={{
                                                    width: '30%',
                                                    textAlign: 'right'
                                                }}>{t('analogsModal.colCriteria') || 'Criteria'}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analogs.map((a, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{width: '6%'}}>{a.rank ?? (idx + 1)}</TableCell>
                                                    <TableCell sx={{width: '34%'}}>{(function (d) {
                                                        try {
                                                            const D = new Date(d);
                                                            if (isNaN(D)) return d;
                                                            return `${String(D.getDate()).padStart(2, '0')}.${String(D.getMonth() + 1).padStart(2, '0')}.${D.getFullYear()}`;
                                                        } catch {
                                                            return d;
                                                        }
                                                    })(a.date)}</TableCell>
                                                    <TableCell sx={{width: '30%'}}
                                                               align="right">{formatPrecipitation(a.value)}</TableCell>
                                                    <TableCell sx={{width: '30%'}}
                                                               align="right">{formatCriteria(a.criteria)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
