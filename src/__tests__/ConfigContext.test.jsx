/**
 * @fileoverview Tests for ConfigContext
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import * as configModule from '@/config.js';

// Mock the config module
vi.mock('@/config.js', () => ({
  default: {
    API_BASE_URL: 'http://localhost:3000',
    DEFAULT_WORKSPACE: 'test'
  },
  normalizeRuntimeConfig: vi.fn((json) => json),
  updateConfig: vi.fn()
}));

describe('ConfigProvider', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('renders children without crashing', () => {
    fetchSpy.mockResolvedValue({
      json: async () => ({workspaces: []})
    });

    render(
      <ConfigProvider>
        <div>Test Child</div>
      </ConfigProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('fetches config.json on mount', async () => {
    const mockConfig = {
      workspaces: [{key: 'test', name: 'Test'}],
      API_BASE_URL: 'http://api.example.com'
    };

    fetchSpy.mockResolvedValue({
      json: async () => mockConfig
    });

    render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/config.json', {cache: 'no-store'});
    });
  });

  it('calls normalizeRuntimeConfig on successful fetch', async () => {
    const mockConfig = {workspaces: []};

    fetchSpy.mockResolvedValue({
      json: async () => mockConfig
    });

    render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(configModule.normalizeRuntimeConfig).toHaveBeenCalledWith(mockConfig);
    });
  });

  it('calls updateConfig after normalization', async () => {
    const mockConfig = {workspaces: []};

    fetchSpy.mockResolvedValue({
      json: async () => mockConfig
    });

    render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(configModule.updateConfig).toHaveBeenCalled();
    });
  });

  it('handles fetch errors gracefully', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    // Should not throw
    render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('handles JSON parse errors gracefully', async () => {
    fetchSpy.mockResolvedValue({
      json: async () => {
        throw new Error('Invalid JSON');
      }
    });

    // Should not throw
    render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('cancels fetch on unmount', async () => {
    fetchSpy.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({json: async () => ({})}), 100))
    );

    const {unmount} = render(
      <ConfigProvider>
        <div>Content</div>
      </ConfigProvider>
    );

    unmount();

    // Wait to ensure no errors occur
    await new Promise(resolve => setTimeout(resolve, 150));
  });

  it('renders multiple children', () => {
    fetchSpy.mockResolvedValue({
      json: async () => ({})
    });

    render(
      <ConfigProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </ConfigProvider>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});

