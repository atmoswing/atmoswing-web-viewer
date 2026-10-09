/**
 * @module components/toolbar/hooks/useSelectLeadWithMethod
 * @description Selection behind a click on a toolbar lead square: the lead, and the method whose
 * forecast gives the square its colour.
 */

import {useCallback} from 'react';
import {useMethods, useSynthesis} from '@/contexts/forecast/ForecastsContext.jsx';
import {findDominantMethod} from '@/utils/dominantMethod.js';

/**
 * Hook returning a lookup of the method whose forecast colours a lead square.
 * Ties go to the selected method, then to the method list order (see
 * {@link module:utils/dominantMethod}). The tooltip and the click share it, so the tooltip names
 * the method a click selects.
 *
 * @returns {Function} `(date, subDaily) => Object|null`: the method (an entry of
 *   `methodConfigTree`), or null when no listed method has a value at the lead
 * @example
 * const dominantMethodAt = useDominantMethodLookup();
 * dominantMethodAt(lead.date, false)?.name; // 'ARPEGE 24h'
 */
export function useDominantMethodLookup() {
  const {perMethodSynthesis} = useSynthesis();
  const {methodConfigTree, selectedMethodConfig} = useMethods();
  const currentId = selectedMethodConfig?.method?.id ?? null;

  return useCallback((date, subDaily) => {
    const tree = methodConfigTree || [];
    const dominant = findDominantMethod(perMethodSynthesis, date, {
      subDaily,
      methodOrder: tree.map(m => m.id),
      preferredMethodId: currentId
    });
    return dominant ? tree.find(m => m.id === dominant.methodId) || null : null;
  }, [perMethodSynthesis, methodConfigTree, currentId]);
}

/**
 * Hook returning the click handler of the toolbar lead squares.
 *
 * The handler selects the lead, then the method carrying the highest value at it, as a click in
 * the synthesis panel would: the method without a configuration, so the map, the panel and the
 * method label follow. The selection is left alone when the dominant method is already selected
 * (which keeps a configuration the user picked) and when no method has a value at the lead, or
 * it is not in the method list: then only the lead changes, as before.
 *
 * @returns {Function} `(date, subDaily) => void`, `subDaily` true for a sub-daily segment
 * @example
 * const selectLead = useSelectLeadWithMethod();
 * <div onClick={() => selectLead(lead.date, false)}/>
 */
export default function useSelectLeadWithMethod() {
  const {selectTargetDate} = useSynthesis();
  const {selectedMethodConfig, setSelectedMethodConfig} = useMethods();
  const dominantMethodAt = useDominantMethodLookup();

  return useCallback((date, subDaily) => {
    if (!date) return;
    selectTargetDate(date, subDaily);
    const method = dominantMethodAt(date, subDaily);
    if (method && method.id !== selectedMethodConfig?.method?.id) {
      setSelectedMethodConfig({method, config: null});
    }
  }, [selectTargetDate, dominantMethodAt, selectedMethodConfig, setSelectedMethodConfig]);
}
