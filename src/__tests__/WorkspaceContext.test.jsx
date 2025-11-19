import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext.jsx';

vi.mock('@/contexts/ConfigContext.jsx', () => ({ useConfig: () => ({ workspaces: [ { key: 'ws1', name: 'Workspace 1' }, { key: 'ws2', name: 'Workspace 2' } ] }) }));
vi.mock('@/services/api.js', () => ({ getLastForecastDate: vi.fn(async () => ({ last_forecast_date: '2025-11-01' })), getMethodsAndConfigs: vi.fn(async () => ({ methods: [{ id: 1, name: 'M' }] })) }));
vi.mock('@/hooks/useCachedRequest.js', () => ({ useCachedRequest: (key) => ({ data: key?.includes('last_date') ? { last_forecast_date: '2025-11-01' } : null, loading: false, error: null }), clearCachedRequests: vi.fn() }));
vi.mock('@/utils/urlWorkspaceUtils.js', () => ({ readWorkspaceFromUrl: vi.fn(() => ''), writeWorkspaceToUrl: vi.fn(), onWorkspacePopState: vi.fn(() => () => {}) }));

function Consumer() { const ctx = useWorkspace(); return <div data-testid="ws">{ctx.workspace}:{ctx.workspaceData?.date?.last_forecast_date}</div>; }

describe.skip('WorkspaceContext (smoke)', () => {
  it('initializes with first workspace and exposes last forecast date', () => {
    render(<WorkspaceProvider><Consumer /></WorkspaceProvider>);
    const el = screen.getByTestId('ws');
    expect(el.textContent).toContain('ws1');
    expect(el.textContent).toContain('2025-11-01');
  });
});
