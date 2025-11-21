/**
 * @fileoverview Tests for SelectedEntityContext
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {SelectedEntityProvider, useSelectedEntity} from '@/contexts/SelectedEntityContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';

// Mock dependencies
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('SelectedEntityContext', () => {
  const mockWorkspaceData = {
    __workspace: 'test',
    date: {last_forecast_date: '2024-01-01_12'},
    methodsAndConfigs: {methods: []}
  };

  const createWrapper = () => {
    return ({children}) => (
      <ConfigProvider>
        <WorkspaceProvider>
          <SelectedEntityProvider>
            {children}
          </SelectedEntityProvider>
        </WorkspaceProvider>
      </ConfigProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          workspaces: [{key: 'test', name: 'Test'}],
          workspace_data: mockWorkspaceData
        })
      })
    );
  });

  it('provides initial null selected entity', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    expect(result.current.selectedEntityId).toBe(null);
    expect(result.current.setSelectedEntityId).toBeTypeOf('function');
  });

  it('allows setting selected entity ID', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    act(() => {
      result.current.setSelectedEntityId(123);
    });

    expect(result.current.selectedEntityId).toBe(123);
  });

  it('allows clearing selected entity', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    act(() => {
      result.current.setSelectedEntityId(123);
    });

    expect(result.current.selectedEntityId).toBe(123);

    act(() => {
      result.current.setSelectedEntityId(null);
    });

    expect(result.current.selectedEntityId).toBe(null);
  });

  it('provides entity selection state management', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    // Initially null
    expect(result.current.selectedEntityId).toBe(null);

    // Can set an ID
    act(() => {
      result.current.setSelectedEntityId(123);
    });
    expect(result.current.selectedEntityId).toBe(123);

    // Can change the ID
    act(() => {
      result.current.setSelectedEntityId(456);
    });
    expect(result.current.selectedEntityId).toBe(456);

    // Can clear back to null
    act(() => {
      result.current.setSelectedEntityId(null);
    });
    expect(result.current.selectedEntityId).toBe(null);
  });

  it('handles string entity IDs', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    act(() => {
      result.current.setSelectedEntityId('station-1');
    });

    expect(result.current.selectedEntityId).toBe('station-1');
  });

  it('handles numeric entity IDs', () => {
    const {result} = renderHook(() => useSelectedEntity(), {wrapper: createWrapper()});

    act(() => {
      result.current.setSelectedEntityId(999);
    });

    expect(result.current.selectedEntityId).toBe(999);
  });
});

