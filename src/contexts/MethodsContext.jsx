import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {getMethodsAndConfigs} from '../services/api.js';

const MethodsContext = createContext({});

export function MethodsProvider({children}) {
    const {workspace, activeForecastDate} = useForecastSession();

    const [methodsAndConfigs, setMethodsAndConfigs] = useState(null);
    const [methodsLoading, setMethodsLoading] = useState(false);
    const [methodsError, setMethodsError] = useState(null);
    const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);

    const reqIdRef = useRef(0);
    const keyRef = useRef(null);

    // Fetch methods when workspace/date changes
    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;
        async function run() {
            if (!workspace || !activeForecastDate) {
                setMethodsAndConfigs(null);
                keyRef.current = null;
                return;
            }
            const key = `${workspace}|${activeForecastDate}`;
            if (methodsAndConfigs && keyRef.current === key) return;
            setMethodsLoading(true);
            setMethodsError(null);
            try {
                const data = await getMethodsAndConfigs(workspace, activeForecastDate);
                if (!cancelled && reqId === reqIdRef.current) {
                    setMethodsAndConfigs(data);
                    keyRef.current = key;
                }
            } catch (e) {
                if (!cancelled && reqId === reqIdRef.current) {
                    setMethodsError(e);
                    setMethodsAndConfigs(null);
                    keyRef.current = null;
                }
            } finally {
                if (!cancelled && reqId === reqIdRef.current) setMethodsLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate]);

    // Method tree
    const methodConfigTree = useMemo(() => {
        if (!methodsAndConfigs?.methods) return [];
        return methodsAndConfigs.methods.map(m => ({
            id: m.id,
            name: m.name,
            children: (m.configurations || []).map(c => ({id: c.id, name: c.name}))
        }));
    }, [methodsAndConfigs]);

    // Auto select first method
    useEffect(() => {
        if (!selectedMethodConfig && methodConfigTree.length) {
            setSelectedMethodConfig({method: methodConfigTree[0], config: null});
        } else if (selectedMethodConfig && !methodConfigTree.find(m => m.id === selectedMethodConfig.method?.id)) {
            setSelectedMethodConfig(null);
        }
    }, [methodConfigTree, selectedMethodConfig]);

    const setSelectedMethodConfigScoped = useCallback(sel => setSelectedMethodConfig(sel ? {...sel} : null), []);

    const value = useMemo(() => ({
        methodConfigTree,
        methodsLoading,
        methodsError,
        selectedMethodConfig,
        setSelectedMethodConfig: setSelectedMethodConfigScoped
    }), [methodConfigTree, methodsLoading, methodsError, selectedMethodConfig, setSelectedMethodConfigScoped]);

    return <MethodsContext.Provider value={value}>{children}</MethodsContext.Provider>;
}

export const useMethods = () => useContext(MethodsContext);

