/**
 * @module App
 * @description Main application component for AtmoSwing Web Viewer.
 * Sets up the overall layout with sidebar, toolbar, map viewer, and modals.
 */

import React, {lazy, memo, useCallback} from 'react';

import '@/styles/App.css'

import SideBar from '@/components/sidebar/SideBar.jsx';
import ToolBar from '@/components/toolbar/ToolBar.jsx';
import MapViewer from '@/components/map/MapViewer.jsx';
import AppSnackbars from '@/components/snackbars/AppSnackbars.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import LazyModalBoundary from '@/components/modals/common/LazyModalBoundary.jsx';
import {useModalFailureNotice} from '@/components/modals/hooks/useModalFailureNotice.js';
import {useSelectedEntity} from '@/contexts/forecast/ForecastsContext.jsx';

// Lazy load heavy modal component to reduce initial bundle size
const TimeSeriesModal = lazy(() => import('@/components/modals/TimeSeriesModal.jsx'));

/**
 * Memoized map area component to prevent unnecessary re-renders.
 * @returns {React.ReactElement}
 */
const MapArea = memo(function MapArea() {
  return (
    <main className="map-area">
      <MapViewer/>
    </main>
  );
});

/**
 * The time series modal behind its own boundary, so a chart that fails to render closes the
 * modal and reports it instead of replacing the whole app.
 *
 * Lives in its own component so that only it, not the whole app, re-renders when the selected
 * entity changes.
 *
 * @returns {React.ReactElement}
 */
function TimeSeriesModalArea() {
  const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
  const closeModal = useCallback(() => setSelectedEntityId(null), [setSelectedEntityId]);
  const notifyFailure = useModalFailureNotice(closeModal);

  // Keyed on the selection: picking another entity after a failure tries again.
  return (
    <LazyModalBoundary resetKey={selectedEntityId} onFailure={notifyFailure}>
      <TimeSeriesModal/>
    </LazyModalBoundary>
  );
}

/**
 * Root application component.
 *
 * Layout structure:
 * - Sidebar (left): Workspace selector, forecast controls, station list
 * - Main content (right):
 *   - Toolbar (top): Map tools and interaction controls
 *   - Map viewer: Interactive OpenLayers map
 * - Modals: Time series and distribution charts (lazy loaded)
 * - Snackbars: Notification system
 * - Error boundary: Catches and displays React errors; each modal also has its own, so a
 *   failing modal does not take the rest of the app with it
 *
 * @returns {React.ReactElement}
 */
export default function App() {
  return (
    <div className="app-layout">
      <ErrorBoundary>
        <SideBar/>
        <div className="main-content">
          <ToolBar/>
          <MapArea/>
          <TimeSeriesModalArea/>
        </div>
        <AppSnackbars/>
      </ErrorBoundary>
    </div>
  );
}
