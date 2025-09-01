import React, {createContext, useContext, useEffect, useState, useCallback} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';

const SelectedEntityContext = createContext({});

export function SelectedEntityProvider({children}) {
    const {workspace} = useWorkspace();
    const [selectedEntityId, setSelectedEntityId] = useState(null);

    // Reset on workspace change
    useEffect(() => {
        setSelectedEntityId(null);
    }, [workspace]);

    const value = { selectedEntityId, setSelectedEntityId };
    return <SelectedEntityContext.Provider value={value}>{children}</SelectedEntityContext.Provider>;
}

export const useSelectedEntity = () => useContext(SelectedEntityContext);

