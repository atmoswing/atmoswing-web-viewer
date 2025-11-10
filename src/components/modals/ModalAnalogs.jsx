import React, {useEffect, useMemo, useState} from 'react';
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
import {useForecastSession} from '../../contexts/ForecastSessionContext.jsx';
import {
    getMethodsAndConfigs,
    getEntities,
    getRelevantEntities,
    getAnalogs,
    getSeriesValuesPercentiles
} from '../../services/api.js';
import {useTranslation} from 'react-i18next';
import { formatPrecipitation, formatCriteria, compareEntitiesByName, formatDateLabel } from '../../utils/formattingUtils.js';
import { useCachedRequest, clearCachedRequests } from '../../hooks/useCachedRequest.js';
import { normalizeAnalogsResponse, extractTargetDatesArray, normalizeEntitiesResponse, normalizeRelevantEntityIds } from '../../utils/apiNormalization.js';
import { SHORT_TTL, DEFAULT_TTL } from '../../utils/cacheTTLs.js';

export default function ModalAnalogs({open, onClose}) {
    const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
    const {t} = useTranslation();

    // Local selections (do NOT touch global contexts)
    const [selectedMethodId, setSelectedMethodId] = useState(null);
    const [selectedConfigId, setSelectedConfigId] = useState(null);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [selectedLead, setSelectedLead] = useState(0);

    // Entities for the currently selected method/config
    const [stations, setStations] = useState([]);
    // removed stationsLoading state; using hook's loading
    const [analogs, setAnalogs] = useState(null);
    // removed analogsLoading/analogsError state; using hook's loading/error
    const [leads, setLeads] = useState([]);
    // removed leadsLoading state; using hook's loading

    // Relevant config highlighting: configId -> boolean
    const relevantRef = React.useRef(new Map());
    const _dummyRef = React.useRef(null); // linter: explicit usage of useRef
    const [, setRelevantMapVersion] = useState(0); // bump to re-render when relevance updated

    // METHODS via cached request
    const methodsCacheKey = open && workspace && activeForecastDate ? `modal_methods|${workspace}|${activeForecastDate}` : null;
    const { data: methodsData, loading: methodsLoading, error: methodsError } = useCachedRequest(
        methodsCacheKey,
        async () => getMethodsAndConfigs(workspace, activeForecastDate),
        [workspace, activeForecastDate, open],
        { enabled: !!methodsCacheKey, initialData: null, ttlMs: DEFAULT_TTL }
    );

    // Default select first method/config when methodsData arrives or changes
    useEffect(() => {
        if (!open) return;
        if (!methodsData?.methods || !methodsData.methods.length) return;
        const first = methodsData.methods[0];
        if (!selectedMethodId) setSelectedMethodId(first.id);
        if (!selectedConfigId && first.configurations && first.configurations.length) setSelectedConfigId(first.configurations[0].id);
    }, [methodsData, open, selectedMethodId, selectedConfigId]);

    // Ensure a config gets selected if method changes
    useEffect(() => {
        if (!methodsData?.methods || !selectedMethodId) return;
        const m = methodsData.methods.find(mm => mm.id === selectedMethodId);
        if (!m) return;
        if (!selectedConfigId && m.configurations && m.configurations.length) setSelectedConfigId(m.configurations[0].id);
    }, [methodsData, selectedMethodId, selectedConfigId]);

    // ENTITIES via cached request (depends on method + config)
    const resolvedMethodForEntities = selectedMethodId;
    const resolvedConfigForEntities = (function(){
        if (!methodsData?.methods) return null;
        const m = methodsData.methods.find(mm => mm.id === selectedMethodId);
        if (!m) return null;
        return selectedConfigId || (m.configurations && m.configurations[0] && m.configurations[0].id) || null;
    })();
    const entitiesCacheKey = open && workspace && activeForecastDate && resolvedMethodForEntities && resolvedConfigForEntities ? `modal_entities|${workspace}|${activeForecastDate}|${resolvedMethodForEntities}|${resolvedConfigForEntities}` : null;
    const { data: entitiesDataRaw, loading: stationsLoading, error: stationsError } = useCachedRequest(
        entitiesCacheKey,
        async () => {
            const resp = await getEntities(workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForEntities);
            return normalizeEntitiesResponse(resp);
        },
        [workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForEntities, open],
        { enabled: !!entitiesCacheKey, initialData: [] , ttlMs: DEFAULT_TTL}
    );

    // Sort and apply entities, maintain selection validity
    useEffect(() => {
        if (!open) return;
        const list = Array.isArray(entitiesDataRaw) ? [...entitiesDataRaw].sort(compareEntitiesByName) : [];
        setStations(list);
        if (!selectedStationId && list.length) setSelectedStationId(list[0].id);
        if (selectedStationId && !list.find(e => e.id === selectedStationId)) setSelectedStationId(null);
    }, [entitiesDataRaw, open, selectedStationId]);

    // ANALOGS via cached request
    const resolvedConfigForAnalogs = resolvedConfigForEntities; // same resolution logic
    const analogsCacheKey = open && workspace && activeForecastDate && resolvedMethodForEntities && resolvedConfigForAnalogs && selectedStationId != null ? `modal_analogs|${workspace}|${activeForecastDate}|${resolvedMethodForEntities}|${resolvedConfigForAnalogs}|${selectedStationId}|${selectedLead}` : null;
    const { data: analogsData, loading: analogsLoading, error: analogsError } = useCachedRequest(
        analogsCacheKey,
        async () => {
            const resp = await getAnalogs(workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForAnalogs, selectedStationId, selectedLead);
            return normalizeAnalogsResponse(resp);
        },
        [workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForAnalogs, selectedStationId, selectedLead, open],
        { enabled: !!analogsCacheKey, initialData: [] , ttlMs: SHORT_TTL}
    );
    useEffect(() => { setAnalogs(Array.isArray(analogsData) ? analogsData : []); }, [analogsData]);

    // LEADS via cached request (series percentiles)
    const leadsCacheKey = open && workspace && activeForecastDate && resolvedMethodForEntities && resolvedConfigForAnalogs && selectedStationId != null ? `modal_leads|${workspace}|${activeForecastDate}|${resolvedMethodForEntities}|${resolvedConfigForAnalogs}|${selectedStationId}` : null;
    const { data: leadsRaw, loading: leadsLoading, error: leadsError } = useCachedRequest(
        leadsCacheKey,
        async () => {
            const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForAnalogs, selectedStationId);
            const rawDates = extractTargetDatesArray(resp);
            const baseDate = (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) ? forecastBaseDate : (resp && resp.parameters && resp.parameters.forecast_date ? new Date(resp.parameters.forecast_date) : null);
            return rawDates.map(s => {
                let d = null;
                try { d = s ? new Date(s) : null; if (d && isNaN(d)) d = null; } catch { d = null; }
                const label = d ? formatDateLabel(d) : String(s);
                const leadNum = (d && baseDate && !isNaN(baseDate.getTime())) ? Math.round((d.getTime() - baseDate.getTime()) / 3600000) : null;
                return { lead: leadNum, date: d, label };
            }).filter(x => x.lead != null && !isNaN(x.lead));
        },
        [workspace, activeForecastDate, resolvedMethodForEntities, resolvedConfigForAnalogs, selectedStationId, forecastBaseDate, open],
        { enabled: !!leadsCacheKey, initialData: [] , ttlMs: SHORT_TTL}
    );
    useEffect(() => {
        setLeads(Array.isArray(leadsRaw) ? leadsRaw : []);
        if ((selectedLead == null || selectedLead === '') && Array.isArray(leadsRaw) && leadsRaw.length) setSelectedLead(leadsRaw[0].lead);
    }, [leadsRaw, selectedLead]);

    // Cached relevance map (configId -> boolean) for selected station
    const relevanceKey = open && workspace && activeForecastDate && selectedMethodId && selectedStationId != null ? `modal_relevance|${workspace}|${activeForecastDate}|${selectedMethodId}|${selectedStationId}` : null;
    const { data: relevanceMap, loading: relevanceLoading } = useCachedRequest(
        relevanceKey,
        async () => {
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            if (!methodNode || !methodNode.configurations) return {};
            const results = await Promise.all(methodNode.configurations.map(async cfg => {
                try {
                    const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, cfg.id);
                    const idsSet = normalizeRelevantEntityIds(resp);
                    return [cfg.id, idsSet.has(selectedStationId)];
                } catch { return [cfg.id, false]; }
            }));
            return Object.fromEntries(results);
        },
        [workspace, activeForecastDate, selectedMethodId, selectedStationId, methodsData, open],
        { enabled: !!relevanceKey && !!methodsData?.methods?.length, initialData: null, ttlMs: DEFAULT_TTL }
    );

    useEffect(() => {
        if (relevanceMap && typeof relevanceMap === 'object') {
            relevantRef.current = new Map(Object.entries(relevanceMap));
            setRelevantMapVersion(v => v + 1);
        } else if (!relevanceLoading && relevanceKey) {
            relevantRef.current.clear();
            setRelevantMapVersion(v => v + 1);
        }
    }, [relevanceMap, relevanceLoading, relevanceKey]);

    // Reset local selections when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedMethodId(null);
            setSelectedConfigId(null);
            setSelectedStationId(null);
            setSelectedLead(0);
            setStations([]);
            setAnalogs([]);
            setLeads([]);
            relevantRef.current.clear();
            setRelevantMapVersion(v => v + 1);
            clearCachedRequests('modal_');
        }
    }, [open]);

    const methodOptions = useMemo(() => (methodsData?.methods || []), [methodsData]);

    const configsForSelectedMethod = useMemo(() => {
        const m = methodOptions.find(x => x.id === selectedMethodId);
        return m?.configurations || [];
    }, [methodOptions, selectedMethodId]);

    // Force a no-op read to ensure linter detects usage of relevantRef
    const _relevanceCount = relevantRef.current.size; // eslint-disable-line no-unused-vars

    // Render helpers
    const renderConfigLabel = (cfg) => {
        const relevant = !!relevantRef.current.get(cfg.id);
        return (
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <ListItemText primary={cfg.name || cfg.id}/>
                {relevant && <Typography variant="caption" sx={{
                    color: 'primary.main',
                    fontWeight: 600
                }}>({t('modalAnalogs.relevant')})</Typography>}
            </Box>
        );
    };

    return (
        <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="md"
                sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '920px'}}}>
            <DialogTitle sx={{pr: 5}}>
                {t('modalAnalogs.title')}
                <IconButton aria-label={t('modalAnalogs.close')} onClick={onClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-method-label">{t('modalAnalogs.method')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-method-label"
                                value={selectedMethodId ?? ''}
                                label={t('modalAnalogs.method')}
                                onChange={(e) => {
                                    setSelectedMethodId(e.target.value);
                                    setSelectedConfigId(null);
                                    relevantRef.current.clear();
                                    setRelevantMapVersion(v => v + 1);
                                }}
                            >
                                {methodsLoading && <MenuItem value=""><em>{t('modalAnalogs.loading')}</em></MenuItem>}
                                {!methodsLoading && methodOptions.length === 0 &&
                                    <MenuItem value=""><em>{t('modalAnalogs.noMethods')}</em></MenuItem>}
                                {methodOptions.map(m => (
                                    <MenuItem key={m.id} value={m.id}>{m.name || m.id}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-config-label">{t('modalAnalogs.config')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-config-label"
                                value={selectedConfigId ?? ''}
                                label={t('modalAnalogs.config')}
                                onChange={(e) => {
                                    setSelectedConfigId(e.target.value);
                                }}
                                renderValue={(v) => {
                                    const cfg = configsForSelectedMethod.find(c => c.id === v);
                                    return cfg ? cfg.name || cfg.id : '';
                                }}
                            >
                                {configsForSelectedMethod.length === 0 &&
                                    <MenuItem value=""><em>{t('modalAnalogs.noConfigs')}</em></MenuItem>}
                                {configsForSelectedMethod.map(cfg => (
                                    <MenuItem key={cfg.id} value={cfg.id}>
                                        {renderConfigLabel(cfg)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-entity-label">{t('modalAnalogs.entity')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-entity-label"
                                value={selectedStationId ?? ''}
                                label={t('modalAnalogs.entity')}
                                onChange={(e) => {
                                    setSelectedStationId(e.target.value);
                                    setRelevantMapVersion(v => v + 1);
                                }}
                                MenuProps={{PaperProps: {style: {maxHeight: 320}}}}
                            >
                                {stationsLoading &&
                                    <MenuItem value=""><em>{t('modalAnalogs.loadingEntities')}</em></MenuItem>}
                                {!stationsLoading && stations.length === 0 &&
                                    <MenuItem value=""><em>{t('modalAnalogs.noEntities')}</em></MenuItem>}
                                {stations.map(s => (
                                    <MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="analogs-lead-label">{t('modalAnalogs.lead')}</InputLabel>
                            <Select
                                variant="standard"
                                labelId="analogs-lead-label"
                                value={selectedLead ?? ''}
                                label={t('modalAnalogs.lead')}
                                onChange={(e) => setSelectedLead(e.target.value)}
                            >
                                {leadsLoading &&
                                    <MenuItem value=""><em>{t('modalAnalogs.loadingAnalogs')}</em></MenuItem>}
                                {!leadsLoading && leads.length === 0 && <MenuItem
                                    value=""><em>{t('modalAnalogs.noLeads') || 'No lead times'}</em></MenuItem>}
                                {leads.map(l => (
                                    <MenuItem key={String(l.lead) + (l.label || '')}
                                              value={l.lead}>{l.label || (l.lead != null ? `${l.lead}h` : '')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{borderLeft: '1px dashed #e0e0e0', pl: 2, minHeight: 360}}>
                        <Typography variant="subtitle1"
                                    sx={{mb: 1}}>{t('modalAnalogs.analogsList') || 'Analogs'}</Typography>

                        <Box sx={{mt: 2}}>
                            {methodsError && <Typography variant="caption"
                                                         sx={{color: '#b00020'}}>{t('modalAnalogs.errorLoadingMethods')}</Typography>}
                            {methodsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={18}/>
                                    <Typography variant="caption">{t('modalAnalogs.loadingMethods')}</Typography></Box>}
                            {stationsError && <Typography variant="caption" sx={{color:'#b00020'}}>{t('modalAnalogs.errorLoadingEntities') || 'Failed to load entities'}</Typography>}
                            {stationsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={18}/>
                                    <Typography
                                        variant="caption">{t('modalAnalogs.loadingEntities')}</Typography></Box>}
                        </Box>

                        <Box sx={{mt: 2}}>
                            {analogsLoading &&
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/>
                                    <Typography
                                        variant="caption">{t('modalAnalogs.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                            {analogsError && <Typography variant="caption"
                                                         sx={{color: '#b00020'}}>{t('modalAnalogs.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
                            {leadsError && <Typography variant="caption" sx={{color:'#b00020'}}>{t('modalAnalogs.errorLoadingLeads') || 'Failed to load leads'}</Typography>}
                            {!analogsLoading && analogs && (
                                <TableContainer component={Paper} sx={{maxHeight: 420, mt: 1}}>
                                    <Table stickyHeader size="small" sx={{tableLayout: 'fixed'}}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{width: '6%'}}>#</TableCell>
                                                <TableCell
                                                    sx={{width: '34%'}}> {t('modalAnalogs.colDate') || 'Date'}</TableCell>
                                                <TableCell sx={{
                                                    width: '30%',
                                                    textAlign: 'right'
                                                }}>{t('modalAnalogs.colPrecipitation') || t('modalAnalogs.precipitation') || 'Precipitation'}</TableCell>
                                                <TableCell sx={{
                                                    width: '30%',
                                                    textAlign: 'right'
                                                }}>{t('modalAnalogs.colCriteria') || 'Criteria'}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analogs.map((a, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{width: '6%'}}>{a.rank ?? (idx + 1)}</TableCell>
                                                    <TableCell sx={{width: '34%'}}>{formatDateLabel(a.date)}</TableCell>
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
