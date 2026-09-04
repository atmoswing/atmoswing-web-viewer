/**
 * @module utils/contextGuards
 * @description Selection predicates shared across the forecast context providers: is this
 * method/config selection still valid, does it exist in the current tree, and which
 * configuration does it resolve to.
 *
 * Cache keys deliberately do not live here. A key belongs with the hook that fetches the
 * resource, or in `hooks/forecastQueries.js` when several consumers must share one entry.
 */

/**
 * Validates that a selected method/config belongs to the current workspace.
 *
 * @param {Object} selectedMethodConfig - The selected method and config object
 * @param {string} workspace - Current workspace key
 * @returns {boolean} True if selection is valid for this workspace
 */
export function isMethodSelectionValid(selectedMethodConfig, workspace) {
  if (!selectedMethodConfig) return false;
  if (!selectedMethodConfig.method) return false;
  if (selectedMethodConfig._workspace && selectedMethodConfig._workspace !== workspace) return false;
  return true;
}

/**
 * Checks if a method ID exists in the method configuration tree.
 *
 * @param {Array} methodConfigTree - Array of method objects with id property
 * @param {string|number} methodId - Method ID to search for
 * @returns {boolean} True if method exists in tree
 */
export function methodExists(methodConfigTree, methodId) {
  return Array.isArray(methodConfigTree) && !!methodConfigTree.find(m => m.id === methodId);
}

/**
 * Derives a configuration ID from selected method, falling back to first config.
 *
 * @param {Object} selectedMethodConfig - Selected method and config object
 * @param {Array} methodConfigTree - Full method configuration tree
 * @returns {string|number|null} Configuration ID, or null if not found
 */
export function deriveConfigId(selectedMethodConfig, methodConfigTree) {
  if (!selectedMethodConfig?.method) return null;
  if (selectedMethodConfig.config?.id) return selectedMethodConfig.config.id;
  const methodId = selectedMethodConfig.method.id;
  const m = methodConfigTree.find(mm => mm.id === methodId);
  return m?.children?.[0]?.id || null;
}
