/**
 * @fileoverview Tests for the modal selection dropdowns. The option lists are props here, as the
 * owning window loads them, so these tests are about rendering and reporting a choice.
 */

import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MethodConfigSelector from '@/components/modals/common/MethodConfigSelector.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

const METHOD = {id: 'm1', name: 'M1', configurations: [{id: 'c1', name: 'Config 1'}, {id: 'c2', name: 'Config 2'}]};

/** Fully loaded option lists, as `useMethodConfigOptions` returns them. */
function options(overrides = {}) {
  return {
    methodOptions: [METHOD],
    configsForSelectedMethod: METHOD.configurations,
    stations: [{id: 1, name: 'Alpha'}, {id: 2, name: 'Bravo'}],
    leads: [{lead: 0, label: '01.01.2025'}, {lead: 24, label: '02.01.2025'}],
    methodsLoading: false, stationsLoading: false, leadsLoading: false,
    methodsError: null, stationsError: null, leadsError: null,
    relevantConfigIds: new Map([['c1', true], ['c2', false]]),
    ...overrides
  };
}

const SELECTION = {methodId: 'm1', configId: 'c1', configPinned: false, entityId: 1, lead: 0};
const renderSelector = (props = {}) => render(
  <MethodConfigSelector value={SELECTION} onChange={vi.fn()} options={options()} {...props}/>
);

/** Opens one of the four dropdowns and returns its options. */
const openSelect = async (index) => {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('combobox')[index]);
  return within(screen.getByRole('listbox'));
};

describe('MethodConfigSelector', () => {
  afterEach(() => cleanup());

  it('labels the four dropdowns', () => {
    renderSelector();
    ['method', 'config', 'entity', 'lead'].forEach(key =>
      expect(screen.getByText(`detailsAnalogsModal.${key}`)).toBeInTheDocument());
  });

  it('shows the current selection', () => {
    renderSelector();
    const shown = screen.getAllByRole('combobox').map(c => c.textContent);
    expect(shown).toEqual(['M1', 'Config 1', 'Alpha', '01.01.2025']);
  });

  it('marks the configurations the entity is relevant to', async () => {
    renderSelector();
    const listbox = await openSelect(1);
    expect(listbox.getByText('Config 1').closest('li')).toHaveTextContent('detailsAnalogsModal.relevant');
    expect(listbox.getByText('Config 2').closest('li')).not.toHaveTextContent('detailsAnalogsModal.relevant');
  });

  it('pins a configuration the user picks, so it no longer follows the entity', async () => {
    const onChange = vi.fn();
    renderSelector({onChange});
    const listbox = await openSelect(1);

    await userEvent.setup().click(listbox.getByText('Config 2'));

    expect(onChange).toHaveBeenLastCalledWith({...SELECTION, configId: 'c2', configPinned: true});
  });

  it('reports a change of entity or lead, leaving the configuration alone', async () => {
    const onChange = vi.fn();
    renderSelector({onChange});
    const user = userEvent.setup();

    await user.click((await openSelect(2)).getByText('Bravo'));
    expect(onChange).toHaveBeenLastCalledWith({...SELECTION, entityId: 2});

    await user.click((await openSelect(3)).getByText('02.01.2025'));
    expect(onChange).toHaveBeenLastCalledWith({...SELECTION, lead: 24});
  });

  it('keeps a configuration the user drops out of the list from being shown', () => {
    renderSelector({value: {...SELECTION, configId: 'gone'}});
    // MUI fills an empty display with a zero-width space to keep the field's height.
    expect(screen.getAllByRole('combobox')[1].textContent.replace(/\u200B/g, '')).toBe('');
  });

  it('says when a list is loading, empty or failed', () => {
    renderSelector({
      options: options({
        methodOptions: [], configsForSelectedMethod: [], stations: [], leads: [],
        stationsLoading: true, methodsError: new Error('x')
      })
    });
    expect(screen.getByText('detailsAnalogsModal.errorLoadingMethods')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.loadingEntities')).toBeInTheDocument();
  });
});
