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
      .then(res => {
        // A missing or unreadable config leaves the app with no API URL and no workspaces,
        // so it is worth distinguishing from a config that merely failed to parse.
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching /config.json`);
        return res.json();
      })
      .then(json => {
        if (cancelled) return;
        const normalized = normalizeRuntimeConfig(json);
        updateConfig(normalized); // mutate shared config object used by imports (e.g. api service)
        setCurrent(prev => ({...prev, ...config, __workspacesLoaded: true}));
      })
      .catch(err => {
        if (cancelled) return;
        // Not gated behind API_DEBUG: that flag lives in the very file that failed to load,
        // and without this the app renders empty with nothing explaining why.
        console.error(
          '[config] Could not load /config.json — the app will run with defaults and no ' +
          'workspaces. Copy public/config.sample.json to public/config.json to get started.',
          err
        );
        setCurrent(prev => ({...prev, __workspacesLoaded: true, __configError: err}));
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
