/**
 * @module App
 * @description Main application component for AtmoSwing Web Viewer.
 * Sets up the overall layout with sidebar, toolbar, map viewer, and modals.
 */

import React, {lazy, memo, Suspense} from 'react';

import '@/styles/App.css'

import SideBar from '@/components/sidebar/SideBar.jsx';
import ToolBar from '@/components/toolbar/ToolBar.jsx';
import MapViewer from '@/components/map/MapViewer.jsx';
import AppSnackbars from '@/components/snackbars/AppSnackbars.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

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
 * Root application component.
 *
 * Layout structure:
 * - Sidebar (left): Workspace selector, forecast controls, station list
 * - Main content (right):
 *   - Toolbar (top): Map tools and interaction controls
 *   - Map viewer: Interactive OpenLayers map
 * - Modals: Time series and distribution charts (lazy loaded)
 * - Snackbars: Notification system
 * - Error boundary: Catches and displays React errors
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
          <Suspense fallback={null}>
            <TimeSeriesModal/>
          </Suspense>
        </div>
        <AppSnackbars/>
      </ErrorBoundary>
    </div>
  );
}
