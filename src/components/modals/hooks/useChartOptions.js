/**
 * @module components/modals/hooks/useChartOptions
 * @description Display-option state shared by the chart modals.
 *
 * The two modals offer overlapping subsets of the same options and previously each kept their
 * own copy of the toggle handler, including the rule below. Keeping the rule here means it
 * cannot drift between them.
 */

import {useCallback, useMemo, useState} from 'react';

/**
 * Options that cannot both be on: showing every return period would draw the ten-year line
 * twice, so enabling one clears the other.
 * @constant {Array<Array<string>>}
 */
const EXCLUSIVE_PAIRS = [['tenYearReturn', 'allReturnPeriods']];

/**
 * Applies the mutual-exclusion rules to a pending option change.
 *
 * @private
 * @param {Object} options - Current options
 * @param {string} key - Option being changed
 * @param {boolean} checked - Its new value
 * @returns {Object} Next options
 */
function applyChange(options, key, checked) {
  const next = {...options, [key]: checked};
  if (!checked) return next;
  EXCLUSIVE_PAIRS.forEach(pair => {
    if (!pair.includes(key)) return;
    pair.filter(other => other !== key).forEach(other => {
      if (other in next) next[other] = false;
    });
  });
  return next;
}

/**
 * Holds the chart display options and the toggle handler the checkboxes bind to.
 *
 * @param {Object} initialOptions - Starting values, keyed by option name
 * @returns {Object} Option state and handlers
 * @returns {Object} returns.options - Current option values
 * @returns {Function} returns.handleOptionChange - `key => event => void`, for a checkbox `onChange`
 * @returns {Function} returns.setOptions - Escape hatch for setting options directly
 * @example
 * const {options, handleOptionChange} = useChartOptions({bestAnalogs: false, tenYearReturn: true});
 * <Checkbox checked={options.bestAnalogs} onChange={handleOptionChange('bestAnalogs')}/>
 */
export function useChartOptions(initialOptions) {
  const [options, setOptions] = useState(initialOptions);

  const handleOptionChange = useCallback(key => event => {
    const {checked} = event.target;
    setOptions(current => applyChange(current, key, checked));
  }, []);

  return useMemo(
    () => ({options, handleOptionChange, setOptions}),
    [options, handleOptionChange]
  );
}
