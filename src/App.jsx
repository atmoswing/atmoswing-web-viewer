import React from 'react';

import './styles/App.css'

import SideBar from "./components/SideBar.jsx";
import ToolBar from "./components/ToolBar.jsx";
import MapViewer from "./components/MapViewer.jsx";
import {WorkspaceProvider} from './contexts/WorkspaceContext.jsx';
import {ForecastsProvider} from './contexts/ForecastsContext.jsx';
import ModalForecastSeries from './components/ModalForecastSeries.jsx';
import AppSnackbars from './components/AppSnackbars.jsx';

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
            <WorkspaceProvider>
                <ForecastsProvider>
                    <SideBar />
                    <div className="main-content">
                        <ToolBar />
                        <MapArea />
                        <ModalForecastSeries />
                    </div>
                    <AppSnackbars />
                </ForecastsProvider>
            </WorkspaceProvider>
        </div>
    );
}
