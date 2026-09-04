/**
 * @module components/modals/common/useModalSelectionData
 * @description Resolves the effective method/config/entity for a modal's raw selection,
 * filling in the first configuration when the user has not chosen one explicitly.
 */

import {useMemo} from 'react';
import {useForecastSession} from '@/contexts/forecast/ForecastSessionContext.jsx';
import {useMethodsAndConfigs} from '@/hooks/forecastQueries.js';

/**
 * Hook returning resolved selection data (with fallback config if none explicitly chosen).
 * @param {boolean} open - Whether owning modal is open
 * @param {Object} selection - Raw selection { methodId, configId, entityId }
 * @returns {Object} Object with resolvedMethodId, resolvedConfigId, resolvedEntityId
 * @example
 * const { resolvedMethodId, resolvedConfigId } = useModalSelectionData(open, selection);
 */
export function useModalSelectionData(open, selection) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {methodId, configId, entityId} = selection;

  const {data: methodsData} = useMethodsAndConfigs(workspace, activeForecastDate, {enabled: open});

  const resolvedConfig = useMemo(() => {
    if (!methodsData?.methods) return configId || null;
    const m = methodsData.methods.find(mm => mm.id === methodId);
    return configId || (m?.configurations?.[0]?.id) || null;
  }, [methodsData, methodId, configId]);

  return {
    resolvedMethodId: methodId,
    resolvedConfigId: resolvedConfig,
    resolvedEntityId: entityId
  };
}
