/**
 * @module components/modals/common/MethodConfigSelector
 * @description Shared modal selection component to pick method, configuration, entity and lead time.
 * Handles chained data fetching, validity maintenance and relevance highlighting.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import {useTranslation} from 'react-i18next';
import {useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {
  getEntities,
  getMethodsAndConfigs,
  getRelevantEntities,
  getSeriesValuesPercentiles
} from '@/services/api.js';
import {
  extractTargetDatesArray,
  normalizeEntitiesResponse,
  normalizeRelevantEntityIds
} from '@/utils/apiNormalization.js';
import {DEFAULT_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';
import {compareEntitiesByName, formatDateLabel} from '@/utils/formattingUtils.js';

/**
 * MethodConfigSelector component.
 * @param {Object} props
 * @param {string} [props.cachePrefix='modal_'] - Prefix for cache keys to avoid collisions across modals
 * @param {boolean} props.open - Whether the parent modal is open (controls fetching enablement)
 * @param {Object} props.value - Current selection state { methodId, configId, entityId, lead }
 * @param {Function} props.onChange - Callback receiving updated selection object
 * @param {React.ReactNode} [props.children] - Optional extra controls rendered beneath standard selectors
 * @returns {React.ReactElement}
 */
export default function MethodConfigSelector(
  {
    cachePrefix = 'modal_',
    open,
    value = {},
    onChange,
    children
  }
) {
  const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
  const {t} = useTranslation();

  const {
    methodId: selectedMethodId,
    configId: selectedConfigId,
    entityId: selectedStationId,
    lead: selectedLead
  } = value;

  // Relevant config highlighting: configId -> boolean
  const relevantRef = useRef(new Map());
  const [, setRelevantMapVersion] = useState(0);

  // METHODS via cached request
  const methodsCacheKey = open && workspace && activeForecastDate
    ? `${cachePrefix}methods|${workspace}|${activeForecastDate}`
    : null;
  const {data: methodsData, loading: methodsLoading, error: methodsError} = useCachedRequest(
    methodsCacheKey,
    async () => getMethodsAndConfigs(workspace, activeForecastDate),
    [workspace, activeForecastDate, open],
    {enabled: !!methodsCacheKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  // Default select first method/config when methodsData arrives
  useEffect(() => {
    if (!open || !methodsData?.methods?.length) return;
    const first = methodsData.methods[0];
    const updates = {};
    if (!selectedMethodId) updates.methodId = first.id;
    if (!selectedConfigId && first.configurations?.length) {
      updates.configId = first.configurations[0].id;
    }
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [methodsData, open, selectedMethodId, selectedConfigId, onChange, value]);

  // Ensure a config gets selected if method changes
  useEffect(() => {
    if (!methodsData?.methods || !selectedMethodId) return;
    const m = methodsData.methods.find(mm => mm.id === selectedMethodId);
    if (!m) return;
    if (!selectedConfigId && m.configurations?.length) {
      onChange({...value, configId: m.configurations[0].id});
    }
  }, [methodsData, selectedMethodId, selectedConfigId, onChange, value]);

  // Resolve config ID
  const resolvedConfig = useMemo(() => {
    if (!methodsData?.methods) return null;
    const m = methodsData.methods.find(mm => mm.id === selectedMethodId);
    if (!m) return null;
    return selectedConfigId || (m.configurations?.[0]?.id) || null;
  }, [methodsData, selectedMethodId, selectedConfigId]);

  // ENTITIES via cached request
  const entitiesCacheKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfig
    ? `${cachePrefix}entities|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfig}`
    : null;
  const {data: entitiesDataRaw, loading: stationsLoading, error: stationsError} = useCachedRequest(
    entitiesCacheKey,
    async () => {
      const resp = await getEntities(workspace, activeForecastDate, selectedMethodId, resolvedConfig);
      return normalizeEntitiesResponse(resp);
    },
    [workspace, activeForecastDate, selectedMethodId, resolvedConfig, open],
    {enabled: !!entitiesCacheKey, initialData: [], ttlMs: DEFAULT_TTL}
  );

  // Process and sort entities
  const stations = useMemo(() => {
    if (!Array.isArray(entitiesDataRaw)) return [];
    return [...entitiesDataRaw].sort(compareEntitiesByName);
  }, [entitiesDataRaw]);

  // Set default entity and maintain validity
  useEffect(() => {
    if (!open || !stations.length) return;
    const updates = {};
    if (selectedStationId == null) {
      // No entity selected, pick the first
      updates.entityId = stations[0].id;
    } else if (!stations.find(e => e.id === selectedStationId)) {
      // Previously selected entity is no longer available, pick the first
      updates.entityId = stations[0].id;
    }
    // Otherwise, keep the current selectedStationId (it's still valid)
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [stations, open, selectedStationId, onChange, value]);

  // LEADS via cached request (series percentiles)
  const leadsCacheKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfig && selectedStationId != null
    ? `${cachePrefix}leads|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfig}|${selectedStationId}`
    : null;
  const {data: leadsRaw, loading: leadsLoading, error: leadsError} = useCachedRequest(
    leadsCacheKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(
        workspace,
        activeForecastDate,
        selectedMethodId,
        resolvedConfig,
        selectedStationId
      );
      const rawDates = extractTargetDatesArray(resp);
      const baseDate = (forecastBaseDate && !isNaN(forecastBaseDate.getTime()))
        ? forecastBaseDate
        : (resp?.parameters?.forecast_date ? new Date(resp.parameters.forecast_date) : null);

      return rawDates.map(s => {
        let d = null;
        try {
          d = s ? new Date(s) : null;
          if (d && isNaN(d)) d = null;
        } catch {
          d = null;
        }
        const label = d ? formatDateLabel(d) : String(s);
        const leadNum = (d && baseDate && !isNaN(baseDate.getTime()))
          ? Math.round((d.getTime() - baseDate.getTime()) / 3600000)
          : null;
        return {lead: leadNum, date: d, label};
      }).filter(x => x.lead != null && !isNaN(x.lead));
    },
    [workspace, activeForecastDate, selectedMethodId, resolvedConfig, selectedStationId, forecastBaseDate, open],
    {enabled: !!leadsCacheKey, initialData: [], ttlMs: SHORT_TTL}
  );

  const leads = useMemo(() => Array.isArray(leadsRaw) ? leadsRaw : [], [leadsRaw]);

  // Set default lead and maintain validity
  useEffect(() => {
    if (!leads.length) return;
    const updates = {};
    if (selectedLead == null || selectedLead === '') {
      // No lead selected, pick the first
      updates.lead = leads[0].lead;
    } else if (!leads.find(l => l.lead === selectedLead)) {
      // Previously selected lead is no longer available, pick the first
      updates.lead = leads[0].lead;
    }
    // Otherwise, keep the current selectedLead (it's still valid)
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [leads, selectedLead, onChange, value]);

  // Cached relevance map (configId -> boolean) for selected entity
  const relevanceKey = open && workspace && activeForecastDate && selectedMethodId && selectedStationId != null
    ? `${cachePrefix}relevance|${workspace}|${activeForecastDate}|${selectedMethodId}|${selectedStationId}`
    : null;
  const {data: relevanceMap, loading: relevanceLoading} = useCachedRequest(
    relevanceKey,
    async () => {
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      if (!methodNode?.configurations) return {};
      const results = await Promise.all(
        methodNode.configurations.map(async cfg => {
          try {
            const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, cfg.id);
            const idsSet = normalizeRelevantEntityIds(resp);
            return [cfg.id, idsSet.has(selectedStationId)];
          } catch {
            return [cfg.id, false];
          }
        })
      );
      return Object.fromEntries(results);
    },
    [workspace, activeForecastDate, selectedMethodId, selectedStationId, methodsData, open],
    {enabled: !!relevanceKey && !!methodsData?.methods?.length, initialData: null, ttlMs: DEFAULT_TTL}
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

  const methodOptions = useMemo(() => methodsData?.methods || [], [methodsData]);

  const configsForSelectedMethod = useMemo(() => {
    const m = methodOptions.find(x => x.id === selectedMethodId);
    return m?.configurations || [];
  }, [methodOptions, selectedMethodId]);

  // Ensure selected values exist in available options, otherwise use empty string
  const safeMethodId = useMemo(() => {
    if (selectedMethodId == null) return '';
    return methodOptions.find(m => m.id === selectedMethodId) ? selectedMethodId : '';
  }, [selectedMethodId, methodOptions]);

  const safeConfigId = useMemo(() => {
    if (selectedConfigId == null) return '';
    return configsForSelectedMethod.find(c => c.id === selectedConfigId) ? selectedConfigId : '';
  }, [selectedConfigId, configsForSelectedMethod]);

  const safeStationId = useMemo(() => {
    if (selectedStationId == null) return '';
    return stations.find(s => s.id === selectedStationId) ? selectedStationId : '';
  }, [selectedStationId, stations]);

  const safeLead = useMemo(() => {
    if (selectedLead == null) return '';
    return leads.find(l => l.lead === selectedLead) ? selectedLead : '';
  }, [selectedLead, leads]);

  // Render helpers
  const renderConfigLabel = (cfg) => {
    const relevant = !!relevantRef.current.get(cfg.id);
    return (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
        <ListItemText primary={cfg.name || cfg.id}/>
        {relevant && (
          <Typography variant="caption" sx={{color: 'primary.main', fontWeight: 600}}>
            ({t('detailsAnalogsModal.relevant')})
          </Typography>
        )}
      </Box>
    );
  };

  const handleMethodChange = (e) => {
    const newMethodId = e.target.value;
    const newMethod = methodOptions.find(m => m.id === newMethodId);

    // Keep current config if it exists in the new method's configurations, otherwise reset
    const configStillValid = newMethod?.configurations?.some(c => c.id === selectedConfigId);

    onChange({
      ...value,
      methodId: newMethodId,
      configId: configStillValid ? selectedConfigId : null
    });
    relevantRef.current.clear();
    setRelevantMapVersion(v => v + 1);
  };

  const handleConfigChange = (e) => {
    onChange({...value, configId: e.target.value});
  };

  const handleEntityChange = (e) => {
    onChange({...value, entityId: e.target.value});
    setRelevantMapVersion(v => v + 1);
  };

  const handleLeadChange = (e) => {
    onChange({...value, lead: e.target.value});
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      <FormControl fullWidth size="small">
        <InputLabel id="selector-method-label">{t('detailsAnalogsModal.method')}</InputLabel>
        <Select
          variant="standard"
          labelId="selector-method-label"
          value={safeMethodId}
          label={t('detailsAnalogsModal.method')}
          onChange={handleMethodChange}
        >
          {methodsLoading && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.loading')}</em>
            </MenuItem>
          )}
          {!methodsLoading && methodOptions.length === 0 && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.noMethods')}</em>
            </MenuItem>
          )}
          {methodOptions.map(m => (
            <MenuItem key={m.id} value={m.id}>
              {m.name || m.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="selector-config-label">{t('detailsAnalogsModal.config')}</InputLabel>
        <Select
          variant="standard"
          labelId="selector-config-label"
          value={safeConfigId}
          label={t('detailsAnalogsModal.config')}
          onChange={handleConfigChange}
          renderValue={(v) => {
            const cfg = configsForSelectedMethod.find(c => c.id === v);
            return cfg ? cfg.name || cfg.id : '';
          }}
        >
          {configsForSelectedMethod.length === 0 && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.noConfigs')}</em>
            </MenuItem>
          )}
          {configsForSelectedMethod.map(cfg => (
            <MenuItem key={cfg.id} value={cfg.id}>
              {renderConfigLabel(cfg)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="selector-entity-label">{t('detailsAnalogsModal.entity')}</InputLabel>
        <Select
          variant="standard"
          labelId="selector-entity-label"
          value={safeStationId}
          label={t('detailsAnalogsModal.entity')}
          onChange={handleEntityChange}
          MenuProps={{PaperProps: {style: {maxHeight: 320}}}}
        >
          {stationsLoading && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.loadingEntities')}</em>
            </MenuItem>
          )}
          {!stationsLoading && stations.length === 0 && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.noEntities')}</em>
            </MenuItem>
          )}
          {stations.map(s => (
            <MenuItem key={s.id} value={s.id}>
              {s.name || s.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="selector-lead-label">{t('detailsAnalogsModal.lead')}</InputLabel>
        <Select
          variant="standard"
          labelId="selector-lead-label"
          value={safeLead}
          label={t('detailsAnalogsModal.lead')}
          onChange={handleLeadChange}
        >
          {leadsLoading && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.loadingAnalogs')}</em>
            </MenuItem>
          )}
          {!leadsLoading && leads.length === 0 && (
            <MenuItem value="">
              <em>{t('detailsAnalogsModal.noLeads') || 'No lead times'}</em>
            </MenuItem>
          )}
          {leads.map(l => (
            <MenuItem
              key={String(l.lead) + (l.label || '')}
              value={l.lead}
            >
              {l.label || (l.lead != null ? `${l.lead}h` : '')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Loading/Error indicators */}
      {methodsError && (
        <Typography variant="caption" sx={{color: '#b00020'}}>
          {t('detailsAnalogsModal.errorLoadingMethods')}
        </Typography>
      )}
      {methodsLoading && (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
          <CircularProgress size={18}/>
          <Typography variant="caption">{t('detailsAnalogsModal.loadingMethods')}</Typography>
        </Box>
      )}
      {stationsError && (
        <Typography variant="caption" sx={{color: '#b00020'}}>
          {t('detailsAnalogsModal.errorLoadingEntities') || 'Failed to load entities'}
        </Typography>
      )}
      {stationsLoading && (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
          <CircularProgress size={18}/>
          <Typography variant="caption">{t('detailsAnalogsModal.loadingEntities')}</Typography>
        </Box>
      )}
      {leadsError && (
        <Typography variant="caption" sx={{color: '#b00020'}}>
          {t('detailsAnalogsModal.errorLoadingLeads') || 'Failed to load leads'}
        </Typography>
      )}

      {/* Additional custom controls */}
      {children}
    </Box>
  );
}

/**
 * Hook returning resolved selection data (with fallback config if none explicitly chosen).
 * @param {string} cachePrefix - Cache key namespace prefix
 * @param {boolean} open - Whether owning modal is open
 * @param {Object} selection - Raw selection { methodId, configId, entityId }
 * @returns {Object} Object with resolvedMethodId, resolvedConfigId, resolvedEntityId
 * @example
 * const { resolvedMethodId, resolvedConfigId } = useModalSelectionData('dist_', open, selection);
 */
export function useModalSelectionData(cachePrefix, open, selection) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {methodId, configId, entityId} = selection;

  // Re-compute resolvedConfig
  const methodsCacheKey = open && workspace && activeForecastDate
    ? `${cachePrefix}methods|${workspace}|${activeForecastDate}`
    : null;
  const {data: methodsData} = useCachedRequest(
    methodsCacheKey,
    async () => getMethodsAndConfigs(workspace, activeForecastDate),
    [workspace, activeForecastDate, open],
    {enabled: !!methodsCacheKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  const resolvedConfig = useMemo(() => {
    if (!methodsData?.methods) return configId || null;
    const m = methodsData.methods.find(mm => mm.id === methodId);
    return configId || (m?.configurations?.[0]?.id) || null;
  }, [methodsData, methodId, configId]);

  return {
    resolvedMethodId: methodId,
    resolvedConfigId: resolvedConfig,
    resolvedEntityId: entityId
  };
}
