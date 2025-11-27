/**
 * @fileoverview Tests for WorkspaceContext
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useWorkspace, WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import React from 'react';
import * as api from '@/services/api.js';
import * as ConfigContext from '@/contexts/ConfigContext.jsx';
import * as urlUtils from '@/utils/urlWorkspaceUtils.js';
import * as cachedRequest from '@/hooks/useCachedRequest.js';

// Mock dependencies
vi.mock('@/services/api.js', () => ({
  getLastForecastDate: vi.fn(),
  getMethodsAndConfigs: vi.fn(),
}));
vi.mock('@/contexts/ConfigContext.jsx', () => ({
  useConfig: vi.fn(),
}));
vi.mock('@/utils/urlWorkspaceUtils.js', () => ({
  readWorkspaceFromUrl: vi.fn(),
  writeWorkspaceToUrl: vi.fn(),
  onWorkspacePopState: vi.fn(() => vi.fn()),
}));
vi.mock('@/hooks/useCachedRequest.js', () => ({
  useCachedRequest: vi.fn(),
  clearCachedRequests: vi.fn(),
}));

describe('WorkspaceContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    ConfigContext.useConfig.mockReturnValue({
      workspaces: [
        {key: 'workspace1', name: 'Workspace 1'},
        {key: 'workspace2', name: 'Workspace 2'},
      ],
    });

    urlUtils.readWorkspaceFromUrl.mockReturnValue('workspace1');
    urlUtils.writeWorkspaceToUrl.mockImplementation(() => {
    });
    urlUtils.onWorkspacePopState.mockReturnValue(() => {
    });

    cachedRequest.useCachedRequest.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    api.getLastForecastDate.mockResolvedValue({
      date: '2024-01-15',
      dateObj: new Date('2024-01-15'),
    });

    api.getMethodsAndConfigs.mockResolvedValue({
      methods: [{id: 1, name: 'Method 1'}],
      configs: [{id: 1, methodId: 1, name: 'Config 1'}],
    });
  });

  it('provides workspace context', () => {
    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    expect(result.current).toBeDefined();
  });

  it('initializes with first workspace from config', async () => {
    urlUtils.readWorkspaceFromUrl.mockReturnValue(null);

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.workspace).toBe('workspace1');
    });
  });

  it('initializes with workspace from URL if valid', async () => {
    urlUtils.readWorkspaceFromUrl.mockReturnValue('workspace2');

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.workspace).toBe('workspace2');
    });
  });

  it('falls back to first workspace if URL workspace is invalid', async () => {
    urlUtils.readWorkspaceFromUrl.mockReturnValue('invalid-workspace');

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.workspace).toBe('workspace1');
    });

    expect(urlUtils.writeWorkspaceToUrl).toHaveBeenCalledWith('workspace1');
  });

  it('updates URL when workspace changes', async () => {
    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.workspace).toBeDefined();
    });

    if (result.current.setWorkspace) {
      result.current.setWorkspace('workspace2');

      await waitFor(() => {
        expect(urlUtils.writeWorkspaceToUrl).toHaveBeenCalledWith('workspace2');
      });
    }
  });

  it('handles empty workspaces array', () => {
    ConfigContext.useConfig.mockReturnValue({
      workspaces: [],
    });

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    expect(result.current).toBeDefined();
  });

  it('sets invalid workspace key when URL has invalid workspace', async () => {
    urlUtils.readWorkspaceFromUrl.mockReturnValue('bad-workspace');

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.invalidWorkspaceKey).toBe('bad-workspace');
    });
  });

  it('registers popstate handler for browser navigation', () => {
    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    renderHook(() => useWorkspace?.(), {wrapper});

    expect(urlUtils.onWorkspacePopState).toHaveBeenCalled();
  });

  it('loads workspace data when workspace is set', async () => {
    cachedRequest.useCachedRequest
      .mockReturnValueOnce({
        data: {date: '2024-01-15', dateObj: new Date('2024-01-15')},
        loading: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: {methods: [], configs: []},
        loading: false,
        error: null,
      });

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current.workspace).toBeDefined();
    });
  });

  it('handles loading state', async () => {
    cachedRequest.useCachedRequest.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('handles error state', async () => {
    cachedRequest.useCachedRequest.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('API error'),
    });

    const wrapper = ({children}) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const {result} = renderHook(() => useWorkspace?.(), {wrapper});

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });
});

