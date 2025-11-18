/**
 * @module contexts/ConfigContext
 * @description React context for managing runtime configuration.
 *
 * This context fetches `/config.json` at startup and makes configuration
 * values available throughout the application via the useConfig hook.
 */

import React, {createContext, useContext, useEffect, useState} from 'react';
import config, {normalizeRuntimeConfig, updateConfig} from '@/config.js';

const ConfigContext = createContext();

/**
 * Provider component that fetches and manages runtime configuration.
 *
 * Fetches `/config.json` on mount with cache: no-store to ensure fresh config.
 * Merges normalized config into the shared config object and provides it via context.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function ConfigProvider({children}) {
  const [current, setCurrent] = useState({...config, __workspacesLoaded: false});

  useEffect(() => {
    let cancelled = false;
    fetch('/config.json', {cache: 'no-store'})
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        const normalized = normalizeRuntimeConfig(json);
        updateConfig(normalized); // mutate shared config object used by imports (e.g. api service)
        setCurrent(prev => ({...prev, ...config, __workspacesLoaded: true}));
      })
      .catch(() => {
        if (cancelled) return;
        setCurrent(prev => ({...prev, __workspacesLoaded: true}));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConfigContext.Provider value={current}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * Hook to access runtime configuration.
 *
 * @returns {Object} Configuration object with __workspacesLoaded flag
 * @example
 * const config = useConfig();
 * if (config.__workspacesLoaded) {
 *   console.log('Workspaces:', config.workspaces);
 * }
 */
export function useConfig() {
  return useContext(ConfigContext);
}
