import { describe, it, expect } from 'vitest';
import config, { normalizeRuntimeConfig, updateConfig } from '@/config.js';

describe('config runtime normalization', () => {
  it('normalizes trailing slashes in API_BASE_URL', () => {
    const raw = { API_BASE_URL: 'https://example.com///' };
    const norm = normalizeRuntimeConfig(raw);
    expect(norm.API_BASE_URL).toBe('https://example.com');
  });

  it('coerces API_DEBUG truthy strings', () => {
    expect(normalizeRuntimeConfig({ API_DEBUG: 'yes' }).API_DEBUG).toBe(true);
    expect(normalizeRuntimeConfig({ API_DEBUG: 'on' }).API_DEBUG).toBe(true);
    expect(normalizeRuntimeConfig({ API_DEBUG: '1' }).API_DEBUG).toBe(true);
    expect(normalizeRuntimeConfig({ API_DEBUG: 'true' }).API_DEBUG).toBe(true);
  });

  it('sets API_DEBUG false for falsy/empty', () => {
    expect(normalizeRuntimeConfig({ API_DEBUG: '' }).API_DEBUG).toBe(false);
    expect(normalizeRuntimeConfig({}).API_DEBUG).toBe(false);
  });

  it('falls back ENTITIES_SOURCE_EPSG to EPSG:4326', () => {
    expect(normalizeRuntimeConfig({}).ENTITIES_SOURCE_EPSG).toBe('EPSG:4326');
  });

  it('passes arrays through or defaults to empty arrays', () => {
    const norm = normalizeRuntimeConfig({ workspaces: [{ key: 'demo' }], providers: [1], baseLayers: ['x'], overlayLayers: ['y'] });
    expect(norm.workspaces.length).toBe(1);
    expect(norm.providers.length).toBe(1);
    expect(norm.baseLayers.length).toBe(1);
    expect(norm.overlayLayers.length).toBe(1);
    const normEmpty = normalizeRuntimeConfig({});
    expect(normEmpty.workspaces).toEqual([]);
  });
});

describe('updateConfig', () => {
  it('mutates shared config object', () => {
    updateConfig({ API_BASE_URL: 'https://api.test', API_DEBUG: true });
    expect(config.API_BASE_URL).toBe('https://api.test');
    expect(config.API_DEBUG).toBe(true);
  });
});

