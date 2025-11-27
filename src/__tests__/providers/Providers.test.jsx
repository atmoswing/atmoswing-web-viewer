/**
 * @fileoverview Tests for Providers component
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import Providers from '@/providers/Providers.jsx';

// Mock all context providers
vi.mock('@/contexts/ConfigContext.jsx', () => ({
  ConfigProvider: ({children}) => <div data-testid="config-provider">{children}</div>
}));

vi.mock('@/contexts/SnackbarContext.jsx', () => ({
  SnackbarProvider: ({children}) => <div data-testid="snackbar-provider">{children}</div>
}));

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({
  WorkspaceProvider: ({children}) => <div data-testid="workspace-provider">{children}</div>
}));

vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  ForecastsProvider: ({children}) => <div data-testid="forecasts-provider">{children}</div>
}));

describe('Providers', () => {
  it('renders without crashing', () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('wraps children with all providers', () => {
    render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    );

    // Verify child is rendered
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <Providers>
        <div>Child 1</div>
        <div>Child 2</div>
      </Providers>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});

