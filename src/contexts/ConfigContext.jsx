import React, {createContext, useState, useEffect, useContext} from 'react';
import config, {normalizeRuntimeConfig, updateConfig} from '../config.js';

const ConfigContext = createContext();

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
        return () => { cancelled = true; };
    }, []);

    return (
        <ConfigContext.Provider value={current}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    return useContext(ConfigContext);
}
