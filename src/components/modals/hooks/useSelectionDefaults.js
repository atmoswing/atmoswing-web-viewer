/**
 * @module components/modals/hooks/useSelectionDefaults
 * @description Keeps a modal's method/config/entity/lead selection valid as the option lists
 * load: fills in a default where nothing is chosen, and replaces a choice that has disappeared.
 */

import {useEffect} from 'react';

/**
 * Maintains a valid selection against the currently available options.
 *
 * Runs as an effect rather than a derivation because it reports back through `onChange`: the
 * selection is owned by the parent modal, not by the selector.
 *
 * @param {Object} params
 * @param {boolean} params.open - Whether the owning modal is open
 * @param {Object} params.value - Current selection `{ methodId, configId, entityId, lead }`
 * @param {Function} params.onChange - Called with the corrected selection
 * @param {Array} params.methodOptions - Available methods, each with `configurations`
 * @param {Array} params.stations - Available entities
 * @param {Array} params.leads - Available lead times
 * @returns {void}
 * @example
 * useSelectionDefaults({open, value, onChange, methodOptions, stations, leads});
 */
export function useSelectionDefaults({open, value, onChange, methodOptions, stations, leads}) {
  const {methodId: selectedMethodId, configId: selectedConfigId, entityId: selectedStationId, lead: selectedLead} = value;

  // Pick the first method and configuration once the methods arrive.
  useEffect(() => {
    if (!open || !methodOptions.length) return;
    const first = methodOptions[0];
    const updates = {};
    if (!selectedMethodId) updates.methodId = first.id;
    if (!selectedConfigId && first.configurations?.length) {
      updates.configId = first.configurations[0].id;
    }
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [methodOptions, open, selectedMethodId, selectedConfigId, onChange, value]);

  // Give the selected method a configuration when it has none.
  useEffect(() => {
    if (!methodOptions.length || !selectedMethodId) return;
    const m = methodOptions.find(mm => mm.id === selectedMethodId);
    if (!m) return;
    if (!selectedConfigId && m.configurations?.length) {
      onChange({...value, configId: m.configurations[0].id});
    }
  }, [methodOptions, selectedMethodId, selectedConfigId, onChange, value]);

  // Default the entity, or replace one that is no longer offered.
  useEffect(() => {
    if (!open || !stations.length) return;
    const updates = {};
    if (selectedStationId == null || !stations.find(e => e.id === selectedStationId)) {
      updates.entityId = stations[0].id;
    }
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [stations, open, selectedStationId, onChange, value]);

  // Default the lead, or replace one that is no longer offered.
  useEffect(() => {
    if (!leads.length) return;
    const updates = {};
    if (selectedLead == null || selectedLead === '' || !leads.find(l => l.lead === selectedLead)) {
      updates.lead = leads[0].lead;
    }
    if (Object.keys(updates).length > 0) {
      onChange({...value, ...updates});
    }
  }, [leads, selectedLead, onChange, value]);
}
