/**
 * @module contexts/MethodsContext
 * @description React context for managing forecast methods and configurations.
 * Fetches available methods, manages selection, and provides normalized method tree.
 */

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethodsAndConfigs} from '@/hooks/forecastQueries.js';
import {normalizeMethodsAndConfigs} from '@/utils/apiNormalization.js';

const MethodsContext = createContext({});

/**
 * Provider component for forecast methods and configurations.
 * Manages method selection with workspace scoping and auto-selection.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function MethodsProvider({children}) {
  const {workspace, activeForecastDate} = useForecastSession();

  const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);
  const prevWorkspaceRef = useRef(workspace);

  // The workspace prefetch warms the very same cache entry, so an already-prefetched date
  // resolves from cache here instead of being re-requested.
  const {data: methodsAndConfigs, loading: methodsLoading, error: methodsError} =
    useMethodsAndConfigs(workspace, activeForecastDate);

  // Clear selection on workspace change
  useEffect(() => {
    if (prevWorkspaceRef.current !== workspace) {
      setSelectedMethodConfig(null);
      prevWorkspaceRef.current = workspace;
    }
  }, [workspace]);

  const methodConfigTree = useMemo(() => {
    if (!methodsAndConfigs?.methods) return [];
    return normalizeMethodsAndConfigs(methodsAndConfigs);
  }, [methodsAndConfigs]);

  const setSelectedMethodConfigScoped = useCallback(sel => {
    if (!sel) {
      setSelectedMethodConfig(null);
      return;
    }
    setSelectedMethodConfig({...sel, _workspace: workspace});
  }, [workspace]);

  // Auto select first method
  useEffect(() => {
    if (!selectedMethodConfig && methodConfigTree.length) {
      setSelectedMethodConfigScoped({method: methodConfigTree[0], config: null});
    } else if (selectedMethodConfig && (!methodConfigTree.find(m => m.id === selectedMethodConfig.method?.id) || selectedMethodConfig._workspace !== workspace)) {
      // Clear if method missing or workspace changed
      setSelectedMethodConfig(null);
    }
  }, [methodConfigTree, selectedMethodConfig, setSelectedMethodConfigScoped, workspace]);

  const value = useMemo(() => ({
    methodConfigTree,
    methodsLoading,
    methodsError,
    selectedMethodConfig,
    setSelectedMethodConfig: setSelectedMethodConfigScoped
  }), [methodConfigTree, methodsLoading, methodsError, selectedMethodConfig, setSelectedMethodConfigScoped]);

  return <MethodsContext.Provider value={value}>{children}</MethodsContext.Provider>;
}

/**
 * Hook to access methods context.
 *
 * @returns {Object} Methods context value
 * @returns {Array} returns.methodConfigTree - Normalized tree of methods with nested configs
 * @returns {boolean} returns.methodsLoading - Loading state for methods fetch
 * @returns {Error} returns.methodsError - Error if methods fetch failed
 * @returns {Object} returns.selectedMethodConfig - Currently selected method and config
 * @returns {Function} returns.setSelectedMethodConfig - Function to set method/config selection
 * @example
 * const { methodConfigTree, selectedMethodConfig, setSelectedMethodConfig } = useMethods();
 * // Select first method
 * setSelectedMethodConfig({ method: methodConfigTree[0], config: null });
 */
export const useMethods = () => useContext(MethodsContext);
