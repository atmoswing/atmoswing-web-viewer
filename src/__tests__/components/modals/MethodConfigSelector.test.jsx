import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {resetTestUtils, setUseCachedRequestDefault, useCachedRequestMock} from '../../testUtils.js';
import MethodConfigSelector from '@/components/modals/common/MethodConfigSelector.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());
vi.mock('@/hooks/useCachedRequest.js', async () => (await import('@/__tests__/testUtils.js')).cachedRequestMockModule());

// Mock ForecastSession context
vi.mock('@/contexts/forecast/ForecastSessionContext.jsx', () => ({
  useForecastSession: () => ({
    workspace: 'ws',
    activeForecastDate: '2024-01-01',
    forecastBaseDate: new Date('2024-01-01')
  })
}));

// Mock API service functions used inside the component
vi.mock('@/services/api.js', () => ({
  getEntities: vi.fn(() => Promise.resolve({entities: []})),
  getMethodsAndConfigs: vi.fn(() => Promise.resolve({methods: []})),
  getRelevantEntities: vi.fn(() => Promise.resolve({})),
  getSeriesValuesPercentiles: vi.fn(() => Promise.resolve({}))
}));

// Normalization utils
vi.mock('@/utils/normalize/entities.js', () => ({
  normalizeEntitiesResponse: vi.fn((d) => d),
  normalizeRelevantEntityIds: vi.fn(() => new Set())
}));
vi.mock('@/utils/normalize/series.js', () => ({
  extractTargetDatesArray: vi.fn(() => [])
}));

describe('MethodConfigSelector (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestUtils();
    setUseCachedRequestDefault();
  });

  afterEach(() => cleanup());

  it('renders selector without crashing when no methods', () => {
    const onChange = vi.fn();
    render(<MethodConfigSelector open={true} value={{}} onChange={onChange}/>);
    expect(screen.getByText('detailsAnalogsModal.method')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.config')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.entity')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.lead')).toBeInTheDocument();
  });

  describe('with two configurations', () => {
    const METHODS = {methods: [{id: 'm1', name: 'M1', configurations: [{id: 'c1', name: 'Config 1'}, {id: 'c2', name: 'Config 2'}]}]};
    const SELECTION = {methodId: 'm1', configId: 'c1', configPinned: false, entityId: null, lead: null};

    beforeEach(() => {
      useCachedRequestMock.mockImplementation((key, fn, opts) => (
        key?.startsWith('methods|')
          ? {data: METHODS, loading: false, error: null}
          : {data: opts?.initialData ?? null, loading: false, error: null}
      ));
    });

    const pickConfig = async (name) => {
      const user = userEvent.setup();
      const [, configSelect] = screen.getAllByRole('combobox');
      await user.click(configSelect);
      await user.click(within(screen.getByRole('listbox')).getByText(name));
    };

    it('pins a configuration the user picks, so it no longer follows the entity', async () => {
      const onChange = vi.fn();
      render(<MethodConfigSelector open={true} value={SELECTION} onChange={onChange}/>);

      await pickConfig('Config 2');

      expect(onChange).toHaveBeenLastCalledWith({...SELECTION, configId: 'c2', configPinned: true});
    });
  });
});
