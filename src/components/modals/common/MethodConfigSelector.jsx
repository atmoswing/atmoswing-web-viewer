/**
 * @module components/modals/common/MethodConfigSelector
 * @description Shared modal selection component to pick method, configuration, entity and lead time.
 * Handles chained data fetching, validity maintenance and relevance highlighting.
 */

import React, {useMemo} from 'react';
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
import {useMethodConfigOptions} from '../hooks/useMethodConfigOptions.js';
import {useSelectionDefaults} from '../hooks/useSelectionDefaults.js';

/**
 * MethodConfigSelector component.
 * @param {Object} props
 * @param {boolean} props.open - Whether the parent modal is open (controls fetching enablement)
 * @param {Object} props.value - Current selection state { methodId, configId, entityId, lead }
 * @param {Function} props.onChange - Callback receiving updated selection object
 * @param {React.ReactNode} [props.children] - Optional extra controls rendered beneath standard selectors
 * @returns {React.ReactElement}
 */
export default function MethodConfigSelector(
  {
    open,
    value = {},
    onChange,
    children
  }
) {
  const {t} = useTranslation();

  const {
    methodId: selectedMethodId,
    configId: selectedConfigId,
    entityId: selectedStationId,
    lead: selectedLead
  } = value;

  const {
    methodOptions,
    methodsLoading,
    methodsError,
    configsForSelectedMethod,
    stations,
    stationsLoading,
    stationsError,
    leads,
    leadsLoading,
    leadsError,
    relevantConfigIds
  } = useMethodConfigOptions({open, value});

  useSelectionDefaults({open, value, onChange, methodOptions, stations, leads});

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
    const relevant = !!relevantConfigIds.get(cfg.id);
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
  };

  const handleConfigChange = (e) => {
    onChange({...value, configId: e.target.value});
  };

  const handleEntityChange = (e) => {
    onChange({...value, entityId: e.target.value});
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
