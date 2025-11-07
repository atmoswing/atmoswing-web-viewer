import React from 'react';

import './styles/App.css'

import SideBar from "./components/sidebar/SideBar.jsx";
import ToolBar from "./components/toolbar/ToolBar.jsx";
import MapViewer from "./components/map/MapViewer.jsx";
import {WorkspaceProvider} from './contexts/WorkspaceContext.jsx';
import {ForecastsProvider} from './contexts/ForecastsContext.jsx';
import ModalForecastSeries from './components/modals/ModalForecastSeries.jsx';
import AppSnackbars from './components/AppSnackbars.jsx';
import {SnackbarProvider} from './contexts/SnackbarContext.jsx';

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
            <SnackbarProvider>
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
            </SnackbarProvider>
        </div>
    );
}
