import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

import {
  resetTestUtils,
  setupI18nMock,
  setupUseCachedRequestMock,
  setUseCachedRequestDefault,
  useCachedRequestMock
} from '../../testUtils.js';
import MethodConfigSelector from '@/components/modals/common/MethodConfigSelector.jsx';
import {useModalSelectionData} from '@/components/modals/hooks/useModalSelectionData.js';

setupI18nMock();
setupUseCachedRequestMock();

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

  it('useModalSelectionData returns resolved config when methods data provided', () => {
    // Simulate methodsData returned by cached request for useModalSelectionData
    useCachedRequestMock.mockImplementationOnce(() => ({
      data: {methods: [{id: 'm1', configurations: [{id: 'c1'}]}]},
      loading: false,
      error: null
    }));

    function HookConsumer({selection}) {
      const {resolvedMethodId, resolvedConfigId, resolvedEntityId} = useModalSelectionData(true, selection);
      return (
        <div>
          <span data-testid="rid">{resolvedMethodId}</span>
          <span data-testid="rcid">{resolvedConfigId}</span>
          <span data-testid="reid">{String(resolvedEntityId)}</span>
        </div>
      );
    }

    const {getByTestId} = render(<HookConsumer selection={{methodId: 'm1', configId: null, entityId: 5}}/>);
    expect(getByTestId('rid').textContent).toBe('m1');
    expect(getByTestId('rcid').textContent).toBe('c1');
    expect(getByTestId('reid').textContent).toBe('5');
  });
});

