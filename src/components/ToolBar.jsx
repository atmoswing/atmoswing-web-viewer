import React from 'react';

import FrameDistributionsIcon from '../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../assets/toolbar/frame_analogs.svg?react';
import PreferencesIcon from '../assets/toolbar/preferences.svg?react';

function ToolbarSquares() {
    const squares = [
        { color: '#FFD700', date: '15.06' },
        { color: '#FFC300', date: '16.06' },
        { color: '#FFB000', date: '17.06' },
        { color: '#FF9500', date: '18.06' },
        { color: '#FF7F00', date: '19.06' },
        { color: '#FF5E13', date: '20.06' },
        { color: '#FF3B1F', date: '21.06' },
        { color: '#FF1A1A', date: '22.06' },
    ];
    return (
        <div className="toolbar-left">
            {squares.map((sq, i) => (
                <div
                    key={i}
                    className="toolbar-square"
                    style={{ background: sq.color }}
                >
                    <span>{sq.date}</span>
                </div>
            ))}
        </div>
    );
}

function ToolbarCenter() {
    return (
        <div className="toolbar-center">
            <div>Prévision du 15.06.2025 00h</div>
            <div>Analogie circulation (4Zo) ARPEGE (4Zo-ARPGEPE)</div>
        </div>
    );
}

export default function ToolBar() {
    return (
        <header className="toolbar">
            <ToolbarSquares />
            <ToolbarCenter />
            <div className="toolbar-right">
                <button className="toolbar-icon-btn"><FrameDistributionsIcon /></button>
                <button className="toolbar-icon-btn"><FrameAnalogsIcon /></button>
                <button className="toolbar-icon-btn"><PreferencesIcon /></button>
            </div>
        </header>
    );
}