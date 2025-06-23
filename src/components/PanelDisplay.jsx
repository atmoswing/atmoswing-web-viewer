import Panel from './Panel';
import * as React from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function PanelDisplay(props) {
    const [display, setDisplay] = React.useState(10);
    const [percentile, setPercentile] = React.useState(90);

    const handleChangeDisplay = (event) => {
        setDisplay(event.target.value);
    };
    const handleChangePercentile = (event) => {
        setPercentile(event.target.value);
    }

    return (
        <Panel title="Display" defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 125 }}>
                <InputLabel id="select-display-label">Display Options</InputLabel>
                <Select
                    labelId="select-display-label"
                    id="select-display"
                    value={display}
                    onChange={handleChangeDisplay}
                    label="Display Options"
                >
                    <MenuItem value={-1}>Value</MenuItem>
                    <MenuItem value={2}>P/P2</MenuItem>
                    <MenuItem value={5}>P/P5</MenuItem>
                    <MenuItem value={10}>P/P10</MenuItem>
                    <MenuItem value={20}>P/P20</MenuItem>
                    <MenuItem value={50}>P/P50</MenuItem>
                    <MenuItem value={100}>P/P100</MenuItem>
                </Select>
            </FormControl>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 125 }}>
                <InputLabel id="select-percentile-label">Percentile</InputLabel>
                <Select
                    labelId="select-percentile-label"
                    id="select-percentile"
                    value={percentile}
                    onChange={handleChangePercentile}
                    label="Percentile"
                >
                    <MenuItem value={90}>q90</MenuItem>
                    <MenuItem value={60}>q60</MenuItem>
                    <MenuItem value={20}>q20</MenuItem>
                </Select>
            </FormControl>
        </Panel>
    );
}