/**
 * @module components/modals/hooks/useResolvedEntityConfig
 * @description Determines which configuration to use for the selected entity when the user has
 * not chosen one explicitly, by probing each configuration's relevant-entities list in turn.
 */

import {useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession, useMethods, useSelectedEntity} from '@/contexts/ForecastsContext.jsx';
import {getRelevantEntities} from '@/services/api.js';

/**
 * Resolves the effective configuration id for the currently selected entity.
 *
 * An explicit user selection always wins. Otherwise each configuration of the selected method is
 * probed until one lists the entity as relevant; the first configuration is used as a fallback.
 * Results are memoised per workspace/method/entity for the lifetime of the component.
 *
 * @returns {Object} Resolution state
 * @returns {string|number|null} returns.resolvedConfigId - Effective configuration id, or null while unknown
 * @returns {boolean} returns.resolvingConfig - Whether a probe is currently in progress
 * @example
 * const { resolvedConfigId, resolvingConfig } = useResolvedEntityConfig();
 */
export function useResolvedEntityConfig() {
  const {selectedEntityId} = useSelectedEntity();
  const {selectedMethodConfig, methodConfigTree} = useMethods();
  const {workspace, activeForecastDate} = useForecastSession();

  const [autoConfigId, setAutoConfigId] = useState(null);
  const [resolvingConfig, setResolvingConfig] = useState(false);
  const autoConfigCache = useRef(new Map()); // workspace|methodId|entityId -> configId

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Reset the previous resolution whenever the inputs change.
      setAutoConfigId(null);
      setResolvingConfig(false);
      if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || selectedMethodConfig?.config || selectedEntityId == null) {
        // Explicit config selected or insufficient info; nothing to resolve.
        return;
      }
      const methodNode = methodConfigTree.find(m => m.id === selectedMethodConfig.method.id);
      if (!methodNode || !methodNode.children?.length) {
        return;
      }
      const cacheKey = `${workspace}|${selectedMethodConfig.method.id}|${selectedEntityId}`;
      if (autoConfigCache.current.has(cacheKey)) {
        setAutoConfigId(autoConfigCache.current.get(cacheKey));
        return;
      }
      setResolvingConfig(true);
      // Try each config until the entity is relevant to one of them.
      for (const cfg of methodNode.children) {
        try {
          const rel = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, cfg.id);
          if (cancelled) return;
          if (Array.isArray(rel?.entities) && rel.entities.find(e => e.id === selectedEntityId)) {
            autoConfigCache.current.set(cacheKey, cfg.id);
            setAutoConfigId(cfg.id);
            setResolvingConfig(false);
            return;
          }
        } catch {
          if (cancelled) return; // ignore individual errors and keep probing
        }
      }
      // Fall back to the first configuration when none matched.
      const fallback = methodNode.children[0].id;
      autoConfigCache.current.set(cacheKey, fallback);
      if (!cancelled) {
        setAutoConfigId(fallback);
        setResolvingConfig(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [workspace, activeForecastDate, selectedMethodConfig, selectedEntityId, methodConfigTree]);

  const resolvedConfigId = useMemo(() => {
    if (!selectedMethodConfig?.method) return null;
    if (selectedMethodConfig.config) return selectedMethodConfig.config.id; // user selection overrides
    if (resolvingConfig) return null; // hold off until the probe finishes
    return autoConfigId || null;
  }, [selectedMethodConfig, autoConfigId, resolvingConfig]);

  return {resolvedConfigId, resolvingConfig};
}
