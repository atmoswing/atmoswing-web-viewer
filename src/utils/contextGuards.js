/**
 * @module utils/contextGuards
 * @description Common guard and helper functions shared across context providers.
 * Reduces duplication and provides validation logic for method/workspace selections.
 */

import {composeKey} from '@/services/apiHelpers.js';

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

/**
 * Composes a cache key for entities data.
 *
 * @param {string} workspace - Workspace key
 * @param {string} forecastDate - Forecast date string
 * @param {string|number} methodId - Method ID
 * @param {string|number} configId - Configuration ID
 * @returns {string} Composed cache key
 */
export function keyForEntities(workspace, forecastDate, methodId, configId) {
  return composeKey(workspace, forecastDate, methodId, configId);
}

/**
 * Composes a cache key for relevant entities data.
 *
 * @param {string} workspace - Workspace key
 * @param {string} forecastDate - Forecast date string
 * @param {string|number} methodId - Method ID
 * @param {string|number} configId - Configuration ID
 * @returns {string} Composed cache key
 */
export function keyForRelevantEntities(workspace, forecastDate, methodId, configId) {
  return composeKey('rel', workspace, forecastDate, methodId, configId);
}

/**
 * Composes a cache key for forecast values data.
 *
 * @param {string} workspace - Workspace key
 * @param {string} forecastDate - Forecast date string
 * @param {string|number} methodId - Method ID
 * @param {string|number} configId - Configuration ID (defaults to 'agg')
 * @param {number} leadHours - Lead time in hours
 * @param {number} percentile - Percentile value
 * @param {string} normalizationRef - Normalization reference (defaults to 'raw')
 * @returns {string} Composed cache key
 */
export function keyForForecastValues(workspace, forecastDate, methodId, configId, leadHours, percentile, normalizationRef) {
  return composeKey(workspace, forecastDate, methodId, configId || 'agg', leadHours, percentile, normalizationRef || 'raw');
}
