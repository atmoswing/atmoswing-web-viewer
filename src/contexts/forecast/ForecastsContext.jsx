/**
 * @module contexts/ForecastsContext
 * @description Composite provider combining all forecast-related contexts.
 * Re-exports convenient hooks for accessing forecast functionality.
 */

import React from 'react';
import {ForecastSessionProvider, useForecastSession} from './ForecastSessionContext.jsx';
import {MethodsProvider, useMethods as useMethodsInternal} from './MethodsContext.jsx';
import {EntitiesProvider, useEntities as useEntitiesInternal} from './EntitiesContext.jsx';
import {SynthesisProvider, useSynthesis as useSynthesisInternal} from './SynthesisContext.jsx';
import {ForecastValuesProvider, useForecastValues as useForecastValuesInternal} from './ForecastValuesContext.jsx';
import {SelectedEntityProvider, useSelectedEntity as useSelectedEntityInternal} from './SelectedEntityContext.jsx';

/**
 * Composite provider wrapping all forecast-related contexts.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {React.ReactElement}
 */
export function ForecastsProvider({children}) {
  return (
    <ForecastSessionProvider>
      <SynthesisProvider>
        <MethodsProvider>
          <EntitiesProvider>
            <SelectedEntityProvider>
              <ForecastValuesProvider>
                {children}
              </ForecastValuesProvider>
            </SelectedEntityProvider>
          </EntitiesProvider>
        </MethodsProvider>
      </SynthesisProvider>
    </ForecastSessionProvider>
  );
}

/**
 * Hook to access methods context. Re-export from MethodsContext.
 * @returns {Object} Methods context value
 */
export const useMethods = () => useMethodsInternal();

/**
 * Hook to access entities context. Re-export from EntitiesContext.
 * @returns {Object} Entities context value
 */
export const useEntities = () => useEntitiesInternal();

/**
 * Hook to access synthesis context. Re-export from SynthesisContext.
 * @returns {Object} Synthesis context value
 */
export const useSynthesis = () => useSynthesisInternal();

/**
 * Hook to access forecast values context. Re-export from ForecastValuesContext.
 * @returns {Object} Forecast values context value
 */
export const useForecastValues = () => useForecastValuesInternal();

/**
 * Hook to access forecast parameters (percentile and normalization).
 * @returns {Object} Forecast parameters
 * @returns {number} returns.percentile - Current percentile value
 * @returns {Function} returns.setPercentile - Set percentile
 * @returns {string} returns.normalizationRef - Normalization reference
 * @returns {Function} returns.setNormalizationRef - Set normalization reference
 */
export const useForecastParameters = () => {
  const s = useForecastSession();
  return {
    percentile: s.percentile,
    setPercentile: s.setPercentile,
    normalizationRef: s.normalizationRef,
    setNormalizationRef: s.setNormalizationRef
  };
};

/**
 * Hook to access forecast session context. Re-export from ForecastSessionContext.
 * @returns {Object} Forecast session context value
 */
export {useForecastSession} from './ForecastSessionContext.jsx';

/**
 * Hook to access selected entity context. Re-export from SelectedEntityContext.
 * @returns {Object} Selected entity context value
 */
export const useSelectedEntity = () => useSelectedEntityInternal();
