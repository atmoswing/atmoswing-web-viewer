import React, {lazy, memo, Suspense} from 'react';

import '@/styles/App.css'

import SideBar from '@/components/sidebar/SideBar.jsx';
import ToolBar from '@/components/toolbar/ToolBar.jsx';
import MapViewer from '@/components/map/MapViewer.jsx';
import AppSnackbars from '@/components/snackbars/AppSnackbars.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

// Lazy heavy modal
const ModalForecastSeries = lazy(() => import('@/components/modals/ModalForecastSeries.jsx'));

const MapArea = memo(function MapArea() {
  return (
    <main className="map-area">
      <MapViewer/>
    </main>
  );
});

export default function App() {
  return (
    <div className="app-layout">
      <ErrorBoundary>
        <SideBar/>
        <div className="main-content">
          <ToolBar/>
          <MapArea/>
          <Suspense fallback={null}>
            <ModalForecastSeries/>
          </Suspense>
        </div>
        <AppSnackbars/>
      </ErrorBoundary>
    </div>
  );
}
