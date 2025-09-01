import Panel from './Panel';
import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useEntities, useSelectedEntity } from '../contexts/ForecastsContext.jsx';

export default function PanelStations(props) {
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

    const handleChangeStation = (event) => {
        const val = event.target.value;
        setSelectedEntityId(val === '' ? null : val);
    };

    const disabled = entitiesLoading || !!entitiesError || !entities || entities.length === 0;

    return (
        <Panel title="Station selection" defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{m: 1, width: 265}}>
                <Select
                    variant="standard"
                    id="select-station"
                    value={validStation}
                    onChange={handleChangeStation}
                    displayEmpty
                    disabled={disabled}
                    renderValue={(value) => {
                        if (value === '' || value == null) return entitiesLoading ? 'Loading stations…' : (entitiesError ? 'Error loading stations' : 'Select a station');
                        const match = entities?.find(e => e.id === value);
                        return match?.name || match?.id || value;
                    }}
                >
                    <MenuItem value="" disabled={entitiesLoading || !!entitiesError || entities.length === 0}>
                        {entitiesLoading ? 'Loading stations…' : (entitiesError ? 'Error loading stations' : 'Select a station')}
                    </MenuItem>
                    {entities && entities.length > 0 && entities.map(entity => (
                        <MenuItem key={entity.id} value={entity.id}>{entity.name || entity.id}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Panel>
    );
}