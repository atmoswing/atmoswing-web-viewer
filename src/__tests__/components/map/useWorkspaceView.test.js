/**
 * @fileoverview Tests for useWorkspaceView: the map starts on the workspace's area.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {transformExtent} from 'ol/proj';
import useWorkspaceView, {parseWorkspaceExtent, WORLD_VIEW} from '@/components/map/hooks/useWorkspaceView.js';
import {FIT_PADDING} from '@/components/map/mapConstants.js';

const FRANCE = [-5.5, 41.2, 10, 51.3];

const makeMap = (defined = false) => {
  const view = {
    fit: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    isDef: vi.fn(() => defined)
  };
  return {view, map: {getView: () => view, getSize: () => [800, 600]}};
};

const render = (props) => renderHook((p) => useWorkspaceView(p), {initialProps: props});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseWorkspaceExtent', () => {
  it('accepts a WGS84 [minLon, minLat, maxLon, maxLat] extent, numeric strings included', () => {
    expect(parseWorkspaceExtent(FRANCE)).toEqual(FRANCE);
    expect(parseWorkspaceExtent(['-5.5', '41.2', '10', '51.3'])).toEqual(FRANCE);
  });

  it.each([
    ['missing', undefined],
    ['not an array', 'France'],
    ['wrong length', [1, 2, 3]],
    ['not numeric', [1, 2, 'x', 4]],
    ['inverted', [10, 41, -5, 51]],
    ['projected coordinates', [100000, 6000000, 1200000, 7100000]]
  ])('rejects an extent that is %s', (_label, extent) => {
    expect(parseWorkspaceExtent(extent)).toBeNull();
  });
});

describe('useWorkspaceView', () => {
  const workspaces = [{key: 'fr', extent: FRANCE}, {key: 'other'}];

  it('waits for the map and for the workspace to be resolved', () => {
    const {view, map} = makeMap();
    const {rerender} = render({mapRef: {current: map}, mapReady: false, workspace: 'fr', workspaces});
    rerender({mapRef: {current: map}, mapReady: true, workspace: '', workspaces});
    expect(view.fit).not.toHaveBeenCalled();
    expect(view.setCenter).not.toHaveBeenCalled();
  });

  it('fits the view to the workspace extent, without animation', () => {
    const {view, map} = makeMap();
    render({mapRef: {current: map}, mapReady: true, workspace: 'fr', workspaces});
    expect(view.fit).toHaveBeenCalledTimes(1);
    const [target, options] = view.fit.mock.calls[0];
    expect(target).toEqual(transformExtent(FRANCE, 'EPSG:4326', 'EPSG:3857'));
    expect(options).toEqual({padding: FIT_PADDING, size: [800, 600]});
  });

  it('falls back to the world view when the workspace has no extent', () => {
    const {view, map} = makeMap();
    render({mapRef: {current: map}, mapReady: true, workspace: 'other', workspaces});
    expect(view.fit).not.toHaveBeenCalled();
    expect(view.setCenter).toHaveBeenCalledWith(WORLD_VIEW.center);
    expect(view.setZoom).toHaveBeenCalledWith(WORLD_VIEW.zoom);
  });

  it('keeps the current view when switching to a workspace without extent', () => {
    const {view, map} = makeMap(true);
    render({mapRef: {current: map}, mapReady: true, workspace: 'other', workspaces});
    expect(view.setCenter).not.toHaveBeenCalled();
  });

  it('falls back at once when no workspaces are configured', () => {
    const {view, map} = makeMap();
    render({mapRef: {current: map}, mapReady: true, workspace: '', workspaces: []});
    expect(view.setCenter).toHaveBeenCalledWith(WORLD_VIEW.center);
  });

  it('refits when the workspace changes, but not on a re-render with a new config object', () => {
    const {view, map} = makeMap();
    const mapRef = {current: map};
    const ws = [{key: 'fr', extent: FRANCE}, {key: 'east', extent: [5, 43, 8, 48]}];
    const {rerender} = render({mapRef, mapReady: true, workspace: 'fr', workspaces: ws});
    rerender({mapRef, mapReady: true, workspace: 'fr', workspaces: ws.map(w => ({...w}))});
    expect(view.fit).toHaveBeenCalledTimes(1);
    rerender({mapRef, mapReady: true, workspace: 'east', workspaces: ws});
    expect(view.fit).toHaveBeenCalledTimes(2);
  });

  it('warns about a malformed extent and falls back', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {view, map} = makeMap();
    render({mapRef: {current: map}, mapReady: true, workspace: 'bad', workspaces: [{key: 'bad', extent: [1, 2]}]});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/Workspace bad: ignoring extent \[1,2\]/);
    expect(view.setCenter).toHaveBeenCalledWith(WORLD_VIEW.center);
  });
});
