import Panel from './Panel';
import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';

const columns = [
    { field: 'id', headerName: 'Rank', width: 75 },
    { field: 'date', headerName: 'Date', width: 95, sortable: false },
    { field: 'criteria', headerName: 'Criteria', width: 95 },
];

const rows = [
    {id: 1, date: '13.11.1986', criteria: 39.30},
    {id: 2, date: '21.10.1977', criteria: 39.77},
    {id: 3, date: '05.04.1992', criteria: 38.95},
    {id: 4, date: '17.08.1983', criteria: 38.60},
    {id: 5, date: '29.12.1990', criteria: 38.10},
    {id: 6, date: '11.03.1975', criteria: 37.85},
    {id: 7, date: '23.07.1988', criteria: 37.40},
    {id: 8, date: '02.01.1995', criteria: 37.05},
    {id: 9, date: '14.09.1981', criteria: 36.80},
    {id: 10, date: '26.06.1979', criteria: 36.50},
    {id: 11, date: '08.11.1993', criteria: 36.10},
    {id: 12, date: '20.02.1985', criteria: 35.90},
    {id: 13, date: '01.05.1991', criteria: 35.60},
    {id: 14, date: '13.08.1978', criteria: 35.20},
    {id: 15, date: '25.12.1982', criteria: 34.95},
    {id: 16, date: '06.03.1994', criteria: 34.60},
    {id: 17, date: '18.07.1980', criteria: 34.30},
    {id: 18, date: '30.10.1987', criteria: 33.95},
    {id: 19, date: '11.01.1976', criteria: 33.60},
    {id: 20, date: '23.04.1996', criteria: 33.20}
];

const paginationModel = { page: 0, pageSize: 10 };

export default function PanelAnalogDates(props) {
    return (
        <Panel title="Analog dates" defaultOpen={props.defaultOpen}>
            <Paper sx={{ height: 410, width: '100%' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    initialState={{ pagination: { paginationModel } }}
                    disableColumnMenu={true}
                    rowHeight={30}
                    pageSizeOptions={[5, 10]}
                    sx={{ border: 0 }}
                />
            </Paper>
        </Panel>
    );
}