import Panel from './Panel.jsx';
import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useEntities, useSelectedEntity } from '../../contexts/ForecastsContext.jsx';
import { useTranslation } from 'react-i18next';
import PanelStatus from './PanelStatus.jsx';

export default function PanelStations(props) {
    const { t } = useTranslation();
    const {entities, entitiesLoading, entitiesError} = useEntities();
    const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();

    // Ensure selection is valid for current entities list
    React.useEffect(() => {
        if (!entities || entities.length === 0) {
            if (selectedEntityId != null) setSelectedEntityId(null);
            return;
        }
        if (selectedEntityId != null && !entities.some(e => e.id === selectedEntityId)) {
            setSelectedEntityId(null);
        }
    }, [entities, selectedEntityId, setSelectedEntityId]);

    const validStation = React.useMemo(() => {
        if (!entities || entities.length === 0) return '';
        return selectedEntityId != null && entities.some(e => e.id === selectedEntityId) ? selectedEntityId : '';
    }, [entities, selectedEntityId]);

    // Memoize sorted entities by name (case-insensitive), fall back to id
    const sortedEntities = React.useMemo(() => {
        if (!entities || entities.length === 0) return [];
        return [...entities].sort((a, b) => {
            const aName = (a.name || a.id || '').toString().toLowerCase();
            const bName = (b.name || b.id || '').toString().toLowerCase();
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return 0;
        });
    }, [entities]);

    const handleChangeStation = (event) => {
        const val = event.target.value;
        setSelectedEntityId(val === '' ? null : val);
    };

    const disabled = entitiesLoading || !!entitiesError || !entities || entities.length === 0;

    if (entitiesLoading || entitiesError || !entities || entities.length === 0) {
        return (
            <Panel title={t('panel.stationSelection')} defaultOpen={props.defaultOpen}>
                <PanelStatus
                    loading={entitiesLoading}
                    error={!!entitiesError}
                    empty={!entitiesError && !entitiesLoading && (!entities || entities.length === 0)}
                    messages={{
                        loading: t('stations.loading'),
                        error: t('stations.errorLoading'),
                        empty: t('stations.select'),
                    }}
                />
            </Panel>
        );
    }

    return (
        <Panel title={t('panel.stationSelection')} defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{m: 1, width: 265}}>
                <Select
                    variant="standard"
                    id="select-station"
                    value={validStation}
                    onChange={handleChangeStation}
                    displayEmpty
                    disabled={disabled}
                    renderValue={(value) => {
                        if (value === '' || value == null) return entitiesLoading ? t('stations.loading') : (entitiesError ? t('stations.errorLoading') : t('stations.select'));
                        const match = entities?.find(e => e.id === value);
                        return match?.name || match?.id || value;
                    }}
                >
                    <MenuItem value="" disabled={entitiesLoading || !!entitiesError || entities.length === 0}>
                        {entitiesLoading ? t('stations.loading') : (entitiesError ? t('stations.errorLoading') : t('stations.select'))}
                    </MenuItem>
                    {sortedEntities.length > 0 && sortedEntities.map(entity => (
                        <MenuItem key={entity.id} value={entity.id}>{entity.name || entity.id}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Panel>
    );
}