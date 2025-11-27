import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';

import { setupI18nMock, setupUseCachedRequestMock, useCachedRequestMock, setUseCachedRequestDefault, resetTestUtils } from '../../testUtils.js';
setupI18nMock();
setupUseCachedRequestMock();

// Mock ForecastSession context
vi.mock('@/contexts/ForecastSessionContext.jsx', () => ({ useForecastSession: () => ({ workspace: 'ws', activeForecastDate: '2024-01-01', forecastBaseDate: new Date('2024-01-01') }) }));

// Mock API service functions used inside the component
vi.mock('@/services/api.js', () => ({ getEntities: vi.fn(() => Promise.resolve({entities: []})), getMethodsAndConfigs: vi.fn(() => Promise.resolve({methods: []})), getRelevantEntities: vi.fn(() => Promise.resolve({})), getSeriesValuesPercentiles: vi.fn(() => Promise.resolve({})) }));

// Normalization utils
vi.mock('@/utils/apiNormalization.js', () => ({ extractTargetDatesArray: vi.fn(() => []), normalizeEntitiesResponse: vi.fn((d) => d), normalizeRelevantEntityIds: vi.fn(() => new Set()) }));

import MethodConfigSelector, {useModalSelectionData} from '@/components/modals/common/MethodConfigSelector.jsx';

describe('MethodConfigSelector (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestUtils();
    setUseCachedRequestDefault();
  });

  afterEach(() => cleanup());

  it('renders selector without crashing when no methods', () => {
    const onChange = vi.fn();
    render(<MethodConfigSelector open={true} value={{}} onChange={onChange} />);
    expect(screen.getByText('detailsAnalogsModal.method')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.config')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.entity')).toBeInTheDocument();
    expect(screen.getByText('detailsAnalogsModal.lead')).toBeInTheDocument();
  });

  it('useModalSelectionData returns resolved config when methods data provided', () => {
    // Simulate methodsData returned by cached request for useModalSelectionData
    useCachedRequestMock.mockImplementationOnce(() => ({ data: { methods: [{ id: 'm1', configurations: [{ id: 'c1' }] }] }, loading: false, error: null }));

    function HookConsumer({ selection }) {
      const { resolvedMethodId, resolvedConfigId, resolvedEntityId } = useModalSelectionData('pref_', true, selection);
      return (
        <div>
          <span data-testid="rid">{resolvedMethodId}</span>
          <span data-testid="rcid">{resolvedConfigId}</span>
          <span data-testid="reid">{String(resolvedEntityId)}</span>
        </div>
      );
    }

    const { getByTestId } = render(<HookConsumer selection={{ methodId: 'm1', configId: null, entityId: 5 }} />);
    expect(getByTestId('rid').textContent).toBe('m1');
    expect(getByTestId('rcid').textContent).toBe('c1');
    expect(getByTestId('reid').textContent).toBe('5');
  });
});

