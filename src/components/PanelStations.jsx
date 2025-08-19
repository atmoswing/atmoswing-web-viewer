import Panel from './Panel';
import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {useForecasts} from '../ForecastsContext.jsx';

export default function PanelStations(props) {
    const {entities} = useForecasts();
    const [station, setStation] = React.useState('');
    const handleChangeStation = (event) => {
        setStation(event.target.value);
    };

    return (
        <Panel title="Station selection" defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{m: 1, width: 265}}>
                <Select
                    id="select-station"
                    value={station}
                    onChange={handleChangeStation}
                >
                    {entities && entities.length > 0 ? (
                        entities.map(entity => (
                            <MenuItem key={entity.id} value={entity.id}>{entity.name || entity.id}</MenuItem>
                        ))
                    ) : (
                        <MenuItem value="" disabled>No stations available</MenuItem>
                    )}
                </Select>
            </FormControl>
        </Panel>
    );
}