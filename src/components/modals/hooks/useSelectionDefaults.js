/**
 * @module components/modals/hooks/useSelectionDefaults
 * @description Keeps a modal's method/config/entity/lead selection valid as the option lists
 * load: fills in a default where nothing is chosen, replaces a choice that has disappeared, and
 * points the configuration at the one the entity is relevant to.
 */

import {useEffect} from 'react';

/**
 * A modal's selection.
 *
 * @typedef {Object} ModalSelection
 * @property {string|number|null} methodId - Method identifier
 * @property {string|number|null} configId - Configuration identifier; null until one is settled
 * @property {boolean} configPinned - Whether the configuration was chosen explicitly (by the user
 *   or the caller). A pinned configuration is kept; otherwise it follows the entity's relevance.
 * @property {string|number|null} entityId - Entity identifier
 * @property {number|null} lead - Lead time in hours
 */

/**
 * The offered lead closest to a wanted one; the earlier one on a tie, the first when none is wanted.
 *
 * @private
 * @param {Array<{lead: number}>} leads - Offered leads, in order
 * @param {number|null} wanted - Lead in hours
 * @returns {number} An offered lead
 */
function nearestLead(leads, wanted) {
  const target = Number(wanted);
  if (wanted == null || wanted === '' || !Number.isFinite(target)) return leads[0].lead;
  return leads.reduce((best, l) => (Math.abs(l.lead - target) < Math.abs(best - target) ? l.lead : best), leads[0].lead);
}

/**
 * Corrects a selection against the options currently available.
 *
 * - Method: the first one when none is chosen or the chosen one is not offered.
 * - Entity: the first one (by name) when none is chosen or it is not offered; with a pinned
 *   configuration, the first one relevant to it, once relevance is known.
 * - Configuration: the one the entity is relevant to, falling back to the method's first. It is
 *   left empty until relevance is known, so nothing is loaded for a provisional configuration.
 *   An unpinned configuration follows the entity to its relevant configuration.
 * - Lead: the first one when none is chosen; the nearest offered one when the chosen lead is not
 *   offered (a lead requested from the time series, or kept across an entity change).
 *
 * @param {ModalSelection} value - Current selection
 * @param {Object} options - Available options
 * @param {Array} options.methodOptions - Methods, each with `configurations`
 * @param {Array} options.stations - Entities, in display order
 * @param {Array} options.leads - Lead times `{ lead }`
 * @param {Map|null} options.relevance - configId -> Set of relevant entity ids, or null while unknown
 * @returns {ModalSelection} The corrected selection, or `value` itself when nothing changes
 * @example
 * const next = resolveSelection(value, {methodOptions, stations, leads, relevance});
 */
export function resolveSelection(value, {methodOptions, stations, leads, relevance}) {
  if (!methodOptions.length) return value;
  const next = {...value};

  let method = methodOptions.find(m => m.id === next.methodId);
  if (!method) {
    method = methodOptions[0];
    next.methodId = method.id;
  }
  const configs = method.configurations || [];
  if (next.configId != null && !configs.some(c => c.id === next.configId)) {
    next.configId = null;
    next.configPinned = false;
  }
  const isRelevant = (configId, entityId) => !!relevance?.get(configId)?.has(entityId);

  if (stations.length && !stations.some(e => e.id === next.entityId)) {
    if (next.configId == null || !next.configPinned) {
      next.entityId = stations[0].id;
    } else if (relevance) {
      next.entityId = (stations.find(e => isRelevant(next.configId, e.id)) || stations[0]).id;
    }
  }

  if (configs.length && relevance && stations.some(e => e.id === next.entityId)) {
    const relevantId = configs.find(c => isRelevant(c.id, next.entityId))?.id;
    if (next.configId == null) {
      next.configId = relevantId ?? configs[0].id;
    } else if (!next.configPinned && relevantId != null) {
      next.configId = relevantId;
    }
  }

  if (leads.length && !leads.some(l => l.lead === next.lead)) {
    next.lead = nearestLead(leads, next.lead);
  }

  const changed = Object.keys(next).some(k => next[k] !== value[k]);
  return changed ? next : value;
}

/**
 * Maintains a valid selection against the currently available options (see `resolveSelection`).
 *
 * Runs as an effect rather than a derivation because it reports back through `onChange`: the
 * selection is owned by the parent modal, not by the selector.
 *
 * @param {Object} params
 * @param {boolean} params.open - Whether the owning modal is open
 * @param {ModalSelection} params.value - Current selection
 * @param {Function} params.onChange - Called with the corrected selection
 * @param {Array} params.methodOptions - Available methods, each with `configurations`
 * @param {Array} params.stations - Available entities
 * @param {Array} params.leads - Available lead times
 * @param {Map|null} params.relevance - configId -> Set of relevant entity ids, or null while unknown
 * @returns {void}
 * @example
 * useSelectionDefaults({open, value, onChange, methodOptions, stations, leads, relevance});
 */
export function useSelectionDefaults({open, value, onChange, methodOptions, stations, leads, relevance}) {
  useEffect(() => {
    if (!open) return;
    const next = resolveSelection(value, {methodOptions, stations, leads, relevance});
    if (next !== value) onChange(next);
  }, [open, value, onChange, methodOptions, stations, leads, relevance]);
}
