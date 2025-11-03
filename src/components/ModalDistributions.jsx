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
    Tab,
    Button,
    Menu
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {useForecastSession} from '../contexts/ForecastSessionContext.jsx';
import {getMethodsAndConfigs, getEntities, getAnalogValues, getAnalogyCriteria, getSeriesValuesPercentiles, getAnalogValuesPercentiles, getReferenceValues, getRelevantEntities} from '../services/api.js';
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
    const [options, setOptions] = useState({ bestAnalogs: false, tenYearReturn: true, allReturnPeriods: false });
    const [bestAnalogsData, setBestAnalogsData] = useState(null);
    const [percentileMarkers, setPercentileMarkers] = useState(null); // map percentile -> value
    const [referenceValues, setReferenceValues] = useState(null); // { axis:number[], values:number[] }
    // trigger to force chart redraw on resize/tab change
    const [renderTick, setRenderTick] = useState(0);

    // Relevant config highlighting: configId -> boolean (like ModalAnalogs)
    const relevantRef = useRef(new Map());
    const [, setRelevantMapVersion] = useState(0);
    const relevanceReqRef = useRef(0);

    const methodsReqRef = useRef(0);
    const stationsReqRef = useRef(0);

    // chart refs
    const precipRef = useRef(null);
    const critRef = useRef(null);

    // Export menu state
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const openExportMenu = (e) => setExportAnchorEl(e.currentTarget);
    const closeExportMenu = () => setExportAnchorEl(null);

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

    // Fetch leads similar to ModalAnalogs
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
                })
                .filter(x => x.lead != null && !isNaN(x.lead) && x.lead >= 0)
                .sort((a,b) => a.lead - b.lead);
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
            relevantRef.current.clear();
            setRelevantMapVersion(v => v + 1);
        }
    }, [open]);

    const methodOptions = useMemo(() => (methodsData?.methods || []), [methodsData]);
    const configsForSelectedMethod = useMemo(() => {
        const m = methodOptions.find(x => x.id === selectedMethodId);
        return m?.configurations || [];
    }, [methodOptions, selectedMethodId]);

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
                let arr;
                if (Array.isArray(resp)) arr = resp;
                else if (resp && Array.isArray(resp.analogs)) arr = resp.analogs;
                else if (resp && Array.isArray(resp.analog_values)) arr = resp.analog_values;
                else if (resp && Array.isArray(resp.values)) arr = resp.values;
                else if (resp && Array.isArray(resp.data)) arr = resp.data;
                else if (resp && Array.isArray(resp.items)) arr = resp.items;
                else arr = [];

                const values = arr.map((it, i) => {
                    if (it == null) return { rank: i+1, date: null, value: null, criteria: null };
                    if (typeof it === 'number') return { rank: i+1, date: null, value: it, criteria: null };
                    const rank = it.rank ?? it.analog ?? (i+1);
                    const date = it.date ?? it.analog_date ?? it.dt ?? it.target_date ?? null;
                    const v = (it.value != null) ? it.value : (it.precip_value != null ? it.precip_value : (it.value_mm != null ? it.value_mm : (it.amount != null ? it.amount : null)));
                    const criteria = it.criteria ?? it.score ?? it.criterion ?? it.crit ?? null;
                    if (v == null) {
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

    // Fetch 20/60/90 percentiles for markers
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPercentileMarkers(null);
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) return;
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) return;
            try {
                const resp = await getAnalogValuesPercentiles(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead, [20,60,90]);
                if (cancelled) return;
                let pcts = []; let vals = [];
                if (resp) {
                    if (Array.isArray(resp.percentiles) && Array.isArray(resp.values)) { pcts = resp.percentiles; vals = resp.values; }
                    else if (Array.isArray(resp.items)) { pcts = resp.items.map(it => it.percentile); vals = resp.items.map(it => it.value); }
                }
                const map = {};
                if (Array.isArray(pcts) && Array.isArray(vals)) {
                    for (let i = 0; i < pcts.length; i++) {
                        const p = Number(pcts[i]);
                        const v = Number(vals[i]);
                        if (Number.isFinite(p) && Number.isFinite(v)) map[p] = v;
                    }
                }
                if (Object.keys(map).length) setPercentileMarkers(map);
            } catch {
            }
        })();
        return () => { cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

    // Derive 10 best analogs from already loaded analogValues when option enabled
    useEffect(() => {
        setBestAnalogsData(null);
        if (!options.bestAnalogs) return;
        const list = Array.isArray(analogValues) ? analogValues : [];
        if (!list.length) return;
        // Prefer sorting by criteria (ascending = better) if available, otherwise by rank ascending
        const withCriteria = list.filter(a => a && a.criteria != null && isFinite(Number(a.criteria)) && a.value != null && isFinite(Number(a.value)));
        const withValue = list.filter(a => a && a.value != null && isFinite(Number(a.value)));
        let selected;
        if (withCriteria.length >= 10) {
            selected = [...withCriteria].sort((a,b) => Number(a.criteria) - Number(b.criteria)).slice(0,10);
        } else {
            selected = [...withValue].sort((a,b) => (Number(a.rank ?? Infinity) - Number(b.rank ?? Infinity))).slice(0,10);
        }
        if (selected.length) {
            setBestAnalogsData(selected.map(a => ({ rank: a.rank, value: Number(a.value) })));
        }
    }, [options.bestAnalogs, analogValues]);

    // Remove old best-analogs fetching effect
    // useEffect(() => { /* removed: now derived from analogValues */ }, []);

    // Fetch return period reference values
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setReferenceValues(null);
            if (!(options.tenYearReturn || options.allReturnPeriods)) return;
            if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId) return;
            const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
            const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
            if (!cfgId) return;
            try {
                const resp = await getReferenceValues(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId);
                if (cancelled) return;
                if (resp && Array.isArray(resp.reference_axis) && Array.isArray(resp.reference_values) && resp.reference_axis.length === resp.reference_values.length) {
                    const axis = resp.reference_axis.map(Number);
                    const values = resp.reference_values.map(Number);
                    setReferenceValues({ axis, values });
                }
            } catch {
            }
        })();
        return () => { cancelled = true; };
    }, [options.tenYearReturn, options.allReturnPeriods, open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, methodsData]);

    // Export helpers
    const safeForFilename = (s) => {
        if (!s) return 'unknown';
        let out = String(s)
            .normalize('NFKD')
            .replace(' - ', '_')
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
        out = Array.from(out).map(ch => (ch.charCodeAt(0) < 32 ? '_' : ch)).join('');
        return out.replace(/^_+|_+$/g, '');
    };
    const stationName = useMemo(() => {
        const match = stations?.find(s => s.id === selectedStationId);
        return match?.name || match?.id || selectedStationId || '';
    }, [stations, selectedStationId]);
    const buildExportFilenamePrefix = () => {
        let datePart = '';
        if (activeForecastDate) {
            try { const d = new Date(activeForecastDate); if (d && !isNaN(d)) datePart = d3.timeFormat('%Y-%m-%d')(d); } catch { /* ignore */ }
        }
        const entityPart = safeForFilename(stationName || 'entity');
        const methodIdPart = (methodsData?.methods?.find(m => m.id === selectedMethodId)?.id) || 'method';
        const safeMethod = safeForFilename(methodIdPart);
        const leadPart = (selectedLead != null) ? `L${selectedLead}` : '';
        const tabPart = tabIndex === 0 ? 'distribution' : 'criteria';
        return [datePart, entityPart, safeMethod, leadPart, tabPart].filter(Boolean).join('_');
    };
    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const inlineAllStyles = (svg) => {
        const recurse = (el) => {
            if (!(el instanceof Element)) return;
            try {
                const cs = getComputedStyle(el);
                const styleProps = ['fill','stroke','stroke-width','stroke-opacity','fill-opacity','font-size','font-family','font-weight','opacity','text-anchor','stroke-linecap','stroke-linejoin','stroke-dasharray','background','background-color'];
                let inline = '';
                styleProps.forEach(p => { const v = cs.getPropertyValue(p); if (v) inline += `${p}:${v};`; });
                if (inline) el.setAttribute('style', (el.getAttribute('style') || '') + inline);
            } catch { /* ignore */ }
            for (let i=0;i<el.children.length;i++) recurse(el.children[i]);
        };
        recurse(svg);
    };
    const getSVGSize = (svg) => {
        const widthAttr = svg.getAttribute('width');
        const heightAttr = svg.getAttribute('height');
        const viewBoxAttr = svg.getAttribute('viewBox');
        if (widthAttr && heightAttr) { const w = parseFloat(widthAttr); const h = parseFloat(heightAttr); if (Number.isFinite(w) && Number.isFinite(h)) return {width:w, height:h}; }
        if (viewBoxAttr) { const p = viewBoxAttr.split(/[\s,]+/).map(Number); if (p.length===4 && p.every(Number.isFinite)) return {width:p[2], height:p[3]}; }
        return {width: svg.clientWidth || 800, height: svg.clientHeight || 600};
    };
    const withTemporaryContainer = (clone, cb) => {
        const container = document.createElement('div'); container.style.position='fixed'; container.style.left='-9999px'; container.style.top='0'; container.style.width='0'; container.style.height='0'; container.appendChild(clone); document.body.appendChild(container);
        try { try { inlineAllStyles(clone); } catch { /* ignore */ } return cb && cb(); } finally { document.body.removeChild(container); }
    };
    const findCurrentChartSVG = () => {
        const el = tabIndex === 0 ? precipRef.current : critRef.current;
        return el ? el.querySelector('svg') : null;
    };
    const exportSVG = () => {
        const svg = findCurrentChartSVG(); if (!svg) return;
        const clone = svg.cloneNode(true); clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
        const serializer = new XMLSerializer();
        withTemporaryContainer(clone, () => {
            const svgStr = serializer.serializeToString(clone);
            downloadBlob(new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'}), `${buildExportFilenamePrefix() || 'distribution'}.svg`);
        });
        closeExportMenu();
    };
    const exportPNG = async () => {
        const svg = findCurrentChartSVG(); if (!svg) return;
        const clone = svg.cloneNode(true); clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
        const {width, height} = getSVGSize(clone);
        const serializer = new XMLSerializer(); let svgStr;
        withTemporaryContainer(clone, () => { svgStr = serializer.serializeToString(clone); });
        const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        try {
            const img = new Image(); img.crossOrigin='anonymous';
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
            const scale = 3; const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width*scale)); canvas.height = Math.max(1, Math.round(height*scale));
            const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
            downloadBlob(blob, `${buildExportFilenamePrefix() || 'distribution'}.png`);
        } catch(e) { console.error('Export PNG failed', e); }
        finally { URL.revokeObjectURL(url); closeExportMenu(); }
    };
    const exportPDF = async () => {
        const svg = findCurrentChartSVG(); if (!svg) return;
        let jsPDFLib, svg2pdfModule;
        try { jsPDFLib = await import('jspdf'); svg2pdfModule = await import('svg2pdf.js'); } catch(e) { console.error('Failed to load PDF libraries', e); closeExportMenu(); return; }
        const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib;
        const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default || svg2pdfModule;
        if (!jsPDF || !svg2pdf) { closeExportMenu(); return; }
        const clone = svg.cloneNode(true); clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
        const container = document.createElement('div'); container.style.position='fixed'; container.style.left='-9999px'; container.style.top='0'; container.appendChild(clone); document.body.appendChild(container);
        try {
            try { inlineAllStyles(clone); } catch { /* ignore */ }
            let {width: svgW, height: svgH} = getSVGSize(clone);
            try {
                const bbox = clone.getBBox();
                if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width>0 && bbox.height>0) {
                    const pad = 2; svgW = bbox.width + 2*pad; svgH = bbox.height + 2*pad; clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${svgW} ${svgH}`);
                } else { clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`); }
            } catch { clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`); }
            clone.setAttribute('width', String(Math.round(svgW))); clone.setAttribute('height', String(Math.round(svgH)));
            const pdf = new jsPDF({unit:'px', format:[Math.round(svgW), Math.round(svgH)], orientation: svgW>svgH ? 'landscape' : 'portrait'});
            await svg2pdf(clone, pdf, {x:0, y:0, width: Math.round(svgW), height: Math.round(svgH)});
            pdf.save(`${buildExportFilenamePrefix() || 'distribution'}.pdf`);
        } catch(e) { console.error('Export PDF (vector) failed', e); }
        finally { document.body.removeChild(container); closeExportMenu(); }
    };

    // Draw precipitation distribution
    useEffect(() => {
        const container = precipRef.current;
        d3.select(container).selectAll('*').remove();
        if (!container) return;
        const data = analogValues || [];
        if (!data.length) return;

        const values = data.map(d => (d && d.value != null) ? d.value : null)
            .filter(v => v != null && isFinite(Number(v)))
            .map(v => Number(v))
            .sort((a,b) => a - b);
        if (!values.length) return;

        const width = container.clientWidth || 700;
        const height = Math.max(240, container.clientHeight || 320);
        const margin = {top: 28, right: 40, bottom: 40, left: 56};
        const innerW = Math.max(10, width - margin.left - margin.right);
        const innerH = Math.max(40, height - margin.top - margin.bottom);

        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
        // centered, exportable title
        try {
            const methodIdStr = selectedMethodId ? String(selectedMethodId) : '';
            const cfgStr = selectedConfigId ? String(selectedConfigId) : '';
            const leadMatch = Array.isArray(leads) ? leads.find(l => l.lead === selectedLead) : null;
            const tgt = leadMatch?.date && !isNaN(leadMatch.date) ? leadMatch.date : null;
            const fmt = d3.timeFormat('%Y-%m-%d');
            const tgtStr = tgt ? fmt(tgt) : (selectedLead != null ? `L${selectedLead}` : '');
            let fcDate = null; try { fcDate = activeForecastDate ? new Date(activeForecastDate) : null; if (fcDate && isNaN(fcDate)) fcDate = null; } catch { fcDate = null; }
            const fcStr = fcDate ? fmt(fcDate) : '';
            const foText = fcStr ? t('toolbar.forecastOf', {date: fcStr}) : '';
            const parts = [(stationName || ''), methodIdStr, cfgStr].filter(Boolean);
            const rightPart = [tgtStr, foText ? `(${foText})` : ''].filter(Boolean).join(' ');
            if (rightPart) parts.push(rightPart);
            const titleText = parts.join(' — ');
            svg.append('text').attr('x', margin.left + innerW / 2).attr('y', Math.max(12, margin.top - 12)).attr('text-anchor', 'middle').attr('fill', '#222').attr('font-size', 14).attr('font-weight', 600).text(titleText);
        } catch {}

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const overlayXs = [];
        if (percentileMarkers) [20,60,90].forEach(p => { const v = percentileMarkers[p]; if (Number.isFinite(Number(v))) overlayXs.push(Number(v)); });
        // Only include reference values that will actually be drawn
        if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
            const allowed = new Set();
            if (options.tenYearReturn) allowed.add(10);
            if (options.allReturnPeriods) SELECTED_RPS.forEach(rp => allowed.add(rp));
            if (allowed.size > 0) {
                referenceValues.axis.forEach((rp, i) => {
                    const rpn = Number(rp);
                    const val = Number(referenceValues.values[i]);
                    if (allowed.has(rpn) && Number.isFinite(val)) overlayXs.push(val);
                });
            }
        }
        if (bestAnalogsData && Array.isArray(bestAnalogsData)) bestAnalogsData.forEach(b => { if (Number.isFinite(Number(b?.value))) overlayXs.push(Number(b.value)); });
        const rawMax = Math.max(...values, ...(overlayXs.length ? overlayXs : [0]));
        const xMax = (rawMax != null && rawMax > 0) ? rawMax * 1.05 : 1;
        const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]).nice();

        const size = values.length;
        const irep = 0.44;
        const nrep = 0.12;
        const divisor = 1.0 / (size + nrep);
        const cum = values.map((v, i) => ({ x: v, y: Math.max(0, Math.min(1, (i + 1.0 - irep) * divisor)) }));

        const yCum = d3.scaleLinear().domain([0,1]).range([innerH,0]);

        const xGrid = d3.axisBottom(x).ticks(8).tickSize(-innerH).tickFormat('');
        g.append('g').attr('class','grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-x').selectAll('.domain').remove();
        const yGrid = d3.axisLeft(yCum).ticks(5).tickSize(-innerW).tickFormat('');
        g.append('g').attr('class','grid grid-y').call(yGrid).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-y').selectAll('.domain').remove();

        const line = d3.line().x(d => x(d.x)).y(d => yCum(d.y)).curve(d3.curveMonotoneX);
        g.append('path').datum(cum).attr('fill','none').attr('stroke','#1f77b4').attr('stroke-width',2).attr('d', line);
        g.selectAll('.cum-point').data(cum).enter().append('circle').attr('class','cum-point').attr('cx', d => x(d.x)).attr('cy', d => yCum(d.y)).attr('r', 3).attr('fill', '#1f77b4');

        if (percentileMarkers) {
            const labelColor = '#333';
            [20,60,90].forEach(p => {
                const xv = percentileMarkers[p];
                if (!Number.isFinite(Number(xv))) return;
                const cx = x(Number(xv));
                const cy = yCum(p/100);
                g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 7).attr('fill', '#00000000').attr('stroke', '#444').attr('stroke-width', 1);
                g.append('text').attr('x', cx + 8).attr('y', cy + 8).attr('fill', labelColor).attr('font-size', 12).attr('font-weight', 600).text(`q${p}`);
            });
        }

        if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
            if (options.tenYearReturn) {
                const idx10 = referenceValues.axis.findIndex(a => Number(a) === 10);
                if (idx10 >= 0) {
                    const val10 = referenceValues.values[idx10];
                    if (Number.isFinite(val10)) {
                        const xPos = x(Number(val10));
                        g.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH).attr('stroke', TENYR_COLOR).attr('stroke-width', 2);
                        g.append('text')
                            .attr('x', xPos + 2)
                            .attr('y', innerH - 2)
                            .attr('font-size', 11)
                            .attr('fill', TENYR_COLOR)
                            .attr('text-anchor', 'left')
                            .attr('dominant-baseline', 'text-after-edge')
                            .text('P10');
                    }
                }
            }
            if (options.allReturnPeriods) {
                const rpMap = new Map();
                referenceValues.axis.forEach((rp, i) => { const v = referenceValues.values[i]; if (Number.isFinite(Number(v))) rpMap.set(Number(rp), Number(v)); });
                const toDraw = SELECTED_RPS.filter(rp => rpMap.has(rp));
                const asc = toDraw.slice().sort((a,b) => a - b);
                const n = asc.length;
                asc.forEach((rp, idx) => {
                    const val = rpMap.get(rp);
                    const xPos = x(val);
                    const ratio = n > 1 ? (idx / (n - 1)) : 0;
                    const gVal = Math.round(255 - ratio * 255);
                    const clr = `rgb(255, ${gVal}, 0)`;
                    g.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH).attr('stroke', clr).attr('stroke-width', 2).attr('stroke-opacity', 0.95);
                    g.append('text')
                        .attr('x', xPos + 2)
                        .attr('y', innerH - 2)
                        .attr('font-size', 11)
                        .attr('fill', clr)
                        .attr('text-anchor', 'left')
                        .attr('dominant-baseline', 'text-after-edge')
                        .text(`P${rp}`);
                });
            }
        }

        if (options.bestAnalogs && bestAnalogsData && bestAnalogsData.length) {
            const violet = '#7b2cbf';
            const avals = bestAnalogsData.map(b => Number(b.value)).filter(v => Number.isFinite(v)).sort((a,b) => a - b);
            if (avals.length) {
                const N = avals.length; const irepB = 0.44; const nrepB = 0.12; const divB = 1.0 / (N + nrepB);
                const curve = avals.map((v,i) => ({ x: v, y: Math.max(0, Math.min(1, (i + 1.0 - irepB) * divB)) }));
                const lineB = d3.line().x(d => x(d.x)).y(d => yCum(d.y)).curve(d3.curveMonotoneX);
                g.append('path').datum(curve).attr('fill','none').attr('stroke', violet).attr('stroke-width', 2).attr('d', lineB);
                g.selectAll('.best-point').data(curve).enter().append('circle').attr('class','best-point').attr('cx', d => x(d.x)).attr('cy', d => yCum(d.y)).attr('r', 3).attr('fill', violet);
            }
        }

        const xAxis = d3.axisBottom(x).ticks(8);
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
        svg.append('text').attr('x',(margin.left + innerW/2)).attr('y', height-6).attr('text-anchor','middle').text(t('seriesModal.precipitation') || 'Precipitation [mm]');

        const yAxisLeft = d3.axisLeft(yCum).ticks(5).tickFormat(d3.format('.2f'));
        g.append('g').call(yAxisLeft);
        svg.append('text').attr('transform','rotate(-90)').attr('x',-(margin.top + innerH/2)).attr('y',12).attr('text-anchor','middle').text(t('distributionPlots.cumulativeFrequency') || 'Cumulative frequency');
        g.selectAll('path.domain').remove();

    }, [analogValues, t, renderTick, tabIndex, percentileMarkers, bestAnalogsData, referenceValues, options.tenYearReturn, options.allReturnPeriods, options.bestAnalogs]);

    // Draw criteria distribution
    useEffect(() => {
        const container = critRef.current;
        d3.select(container).selectAll('*').remove();
        if (!container) return;
        const raw = (criteriaValues && criteriaValues.length) ?
            criteriaValues.map(d => (d && d.value != null) ? d.value : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) :
            (analogValues ? analogValues.map(a => (a && a.criteria != null) ? a.criteria : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) : []);
        if (!raw.length) return;
        const values = [...raw].sort((a,b) => a-b);
        const width = container.clientWidth || 700;
        const height = Math.max(220, container.clientHeight || 300);
        const margin = {top: 28, right: 20, bottom: 40, left: 56};
        const innerW = Math.max(10, width - margin.left - margin.right);
        const innerH = Math.max(40, height - margin.top - margin.bottom);
        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
        // centered, exportable title
        try {
            const methodIdStr = selectedMethodId ? String(selectedMethodId) : '';
            const cfgStr = selectedConfigId ? String(selectedConfigId) : '';
            const leadMatch = Array.isArray(leads) ? leads.find(l => l.lead === selectedLead) : null;
            const tgt = leadMatch?.date && !isNaN(leadMatch.date) ? leadMatch.date : null;
            const fmt = d3.timeFormat('%Y-%m-%d');
            const tgtStr = tgt ? fmt(tgt) : (selectedLead != null ? `L${selectedLead}` : '');
            let fcDate = null; try { fcDate = activeForecastDate ? new Date(activeForecastDate) : null; if (fcDate && isNaN(fcDate)) fcDate = null; } catch { fcDate = null; }
            const fcStr = fcDate ? fmt(fcDate) : '';
            const foText = fcStr ? t('toolbar.forecastOf', {date: fcStr}) : '';
            const parts = [(stationName || ''), methodIdStr, cfgStr].filter(Boolean);
            const rightPart = [tgtStr, foText ? `(${foText})` : ''].filter(Boolean).join(' ');
            if (rightPart) parts.push(rightPart);
            const titleText = parts.join(' — ');
            svg.append('text').attr('x', margin.left + innerW / 2).attr('y', Math.max(12, margin.top - 12)).attr('text-anchor', 'middle').attr('fill', '#222').attr('font-size', 14).attr('font-weight', 600).text(titleText);
        } catch {}

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([1, values.length]).range([0, innerW]);
        const y = d3.scaleLinear().domain([d3.min(values), d3.max(values)]).nice().range([innerH, 0]);

        const xGrid2 = d3.axisBottom(x).ticks(Math.min(10, values.length)).tickSize(-innerH).tickFormat('');
        g.append('g').attr('class','grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid2).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-x').selectAll('.domain').remove();
        const yGrid2 = d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat('');
        g.append('g').attr('class','grid grid-y').call(yGrid2).selectAll('line').attr('stroke','#eaeaea').attr('stroke-width',1);
        g.select('.grid.grid-y').selectAll('path.domain').remove();

        const line = d3.line().x((d,i) => x(i+1)).y(d => y(d)).curve(d3.curveMonotoneX);
        g.append('path').datum(values).attr('fill','none').attr('stroke','#17becf').attr('stroke-width',2).attr('d', line);
        g.selectAll('circle').data(values).enter().append('circle').attr('cx',(d,i) => x(i+1)).attr('cy', d => y(d)).attr('r',3).attr('fill','#17becf');

        const xAxis = d3.axisBottom(x).ticks(Math.min(10, values.length));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).append('text');
        const yAxis = d3.axisLeft(y).ticks(6);
        g.append('g').call(yAxis);
        g.selectAll('path.domain').remove();
        svg.append('text').attr('x',(margin.left + innerW/2)).attr('y', height-6).attr('text-anchor','middle').text(t('modalAnalogs.analogsList') || 'Analogues');
        svg.append('text').attr('transform','rotate(-90)').attr('x',-(margin.top + innerH/2)).attr('y',14).attr('text-anchor','middle').text(t('modalAnalogs.colCriteria') || 'Criteria');
    }, [criteriaValues, analogValues, t, renderTick, tabIndex]);

    // When station changes, compute which configs for the selected method are relevant to that station (like ModalAnalogs)
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
                    if (Array.isArray(resp)) {
                        ids = (typeof resp[0] === 'object') ? resp.map(r => r.id ?? r.entity_id).filter(v => v != null) : resp;
                    } else if (resp && typeof resp === 'object') {
                        ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
                    }
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
        const timer = setTimeout(run, 120);
        return () => { clearTimeout(timer); cancelled = true; };
    }, [open, workspace, activeForecastDate, selectedMethodId, selectedStationId, methodsData]);

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
                                    onChange={(e) => { setSelectedMethodId(e.target.value); setSelectedConfigId(null); relevantRef.current.clear(); setRelevantMapVersion(v=>v+1); }}>
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
                                        return cfg ? (cfg.name || cfg.id) : '';
                            }}>
                                {configsForSelectedMethod.length === 0 && <MenuItem value=""><em>{t('modalAnalogs.noConfigs')}</em></MenuItem>}
                                {configsForSelectedMethod.map(cfg => (
                                    <MenuItem key={cfg.id} value={cfg.id}>
                                        <Box sx={{display:'flex', alignItems:'center', gap:1}}>
                                            <Typography component="span">{cfg.name || cfg.id}</Typography>
                                            {!!relevantRef.current.get(cfg.id) && (
                                                <Typography variant="caption" sx={{color:'primary.main', fontWeight:600}}>({t('modalAnalogs.relevant')})</Typography>
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
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

                        {/* Export button */}
                        <Box sx={{display:'flex', justifyContent:'center', mt:1}}>
                            <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={openExportMenu} aria-controls={exportAnchorEl ? 'export-menu' : undefined} aria-haspopup="true">
                                {t('seriesModal.export')}
                            </Button>
                            <Menu id="export-menu" anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={closeExportMenu} anchorOrigin={{vertical:'bottom', horizontal:'left'}}>
                                <MenuItem onClick={exportPNG}>PNG</MenuItem>
                                <MenuItem onClick={exportSVG}>SVG</MenuItem>
                                <MenuItem onClick={exportPDF}>PDF</MenuItem>
                            </Menu>
                        </Box>
                    </Box>
                    <Box sx={{borderLeft: '1px dashed #e0e0e0', pl:2, minHeight: 360}}>
                        <Tabs value={tabIndex} onChange={(e,v) => setTabIndex(v)}>
                            <Tab label={t('distributionPlots.predist') || 'Predictands distribution'} />
                            <Tab label={t('distributionPlots.critdist') || 'Criteria distribution'} />
                        </Tabs>
                        <TabPanel value={tabIndex} index={0}>
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
