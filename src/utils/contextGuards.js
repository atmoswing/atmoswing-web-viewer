// Common guard / helper functions shared across context providers to reduce duplication.
import {composeKey} from '@/services/apiHelpers.js';

// Validate a selectedMethodConfig belongs to current workspace (if scoped)
export function isMethodSelectionValid(selectedMethodConfig, workspace) {
  if (!selectedMethodConfig) return false;
  if (!selectedMethodConfig.method) return false;
  if (selectedMethodConfig._workspace && selectedMethodConfig._workspace !== workspace) return false;
  return true;
}

// Check method id exists within tree
export function methodExists(methodConfigTree, methodId) {
  return Array.isArray(methodConfigTree) && !!methodConfigTree.find(m => m.id === methodId);
}

// Derive a configuration id fallback (first config) if none explicitly selected
export function deriveConfigId(selectedMethodConfig, methodConfigTree) {
  if (!selectedMethodConfig?.method) return null;
  if (selectedMethodConfig.config?.id) return selectedMethodConfig.config.id;
  const methodId = selectedMethodConfig.method.id;
  const m = methodConfigTree.find(mm => mm.id === methodId);
  return m?.children?.[0]?.id || null;
}

// Compose a cache key for entities or values
export function keyForEntities(workspace, forecastDate, methodId, configId) {
  return composeKey(workspace, forecastDate, methodId, configId);
}

export function keyForForecastValues(workspace, forecastDate, methodId, configId, leadHours, percentile, normalizationRef) {
  return composeKey(workspace, forecastDate, methodId, configId || 'agg', leadHours, percentile, normalizationRef || 'raw');
}
