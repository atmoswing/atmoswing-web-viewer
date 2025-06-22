import React, { useState } from 'react';

import './styles/App.css'

import MapViewer from "./components/MapViewer.jsx";

import FrameDistributionsIcon from './assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from './assets/toolbar/frame_analogs.svg?react';
import PreferencesIcon from './assets/toolbar/preferences.svg?react';

import {SidebarWorkspaceDropdown} from './components/SidebarWorkspaceDropdown.jsx';
import PanelForecasts from "./components/PanelForecasts.jsx";
import PanelGisLayers from "./components/PanelGisLayers.jsx";
import PanelAlarms from "./components/PanelAlarms.jsx";
import PanelCaption from "./components/PanelCaption.jsx";
import PanelStations from "./components/PanelStations.jsx";
import PanelAnalogDates from "./components/PanelAnalogDates.jsx";

function SideBar() {
    const [workspaceSelected, workspaceSetSelected] = useState('zap');
    const workspaceOptions = [
        { value: 'zap', label: 'ZAP' },
        { value: 'adn', label: 'Alpes du Nord' },
        { value: 'laci', label: 'Loire-Allier-Cher-Indre' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="./logo.svg" alt="Logo"/>
            </div>
            <SidebarWorkspaceDropdown
                options={workspaceOptions}
                value={workspaceSelected}
                onChange={workspaceSetSelected}
            />
            <PanelForecasts defaultOpen={true}/>
            <PanelGisLayers defaultOpen={false}/>
            <PanelAlarms defaultOpen={true}/>
            <PanelStations defaultOpen={false}/>
            <PanelAnalogDates defaultOpen={false}/>
            <PanelCaption defaultOpen={true}/>
        </aside>
    );
}

function ToolBar() {
    return (
        <header className="toolbar">
            <button className="toolbar-icon-btn"><FrameDistributionsIcon /></button>
            <button className="toolbar-icon-btn"><FrameAnalogsIcon /></button>
            <button className="toolbar-icon-btn"><PreferencesIcon /></button>
        </header>
    );
}

function MapArea() {
    return (
        <main className="map-area">
            <MapViewer />
        </main>
    );
}

export default function App() {
    return (
        <div className="app-layout">
            <SideBar />
            <div className="main-content">
                <ToolBar />
                <MapArea />
            </div>
        </div>
    );
}
