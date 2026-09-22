/**
 * @fileoverview Tests for the modal selection defaults: which method, entity, configuration and
 * lead a selection settles on, and in particular that the configuration is the one the entity is
 * relevant to.
 */

import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

import {resolveSelection, useSelectionDefaults} from '@/components/modals/hooks/useSelectionDefaults.js';

const METHODS = [
  {id: 'm1', configurations: [{id: 'north'}, {id: 'south'}]},
  {id: 'm2', configurations: [{id: 'other'}]}
];
// In display (name) order. Each entity is relevant to exactly one configuration, as in the API.
const STATIONS = [{id: 1, name: 'Alpha'}, {id: 2, name: 'Bravo'}, {id: 3, name: 'Charlie'}];
const RELEVANCE = new Map([['north', new Set([3])], ['south', new Set([1, 2])]]);
const LEADS = [{lead: 0}, {lead: 24}];

const EMPTY = {methodId: null, configId: null, configPinned: false, entityId: null, lead: null};
const OPTIONS = {methodOptions: METHODS, stations: STATIONS, leads: LEADS, relevance: RELEVANCE};

describe('resolveSelection', () => {
  it('leaves the selection alone until the methods are known', () => {
    expect(resolveSelection(EMPTY, {...OPTIONS, methodOptions: []})).toBe(EMPTY);
  });

  it('opens on the first entity and the configuration it is relevant to, not the first one', () => {
    expect(resolveSelection(EMPTY, OPTIONS)).toEqual({
      methodId: 'm1', configId: 'south', configPinned: false, entityId: 1, lead: 0
    });
  });

  it('uses the configuration relevant to a given entity', () => {
    expect(resolveSelection({...EMPTY, methodId: 'm1', entityId: 3}, OPTIONS))
      .toMatchObject({configId: 'north', entityId: 3});
  });

  it('holds the configuration back until relevance is known', () => {
    const next = resolveSelection({...EMPTY, methodId: 'm1'}, {...OPTIONS, relevance: null});
    expect(next).toMatchObject({entityId: 1, configId: null});
  });

  it('falls back to the first configuration when the entity is relevant to none', () => {
    const relevance = new Map([['north', new Set()], ['south', new Set()]]);
    expect(resolveSelection({...EMPTY, methodId: 'm1', entityId: 2}, {...OPTIONS, relevance}))
      .toMatchObject({configId: 'north'});
  });

  it('moves an unpinned configuration along when the entity changes', () => {
    const settled = {methodId: 'm1', configId: 'south', configPinned: false, entityId: 3, lead: 0};
    expect(resolveSelection(settled, OPTIONS)).toMatchObject({configId: 'north', entityId: 3});
  });

  it('keeps a pinned configuration even for an entity that is not relevant to it', () => {
    const pinned = {methodId: 'm1', configId: 'south', configPinned: true, entityId: 3, lead: 0};
    expect(resolveSelection(pinned, OPTIONS)).toBe(pinned);
  });

  it('defaults the entity to one relevant to a pinned configuration', () => {
    const pinned = {...EMPTY, methodId: 'm1', configId: 'north', configPinned: true};
    expect(resolveSelection(pinned, OPTIONS)).toMatchObject({configId: 'north', entityId: 3});
  });

  it('waits for relevance before defaulting the entity of a pinned configuration', () => {
    const pinned = {...EMPTY, methodId: 'm1', configId: 'north', configPinned: true};
    expect(resolveSelection(pinned, {...OPTIONS, relevance: null, leads: []}).entityId).toBeNull();
  });

  it('replaces a method that is not offered, and drops its configuration', () => {
    const next = resolveSelection({...EMPTY, methodId: 'gone', configId: 'x', configPinned: true, entityId: 2}, OPTIONS);
    expect(next).toMatchObject({methodId: 'm1', configId: 'south', configPinned: false, entityId: 2});
  });

  it('replaces an entity or a lead that is not offered', () => {
    const next = resolveSelection({methodId: 'm1', configId: 'south', configPinned: false, entityId: 99, lead: 6}, OPTIONS);
    expect(next).toMatchObject({entityId: 1, lead: 0});
  });

  it('keeps a requested lead while the leads load, and once they offer it', () => {
    const requested = {methodId: 'm1', configId: 'south', configPinned: true, entityId: 2, lead: 24};
    expect(resolveSelection(requested, {...OPTIONS, leads: []})).toBe(requested);
    expect(resolveSelection(requested, OPTIONS)).toBe(requested);
  });

  it('returns the same object once the selection is settled', () => {
    const settled = resolveSelection(EMPTY, OPTIONS);
    expect(resolveSelection(settled, OPTIONS)).toBe(settled);
  });
});

describe('useSelectionDefaults', () => {
  it('reports the corrected selection', () => {
    const onChange = vi.fn();
    renderHook(() => useSelectionDefaults({open: true, value: EMPTY, onChange, ...OPTIONS}));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({methodId: 'm1', configId: 'south', entityId: 1}));
  });

  it('stays quiet while the modal is closed or the selection is settled', () => {
    const onChange = vi.fn();
    renderHook(() => useSelectionDefaults({open: false, value: EMPTY, onChange, ...OPTIONS}));
    const settled = resolveSelection(EMPTY, OPTIONS);
    renderHook(() => useSelectionDefaults({open: true, value: settled, onChange, ...OPTIONS}));
    expect(onChange).not.toHaveBeenCalled();
  });
});
