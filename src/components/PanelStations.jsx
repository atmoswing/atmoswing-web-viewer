import Panel from './Panel';
import * as React from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function PanelStations(props) {
    const [station, setStation] = React.useState('');
    const handleChangeStation = (event) => {
        setStation(event.target.value);
    };

    return (
        <Panel title="Station selection" defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{ m: 1, width: 265 }}>
                <Select
                    id="select-station"
                    value={station}
                    onChange={handleChangeStation}
                >
                    <MenuItem value={1}>Ain supérieur</MenuItem>
                    <MenuItem value={2}>Meuse aval</MenuItem>
                    <MenuItem value={3}>Sarre aval</MenuItem>
                </Select>
            </FormControl>
        </Panel>
    );
}