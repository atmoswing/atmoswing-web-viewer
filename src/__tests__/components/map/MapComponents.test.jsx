/**
 * @fileoverview Smoke tests for Map components
 */

import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import MapLegend from '@/components/map/MapLegend.jsx';
import MapTooltip from '@/components/map/MapTooltip.jsx';

describe('MapLegend', () => {
  const mockLegendStops = [
    {color: '#0000ff', pct: 0},
    {color: '#00ff00', pct: 50},
    {color: '#ff0000', pct: 100}
  ];

  it('renders without crashing', () => {
    render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={100}
        dark={false}
        title="Test Legend"
      />
    );
    expect(screen.getByText('Test Legend')).toBeInTheDocument();
  });

  it('displays legend title', () => {
    render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={100}
        dark={false}
        title="Precipitation"
      />
    );
    expect(screen.getByText('Precipitation')).toBeInTheDocument();
  });

  it('displays scale labels', () => {
    render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={100}
        dark={false}
        title="Test"
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
    expect(screen.getByText('100.0')).toBeInTheDocument();
  });

  it('returns null when no legend stops provided', () => {
    const {container} = render(
      <MapLegend
        legendStops={[]}
        legendMax={100}
        dark={false}
        title="Test"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when legendStops is null', () => {
    const {container} = render(
      <MapLegend
        legendStops={null}
        legendMax={100}
        dark={false}
        title="Test"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('applies dark theme styles', () => {
    const {container} = render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={100}
        dark={true}
        title="Test"
      />
    );
    const legendDiv = container.firstChild;
    expect(legendDiv).toHaveStyle({color: '#fff'});
  });

  it('applies light theme styles', () => {
    const {container} = render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={100}
        dark={false}
        title="Test"
      />
    );
    const legendDiv = container.firstChild;
    expect(legendDiv).toHaveStyle({color: '#000'});
  });

  it('handles different legend max values', () => {
    render(
      <MapLegend
        legendStops={mockLegendStops}
        legendMax={200}
        dark={false}
        title="Test"
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100.0')).toBeInTheDocument();
    expect(screen.getByText('200.0')).toBeInTheDocument();
  });
});

describe('MapTooltip', () => {
  const mockTooltip = {
    x: 100,
    y: 200,
    name: 'Station A',
    valueRaw: 25.5
  };

  it('renders without crashing', () => {
    render(<MapTooltip tooltip={mockTooltip} label="Precipitation"/>);
    expect(screen.getByText('Station A')).toBeInTheDocument();
  });

  it('displays entity name', () => {
    render(<MapTooltip tooltip={mockTooltip} label="Precipitation"/>);
    expect(screen.getByText('Station A')).toBeInTheDocument();
  });

  it('displays value with label', () => {
    render(<MapTooltip tooltip={mockTooltip} label="Precipitation"/>);
    expect(screen.getByText(/Precipitation: 25.5 mm/)).toBeInTheDocument();
  });

  it('returns null when tooltip is null', () => {
    const {container} = render(<MapTooltip tooltip={null} label="Precipitation"/>);
    expect(container.firstChild).toBeNull();
  });

  it('handles NaN values', () => {
    const tooltipWithNaN = {
      ...mockTooltip,
      valueRaw: NaN
    };
    render(<MapTooltip tooltip={tooltipWithNaN} label="Precipitation"/>);
    expect(screen.getByText(/Precipitation: NaN mm/)).toBeInTheDocument();
  });

  it('handles null values', () => {
    const tooltipWithNull = {
      ...mockTooltip,
      valueRaw: null
    };
    render(<MapTooltip tooltip={tooltipWithNull} label="Precipitation"/>);
    expect(screen.getByText(/Precipitation: NaN mm/)).toBeInTheDocument();
  });

  it('positions tooltip at correct coordinates', () => {
    const {container} = render(<MapTooltip tooltip={mockTooltip} label="Precipitation"/>);
    const tooltipDiv = container.firstChild;
    expect(tooltipDiv).toHaveStyle({
      top: '212px',
      left: '112px'
    });
  });

  it('formats value to 1 decimal place', () => {
    const tooltipWithDecimal = {
      ...mockTooltip,
      valueRaw: 25.567
    };
    render(<MapTooltip tooltip={tooltipWithDecimal} label="Precipitation"/>);
    expect(screen.getByText(/Precipitation: 25.6 mm/)).toBeInTheDocument();
  });

  it('applies pointer-events: none style', () => {
    const {container} = render(<MapTooltip tooltip={mockTooltip} label="Precipitation"/>);
    const tooltipDiv = container.firstChild;
    expect(tooltipDiv).toHaveStyle({pointerEvents: 'none'});
  });
});

