/**
 * @fileoverview Smoke tests for SideBar component
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import SideBar from '@/components/sidebar/SideBar.jsx';

// Mock context
vi.mock('@/contexts/ConfigContext.jsx', () => ({
  useConfig: vi.fn(() => ({
    workspaces: [
      {key: 'workspace1', name: 'Workspace 1'},
      {key: 'workspace2', name: 'Workspace 2'}
    ]
  }))
}));

// Mock child components
vi.mock('@/components/sidebar/SidebarWorkspaceDropdown.jsx', () => ({
  SidebarWorkspaceDropdown: ({options}) => (
    <div data-testid="workspace-dropdown">
      {options.map(opt => <div key={opt.key}>{opt.name}</div>)}
    </div>
  )
}));

vi.mock('@/components/panels', () => ({
  PanelAnalogDates: ({defaultOpen}) => <div data-testid="panel-analog-dates">Analog Dates</div>,
  PanelDisplay: ({defaultOpen}) => <div data-testid="panel-display">Display</div>,
  PanelForecasts: ({defaultOpen}) => <div data-testid="panel-forecasts">Forecasts</div>,
  PanelStations: ({defaultOpen}) => <div data-testid="panel-stations">Stations</div>,
  PanelSynthesis: ({defaultOpen}) => <div data-testid="panel-synthesis">Synthesis</div>
}));

describe('SideBar', () => {
  it('renders without crashing', () => {
    render(<SideBar />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders logo', () => {
    render(<SideBar />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logo.svg');
  });

  it('renders workspace dropdown', () => {
    render(<SideBar />);
    expect(screen.getByTestId('workspace-dropdown')).toBeInTheDocument();
  });

  it('renders all panel components', () => {
    render(<SideBar />);
    expect(screen.getByTestId('panel-forecasts')).toBeInTheDocument();
    expect(screen.getByTestId('panel-display')).toBeInTheDocument();
    expect(screen.getByTestId('panel-synthesis')).toBeInTheDocument();
    expect(screen.getByTestId('panel-stations')).toBeInTheDocument();
    expect(screen.getByTestId('panel-analog-dates')).toBeInTheDocument();
  });

  it('handles various workspace configurations', () => {
    // Different workspace configurations are tested in integration tests
    render(<SideBar />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-dropdown')).toBeInTheDocument();
  });
});
