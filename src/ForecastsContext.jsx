import React from 'react';
import {ForecastSessionProvider, useForecastSession} from './contexts/ForecastSessionContext.jsx';
import {MethodsProvider, useMethods as useMethodsInternal} from './contexts/MethodsContext.jsx';
import {EntitiesProvider, useEntities as useEntitiesInternal} from './contexts/EntitiesContext.jsx';
import {SynthesisProvider, useSynthesis as useSynthesisInternal} from './contexts/SynthesisContext.jsx';
import {ForecastValuesProvider, useForecastValues as useForecastValuesInternal} from './contexts/ForecastValuesContext.jsx';

// Root provider composing modular providers (legacy combined context removed)
export function ForecastsProvider({children}) {
    return (
        <ForecastSessionProvider>
            <MethodsProvider>
                <EntitiesProvider>
                    <SynthesisProvider>
                        <ForecastValuesProvider>
                            {children}
                        </ForecastValuesProvider>
                    </SynthesisProvider>
                </EntitiesProvider>
            </MethodsProvider>
        </ForecastSessionProvider>
    );
}

// Granular hooks (re-export wrappers)
export const useMethods = () => useMethodsInternal();
export const useEntities = () => useEntitiesInternal();
export const useSynthesis = () => useSynthesisInternal();
export const useForecastValues = () => useForecastValuesInternal();
export const useForecastParameters = () => {
    const s = useForecastSession();
    return { percentile: s.percentile, setPercentile: s.setPercentile, normalizationRef: s.normalizationRef, setNormalizationRef: s.setNormalizationRef };
};
// Direct session hook (optional export for consumers needing base date / shift)
export { useForecastSession } from './contexts/ForecastSessionContext.jsx';
