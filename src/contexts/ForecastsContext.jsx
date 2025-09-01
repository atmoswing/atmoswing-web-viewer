import React from 'react';
import {ForecastSessionProvider, useForecastSession} from './ForecastSessionContext.jsx';
import {MethodsProvider, useMethods as useMethodsInternal} from './MethodsContext.jsx';
import {EntitiesProvider, useEntities as useEntitiesInternal} from './EntitiesContext.jsx';
import {SynthesisProvider, useSynthesis as useSynthesisInternal} from './SynthesisContext.jsx';
import {ForecastValuesProvider, useForecastValues as useForecastValuesInternal} from './ForecastValuesContext.jsx';

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

export const useMethods = () => useMethodsInternal();
export const useEntities = () => useEntitiesInternal();
export const useSynthesis = () => useSynthesisInternal();
export const useForecastValues = () => useForecastValuesInternal();
export const useForecastParameters = () => {
    const s = useForecastSession();
    return { percentile: s.percentile, setPercentile: s.setPercentile, normalizationRef: s.normalizationRef, setNormalizationRef: s.setNormalizationRef };
};
export { useForecastSession } from './ForecastSessionContext.jsx';

