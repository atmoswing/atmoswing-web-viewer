/**
 * @module components/toolbar/hooks/useSelectLeadWithMethod
 * @description Selection behind a click on a toolbar lead square: the lead, and the method whose
 * forecast gives the square its colour.
 */

import {useCallback} from 'react';
import {useMethods, useSynthesis} from '@/contexts/forecast/ForecastsContext.jsx';
import {findDominantMethod} from '@/utils/dominantMethod.js';

/**
 * Hook returning the click handler of the toolbar lead squares.
 *
 * The handler selects the lead, then the method carrying the highest value at it (see
 * {@link module:utils/dominantMethod}), as a click in the synthesis panel would: the method
 * without a configuration, so the map, the panel and the method label follow. The selection is
 * left alone when the dominant method is already selected (which keeps a configuration the user
 * picked) and when no method has a value at the lead, or it is not in the method list: then
 * only the lead changes, as before.
 *
 * @returns {Function} `(date, subDaily) => void`, `subDaily` true for a sub-daily segment
 * @example
 * const selectLead = useSelectLeadWithMethod();
 * <div onClick={() => selectLead(lead.date, false)}/>
 */
export default function useSelectLeadWithMethod() {
  const {perMethodSynthesis, selectTargetDate} = useSynthesis();
  const {methodConfigTree, selectedMethodConfig, setSelectedMethodConfig} = useMethods();

  return useCallback((date, subDaily) => {
    if (!date) return;
    selectTargetDate(date, subDaily);

    const tree = methodConfigTree || [];
    const currentId = selectedMethodConfig?.method?.id ?? null;
    const dominant = findDominantMethod(perMethodSynthesis, date, {
      subDaily,
      methodOrder: tree.map(m => m.id),
      preferredMethodId: currentId
    });
    if (!dominant || dominant.methodId === currentId) return;
    const method = tree.find(m => m.id === dominant.methodId);
    if (method) setSelectedMethodConfig({method, config: null});
  }, [perMethodSynthesis, selectTargetDate, methodConfigTree, selectedMethodConfig, setSelectedMethodConfig]);
}
