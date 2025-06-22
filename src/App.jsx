import React, { useState } from 'react';

import './styles/App.css'

import SideBar from "./components/SideBar.jsx";
import ToolBar from "./components/ToolBar.jsx";
import MapViewer from "./components/MapViewer.jsx";

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
