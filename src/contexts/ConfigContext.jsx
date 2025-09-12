import React, {createContext, useState, useEffect, useContext} from 'react';
import staticConfig from '../config.js';

const ConfigContext = createContext();

export function ConfigProvider({children}) {
    // Add a metadata flag to know when (attempted) runtime config load is finished
    const [config, setConfig] = useState({...staticConfig, __workspacesLoaded: false});

    useEffect(() => {
        fetch('/config.json')
            .then(res => res.json())
            .then(runtimeConfig => setConfig(prev => ({...prev, ...runtimeConfig, __workspacesLoaded: true})))
            .catch(() => setConfig(prev => ({...prev, __workspacesLoaded: true})));
    }, []);

    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    return useContext(ConfigContext);
}
