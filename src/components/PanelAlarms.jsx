import Panel from './Panel';
import React from 'react';

export default function PanelAlarms(props) {
    const values = [
        {color: '#FFD700', date: '15.06'},
        {color: '#FFC300', date: '16.06'},
        {color: '#FFB000', date: '17.06'},
        {color: '#FF9500', date: '18.06'},
        {color: '#FF7F00', date: '19.06'},
        {color: '#FF5E13', date: '20.06'},
        {color: '#FF3B1F', date: '21.06'},
        {color: '#FF1A1A', date: '22.06'},
    ];
    const rows = [1, 2, 3];

    return (
        <Panel title="Alarms" defaultOpen={props.defaultOpen}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                <tr>
                    <th style={{ border: '0' }}></th>
                    {values.map((sq, i) => (
                        <th key={i} style={{ padding: '2px', border: '0', fontWeight: "normal" }}>
                            {sq.date}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((rowNum) => (
                    <tr key={rowNum}>
                        <td style={{ padding: '2px', border: '0', fontWeight: 'normal'}}>
                            {rowNum}
                        </td>
                        {values.map((val, colIdx) => (
                            <td
                                key={colIdx}
                                style={{
                                    width: 32,
                                    height: 24,
                                    padding: 0,
                                    border: '1px solid #ccc',
                                    background: val.color,
                                }}
                            />
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </Panel>
    );
}