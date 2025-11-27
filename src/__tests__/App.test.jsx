/**
 * @fileoverview Smoke tests for App component
 */

import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import App from '@/App.jsx';

// Mock all child components
vi.mock('@/components/sidebar/SideBar.jsx', () => ({
  default: () => <div data-testid="sidebar">SideBar</div>
}));

vi.mock('@/components/toolbar/ToolBar.jsx', () => ({
  default: () => <div data-testid="toolbar">ToolBar</div>
}));

vi.mock('@/components/map/MapViewer.jsx', () => ({
  default: () => <div data-testid="map-viewer">MapViewer</div>
}));

vi.mock('@/components/snackbars/AppSnackbars.jsx', () => ({
  default: () => <div data-testid="snackbars">AppSnackbars</div>
}));

vi.mock('@/components/modals/TimeSeriesModal.jsx', () => ({
  default: () => <div data-testid="timeseries-modal">TimeSeriesModal</div>
}));

vi.mock('@/components/ErrorBoundary.jsx', () => ({
  default: ({children}) => <div data-testid="error-boundary">{children}</div>
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App/>);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('renders sidebar component', () => {
    render(<App/>);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders toolbar component', () => {
    render(<App/>);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('renders map viewer component', () => {
    render(<App/>);
    expect(screen.getByTestId('map-viewer')).toBeInTheDocument();
  });

  it('renders snackbars component', () => {
    render(<App/>);
    expect(screen.getByTestId('snackbars')).toBeInTheDocument();
  });

  it('wraps content in error boundary', () => {
    render(<App/>);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    const {container} = render(<App/>);
    const appLayout = container.querySelector('.app-layout');
    expect(appLayout).toBeInTheDocument();
  });

  it('has main content area', () => {
    const {container} = render(<App/>);
    const mainContent = container.querySelector('.main-content');
    expect(mainContent).toBeInTheDocument();
  });

  it('has map area', () => {
    const {container} = render(<App/>);
    const mapArea = container.querySelector('.map-area');
    expect(mapArea).toBeInTheDocument();
  });
});

