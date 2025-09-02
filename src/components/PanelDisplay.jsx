import Panel from './Panel';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useForecastParameters } from '../contexts/ForecastsContext.jsx';

export default function PanelDisplay(props) {
    const { t } = useTranslation();
    const { percentile, setPercentile, normalizationRef, setNormalizationRef } = useForecastParameters();

    const handleChangeNormalizationRef = (event) => {
        const val = Number(event.target.value);
        setNormalizationRef(val);
    };
    const handleChangePercentile = (event) => {
        const val = Number(event.target.value);
        if (!Number.isNaN(val)) setPercentile(val);
    }

    return (
        <Panel title={t('panel.display')} defaultOpen={props.defaultOpen}>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 125 }}>
                <InputLabel id="select-display-label">{t('display.options')}</InputLabel>
                <Select
                    variant="standard"
                    labelId="select-display-label"
                    id="select-display"
                    value={normalizationRef}
                    onChange={handleChangeNormalizationRef}
                    label={t('display.options')}
                >
                    <MenuItem value={2}>P/P2</MenuItem>
                    <MenuItem value={5}>P/P5</MenuItem>
                    <MenuItem value={10}>P/P10</MenuItem>
                    <MenuItem value={20}>P/P20</MenuItem>
                    <MenuItem value={50}>P/P50</MenuItem>
                    <MenuItem value={100}>P/P100</MenuItem>
                </Select>
            </FormControl>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 125 }}>
                <InputLabel id="select-percentile-label">{t('display.percentile')}</InputLabel>
                <Select
                    variant="standard"
                    labelId="select-percentile-label"
                    id="select-percentile"
                    value={percentile}
                    onChange={handleChangePercentile}
                    label={t('display.percentile')}
                >
                    <MenuItem value={90}>q90</MenuItem>
                    <MenuItem value={60}>q60</MenuItem>
                    <MenuItem value={20}>q20</MenuItem>
                </Select>
            </FormControl>
        </Panel>
    );
}