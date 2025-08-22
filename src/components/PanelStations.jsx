import Panel from './Panel';
import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {useForecasts} from '../ForecastsContext.jsx';

export default function PanelStations(props) {
    const {entities, entitiesLoading, entitiesError} = useForecasts();
    const [station, setStation] = React.useState('');

    // Ensure station value is always valid for current entities list (eager reset)
    React.useEffect(() => {
        if (!entities || entities.length === 0) {
            if (station !== '') setStation('');
            return;
        }
        if (!entities.some(e => e.id === station)) {
            setStation('');
        }
    }, [entities, station]);

    const validStation = React.useMemo(() => {
        if (!entities || entities.length === 0) return '';
        return entities.some(e => e.id === station) ? station : '';
    }, [entities, station]);

    const handleChangeStation = (event) => {
        setStation(event.target.value);
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
                        if (!value) return entitiesLoading ? 'Loading stations…' : (entitiesError ? 'Error loading stations' : 'Select a station');
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