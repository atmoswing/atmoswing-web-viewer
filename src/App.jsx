import { React } from 'react'

import './styles/App.css'

import MapSelectIcon from './assets/toolbar/map_select.svg?react';
import MapZoomInIcon from './assets/toolbar/map_zoom_in.svg?react';
import MapZoomOutIcon from './assets/toolbar/map_zoom_out.svg?react';
import MapMoveIcon from './assets/toolbar/map_move.svg?react';
import MapFitIcon from './assets/toolbar/map_fit.svg?react';
import FrameDistributionsIcon from './assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from './assets/toolbar/frame_analogs.svg?react';
import PreferencesIcon from './assets/toolbar/preferences.svg?react';

import PanelForecasts from "./components/PanelForecasts.jsx";
import PanelGisLayers from "./components/PanelGisLayers.jsx";
import PanelAlarms from "./components/PanelAlarms.jsx";
import PanelCaption from "./components/PanelCaption.jsx";
import PanelStations from "./components/PanelStations.jsx";
import PanelAnalogDates from "./components/PanelAnalogDates.jsx";

function SideBar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src="./logo.svg" alt="Logo"/>
            </div>
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
            <button className="toolbar-icon-btn"><MapSelectIcon /></button>
            <button className="toolbar-icon-btn"><MapZoomInIcon /></button>
            <button className="toolbar-icon-btn"><MapZoomOutIcon /></button>
            <button className="toolbar-icon-btn"><MapMoveIcon /></button>
            <button className="toolbar-icon-btn"><MapFitIcon /></button>
            <button className="toolbar-icon-btn"><FrameDistributionsIcon /></button>
            <button className="toolbar-icon-btn"><FrameAnalogsIcon /></button>
            <button className="toolbar-icon-btn"><PreferencesIcon /></button>
        </header>
    );
}

function MapArea() {
    return (
        <main className="map-area">
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
