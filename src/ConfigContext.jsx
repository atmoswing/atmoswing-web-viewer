import React, { createContext, useState, useEffect, useContext } from 'react';
import staticConfig from './config';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const [config, setConfig] = useState(staticConfig);

    useEffect(() => {
        fetch('/config.json')
            .then(res => res.json())
            .then(runtimeConfig => setConfig({ ...staticConfig, ...runtimeConfig }));
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