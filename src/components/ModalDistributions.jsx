import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Tabs,
    Tab
} from '@mui/material';
import {useForecastSession} from '../contexts/ForecastSessionContext.jsx';
import {getMethodsAndConfigs, getEntities, getAnalogValues, getAnalogyCriteria, getSeriesValuesPercentiles, getAnalogValuesBest, getAnalogValuesPercentiles} from '../services/api.js';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';

function TabPanel({children, value, index, ...other}){
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (
                <Box sx={{pt: 1}}>{children}</Box>
            )}
        </div>
    );
}

export default function ModalDistributions({open, onClose}){
    const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
    const {t} = useTranslation();

    // methods/configs
    const [methodsLoading, setMethodsLoading] = useState(false);
    const [methodsData, setMethodsData] = useState(null);

    const [selectedMethodId, setSelectedMethodId] = useState(null);
    const [selectedConfigId, setSelectedConfigId] = useState(null);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);

    const [stations, setStations] = useState([]);
    const [stationsLoading, setStationsLoading] = useState(false);

    const [leads, setLeads] = useState([]);
    const [leadsLoading, setLeadsLoading] = useState(false);

    const [analogValues, setAnalogValues] = useState(null);
    const [analogLoading, setAnalogLoading] = useState(false);
    const [analogError, setAnalogError] = useState(null);

    const [criteriaValues, setCriteriaValues] = useState(null);
    const [criteriaLoading, setCriteriaLoading] = useState(false);

    const [tabIndex, setTabIndex] = useState(0);
    // options for precipitation plot (best analogs / return periods)
    const [options, setOptions] = useState({ bestAnalogs: false, tenYearReturn: false, allReturnPeriods: false });
    const [bestAnalogsData, setBestAnalogsData] = useState(null);
    const [percentileMarkers, setPercentileMarkers] = useState(null); // map percentile -> value
    // trigger to force chart redraw on resize/tab change
    const [renderTick, setRenderTick] = useState(0);

    const methodsReqRef = useRef(0);
    const stationsReqRef = useRef(0);

    // chart refs
    const precipRef = useRef(null);
    const critRef = useRef(null);

    // redraw on window resize (debounced)
    useEffect(() => {
        let timer = null;
        function handler() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => setRenderTick(t => t + 1), 120);
        }
        window.addEventListener('resize', handler);
        return () => { window.removeEventListener('resize', handler); if (timer) clearTimeout(timer); };
    }, []);

    // Load methods & configs
    useEffect(() => {
        let cancelled = false;
        async function run(){
            if (!open) return;
            if (!workspace || !activeForecastDate) return;
            const reqId = ++methodsReqRef.current;
            setMethodsLoading(true);
            try{
                const data = await getMethodsAndConfigs(workspace, activeForecastDate);
                if (cancelled || reqId !== methodsReqRef.current) return;
                setMethodsData(data);
                const first = (data?.methods && data.methods[0]) ? data.methods[0] : null;
                setSelectedMethodId(first ? first.id : null);
                const firstCfg = first && first.configurations && first.configurations[0] ? first.configurations[0].id : null;
                setSelectedConfigId(firstCfg);
            }catch(e){
                // ignore method errors locally (no methodsError state)
                if (!cancelled && reqId === methodsReqRef.current) {
                    // console.debug('Failed to load methods', e);
                }
            }finally{
                if (!cancelled && reqId === methodsReqRef.current) setMethodsLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate]);

    // When method/config changes, fetch entities
    useEffect(() => {
        let cancelled = false;
        async function run(){
            const fetchWorkspace = workspace;
            const date = activeForecastDate;
            if (!open || !fetchWorkspace || !date || !selectedMethodId) {
                setStations([]);
                return;
            }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            if (!methodNode) {
                setStations([]);
                return;
            }
            const cfgId = selectedConfigId || (methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            const reqId = ++stationsReqRef.current;
            setStationsLoading(true);
            try{
                if (!cfgId) { setStations([]); return; }
                const resp = await getEntities(fetchWorkspace, date, selectedMethodId, cfgId);
                if (cancelled || reqId !== stationsReqRef.current) return;
                const list = resp?.entities || resp || [];
                const sorted = Array.isArray(list) ? [...list].sort((a,b) => {
                    const aName = String(a?.name ?? a?.id ?? '').toLowerCase();
                    const bName = String(b?.name ?? b?.id ?? '').toLowerCase();
                    if (aName < bName) return -1; if (aName > bName) return 1; return 0;
                }) : list;
                setStations(sorted);
                if (!selectedStationId && sorted?.length) setSelectedStationId(sorted[0].id);
                if (selectedStationId != null && !list.find(e => e.id === selectedStationId)) setSelectedStationId(null);
            }catch(e){
                if (!cancelled && reqId === stationsReqRef.current) setStations([]);
            }finally{
                if (!cancelled && reqId === stationsReqRef.current) setStationsLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, methodsData]);

    // Fetch leads similar to ModalAnalogs (use series percentiles to infer target dates)
    useEffect(() => {
        let cancelled = false;
        async function run(){
            if (!open) return;
            if (!workspace || !activeForecastDate || !selectedMethodId || !selectedStationId) {
                setLeads([]); return;
            }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) { setLeads([]); return; }
            setLeadsLoading(true);
            try{
                const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId);
                if (cancelled) return;
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
                const baseDate = (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) ? forecastBaseDate : (resp && resp.parameters && resp.parameters.forecast_date ? new Date(resp.parameters.forecast_date) : null);
                const arr = rawDates.map(s => {
                    let d = null; try { d = s ? new Date(s) : null; if (d && isNaN(d)) d = null; } catch { d = null; }
                    const label = d ? `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}${(d.getHours()||d.getMinutes()) ? ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') : ''}` : String(s);
                    const leadNum = (d && baseDate && !isNaN(baseDate.getTime())) ? Math.round((d.getTime() - baseDate.getTime())/3600000) : null;
                    return {lead: leadNum, date: d, label};
                }).filter(x => x.lead != null && !isNaN(x.lead));
                if (!arr.length) setLeads([]); else { setLeads(arr); if ((selectedLead == null || selectedLead === '') && arr.length) setSelectedLead(arr[0].lead); }
            }catch(e){ setLeads([]); } finally { if (!cancelled) setLeadsLoading(false); }
        }
        run();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, methodsData, forecastBaseDate, selectedStationId]);

    // Reset when modal closed
    useEffect(() => {
        if (!open) {
            setSelectedMethodId(null);
            setSelectedConfigId(null);
            setSelectedStationId(null);
            setSelectedLead(null);
            setMethodsData(null);
            setStations([]);
            setAnalogValues(null);
            setCriteriaValues(null);
        }
    }, [open]);

    const methodOptions = useMemo(() => (methodsData?.methods || []), [methodsData]);
    const configsForSelectedMethod = useMemo(() => {
        const m = methodOptions.find(x => x.id === selectedMethodId);
        return m?.configurations || [];
    }, [methodOptions, selectedMethodId]);

    // colors / selected return periods same as in ModalForecastSeries
    const TENYR_COLOR = '#d00000';
    const SELECTED_RPS = [100, 50, 20, 10, 5, 2];

    const handleOptionChange = (key) => (e) => {
        const checked = e.target.checked;
        setOptions(o => {
            if (key === 'tenYearReturn') {
                return {...o, tenYearReturn: checked, allReturnPeriods: checked ? false : o.allReturnPeriods };
            }
            if (key === 'allReturnPeriods') {
                return {...o, allReturnPeriods: checked, tenYearReturn: checked ? false : o.tenYearReturn };
            }
            return {...o, [key]: checked};
        });
    };

    // Fetch analog values when selection changes
    useEffect(() => {
        let cancelled = false;
        async function run(){
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) {
                setAnalogValues(null); setAnalogError(null); setAnalogLoading(false); return;
            }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) { setAnalogValues(null); return; }
            setAnalogLoading(true); setAnalogError(null);
            try{
                const resp = await getAnalogValues(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead);
                if (cancelled) return;
                // normalize: accept multiple possible response shapes and numeric arrays
                let arr;
                if (Array.isArray(resp)) arr = resp;
                else if (resp && Array.isArray(resp.analogs)) arr = resp.analogs;
                else if (resp && Array.isArray(resp.analog_values)) arr = resp.analog_values;
                else if (resp && Array.isArray(resp.values)) arr = resp.values;
                else if (resp && Array.isArray(resp.data)) arr = resp.data;
                else if (resp && Array.isArray(resp.items)) arr = resp.items;
                else arr = [];

                const values = arr.map((it, i) => {
                    // numeric item
                    if (it == null) return { rank: i+1, date: null, value: null, criteria: null };
                    if (typeof it === 'number') return { rank: i+1, date: null, value: it, criteria: null };
                    // object item
                    const rank = it.rank ?? it.analog ?? (i+1);
                    const date = it.date ?? it.analog_date ?? it.dt ?? it.target_date ?? null;
                    const v = (it.value != null) ? it.value : (it.precip_value != null ? it.precip_value : (it.value_mm != null ? it.value_mm : (it.amount != null ? it.amount : null)));
                    const criteria = it.criteria ?? it.score ?? it.criterion ?? it.crit ?? null;
                    // If v is still null but object contains a plain numeric entry (e.g. single-number arrays inside objects), attempt to coerce
                    if (v == null) {
                        // try common numeric keys
                        const numKeys = ['val','value_mm','precip','precipitation'];
                        for (const k of numKeys) {
                            if (it[k] != null && typeof it[k] === 'number') { return { rank, date, value: it[k], criteria }; }
                        }
                    }
                    return { rank, date, value: (typeof v === 'number' ? v : (v != null ? Number(v) : null)), criteria };
                });
                 setAnalogValues(values);
            }catch(e){ if (!cancelled) setAnalogError(e); setAnalogValues([]); }
            finally{ if (!cancelled) setAnalogLoading(false); }
        }
        run();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

    // Fetch criteria distribution explicitly if available
    useEffect(() => {
        let cancelled = false;
        async function run(){
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) { setCriteriaValues(null); setCriteriaLoading(false); return; }
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) { setCriteriaValues(null); return; }
            setCriteriaLoading(true);
            try{
                const resp = await getAnalogyCriteria(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead);
                if (cancelled) return;
                // expect array or object; try to extract array of criteria values from multiple shapes
                let list = [];
                if (Array.isArray(resp)) list = resp;
                else if (resp && Array.isArray(resp.criteria)) list = resp.criteria;
                else if (resp && Array.isArray(resp.analogs)) list = resp.analogs.map(a => a.criteria ?? a.score ?? a.criterion).filter(v => v != null);
                else if (resp && Array.isArray(resp.values)) list = resp.values;
                else if (resp && Array.isArray(resp.data)) list = resp.data;
                setCriteriaValues(list.map((v,i) => ({index: i+1, value: (typeof v === 'object' && v.value != null) ? v.value : v})).filter(x => x.value != null));
            }catch(e){ setCriteriaValues(null); }
            finally{ if (!cancelled) setCriteriaLoading(false); }
        }
        run();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

    // Draw precipitation distribution: cumulative (no histogram)
    useEffect(() => {
        const container = precipRef.current;
        d3.select(container).selectAll('*').remove();
        if (!container) return;
        const data = analogValues || [];
        if (!data.length) return;

        // Exclude missing/null values BEFORE converting to Number
        const values = data.map(d => (d && d.value != null) ? d.value : null)
            .filter(v => v != null && isFinite(Number(v)))
            .map(v => Number(v))
            .sort((a,b) => a - b);
        if (!values.length) return;

        const width = container.clientWidth || 700;
        const height = Math.max(240, container.clientHeight || 320);
        const margin = {top: 20, right: 40, bottom: 40, left: 56};
        const innerW = Math.max(10, width - margin.left - margin.right);
        const innerH = Math.max(40, height - margin.top - margin.bottom);

        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // x scale for precipitation
        const rawMax = d3.max(values);
        const xMax = (rawMax != null && rawMax > 0) ? rawMax * 1.05 : 1;
        const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]).nice();

        // cumulative curve data (x: precip, y: plotting position using Gringorten formula)
        // Gringorten plotting positions: f_i = (i+1 - irep) / (N + nrep)
        const size = values.length;
        const irep = 0.44; // plotting position parameter
        const nrep = 0.12; // plotting position parameter
        const divisor = 1.0 / (size + nrep);
        const cum = values.map((v, i) => ({ x: v, y: Math.max(0, Math.min(1, (i + 1.0 - irep) * divisor)) }));

        // left axis: cumulative frequency 0..1 (decimal)
        const yCum = d3.scaleLinear().domain([0,1]).range([innerH,0]);

        // add light gray grid lines (x verticals and y horizontals) behind the data
        const xGrid = d3.axisBottom(x).ticks(8).tickSize(-innerH).tickFormat('');
        g.append('g').attr('class','grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        // remove the axis domain path so only grid lines remain (prevents stray vertical axis line)
        g.select('.grid.grid-x').selectAll('.domain').remove();
        const yGrid = d3.axisLeft(yCum).ticks(5).tickSize(-innerW).tickFormat('');
        g.append('g').attr('class','grid grid-y').call(yGrid).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-y').selectAll('.domain').remove();

        // draw cumulative curve
        const line = d3.line().x(d => x(d.x)).y(d => yCum(d.y)).curve(d3.curveMonotoneX);
        g.append('path').datum(cum).attr('fill','none').attr('stroke','#1f77b4').attr('stroke-width',2).attr('d', line);

        // draw markers for cumulative points (optional small circles)
        g.selectAll('.cum-point').data(cum).enter().append('circle')
            .attr('class','cum-point')
            .attr('cx', d => x(d.x))
            .attr('cy', d => yCum(d.y))
            .attr('r', 3)
            .attr('fill', '#1f77b4');

        // draw percentile vertical markers (20/60/90)
        const pctColors = {20: '#ffcc00', 60: '#ff7f0e', 90: '#d62728'};
        if (percentileMarkers) {
            [20,60,90].forEach(p => {
                const xv = percentileMarkers[p];
                if (xv == null || !isFinite(Number(xv))) return;
                g.append('line').attr('class', `pct-line p${p}`).attr('x1', x(Number(xv))).attr('x2', x(Number(xv))).attr('y1', 0).attr('y2', innerH).attr('stroke', pctColors[p]).attr('stroke-width', 2).attr('stroke-opacity', 0.9);
            });
        }

        // draw best analogs markers (X) if available
        if (options.bestAnalogs && bestAnalogsData && bestAnalogsData.length) {
            bestAnalogsData.forEach(b => {
                const bv = Number(b.value);
                if (!isFinite(bv)) return;
                // find closest index in sorted values
                let idx = values.findIndex(v => Math.abs(v - bv) < 1e-6);
                if (idx === -1) {
                    // fallback: nearest
                    let minD = Infinity; idx = -1;
                    values.forEach((v,i) => { const d = Math.abs(v - bv); if (d < minD) { minD = d; idx = i; } });
                }
                if (idx >= 0) {
                    const rank = idx + 1;
                    const sizeN = values.length;
                    const irep = 0.44; const nrep = 0.12; const divisorLocal = 1.0 / (sizeN + nrep);
                    const yPos = Math.max(0, Math.min(1, (rank - irep) * divisorLocal));
                    const cx = x(bv); const cy = yCum(yPos);
                    const s = 6;
                    g.append('line').attr('x1', cx - s).attr('y1', cy - s).attr('x2', cx + s).attr('y2', cy + s).attr('stroke', '#b00020').attr('stroke-width', 2);
                    g.append('line').attr('x1', cx - s).attr('y1', cy + s).attr('x2', cx + s).attr('y2', cy - s).attr('stroke', '#b00020').attr('stroke-width', 2);
                }
            });
        }

        // x axis
        const xAxis = d3.axisBottom(x).ticks(8);
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
        svg.append('text').attr('x',(margin.left + innerW/2)).attr('y', height-6).attr('text-anchor','middle').text(t('seriesModal.precipitation') || 'Precipitation [mm]');

        // left axis for cumulative frequency (0..1)
        const yAxisLeft = d3.axisLeft(yCum).ticks(5).tickFormat(d3.format('.2f'));
        g.append('g').call(yAxisLeft);
        svg.append('text').attr('transform','rotate(-90)').attr('x',-(margin.top + innerH/2)).attr('y',12).attr('text-anchor','middle').text(t('distributionPlots.cumulativeFrequency') || 'Cumulative frequency');

        // remove any domain paths (axis lines) to avoid stray vertical/horizontal lines
        g.selectAll('path.domain').remove();

    }, [analogValues, t, renderTick, tabIndex]);

    // Draw criteria distribution: sorted criteria vs analog index
    useEffect(() => {
        const container = critRef.current;
        d3.select(container).selectAll('*').remove();
        if (!container) return;
        // prefer criteriaValues (explicit) else extract from analogValues
        const raw = (criteriaValues && criteriaValues.length) ?
            criteriaValues.map(d => (d && d.value != null) ? d.value : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) :
            (analogValues ? analogValues.map(a => (a && a.criteria != null) ? a.criteria : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) : []);
        if (!raw.length) return;
        const values = [...raw].sort((a,b) => a-b);
        const width = container.clientWidth || 700;
        const height = Math.max(220, container.clientHeight || 300);
        const margin = {top: 20, right: 20, bottom: 40, left: 56};
        const innerW = Math.max(10, width - margin.left - margin.right);
        const innerH = Math.max(40, height - margin.top - margin.bottom);
        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([1, values.length]).range([0, innerW]);
        const y = d3.scaleLinear().domain([d3.min(values), d3.max(values)]).nice().range([innerH, 0]);

        // add light gray grid lines (x verticals and y horizontals) behind the data
        const xGrid2 = d3.axisBottom(x).ticks(Math.min(10, values.length)).tickSize(-innerH).tickFormat('');
        g.append('g').attr('class','grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid2).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-x').selectAll('.domain').remove();
        const yGrid2 = d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat('');
        g.append('g').attr('class','grid grid-y').call(yGrid2).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-y').selectAll('.domain').remove();

        // draw line
        const line = d3.line().x((d,i) => x(i+1)).y(d => y(d)).curve(d3.curveMonotoneX);
        g.append('path').datum(values).attr('fill','none').attr('stroke','#17becf').attr('stroke-width',2).attr('d', line);

        // draw circles for points
        g.selectAll('circle').data(values).enter().append('circle').attr('cx',(d,i) => x(i+1)).attr('cy', d => y(d)).attr('r',3).attr('fill','#17becf');

        const xAxis = d3.axisBottom(x).ticks(Math.min(10, values.length));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).append('text');
        const yAxis = d3.axisLeft(y).ticks(6);
        g.append('g').call(yAxis);
        // remove any domain paths (axis lines) to avoid stray vertical/horizontal lines
        g.selectAll('path.domain').remove();
        svg.append('text').attr('x',(margin.left + innerW/2)).attr('y', height-6).attr('text-anchor','middle').text(t('modalAnalogs.analogsList') || 'Analogues');
        svg.append('text').attr('transform','rotate(-90)').attr('x',-(margin.top + innerH/2)).attr('y',14).attr('text-anchor','middle').text(t('modalAnalogs.colCriteria') || 'Criteria');
    }, [criteriaValues, analogValues, t, renderTick, tabIndex]);

    return (
        <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="lg" sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '1100px'}}}>
            <DialogTitle sx={{pr:5}}>
                {t('distributionPlots.title') || 'Distribution plots'}
                <IconButton aria-label={t('modalAnalogs.close') || 'Close'} onClick={onClose} size="small" sx={{position:'absolute', right:8, top:8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{display:'grid', gridTemplateColumns: '1fr 2fr', gap:2}}>
                    <Box sx={{display:'flex', flexDirection:'column', gap:3}}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="dist-method-label">{t('modalAnalogs.method')}</InputLabel>
                            <Select variant="standard" labelId="dist-method-label" value={selectedMethodId ?? ''} label={t('modalAnalogs.method')}
                                    onChange={(e) => { setSelectedMethodId(e.target.value); setSelectedConfigId(null); }}>
                                {methodsLoading && <MenuItem value=""><em>{t('modalAnalogs.loading')}</em></MenuItem>}
                                {!methodsLoading && methodOptions.length === 0 && <MenuItem value=""><em>{t('modalAnalogs.noMethods')}</em></MenuItem>}
                                {methodOptions.map(m => (<MenuItem key={m.id} value={m.id}>{m.name || m.id}</MenuItem>))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="dist-config-label">{t('modalAnalogs.config')}</InputLabel>
                            <Select variant="standard" labelId="dist-config-label" value={selectedConfigId ?? ''} label={t('modalAnalogs.config')}
                                    onChange={(e) => setSelectedConfigId(e.target.value)} renderValue={(v) => {
                                        const cfg = configsForSelectedMethod.find(c => c.id === v);
                                        return cfg ? cfg.name || cfg.id : '';
                            }}>
                                {configsForSelectedMethod.length === 0 && <MenuItem value=""><em>{t('modalAnalogs.noConfigs')}</em></MenuItem>}
                                {configsForSelectedMethod.map(cfg => (<MenuItem key={cfg.id} value={cfg.id}>{cfg.name || cfg.id}</MenuItem>))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="dist-entity-label">{t('modalAnalogs.entity')}</InputLabel>
                            <Select variant="standard" labelId="dist-entity-label" value={selectedStationId ?? ''} label={t('modalAnalogs.entity')}
                                    onChange={(e) => setSelectedStationId(e.target.value)} MenuProps={{PaperProps: {style: {maxHeight: 320}}}}>
                                {stationsLoading && <MenuItem value=""><em>{t('modalAnalogs.loadingEntities')}</em></MenuItem>}
                                {!stationsLoading && stations.length === 0 && <MenuItem value=""><em>{t('modalAnalogs.noEntities')}</em></MenuItem>}
                                {stations.map(s => (<MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="dist-lead-label">{t('modalAnalogs.lead')}</InputLabel>
                            <Select variant="standard" labelId="dist-lead-label" value={selectedLead ?? ''} label={t('modalAnalogs.lead')} onChange={(e) => setSelectedLead(e.target.value === '' ? null : Number(e.target.value))}>
                                {leadsLoading && <MenuItem value=""><em>{t('modalAnalogs.loadingAnalogs')}</em></MenuItem>}
                                {!leadsLoading && leads.length === 0 && <MenuItem value=""><em>{t('modalAnalogs.noLeads') || 'No lead times'}</em></MenuItem>}
                                {leads.map(l => (<MenuItem key={String(l.lead) + (l.label || '')} value={l.lead}>{l.label || (l.lead != null ? `${l.lead}h` : '')}</MenuItem>))}
                            </Select>
                        </FormControl>

                        {tabIndex === 0 && (
                            <FormGroup>
                                <FormControlLabel control={<Checkbox checked={options.bestAnalogs} onChange={handleOptionChange('bestAnalogs')} size="small"/>} label={t('seriesModal.bestAnalogs')} />
                                <FormControlLabel control={<Checkbox checked={options.tenYearReturn} onChange={handleOptionChange('tenYearReturn')} size="small"/>} label={t('seriesModal.tenYearReturn')} />
                                <FormControlLabel control={<Checkbox checked={options.allReturnPeriods} onChange={handleOptionChange('allReturnPeriods')} size="small"/>} label={t('seriesModal.allReturnPeriods')} />
                            </FormGroup>
                        )}
                    </Box>
                    <Box sx={{borderLeft: '1px dashed #e0e0e0', pl:2, minHeight: 360}}>
                        <Tabs value={tabIndex} onChange={(e,v) => setTabIndex(v)}>
                            <Tab label={t('distributionPlots.predist') || 'Predictands distribution'} />
                            <Tab label={t('distributionPlots.critdist') || 'Criteria distribution'} />
                        </Tabs>
                        <TabPanel value={tabIndex} index={0}>
                            <Typography variant="subtitle1" sx={{mb:1}}>{t('distributionPlots.analogsPrecipTitle') || 'Analogs precipitation distribution'}</Typography>
                            <Box sx={{mt:1}}>
                                {analogLoading && <Box sx={{display:'flex', alignItems:'center', gap:1}}><CircularProgress size={20}/><Typography variant="caption">{t('modalAnalogs.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                                {analogError && <Typography variant="caption" sx={{color:'#b00020'}}>{t('modalAnalogs.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
                                {!analogLoading && !analogError && (!analogValues || (Array.isArray(analogValues) && analogValues.length === 0)) && (
                                    <Typography variant="caption" sx={{color: '#666'}}>{t('distributionPlots.noAnalogs') || 'No analog values for the selected method/config/entity/lead.'}</Typography>
                                )}
                                <div ref={precipRef} style={{width:'100%', height:360, minHeight:240}} />
                            </Box>
                        </TabPanel>
                        <TabPanel value={tabIndex} index={1}>
                            <Typography variant="subtitle1" sx={{mb:1}}>{t('distributionPlots.criteriaTitle') || 'Criteria distribution'}</Typography>
                            <Box sx={{mt:1}}>
                                {(criteriaLoading) && <Box sx={{display:'flex', alignItems:'center', gap:1}}><CircularProgress size={20}/><Typography variant="caption">{t('modalAnalogs.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                                {!criteriaLoading && (!criteriaValues || (Array.isArray(criteriaValues) && criteriaValues.length === 0)) && (
                                    <Typography variant="caption" sx={{color: '#666'}}>{t('distributionPlots.noCriteria') || 'No criteria values available for the selected selection.'}</Typography>
                                )}
                                <div ref={critRef} style={{width:'100%', height:360, minHeight:240}} />
                            </Box>
                        </TabPanel>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
